import { GoogleGenAI } from '@google/genai';
import { DEFAULT_AUDIO_CONFIG, pcmToGeminiBlob, decodeAudioData } from './audioUtils';

// NOTE: In a real production app, this key should be proxied via backend.
// For this local desktop agent, we use the env var directly.
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || "AIzaSyCxm4MLjlP4_GdPEi1JuOGW7tgm4mlf3ng";

export class GeminiLiveClient {
    constructor(logCallback, statusCallback, volumeCallback) {
        this.logCallback = logCallback;
        this.statusCallback = statusCallback;
        this.volumeCallback = volumeCallback;
        this.ai = new GoogleGenAI({ apiKey: API_KEY });

        this.session = null;
        this.inputAudioContext = null;
        this.outputAudioContext = null;
        this.inputSource = null;
        this.processor = null;
        this.inputAnalyser = null;
        this.outputAnalyser = null;
        this.micStream = null;

        this.nextStartTime = 0;
        this.sources = new Set();
        this.volumeAnimationId = null;

        this.currentInputTranscription = '';
        this.currentOutputTranscription = '';
    }

    async connect() {
        try {
            this.statusCallback('CONNECTING');

            // Initialize Audio Contexts
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.inputAudioContext = new AudioContextClass({ sampleRate: DEFAULT_AUDIO_CONFIG.inputSampleRate });
            this.outputAudioContext = new AudioContextClass({ sampleRate: DEFAULT_AUDIO_CONFIG.outputSampleRate });

            // Setup Output Analyser
            this.outputAnalyser = this.outputAudioContext.createAnalyser();
            this.outputAnalyser.fftSize = 256;
            this.outputAnalyser.smoothingTimeConstant = 0.1;
            this.outputAnalyser.connect(this.outputAudioContext.destination);

            // Get Mic Stream
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.micStream = stream;

            // Define Tools
            const tools = [{
                functionDeclarations: [
                    {
                        name: "execute_action",
                        description: "Executes a desktop automation action.",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                action: {
                                    type: "STRING",
                                    enum: ["click", "double_click", "right_click", "drag", "type", "keypress", "scroll", "open", "move"],
                                    description: "The action to perform"
                                },
                                params: {
                                    type: "OBJECT",
                                    description: "Parameters for the action (x, y, text, key, etc.)",
                                    properties: {
                                        x: { type: "NUMBER" },
                                        y: { type: "NUMBER" },
                                        text: { type: "STRING" },
                                        key: { type: "STRING" },
                                        modifiers: { type: "ARRAY", items: { type: "STRING" } },
                                        clicks: { type: "NUMBER" },
                                        app_name: { type: "STRING" },
                                        speed: { type: "NUMBER", description: "Mouse speed (0.1-1.0). Default 0.8." },
                                        deviation: { type: "NUMBER", description: "Mouse path randomness. Default 10." }
                                    }
                                }
                            },
                            required: ["action"]
                        }
                    },
                    {
                        name: "get_accessibility_tree",
                        description: "Returns the accessibility tree of the active window. Use this to find the coordinates and dimensions of UI elements.",
                    }
                ]
            }];

            const systemInstruction = `You are a helpful desktop automation agent. You can see the user's screen and hear their voice.
      
      Your goal is to help the user control their computer.
      
      When the user asks to do something, use the 'execute_action' tool.
      
      Available Actions:
      - click(x, y): Click at coordinates.
      - double_click(x, y): Double click.
      - right_click(x, y): Right click.
      - drag(start_x, start_y, end_x, end_y): Drag and drop.
      - type(text): Type text.
      - keypress(key, modifiers): Press a key (e.g. key="enter", modifiers=["cmd"]).
      - scroll(clicks): Scroll up/down.
      - open(app_name): Open an application.
      
      If you need to see the screen to determine coordinates, ask the user or infer from context (Note: Vision support in Live API is coming, for now rely on general knowledge or ask for clarification if needed).

      IMPORTANT: Before clicking, use 'get_accessibility_tree' to find coordinates.
      The tree is FILTERED to only show interactive elements.
      Tree format: { "nodes": [ ["role", "label", x, y], ... ] }
      
      The coordinates [x, y] are the CALCULATED CENTER of the element.
      EXAMPLE: ["AXButton", "Reload", 94, 64]
      -> This means the center is exactly at (94, 64).
      -> You should call click(94, 64).
      
      To get coordinates: x = node[2], y = node[3]
      Click directly at (x, y). DO NOT MODIFY THE COORDINATES.

      You can execute multiple actions in a sequence to achieve a goal. For example, to open a website:
      1. open("safari")
      2. type("youtube.com")
      3. keypress("enter")
      `;

            // Connect to Gemini Live
            this.session = await this.ai.live.connect({
                model: 'gemini-2.5-flash-live-preview',
                config: {
                    tools: tools,
                    systemInstruction: systemInstruction,
                },
                callbacks: {
                    onopen: () => {
                        this.statusCallback('CONNECTED');
                        this.logCallback('system', 'Connected to Gemini Live');
                        this.startAudioStream(stream);
                        this.startVolumeAnalysis();
                    },
                    onmessage: (msg) => this.handleMessage(msg),
                    onclose: () => {
                        this.statusCallback('DISCONNECTED');
                        this.logCallback('system', 'Session closed');
                        this.stopVolumeAnalysis();
                    },
                    onerror: (err) => {
                        console.error('Session error:', err);
                        this.statusCallback('ERROR');
                        this.logCallback('system', 'Error encountered');
                    }
                }
            });

        } catch (error) {
            console.error('Connection failed:', error);
            this.statusCallback('ERROR');
            this.logCallback('system', `Connection failed: ${error.message}`);
        }
    }

    async startAudioStream(stream) {
        if (!this.inputAudioContext) return;

        try {
            await this.inputAudioContext.audioWorklet.addModule('/audio-processor.js');
        } catch (e) {
            console.error('Failed to load audio processor:', e);
            return;
        }

        this.inputSource = this.inputAudioContext.createMediaStreamSource(stream);

        this.processor = new AudioWorkletNode(this.inputAudioContext, 'gemini-audio-processor');

        this.processor.port.onmessage = (e) => {
            const inputData = e.data;
            const pcmBlob = pcmToGeminiBlob(inputData, DEFAULT_AUDIO_CONFIG.inputSampleRate);

            // Send audio chunk
            if (this.session) {
                this.session.sendRealtimeInput([{ mimeType: "audio/pcm", data: pcmBlob }]);
            }
        };

        this.inputSource.connect(this.processor);
        this.processor.connect(this.inputAudioContext.destination);
    }

    startVolumeAnalysis() {
        const updateVolume = () => {
            let maxVol = 0;
            if (this.inputAnalyser) {
                const data = new Uint8Array(this.inputAnalyser.frequencyBinCount);
                this.inputAnalyser.getByteFrequencyData(data);
                const avg = data.reduce((a, b) => a + b, 0) / data.length;
                maxVol = Math.max(maxVol, avg / 255);
            }
            if (this.outputAnalyser) {
                const data = new Uint8Array(this.outputAnalyser.frequencyBinCount);
                this.outputAnalyser.getByteFrequencyData(data);
                const avg = data.reduce((a, b) => a + b, 0) / data.length;
                maxVol = Math.max(maxVol, (avg / 255) * 1.2);
            }
            this.volumeCallback(maxVol);
            this.volumeAnimationId = requestAnimationFrame(updateVolume);
        };
        updateVolume();
    }

    stopVolumeAnalysis() {
        if (this.volumeAnimationId) {
            cancelAnimationFrame(this.volumeAnimationId);
            this.volumeAnimationId = null;
        }
        this.volumeCallback(0);
    }

    async handleMessage(message) {
        // Handle Text (Transcription)
        if (message.serverContent?.modelTurn?.parts) {
            for (const part of message.serverContent.modelTurn.parts) {
                if (part.text) {
                    this.logCallback('model', part.text);
                }
            }
        }

        // Handle Tool Calls
        if (message.toolCall) {
            const responses = [];
            for (const call of message.toolCall.functionCalls) {
                if (call.name === 'execute_action') {
                    const { action, params } = call.args;
                    this.logCallback('system', `Executing: ${action}`);

                    try {
                        // Call local backend to execute
                        const res = await fetch(`http://${window.location.hostname}:8000/execute`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action, params })
                        });
                        const data = await res.json();

                        responses.push({
                            name: 'execute_action',
                            id: call.id,
                            response: { result: data }
                        });
                    } catch (e) {
                        console.error('Execution error:', e);
                        responses.push({
                            name: 'execute_action',
                            id: call.id,
                            response: { error: e.message }
                        });
                    }
                } else if (call.name === 'get_accessibility_tree') {
                    this.logCallback('system', 'Fetching UI Tree...');
                    try {
                        const res = await fetch(`http://${window.location.hostname}:8000/ui-tree`);
                        const data = await res.json();
                        responses.push({
                            name: 'get_accessibility_tree',
                            id: call.id,
                            response: { result: data }
                        });
                    } catch (e) {
                        console.error('UI Tree error:', e);
                        responses.push({
                            name: 'get_accessibility_tree',
                            id: call.id,
                            response: { error: e.message }
                        });
                    }
                }
            }

            // Send tool response
            if (this.session && responses.length > 0) {
                this.session.sendToolResponse(responses);
            }
        }

        // Handle Audio Output
        const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
        if (audioData && this.outputAudioContext) {
            if (this.outputAudioContext.state === 'suspended') {
                await this.outputAudioContext.resume();
            }
            const buffer = await decodeAudioData(audioData, this.outputAudioContext, DEFAULT_AUDIO_CONFIG.outputSampleRate);
            this.playAudioBuffer(buffer);
        }
    }

    playAudioBuffer(buffer) {
        if (!this.outputAudioContext) return;

        const currentTime = this.outputAudioContext.currentTime;
        if (this.nextStartTime < currentTime) {
            this.nextStartTime = currentTime;
        }

        const source = this.outputAudioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.outputAnalyser);
        source.start(this.nextStartTime);
        this.nextStartTime += buffer.duration;

        this.sources.add(source);
        source.onended = () => this.sources.delete(source);
    }

    disconnect() {
        this.stopVolumeAnalysis();
        if (this.session) {
            // this.session.close(); // Not always available directly depending on SDK
            this.session = null;
        }

        this.sources.forEach(s => { try { s.stop(); } catch (e) { } });
        this.sources.clear();

        if (this.micStream) {
            this.micStream.getTracks().forEach(t => t.stop());
            this.micStream = null;
        }

        if (this.inputSource) this.inputSource.disconnect();
        if (this.processor) {
            this.processor.disconnect();
            this.processor.onaudioprocess = null;
        }

        if (this.inputAudioContext) this.inputAudioContext.close();
        if (this.outputAudioContext) this.outputAudioContext.close();

        this.statusCallback('DISCONNECTED');
        this.logCallback('system', 'Disconnected');
    }
}

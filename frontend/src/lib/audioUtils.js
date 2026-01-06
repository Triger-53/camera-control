export const DEFAULT_AUDIO_CONFIG = {
    inputSampleRate: 16000,
    outputSampleRate: 24000, // Gemini usually outputs at 24kHz
    bufferSize: 4096,
};

/**
 * Converts Float32Array PCM data to a Blob suitable for Gemini API.
 * @param {Float32Array} pcmData 
 * @param {number} sampleRate 
 * @returns {Blob}
 */
export const pcmToGeminiBlob = (pcmData, sampleRate) => {
    // Convert Float32 to Int16
    const buffer = new ArrayBuffer(pcmData.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < pcmData.length; i++) {
        const s = Math.max(-1, Math.min(1, pcmData[i]));
        view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return new Blob([buffer], { type: 'audio/pcm' });
};

/**
 * Decodes base64 audio data from Gemini into an AudioBuffer.
 * @param {string} base64Data 
 * @param {AudioContext} audioContext 
 * @param {number} sampleRate 
 * @returns {Promise<AudioBuffer>}
 */
export const decodeAudioData = async (base64Data, audioContext, sampleRate) => {
    const binaryString = window.atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    // Create an AudioBuffer from the raw PCM data (Int16, 1 channel, 24kHz)
    // Note: decodeAudioData usually expects a full file format (wav/mp3). 
    // Since Gemini sends raw PCM, we manually construct the buffer.

    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);

    for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
    }

    const audioBuffer = audioContext.createBuffer(1, float32Array.length, sampleRate);
    audioBuffer.getChannelData(0).set(float32Array);

    return audioBuffer;
};

import React, { useEffect, useRef, useState } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import useStore from '../store';
import { Video } from 'lucide-react';

const HandTracker = () => {
    const videoRef = useRef(null);
    const [webcamRunning, setWebcamRunning] = useState(false);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [debugLog, setDebugLog] = useState([]);
    const setHandData = useStore((state) => state.setHandData);
    const { cameraDeviceId, setAvailableCameras, availableCameras, setCameraDeviceId } = useStore();
    const lastVideoTimeRef = useRef(-1);
    const handLandmarkerRef = useRef(null);

    // Smoothing refs
    const previousPosition = useRef([0, 0, 0]);

    const addLog = (msg) => {
        console.log(msg);
        setDebugLog(prev => [...prev.slice(-4), msg]); // Keep last 5 logs
    };

    useEffect(() => {
        const initHandLandmarker = async () => {
            try {
                addLog('Loading Vision Tasks...');
                const vision = await FilesetResolver.forVisionTasks(
                    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
                );

                addLog('Creating HandLandmarker (GPU)...');
                try {
                    handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
                        baseOptions: {
                            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                            delegate: 'GPU',
                        },
                        runningMode: 'VIDEO',
                        numHands: 1,
                    });
                    addLog('HandLandmarker (GPU) Ready');
                } catch (gpuError) {
                    addLog('GPU Failed, trying CPU...');
                    handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
                        baseOptions: {
                            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                            delegate: 'CPU',
                        },
                        runningMode: 'VIDEO',
                        numHands: 1,
                    });
                    addLog('HandLandmarker (CPU) Ready');
                }

                setLoading(false);
                enableCam();
            } catch (error) {
                console.error("Failed to init hand landmarker", error);
                setErrorMsg(`Init Error: ${error.message}`);
                addLog(`Init Error: ${error.message}`);
                setLoading(false);
            }
        };

        initHandLandmarker();

        // Enumerate Cameras
        navigator.mediaDevices.enumerateDevices().then(devices => {
            const cameras = devices.filter(d => d.kind === 'videoinput');
            setAvailableCameras(cameras);
            addLog(`Cameras found: ${cameras.length}`);
            if (cameras.length > 0 && !cameraDeviceId) {
                // Prefer back camera if available (environment), else first
                const back = cameras.find(c => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('environment'));
                setCameraDeviceId(back ? back.deviceId : cameras[0].deviceId);
            }
        }).catch(err => addLog(`Enum Cam Error: ${err.message}`));
    }, []);

    // Re-enable cam when deviceId changes
    useEffect(() => {
        if (webcamRunning) {
            enableCam();
        }
    }, [cameraDeviceId]);

    const enableCam = () => {
        if (!handLandmarkerRef.current) return;

        // Relaxed constraints for mobile
        const constraints = {
            video: {
                deviceId: cameraDeviceId ? { exact: cameraDeviceId } : undefined,
                width: { ideal: 640 }, // Lower res for better mobile performance
                height: { ideal: 480 }
            }
        };

        addLog(`Requesting Cam...`);
        navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
            videoRef.current.srcObject = stream;
            videoRef.current.addEventListener('loadeddata', predictWebcam);
            setWebcamRunning(true);
            addLog('Camera Active');
        }).catch((err) => {
            console.error("Error accessing webcam: ", err);
            setErrorMsg(`Cam Error: ${err.message}`);
            addLog(`Cam Error: ${err.message}`);
        });
    };

    const lerp = (start, end, factor) => start + (end - start) * factor;

    const predictWebcam = async () => {
        if (videoRef.current && handLandmarkerRef.current) {
            let startTimeMs = performance.now();
            if (lastVideoTimeRef.current !== videoRef.current.currentTime) {
                lastVideoTimeRef.current = videoRef.current.currentTime;
                try {
                    const results = handLandmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);

                    if (results.landmarks && results.landmarks.length > 0) {
                        const hand = results.landmarks[0];

                        // Key Landmarks
                        const wrist = hand[0];
                        const thumbTip = hand[4];
                        const indexTip = hand[8];
                        const middleTip = hand[12];
                        const ringTip = hand[16];
                        const pinkyTip = hand[20];

                        // Helper: Finger Extension
                        const isExtended = (tip, base) => Math.hypot(tip.x - base.x, tip.y - base.y) > 0.1;

                        const indexMCP = hand[5];
                        const pinkyMCP = hand[17];

                        // Distance from Thumb Tip to Pinky MCP is large when open, small when tucked across palm.
                        const thumbToPinkyDist = Math.hypot(thumbTip.x - pinkyMCP.x, thumbTip.y - pinkyMCP.y);
                        const isThumbExtended = thumbToPinkyDist > 0.15; // Tuned threshold

                        const fingersExtended = [
                            isExtended(indexTip, wrist),
                            isExtended(middleTip, wrist),
                            isExtended(ringTip, wrist),
                            isExtended(pinkyTip, wrist)
                        ];

                        const areFourFingersExtended = fingersExtended.every(f => f);
                        const isPinching = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y) < 0.06;

                        // STRICT CHECK: 4 Fingers = 4 Extended AND Thumb NOT Extended
                        const isFourFingers = areFourFingersExtended && !isThumbExtended;

                        // STRICT CHECK: Open Palm = 4 Extended AND Thumb Extended
                        const isOpenPalm = areFourFingersExtended && isThumbExtended && !isPinching;

                        const isPointing = fingersExtended[0] && !fingersExtended[1] && !fingersExtended[2] && !fingersExtended[3];

                        let gesture = 'NONE';
                        if (isPinching) gesture = 'PINCH';
                        else if (isPointing) gesture = 'POINT';
                        else if (isFourFingers) gesture = 'FOUR_FINGERS';
                        else if (isOpenPalm) gesture = 'OPEN_PALM';

                        // 1. Position (Center of Palm approx)
                        // Map 0..1 to -1..1 range
                        const rawX = (indexTip.x - 0.5) * -2.5;
                        const rawY = -(indexTip.y - 0.5) * 2.5;

                        // Smoothing Position
                        const smoothFactor = 0.2;
                        const x = lerp(previousPosition.current[0], rawX, smoothFactor);
                        const y = lerp(previousPosition.current[1], rawY, smoothFactor);
                        const z = 0;
                        previousPosition.current = [x, y, z];

                        // 3. Device Control (4 Finger Swipe)
                        if (isFourFingers) {
                            const dx = x - previousPosition.current[0]; // Delta X
                            const dy = y - previousPosition.current[1]; // Delta Y

                            // Threshold for swipe
                            const swipeThreshold = 0.04; // Slightly more sensitive
                            const now = Date.now();

                            if (!window.lastSwipeTime) window.lastSwipeTime = 0;

                            if (now - window.lastSwipeTime > 500) {
                                if (dx > swipeThreshold) {
                                    useStore.getState().sendControlCommand('SWIPE_RIGHT');
                                    window.lastSwipeTime = now;
                                } else if (dx < -swipeThreshold) {
                                    useStore.getState().sendControlCommand('SWIPE_LEFT');
                                    window.lastSwipeTime = now;
                                } else if (dy > swipeThreshold) {
                                    useStore.getState().sendControlCommand('SWIPE_UP');
                                    window.lastSwipeTime = now;
                                } else if (dy < -swipeThreshold) {
                                    useStore.getState().sendControlCommand('SWIPE_DOWN');
                                    window.lastSwipeTime = now;
                                }
                            }
                        }

                        // 4. Mouse Control Logic
                        const SCREEN_W = 1920;
                        const SCREEN_H = 1080;

                        const ix = indexTip.x;
                        const iy = indexTip.y;

                        const screenX = (1 - ix) * SCREEN_W;
                        const screenY = iy * SCREEN_H;

                        const isIndexPinch = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y) < 0.05;
                        const isMiddlePinch = Math.hypot(middleTip.x - thumbTip.x, middleTip.y - thumbTip.y) < 0.05;

                        // State for Dragging
                        if (!window.isDragging) window.isDragging = false;

                        if (isIndexPinch) {
                            if (!window.isDragging) {
                                useStore.getState().sendMouseData({ type: 'DOWN', x: screenX, y: screenY });
                                window.isDragging = true;
                            } else {
                                useStore.getState().sendMouseData({ type: 'DRAG', x: screenX, y: screenY });
                            }
                        } else {
                            if (window.isDragging) {
                                useStore.getState().sendMouseData({ type: 'UP', x: screenX, y: screenY });
                                window.isDragging = false;
                            } else if (isPointing) {
                                useStore.getState().sendMouseData({ type: 'MOVE', x: screenX, y: screenY });
                            }
                        }

                        // Right Click (Middle Pinch) - Debounced
                        if (isMiddlePinch) {
                            const now = Date.now();
                            if (!window.lastRightClick) window.lastRightClick = 0;
                            if (now - window.lastRightClick > 1000) {
                                useStore.getState().sendMouseData({ type: 'RIGHT_CLICK', x: screenX, y: screenY });
                                window.lastRightClick = now;
                            }
                        }

                        setHandData({
                            handPosition: [x, y, z],
                            isPinching,
                            isOpenPalm,
                            gesture
                        });
                    }
                } catch (e) {
                    console.error("Prediction Error", e);
                }
            }
            requestAnimationFrame(predictWebcam);
        }
    };

    // Determine if we should mirror (Front camera usually mirrored)
    const isFrontCamera = availableCameras.find(c => c.deviceId === cameraDeviceId)?.label.toLowerCase().includes('front') ||
        availableCameras.find(c => c.deviceId === cameraDeviceId)?.label.toLowerCase().includes('user');
    // Default to mirror if unknown or front
    const shouldMirror = isFrontCamera || !cameraDeviceId;

    return (
        <div className="hand-tracker-container">
            {loading && <div className="loading-text">Initializing AI...</div>}

            {/* Debug Overlay */}
            <div className="debug-overlay">
                <div>Status: {loading ? 'Loading' : 'Ready'}</div>
                <div>Cam: {webcamRunning ? 'ON' : 'OFF'}</div>
                {errorMsg && <div style={{ color: 'red' }}>{errorMsg}</div>}
                <div className="log-list">
                    {debugLog.map((l, i) => <div key={i}>{l}</div>)}
                </div>
            </div>

            <div className="video-wrapper">
                <video
                    ref={videoRef}
                    className="webcam-video"
                    autoPlay
                    playsInline
                    muted
                    style={{ transform: shouldMirror ? 'scaleX(-1)' : 'none' }}
                />
                {!webcamRunning && !loading && (
                    <div className="camera-placeholder">
                        <Video size={24} color="white" />
                        <span>Waiting for camera...</span>
                    </div>
                )}
            </div>
            <style>{`
        .hand-tracker-container {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 0; /* Background */
            pointer-events: none;
            overflow: hidden;
        }
        .debug-overlay {
            position: absolute;
            top: 10px;
            left: 10px;
            background: rgba(0,0,0,0.7);
            color: #0f0;
            padding: 10px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 12px;
            z-index: 100;
            pointer-events: none;
            max-width: 200px;
        }
        .log-list {
            margin-top: 5px;
            opacity: 0.8;
            font-size: 10px;
        }
        .video-wrapper {
            width: 100%;
            height: 100%;
            border: none;
            background: black;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .webcam-video {
            width: 100%;
            height: 100%;
            object-fit: cover;
            opacity: 1; /* Dim slightly so particles pop */
        }
        .loading-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 1.5rem;
            font-family: sans-serif;
            z-index: 10;
        }
        .camera-placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            color: rgba(255,255,255,0.5);
            font-size: 1rem;
        }
      `}</style>
        </div>
    );
};

export default HandTracker;

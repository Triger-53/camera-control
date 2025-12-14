import React, { useEffect, useRef, useState } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import useStore from '../store';
import { Video, Hand } from 'lucide-react';

const HandTracker = () => {
    const videoRef = useRef(null);
    const [webcamRunning, setWebcamRunning] = useState(false);
    const [loading, setLoading] = useState(true);
    const setHandData = useStore((state) => state.setHandData);
    const { cameraDeviceId, setAvailableCameras, availableCameras, setCameraDeviceId } = useStore();
    const lastVideoTimeRef = useRef(-1);
    const handLandmarkerRef = useRef(null);

    // Smoothing refs
    const previousPosition = useRef([0, 0, 0]);

    useEffect(() => {
        const initHandLandmarker = async () => {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
                );
                handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                        delegate: 'GPU',
                    },
                    runningMode: 'VIDEO',
                    numHands: 1,
                });
                console.log('HandLandmarker initialized');
                setLoading(false);
                enableCam();
            } catch (error) {
                console.error("Failed to init hand landmarker", error);
                setLoading(false);
            }
        };

        initHandLandmarker();

        // Enumerate Cameras
        navigator.mediaDevices.enumerateDevices().then(devices => {
            const cameras = devices.filter(d => d.kind === 'videoinput');
            setAvailableCameras(cameras);
            if (cameras.length > 0 && !cameraDeviceId) {
                // Prefer back camera if available (environment), else first
                const back = cameras.find(c => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('environment'));
                setCameraDeviceId(back ? back.deviceId : cameras[0].deviceId);
            }
        });
    }, []);

    // Re-enable cam when deviceId changes
    useEffect(() => {
        if (webcamRunning) {
            enableCam();
        }
    }, [cameraDeviceId]);

    const enableCam = () => {
        if (!handLandmarkerRef.current) return;

        const constraints = {
            video: {
                deviceId: cameraDeviceId ? { exact: cameraDeviceId } : undefined,
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };

        navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
            videoRef.current.srcObject = stream;
            videoRef.current.addEventListener('loadeddata', predictWebcam);
            setWebcamRunning(true);
        }).catch((err) => {
            console.error("Error accessing webcam: ", err);
        });
    };

    const lerp = (start, end, factor) => start + (end - start) * factor;

    const predictWebcam = async () => {
        if (videoRef.current && handLandmarkerRef.current) {
            let startTimeMs = performance.now();
            if (lastVideoTimeRef.current !== videoRef.current.currentTime) {
                lastVideoTimeRef.current = videoRef.current.currentTime;
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

                    // 2. Gesture Detection
                    const pinchDist = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
                    const isPinching = pinchDist < 0.06;

                    const fingersExtended = [
                        isExtended(indexTip, wrist),
                        isExtended(middleTip, wrist),
                        isExtended(ringTip, wrist),
                        isExtended(pinkyTip, wrist)
                    ];

                    // Thumb Extension Check (Distance from wrist compared to Index MCP)
                    // Or simply distance from wrist > threshold, but thumb is shorter.
                    // Better: Check angle or distance from Index MCP.
                    // Simple: Distance from wrist > 0.15 (similar to others but shorter threshold)
                    const isThumbExtended = Math.hypot(thumbTip.x - wrist.x, thumbTip.y - wrist.y) > 0.15;

                    const areFourFingersExtended = fingersExtended.every(f => f);

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
                    // Screen Resolution (Hardcoded for now, or configurable)
                    const SCREEN_W = 1920;
                    const SCREEN_H = 1080;

                    // Map Hand Coordinates (-1..1) to Screen (0..W, 0..H)
                    // Hand X: -1 (Left) to 1 (Right) -> 0 to W
                    // Hand Y: -1 (Bottom) to 1 (Top) -> H to 0 (Inverted Y)

                    // Use Index Tip for precise pointing
                    // Raw Index Tip is 0..1 in video frame
                    const ix = indexTip.x;
                    const iy = indexTip.y;

                    // Map 0..1 to Screen
                    // Mirror X for natural feel (Camera is mirrored usually)
                    const screenX = (1 - ix) * SCREEN_W;
                    const screenY = iy * SCREEN_H;

                    // Gestures for Mouse
                    // Move: Index Extended, others closed (Pointing)
                    // Left Click/Drag: Pinch (Index + Thumb)
                    // Right Click: Middle Pinch (Middle + Thumb)

                    const isIndexPinch = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y) < 0.05;
                    const isMiddlePinch = Math.hypot(middleTip.x - thumbTip.x, middleTip.y - thumbTip.y) < 0.05;

                    // State for Dragging
                    if (!window.isDragging) window.isDragging = false;

                    if (isIndexPinch) {
                        // Dragging or Clicking
                        if (!window.isDragging) {
                            // Just started pinching -> Down
                            useStore.getState().sendMouseData({ type: 'DOWN', x: screenX, y: screenY });
                            window.isDragging = true;
                        } else {
                            // Continue dragging
                            useStore.getState().sendMouseData({ type: 'DRAG', x: screenX, y: screenY });
                        }
                    } else {
                        // Not pinching
                        if (window.isDragging) {
                            // Just released -> Up
                            useStore.getState().sendMouseData({ type: 'UP', x: screenX, y: screenY });
                            window.isDragging = false;
                        } else if (isPointing) {
                            // Just Moving
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
            }
            requestAnimationFrame(predictWebcam);
        }
    };

    return (
        <div className="hand-tracker-container">
            {loading && <div className="loading-text">Initializing AI...</div>}
            <div className="video-wrapper">
                <video
                    ref={videoRef}
                    className="webcam-video"
                    autoPlay
                    playsInline
                    muted
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
            transform: scaleX(-1);
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

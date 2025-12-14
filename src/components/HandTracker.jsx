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
                    numHands: 2,
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
                    const hands = results.landmarks;
                    const hand1 = hands[0];
                    const hand2 = hands.length > 1 ? hands[1] : null;

                    // Helper to get position
                    const getPos = (hand) => {
                        const index = hand[8];
                        return {
                            x: (index.x - 0.5) * -2.5,
                            y: -(index.y - 0.5) * 2.5
                        };
                    };

                    const h1Pos = getPos(hand1);

                    // 1. Hand Position (Primary)
                    const smoothFactor = 0.2;
                    const x = lerp(previousPosition.current[0], h1Pos.x, smoothFactor);
                    const y = lerp(previousPosition.current[1], h1Pos.y, smoothFactor);
                    const z = 0;
                    previousPosition.current = [x, y, z];

                    // 2. Pinch Detection (Primary Hand)
                    const indexTip = hand1[8];
                    const thumbTip = hand1[4];
                    const pinchDist = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
                    const isPinching = pinchDist < 0.06;

                    // 3. Open Palm (Primary Hand)
                    const wrist = hand1[0];
                    const isFingerExtended = (tip, wrist) => Math.hypot(tip.x - wrist.x, tip.y - wrist.y) > 0.15;
                    const isOpenPalm = isFingerExtended(hand1[8], wrist) &&
                        isFingerExtended(hand1[12], wrist) &&
                        isFingerExtended(hand1[16], wrist) &&
                        isFingerExtended(hand1[20], wrist) &&
                        !isPinching;

                    let gesture = 'NONE';
                    if (isPinching) gesture = 'PINCH';
                    else if (isOpenPalm) gesture = 'OPEN_PALM';

                    // 4. Multi-Hand Gestures (Zoom, Rotate, Drag)
                    let rotation = [0, 0, 0];
                    let zoom = 1;
                    let shapePosition = [0, 0, 0];

                    if (hand2) {
                        // Two Hands: Zoom & Rotate
                        const h2Pos = getPos(hand2);

                        // Distance -> Zoom
                        const dist = Math.hypot(h1Pos.x - h2Pos.x, h1Pos.y - h2Pos.y);
                        zoom = Math.max(0.5, Math.min(3, dist * 2)); // Map distance to zoom

                        // Angle -> Rotation Z
                        const angle = Math.atan2(h2Pos.y - h1Pos.y, h2Pos.x - h1Pos.x);
                        rotation = [0, 0, angle];

                        // Midpoint -> Position
                        shapePosition = [
                            (h1Pos.x + h2Pos.x) / 2,
                            (h1Pos.y + h2Pos.y) / 2,
                            0
                        ];
                    } else {
                        // One Hand
                        if (isPinching) {
                            // Drag Mode
                            shapePosition = [x, y, 0];
                        }
                    }

                    setHandData({
                        handPosition: [x, y, z],
                        isPinching,
                        isOpenPalm,
                        gesture,
                        rotation,
                        zoom,
                        shapePosition
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
            opacity: 0.6; /* Dim slightly so particles pop */
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

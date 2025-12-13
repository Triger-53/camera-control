import React, { useEffect, useRef, useState } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import useStore from '../store';
import { Video, Hand } from 'lucide-react';

const HandTracker = () => {
    const videoRef = useRef(null);
    const [webcamRunning, setWebcamRunning] = useState(false);
    const [loading, setLoading] = useState(true);
    const setHandData = useStore((state) => state.setHandData);
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
    }, []);

    const enableCam = () => {
        if (!handLandmarkerRef.current) return;

        const constraints = {
            video: {
                facingMode: 'user',
                width: 640,
                height: 480
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
                    const landmarks = results.landmarks[0];

                    // Key Landmarks
                    const indexTip = landmarks[8];
                    const thumbTip = landmarks[4];
                    const middleTip = landmarks[12];
                    const ringTip = landmarks[16];
                    const pinkyTip = landmarks[20];
                    const wrist = landmarks[0];

                    // Raw Position (Normalized)
                    // Map 0..1 to -1..1 range
                    const rawX = (indexTip.x - 0.5) * -2.5; // Wider range
                    const rawY = -(indexTip.y - 0.5) * 2.5;

                    // Smoothing
                    const smoothFactor = 0.2; // Lower = smoother but more lag
                    const x = lerp(previousPosition.current[0], rawX, smoothFactor);
                    const y = lerp(previousPosition.current[1], rawY, smoothFactor);
                    const z = 0; // Depth is hard to estimate accurately without depth sensor

                    previousPosition.current = [x, y, z];

                    // Gesture Logic
                    const pinchDist = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
                    const isPinching = pinchDist < 0.06;

                    const isFingerExtended = (tip, wrist) => Math.hypot(tip.x - wrist.x, tip.y - wrist.y) > 0.15;
                    const isOpenPalm = isFingerExtended(indexTip, wrist) &&
                        isFingerExtended(middleTip, wrist) &&
                        isFingerExtended(ringTip, wrist) &&
                        isFingerExtended(pinkyTip, wrist) &&
                        !isPinching;

                    let gesture = 'NONE';
                    if (isPinching) gesture = 'PINCH';
                    else if (isOpenPalm) gesture = 'OPEN_PALM';

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
            bottom: 20px;
            right: 20px;
            z-index: 50;
            pointer-events: none;
        }
        .video-wrapper {
            width: 160px;
            height: 120px;
            border-radius: 12px;
            overflow: hidden;
            border: 2px solid rgba(255, 255, 255, 0.2);
            background: rgba(0,0,0,0.5);
            backdrop-filter: blur(10px);
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .webcam-video {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transform: scaleX(-1);
        }
        .loading-text {
            position: absolute;
            top: -30px;
            right: 0;
            color: white;
            font-size: 12px;
            font-family: sans-serif;
            opacity: 0.8;
        }
        .camera-placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            color: rgba(255,255,255,0.5);
            font-size: 12px;
        }
      `}</style>
        </div>
    );
};

export default HandTracker;

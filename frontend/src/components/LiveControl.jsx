import React, { useState, useEffect, useRef } from 'react';
import { GeminiLiveClient } from '../lib/GeminiLiveClient';

const LiveControl = ({ onLog }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [volume, setVolume] = useState(0);
    const clientRef = useRef(null);

    useEffect(() => {
        // Initialize Client
        clientRef.current = new GeminiLiveClient(
            (role, text) => {
                if (role === 'system') onLog(`System: ${text}`);
                else if (role === 'user') onLog(`You: ${text}`);
                else if (role === 'model') onLog(`Gemini: ${text}`);
            },
            (status) => {
                setIsConnected(status === 'CONNECTED');
            },
            (vol) => {
                setVolume(vol);
            }
        );

        return () => {
            if (clientRef.current) {
                clientRef.current.disconnect();
            }
        };
    }, [onLog]);

    const toggleConnection = () => {
        if (isConnected) {
            clientRef.current.disconnect();
        } else {
            clientRef.current.connect();
        }
    };

    return (
        <div className="flex flex-col items-center justify-center p-6 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-xl relative overflow-hidden">
            {/* Volume Visualizer Background */}
            <div
                className="absolute inset-0 bg-gradient-to-t from-purple-500/20 to-transparent transition-all duration-100 pointer-events-none"
                style={{ height: `${Math.min(100, volume * 100)}%`, opacity: 0.5 }}
            ></div>

            <button
                onClick={toggleConnection}
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 z-10 ${isConnected
                        ? 'bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.6)] animate-pulse'
                        : 'bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg hover:shadow-xl hover:scale-105'
                    }`}
            >
                {isConnected ? (
                    <div className="flex gap-1 items-center h-8">
                        {/* Audio Wave Animation */}
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div
                                key={i}
                                className="w-1 bg-white rounded-full transition-all duration-75"
                                style={{
                                    height: `${Math.max(20, Math.random() * 100 * (volume + 0.2))}%`,
                                    animation: `pulse 0.5s infinite ${i * 0.1}s`
                                }}
                            ></div>
                        ))}
                    </div>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                )}
            </button>

            <p className="mt-4 text-white font-medium text-lg z-10">
                {isConnected ? "Listening..." : "Tap to Connect"}
            </p>

            {isConnected && (
                <div className="mt-2 text-xs text-gray-400 z-10">
                    Gemini Live Active
                </div>
            )}
        </div>
    );
};

export default LiveControl;

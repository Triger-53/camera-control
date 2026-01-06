import React, { useState, useEffect } from 'react';

const ScreenView = () => {
    const [image, setImage] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchScreenshot = async () => {
            try {
                const response = await fetch(`http://${window.location.hostname}:8000/screenshot`);
                const data = await response.json();
                setImage(`data:image/jpeg;base64,${data.image}`);
                setIsLoading(false);
            } catch (error) {
                console.error('Failed to fetch screenshot:', error);
            }
        };

        const interval = setInterval(fetchScreenshot, 500); // Faster refresh for smoother live view
        fetchScreenshot();

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full h-full flex items-center justify-center">
            {image ? (
                <img
                    src={image}
                    alt="Screen Capture"
                    className="w-full h-full object-contain"
                />
            ) : (
                <div className="flex flex-col items-center justify-center gap-4">
                    <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                    <p className="text-gray-400 text-sm">Loading live screen...</p>
                </div>
            )}
        </div>
    );
};

export default ScreenView;

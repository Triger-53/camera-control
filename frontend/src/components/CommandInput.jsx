import React, { useState } from 'react';

const CommandInput = ({ onCommand }) => {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        setLoading(true);
        try {
            await onCommand(input);
            setInput('');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex gap-3">
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a command (e.g., 'Open Safari', 'Click on File menu')"
                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
            />
            <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium rounded-xl shadow-lg hover:shadow-purple-500/50 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200 flex items-center gap-2"
            >
                {loading ? (
                    <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Processing...</span>
                    </>
                ) : (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Send</span>
                    </>
                )}
            </button>
        </form>
    );
};

export default CommandInput;

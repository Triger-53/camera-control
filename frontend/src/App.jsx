import React, { useState } from 'react';
import ScreenView from './components/ScreenView';
import CommandInput from './components/CommandInput';
import LiveControl from './components/LiveControl';

function App() {
  const [logs, setLogs] = useState([]);

  const handleCommand = async (command) => {
    addLog(`User: ${command}`);
    try {
      const response = await fetch(`http://${window.location.hostname}:8000/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: command }),
      });
      const data = await response.json();
      addLog(`Agent: ${JSON.stringify(data)}`);
    } catch (error) {
      addLog(`Error: ${error.message}`);
    }
  };

  const addLog = React.useCallback((message) => {
    setLogs((prev) => [{ timestamp: new Date().toLocaleTimeString(), message }, ...prev]);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-purple-500 selection:text-white overflow-hidden">
      {/* Background Gradients */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/30 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/30 rounded-full blur-[120px] animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-7xl mx-auto p-6 h-screen flex flex-col">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              Gemini Agent
            </h1>
          </div>
          <div className="text-sm text-gray-400 bg-white/5 px-3 py-1 rounded-full border border-white/10 backdrop-blur-sm">
            v2.5 Audio Preview
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
          {/* Main Content Area */}
          <div className="lg:col-span-8 flex flex-col gap-6 min-h-0">
            {/* Screen View */}
            <div className="flex-1 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden shadow-2xl relative group">
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              <ScreenView />
            </div>

            {/* Input Area */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-4">
              <CommandInput onCommand={handleCommand} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-6 min-h-0">
            {/* Live Control */}
            <LiveControl onLog={addLog} />

            {/* Logs */}
            <div className="flex-1 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-4 flex flex-col min-h-0">
              <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Activity Log</h2>
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {logs.map((log, i) => (
                  <div key={i} className="bg-white/5 rounded-lg p-3 border border-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] text-gray-500 font-mono">{log.timestamp}</span>
                    </div>
                    <p className="text-sm text-gray-200 leading-relaxed break-words">{log.message}</p>
                  </div>
                ))}
                {logs.length === 0 && (
                  <div className="text-center text-gray-500 mt-10 italic">
                    Ready for commands...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

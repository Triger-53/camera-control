import React, { useState, useEffect } from 'react'
import HandTracker from './components/HandTracker'
import useStore from './store'
import { Hand, Zap, Move, Smartphone, Video, Monitor } from 'lucide-react'
import './App.css'

const UIOverlay = () => {
  const { gesture, availableCameras, setCameraDeviceId, cameraDeviceId } = useStore();
  const [ipAddress, setIpAddress] = useState('localhost');

  useEffect(() => {
    setIpAddress(window.location.hostname);
  }, []);

  const cycleCamera = () => {
    if (availableCameras.length < 2) return;
    const currentIndex = availableCameras.findIndex(c => c.deviceId === cameraDeviceId);
    const nextIndex = (currentIndex + 1) % availableCameras.length;
    setCameraDeviceId(availableCameras[nextIndex].deviceId);
  };

  return (
    <div className="ui-overlay">
      <header>
        <h1>Device Control</h1>
        <div className="status-badge">
          <span className={`indicator ${gesture !== 'NONE' ? 'active' : ''}`}></span>
          {gesture === 'NONE' ? 'No Gesture' : gesture}
        </div>
      </header>

      <div className="instructions-card">
        <h3>Mouse Control</h3>
        <div className={`instruction-item ${gesture === 'POINT' ? 'active' : ''}`}>
          <Hand size={20} />
          <span><strong>Point</strong><br />Move Cursor</span>
        </div>
        <div className={`instruction-item ${isPinching ? 'active' : ''}`}>
          <Zap size={20} />
          <span><strong>Pinch</strong><br />Click / Drag</span>
        </div>
        <div className="instruction-item">
          <Move size={20} />
          <span><strong>Middle Pinch</strong><br />Right Click</span>
        </div>
        <div className="divider"></div>
        <h3>Mac Gestures</h3>
        <div className={`instruction-item ${gesture === 'SWIPE_LEFT' || gesture === 'SWIPE_RIGHT' ? 'active' : ''}`}>
          <Monitor size={20} />
          <span><strong>4 Fingers L/R</strong><br />Switch Space</span>
        </div>
        <div className={`instruction-item ${gesture === 'SWIPE_UP' ? 'active' : ''}`}>
          <Monitor size={20} />
          <span><strong>4 Fingers Up</strong><br />Mission Control</span>
        </div>
        <div className={`instruction-item ${gesture === 'SWIPE_DOWN' ? 'active' : ''}`}>
          <Monitor size={20} />
          <span><strong>4 Fingers Down</strong><br />App Expose</span>
        </div>
        <div className="divider"></div>
        <div className="instruction-item">
          <span className="note">Ensure Thumb is TUCKED for 4 fingers!</span>
        </div>
      </div>

      <div className="bottom-controls">
        <div className="mobile-connect">
          <Smartphone size={16} />
          <span>Connect Mobile: <strong>https://{ipAddress}:5173</strong></span>
        </div>

        {availableCameras.length > 1 && (
          <button className="camera-switch" onClick={cycleCamera}>
            <Video size={16} />
            <span>Switch Camera</span>
          </button>
        )}
      </div>

      <style>{`
                .ui-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    padding: 24px;
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    z-index: 20;
                    color: white;
                    font-family: 'Inter', sans-serif;
                }
                header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                h1 {
                    font-size: 1.5rem;
                    font-weight: 700;
                    text-shadow: 0 2px 10px rgba(0,0,0,0.5);
                    margin: 0;
                }
                .status-badge {
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(10px);
                    padding: 8px 16px;
                    border-radius: 20px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.9rem;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                .indicator {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: #666;
                    transition: all 0.3s ease;
                }
                .indicator.active {
                    background: #00ff88;
                    box-shadow: 0 0 10px #00ff88;
                }
                .instructions-card {
                    position: absolute;
                    top: 80px;
                    left: 24px;
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(12px);
                    padding: 20px;
                    border-radius: 16px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    width: 240px;
                }
                .instructions-card h3 {
                    margin: 0 0 16px 0;
                    font-size: 0.9rem;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    opacity: 0.7;
                }
                .instruction-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 16px;
                    opacity: 0.6;
                    transition: all 0.3s ease;
                }
                .instruction-item:last-child {
                    margin-bottom: 0;
                }
                .instruction-item.active {
                    opacity: 1;
                    color: #00ff88;
                    transform: translateX(5px);
                }
                .instruction-item span {
                    font-size: 0.9rem;
                    line-height: 1.2;
                }
                .divider {
                    height: 1px;
                    background: rgba(255,255,255,0.1);
                    margin: 10px 0;
                }
                .note {
                    font-size: 0.8rem;
                    color: #ffaa00;
                }
                .bottom-controls {
                    display: flex;
                    gap: 10px;
                    align-items: center;
                    pointer-events: auto;
                }
                .mobile-connect, .camera-switch {
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(10px);
                    padding: 10px 20px;
                    border-radius: 30px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 0.85rem;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: white;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                .camera-switch:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
            `}</style>
    </div>
  );
}

function App() {
  const { mode, setMode, peerId, connectToHost, conn } = useStore();
  const [targetId, setTargetId] = useState('');

  if (mode === 'NONE') {
    return (
      <div className="mode-selection">
        <h1>Device Control</h1>
        <div className="card-container">
          <div className="card" onClick={() => setMode('STANDALONE')}>
            <div className="icon">💻</div>
            <h2>Standalone</h2>
            <p>Use this device's camera.</p>
          </div>
          <div className="card" onClick={() => setMode('HOST')}>
            <div className="icon">🖥️</div>
            <h2>Desktop Host</h2>
            <p>Receive commands here.</p>
          </div>
          <div className="card" onClick={() => setMode('CONTROLLER')}>
            <div className="icon">📱</div>
            <h2>Mobile Controller</h2>
            <p>Use camera to control Host.</p>
          </div>
        </div>
        <style>{`
          .mode-selection {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: #111;
            color: white;
            font-family: 'Inter', sans-serif;
          }
          .card-container {
            display: flex;
            gap: 20px;
            margin-top: 40px;
            flex-wrap: wrap;
            justify-content: center;
          }
          .card {
            background: rgba(255,255,255,0.1);
            padding: 30px;
            border-radius: 20px;
            cursor: pointer;
            transition: all 0.3s ease;
            text-align: center;
            width: 200px;
            border: 1px solid rgba(255,255,255,0.1);
          }
          .card:hover {
            background: rgba(255,255,255,0.2);
            transform: translateY(-5px);
          }
          .icon {
            font-size: 3rem;
            margin-bottom: 20px;
          }
          h2 { margin: 0 0 10px 0; }
          p { margin: 0; opacity: 0.7; font-size: 0.9rem; }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#050505' }}>
      {/* Show HandTracker if Controller OR Standalone */}
      {(mode === 'CONTROLLER' || mode === 'STANDALONE') && <HandTracker />}

      <UIOverlay />

      {/* Host Connection Info */}
      {mode === 'HOST' && (
        <div className="connection-info">
          <h2>🖥️ Desktop Host</h2>
          <p className="subtext">Run <code>node server.js</code> to enable Mouse Control</p>

          <div className="id-container">
            <p>Mobile Connection Code:</p>
            <div className="code-display">
              {peerId ? (
                <>
                  <span className="code-text">{peerId}</span>
                  <button className="copy-btn" onClick={() => navigator.clipboard.writeText(peerId)}>
                    Copy
                  </button>
                </>
              ) : (
                <span className="loading">Generating Code...</span>
              )}
            </div>
          </div>

          {conn ? (
            <div className="status-connected">
              <div className="dot"></div>
              Controller Connected
            </div>
          ) : (
            <div className="status-waiting">
              <div className="spinner"></div>
              Waiting for Mobile...
            </div>
          )}

          <style>{`
            .connection-info {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(20, 20, 20, 0.9);
                backdrop-filter: blur(20px);
                padding: 50px;
                border-radius: 24px;
                text-align: center;
                color: white;
                font-family: 'Inter', sans-serif;
                border: 1px solid rgba(255,255,255,0.1);
                box-shadow: 0 20px 50px rgba(0,0,0,0.5);
                min-width: 400px;
            }
            h2 { margin: 0 0 10px 0; font-size: 2rem; }
            .subtext { color: #888; margin-bottom: 30px; font-size: 0.9rem; }
            .id-container {
                background: rgba(255,255,255,0.05);
                padding: 20px;
                border-radius: 16px;
                margin-bottom: 30px;
            }
            .code-display {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 15px;
                margin-top: 10px;
            }
            .code-text {
                font-family: monospace;
                font-size: 2rem;
                font-weight: 700;
                color: #00ff88;
                letter-spacing: 2px;
            }
            .copy-btn {
                background: rgba(255,255,255,0.1);
                border: none;
                color: white;
                padding: 8px 16px;
                border-radius: 8px;
                cursor: pointer;
                transition: background 0.2s;
            }
            .copy-btn:hover { background: rgba(255,255,255,0.2); }
            
            .status-connected {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                color: #00ff88;
                font-weight: 600;
                font-size: 1.2rem;
            }
            .dot {
                width: 10px;
                height: 10px;
                background: #00ff88;
                border-radius: 50%;
                box-shadow: 0 0 10px #00ff88;
            }
            .status-waiting {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                color: #888;
            }
            .spinner {
                width: 20px;
                height: 20px;
                border: 2px solid #888;
                border-top-color: transparent;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          `}</style>
        </div>
      )}

      {mode === 'CONTROLLER' && !conn && (
        <div className="controller-connect">
          <h2>Connect to Host</h2>
          <input
            type="text"
            placeholder="Enter Host ID"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
          />
          <button onClick={() => connectToHost(targetId)}>Connect</button>
          <style>{`
             .controller-connect {
               position: absolute;
               top: 50%;
               left: 50%;
               transform: translate(-50%, -50%);
               background: #222;
               padding: 30px;
               border-radius: 20px;
               text-align: center;
               color: white;
               font-family: sans-serif;
               display: flex;
               flex-direction: column;
               gap: 15px;
             }
             input {
               padding: 10px;
               border-radius: 8px;
               border: none;
               font-size: 1rem;
             }
             button {
               padding: 10px;
               background: #00ff88;
               border: none;
               border-radius: 8px;
               font-weight: bold;
               cursor: pointer;
             }
           `}</style>
        </div>
      )}

      {mode === 'CONTROLLER' && conn && (
        <div className="controller-view">
          <div className="controller-status">
            <div className="pulse"></div>
            Connected & Sending Data...
          </div>
          <style>{`
             .controller-view {
               position: absolute;
               top: 50%;
               left: 50%;
               transform: translate(-50%, -50%);
               color: white;
               font-family: sans-serif;
               text-align: center;
             }
             .controller-status {
               display: flex;
               flex-direction: column;
               align-items: center;
               gap: 20px;
               font-size: 1.2rem;
               opacity: 0.8;
             }
             .pulse {
               width: 60px;
               height: 60px;
               border-radius: 50%;
               background: #00ff88;
               animation: pulse 2s infinite;
             }
             @keyframes pulse {
               0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 255, 136, 0.7); }
               70% { transform: scale(1); box-shadow: 0 0 0 20px rgba(0, 255, 136, 0); }
               100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 255, 136, 0); }
             }
           `}</style>
        </div>
      )}
    </div>
  )
}

export default App

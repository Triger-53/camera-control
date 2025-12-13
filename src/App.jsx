import React, { useState, useEffect, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Html, useProgress } from '@react-three/drei'
import HandTracker from './components/HandTracker'
import ParticleSystem from './components/ParticleSystem'
import useStore from './store'
import { Hand, Zap, Move, Smartphone, Loader2 } from 'lucide-react'
import './App.css'

function Loader() {
  const { progress } = useProgress()
  return (
    <Html center>
      <div style={{ color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
        <Loader2 className="spin" size={32} />
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px' }}>{progress.toFixed(0)}% loaded</div>
      </div>
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </Html>
  )
}

const UIOverlay = () => {
  const { gesture, isPinching } = useStore();
  const [ipAddress, setIpAddress] = useState('localhost');

  useEffect(() => {
    setIpAddress(window.location.hostname);
  }, []);

  return (
    <div className="ui-overlay">
      <header>
        <h1>Particle Gesture System</h1>
        <div className="status-badge">
          <span className={`indicator ${gesture !== 'NONE' ? 'active' : ''}`}></span>
          {gesture === 'NONE' ? 'No Gesture' : gesture}
        </div>
      </header>

      <div className="instructions-card">
        <h3>Controls</h3>
        <div className={`instruction-item ${gesture === 'OPEN_PALM' ? 'active' : ''}`}>
          <Hand size={20} />
          <span><strong>Open Palm</strong><br />Switch Shape</span>
        </div>
        <div className={`instruction-item ${isPinching ? 'active' : ''}`}>
          <Zap size={20} />
          <span><strong>Pinch</strong><br />Attract & Swirl</span>
        </div>
        <div className="instruction-item">
          <Move size={20} />
          <span><strong>Move Hand</strong><br />Repel Particles</span>
        </div>
      </div>

      <div className="mobile-connect">
        <Smartphone size={16} />
        <span>Connect Mobile: <strong>https://{ipAddress}:5173</strong></span>
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
                    width: 220px;
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
                .mobile-connect {
                    align-self: flex-start;
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(10px);
                    padding: 10px 20px;
                    border-radius: 30px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 0.85rem;
                    border: 1px solid rgba(255, 255, 255, 0.1);
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
        <h1>Particle Gesture System</h1>
        <div className="card-container">
          <div className="card" onClick={() => setMode('STANDALONE')}>
            <div className="icon">💻</div>
            <h2>Standalone</h2>
            <p>Use this device's camera & screen.</p>
          </div>
          <div className="card" onClick={() => setMode('HOST')}>
            <div className="icon">🖥️</div>
            <h2>Desktop Host</h2>
            <p>Display particles here. (Remote)</p>
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

      {/* Show 3D Scene if Host OR Standalone */}
      {(mode === 'HOST' || mode === 'STANDALONE') && (
        <>
          <Canvas camera={{ position: [0, 0, 6], fov: 50 }} dpr={[1, 2]}>
            <color attach="background" args={['#050505']} />
            <ambientLight intensity={0.2} />
            <pointLight position={[10, 10, 10]} intensity={1} />
            <Suspense fallback={<Loader />}>
              <ParticleSystem />
            </Suspense>
            <OrbitControls enableZoom={false} enablePan={false} />
          </Canvas>

          {/* Host Connection Info */}
          {mode === 'HOST' && (
            <div className="connection-info">
              <h3>Waiting for Controller...</h3>
              <p>Enter this ID on your mobile:</p>
              <div className="code">{peerId || 'Generating ID...'}</div>
              {conn && <div className="status-connected">Controller Connected!</div>}
              <style>{`
                        .connection-info {
                            position: absolute;
                            bottom: 40px;
                            left: 50%;
                            transform: translateX(-50%);
                            background: rgba(0,0,0,0.8);
                            padding: 20px;
                            border-radius: 12px;
                            text-align: center;
                            color: white;
                            font-family: sans-serif;
                            border: 1px solid #333;
                        }
                        .code {
                            font-size: 1.5rem;
                            font-weight: bold;
                            color: #00ff88;
                            margin: 10px 0;
                            user-select: text;
                        }
                        .status-connected {
                            color: #00ff88;
                            margin-top: 10px;
                        }
                    `}</style>
            </div>
          )}
        </>
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

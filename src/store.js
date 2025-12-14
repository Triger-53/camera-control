import { create } from 'zustand'
import Peer from 'peerjs'

const useStore = create((set, get) => ({
    handPosition: [0, 0, 0],
    isPinching: false,
    isOpenPalm: false,
    gesture: 'NONE',
    mode: 'NONE', // 'HOST', 'CONTROLLER', 'STANDALONE'
    peer: null,
    conn: null,
    peerId: null, // My ID
    targetId: '', // ID to connect to

    // 3D Transformations
    rotation: [0, 0, 0],
    zoom: 1,
    shapePosition: [0, 0, 0],

    // Camera Control
    cameraDeviceId: null,
    availableCameras: [],
    setCameraDeviceId: (id) => set({ cameraDeviceId: id }),
    setAvailableCameras: (cameras) => set({ availableCameras: cameras }),

    setMode: (mode) => {
        set({ mode });

        if (mode === 'STANDALONE') {
            // No networking needed
            return;
        }

        // Initialize PeerJS for Host or Controller
        const peer = new Peer();

        peer.on('open', (id) => {
            console.log('My Peer ID is: ' + id);
            set({ peerId: id, peer });
        });

        if (mode === 'HOST') {
            peer.on('connection', (conn) => {
                console.log('Controller connected');
                set({ conn });
                conn.on('data', (data) => {
                    if (data.type === 'CONTROL') {
                        get().sendControlCommand(data.action);
                    } else if (data.type === 'MOUSE') {
                        get().sendMouseData(data);
                    } else {
                        set(data);
                    }
                });
            });
        }
    },

    connectToHost: (hostId) => {
        const { peer } = get();
        if (!peer) return;

        const conn = peer.connect(hostId);
        conn.on('open', () => {
            console.log('Connected to Host');
            set({ conn });
        });
        set({ targetId: hostId });
    },

    setHandData: (data) => {
        set((state) => {
            // If Controller, send data
            if (state.mode === 'CONTROLLER' && state.conn) {
                state.conn.send(data);
            }
            // Update local state (for Standalone or local feedback)
            return { ...state, ...data };
        });
    },

    sendControlCommand: async (action) => {
        const state = get();

        // If Controller, send to Host
        if (state.mode === 'CONTROLLER' && state.conn) {
            state.conn.send({ type: 'CONTROL', action });
            return;
        }

        // If Host or Standalone, execute locally
        if (state.mode === 'HOST' || state.mode === 'STANDALONE') {
            try {
                await fetch('/api/control', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action })
                });
            } catch (err) {
                console.error('Failed to send control command', err);
            }
        }
    },

    sendMouseData: (data) => {
        const state = get();
        // data: { type, x, y }

        // If Controller, send to Host via PeerJS
        if (state.mode === 'CONTROLLER' && state.conn) {
            state.conn.send({ type: 'MOUSE', ...data });
            return;
        }

        // If Host, send to Local Server via Socket
        if (state.mode === 'HOST' || state.mode === 'STANDALONE') {
            if (state.socket) {
                state.socket.emit('mouse-data', data);
            }
        }
    },
}))

export default useStore

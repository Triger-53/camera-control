import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import compression from 'compression';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);

// Enable Gzip compression
app.use(compression());

// Serve static files from the build directory
app.use(express.static(join(__dirname, 'dist')));

// Enable CORS for development
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Device Control Endpoint
import { exec, spawn } from 'child_process';

// Spawn Swift Mouse Control Process
const mouseProcess = spawn('swift', ['mouse_control.swift']);

mouseProcess.stdout.on('data', (data) => {
    console.log(`Mouse stdout: ${data}`);
});

mouseProcess.stderr.on('data', (data) => {
    console.error(`Mouse stderr: ${data}`);
});

mouseProcess.on('close', (code) => {
    console.log(`Mouse process exited with code ${code}`);
});

app.use(express.json());

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join-host', () => {
        console.log('Host joined:', socket.id);
        socket.join('host');
    });

    socket.on('join-controller', () => {
        console.log('Controller joined:', socket.id);
        socket.join('controller');
    });

    socket.on('gesture-data', (data) => {
        io.to('host').emit('gesture-update', data);
    });

    // Handle Mouse Data Stream
    socket.on('mouse-data', (data) => {
        // data: { type: 'MOVE'|'DOWN'|'UP'|'DRAG', x, y }
        if (!mouseProcess.stdin.writable) return;

        const { type, x, y } = data;
        let cmd = '';

        switch (type) {
            case 'MOVE':
                cmd = `m ${x} ${y}\n`;
                break;
            case 'DOWN':
                cmd = `l\n`;
                break;
            case 'UP':
                cmd = `u\n`;
                break;
            case 'DRAG':
                cmd = `d ${x} ${y}\n`;
                break;
            case 'RIGHT_CLICK':
                cmd = `r\n`;
                break;
        }

        if (cmd) {
            mouseProcess.stdin.write(cmd);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

app.post('/api/control', (req, res) => {
    const { action } = req.body;
    console.log('Executing control action:', action);

    let script = '';

    // Mac Shortcuts
    switch (action) {
        case 'SWIPE_LEFT':
            // Ctrl + Left Arrow (Previous Space)
            script = `tell application "System Events" to key code 123 using control down`;
            break;
        case 'SWIPE_RIGHT':
            // Ctrl + Right Arrow (Next Space)
            script = `tell application "System Events" to key code 124 using control down`;
            break;
        case 'SWIPE_UP':
            // Ctrl + Up Arrow (Mission Control)
            script = `tell application "System Events" to key code 126 using control down`;
            break;
        case 'SWIPE_DOWN':
            // Ctrl + Down Arrow (App Expose)
            script = `tell application "System Events" to key code 125 using control down`;
            break;
        default:
            return res.status(400).json({ error: 'Unknown action' });
    }

    exec(`osascript -e '${script}'`, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return res.status(500).json({ error: 'Command failed' });
        }
        res.json({ success: true });
    });
});

const PORT = 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Socket server running on port ${PORT}`);
});

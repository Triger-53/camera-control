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
        // Broadcast to all hosts
        io.to('host').emit('gesture-update', data);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

const PORT = 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Socket server running on port ${PORT}`);
});

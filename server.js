 const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = require('socket.io')(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
    console.log('A device connected:', socket.id);

    // 1. Host creates a room
    socket.on('create-room', (roomId) => {
        socket.join(roomId);
        console.log(`Host created and joined room: ${roomId}`);
    });

    // 2. Client joins a room (🔴 UPDATED to handle video preferences)
    socket.on('join-room', (data) => {
        // Backwards compatibility: Check if data is just a string or the new object
        const roomId = typeof data === 'string' ? data : data.roomId;
        const wantsVideo = typeof data === 'string' ? false : data.wantsVideo;
        
        socket.join(roomId);
        console.log(`Client joined room: ${roomId} | Wants Video: ${wantsVideo}`);
        
        // Notify the host so the host knows whether to send video or just audio
        socket.to(roomId).emit('client-joined', { clientId: socket.id, wantsVideo });
    });

    // 3. WebRTC Matchmaking
    socket.on('webrtc-offer', ({ offer, to }) => {
        socket.to(to).emit('webrtc-offer', { offer, from: socket.id });
    });

    socket.on('webrtc-answer', ({ answer, to }) => {
        socket.to(to).emit('webrtc-answer', { answer, from: socket.id });
    });

    socket.on('ice-candidate', ({ candidate, to }) => {
        socket.to(to).emit('ice-candidate', { candidate, from: socket.id });
    });

    // 4. Phase 1: Play/Pause Sync
    socket.on('host-paused', (roomId) => {
        socket.to(roomId).emit('movie-paused');
    });

    socket.on('host-played', (roomId) => {
        socket.to(roomId).emit('movie-played');
    });

    socket.on('disconnect', () => {
        console.log('Device disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Sonic Flow signaling server running on port ${PORT}`);
});
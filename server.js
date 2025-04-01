const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const rooms = {};

io.on('connection', (socket) => {
    console.log('Novo usuário conectado:', socket.id);

    let roomId = 'room-1';
    if (!rooms[roomId]) {
        rooms[roomId] = [socket.id];
    } else if (rooms[roomId].length < 8) {
        rooms[roomId].push(socket.id);
    } else {
        roomId = `room-${Date.now()}`;
        rooms[roomId] = [socket.id];
    }

    socket.join(roomId);
    console.log(`Usuário ${socket.id} entrou na sala ${roomId}`);
    console.log('Estado das salas:', rooms);

    io.to(roomId).emit('user-connected', { users: rooms[roomId], roomId });

    socket.on('offer', (data) => {
        console.log('Offer recebido de', socket.id, 'para', data.target);
        socket.to(data.target).emit('offer', { offer: data.offer, sender: socket.id });
    });

    socket.on('answer', (data) => {
        console.log('Answer recebido de', socket.id, 'para', data.target);
        socket.to(data.target).emit('answer', { answer: data.answer, sender: socket.id });
    });

    socket.on('candidate', (data) => {
        console.log('Candidate recebido de', socket.id, 'para', data.target);
        socket.to(data.target).emit('candidate', { candidate: data.candidate, sender: socket.id });
    });

    socket.on('disconnect', () => {
        console.log('Usuário desconectado:', socket.id);
        if (rooms[roomId]) {
            rooms[roomId] = rooms[roomId].filter(id => id !== socket.id);
            if (rooms[roomId].length === 0) delete rooms[roomId];
            io.to(roomId).emit('user-disconnected', socket.id);
        }
        console.log('Estado das salas após desconexão:', rooms);
    });
});

server.listen(3000, '0.0.0.0', () => {
    console.log('Servidor rodando em http://localhost:3000');
});
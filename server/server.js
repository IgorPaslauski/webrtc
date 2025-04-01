const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const roomManager = require('./roomManager');
const socketEvents = require('./socketEvents');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Servir arquivos estáticos (pasta public)
app.use(express.static('public'));

// Inicializar o gerenciador de salas
roomManager.initialize(io);

// Configurar eventos do Socket.IO
socketEvents.setup(io, roomManager);

const PORT = 3000;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
    console.log(`Servidor rodando em http://${HOST}:${PORT}`);
});
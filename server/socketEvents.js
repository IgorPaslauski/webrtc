class SocketEvents {
    static setup(io, roomManager) {
        io.on('connection', (socket) => {
            console.log('Novo usuário conectado:', socket.id);
            const roomId = roomManager.getOrCreateRoom(socket.id);
            socket.join(roomId);

            console.log(`Usuário ${socket.id} entrou na sala ${roomId}`);
            console.log('Estado das salas:', roomManager.getRooms());

            io.to(roomId).emit('user-connected', {
                users: roomManager.getRoomUsers(roomId),
                roomId
            });

            socket.on('offer', (data) => {
                console.log('Offer recebido de', socket.id, 'para', data.target);
                socket.to(data.target).emit('offer', {
                    offer: data.offer,
                    sender: socket.id
                });
            });

            socket.on('answer', (data) => {
                console.log('Answer recebido de', socket.id, 'para', data.target);
                socket.to(data.target).emit('answer', {
                    answer: data.answer,
                    sender: socket.id
                });
            });

            socket.on('candidate', (data) => {
                console.log('Candidate recebido de', socket.id, 'para', data.target);
                socket.to(data.target).emit('candidate', {
                    candidate: data.candidate,
                    sender: socket.id
                });
            });

            socket.on('disconnect', () => {
                console.log('Usuário desconectado:', socket.id);
                const removed = roomManager.removeUser(socket.id, roomId);
                if (removed) {
                    io.to(roomId).emit('user-disconnected', socket.id);
                    console.log('Estado das salas após desconexão:', roomManager.getRooms());
                }
            });
        });
    }
}

module.exports = SocketEvents;
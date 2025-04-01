const rooms = {};

class RoomManager {
    static initialize(io) {
        this.io = io;
    }

    static getOrCreateRoom(socketId) {
        let roomId = Object.keys(rooms).find(room =>
            rooms[room] && rooms[room].length < 8
        );

        if (!roomId) {
            roomId = `room-${Date.now()}`;
            rooms[roomId] = [];
        }

        if (!rooms[roomId].includes(socketId)) {
            rooms[roomId].push(socketId);
        }

        return roomId;
    }

    static removeUser(socketId, roomId) {
        if (rooms[roomId]) {
            rooms[roomId] = rooms[roomId].filter(id => id !== socketId);
            if (rooms[roomId].length === 0) {
                delete rooms[roomId];
            }
            return true;
        }
        return false;
    }

    static getRoomUsers(roomId) {
        return rooms[roomId] || [];
    }

    static getRooms() {
        return rooms;
    }
}

module.exports = RoomManager;
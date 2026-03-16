import { Server } from 'socket.io';
import { RoomManager } from './room-manager.ts';
import type { ClientPayload, JoinRoomPayload } from './room-manager.ts';

function broadcastRoomsList(io: Server, roomManager: RoomManager): void {
    io.emit('rooms_list', roomManager.getRoomsList());
}

export function registerSocketHandlers(io: Server, roomManager: RoomManager): void {
    io.on('connection', (socket) => {
        socket.emit('rooms_list', roomManager.getRoomsList());

        socket.on('get_rooms', () => {
            socket.emit('rooms_list', roomManager.getRoomsList());
        });

        socket.on('create_room', (payload: ClientPayload) => {
            const result = roomManager.createRoom(socket.id, payload);
            if (!result.ok) {
                socket.emit('error_message', result.error);
                return;
            }

            socket.join(result.roomState.roomId);
            socket.emit('room_created', { roomId: result.roomState.roomId });
            io.to(result.roomState.roomId).emit('room_state', result.roomState);
            broadcastRoomsList(io, roomManager);
        });

        socket.on('join_room', (payload: JoinRoomPayload) => {
            const result = roomManager.joinRoom(socket.id, payload);
            if (!result.ok) {
                socket.emit('error_message', result.error);
                return;
            }

            socket.join(result.roomState.roomId);
            io.to(result.roomState.roomId).emit('room_state', result.roomState);
            broadcastRoomsList(io, roomManager);
        });

        socket.on('leave_room', () => {
            const roomId = roomManager.getRoomIdForSocket(socket.id);
            if (roomId) {
                socket.leave(roomId);
            }

            const result = roomManager.leaveRoom(socket.id);
            if (result?.roomState) {
                io.to(result.roomId).emit('room_state', result.roomState);
            }

            broadcastRoomsList(io, roomManager);
            socket.emit('left_room');
        });

        socket.on('disconnect', () => {
            const result = roomManager.leaveRoom(socket.id);
            if (result?.roomState) {
                io.to(result.roomId).emit('room_state', result.roomState);
            }
            broadcastRoomsList(io, roomManager);
        });
    });
}

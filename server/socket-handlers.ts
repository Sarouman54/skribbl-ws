import { Server } from 'socket.io';
import { RoomManager } from './room-manager.ts';
import type { ClientPayload, JoinRoomPayload } from './room-manager.ts';
import { GameManager } from './game-manager.ts';

const RECONNECT_GRACE_MS = 5000;

function broadcastRoomsList(io: Server, roomManager: RoomManager): void {
	io.emit('rooms_list', roomManager.getRoomsList());
}

export function registerSocketHandlers(io: Server, roomManager: RoomManager, gameManager: GameManager): void {
    const pendingDisconnects = new Map<string, ReturnType<typeof setTimeout>>();

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
			io.to(result.roomState.roomId).emit('room_state', result.roomState);
			broadcastRoomsList(io, roomManager);
		});

		socket.on('join_room', (payload: JoinRoomPayload) => {
			const roomId = (payload?.roomId ?? '').trim().toUpperCase();
			const username = (payload?.username ?? '').trim();

			const oldSocketId = roomManager.findDisconnectedPlayer(roomId, username);
			if (oldSocketId && pendingDisconnects.has(oldSocketId)) {
				clearTimeout(pendingDisconnects.get(oldSocketId));
				pendingDisconnects.delete(oldSocketId);

				const result = roomManager.resumePlayer(oldSocketId, socket.id);
				if (result.ok) {
					socket.join(result.roomState.roomId);
					io.to(result.roomState.roomId).emit('room_state', result.roomState);
				}
				return;
			}

			const result = roomManager.joinRoom(socket.id, payload);
			if (!result.ok) {
				socket.emit('error_message', result.error);
				return;
			}

			socket.join(result.roomState.roomId);
			io.to(result.roomState.roomId).emit('room_state', result.roomState);
			broadcastRoomsList(io, roomManager);
		});

        socket.on('start_game', () => {
            const roomId = roomManager.getRoomIdForSocket(socket.id);
            if (!roomId) return;

            if (!roomManager.isRoomOwner(socket.id)) {
                socket.emit('error_message', "Seul l'hôte peut lancer la partie.");
                return;
            }

            const drawerId = roomManager.getRandomPlayer(roomId);
            if (!drawerId) return;

            gameManager.startGame(roomId);
            const words = gameManager.getWords(roomId);
            io.to(roomId).emit('game_started', { drawerId });
            setTimeout(() => io.to(drawerId).emit('send_words', words), 500);
        });

        socket.on('word_chosen', (word: string) => {
            const roomId = roomManager.getRoomIdForSocket(socket.id);
            if (!roomId) return;

            io.to(roomId).emit('drawing_started', { drawerId: socket.id, word });
        });

        socket.on('leave_room', () => {
            const roomId = roomManager.getRoomIdForSocket(socket.id);
            if (roomId) socket.leave(roomId);

			const result = roomManager.leaveRoom(socket.id);
			if (result?.roomState) {
				io.to(result.roomId).emit('room_state', result.roomState);
			}

			broadcastRoomsList(io, roomManager);
			socket.emit('left_room');
		});

		socket.on('send_guess', (payload: { text: string }) => {
			console.log('Message reçu côté serveur :', payload.text);
		});

		socket.on('disconnect', () => {
			if (!roomManager.getRoomIdForSocket(socket.id)) return;

			const timer = setTimeout(() => {
				pendingDisconnects.delete(socket.id);
				const result = roomManager.leaveRoom(socket.id);
				if (result?.roomState) {
					io.to(result.roomId).emit('room_state', result.roomState);
				}
				broadcastRoomsList(io, roomManager);
			}, RECONNECT_GRACE_MS);

			pendingDisconnects.set(socket.id, timer);
		});
	});
}

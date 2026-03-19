import { socket } from './utils/socket.ts';
import { showError } from './utils/error.ts';
import * as game from './game/game.ts';
import { initChat } from './chat/chat.ts';
import { initCanvas } from './canvas/canvas.ts';

import type { PublicRoomState } from './utils/types.ts';

const stored = sessionStorage.getItem('skribbl_room');

if (!stored) {
	window.location.href = '/';
} else {
	const { roomId, username } = JSON.parse(stored) as { roomId: string; username: string };

	socket.on('connect', () => {
		socket.emit('join_room', { join: roomId, username });
	});

	game.init();
	initCanvas();
	initChat(username);

	socket.on('room_state', (roomState: PublicRoomState) => {
		game.renderPlayers(roomState);
	});

	socket.on('left_room', () => {
		sessionStorage.removeItem('skribbl_room');
		window.location.href = '/';
	});

	socket.on('error', (message: string) => {
		showError(message);
	});

	socket.on('disconnect', () => {
		showError('Connexion perdue avec le serveur.');
	});
}

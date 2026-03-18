import { socket } from './utils/socket.ts';
import { showError } from './utils/error.ts';
import * as game from './game/game.ts';
import { initChat } from './chat/chat.ts';

const stored = sessionStorage.getItem('skribbl_room');

if (!stored) {
	window.location.href = '/';
} else {
	const { roomId, username } = JSON.parse(stored) as { roomId: string; username: string };

	socket.on('connect', () => {
		socket.emit('join_room', { roomId, username });
	});

	game.init();
	initChat(username);

	socket.on('left_room', () => {
		sessionStorage.removeItem('skribbl_room');
		window.location.href = '/';
	});

	socket.on('error_message', (message: string) => {
		showError(message);
	});

	socket.on('disconnect', () => {
		showError('Connexion perdue avec le serveur.');
	});
}

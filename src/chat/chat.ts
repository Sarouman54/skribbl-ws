// src/chat.ts

import { socket } from '../utils/socket.ts';

const guessInput: HTMLInputElement = document.getElementById('guessInput') as HTMLInputElement;
const chatForm: HTMLFormElement = document.getElementById('chatForm') as HTMLFormElement;

chatForm?.addEventListener('submit', (e: Event) => {
	e.preventDefault(); 

	const guess = guessInput.value.trim();
	if ( !guess ) return;

	socket.emit('send_guess', { text: guess });

	guessInput.value = '';
});
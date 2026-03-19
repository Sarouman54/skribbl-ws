import { socket } from '../utils/socket.ts';

export function initChat(username: string) {

	const guessInput: HTMLInputElement = document.getElementById('guessInput') as HTMLInputElement;
	const chatForm: HTMLFormElement = document.getElementById('chatForm') as HTMLFormElement;
	const chatMessages: HTMLUListElement = document.getElementById('chatMessages') as HTMLUListElement;

	if (!guessInput || !chatForm || !chatMessages) {
		console.error("Les éléments du chat sont introuvables dans le DOM.");
		return;
	}

	chatForm?.addEventListener('submit', (e: Event) => {
		e.preventDefault();

		const guess = guessInput.value.trim();
		if (!guess) return;

		socket.emit('send_guess', { player: username, text: guess });

		guessInput.value = '';
	});

	socket.on('chat_message', (payload: { player: string, text: string, type: string }) => {
		addChatMessage(payload.player, payload.text, payload.type as 'normal' | 'almost' | 'success' );
	});

	socket.on('guess_success', (payload: { player: string, message: string }) => {
		addChatMessage(payload.player, payload.message, 'success');
	});

	function addChatMessage(player: string, text: string, type: 'normal' | 'almost' | 'success') {
		const li = document.createElement('li');

		const playerSpan = document.createElement('strong');
		playerSpan.textContent = `${player}: `;

		const textSpan = document.createElement('span');
		textSpan.textContent = text;

		if ( type === 'success' ) {
			li.style.backgroundColor = '#43ff64d9';
		} else if ( type === 'almost' ) {
			li.style.backgroundColor = '#ffa719cc';
		}
		li.style.listStyle = 'none';
		li.style.padding = '2px 8px';
            li.style.borderRadius = '4px';
            li.style.marginBottom = '4px';

		li.appendChild(playerSpan);
		li.appendChild(textSpan);

		if (chatMessages.children.length === 0) {
                  li.classList.add('mt-auto');
            }
		
		chatMessages.appendChild(li);
		chatMessages.scrollTop = chatMessages.scrollHeight;
	}

}
import { socket } from '../utils/socket.ts';

function setChatEnabled(enabled: boolean) {
    const input = document.getElementById('guessInput') as HTMLInputElement;
    const btn = document.getElementById('sendGuess') as HTMLButtonElement;
    input.disabled = !enabled;
    btn.disabled = !enabled;
    input.placeholder = enabled ? 'Devinez le mot ici...' : 'Tu es le dessinateur !';
}

export function init() {
    const leaveGameBtn = document.getElementById('leaveGameBtn') as HTMLButtonElement;

    leaveGameBtn.addEventListener('click', () => {
        socket.emit('leave_room');
    });

    socket.on('send_words', (words: [string, string, string]) => {
        setChatEnabled(false);
        showWordChoice(words);
    });

    socket.on('drawing_started', (data: { drawerId: string; word: string }) => {
        const wordToDraw = document.getElementById('wordToDraw') as HTMLElement;
        const isDrawer = data.drawerId === socket.id;
        wordToDraw.textContent = isDrawer ? `Mot à dessiner : ${data.word}` : 'Devinez le mot !';
        setChatEnabled(!isDrawer);
    });

    socket.on('new_turn', (data: { drawerId: string }) => {
        const wordToDraw = document.getElementById('wordToDraw') as HTMLElement;
        const isDrawer = data.drawerId === socket.id;
        wordToDraw.textContent = isDrawer ? 'Choisis un mot…' : 'Devinez le mot !';
        setChatEnabled(!isDrawer);
    });

    socket.on('manche_over', () => {
        const wordToDraw = document.getElementById('wordToDraw') as HTMLElement;
        wordToDraw.textContent = 'Manche terminée ! Retour au lobby...';
        setChatEnabled(false);
        setTimeout(() => { window.location.href = '/'; }, 3000);
    });
}

function showWordChoice(words: [string, string, string]) {
    const section = document.getElementById('wordChoice') as HTMLElement;
    const buttons = section.querySelectorAll('button');

    words.forEach((word, i) => {
        buttons[i].textContent = word;
        buttons[i].onclick = () => {
            socket.emit('word_chosen', word);
            section.classList.add('hidden');
        };
    });

    section.classList.remove('hidden');
}

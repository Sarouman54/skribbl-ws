import { socket } from '../utils/socket.ts';

export function render(data: any) {
    const wordToDraw = document.getElementById('wordToDraw') as HTMLElement;

    if (data.word) {
        wordToDraw.textContent = `Mot à dessiner : ${data.word}`;
    }
}

export function init() {
  const leaveGameBtn = document.getElementById('leaveGameBtn') as HTMLButtonElement;

  leaveGameBtn.addEventListener('click', () => {
    socket.emit('leave_room');
  });

  socket.on('send_words', (words: [string, string, string]) => {
    showWordChoice(words);
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

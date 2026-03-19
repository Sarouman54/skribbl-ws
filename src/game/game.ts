import { socket } from '../utils/socket.ts';

import type { PublicRoomState, Player } from '../utils/types.ts';

let currentPlayers: Player[] = [];
let timerInterval: any = null;

export function render(data: any) {
    const wordToDraw = document.getElementById('wordToDraw') as HTMLElement;

    if (data.word) {
        if (wordToDraw) wordToDraw.textContent = `Mot à dessiner : ${data.word}`;
    }
}

export function renderPlayers(roomState: PublicRoomState) {
    const playersList = document.getElementById('playersList') as HTMLUListElement;
    if (!playersList) return;

    currentPlayers = roomState.players; // Sauvegarder la liste des joueurs

    playersList.innerHTML = '';
    const sortedPlayers = [...roomState.players].sort((a, b) => (b.score || 0) - (a.score || 0));

    for (let i = 0; i < sortedPlayers.length; i++) {
        const player = sortedPlayers[i];
        const li = document.createElement('li');
        li.className = 'player-item';

        const leftGroup = document.createElement('div');
        leftGroup.style.display = 'flex';
        leftGroup.style.alignItems = 'center';

        const rankSpan = document.createElement('span');
        rankSpan.className = 'player-rank';
        rankSpan.textContent = `#${i + 1}`;

        const nameSpan = document.createElement('span');
        nameSpan.textContent = player.username;

        leftGroup.appendChild(rankSpan);
        leftGroup.appendChild(nameSpan);

        const scoreSpan = document.createElement('span');
        scoreSpan.className = 'player-score';
        scoreSpan.textContent = `${player.score || 0} pt`;

        li.appendChild(leftGroup);
        li.appendChild(scoreSpan);
        playersList.appendChild(li);
    }
}

export function init() {
  const leaveGameBtn = document.getElementById('leaveGameBtn') as HTMLButtonElement;
  const btnStartRound = document.getElementById('btnStartRound') as HTMLButtonElement;
  const btnEndRound = document.getElementById('btnEndRound') as HTMLButtonElement;
  const mockWordInput = document.getElementById('mockWord') as HTMLInputElement;

  const mockDrawer = document.getElementById('mockDrawer');
  const mockTimer = document.getElementById('mockTimer');

  if (leaveGameBtn) {
      leaveGameBtn.addEventListener('click', () => {
        socket.emit('leave_room');
      });
  }

  btnStartRound?.addEventListener('click', () => {
      const word = mockWordInput ? mockWordInput.value.trim() : '';
      if (word) {
          socket.emit('word_chosen', word);
          if (mockWordInput) mockWordInput.value = ''; 
      }
  });

  btnEndRound?.addEventListener('click', () => {
      socket.emit('end_round');
  });

  socket.on('send_words', (words: [string, string, string]) => {
    showWordChoice(words);
  });

  // Nouveaux écouteurs pour la simulation
  socket.on('drawing_started', (data: { drawerId: string, word?: string }) => {
      if (mockDrawer) {
          const drawer = currentPlayers.find(p => p.id === data.drawerId);
          mockDrawer.textContent = drawer ? drawer.username : 'Inconnu';
      }

      if (mockTimer) {
          let timeLeft = 80;
          mockTimer.textContent = timeLeft.toString();

          if (timerInterval) clearInterval(timerInterval);
          
          timerInterval = setInterval(() => {
              timeLeft--;
              mockTimer.textContent = timeLeft.toString();
              if (timeLeft <= 0) {
                  clearInterval(timerInterval);
              }
          }, 1000);
      }
  });

  socket.on('round_ended', () => {
      if (timerInterval) clearInterval(timerInterval);
      if (mockTimer) mockTimer.textContent = '0';
      if (mockDrawer) mockDrawer.textContent = 'Manche terminée';
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

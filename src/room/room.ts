import { socket } from '../utils/socket.ts';
import { clearError } from '../utils/error.ts';
import type { PublicRoomState } from '../utils/types.ts';

export function render(roomState: PublicRoomState) {
  const roomInfo = document.getElementById('roomInfo') as HTMLElement;
  const playersList = document.getElementById('playersList') as HTMLUListElement;
  const startGameBtn = document.getElementById('startGameBtn') as HTMLButtonElement;

  roomInfo.textContent = `Room de ${roomState.ownerUsername} (${roomState.roomId})`;
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
    nameSpan.textContent =
      player.id === roomState.ownerId ? `${player.username} (hote)` : player.username;

    leftGroup.appendChild(rankSpan);
    leftGroup.appendChild(nameSpan);

    const scoreSpan = document.createElement('span');
    scoreSpan.className = 'player-score';
    scoreSpan.textContent = `${player.score || 0} pt`;

    li.appendChild(leftGroup);
    li.appendChild(scoreSpan);
    playersList.appendChild(li);
  }

  const isHost = socket.id === roomState.ownerId;
  startGameBtn.style.display = isHost && playersList.childElementCount >= 2 ? 'block' : 'none';
}

export function init() {
  const leaveRoomBtn = document.getElementById('leaveRoomBtn') as HTMLButtonElement;
  const startGameBtn = document.getElementById('startGameBtn') as HTMLButtonElement;

  leaveRoomBtn.addEventListener('click', () => {
    clearError();
    socket.emit('leave_room');
  });

  startGameBtn.addEventListener('click', () => {
    socket.emit('start_game');
  });
}

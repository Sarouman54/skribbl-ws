import { socket } from '../utils/socket.ts';
import { clearError } from '../utils/error.ts';
import type { PublicRoomState } from '../utils/types.ts';

export function render(roomState: PublicRoomState) {
  const roomInfo = document.getElementById('roomInfo') as HTMLElement;
  const playersList = document.getElementById('playersList') as HTMLUListElement;
  const startGameBtn = document.getElementById('startGameBtn') as HTMLButtonElement;

  roomInfo.textContent = `Room de ${roomState.ownerUsername} (${roomState.roomId})`;
  playersList.innerHTML = '';

  for (const player of roomState.players) {
    const li = document.createElement('li');
    li.className = 'player-item';

    const label = document.createElement('span');
    label.textContent =
      player.id === roomState.ownerId ? `${player.username} (hote)` : player.username;

    li.appendChild(label);
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

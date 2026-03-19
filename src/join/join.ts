import { socket } from '../utils/socket.ts';
import { clearError } from '../utils/error.ts';
import { getUsername, validateUsernameOrShowError } from '../username/username.ts';
import type { PublicRoomSummary } from '../utils/types.ts';

const section = document.getElementById('joinView') as HTMLElement;
const roomsList = document.getElementById('roomsList') as HTMLUListElement;

export function show() { section.classList.remove('hidden'); }
export function hide() { section.classList.add('hidden'); }

export function renderRoomsList(rooms: PublicRoomSummary[]) {
  roomsList.innerHTML = '';

  if (!rooms.length) {
    const empty = document.createElement('li');
    empty.className = 'muted room-item';
    empty.textContent = 'Aucune room disponible pour le moment.';
    roomsList.appendChild(empty);
    return;
  }

  for (const room of rooms) {
    const item = document.createElement('li');
    item.className = 'room-item';

    const label = document.createElement('span');
    label.textContent = `${room.roomId} | Hote: ${room.ownerUsername} | ${room.playerCount} joueur(s)`;

    const joinBtn = document.createElement('button');
    joinBtn.type = 'button';
    joinBtn.textContent = 'Rejoindre';
    joinBtn.addEventListener('click', () => {
      if (!validateUsernameOrShowError()) return;
      clearError();
      socket.emit('join_room', { join: room.roomId, username: getUsername() });
    });

    item.appendChild(label);
    item.appendChild(joinBtn);
    roomsList.appendChild(item);
  }
}

export function init(onBack: () => void) {
  const backLobbyBtn = document.getElementById('backLobbyBtn') as HTMLButtonElement;

  backLobbyBtn.addEventListener('click', () => {
    clearError();
    onBack();
  });
}

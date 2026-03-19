import { socket } from '../utils/socket.ts';
import { clearError } from '../utils/error.ts';
import { getUsername, validateUsernameOrShowError } from '../username/username.ts';

const section = document.getElementById('lobbyView') as HTMLElement;

export function show() { section.classList.remove('hidden'); }
export function hide() { section.classList.add('hidden'); }

export function init(onGoJoin: () => void) {
  const createRoomBtn = document.getElementById('createRoomBtn') as HTMLButtonElement;
  const goJoinViewBtn = document.getElementById('goJoinViewBtn') as HTMLButtonElement;

  createRoomBtn.addEventListener('click', () => {
    if (!validateUsernameOrShowError()) return;
    clearError();
    socket.emit('create_room', { username: getUsername(), join: '' });
  });

  goJoinViewBtn.addEventListener('click', () => {
    if (!validateUsernameOrShowError()) return;
    clearError();
    socket.emit('get_rooms');
    onGoJoin();
  });
}

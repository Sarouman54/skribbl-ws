import { socket } from './utils/socket.ts';
import { showError, clearError } from './utils/error.ts';
import type { PublicRoomState, PublicRoomSummary } from './utils/types.ts';
import * as username from './username/username.ts';
import * as lobby from './lobby/lobby.ts';
import * as join from './join/join.ts';
import * as room from './room/room.ts';

let inRoom = false;

username.init();
lobby.init(() => { lobby.hide(); join.show(); });
join.init(() => { join.hide(); lobby.show(); });

socket.on('connect', () => {
  clearError();
  socket.emit('get_rooms');
});

socket.on('disconnect', () => {
  showError('Connexion perdue avec le serveur.');
});

socket.on('error_message', (message: string) => {
  showError(message);
});

socket.on('rooms_list', (rooms: PublicRoomSummary[]) => {
  join.renderRoomsList(rooms);
});

socket.on('room_state', async (roomState: PublicRoomState) => {
  const me = roomState.players.find((p) => p.id === socket.id);
  if (!me) return;

  if (!inRoom) {
    inRoom = true;
    sessionStorage.setItem('skribbl_room', JSON.stringify({ roomId: roomState.roomId, username: me.username }));

    const res = await fetch('/room.html');
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    document.querySelector('.container')!.innerHTML = doc.querySelector('.container')!.innerHTML;
    history.pushState({}, '', '/room.html');

    room.init();
  }

  room.render(roomState);
});

socket.on('left_room', () => {
  inRoom = false;
  sessionStorage.removeItem('skribbl_room');
  window.location.href = '/';
});

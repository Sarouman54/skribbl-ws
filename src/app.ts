import { socket } from './utils/socket.ts';
import { showError, clearError } from './utils/error.ts';
import type { PublicRoomState, PublicRoomSummary } from './utils/types.ts';
import * as username from './username/username.ts';
import * as lobby from './lobby/lobby.ts';
import * as join from './join/join.ts';

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

socket.on('error', (payload: { message: string }) => {
  showError(payload.message);
});

socket.on('rooms_list', (rooms: PublicRoomSummary[]) => {
  join.renderRoomsList(rooms);
});

socket.on('room_state', (roomState: PublicRoomState) => {
  const me = roomState.players.find((p) => p.id === socket.id);
  if (!me) return;
  sessionStorage.setItem('skribbl_room', JSON.stringify({ roomId: roomState.room_id, username: me.username }));
  window.location.href = '/room.html';
});

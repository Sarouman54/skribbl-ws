import { socket } from './utils/socket.ts';
import { showError, clearError } from './utils/error.ts';
import type { PublicRoomState } from './utils/types.ts';
import * as room from './room/room.ts';

const stored = sessionStorage.getItem('skribbl_room');

if (!stored) {
  window.location.href = '/';
} else {
  const { roomId, username } = JSON.parse(stored) as { roomId: string; username: string };

  socket.on('connect', () => {
    socket.emit('join_room', { join: roomId, username });
  });

  room.init();

  socket.on('room_state', (roomState: PublicRoomState) => {
    const isInRoom = roomState.players.some((p) => p.id === socket.id);
    if (!isInRoom) return;
    clearError();
    room.render(roomState);
  });

  socket.on('game_started', () => {
    window.location.href = '/game.html';
  });

  socket.on('left_room', () => {
    sessionStorage.removeItem('skribbl_room');
    window.location.href = '/';
  });

  socket.on('error', (message: string) => {
    showError(message);
  });

  socket.on('disconnect', () => {
    showError('Connexion perdue avec le serveur.');
  });
}

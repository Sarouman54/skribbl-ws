import { Server } from "socket.io";
import { RoomManager } from "./room-manager.ts";
import type { ClientPayload, JoinRoomPayload } from "./room-manager.ts";
import { GameManager } from "./game-manager.ts";
import { ChatManager } from "./chat-manager.ts";

const RECONNECT_GRACE_MS = 5000;
const gameTimers = new Map<string, ReturnType<typeof setTimeout>>();

function broadcastRoomsList(io: Server, roomManager: RoomManager): void {
    io.emit('rooms_list', roomManager.getRoomsList());
}

function startNextTurn(
  io: Server,
  roomId: string,
  roomManager: RoomManager,
  gameManager: GameManager,
): void {
    const totalPlayers = roomManager.getPlayerIds(roomId).length;

    const currentDrawerId = gameManager.getDrawerId(roomId);
    const drawerScore = gameManager.getDrawerScore(roomId, totalPlayers);

    if (currentDrawerId && drawerScore > 0) {
        roomManager.updatePlayerScore(roomId, currentDrawerId, drawerScore);

        const updatedState = roomManager.getPublicRoomStateById(roomId);
        if (updatedState) {
            io.to(roomId).emit("room_state", updatedState);
        }
    }

    setTimeout(() => {
        const drawerId = gameManager.nextDrawer(roomId);

        if (drawerId === null) {
            io.to(roomId).emit('round_end');
            return;
        }

        gameManager.startTurn(roomId, drawerId);
        const words = gameManager.getWords(roomId);
        io.to(roomId).emit('round_start', { drawerId, totalPlayers });
        setTimeout(() => io.to(drawerId).emit('send_words', words), 500);
    }, 5000);
}

export function registerSocketHandlers(io: Server, roomManager: RoomManager, gameManager: GameManager, chatManager: ChatManager): void {
    const pendingDisconnects = new Map<string, ReturnType<typeof setTimeout>>();

    io.on('connection', (socket) => {
        socket.emit('rooms_list', roomManager.getRoomsList());

        socket.on('get_rooms', () => {
            socket.emit('rooms_list', roomManager.getRoomsList());
        });

        socket.on('create_room', (payload: ClientPayload) => {
            const result = roomManager.createRoom(socket.id, payload);
            if (!result.ok) {
                socket.emit('error', { message: result.error });
                return;
            }
            socket.join(result.roomState.room_id);
            io.to(result.roomState.room_id).emit('room_state', result.roomState);
            broadcastRoomsList(io, roomManager);
        });

        socket.on('join_room', (payload: JoinRoomPayload) => {
            const roomId = (payload?.join ?? '').trim().toUpperCase();
            const username = (payload?.username ?? '').trim();

            const oldSocketId = roomManager.findDisconnectedPlayer(roomId, username);
            if (oldSocketId && oldSocketId !== socket.id) {
                if (pendingDisconnects.has(oldSocketId)) {
                    clearTimeout(pendingDisconnects.get(oldSocketId));
                    pendingDisconnects.delete(oldSocketId);
                }

                const result = roomManager.resumePlayer(oldSocketId, socket.id);
                if (result.ok) {
                    socket.join(result.roomState.room_id);
                    io.to(result.roomState.room_id).emit('room_state', result.roomState);
                    gameManager.updateSocketId(result.roomState.room_id, oldSocketId, socket.id);

                    const pending = gameManager.getPendingWords(result.roomState.room_id);
                    if (pending && gameManager.getDrawerId(result.roomState.room_id) === socket.id) {
                        socket.emit('send_words', pending);
                    }
                }
                return;
            }

            const result = roomManager.joinRoom(socket.id, payload);
            if (!result.ok) {
                socket.emit('error', { message: result.error });
                return;
            }
            socket.join(result.roomState.room_id);
            io.to(result.roomState.room_id).emit('room_state', result.roomState);
            broadcastRoomsList(io, roomManager);
        });

        socket.on('start_game', () => {
            const roomId = roomManager.getRoomIdForSocket(socket.id);
            if (!roomId) return;

            if (!roomManager.isRoomOwner(socket.id)) {
                socket.emit("error", { message: "Seul l'hôte peut lancer la partie." });
                return;
            }

      const playerIds = roomManager.getPlayerIds(roomId);
      if (playerIds.length < 2) return;

      gameManager.startGame(roomId, playerIds);
      const drawerId = gameManager.nextDrawer(roomId)!;
      gameManager.startTurn(roomId, drawerId);
      const words = gameManager.getWords(roomId);
      io.to(drawerId).emit('send_words', words);

      io.to(roomId).emit("game_started", {
        drawerId,
        totalPlayers: playerIds.length,
      });
    });

    socket.on("word_chosen", (word: string) => {
      const roomId = roomManager.getRoomIdForSocket(socket.id);
      if (!roomId) return;

      gameManager.setWord(roomId, word);
      io.to(roomId).emit("drawing_started", { drawerId: socket.id, wordLength: word.length });

      if (gameTimers.has(roomId)) {
        clearTimeout(gameTimers.get(roomId));
      }

      const timer = setTimeout(() => {
        startNextTurn(io, roomId, roomManager, gameManager);
      }, 80000); // 80s

      gameTimers.set(roomId, timer);
    });

    socket.on("send_guess", (payload: { player: string; text: string }) => {
      const roomId = roomManager.getRoomIdForSocket(socket.id);
      if (!roomId) return;

      const result = chatManager.handleGuess(socket.id, payload);

      if (result.isCorrect && result.recorded) {
        const guessedCount = gameManager.getGuessedCount(roomId);
        const totalPlayers = roomManager.getPlayerIds(roomId).length;
        if (guessedCount >= totalPlayers - 1) {
          if (gameTimers.has(roomId)) {
            clearTimeout(gameTimers.get(roomId));
            gameTimers.delete(roomId);
          }
          startNextTurn(io, roomId, roomManager, gameManager);
        }
      }
    });

        socket.on('draw_stroke', (payload: { x: number; y: number; color: string; width: number; type: 'start' | 'move' | 'end' }) => {
            const roomId = roomManager.getRoomIdForSocket(socket.id);
            if (!roomId) return;
            socket.to(roomId).emit('draw_stroke', payload);
        });

        socket.on('canvas_clear', () => {
            const roomId = roomManager.getRoomIdForSocket(socket.id);
            if (!roomId) return;
            io.to(roomId).emit('canvas_clear');
        });

        socket.on('color_selected', (payload: { color: string }) => {
            const roomId = roomManager.getRoomIdForSocket(socket.id);
            if (!roomId) return;

            const drawerId = gameManager.getDrawerId(roomId);
            if (socket.id !== drawerId) {
                socket.emit('error', { message: 'Couleur refusée' });
                return;
            }

            const hexRegex = /^#[0-9A-F]{6}$/i;
            if (!hexRegex.test(payload.color)) {
                socket.emit('error', { message: 'Format de couleur invalide' });
                return;
            }

            io.to(roomId).emit('cursor_update', payload);
        });

        socket.on('leave_room', () => {
            const roomId = roomManager.getRoomIdForSocket(socket.id);
            if (roomId) socket.leave(roomId);

            const result = roomManager.leaveRoom(socket.id);
            if (result?.roomState) {
                io.to(result.roomId).emit('room_state', result.roomState);
            }
            broadcastRoomsList(io, roomManager);
            socket.emit('left_room');
        });

        socket.on('disconnect', () => {
            if (!roomManager.getRoomIdForSocket(socket.id)) return;

            const timer = setTimeout(() => {
                pendingDisconnects.delete(socket.id);
                const result = roomManager.leaveRoom(socket.id);
                if (result?.roomState) {
                    io.to(result.roomId).emit('room_state', result.roomState);
                }
                broadcastRoomsList(io, roomManager);
            }, RECONNECT_GRACE_MS);

            pendingDisconnects.set(socket.id, timer);
        });
    });
}

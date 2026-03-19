import { Server } from 'socket.io';
import { RoomManager } from './room-manager.ts';
import { GameManager } from './game-manager.ts';
import { getLevenshteinDistance } from '../src/utils/math.ts';

export class ChatManager {
    private io: Server;
    private roomManager: RoomManager;
    private gameManager: GameManager;

    constructor(io: Server, roomManager: RoomManager, gameManager: GameManager) {
        this.io = io;
        this.roomManager = roomManager;
        this.gameManager = gameManager;
    }

    handleGuess(socketId: string, payload: { player: string; text: string }): { isCorrect: boolean; recorded: boolean } {
        const roomId = this.roomManager.getRoomIdForSocket(socketId);
        if (!roomId) return { isCorrect: false, recorded: false };

        const text = payload.text.trim();
        const player = payload.player;

        if (this.gameManager.getDrawerId(roomId) === socketId) {
            return { isCorrect: false, recorded: false };
        }

        const secretWord = this.gameManager.getWord(roomId);

        if (!secretWord) {
            this.io.to(roomId).emit('chat_message', { player, text, type: 'normal' });
            return { isCorrect: false, recorded: false };
        }

        const isCorrect = text.toLowerCase() === secretWord.toLowerCase();
        const isAlmostCorrect = !isCorrect && getLevenshteinDistance(text.toLowerCase(), secretWord.toLowerCase()) === 1;

        if (isCorrect) {
            const recorded = this.gameManager.recordGuess(roomId, socketId);
            if (!recorded) {
                return { isCorrect: true, recorded: false };
            }
            this.io.to(roomId).emit('guess_success', { player, text: `${player} a trouvé le mot !` });
            return { isCorrect: true, recorded: true };
        }

        if (isAlmostCorrect) {
            this.io.to(roomId).emit('chat_message', { player, text, type: 'almost' });
        } else {
            this.io.to(roomId).emit('chat_message', { player, text, type: 'normal' });
        }

        return { isCorrect: false, recorded: false };
    }
}

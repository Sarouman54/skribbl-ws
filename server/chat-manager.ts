import { Server } from "socket.io";
import { RoomManager } from "./room-manager";
import { GameManager } from "./game-manager";
import { getLevenshteinDistance } from "../src/utils/math";

export class ChatManager {
	constructor(
		private io: Server,
		private roomManager: RoomManager,
		private gameManager: GameManager
	) {}

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

		const isCorrect = (text.toLowerCase() === secretWord.toLowerCase());
		const isAlmostCorrect = !isCorrect && (getLevenshteinDistance(text.toLowerCase(), secretWord.toLowerCase()) === 1);

		if (isCorrect) {
			const result = this.gameManager.guessWord(roomId, socketId);
			if (result.success) {
				this.roomManager.updatePlayerScore(roomId, socketId, result.score || 0);

				this.io.to(roomId).emit('guess_success', { player, message: `${player} a trouvé le mot !` });

				const roomState = this.roomManager.getPublicRoomStateById(roomId);
				if (roomState) {
					this.io.to(roomId).emit('room_state', roomState);
				}
				return { isCorrect: true, recorded: true };
			} else {
				return { isCorrect: true, recorded: false };
			}
		} else if (isAlmostCorrect) {
			this.io.to(roomId).emit('chat_message', { player, text: `${player} est proche du mot !`, type: 'almost' });
		} else {
			this.io.to(roomId).emit('chat_message', { player, text, type: 'normal' });
		}

		return { isCorrect: false, recorded: false };
	}
}

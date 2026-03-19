// server/chat-manager.ts

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

	handleGuess(socketId: string, payload: { player: string, text: string }): void {
		const roomId = this.roomManager.getRoomIdForSocket(socketId);
		if (!roomId) return;

		const text = payload.text.trim();
		const player = payload.player;

		const secretWord = this.gameManager.getSecretWord(roomId);

		// Si pas de mot secret (partie non lancée), on traite comme un chat normal
		if (!secretWord) {
			this.io.to(roomId).emit('chat_message', { player, text, type: 'normal' });
			return;
		}

		const isCorrect = (text.toLowerCase() === secretWord.toLowerCase());
		const isAlmostCorrect = !isCorrect && (getLevenshteinDistance(text.toLowerCase(), secretWord.toLowerCase()) === 1);

		if (isCorrect) {
			const result = this.gameManager.guessWord(roomId, socketId);
			if (result.success) {
				// Mettre à jour le score du Guesser
				this.roomManager.updatePlayerScore(roomId, socketId, result.score || 0);

				// Émettre le succès
				this.io.to(roomId).emit('guess_success', { player, text: `${player} a trouvé le mot !` });

				// Diffuser le nouvel état avec scores
				const roomState = this.roomManager.getPublicRoomStateById(roomId);
				if (roomState) {
					this.io.to(roomId).emit('room_state', roomState);
				}
			}
		} else if (isAlmostCorrect) {
			this.io.to(roomId).emit('chat_message', { player, text: `${player} est proche du mot !`, type: 'almost' });
		} else {
			this.io.to(roomId).emit('chat_message', { player, text, type: 'normal' });
		}
	}
}
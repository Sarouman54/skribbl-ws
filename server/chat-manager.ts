// server/chat-manager.ts

import { Server } from "socket.io";
import { RoomManager } from "./room-manager";

export class ChatManager {
	constructor(
		private io: Server,
		private roomManager: RoomManager
	) {}

	handleGuess(socketId: string, payload: { player: string, text: string }): void {
		const roomId = this.roomManager.getRoomIdForSocket(socketId);
		if ( !roomId) return;

		const text = payload.text.trim();
		const player = payload.player;

		const secretWord = "lapin";
		const isCorrect = (text.toLowerCase() === secretWord.toLowerCase());

		if ( isCorrect ) {
			this.io.to(roomId).emit('guess_success', { player, text: `${player} a trouvé le mot !`});
		} else {
			this.io.to(roomId).emit('chat_message', { player, text });
		}
	}
}
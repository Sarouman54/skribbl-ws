import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import { RoomManager } from './room-manager.ts';
import { GameManager } from './game-manager.ts';
import { registerSocketHandlers } from './socket-handlers.ts';
import { ChatManager } from './chat-manager.ts';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
app.use(vite.middlewares);
const roomManager = new RoomManager();
const gameManager = new GameManager();
const chatManager = new ChatManager(io, roomManager, gameManager);
registerSocketHandlers(io, roomManager, gameManager, chatManager);

const PORT = 3000;
httpServer.listen(PORT, () => {
    console.log(`🚀 Serveur prêt sur http://localhost:${PORT}`);
});

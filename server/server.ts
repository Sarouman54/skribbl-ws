import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Server } from 'socket.io';
import { RoomManager } from './room-manager.ts';
import { registerSocketHandlers } from './socket-handlers.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const roomManager = new RoomManager();

app.use(express.static(path.join(__dirname, '../src')));

app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, '../src/index.html'));
});

registerSocketHandlers(io, roomManager);

const PORT = 3000;
httpServer.listen(PORT, () => {
    console.log(`🚀 Serveur prêt sur http://localhost:${PORT}`);
});
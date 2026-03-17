export type ClientPayload = {
    username: string;
};

export type JoinRoomPayload = {
    roomId: string;
    username: string;
};

export type Player = {
    id: string;
    username: string;
};

type Room = {
    id: string;
    ownerId: string;
    players: Map<string, Player>;
};

export type PublicRoomState = {
    roomId: string;
    ownerId: string;
    ownerUsername: string;
    players: Player[];
};

export type PublicRoomSummary = {
    roomId: string;
    ownerUsername: string;
    playerCount: number;
};

type LeaveRoomResult = {
    roomId: string;
    roomState: PublicRoomState | null;
};

const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 20;

export class RoomManager {
    private readonly rooms = new Map<string, Room>();
    private readonly socketToRoom = new Map<string, string>();

    getRoomsList(): PublicRoomSummary[] {
        return Array.from(this.rooms.values()).map((room) => {
            const state = this.getPublicRoomState(room);
            return {
                roomId: state.roomId,
                ownerUsername: state.ownerUsername,
                playerCount: state.players.length,
            };
        });
    }

    getRoomIdForSocket(socketId: string): string | undefined {
        return this.socketToRoom.get(socketId);
    }

    createRoom(socketId: string, payload: ClientPayload):
        | { ok: true; roomState: PublicRoomState }
        | { ok: false; error: string } {
        const username = this.sanitizeUsername(payload?.username ?? '');

        if (!this.isUsernameValid(username)) {
            return {
                ok: false,
                error: `Pseudo invalide (${MIN_USERNAME_LENGTH}-${MAX_USERNAME_LENGTH} caracteres).`,
            };
        }

        if (this.socketToRoom.has(socketId)) {
            return { ok: false, error: 'Vous etes deja dans une room.' };
        }

        const roomId = this.generateRoomId();
        const room: Room = {
            id: roomId,
            ownerId: socketId,
            players: new Map([[socketId, { id: socketId, username }]]),
        };

        this.rooms.set(roomId, room);
        this.socketToRoom.set(socketId, roomId);

        return { ok: true, roomState: this.getPublicRoomState(room) };
    }

    joinRoom(socketId: string, payload: JoinRoomPayload):
        | { ok: true; roomState: PublicRoomState }
        | { ok: false; error: string } {
        const username = this.sanitizeUsername(payload?.username ?? '');
        const roomId = (payload?.roomId ?? '').trim().toUpperCase();

        if (!this.isUsernameValid(username)) {
            return {
                ok: false,
                error: `Pseudo invalide (${MIN_USERNAME_LENGTH}-${MAX_USERNAME_LENGTH} caracteres).`,
            };
        }

        if (this.socketToRoom.has(socketId)) {
            return { ok: false, error: 'Vous etes deja dans une room.' };
        }

        const room = this.rooms.get(roomId);
        if (!room) {
            return { ok: false, error: 'Room introuvable.' };
        }

        const usernameInUse = Array.from(room.players.values()).some(
            (player) => player.username.toLowerCase() === username.toLowerCase(),
        );

        if (usernameInUse) {
            return { ok: false, error: 'Ce pseudo est deja pris dans cette room.' };
        }

        room.players.set(socketId, { id: socketId, username });
        this.socketToRoom.set(socketId, room.id);

        return { ok: true, roomState: this.getPublicRoomState(room) };
    }

    resumePlayer(oldSocketId: string, newSocketId: string): { ok: true; roomState: PublicRoomState } | { ok: false } {
        const roomId = this.socketToRoom.get(oldSocketId);
        if (!roomId) return { ok: false };

        const room = this.rooms.get(roomId);
        if (!room) return { ok: false };

        const player = room.players.get(oldSocketId);
        if (!player) return { ok: false };

        room.players.delete(oldSocketId);
        this.socketToRoom.delete(oldSocketId);

        const resumed = { ...player, id: newSocketId };
        room.players.set(newSocketId, resumed);
        this.socketToRoom.set(newSocketId, roomId);

        if (room.ownerId === oldSocketId) {
            room.ownerId = newSocketId;
        }

        return { ok: true, roomState: this.getPublicRoomState(room) };
    }

    findDisconnectedPlayer(roomId: string, username: string): string | undefined {
        const room = this.rooms.get(roomId);
        if (!room) return undefined;

        for (const [socketId, player] of room.players) {
            if (player.username.toLowerCase() === username.toLowerCase()) {
                return socketId;
            }
        }
        return undefined;
    }

    leaveRoom(socketId: string): LeaveRoomResult | null {
        const roomId = this.socketToRoom.get(socketId);
        if (!roomId) {
            return null;
        }

        const room = this.rooms.get(roomId);
        if (!room) {
            this.socketToRoom.delete(socketId);
            return null;
        }

        room.players.delete(socketId);
        this.socketToRoom.delete(socketId);

        if (room.players.size === 0) {
            this.rooms.delete(room.id);
            return { roomId, roomState: null };
        }

        if (room.ownerId === socketId) {
            const nextOwnerId = room.players.keys().next().value as string | undefined;
            if (nextOwnerId) {
                room.ownerId = nextOwnerId;
            }
        }

        return { roomId, roomState: this.getPublicRoomState(room) };
    }

    private sanitizeUsername(username: string): string {
        return username.trim();
    }

    private isUsernameValid(username: string): boolean {
        return (
            username.length >= MIN_USERNAME_LENGTH &&
            username.length <= MAX_USERNAME_LENGTH
        );
    }

    private generateRoomId(): string {
        let roomId = '';
        do {
            roomId = Math.random().toString(36).slice(2, 8).toUpperCase();
        } while (this.rooms.has(roomId));

        return roomId;
    }

    private getPublicRoomState(room: Room): PublicRoomState {
        const players = Array.from(room.players.values());
        const owner = room.players.get(room.ownerId);

        return {
            roomId: room.id,
            ownerId: room.ownerId,
            ownerUsername: owner?.username ?? 'Hote',
            players,
        };
    }
}

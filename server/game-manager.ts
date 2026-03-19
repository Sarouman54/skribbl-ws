import { WORDS } from './words.ts';

type TurnState = {
    drawerId: string;
    word: string | null;
    pendingWords: [string, string, string] | null;
    guessers: Map<string, { timestamp: number; score: number }>;
    startTime?: number;
    totalTime: number;
};

type GameState = {
    usedInGame: Set<string>;
    remainingDrawers: string[];
    turn: TurnState | null;
};

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

export class GameManager {
    private games = new Map<string, GameState>();

    startGame(roomId: string, playerIds: string[]): void {
        this.games.set(roomId, {
            usedInGame: new Set(),
            remainingDrawers: shuffle(playerIds),
            turn: null,
        });
    }

    nextDrawer(roomId: string): string | null {
        const state = this.games.get(roomId);
        if (!state) return null;
        return state.remainingDrawers.shift() ?? null;
    }

    startTurn(roomId: string, drawerId: string): void {
        const state = this.games.get(roomId);
        if (!state) return;
        state.turn = { 
            drawerId, 
            word: null, 
            pendingWords: null, 
            guessers: new Map(), 
            totalTime: 80 
        };
    }

    setWord(roomId: string, word: string): void {
        const state = this.games.get(roomId);
        if (!state?.turn) return;
        state.turn.word = word;
        state.turn.pendingWords = null;
        state.turn.startTime = Date.now();
    }

    getPendingWords(roomId: string): [string, string, string] | null {
        return this.games.get(roomId)?.turn?.pendingWords ?? null;
    }

    updateDrawerId(roomId: string, oldId: string, newId: string): void {
        const state = this.games.get(roomId);
        if (!state?.turn) return;
        if (state.turn.drawerId === oldId) {
            state.turn.drawerId = newId;
        }
    }

    guessWord(roomId: string, socketId: string): { success: boolean; score?: number; isFirst?: boolean } {
        const state = this.games.get(roomId);
        if (!state?.turn || !state.turn.word || !state.turn.startTime) return { success: false };

        if (socketId === state.turn.drawerId) return { success: false };
        if (state.turn.guessers.has(socketId)) return { success: false };

        const elapsedTime = (Date.now() - state.turn.startTime) / 1000;
        const timeLeft = Math.max(0, state.turn.totalTime - elapsedTime);

        let score = 100 + (400 * timeLeft / state.turn.totalTime);
        score = Math.round(score);

        const isFirst = state.turn.guessers.size === 0;
        if (isFirst) score += 50;

        state.turn.guessers.set(socketId, { timestamp: Date.now(), score });
        return { success: true, score, isFirst };
    }

    getDrawerScore(roomId: string, totalPlayers: number): number {
        const state = this.games.get(roomId);
        if (!state?.turn || totalPlayers <= 1) return 0;

        const nSuccess = state.turn.guessers.size;
        if (nSuccess === 0) return 0;

        const score = 300 * (nSuccess / (totalPlayers - 1));
        return Math.round(score);
    }

    getWord(roomId: string): string | null {
        return this.games.get(roomId)?.turn?.word ?? null;
    }

    getDrawerId(roomId: string): string | null {
        return this.games.get(roomId)?.turn?.drawerId ?? null;
    }

    getGuessedCount(roomId: string): number {
        return this.games.get(roomId)?.turn?.guessers.size ?? 0;
    }

    getWords(roomId: string): [string, string, string] {
        const state = this.games.get(roomId);
        if (!state) throw new Error(`Aucune partie en cours pour la room ${roomId}`);

        const categories = shuffle(Object.keys(WORDS)).slice(0, 3);

        const words = categories.map((cat) => {
            const available = WORDS[cat].filter((word) => !state.usedInGame.has(word));
            return pickRandom(available);
        }) as [string, string, string];

        for (const word of words) {
            state.usedInGame.add(word);
        }

        if (state.turn) {
            state.turn.pendingWords = words;
        }

        return words;
    }


    deleteGame(roomId: string): void {
        this.games.delete(roomId);
    }
}

import { WORDS } from './words.ts';

type TurnState = {
    drawerId: string;
    word: string | null;
    pendingWords: [string, string, string] | null;
    guessedBy: Set<string>;
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
        state.turn = { drawerId, word: null, pendingWords: null, guessedBy: new Set() };
    }

    setWord(roomId: string, word: string): void {
        const state = this.games.get(roomId);
        if (!state?.turn) return;
        state.turn.word = word;
        state.turn.pendingWords = null;
    }

    getPendingWords(roomId: string): [string, string, string] | null {
        return this.games.get(roomId)?.turn?.pendingWords ?? null;
    }

    getWord(roomId: string): string | null {
        return this.games.get(roomId)?.turn?.word ?? null;
    }

    getDrawerId(roomId: string): string | null {
        return this.games.get(roomId)?.turn?.drawerId ?? null;
    }

    recordGuess(roomId: string, socketId: string): boolean {
        const state = this.games.get(roomId);
        if (!state?.turn) return false;
        if (state.turn.drawerId === socketId) return false;
        if (state.turn.guessedBy.has(socketId)) return false;
        state.turn.guessedBy.add(socketId);
        return true;
    }

    getGuessedCount(roomId: string): number {
        return this.games.get(roomId)?.turn?.guessedBy.size ?? 0;
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

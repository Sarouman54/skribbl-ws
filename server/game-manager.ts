import { WORDS } from './words.ts';

type GameState = {
    currentTurn: number;
    lastProposedTurn: Map<string, number>;
    usedInGame: Set<string>;
    drawerId?: string;
    secretWord?: string;
    startTime?: number;
    totalTime: number;
    guessers: Map<string, { timestamp: number; score: number }>;
};

function randomWordWeight(items: { word: string; weight: number }[]): string {
    const total = items.reduce((sum, { weight }) => sum + weight, 0);
    let r = Math.random() * total;
    for (const { word, weight } of items) {
        r -= weight;
        if (r <= 0) return word;
    }
    return items[items.length - 1].word;
}

export class GameManager {
    private readonly games = new Map<string, GameState>();

    startGame(roomId: string): void {
        this.games.set(roomId, {
            currentTurn: 0,
            lastProposedTurn: new Map(),
            usedInGame: new Set(),
            totalTime: 80, // 80 secondes par défaut
            guessers: new Map(),
        });
    }

    startRound(roomId: string, drawerId: string, word: string): void {
        const state = this.games.get(roomId);
        if (!state) return;
        state.drawerId = drawerId;
        state.secretWord = word;
        state.startTime = Date.now();
        state.guessers.clear();
    }

    guessWord(roomId: string, socketId: string): { success: boolean; score?: number; isFirst?: boolean } {
        const state = this.games.get(roomId);
        if (!state || !state.secretWord || !state.startTime) return { success: false };

        if (socketId === state.drawerId) return { success: false };
        if (state.guessers.has(socketId)) return { success: false };

        const elapsedTime = (Date.now() - state.startTime) / 1000;
        const timeLeft = Math.max(0, state.totalTime - elapsedTime);

        // Formule de l'image 3 : S_dev = 100 + (400 * T_restant / 80)
        let score = 100 + (400 * timeLeft / state.totalTime);
        score = Math.round(score);

        const isFirst = state.guessers.size === 0;
        if (isFirst) {
            score += 50; // Bonus +50 pt pour le premier
        }

        state.guessers.set(socketId, { timestamp: Date.now(), score });
        return { success: true, score, isFirst };
    }

    getDrawerScore(roomId: string, totalPlayers: number): number {
        const state = this.games.get(roomId);
        if (!state || totalPlayers <= 1) return 0;

        const nSuccess = state.guessers.size;
        const nTotal = totalPlayers;

        if (nSuccess === 0) return 0;

        // Formule de l'image 2 : S_des = 300 * (N_succès / (N_total - 1))
        const score = 300 * (nSuccess / (nTotal - 1));
        return Math.round(score);
    }

    getSecretWord(roomId: string): string | undefined {
        return this.games.get(roomId)?.secretWord;
    }

    getDrawerId(roomId: string): string | undefined {
        return this.games.get(roomId)?.drawerId;
    }

    getWords(roomId: string): [string, string, string] {
        const state = this.games.get(roomId);
        if (!state) throw new Error(`Aucune partie en cours pour la room ${roomId}`);

        const categories = Object.keys(WORDS).sort(() => Math.random() - 0.5).slice(0, 3);

        const words = categories.map((cat) => {
            const weighted = WORDS[cat]
                .filter((word) => !state.usedInGame.has(word))
                .map((word) => ({
                    word,
                    weight: state.currentTurn - (state.lastProposedTurn.get(word) ?? -1),
                }));

            return randomWordWeight(weighted);
        }) as [string, string, string];

        for (const word of words) {
            state.usedInGame.add(word);
            state.lastProposedTurn.set(word, state.currentTurn);
        }
        state.currentTurn++;

        return words;
    }

    deleteGame(roomId: string): void {
        this.games.delete(roomId);
    }
}

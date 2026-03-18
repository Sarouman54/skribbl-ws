import { WORDS } from './words.ts';

type GameState = {
    currentTurn: number;
    lastProposedTurn: Map<string, number>;
};

function weightedRandom(items: { word: string; weight: number }[]): string {
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

    private getOrCreate(roomId: string): GameState {
        if (!this.games.has(roomId)) {
            this.games.set(roomId, { currentTurn: 0, lastProposedTurn: new Map() });
        }
        return this.games.get(roomId)!;
    }

    getWords(roomId: string): [string, string, string] {
        const state = this.getOrCreate(roomId);

        const categories = Object.keys(WORDS).sort(() => Math.random() - 0.5).slice(0, 3);

        const words = categories.map((cat) => {
            const weighted = WORDS[cat].map((word) => ({
                word,
                weight: state.currentTurn - (state.lastProposedTurn.get(word) ?? -1),
            }));
            return weightedRandom(weighted);
        }) as [string, string, string];

        for (const word of words) {
            state.lastProposedTurn.set(word, state.currentTurn);
        }
        state.currentTurn++;

        return words;
    }

    deleteGame(roomId: string): void {
        this.games.delete(roomId);
    }
}

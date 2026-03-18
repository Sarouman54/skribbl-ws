import { WORDS } from './words.ts';

type GameState = {
    currentTurn: number;
    lastProposedTurn: Map<string, number>;
    usedInGame: Set<string>;
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
        this.games.set(roomId, { currentTurn: 0, lastProposedTurn: new Map(), usedInGame: new Set() });
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

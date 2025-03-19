// src/navigation/utils/DoubleEliminationUtils.ts
import { Fencer } from '../navigation/types';

/**
 * Interface for a bout in a double elimination tournament
 */
export interface DEDoubleBout {
    id: number;
    bracket: 'winners' | 'losers' | 'finals';
    round: number;
    position: number;
    fencerA?: number;
    fencerB?: number;
    scoreA?: number;
    scoreB?: number;
    winner?: number;
    nextBoutId?: number;
    loserNextBoutId?: number;
    isBye?: boolean;
}

/**
 * Generates the complete double elimination bracket structure
 * @param fencerCount Number of fencers in the tournament
 * @returns Structure of all bouts in the winners and losers brackets
 */
export function generateDoubleEliminationStructure(fencerCount: number): {
    winnersBracket: DEDoubleBout[];
    losersBracket: DEDoubleBout[];
    finalsBracket: DEDoubleBout[];
} {
    // Find the nearest power of 2 that will fit all fencers
    let tableSize = 2;
    while (tableSize < fencerCount) {
        tableSize *= 2;
    }

    // Generate winners bracket
    const winnersBracket: DEDoubleBout[] = [];
    const totalWinnersRounds = Math.log2(tableSize);

    // Initial round (first round of winners bracket)
    let boutId = 1;
    for (let i = 0; i < tableSize / 2; i++) {
        winnersBracket.push({
            id: boutId++,
            bracket: 'winners',
            round: 1,
            position: i + 1,
            nextBoutId: Math.floor(i / 2) + boutId,
            loserNextBoutId: tableSize / 2 + boutId // Losers go to the losers bracket
        });
    }

    // Remaining winners bracket rounds
    for (let round = 2; round <= totalWinnersRounds; round++) {
        const boutsInRound = tableSize / Math.pow(2, round);
        for (let i = 0; i < boutsInRound; i++) {
            const nextBoutId = round < totalWinnersRounds
                ? Math.floor(i / 2) + boutId + boutsInRound
                : boutId + boutsInRound + i; // Last round winners go to finals

            const losersNextBoutId = boutId + tableSize - 1; // Losers go to appropriate spot in losers bracket

            winnersBracket.push({
                id: boutId++,
                bracket: 'winners',
                round: round,
                position: i + 1,
                nextBoutId,
                loserNextBoutId: losersNextBoutId
            });
        }
    }

    // Generate losers bracket
    const losersBracket: DEDoubleBout[] = [];
    const totalLosersRounds = 2 * totalWinnersRounds - 1;

    // First round of losers (fed by first round of winners)
    for (let i = 0; i < tableSize / 4; i++) {
        losersBracket.push({
            id: boutId++,
            bracket: 'losers',
            round: 1,
            position: i + 1,
            nextBoutId: boutId + tableSize / 4
        });
    }

    // Remaining losers bracket rounds
    // Alternating between "contenders round" and "elimination round"
    for (let round = 2; round <= totalLosersRounds; round++) {
        const isEliminationRound = round % 2 === 0;
        const boutsInRound = tableSize / Math.pow(2, Math.ceil(round / 2) + 1);

        for (let i = 0; i < boutsInRound; i++) {
            const nextBoutId = round < totalLosersRounds
                ? boutId + boutsInRound
                : boutId + boutsInRound; // Last round winner goes to finals

            losersBracket.push({
                id: boutId++,
                bracket: 'losers',
                round,
                position: i + 1,
                nextBoutId
            });
        }
    }

    // Generate final bracket (could be 1 or 2 bouts depending if bracket reset is needed)
    const finalsBracket: DEDoubleBout[] = [
        {
            id: boutId++,
            bracket: 'finals',
            round: 1,
            position: 1,
            nextBoutId: boutId // This will be the bracket reset match if needed
        },
        {
            id: boutId,
            bracket: 'finals',
            round: 2,
            position: 1
        }
    ];

    return { winnersBracket, losersBracket, finalsBracket };
}

/**
 * Places fencers in the double elimination bracket based on their seeding
 * @param bracket The generated bracket structure
 * @param seededFencers Fencers sorted by their seeding (1 is top seed)
 */
export function placeFencersInDoubleElimination(
    bracket: {
        winnersBracket: DEDoubleBout[];
        losersBracket: DEDoubleBout[];
        finalsBracket: DEDoubleBout[];
    },
    seededFencers: { fencer: Fencer; seed: number }[]
): {
    winnersBracket: DEDoubleBout[];
    losersBracket: DEDoubleBout[];
    finalsBracket: DEDoubleBout[];
} {
    const { winnersBracket, losersBracket, finalsBracket } = bracket;

    // Get first round bouts from winners bracket
    const firstRoundBouts = winnersBracket.filter(bout => bout.round === 1);
    const tableSize = firstRoundBouts.length * 2;

    // Standard bracket positioning (1 vs tableSize, 2 vs tableSize-1, etc.)
    for (let i = 0; i < firstRoundBouts.length; i++) {
        const bout = firstRoundBouts[i];
        const seedA = i + 1;
        const seedB = tableSize - i;

        // Get fencers by seed (or undefined if seed exceeds available fencers)
        const fencerA = seedA <= seededFencers.length ? seededFencers[seedA - 1].fencer : undefined;
        const fencerB = seedB <= seededFencers.length ? seededFencers[seedB - 1].fencer : undefined;

        // Update the bout with fencer IDs
        bout.fencerA = fencerA?.id;
        bout.fencerB = fencerB?.id;

        // If one fencer is missing, it's a bye
        if (!fencerA || !fencerB) {
            bout.isBye = true;
            bout.winner = fencerA?.id || fencerB?.id;

            // For byes, automatically move the winner to the next round
            advanceFencerInBracket(bracket, bout.id, bout.winner!, true);
        }
    }

    return { winnersBracket, losersBracket, finalsBracket };
}

/**
 * Advances a fencer to the next bout based on the bracket structure
 */
export function advanceFencerInBracket(
    bracket: {
        winnersBracket: DEDoubleBout[];
        losersBracket: DEDoubleBout[];
        finalsBracket: DEDoubleBout[];
    },
    boutId: number,
    winnerId: number,
    isBye: boolean = false
): void {
    const { winnersBracket, losersBracket, finalsBracket } = bracket;

    // Find the current bout
    const currentBout = [
        ...winnersBracket,
        ...losersBracket,
        ...finalsBracket
    ].find(bout => bout.id === boutId);

    if (!currentBout) {
        console.error(`Bout with ID ${boutId} not found`);
        return;
    }

    // Set the winner
    currentBout.winner = winnerId;

    // Find the loser (if not a bye)
    let loserId: number | undefined;
    if (!isBye) {
        loserId = currentBout.fencerA === winnerId ? currentBout.fencerB : currentBout.fencerA;
    }

    // Find the next bout for the winner
    if (currentBout.nextBoutId) {
        const nextBout = [
            ...winnersBracket,
            ...losersBracket,
            ...finalsBracket
        ].find(bout => bout.id === currentBout.nextBoutId);

        if (nextBout) {
            // Place the winner in the next bout
            if (nextBout.fencerA === undefined) {
                nextBout.fencerA = winnerId;
            } else {
                nextBout.fencerB = winnerId;
            }

            // If the next bout now has both fencers and one is undefined (BYE), automatically advance
            if (nextBout.fencerA !== undefined && nextBout.fencerB !== undefined) {
                if (nextBout.fencerA === undefined || nextBout.fencerB === undefined) {
                    const autoWinner = nextBout.fencerA || nextBout.fencerB;
                    nextBout.isBye = true;
                    nextBout.winner = autoWinner;
                    advanceFencerInBracket(bracket, nextBout.id, autoWinner!, true);
                }
            }
        }
    }

    // If there's a loser and this is a winners bracket bout, send to losers bracket
    if (loserId && currentBout.bracket === 'winners' && currentBout.loserNextBoutId) {
        const loserNextBout = losersBracket.find(bout => bout.id === currentBout.loserNextBoutId);

        if (loserNextBout) {
            // Place the loser in the next bout
            if (loserNextBout.fencerA === undefined) {
                loserNextBout.fencerA = loserId;
            } else {
                loserNextBout.fencerB = loserId;
            }

            // If this bout now has both fencers, check if one is undefined (BYE)
            if (loserNextBout.fencerA !== undefined && loserNextBout.fencerB !== undefined) {
                if (loserNextBout.fencerA === undefined || loserNextBout.fencerB === undefined) {
                    const autoWinner = loserNextBout.fencerA || loserNextBout.fencerB;
                    loserNextBout.isBye = true;
                    loserNextBout.winner = autoWinner;
                    advanceFencerInBracket(bracket, loserNextBout.id, autoWinner!, true);
                }
            }
        }
    }
}
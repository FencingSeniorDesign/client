// src/navigation/utils/CompassDrawUtils.ts
import { Fencer } from '../navigation/types';

/**
 * Interface for a bout in a compass draw tournament
 */
export interface DECompassBout {
    id: number;
    bracket: 'east' | 'north' | 'west' | 'south';
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
 * Generates the complete compass draw structure with four brackets:
 * - East (original/main bracket)
 * - North (losers from 1st round of East)
 * - West (losers from 2nd round of East)
 * - South (losers from 1st round of North)
 *
 * @param fencerCount Number of fencers in the tournament
 * @returns Structure of all bouts in the compass format
 */
export function generateCompassDrawStructure(fencerCount: number): {
    eastBracket: DECompassBout[];
    northBracket: DECompassBout[];
    westBracket: DECompassBout[];
    southBracket: DECompassBout[];
} {
    // Find the nearest power of 2 that will fit all fencers
    let tableSize = 2;
    while (tableSize < fencerCount) {
        tableSize *= 2;
    }

    // Total rounds in the main bracket
    const totalEastRounds = Math.log2(tableSize);

    // Generate East bracket (main bracket)
    const eastBracket: DECompassBout[] = [];
    let boutId = 1;

    // First round of East
    for (let i = 0; i < tableSize / 2; i++) {
        eastBracket.push({
            id: boutId++,
            bracket: 'east',
            round: 1,
            position: i + 1,
            nextBoutId: Math.floor(i / 2) + boutId,
            loserNextBoutId: tableSize / 2 + boutId, // Losers go to North bracket
        });
    }

    // Remaining East bracket rounds
    for (let round = 2; round <= totalEastRounds; round++) {
        const boutsInRound = tableSize / Math.pow(2, round);
        for (let i = 0; i < boutsInRound; i++) {
            const nextBoutId = round < totalEastRounds ? Math.floor(i / 2) + boutId + boutsInRound : undefined; // Last round has no next bout

            const loserNextBoutId =
                round === 2
                    ? boutId + tableSize // Second-round losers go to West bracket
                    : undefined; // Other losers don't continue

            eastBracket.push({
                id: boutId++,
                bracket: 'east',
                round: round,
                position: i + 1,
                nextBoutId,
                loserNextBoutId,
            });
        }
    }

    // North bracket (first-round losers from East)
    const northBracket: DECompassBout[] = [];
    const totalNorthRounds = totalEastRounds - 1;

    // First round of North
    for (let i = 0; i < tableSize / 4; i++) {
        northBracket.push({
            id: boutId++,
            bracket: 'north',
            round: 1,
            position: i + 1,
            nextBoutId: boutId + tableSize / 4,
            loserNextBoutId: boutId + tableSize * 2, // First-round losers from North go to South
        });
    }

    // Remaining North bracket rounds
    for (let round = 2; round <= totalNorthRounds; round++) {
        const boutsInRound = tableSize / Math.pow(2, round + 1);
        for (let i = 0; i < boutsInRound; i++) {
            northBracket.push({
                id: boutId++,
                bracket: 'north',
                round: round,
                position: i + 1,
                nextBoutId: round < totalNorthRounds ? boutId + boutsInRound : undefined,
            });
        }
    }

    // West bracket (second-round losers from East)
    const westBracket: DECompassBout[] = [];
    const totalWestRounds = totalEastRounds - 2;

    // First round of West
    for (let i = 0; i < tableSize / 8; i++) {
        westBracket.push({
            id: boutId++,
            bracket: 'west',
            round: 1,
            position: i + 1,
            nextBoutId: boutId + tableSize / 8,
        });
    }

    // Remaining West bracket rounds
    for (let round = 2; round <= totalWestRounds; round++) {
        const boutsInRound = tableSize / Math.pow(2, round + 2);
        for (let i = 0; i < boutsInRound; i++) {
            westBracket.push({
                id: boutId++,
                bracket: 'west',
                round: round,
                position: i + 1,
                nextBoutId: round < totalWestRounds ? boutId + boutsInRound : undefined,
            });
        }
    }

    // South bracket (first-round losers from North)
    const southBracket: DECompassBout[] = [];
    const totalSouthRounds = totalEastRounds - 2;

    // First round of South
    for (let i = 0; i < tableSize / 8; i++) {
        southBracket.push({
            id: boutId++,
            bracket: 'south',
            round: 1,
            position: i + 1,
            nextBoutId: boutId + tableSize / 8,
        });
    }

    // Remaining South bracket rounds
    for (let round = 2; round <= totalSouthRounds; round++) {
        const boutsInRound = tableSize / Math.pow(2, round + 2);
        for (let i = 0; i < boutsInRound; i++) {
            southBracket.push({
                id: boutId++,
                bracket: 'south',
                round: round,
                position: i + 1,
                nextBoutId: round < totalSouthRounds ? boutId + boutsInRound : undefined,
            });
        }
    }

    return { eastBracket, northBracket, westBracket, southBracket };
}

/**
 * Places fencers in the compass bracket based on their seeding
 * @param brackets The generated bracket structure
 * @param seededFencers Fencers sorted by their seeding (1 is top seed)
 */
export function placeFencersInCompassDraw(
    brackets: {
        eastBracket: DECompassBout[];
        northBracket: DECompassBout[];
        westBracket: DECompassBout[];
        southBracket: DECompassBout[];
    },
    seededFencers: { fencer: Fencer; seed: number }[]
): {
    eastBracket: DECompassBout[];
    northBracket: DECompassBout[];
    westBracket: DECompassBout[];
    southBracket: DECompassBout[];
} {
    const { eastBracket, northBracket, westBracket, southBracket } = brackets;

    // Get first round bouts from East bracket
    const firstRoundBouts = eastBracket.filter(bout => bout.round === 1);
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
            advanceFencerInCompassDraw(brackets, bout.id, bout.winner!, true);
        }
    }

    return { eastBracket, northBracket, westBracket, southBracket };
}

/**
 * Advances a fencer to the next bout based on the bracket structure
 */
export function advanceFencerInCompassDraw(
    brackets: {
        eastBracket: DECompassBout[];
        northBracket: DECompassBout[];
        westBracket: DECompassBout[];
        southBracket: DECompassBout[];
    },
    boutId: number,
    winnerId: number,
    isBye: boolean = false
): void {
    const { eastBracket, northBracket, westBracket, southBracket } = brackets;

    // Find the current bout
    const allBouts = [...eastBracket, ...northBracket, ...westBracket, ...southBracket];
    const currentBout = allBouts.find(bout => bout.id === boutId);

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
        const nextBout = allBouts.find(bout => bout.id === currentBout.nextBoutId);

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
                    advanceFencerInCompassDraw(brackets, nextBout.id, autoWinner!, true);
                }
            }
        }
    }

    // If there's a loser, send to appropriate bracket
    if (loserId && currentBout.loserNextBoutId) {
        const loserNextBout = allBouts.find(bout => bout.id === currentBout.loserNextBoutId);

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
                    advanceFencerInCompassDraw(brackets, loserNextBout.id, autoWinner!, true);
                }
            }
        }
    }
}

/**
 * Returns human-readable direction names for compass brackets
 */
export function getCompassDirectionName(bracket: 'east' | 'north' | 'west' | 'south'): string {
    switch (bracket) {
        case 'east':
            return 'East (Main)';
        case 'north':
            return 'North (First-Round Repechage)';
        case 'west':
            return 'West (Second-Round Repechage)';
        case 'south':
            return 'South (North Repechage)';
    }
}

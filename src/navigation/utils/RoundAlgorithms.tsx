// src/utils/RoundAlgorithms.ts

import { Fencer, RoundData } from '../navigation/types';

/**
 * A direct-elimination match between two competitors.
 */
export type DEBracketMatch = {
    fencerA: Fencer | null;
    fencerB: Fencer | null;
    round: number;      // Round number (1 = first round, etc.)
    matchIndex: number; // The index within that round
    winner?: Fencer;
    scoreA?: number;
    scoreB?: number;
};

/**
 * A single round of the bracket.
 */
export type DEBracketRound = {
    round: number;
    label: string;         // For example, "Table of 128"
    matches: DEBracketMatch[];
};

/**
 * The full bracket data, consisting of a series of rounds.
 */
export type DEBracketData = {
    rounds: DEBracketRound[];
};

/**
 * Builds a full direct-elimination bracket.
 * Participants are padded with BYEs (null values) to reach the next power of 2.
 * Each round is built from the winners of the previous round.
 */
export function buildDEBracket(fencers: Fencer[]): DEBracketData {
    // Determine the next power of 2 (m) for the number of participants.
    let m = 1;
    while (m < fencers.length) {
        m *= 2;
    }
    // Create a padded array: if there aren’t enough fencers, add undefined (BYEs).
    const padded: (Fencer | undefined)[] = [...fencers];
    while (padded.length < m) {
        padded.push(undefined);
    }

    const rounds: DEBracketRound[] = [];

    // --- Round 1 ---
    const round1Matches: DEBracketMatch[] = [];
    for (let i = 0; i < m; i += 2) {
        const fA = padded[i];
        const fB = padded[i + 1];
        let winner: Fencer | undefined = undefined;
        // If one competitor is missing, the other automatically wins.
        if (fA && !fB) {
            winner = fA;
        } else if (fB && !fA) {
            winner = fB;
        }
        round1Matches.push({
            fencerA: fA,
            fencerB: fB,
            round: 1,
            matchIndex: i / 2,
            winner,
            scoreA: 0,
            scoreB: 0,
        });
    }
    rounds.push({
        round: 1,
        label: `Table of ${m}`,
        matches: round1Matches,
    });

    // --- Subsequent Rounds ---
    let previousMatches = round1Matches;
    const totalRounds = Math.log2(m);
    for (let r = 2; r <= totalRounds; r++) {
        const numMatches = previousMatches.length / 2;
        const currentMatches: DEBracketMatch[] = [];
        for (let i = 0; i < numMatches; i++) {
            const matchA = previousMatches[2 * i];
            const matchB = previousMatches[2 * i + 1];
            // If winners from previous matches exist, use them; otherwise, set to undefined.
            const fA = matchA.winner ? matchA.winner : undefined;
            const fB = matchB.winner ? matchB.winner : undefined;
            let winner: Fencer | undefined = undefined;
            if (fA && !fB) {
                winner = fA;
            } else if (fB && !fA) {
                winner = fB;
            }
            currentMatches.push({
                fencerA: fA,
                fencerB: fB,
                round: r,
                matchIndex: i,
                winner,
                scoreA: 0,
                scoreB: 0,
            });
        }
        rounds.push({
            round: r,
            label: `Table of ${m / Math.pow(2, r - 1)}`,
            matches: currentMatches,
        });
        previousMatches = currentMatches;
    }

    return { rounds };
}

/* The functions rankFencersFromPools, getPromotedFencers, and buildPools remain unchanged.
   (They are used for pool rounds and need not be modified for the direct-elimination bracket.)
*/

// ... (existing pool functions) ...

export type PoolResult = {
    fencer: Fencer;
    wins: number;
    totalBouts: number;
    touchesScored: number;
    touchesReceived: number;
};

export function rankFencersFromPools(allPoolResults: PoolResult[][]): Fencer[] {
    const merged: PoolResult[] = allPoolResults.reduce(
        (acc, pool) => acc.concat(pool),
        []
    );
    merged.sort((a, b) => {
        const winRatioA = a.wins / (a.totalBouts || 1);
        const winRatioB = b.wins / (b.totalBouts || 1);
        if (winRatioB !== winRatioA) {
            return winRatioB - winRatioA;
        }
        const netA = a.touchesScored - a.touchesReceived;
        const netB = b.touchesScored - b.touchesReceived;
        return netB - netA;
    });
    return merged.map((r) => r.fencer);
}

export function getPromotedFencers(sortedFencers: Fencer[], promotionPercent: number): Fencer[] {
    if (promotionPercent >= 100) {
        return sortedFencers;
    }
    const cutoff = Math.ceil((promotionPercent / 100) * sortedFencers.length);
    return sortedFencers.slice(0, cutoff);
}

export function buildPools(fencers: Fencer[], poolCount: number, fencersPerPool: number): Fencer[][] {
    const shuffled = [...fencers].sort(() => Math.random() - 0.5);
    const result: Fencer[][] = [];
    let startIndex = 0;
    for (let i = 0; i < poolCount; i++) {
        const slice = shuffled.slice(startIndex, startIndex + fencersPerPool);
        result.push(slice);
        startIndex += fencersPerPool;
    }
    return result;
}

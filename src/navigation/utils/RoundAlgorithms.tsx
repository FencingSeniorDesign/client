// src/utils/RoundAlgorithms.ts

import { Fencer, RoundData } from '../navigation/types';

/**
 * Example data structure for storing each fencer's results in pools:
 * - fencer
 * - wins
 * - totalBouts
 * - touchesScored
 * - touchesReceived
 * etc.
 */
export type PoolResult = {
    fencer: Fencer;
    wins: number;
    totalBouts: number;
    touchesScored: number;
    touchesReceived: number;
};

/**
 * Merges all pool results, then sorts them by your desired ranking method:
 * e.g., by win ratio, then touches scored, etc.
 */
export function rankFencersFromPools(allPoolResults: PoolResult[][]): Fencer[] {
    // Flatten all results into a single array
    const merged: PoolResult[] = allPoolResults.reduce(
        (acc, pool) => acc.concat(pool),
        []
    );

    // Sort them. For example: first by win %, then by net touches
    merged.sort((a, b) => {
        const winRatioA = a.wins / (a.totalBouts || 1);
        const winRatioB = b.wins / (b.totalBouts || 1);
        if (winRatioB !== winRatioA) {
            return winRatioB - winRatioA; // descending
        }
        const netA = a.touchesScored - a.touchesReceived;
        const netB = b.touchesScored - b.touchesReceived;
        return netB - netA; // descending
    });

    // Return a simple array of fencers in sorted order
    return merged.map((r) => r.fencer);
}

/**
 * Takes the sorted list of fencers (best to worst)
 * and returns only the top X% if provided a promotion value.
 */
export function getPromotedFencers(sortedFencers: Fencer[], promotionPercent: number): Fencer[] {
    if (promotionPercent >= 100) {
        return sortedFencers; // no cut
    }
    const cutoff = Math.ceil((promotionPercent / 100) * sortedFencers.length);
    return sortedFencers.slice(0, cutoff);
}

/**
 * Given an array of fencers, plus a desired poolCount/fencersPerPool,
 * we create the new Pools for the next round.
 * This is basically the same logic you have in PoolsPage, but modular.
 */
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

/**
 * Example bracket data structure for single elimination:
 */
export type DEBracketMatch = {
    fencerA: Fencer | null;
    fencerB: Fencer | null;
    round: number;   // e.g. Round 1, Round 2, ...
    matchIndex: number; // index in that round
    winner?: Fencer;
    scoreA?: number;
    scoreB?: number;
};

export type DEBracketData = {
    roundCount: number;
    matches: DEBracketMatch[]; // all matches
};

/**
 * Build a single-elimination bracket from a list of fencers.
 * We'll assume the list size is some power-of-2 for simplicity,
 * or you can add byes if not.
 */
export function buildDEBracket(fencers: Fencer[]): DEBracketData {
    // e.g. if we have 8 fencers => Round 1 has 4 matches, Round 2 has 2, Round 3 has 1
    // roundCount = log2(8) = 3
    const size = fencers.length;
    const roundCount = Math.ceil(Math.log2(size));

    // We'll fill in matches for Round 1 by pairing up the fencers in order
    const matches: DEBracketMatch[] = [];
    let matchIndex = 0;
    for (let i = 0; i < size; i += 2) {
        const fA = fencers[i] || null;
        const fB = fencers[i + 1] || null;
        matches.push({
            fencerA: fA,
            fencerB: fB,
            round: 1,
            matchIndex: matchIndex,
        });
        matchIndex++;
    }

    // Future rounds will be appended as winners appear, so for now we just store Round 1.
    // We can dynamically create them in the DE screen as each round finishes.
    return {
        roundCount,
        matches,
    };
}

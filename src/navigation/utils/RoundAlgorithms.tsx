// src/utils/RoundAlgorithms.ts

import { Fencer, Round } from '../navigation/types';

export type PoolResult = {
    fencer: Fencer;
    wins: number;
    totalBouts: number;
    touchesScored: number;
    touchesReceived: number;
};

export type FencerSeeding = {
    fencer: Fencer;
    seed: number;
};

// Calculate preliminary seeding based on rating, year, then randomize unrated fencers
export function calculatePreliminarySeeding(fencers: Fencer[]): FencerSeeding[] {
    // Make a copy to avoid modifying the original array
    const fencersCopy = [...fencers];

    // Define rating rank value (A is best, U is worst)
    const ratingValue = {
        A: 6,
        B: 5,
        C: 4,
        D: 3,
        E: 2,
        U: 1,
    };

    // Sort by relevant criteria
    fencersCopy.sort((a, b) => {
        // First compare the ratings (prioritize weapon-specific rating first)
        const aRating =
            ratingValue[a.frating as keyof typeof ratingValue] ||
            ratingValue[a.erating as keyof typeof ratingValue] ||
            ratingValue[a.srating as keyof typeof ratingValue] ||
            ratingValue['U'];

        const bRating =
            ratingValue[b.frating as keyof typeof ratingValue] ||
            ratingValue[b.erating as keyof typeof ratingValue] ||
            ratingValue[b.srating as keyof typeof ratingValue] ||
            ratingValue['U'];

        if (aRating !== bRating) {
            return bRating - aRating; // Higher rating values first
        }

        // If ratings are equal, compare years (most recent first)
        const aYear = Math.max(a.fyear || 0, a.eyear || 0, a.syear || 0);
        const bYear = Math.max(b.fyear || 0, b.eyear || 0, b.syear || 0);

        if (aYear !== bYear) {
            return bYear - aYear; // More recent years first
        }

        // If everything is equal (or both are unrated), randomize
        return Math.random() - 0.5;
    });

    // Create the seeding array with indices
    return fencersCopy.map((fencer, index) => ({
        fencer,
        seed: index + 1,
    }));
}

// Calculate seeding based on round results
export function calculateSeedingFromResults(
    poolResults: {
        poolid: number;
        stats: {
            fencer: Fencer;
            boutsCount: number;
            wins: number;
            touchesScored: number;
            touchesReceived: number;
            winRate: number;
            indicator: number;
        }[];
    }[]
): FencerSeeding[] {
    // Flatten all the stats from all pools into a single array
    const allStats = poolResults.flatMap(pool => pool.stats);

    // Sort by win rate (descending), then by indicator (descending)
    allStats.sort((a, b) => {
        if (a.winRate !== b.winRate) {
            return b.winRate - a.winRate;
        }
        return b.indicator - a.indicator;
    });

    // Create the seeding array with indices
    return allStats.map((stat, index) => ({
        fencer: stat.fencer,
        seed: index + 1,
    }));
}

export function getPromotedFencers(sortedFencers: Fencer[], promotionPercent: number): Fencer[] {
    if (promotionPercent >= 100) {
        return sortedFencers;
    }
    const cutoff = Math.ceil((promotionPercent / 100) * sortedFencers.length);
    return sortedFencers.slice(0, cutoff);
}

export function buildPools(
    fencers: Fencer[],
    poolCount: number,
    fencersPerPool: number,
    seeding?: FencerSeeding[]
): Fencer[][] {
    // Always use seeding if provided, otherwise calculate preliminary seeding
    let orderedFencers: Fencer[];

    if (seeding && seeding.length > 0) {
        // Sort fencers by their seed
        orderedFencers = seeding.map(s => s.fencer);

        // Ensure all fencers are included (in case some weren't in the seeding)
        const seededFencerIds = new Set(orderedFencers.map(f => f.id));
        const unseededFencers = fencers.filter(f => f.id !== undefined && !seededFencerIds.has(f.id));

        // Add any unseeded fencers at the end by calculating their preliminary seeding
        if (unseededFencers.length > 0) {
            const unseededSeeding = calculatePreliminarySeeding(unseededFencers);
            const unseededOrdered = unseededSeeding.map(s => s.fencer);
            orderedFencers = [...orderedFencers, ...unseededOrdered];
        }
    } else {
        // If no seeding provided, calculate preliminary seeding
        const preliminarySeeding = calculatePreliminarySeeding(fencers);
        orderedFencers = preliminarySeeding.map(s => s.fencer);
    }

    // Distribute fencers to pools using snake seeding
    const result: Fencer[][] = Array(poolCount)
        .fill(null)
        .map(() => []);

    // Special case for small number of pools
    if (poolCount <= 1) {
        return [orderedFencers];
    }

    // Implement snake seeding
    for (let i = 0; i < orderedFencers.length; i++) {
        const roundPosition = Math.floor(i / poolCount);
        const poolPosition = i % poolCount;

        // For even rounds, go right to left to create snake pattern
        const poolIndex = roundPosition % 2 === 0 ? poolPosition : poolCount - 1 - poolPosition;

        result[poolIndex].push(orderedFencers[i]);
    }

    return result;
}

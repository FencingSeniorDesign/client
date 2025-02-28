// src/utils/RoundAlgorithms.ts

import { Fencer, Round } from '../navigation/types';

export type PoolResult = {
    fencer: Fencer;
    wins: number;
    totalBouts: number;
    touchesScored: number;
    touchesReceived: number;
};

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

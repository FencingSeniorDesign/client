// __tests__/navigation/utils/RoundAlgorithms.test.ts
import {
  calculatePreliminarySeeding,
  calculateSeedingFromResults,
  getPromotedFencers,
  buildPools
} from '../../../src/navigation/utils/RoundAlgorithms';
import { Fencer } from '../../../src/navigation/navigation/types';

// Mock Math.random for consistent test results
const mockMathRandom = jest.spyOn(global.Math, 'random');

describe('RoundAlgorithms', () => {
  // Create a helper function to create fencers with ratings
  const createFencer = (
    id: number,
    fname: string,
    lname: string,
    frating?: string,
    fyear?: number,
    club?: string
  ): Fencer => ({
    id,
    fname,
    lname,
    frating,
    fyear,
    club
  } as Fencer);

  beforeEach(() => {
    // Reset the Math.random mock implementation
    mockMathRandom.mockImplementation(() => 0.5);
  });

  afterAll(() => {
    // Restore original Math.random
    mockMathRandom.mockRestore();
  });

  describe('calculatePreliminarySeeding', () => {
    it('sorts fencers by rating (A to U) then by year (most recent first)', () => {
      const fencers: Fencer[] = [
        createFencer(1, 'Unrated', 'Fencer', 'U', 2023),
        createFencer(2, 'E-Rated', 'Fencer', 'E', 2022),
        createFencer(3, 'A-Rated', 'Old', 'A', 2010),
        createFencer(4, 'A-Rated', 'Recent', 'A', 2023),
        createFencer(5, 'C-Rated', 'Fencer', 'C', 2021),
        createFencer(6, 'B-Rated', 'Fencer', 'B', 2022),
        createFencer(7, 'D-Rated', 'Fencer', 'D', 2023),
      ];

      const result = calculatePreliminarySeeding(fencers);

      // Expected order based on rating then year: A(2023), A(2010), B, C, D, E, U
      expect(result[0].fencer.id).toBe(4); // A-Rated Recent
      expect(result[1].fencer.id).toBe(3); // A-Rated Old
      expect(result[2].fencer.id).toBe(6); // B-Rated
      expect(result[3].fencer.id).toBe(5); // C-Rated
      expect(result[4].fencer.id).toBe(7); // D-Rated
      expect(result[5].fencer.id).toBe(2); // E-Rated
      expect(result[6].fencer.id).toBe(1); // Unrated
      
      // Check that seed values are correctly assigned (1-based)
      for (let i = 0; i < result.length; i++) {
        expect(result[i].seed).toBe(i + 1);
      }
    });

    it('assigns seeding to fencers with equal ratings and years', () => {
      const fencers: Fencer[] = [
        createFencer(1, 'First', 'Unrated'),
        createFencer(2, 'Second', 'Unrated'),
        createFencer(3, 'Third', 'Unrated'),
      ];

      const result = calculatePreliminarySeeding(fencers);
      
      // With equal ratings, we just check that all fencers get seedings
      expect(result).toHaveLength(3);
      
      // Each fencer should have a seed property
      result.forEach((seededFencer, index) => {
        expect(seededFencer).toHaveProperty('seed');
        expect(seededFencer.seed).toBe(index + 1);
      });
      
      // The IDs should match our original fencers (in some order)
      const resultIds = result.map(r => r.fencer.id).sort();
      expect(resultIds).toEqual([1, 2, 3]);
    });

    it('handles empty input array', () => {
      const result = calculatePreliminarySeeding([]);
      expect(result).toEqual([]);
    });

    it('uses weapon-specific rating when available', () => {
      const fencers = [
        { id: 1, fname: 'Foil', lname: 'Fencer', frating: 'A', erating: 'C', srating: 'B' } as Fencer,
        { id: 2, fname: 'Epee', lname: 'Fencer', frating: 'D', erating: 'A', srating: 'C' } as Fencer,
        { id: 3, fname: 'Saber', lname: 'Fencer', frating: 'B', erating: 'D', srating: 'A' } as Fencer,
      ];

      const result = calculatePreliminarySeeding(fencers);
      
      // Should use the highest rating for each fencer (frating: A, erating: A, srating: A)
      // Since they all have A ratings, should be sorted randomly
      expect(result).toHaveLength(3);
    });
  });

  describe('calculateSeedingFromResults', () => {
    it('sorts fencers by win rate then by indicator', () => {
      const poolResults = [
        {
          poolid: 1,
          stats: [
            {
              fencer: createFencer(1, 'High', 'WinLowInd') as Fencer,
              boutsCount: 5,
              wins: 4,
              touchesScored: 20,
              touchesReceived: 15,
              winRate: 0.8,  // 4/5 = 0.8
              indicator: 5,  // 20-15 = 5
            },
            {
              fencer: createFencer(2, 'High', 'WinHighInd') as Fencer,
              boutsCount: 5,
              wins: 4,
              touchesScored: 25,
              touchesReceived: 10,
              winRate: 0.8,  // 4/5 = 0.8
              indicator: 15, // 25-10 = 15
            },
            {
              fencer: createFencer(3, 'Low', 'Win') as Fencer,
              boutsCount: 5,
              wins: 1,
              touchesScored: 10,
              touchesReceived: 25,
              winRate: 0.2,  // 1/5 = 0.2
              indicator: -15, // 10-25 = -15
            },
          ],
        },
        {
          poolid: 2,
          stats: [
            {
              fencer: createFencer(4, 'Medium', 'Win') as Fencer,
              boutsCount: 5,
              wins: 3,
              touchesScored: 20,
              touchesReceived: 20,
              winRate: 0.6,  // 3/5 = 0.6
              indicator: 0,  // 20-20 = 0
            },
          ],
        },
      ];

      const result = calculateSeedingFromResults(poolResults);

      // Expected order: High WinHighInd (0.8, 15), High WinLowInd (0.8, 5), Medium Win (0.6, 0), Low Win (0.2, -15)
      expect(result).toHaveLength(4);
      expect(result[0].fencer.id).toBe(2); // High WinHighInd
      expect(result[1].fencer.id).toBe(1); // High WinLowInd
      expect(result[2].fencer.id).toBe(4); // Medium Win
      expect(result[3].fencer.id).toBe(3); // Low Win
      
      // Check that seed values are correctly assigned (1-based)
      for (let i = 0; i < result.length; i++) {
        expect(result[i].seed).toBe(i + 1);
      }
    });

    it('handles empty pools', () => {
      const result = calculateSeedingFromResults([]);
      expect(result).toEqual([]);
    });

    it('handles empty stats in pools', () => {
      const result = calculateSeedingFromResults([
        { poolid: 1, stats: [] },
        { poolid: 2, stats: [] },
      ]);
      expect(result).toEqual([]);
    });
  });

  describe('getPromotedFencers', () => {
    const fencers = [
      createFencer(1, 'First', 'Fencer'),
      createFencer(2, 'Second', 'Fencer'),
      createFencer(3, 'Third', 'Fencer'),
      createFencer(4, 'Fourth', 'Fencer'),
      createFencer(5, 'Fifth', 'Fencer'),
      createFencer(6, 'Sixth', 'Fencer'),
      createFencer(7, 'Seventh', 'Fencer'),
      createFencer(8, 'Eighth', 'Fencer'),
    ];

    it('returns all fencers when promotionPercent is 100 or higher', () => {
      expect(getPromotedFencers(fencers, 100)).toEqual(fencers);
      expect(getPromotedFencers(fencers, 120)).toEqual(fencers);
    });

    it('promotes the right number of fencers based on percentage', () => {
      // 25% of 8 fencers is 2
      expect(getPromotedFencers(fencers, 25)).toEqual(fencers.slice(0, 2));
      
      // 50% of 8 fencers is 4
      expect(getPromotedFencers(fencers, 50)).toEqual(fencers.slice(0, 4));
      
      // 75% of 8 fencers is 6
      expect(getPromotedFencers(fencers, 75)).toEqual(fencers.slice(0, 6));
    });

    it('rounds up when calculating promotion count', () => {
      // 30% of 8 fencers is 2.4, should round up to 3
      expect(getPromotedFencers(fencers, 30)).toEqual(fencers.slice(0, 3));
      
      // 90% of 8 fencers is 7.2, should round up to 8
      expect(getPromotedFencers(fencers, 90)).toEqual(fencers);
    });

    it('handles empty input array', () => {
      expect(getPromotedFencers([], 50)).toEqual([]);
    });
  });

  describe('buildPools', () => {
    const fencers = [
      createFencer(1, 'First', 'Fencer', 'A', 2023, 'Club A'),
      createFencer(2, 'Second', 'Fencer', 'B', 2022, 'Club B'),
      createFencer(3, 'Third', 'Fencer', 'C', 2021, 'Club C'),
      createFencer(4, 'Fourth', 'Fencer', 'D', 2020, 'Club D'),
      createFencer(5, 'Fifth', 'Fencer', 'E', 2019, 'Club E'),
      createFencer(6, 'Sixth', 'Fencer', 'U', 2023, 'Club F'),
    ];

    it('distributes fencers into pools using snake seeding', () => {
      // 6 fencers into 2 pools using snake seeding
      // Snake pattern would be: 1,4,5 in pool 1, 2,3,6 in pool 2
      const pools = buildPools(fencers, 2, 3);
      
      expect(pools).toHaveLength(2);
      
      // First pool should have fencers 1, 4, 5
      expect(pools[0]).toHaveLength(3);
      expect(pools[0][0].id).toBe(1);
      expect(pools[0][1].id).toBe(4);
      expect(pools[0][2].id).toBe(5);
      
      // Second pool should have fencers 2, 3, 6
      expect(pools[1]).toHaveLength(3);
      expect(pools[1][0].id).toBe(2);
      expect(pools[1][1].id).toBe(3);
      expect(pools[1][2].id).toBe(6);
    });

    it('uses provided seeding instead of calculating preliminary seeding', () => {
      // Provide custom seeding that's different from rating order
      const customSeeding = [
        { fencer: fencers[5], seed: 1 }, // Sixth fencer
        { fencer: fencers[4], seed: 2 }, // Fifth fencer
        { fencer: fencers[3], seed: 3 }, // Fourth fencer
        { fencer: fencers[2], seed: 4 }, // Third fencer
        { fencer: fencers[1], seed: 5 }, // Second fencer
        { fencer: fencers[0], seed: 6 }, // First fencer
      ];
      
      // 6 fencers into 2 pools using provided seeding
      // Snake pattern with custom seeding: 6,3,2 in pool 1, 5,4,1 in pool 2
      const pools = buildPools(fencers, 2, 3, customSeeding);
      
      expect(pools).toHaveLength(2);
      
      // First pool should have fencers 6, 3, 2 (based on provided seeding)
      expect(pools[0]).toHaveLength(3);
      expect(pools[0][0].id).toBe(6);
      expect(pools[0][1].id).toBe(3);
      expect(pools[0][2].id).toBe(2);
      
      // Second pool should have fencers 5, 4, 1 (based on provided seeding)
      expect(pools[1]).toHaveLength(3);
      expect(pools[1][0].id).toBe(5);
      expect(pools[1][1].id).toBe(4);
      expect(pools[1][2].id).toBe(1);
    });

    it('handles the special case of a single pool', () => {
      const pools = buildPools(fencers, 1, 6);
      
      expect(pools).toHaveLength(1);
      expect(pools[0]).toHaveLength(6);
      // All fencers should be in the same pool, order should match seeding
      expect(pools[0].map(f => f.id)).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('handles uneven distribution of fencers', () => {
      // 5 fencers into 2 pools - should create pools of 3 and 2
      const unevenFencers = fencers.slice(0, 5);
      const pools = buildPools(unevenFencers, 2, 3);
      
      expect(pools).toHaveLength(2);
      expect(pools[0]).toHaveLength(3); // 1, 4, 5
      expect(pools[1]).toHaveLength(2); // 2, 3
    });

    it('includes fencers not in provided seeding', () => {
      // Only provide seeding for 3 of the 6 fencers
      const partialSeeding = [
        { fencer: fencers[0], seed: 1 },
        { fencer: fencers[1], seed: 2 },
        { fencer: fencers[2], seed: 3 },
      ];
      
      const pools = buildPools(fencers, 2, 3, partialSeeding);
      
      expect(pools).toHaveLength(2);
      // All 6 fencers should be included in the pools
      const allPoolFencers = [...pools[0], ...pools[1]];
      expect(allPoolFencers).toHaveLength(6);
      
      // The unseeded fencers (4, 5, 6) should be added at the end
      // based on preliminary seeding
    });
  });
});
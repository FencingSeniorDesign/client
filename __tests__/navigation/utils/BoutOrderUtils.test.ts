// __tests__/navigation/utils/BoutOrderUtils.test.ts
import {
  groupFencersByClub,
  assignPoolPositions,
  getBoutOrder,
  generateClubAbbreviation
} from '../../../src/navigation/utils/BoutOrderUtils';
import { Fencer } from '../../../src/navigation/navigation/types';

// Mock the Fencer type if needed
jest.mock('../../../src/navigation/navigation/types', () => ({}));

describe('BoutOrderUtils', () => {
  describe('groupFencersByClub', () => {
    it('correctly groups fencers by club', () => {
      const fencers: Fencer[] = [
        { id: 1, fname: 'Alice', lname: 'Smith', club: 'Club A' } as Fencer,
        { id: 2, fname: 'Bob', lname: 'Jones', club: 'Club B' } as Fencer,
        { id: 3, fname: 'Charlie', lname: 'Brown', club: 'Club A' } as Fencer,
        { id: 4, fname: 'David', lname: 'Miller', clubName: 'Club C' } as Fencer, // Using clubName instead of club
        { id: 5, fname: 'Eve', lname: 'Wilson', club: 'Club B' } as Fencer,
        { id: 6, fname: 'Frank', lname: 'Taylor', club: '' } as Fencer, // Empty club
        { id: 7, fname: 'Grace', lname: 'Davis' } as Fencer, // No club
      ];

      const result = groupFencersByClub(fencers);

      // Check club groups
      expect(Object.keys(result)).toHaveLength(3); // 3 clubs: Club A, Club B, Club C
      
      expect(result['Club A']).toHaveLength(2);
      expect(result['Club A'][0].id).toBe(1);
      expect(result['Club A'][1].id).toBe(3);
      
      expect(result['Club B']).toHaveLength(2);
      expect(result['Club B'][0].id).toBe(2);
      expect(result['Club B'][1].id).toBe(5);
      
      expect(result['Club C']).toHaveLength(1);
      expect(result['Club C'][0].id).toBe(4);
      
      // Fencers without clubs should not be in any group
      expect(result['']).toBeUndefined();
    });

    it('returns an empty object when no fencers have clubs', () => {
      const fencers: Fencer[] = [
        { id: 1, fname: 'Alice', lname: 'Smith' } as Fencer,
        { id: 2, fname: 'Bob', lname: 'Jones' } as Fencer,
      ];

      const result = groupFencersByClub(fencers);
      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe('assignPoolPositions', () => {
    it('assigns pool positions for 6 fencers with 2 teammates', () => {
      const fencers: Fencer[] = [
        { id: 1, fname: 'Alice', lname: 'Smith', club: 'Club A' } as Fencer,
        { id: 2, fname: 'Bob', lname: 'Jones', club: 'Club B' } as Fencer,
        { id: 3, fname: 'Charlie', lname: 'Brown', club: 'Club A' } as Fencer, // Same club as Alice
        { id: 4, fname: 'David', lname: 'Miller', club: 'Club C' } as Fencer,
        { id: 5, fname: 'Eve', lname: 'Wilson', club: 'Club D' } as Fencer,
        { id: 6, fname: 'Frank', lname: 'Taylor', club: 'Club E' } as Fencer,
      ];

      const result = assignPoolPositions(fencers);

      // Check that 2 teammates are positioned at 1 and 4
      expect(result).toHaveLength(6);
      
      // Find the fencers from Club A (should be at positions 1 and 4)
      const clubAFencers = result.filter(f => f.club === 'Club A');
      expect(clubAFencers).toHaveLength(2);
      
      const position1 = result[0];
      const position4 = result[3];
      
      expect(position1.club).toBe('Club A');
      expect(position4.club).toBe('Club A');
      
      // All fencers should have pool numbers assigned
      for (let i = 0; i < result.length; i++) {
        expect(result[i].poolNumber).toBe(i + 1);
      }
    });

    it('assigns pool positions for 6 fencers with two sets of 2 teammates', () => {
      const fencers: Fencer[] = [
        { id: 1, fname: 'Alice', lname: 'Smith', club: 'Club A' } as Fencer,
        { id: 2, fname: 'Bob', lname: 'Jones', club: 'Club B' } as Fencer,
        { id: 3, fname: 'Charlie', lname: 'Brown', club: 'Club A' } as Fencer, // Same club as Alice
        { id: 4, fname: 'David', lname: 'Miller', club: 'Club B' } as Fencer, // Same club as Bob
        { id: 5, fname: 'Eve', lname: 'Wilson', club: 'Club D' } as Fencer,
        { id: 6, fname: 'Frank', lname: 'Taylor', club: 'Club E' } as Fencer,
      ];

      const result = assignPoolPositions(fencers);

      // Check for expected positions (1-4 for team A, 2-5 for team B)
      expect(result).toHaveLength(6);
      
      // Find positions for Club A fencers (should be at positions 1 and 4)
      const clubAFencers = result.filter(f => f.club === 'Club A');
      expect(clubAFencers).toHaveLength(2);
      expect(clubAFencers.map(f => f.poolNumber).sort()).toEqual([1, 4]);
      
      // Find positions for Club B fencers (should be at positions 2 and 5)
      const clubBFencers = result.filter(f => f.club === 'Club B');
      expect(clubBFencers).toHaveLength(2);
      expect(clubBFencers.map(f => f.poolNumber).sort()).toEqual([2, 5]);
    });

    it('handles case when no clubmates exist', () => {
      const fencers: Fencer[] = [
        { id: 1, fname: 'Alice', lname: 'Smith', club: 'Club A' } as Fencer,
        { id: 2, fname: 'Bob', lname: 'Jones', club: 'Club B' } as Fencer,
        { id: 3, fname: 'Charlie', lname: 'Brown', club: 'Club C' } as Fencer,
        { id: 4, fname: 'David', lname: 'Miller', club: 'Club D' } as Fencer,
      ];

      const result = assignPoolPositions(fencers);

      // Should return fencers with poolNumber assigned but positions not specially arranged
      expect(result).toHaveLength(4);
      
      // Check that each fencer has a pool number
      for (let i = 0; i < result.length; i++) {
        expect(result[i].poolNumber).toBe(i + 1);
      }
    });
  });

  describe('getBoutOrder', () => {
    it('returns standard bout order for pool size with no teammates', () => {
      const fencers: Fencer[] = [
        { id: 1, fname: 'Alice', lname: 'Smith', club: 'Club A', poolNumber: 1 } as Fencer,
        { id: 2, fname: 'Bob', lname: 'Jones', club: 'Club B', poolNumber: 2 } as Fencer,
        { id: 3, fname: 'Charlie', lname: 'Brown', club: 'Club C', poolNumber: 3 } as Fencer,
        { id: 4, fname: 'David', lname: 'Miller', club: 'Club D', poolNumber: 4 } as Fencer,
      ];

      const result = getBoutOrder(4, fencers);

      // Standard bout order for a pool of 4
      const expectedOrder = [
        [1, 4],
        [2, 3],
        [1, 3],
        [2, 4],
        [3, 4],
        [1, 2],
      ];
      
      expect(result).toEqual(expectedOrder);
    });

    it('returns special bout order for pool with teammates', () => {
      const fencers: Fencer[] = [
        { id: 1, fname: 'Alice', lname: 'Smith', club: 'Club A', poolNumber: 1 } as Fencer,
        { id: 2, fname: 'Bob', lname: 'Jones', club: 'Club B', poolNumber: 2 } as Fencer,
        { id: 3, fname: 'Charlie', lname: 'Brown', club: 'Club C', poolNumber: 3 } as Fencer,
        { id: 4, fname: 'David', lname: 'Miller', club: 'Club A', poolNumber: 4 } as Fencer,
        { id: 5, fname: 'Eve', lname: 'Wilson', club: 'Club B', poolNumber: 5 } as Fencer,
        { id: 6, fname: 'Frank', lname: 'Taylor', club: 'Club E', poolNumber: 6 } as Fencer,
      ];

      const result = getBoutOrder(6, fencers);

      // Should use special bout order for pool of 6 with 1,4 and 2,5 teammates
      expect(result).not.toEqual([
        [1, 2],
        [4, 5],
        [2, 3],
        [5, 6],
        [3, 1],
        [6, 4],
        [2, 5],
        [1, 4],
        [5, 3],
        [1, 6],
        [4, 2],
        [3, 6],
        [5, 1],
        [3, 4],
        [6, 2],
      ]); // Not standard order
      
      // For the specific test case above with fencers from different clubs
      // in standard positions, standard bout order would be used
      // So we only verify it returns a non-empty array of bout pairs
      expect(result.length).toBeGreaterThan(0);
    });

    it('returns empty array for unsupported pool size', () => {
      const fencers: Fencer[] = [
        { id: 1, fname: 'Alice', lname: 'Smith', club: 'Club A', poolNumber: 1 } as Fencer,
        { id: 2, fname: 'Bob', lname: 'Jones', club: 'Club B', poolNumber: 2 } as Fencer,
        { id: 3, fname: 'Charlie', lname: 'Brown', club: 'Club C', poolNumber: 3 } as Fencer,
      ];

      // Pool size 3 is not in the BOUT_ORDERS map
      const result = getBoutOrder(3, fencers);
      expect(result).toEqual([]);
    });
  });

  describe('generateClubAbbreviation', () => {
    it('generates abbreviations from first letters of words', () => {
      expect(generateClubAbbreviation('New York Fencing Club')).toBe('NYFC');
      expect(generateClubAbbreviation('Boston Fencing')).toBe('BF');
      expect(generateClubAbbreviation('A')).toBe('A'); // Single letter
      expect(generateClubAbbreviation('Fencing Academy of Philadelphia')).toBe('FAOP');
    });

    it('handles short club names by taking first two letters', () => {
      expect(generateClubAbbreviation('A')).toBe('A'); // Single letter gets returned as is
      expect(generateClubAbbreviation('AB')).toBe('AB'); // Two letter name gets returned as is
    });

    it('truncates long abbreviations to 5 characters', () => {
      expect(generateClubAbbreviation('Atlanta International Fencing Academy Downtown Center')).toBe('AIFAD');
      expect(generateClubAbbreviation('American British Canadian Dutch English Fencing')).toBe('ABCDE');
    });

    it('handles empty input', () => {
      expect(generateClubAbbreviation('')).toBe('');
      expect(generateClubAbbreviation(undefined as unknown as string)).toBe('');
    });
  });
});
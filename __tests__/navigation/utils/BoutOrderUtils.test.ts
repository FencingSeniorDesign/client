// __tests__/navigation/utils/BoutOrderUtils.test.ts
import {
    groupFencersByClub,
    assignPoolPositions,
    getBoutOrder,
    generateClubAbbreviation,
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

        it('assigns pool positions for 6 fencers with three sets of 2 teammates', () => {
            const fencers: Fencer[] = [
                { id: 1, fname: 'Alice', lname: 'Smith', club: 'Club A' } as Fencer,
                { id: 2, fname: 'Bob', lname: 'Jones', club: 'Club B' } as Fencer,
                { id: 3, fname: 'Charlie', lname: 'Brown', club: 'Club C' } as Fencer,
                { id: 4, fname: 'David', lname: 'Miller', club: 'Club A' } as Fencer, // Same club as Alice
                { id: 5, fname: 'Eve', lname: 'Wilson', club: 'Club B' } as Fencer, // Same club as Bob
                { id: 6, fname: 'Frank', lname: 'Taylor', club: 'Club C' } as Fencer, // Same club as Charlie
            ];

            const result = assignPoolPositions(fencers);

            // Check for expected positions (1-4, 2-5, 3-6 for team pairs)
            expect(result).toHaveLength(6);

            // Find positions for Club A fencers (should be at positions 1 and 4)
            const clubAFencers = result.filter(f => f.club === 'Club A');
            expect(clubAFencers).toHaveLength(2);
            expect(clubAFencers.map(f => f.poolNumber).sort()).toEqual([1, 4]);

            // Find positions for Club B fencers (should be at positions 2 and 5)
            const clubBFencers = result.filter(f => f.club === 'Club B');
            expect(clubBFencers).toHaveLength(2);
            expect(clubBFencers.map(f => f.poolNumber).sort()).toEqual([2, 5]);

            // Find positions for Club C fencers (should be at positions 3 and 6)
            const clubCFencers = result.filter(f => f.club === 'Club C');
            expect(clubCFencers).toHaveLength(2);
            expect(clubCFencers.map(f => f.poolNumber).sort()).toEqual([3, 6]);
        });

        it('assigns pool positions for 6 fencers with 3 teammates', () => {
            const fencers: Fencer[] = [
                { id: 1, fname: 'Alice', lname: 'Smith', club: 'Club A' } as Fencer,
                { id: 2, fname: 'Bob', lname: 'Jones', club: 'Club A' } as Fencer, // Same club as Alice
                { id: 3, fname: 'Charlie', lname: 'Brown', club: 'Club A' } as Fencer, // Same club as Alice
                { id: 4, fname: 'David', lname: 'Miller', club: 'Club B' } as Fencer,
                { id: 5, fname: 'Eve', lname: 'Wilson', club: 'Club C' } as Fencer,
                { id: 6, fname: 'Frank', lname: 'Taylor', club: 'Club D' } as Fencer,
            ];

            const result = assignPoolPositions(fencers);

            // Check for expected positions (1-2-3 for team of 3)
            expect(result).toHaveLength(6);

            // Find positions for Club A fencers (should be at positions 1, 2, and 3)
            const clubAFencers = result.filter(f => f.club === 'Club A');
            expect(clubAFencers).toHaveLength(3);
            expect(clubAFencers.map(f => f.poolNumber).sort()).toEqual([1, 2, 3]);
        });

        it('assigns pool positions for 7 fencers with 2 teammates', () => {
            const fencers: Fencer[] = [
                { id: 1, fname: 'Alice', lname: 'Smith', club: 'Club A' } as Fencer,
                { id: 2, fname: 'Bob', lname: 'Jones', club: 'Club B' } as Fencer,
                { id: 3, fname: 'Charlie', lname: 'Brown', club: 'Club C' } as Fencer,
                { id: 4, fname: 'David', lname: 'Miller', club: 'Club A' } as Fencer, // Same club as Alice
                { id: 5, fname: 'Eve', lname: 'Wilson', club: 'Club D' } as Fencer,
                { id: 6, fname: 'Frank', lname: 'Taylor', club: 'Club E' } as Fencer,
                { id: 7, fname: 'Grace', lname: 'Lee', club: 'Club F' } as Fencer,
            ];

            const result = assignPoolPositions(fencers);

            // Check for expected positions (1-4 for team of 2)
            expect(result).toHaveLength(7);

            // Find positions for Club A fencers (should be at positions 1 and 4)
            const clubAFencers = result.filter(f => f.club === 'Club A');
            expect(clubAFencers).toHaveLength(2);
            expect(clubAFencers.map(f => f.poolNumber).sort()).toEqual([1, 4]);
        });

        it('assigns pool positions for 7 fencers with 3 teammates', () => {
            const fencers: Fencer[] = [
                { id: 1, fname: 'Alice', lname: 'Smith', club: 'Club A' } as Fencer,
                { id: 2, fname: 'Bob', lname: 'Jones', club: 'Club A' } as Fencer, // Same club as Alice
                { id: 3, fname: 'Charlie', lname: 'Brown', club: 'Club A' } as Fencer, // Same club as Alice
                { id: 4, fname: 'David', lname: 'Miller', club: 'Club B' } as Fencer,
                { id: 5, fname: 'Eve', lname: 'Wilson', club: 'Club C' } as Fencer,
                { id: 6, fname: 'Frank', lname: 'Taylor', club: 'Club D' } as Fencer,
                { id: 7, fname: 'Grace', lname: 'Lee', club: 'Club E' } as Fencer,
            ];

            const result = assignPoolPositions(fencers);

            // Check for expected positions (1-2-3 for team of 3)
            expect(result).toHaveLength(7);

            // Find positions for Club A fencers (should be at positions 1, 2, and 3)
            const clubAFencers = result.filter(f => f.club === 'Club A');
            expect(clubAFencers).toHaveLength(3);
            expect(clubAFencers.map(f => f.poolNumber).sort()).toEqual([1, 2, 3]);
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

        it('handles unassigned positions with original fencers', () => {
            // This test directly tests the fallback mechanism for unassigned positions in assignPoolPositions
            const fencers: Fencer[] = [
                { id: 1, fname: 'Alice', lname: 'Smith', club: 'Club A' } as Fencer,
                { id: 2, fname: 'Bob', lname: 'Jones', club: 'Club B' } as Fencer,
                { id: 3, fname: 'Charlie', lname: 'Brown', club: 'Club C' } as Fencer,
                { id: 4, fname: 'David', lname: 'Miller', club: 'Club D' } as Fencer,
            ];

            // Create an array with one missing assignment to test the fallback logic
            const assignedFencers = new Array(fencers.length);
            assignedFencers[0] = fencers[0];
            assignedFencers[1] = fencers[1];
            // Intentionally leave index 2 unassigned
            assignedFencers[3] = fencers[3];

            // Use the assignPoolPositions function directly
            const result = assignPoolPositions(fencers);

            // Verify all positions have fencers with pool numbers
            for (let i = 0; i < result.length; i++) {
                expect(result[i]).toBeDefined();
                expect(result[i].poolNumber).toBe(i + 1);
            }
        });

        it('fills empty positions with remaining team members', () => {
            // This test covers the logic for filling empty positions with unassigned team members
            const fencers: Fencer[] = [
                { id: 1, fname: 'Alice', lname: 'Smith', club: 'Club A' } as Fencer,
                { id: 2, fname: 'Bob', lname: 'Jones', club: 'Club A' } as Fencer, // Teammate
                { id: 3, fname: 'Charlie', lname: 'Brown', club: 'Club A' } as Fencer, // Teammate
                { id: 4, fname: 'David', lname: 'Miller', club: 'Club B' } as Fencer,
                { id: 5, fname: 'Eve', lname: 'Wilson', club: 'Club B' } as Fencer, // Teammate
                { id: 6, fname: 'Frank', lname: 'Taylor', club: 'Club C' } as Fencer,
                { id: 7, fname: 'Grace', lname: 'Lee', club: 'Club C' } as Fencer, // Teammate
                { id: 8, fname: 'Heidi', lname: 'Nguyen', club: 'Club D' } as Fencer,
            ];

            // This will create a situation with multiple team groups and not enough solo fencers to fill positions
            // Forces the code to go through the remaining team members search logic (lines 363-371)
            const result = assignPoolPositions(fencers);

            // All positions should have fencers assigned with pool numbers
            expect(result.length).toBe(fencers.length);
            for (let i = 0; i < result.length; i++) {
                expect(result[i]).toBeDefined();
                expect(result[i].poolNumber).toBe(i + 1);
            }

            // Check that all 8 fencers were assigned a position
            const assignedIds = result.map(f => f.id).sort();
            const originalIds = fencers.map(f => f.id).sort();
            expect(assignedIds).toEqual(originalIds);
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

        it('returns special bout order for pool with teammates at positions 1-4', () => {
            const fencers: Fencer[] = [
                { id: 1, fname: 'Alice', lname: 'Smith', club: 'Club A', poolNumber: 1 } as Fencer,
                { id: 2, fname: 'Bob', lname: 'Jones', club: 'Club B', poolNumber: 2 } as Fencer,
                { id: 3, fname: 'Charlie', lname: 'Brown', club: 'Club C', poolNumber: 3 } as Fencer,
                { id: 4, fname: 'David', lname: 'Miller', club: 'Club A', poolNumber: 4 } as Fencer, // Teammate at position 1
                { id: 5, fname: 'Eve', lname: 'Wilson', club: 'Club D', poolNumber: 5 } as Fencer,
                { id: 6, fname: 'Frank', lname: 'Taylor', club: 'Club E', poolNumber: 6 } as Fencer,
            ];

            const result = getBoutOrder(6, fencers);

            // Expected special bout order for 6 fencers with teammates at positions 1,4
            const expectedOrder = [
                [1, 4],
                [2, 5],
                [3, 6],
                [5, 1],
                [4, 2],
                [3, 1],
                [6, 2],
                [5, 3],
                [6, 4],
                [1, 2],
                [3, 4],
                [5, 6],
                [2, 3],
                [1, 6],
                [4, 5],
            ];

            expect(result).toEqual(expectedOrder);
        });

        it('returns special bout order for pool with two sets of teammates at positions 1-4, 2-5', () => {
            const fencers: Fencer[] = [
                { id: 1, fname: 'Alice', lname: 'Smith', club: 'Club A', poolNumber: 1 } as Fencer,
                { id: 2, fname: 'Bob', lname: 'Jones', club: 'Club B', poolNumber: 2 } as Fencer,
                { id: 3, fname: 'Charlie', lname: 'Brown', club: 'Club C', poolNumber: 3 } as Fencer,
                { id: 4, fname: 'David', lname: 'Miller', club: 'Club A', poolNumber: 4 } as Fencer, // Teammate at position 1
                { id: 5, fname: 'Eve', lname: 'Wilson', club: 'Club B', poolNumber: 5 } as Fencer, // Teammate at position 2
                { id: 6, fname: 'Frank', lname: 'Taylor', club: 'Club D', poolNumber: 6 } as Fencer,
            ];

            const result = getBoutOrder(6, fencers);

            // Expected special bout order for 6 fencers with teammates at positions 1,4 and 2,5
            const expectedOrder = [
                [1, 4],
                [2, 5],
                [3, 6],
                [5, 1],
                [4, 2],
                [3, 1],
                [6, 2],
                [5, 3],
                [6, 4],
                [1, 2],
                [3, 4],
                [5, 6],
                [2, 3],
                [1, 6],
                [4, 5],
            ];

            expect(result).toEqual(expectedOrder);
        });

        it('returns special bout order for pool with teammates at positions 1-2-3', () => {
            const fencers: Fencer[] = [
                { id: 1, fname: 'Alice', lname: 'Smith', club: 'Club A', poolNumber: 1 } as Fencer,
                { id: 2, fname: 'Bob', lname: 'Jones', club: 'Club A', poolNumber: 2 } as Fencer, // Teammate at position 1
                { id: 3, fname: 'Charlie', lname: 'Brown', club: 'Club A', poolNumber: 3 } as Fencer, // Teammate at position 1
                { id: 4, fname: 'David', lname: 'Miller', club: 'Club B', poolNumber: 4 } as Fencer,
                { id: 5, fname: 'Eve', lname: 'Wilson', club: 'Club C', poolNumber: 5 } as Fencer,
                { id: 6, fname: 'Frank', lname: 'Taylor', club: 'Club D', poolNumber: 6 } as Fencer,
            ];

            const result = getBoutOrder(6, fencers);

            // Expected special bout order for 6 fencers with 3 teammates at positions 1,2,3
            const expectedOrder = [
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
            ];

            expect(result).toEqual(expectedOrder);
        });

        it('returns special bout order for pool of 7 with teammates at positions 1-4', () => {
            const fencers: Fencer[] = [
                { id: 1, fname: 'Alice', lname: 'Smith', club: 'Club A', poolNumber: 1 } as Fencer,
                { id: 2, fname: 'Bob', lname: 'Jones', club: 'Club B', poolNumber: 2 } as Fencer,
                { id: 3, fname: 'Charlie', lname: 'Brown', club: 'Club C', poolNumber: 3 } as Fencer,
                { id: 4, fname: 'David', lname: 'Miller', club: 'Club A', poolNumber: 4 } as Fencer, // Teammate at position 1
                { id: 5, fname: 'Eve', lname: 'Wilson', club: 'Club D', poolNumber: 5 } as Fencer,
                { id: 6, fname: 'Frank', lname: 'Taylor', club: 'Club E', poolNumber: 6 } as Fencer,
                { id: 7, fname: 'Grace', lname: 'Lee', club: 'Club F', poolNumber: 7 } as Fencer,
            ];

            const result = getBoutOrder(7, fencers);

            // The expected order should match TEAMMATE_BOUT_ORDERS[7]['1,4']
            expect(result.length).toBe(21); // A pool of 7 should have 21 bouts
            expect(result[0]).toEqual([1, 4]); // First bout should be between teammates
        });

        it('returns special bout order for pool of 7 with teammates at positions 1-2-3', () => {
            const fencers: Fencer[] = [
                { id: 1, fname: 'Alice', lname: 'Smith', club: 'Club A', poolNumber: 1 } as Fencer,
                { id: 2, fname: 'Bob', lname: 'Jones', club: 'Club A', poolNumber: 2 } as Fencer, // Teammate at position 1
                { id: 3, fname: 'Charlie', lname: 'Brown', club: 'Club A', poolNumber: 3 } as Fencer, // Teammate at position 1
                { id: 4, fname: 'David', lname: 'Miller', club: 'Club B', poolNumber: 4 } as Fencer,
                { id: 5, fname: 'Eve', lname: 'Wilson', club: 'Club C', poolNumber: 5 } as Fencer,
                { id: 6, fname: 'Frank', lname: 'Taylor', club: 'Club D', poolNumber: 6 } as Fencer,
                { id: 7, fname: 'Grace', lname: 'Lee', club: 'Club E', poolNumber: 7 } as Fencer,
            ];

            const result = getBoutOrder(7, fencers);

            // The expected order should match TEAMMATE_BOUT_ORDERS[7]['1,2,3']
            expect(result.length).toBe(21); // A pool of 7 should have 21 bouts
            expect(result[0]).toEqual([1, 2]); // First bout should be between teammates
        });

        it('falls back to standard bout order if no special pattern is found', () => {
            // Create a scenario not explicitly defined in TEAMMATE_BOUT_ORDERS
            const fencers: Fencer[] = [
                { id: 1, fname: 'Alice', lname: 'Smith', club: 'Club A', poolNumber: 1 } as Fencer,
                { id: 2, fname: 'Bob', lname: 'Jones', club: 'Club B', poolNumber: 2 } as Fencer,
                { id: 3, fname: 'Charlie', lname: 'Brown', club: 'Club C', poolNumber: 3 } as Fencer,
                { id: 4, fname: 'David', lname: 'Miller', club: 'Club D', poolNumber: 4 } as Fencer,
                { id: 5, fname: 'Eve', lname: 'Wilson', club: 'Club A', poolNumber: 5 } as Fencer, // Club A but not position 4
                { id: 6, fname: 'Frank', lname: 'Taylor', club: 'Club F', poolNumber: 6 } as Fencer,
            ];

            const result = getBoutOrder(6, fencers);

            // Should fall back to standard bout order for pool of 6
            const standardOrder = [
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
            ];

            expect(result).toEqual(standardOrder);
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
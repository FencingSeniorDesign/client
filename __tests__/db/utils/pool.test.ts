// __tests__/db/utils/pool.test.ts
import { db } from '../../../src/db/DrizzleClient';
import { dbGetPoolsForRound, dbGetBoutsForPool } from '../../../src/db/utils/pool';
import * as schema from '../../../src/db/schema';
import * as roundAlgorithms from '../../../src/navigation/utils/RoundAlgorithms';

// Mock the dependencies
jest.mock('../../../src/db/DrizzleClient', () => ({
    db: {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        count: jest.fn().mockReturnThis(),
    },
}));

jest.mock('../../../src/navigation/utils/RoundAlgorithms', () => ({
    buildPools: jest.fn(),
}));

describe('Pool Utils', () => {
    // Mock console methods
    const consoleSpy = {
        log: jest.spyOn(console, 'log').mockImplementation(),
        error: jest.spyOn(console, 'error').mockImplementation(),
    };

    beforeEach(() => {
        // Clear mocks before each test
        jest.clearAllMocks();
    });

    afterAll(() => {
        // Restore console methods after all tests
        consoleSpy.log.mockRestore();
        consoleSpy.error.mockRestore();
    });

    describe('dbGetPoolsForRound', () => {
        it('returns empty array if no pools found', async () => {
            // Setup with a mock implementation that doesn't throw
            db.select = jest.fn().mockImplementation(() => ({
                from: jest.fn().mockReturnValue({
                    where: jest.fn().mockReturnValue({
                        groupBy: jest.fn().mockResolvedValue([]),
                    }),
                }),
            }));

            // Execute
            const result = await dbGetPoolsForRound(42);

            // Verify
            expect(result).toEqual([]);
            expect(consoleSpy.log).toHaveBeenCalledWith('Getting pool assignments for round 42');
        });

        it('returns pools with fencers when data is found', async () => {
            // Setup - First simulate the poolCounts query
            const mockPoolCounts = [
                { poolid: 0, count: 2 },
                { poolid: 1, count: 3 },
            ];

            // Then simulate the detailed fencers query
            const mockFencerResults = [
                {
                    poolid: 0,
                    poolposition: 1,
                    fencer: { id: 1, fname: 'John', lname: 'Smith' },
                    clubName: 'Test Fencing Club',
                    clubAbbr: 'TFC',
                },
                {
                    poolid: 0,
                    poolposition: 2,
                    fencer: { id: 2, fname: 'Jane', lname: 'Doe' },
                    clubName: 'Test Fencing Club',
                    clubAbbr: 'TFC',
                },
                {
                    poolid: 1,
                    poolposition: 1,
                    fencer: { id: 3, fname: 'Mike', lname: 'Johnson' },
                    clubName: 'Another Club',
                    clubAbbr: 'AC',
                },
                {
                    poolid: 1,
                    poolposition: 2,
                    fencer: { id: 4, fname: 'Sarah', lname: 'Williams' },
                    clubName: 'Another Club',
                    clubAbbr: 'AC',
                },
                {
                    poolid: 1,
                    poolposition: 3,
                    fencer: { id: 5, fname: 'David', lname: 'Brown' },
                    clubName: null,
                    clubAbbr: null,
                },
            ];

            // Create a counter to track which implementation to use
            let selectCallCount = 0;

            // Set up mock with implementation that switches based on call count
            db.select = jest.fn().mockImplementation(() => {
                selectCallCount++;

                if (selectCallCount === 1) {
                    // First call - pool counts
                    return {
                        from: jest.fn().mockReturnValue({
                            where: jest.fn().mockReturnValue({
                                groupBy: jest.fn().mockResolvedValue(mockPoolCounts),
                            }),
                        }),
                    };
                } else {
                    // Second call - fencer details
                    return {
                        from: jest.fn().mockReturnValue({
                            innerJoin: jest.fn().mockReturnValue({
                                leftJoin: jest.fn().mockReturnValue({
                                    where: jest.fn().mockReturnValue({
                                        orderBy: jest.fn().mockResolvedValue(mockFencerResults),
                                    }),
                                }),
                            }),
                        }),
                    };
                }
            });

            // Execute
            const result = await dbGetPoolsForRound(42);

            // Verify
            expect(result).toHaveLength(2);
            expect(result[0].poolid).toBe(0);
            expect(result[0].fencers).toHaveLength(2);
            expect(result[1].poolid).toBe(1);
            expect(result[1].fencers).toHaveLength(3);
            expect(result[1].fencers[2].clubName).toBe(''); // Testing null handling
        });

        it('handles database errors gracefully', async () => {
            // Setup with mock implementation that throws error
            db.select = jest.fn().mockImplementation(() => {
                throw new Error('Database error');
            });

            // Execute
            const result = await dbGetPoolsForRound(42);

            // Verify
            expect(result).toEqual([]);
            expect(consoleSpy.error).toHaveBeenCalledWith(
                'Error getting pools for round:',
                expect.objectContaining({ message: 'Database error' })
            );
        });
    });

    describe('dbGetBoutsForPool', () => {
        it('returns empty array if no bouts found', async () => {
            // Setup - Create a counter to track call order
            let selectCallCount = 0;

            // Mock with implementation that changes by call count
            db.select = jest.fn().mockImplementation(() => {
                selectCallCount++;

                if (selectCallCount === 1) {
                    // First call - pool fencers query
                    return {
                        from: jest.fn().mockReturnValue({
                            where: jest.fn().mockResolvedValue([{ count: 4 }]), // 4 fencers in pool
                        }),
                    };
                } else if (selectCallCount === 2) {
                    // Second call - simple bout count
                    return {
                        from: jest.fn().mockReturnValue({
                            where: jest.fn().mockResolvedValue([{ count: 0 }]), // 0 bouts total
                        }),
                    };
                } else if (selectCallCount === 3) {
                    // Third call - complex bouts query
                    return {
                        from: jest.fn().mockReturnValue({
                            innerJoin: jest.fn().mockReturnThis(),
                            leftJoin: jest.fn().mockReturnThis(),
                            where: jest.fn().mockResolvedValue([]), // No bouts found
                        }),
                    };
                } else {
                    // Fourth call - simple bouts query
                    return {
                        from: jest.fn().mockReturnValue({
                            where: jest.fn().mockReturnValue({
                                limit: jest.fn().mockResolvedValue([]), // No simple bouts found
                            }),
                        }),
                    };
                }
            });

            // Execute
            const result = await dbGetBoutsForPool(42, 1);

            // Verify
            expect(result).toEqual([]);
            expect(consoleSpy.log).toHaveBeenCalledWith('Getting bouts for pool 1 in round 42');
            expect(consoleSpy.log).toHaveBeenCalledWith('Pool 1 has 4 fencers assigned');
            expect(consoleSpy.log).toHaveBeenCalledWith('Round 42 has 0 bouts total');
            expect(consoleSpy.log).toHaveBeenCalledWith('Found 0 bouts for pool 1 in round 42');
            expect(consoleSpy.log).toHaveBeenCalledWith(
                'No bouts found with complex query, falling back to simpler query'
            );
            expect(consoleSpy.log).toHaveBeenCalledWith('Simple query found 0 bouts for this round');
        });

        it('returns bouts when data is found', async () => {
            // Setup - Mock bouts to return
            const mockBouts = [
                {
                    id: 1,
                    lfencer: 10,
                    rfencer: 11,
                    victor: 10,
                    left_fencerid: 10,
                    right_fencerid: 11,
                    left_poolposition: 1,
                    right_poolposition: 2,
                    left_fname: 'John',
                    left_lname: 'Smith',
                    right_fname: 'Jane',
                    right_lname: 'Doe',
                    left_score: 5,
                    right_score: 2,
                },
                {
                    id: 2,
                    lfencer: 10,
                    rfencer: 12,
                    victor: 10,
                    left_fencerid: 10,
                    right_fencerid: 12,
                    left_poolposition: 1,
                    right_poolposition: 3,
                    left_fname: 'John',
                    left_lname: 'Smith',
                    right_fname: 'Mike',
                    right_lname: 'Johnson',
                    left_score: 5,
                    right_score: 4,
                },
            ];

            // Setup counter for implementation
            let selectCallCount = 0;

            // Mock with implementation that changes by call count
            db.select = jest.fn().mockImplementation(() => {
                selectCallCount++;

                if (selectCallCount === 1) {
                    // First call - pool fencers query
                    return {
                        from: jest.fn().mockReturnValue({
                            where: jest.fn().mockResolvedValue([{ count: 4 }]), // 4 fencers in pool
                        }),
                    };
                } else if (selectCallCount === 2) {
                    // Second call - simple bout count
                    return {
                        from: jest.fn().mockReturnValue({
                            where: jest.fn().mockResolvedValue([{ count: 6 }]), // 6 bouts total
                        }),
                    };
                } else {
                    // Third call - complex bouts query
                    return {
                        from: jest.fn().mockReturnValue({
                            innerJoin: jest.fn().mockReturnThis(),
                            leftJoin: jest.fn().mockReturnThis(),
                            where: jest.fn().mockResolvedValue(mockBouts), // Return bouts
                        }),
                    };
                }
            });

            // Execute
            const result = await dbGetBoutsForPool(42, 1);

            // Verify
            expect(result).toEqual(mockBouts);
            expect(result).toHaveLength(2);
            expect(consoleSpy.log).toHaveBeenCalledWith('Found 2 bouts for pool 1 in round 42');
        });

        it('falls back to simple query if complex query returns no results', async () => {
            // Setup - Mock simple bouts result
            const mockSimpleBouts = [
                {
                    id: 1,
                    lfencer: 10,
                    rfencer: 11,
                    victor: 10,
                },
                {
                    id: 2,
                    lfencer: 10,
                    rfencer: 12,
                    victor: 10,
                },
            ];

            // Setup counter for implementation
            let selectCallCount = 0;

            // Mock with implementation that changes by call count
            db.select = jest.fn().mockImplementation(() => {
                selectCallCount++;

                if (selectCallCount === 1) {
                    // First call - pool fencers query
                    return {
                        from: jest.fn().mockReturnValue({
                            where: jest.fn().mockResolvedValue([{ count: 4 }]), // 4 fencers in pool
                        }),
                    };
                } else if (selectCallCount === 2) {
                    // Second call - simple bout count
                    return {
                        from: jest.fn().mockReturnValue({
                            where: jest.fn().mockResolvedValue([{ count: 6 }]), // 6 bouts total
                        }),
                    };
                } else if (selectCallCount === 3) {
                    // Third call - complex bouts query
                    return {
                        from: jest.fn().mockReturnValue({
                            innerJoin: jest.fn().mockReturnThis(),
                            leftJoin: jest.fn().mockReturnThis(),
                            where: jest.fn().mockResolvedValue([]), // No bouts with complex query
                        }),
                    };
                } else {
                    // Fourth call - simple bouts query
                    return {
                        from: jest.fn().mockReturnValue({
                            where: jest.fn().mockReturnValue({
                                limit: jest.fn().mockResolvedValue(mockSimpleBouts), // Simple bouts found
                            }),
                        }),
                    };
                }
            });

            // Execute
            const result = await dbGetBoutsForPool(42, 1);

            // Verify
            expect(result).toEqual([]); // Still returns empty array from complex query
            expect(consoleSpy.log).toHaveBeenCalledWith(
                'No bouts found with complex query, falling back to simpler query'
            );
            expect(consoleSpy.log).toHaveBeenCalledWith('Simple query found 2 bouts for this round');
            expect(consoleSpy.log).toHaveBeenCalledWith('Sample bout:', expect.any(String));
        });

        it('handles database errors gracefully', async () => {
            // Setup with mock implementation that throws error
            db.select = jest.fn().mockImplementation(() => {
                throw new Error('Database error');
            });

            // Execute
            const result = await dbGetBoutsForPool(42, 1);

            // Verify
            expect(result).toEqual([]);
            expect(consoleSpy.error).toHaveBeenCalledWith(
                'Error getting bouts for pool:',
                expect.objectContaining({ message: 'Database error' })
            );
        });
    });
});

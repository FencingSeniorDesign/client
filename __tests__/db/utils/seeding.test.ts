import {
    dbSaveSeeding,
    dbGetSeedingForRound,
    dbCalculateAndSaveSeedingFromRoundResults,
} from '../../../src/db/utils/seeding';
import { db } from '../../../src/db/DrizzleClient';
import * as schema from '../../../src/db/schema';
import * as seedingModule from '../../../src/db/utils/seeding';
import { dbGetPoolsForRound, dbGetBoutsForPool } from '../../../src/db/utils/pool';

// Mock RoundAlgorithms and pool functions.
jest.mock('../../../src/navigation/utils/RoundAlgorithms', () => ({
    calculateSeedingFromResults: jest.fn().mockReturnValue([{ fencer: { id: 1 }, seed: 1 }]),
}));
jest.mock('../../../src/db/utils/pool', () => ({
    dbGetPoolsForRound: jest.fn(),
    dbGetBoutsForPool: jest.fn(),
}));

/**
 * Helper functions for chainable mocks.
 */
function successfulDelete() {
    return { where: jest.fn().mockResolvedValue(undefined) };
}
function successfulInsert() {
    return { values: jest.fn().mockResolvedValue(undefined) };
}
function successfulSelect(result: any) {
    return {
        from: jest.fn().mockReturnValue({
            innerJoin: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnValue({
                    orderBy: jest.fn().mockResolvedValue(result),
                }),
            }),
        }),
    };
}

beforeEach(() => {
    jest.resetAllMocks();
    // Provide a dummy implementation for the database client's prepareSync method.
    (db as any).client = {
        prepareSync: jest.fn(() => ({})),
    };
});

describe('Alternative Seeding Functions Tests', () => {
    describe('dbSaveSeeding', () => {
        it('completes saving seeding if delete and insert succeed', async () => {
            // Set up successful deletion and insertion.
            (db.delete as jest.Mock) = jest.fn().mockReturnValue(successfulDelete());
            (db.insert as jest.Mock) = jest.fn().mockReturnValue(successfulInsert());

            const eventId = 101;
            const roundId = 11;
            const seeding = [{ fencer: { id: 1 }, seed: 1 }];

            await expect(dbSaveSeeding(eventId, roundId, seeding)).resolves.toBeUndefined();

            expect(db.delete).toHaveBeenCalledWith(schema.seedingFromRoundResults);
            expect(db.insert).toHaveBeenCalledWith(schema.seedingFromRoundResults);
        });

        it('throws an error if deletion fails', async () => {
            // Force an error in deletion.
            (db.delete as jest.Mock) = jest.fn().mockReturnValue({
                where: jest.fn().mockRejectedValue(new Error('Delete failed')),
            });
            const eventId = 101;
            const roundId = 11;
            const seeding = [{ fencer: { id: 1 }, seed: 1 }];

            await expect(dbSaveSeeding(eventId, roundId, seeding)).rejects.toThrow('Delete failed');
        });

        it('throws an error if insertion fails', async () => {
            // Deletion succeeds.
            (db.delete as jest.Mock) = jest.fn().mockReturnValue(successfulDelete());
            // Force insert failure.
            (db.insert as jest.Mock) = jest.fn().mockReturnValue({
                values: jest.fn().mockRejectedValue(new Error('Insert failed')),
            });
            const eventId = 101;
            const roundId = 11;
            const seeding = [{ fencer: { id: 1 }, seed: 1 }];

            await expect(dbSaveSeeding(eventId, roundId, seeding)).rejects.toThrow('Insert failed');
        });
    });

    describe('dbGetSeedingForRound', () => {
        it('returns formatted seeding data', async () => {
            const fakeRows = [
                {
                    seedingInfo: { seed: 1 },
                    fencer: {
                        id: 1,
                        fname: 'Test',
                        lname: 'User',
                        erating: 'X',
                        eyear: 1990,
                        frating: 'Y',
                        fyear: 1991,
                        srating: 'Z',
                        syear: 1992,
                    },
                },
            ];
            (db.select as jest.Mock) = jest.fn().mockReturnValue(successfulSelect(fakeRows));

            const result = await dbGetSeedingForRound(11);
            expect(result).toEqual([
                {
                    seed: 1,
                    fencer: {
                        id: 1,
                        fname: 'Test',
                        lname: 'User',
                        erating: 'X',
                        eyear: 1990,
                        frating: 'Y',
                        fyear: 1991,
                        srating: 'Z',
                        syear: 1992,
                    },
                },
            ]);
        });

        it('returns empty array if select fails', async () => {
            // Simulate error during select.
            (db.select as jest.Mock) = jest.fn().mockReturnValue({
                from: jest.fn().mockReturnValue({
                    innerJoin: jest.fn().mockReturnValue({
                        where: jest.fn().mockReturnValue({
                            orderBy: jest.fn().mockRejectedValue(new Error('Select error')),
                        }),
                    }),
                }),
            });
            const result = await dbGetSeedingForRound(11);
            expect(result).toEqual([]);
        });
    });

    describe('dbCalculateAndSaveSeedingFromRoundResults', () => {
        it('throws an error if pool retrieval fails', async () => {
            (dbGetPoolsForRound as jest.Mock).mockRejectedValue(new Error('Pool error'));
            await expect(dbCalculateAndSaveSeedingFromRoundResults(202, 22)).rejects.toThrow('Pool error');
        });
    });
});

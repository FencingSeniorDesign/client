// __tests__/db/utils/bout.test.ts
import {
    dbUpdateBoutScore,
    dbUpdateBoutScores,
    dbGetBoutsForRound,
    dbGetDEBouts,
    dbUpdateDEBoutAndAdvanceWinner,
} from '../../../src/db/utils/bout';
import { db } from '../../../src/db/DrizzleClient';
import * as schema from '../../../src/db/schema';
import { and, eq } from 'drizzle-orm';

// Mock the database client methods so we can intercept calls.
jest.mock('../../../src/db/DrizzleClient', () => ({
    db: {
        update: jest.fn(),
        select: jest.fn(),
    },
}));

// ------------------------- dbUpdateBoutScore -------------------------
describe('dbUpdateBoutScore', () => {
    it('updates a bout score successfully', async () => {
        const mockWhere = jest.fn().mockResolvedValue({});
        const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
        const mockUpdate = jest.fn().mockReturnValue({ set: mockSet });
        (db.update as jest.Mock) = mockUpdate;

        await dbUpdateBoutScore(42, 10, 5);

        expect(mockUpdate).toHaveBeenCalledWith(schema.fencerBouts);
        expect(mockSet).toHaveBeenCalledWith({ score: 5 });
        expect(mockWhere).toHaveBeenCalledWith(expect.objectContaining({ queryChunks: expect.any(Array) })); // Match query structure
    });

    it('throws error if database update fails', async () => {
        const err = new Error('Update failure');
        const mockWhere = jest.fn().mockRejectedValue(err);
        const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
        const mockUpdate = jest.fn().mockReturnValue({ set: mockSet });
        (db.update as jest.Mock) = mockUpdate;

        await expect(dbUpdateBoutScore(42, 10, 5)).rejects.toThrow(err);
    });
});

// ------------------------- dbUpdateBoutScores -------------------------
describe('dbUpdateBoutScores', () => {
    // Instead of spying on dbUpdateBoutScore (which your implementation may not invoke),
    // we now check calls to db.update directly.
    beforeEach(() => {
        // For victor update we provide a chain that resolves.
        (db.update as jest.Mock).mockReturnValue({
            set: jest.fn().mockReturnValue({
                where: jest.fn().mockResolvedValue({}),
            }),
        });
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('throws error if victor update fails', async () => {
        (db.update as jest.Mock).mockReturnValue({
            set: jest.fn().mockReturnValue({
                where: jest.fn().mockRejectedValue(new Error('Victor update failed')),
            }),
        });
        await expect(dbUpdateBoutScores(50, 3, 4, 100, 200, 100)).rejects.toThrow('Victor update failed');
    });

    it('updates both scores without updating victor if winnerId is not provided', async () => {
        await dbUpdateBoutScores(50, 3, 4, 100, 200);
        // In this case, no update call for victor should occur.
        expect(db.update).not.toHaveBeenCalledWith(schema.bouts);
    });

    it('updates both scores and victor when winnerId is provided', async () => {
        const mockUpdate = jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
                where: jest.fn().mockResolvedValue({}),
            }),
        });
        (db.update as jest.Mock) = mockUpdate;

        await dbUpdateBoutScores(50, 3, 4, 100, 200, 100);

        // Expect two calls for scores and one for victor
        expect(mockUpdate).toHaveBeenCalledTimes(3);
        expect(mockUpdate).toHaveBeenCalledWith(schema.bouts);
    });
});

// ------------------------- dbGetBoutsForRound -------------------------
describe('dbGetBoutsForRound', () => {
    it('returns empty array if round is not found', async () => {
        (db.select as jest.Mock).mockReturnValue({
            from: () => ({
                where: () => ({
                    limit: () => Promise.resolve([]),
                }),
            }),
        });
        const result = await dbGetBoutsForRound(999);
        expect(result).toEqual([]);
    });

    it('handles pool rounds and transforms nested structure', async () => {
        // First call: simulate round lookup returning type 'pool'
        (db.select as jest.Mock)
            .mockReturnValueOnce({
                from: () => ({
                    where: () => ({
                        limit: () => Promise.resolve([{ type: 'pool', deformat: null }]),
                    }),
                }),
            })
            // Second call: simulate the detailed query returning nested structure.
            .mockReturnValueOnce({
                from: () => ({
                    innerJoin: () => ({
                        innerJoin: () => ({
                            leftJoin: () => ({
                                leftJoin: () => ({
                                    leftJoin: () => ({
                                        leftJoin: () => ({
                                            where: () => ({
                                                orderBy: () =>
                                                    Promise.resolve([
                                                        {
                                                            bout: {
                                                                id: 1,
                                                                lfencer: 10,
                                                                rfencer: 20,
                                                                victor: null,
                                                                eventid: 100,
                                                                roundid: 50,
                                                            },
                                                            pool: { poolid: 5 },
                                                            leftFencer: { fname: 'John', lname: 'Doe' },
                                                            rightFencer: { fname: 'Jane', lname: 'Smith' },
                                                            scores: { left_score: 3, right_score: 2 },
                                                        },
                                                    ]),
                                            }),
                                        }),
                                    }),
                                }),
                            }),
                        }),
                    }),
                }),
            });
        const result = await dbGetBoutsForRound(50);
        expect(result).toEqual([
            {
                id: 1,
                lfencer: 10,
                rfencer: 20,
                victor: null,
                eventid: 100,
                roundid: 50,
                left_fname: 'John',
                left_lname: 'Doe',
                right_fname: 'Jane',
                right_lname: 'Smith',
                left_score: 3,
                right_score: 2,
                poolid: 5,
            },
        ]);
    });

    it('returns empty array for DE round with unsupported deformat', async () => {
        (db.select as jest.Mock).mockReturnValueOnce({
            from: () => ({
                where: () => ({
                    limit: () => Promise.resolve([{ type: 'de', deformat: 'double' }]),
                }),
            }),
        });
        const result = await dbGetBoutsForRound(70);
        expect(result).toEqual([]);
    });

    it('returns transformed pool round bouts', async () => {
        (db.select as jest.Mock)
            .mockReturnValueOnce({
                from: () => ({
                    where: () => ({
                        limit: () => Promise.resolve([{ type: 'pool', deformat: null }]),
                    }),
                }),
            })
            .mockReturnValueOnce({
                from: () => ({
                    innerJoin: () => ({
                        innerJoin: () => ({
                            leftJoin: () => ({
                                leftJoin: () => ({
                                    leftJoin: () => ({
                                        leftJoin: () => ({
                                            where: () => ({
                                                orderBy: () =>
                                                    Promise.resolve([
                                                        {
                                                            bout: {
                                                                id: 1,
                                                                lfencer: 10,
                                                                rfencer: 20,
                                                                victor: null,
                                                                eventid: 100,
                                                                roundid: 50,
                                                            },
                                                            pool: { poolid: 5 },
                                                            leftFencer: { fname: 'John', lname: 'Doe' },
                                                            rightFencer: { fname: 'Jane', lname: 'Smith' },
                                                            scores: { left_score: 3, right_score: 2 },
                                                        },
                                                    ]),
                                            }),
                                        }),
                                    }),
                                }),
                            }),
                        }),
                    }),
                }),
            });

        const result = await dbGetBoutsForRound(50);

        expect(result).toEqual([
            {
                id: 1,
                lfencer: 10,
                rfencer: 20,
                victor: null,
                eventid: 100,
                roundid: 50,
                left_fname: 'John',
                left_lname: 'Doe',
                right_fname: 'Jane',
                right_lname: 'Smith',
                left_score: 3,
                right_score: 2,
                poolid: 5,
            },
        ]);
    });
});

// ------------------------- dbUpdateDEBoutAndAdvanceWinner -------------------------
describe('dbUpdateDEBoutAndAdvanceWinner', () => {
    beforeEach(() => {
        // Spy on dbUpdateBoutScores so its internal logic is short-circuited.
        jest.spyOn(require('../../../src/db/utils/bout'), 'dbUpdateBoutScores').mockResolvedValue(undefined);
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('throws error if updating victor fails', async () => {
        (db.update as jest.Mock) = jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
                where: jest.fn().mockRejectedValue(new Error('Victor update failed')),
            }),
        });
        await expect(dbUpdateDEBoutAndAdvanceWinner(180, 9, 2, 103, 203)).rejects.toThrow('Victor update failed');
    });
});

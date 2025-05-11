import {
    dbMarkRoundAsComplete,
    dbGetRoundsForEvent,
    dbAddRound,
    dbUpdateRound,
    dbDeleteRound,
    dbMarkRoundAsStarted,
    dbGetRoundById,
    dbInitializeRound,
    dbGetDEFormat,
    dbGetDETableSize,
} from '../../../src/db/utils/round';
import { db } from '../../../src/db/DrizzleClient';
import * as schema from '../../../src/db/schema';
import type { Round, Event, Fencer } from '../../../src/navigation/navigation/types';

// Mock dependent functions so they simply resolve.
jest.mock('../../../src/db/utils/seeding', () => ({
    dbCalculateAndSaveSeedingFromRoundResults: jest.fn().mockResolvedValue(undefined),
    dbSaveSeeding: jest.fn().mockResolvedValue(undefined),
    dbGetSeedingForRound: jest.fn().mockResolvedValue([{ seed: 1 }]),
}));
jest.mock('../../../src/db/utils/pool', () => ({
    dbCreatePoolAssignmentsAndBoutOrders: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../src/db/utils/bracket', () => ({
    createDEBoutsForRound: jest.fn().mockResolvedValue(undefined),
}));

// Helper functions to simulate chainable db methods.
function createSelectChain(result: any) {
    return jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue(Promise.resolve(result)),
                orderBy: jest.fn().mockReturnValue(Promise.resolve(result)),
            }),
        }),
    });
}

function createUpdateChain() {
    return jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue(Promise.resolve(undefined)),
        }),
    });
}

function createDeleteChain() {
    return jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue(Promise.resolve(undefined)),
    });
}

function createInsertChain() {
    return jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue(Promise.resolve(undefined)),
    });
}

describe('Round DB Functions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('dbMarkRoundAsComplete', () => {
        it('marks round as complete when round exists', async () => {
            // Simulate a found round.
            (db.select as jest.Mock) = createSelectChain([{ id: 1, eventid: 100 }]);
            (db.update as jest.Mock) = createUpdateChain();

            // Should resolve.
            await expect(dbMarkRoundAsComplete(1)).resolves.toBeUndefined();
            expect(db.select).toHaveBeenCalled();
            expect(db.update).toHaveBeenCalledWith(schema.rounds);
        });

        it('throws an error when round is not found', async () => {
            (db.select as jest.Mock) = createSelectChain([]);
            await expect(dbMarkRoundAsComplete(999)).rejects.toThrow('Round with id 999 not found');
        });
    });

    describe('dbGetRoundsForEvent', () => {
        it('returns rounds for an event', async () => {
            const fakeRounds = [{ id: 1 }, { id: 2 }];
            (db.select as jest.Mock) = createSelectChain(fakeRounds);
            const rounds = await dbGetRoundsForEvent(100);
            expect(rounds).toEqual(fakeRounds);
        });
    });

    describe('dbAddRound', () => {
        it('inserts a new round', async () => {
            (db.insert as jest.Mock) = createInsertChain();
            const newRound = {
                eventid: 100,
                rorder: 1,
                type: 'pool' as const,
                promotionpercent: 50,
                targetbracket: 1,
                usetargetbracket: 1,
                deformat: 'single',
                detablesize: 8,
                iscomplete: 0,
                poolcount: 2,
                poolsize: 6,
                poolsoption: 'optionA',
            };
            await expect(dbAddRound(newRound)).resolves.toBeUndefined();
            expect(db.insert).toHaveBeenCalledWith(schema.rounds);
        });
    });

    describe('dbUpdateRound', () => {
        it('updates a round', async () => {
            (db.update as jest.Mock) = createUpdateChain();
            const roundUpdate: Round = {
                id: 1,
                rorder: 2,
                type: 'pool',
                promotionpercent: 60,
                targetbracket: 2,
                usetargetbracket: 1,
                deformat: 'single',
                detablesize: 8,
                iscomplete: 0,
                poolcount: 3,
                poolsize: 6,
                poolsoption: 'optionB',
            };
            await expect(dbUpdateRound(roundUpdate)).resolves.toBeUndefined();
            expect(db.update).toHaveBeenCalledWith(schema.rounds);
        });
    });

    describe('dbDeleteRound', () => {
        it('deletes a round', async () => {
            (db.delete as jest.Mock) = createDeleteChain();
            await expect(dbDeleteRound(1)).resolves.toBeUndefined();
            expect(db.delete).toHaveBeenCalledWith(schema.rounds);
        });
    });

    describe('dbMarkRoundAsStarted', () => {
        it('marks a round as started', async () => {
            (db.update as jest.Mock) = createUpdateChain();
            await expect(dbMarkRoundAsStarted(1)).resolves.toBeUndefined();
            expect(db.update).toHaveBeenCalledWith(schema.rounds);
        });
    });

    describe('dbGetRoundById', () => {
        it('returns the round when found', async () => {
            const fakeRound = { id: 1, eventid: 100 };
            (db.select as jest.Mock) = createSelectChain([fakeRound]);
            const round = await dbGetRoundById(1);
            expect(round).toEqual(fakeRound);
        });

        it('throws an error when round is not found', async () => {
            (db.select as jest.Mock) = createSelectChain([]);
            await expect(dbGetRoundById(999)).rejects.toThrow('Round with ID 999 not found');
        });
    });

    describe('dbInitializeRound', () => {
        const fakeEvent: Event = { id: 100 } as Event;
        const fakeRound: Round = {
            id: 1,
            rorder: 1,
            type: 'pool',
            promotionpercent: 50,
            targetbracket: 1,
            usetargetbracket: 1,
            deformat: 'single',
            detablesize: 8,
            iscomplete: 0,
            poolcount: 2,
            poolsize: 6,
            poolsoption: 'optionA',
        };
        const fakeFencers: Fencer[] = [{ id: 1 } as Fencer, { id: 2 } as Fencer];

        it('initializes a pool round (first round) with preliminary seeding', async () => {
            // For rorder 1, preliminary seeding is calculated.
            // Set up mocks for seeding already done in mocks above.
            (db.update as jest.Mock) = createUpdateChain();
            (db.select as jest.Mock) = createSelectChain([]); // Not used in first round path.
            await expect(dbInitializeRound(fakeEvent, fakeRound, fakeFencers)).resolves.toBeUndefined();
            expect(db.update).toHaveBeenCalled();
        });

        it('initializes a DE round', async () => {
            const deRound: Round = {
                ...fakeRound,
                id: 2,
                rorder: 2,
                type: 'de',
                deformat: 'single',
            };
            // For DE rounds, we expect an update for table size and then marking as started.
            (db.update as jest.Mock) = createUpdateChain();
            (db.select as jest.Mock) = createSelectChain([]);
            await expect(dbInitializeRound(fakeEvent, deRound, fakeFencers)).resolves.toBeUndefined();
            expect(db.update).toHaveBeenCalledWith(schema.rounds);
        });
    });

    describe('dbGetDEFormat', () => {
        it('returns the DE format for a round', async () => {
            const fakeFormat = { deformat: 'double' };
            (db.select as jest.Mock) = createSelectChain([fakeFormat]);
            const format = await dbGetDEFormat(1);
            expect(format).toBe('double');
        });

        it('defaults to single if not found (returns single instead of rejecting)', async () => {
            (db.select as jest.Mock) = createSelectChain([]);
            const format = await dbGetDEFormat(999);
            expect(format).toBe('single');
        });
    });

    describe('dbGetDETableSize', () => {
        it('returns the DE table size', async () => {
            const fakeResult = [{ detablesize: 16 }];
            (db.select as jest.Mock) = createSelectChain(fakeResult);
            const size = await dbGetDETableSize(1);
            expect(size).toBe(16);
        });
    });
});
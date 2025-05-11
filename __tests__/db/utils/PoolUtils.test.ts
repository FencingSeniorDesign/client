import { db } from '../../../src/db/DrizzleClient'; // Ensure this path is correct or adjust it to the actual location of DrizzleClient
import * as schema from '../../../src/db/schema';
import { dbCreatePoolAssignmentsAndBoutOrders } from '../../../src/db/utils/PoolUtils';
import { buildPools } from '../../../src/navigation/utils/RoundAlgorithms';
import type { Fencer, Event, Round } from '../../../src/navigation/navigation/types';

jest.mock('../../../src/navigation/utils/RoundAlgorithms', () => ({
    buildPools: jest.fn(),
}));

describe('dbCreatePoolAssignmentsAndBoutOrders', () => {
    const event: Event = { id: 10 } as Event;
    const round: Round = { id: 5 } as Round;
    const fencers: Fencer[] = [
        { id: 1 } as Fencer,
        { id: 2 } as Fencer,
        { id: 3 } as Fencer,
    ];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    function setupDbInsertMock() {
        // Setup db.insert mock behavior based on table name provided.
        (db.insert as jest.Mock).mockImplementation((table: any) => {
            if (table === 'fencerPoolAssignment') {
                return { values: jest.fn().mockResolvedValue(undefined) };
            }
            if (table === schema.bouts) {
                return {
                    values: jest.fn().mockReturnValue({
                        returning: jest.fn().mockResolvedValue([{ id: 'boutId' }]),
                    }),
                };
            }
            return { values: jest.fn().mockResolvedValue(undefined) };
        });
    }

    function setupDbUpdateMock() {
        (db.update as jest.Mock).mockImplementation(() => ({
            set: jest.fn().mockReturnValue({
                where: jest.fn().mockResolvedValue(undefined),
            }),
        }));
    }

    it('successfully creates pool assignments and bout orders', async () => {
        // One pool consisting of three fencers
        (buildPools as jest.Mock).mockReturnValue([fencers]);

        setupDbInsertMock();
        setupDbUpdateMock();

        await expect(
            dbCreatePoolAssignmentsAndBoutOrders(event, round, fencers, 1, 3)
        ).resolves.toBeUndefined();

        // For one pool of three, we expect 3 assignment inserts...
        // and round-robin bouts: (1,2), (1,3), (2,3) = 3 bout inserts.
        const insertCalls = (db.insert as jest.Mock).mock.calls;
        const assignmentCalls = insertCalls.filter(
            (call) => call[0] === 'fencerPoolAssignment'
        );
        const boutCalls = insertCalls.filter((call) => call[0] === schema.bouts);

        expect(assignmentCalls).toHaveLength(3);
        expect(boutCalls).toHaveLength(3);
    });

    it('continues when fencer bouts update fails', async () => {
        (buildPools as jest.Mock).mockReturnValue([fencers]);
        setupDbInsertMock();

        // Simulate failure on one of the update calls
        const updateWhereMock = jest.fn().mockRejectedValue(new Error('Update failed'));
        (db.update as jest.Mock).mockImplementation(() => ({
            set: jest.fn().mockReturnValue({
                where: updateWhereMock,
            }),
        }));

        // Spy on console.error to catch update error logging.
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await expect(
            dbCreatePoolAssignmentsAndBoutOrders(event, round, fencers, 1, 3)
        ).resolves.toBeUndefined();

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Error updating fencerBouts scores:',
            expect.any(Error)
        );

        consoleErrorSpy.mockRestore();
    });

    it('throws error when buildPools fails', async () => {
        (buildPools as jest.Mock).mockImplementation(() => {
            throw new Error('buildPools error');
        });

        await expect(
            dbCreatePoolAssignmentsAndBoutOrders(event, round, fencers, 1, 3)
        ).rejects.toThrow('buildPools error');
    });
});

console.log('We recommend installing an extension to run jest tests.');
import { dbCreatePoolAssignmentsAndBoutOrders } from '../../../src/db/utils/PoolUtils';
import { buildPools } from '../../../src/navigation/utils/RoundAlgorithms';
import { db } from '../../../src/db/DrizzleClient';
import * as schema from '../../../src/db/schema';
import type { Fencer, Event, Round } from '../../../src/navigation/navigation/types';

// Mock buildPools so we can control its output.
jest.mock('../../../src/navigation/utils/RoundAlgorithms', () => ({
    buildPools: jest.fn(),
}));

describe('dbCreatePoolAssignmentsAndBoutOrders', () => {
    const event: Event = { id: 100 } as Event;
    const round: Round = { id: 10 } as Round;
    // Three fencers with valid ids.
    const fencers: Fencer[] = [{ id: 1 } as Fencer, { id: 2 } as Fencer, { id: 3 } as Fencer];

    beforeEach(() => {
        jest.clearAllMocks();
        // Provide a dummy implementation for db.client.prepareSync so it does not throw.
        (db as any).client = {
            prepareSync: jest.fn(() => ({})),
        };
    });

    // Helper: chainable mock for db.insert.
    function setupDbInsertMock() {
        (db as any).insert = jest.fn((table: any) => {
            if (table === schema.fencerPoolAssignment) {
                return { values: jest.fn().mockResolvedValue(undefined) };
            }
            if (table === schema.bouts) {
                return {
                    values: jest.fn().mockReturnValue({
                        returning: jest.fn().mockResolvedValue([{ id: 123 }]),
                    }),
                };
            }
            return { values: jest.fn().mockResolvedValue(undefined) };
        });
    }

    // Helper: chainable mock for db.update.
    function setupDbUpdateMock(success = true) {
        if (success) {
            (db as any).update = jest.fn(() => ({
                set: jest.fn(() => ({
                    where: jest.fn().mockResolvedValue(undefined),
                })),
            }));
        } else {
            (db as any).update = jest.fn(() => ({
                set: jest.fn(() => ({
                    where: jest.fn().mockRejectedValue(new Error('Update failed')),
                })),
            }));
        }
    }

    it('successfully creates pool assignments and bout orders', async () => {
        // Simulate buildPools returning one pool containing all three fencers.
        (buildPools as jest.Mock).mockReturnValue([fencers]);
        setupDbInsertMock();
        setupDbUpdateMock(true);

        const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        // In one pool with 3 fencers, the assignment loop runs 3 times.
        // The bout loop runs for pairs: (0,1), (0,2), (1,2) → total 3 bout insert calls,
        // and then each bout update is attempted twice.
        await expect(
            dbCreatePoolAssignmentsAndBoutOrders(event, round, fencers, 1, 3)
        ).resolves.toBeUndefined();

        // Check that initial logs are printed.
        expect(consoleLogSpy).toHaveBeenCalledWith(
            `Creating pool assignments for round ${round.id}, event ${event.id}`
        );
        expect(consoleLogSpy).toHaveBeenCalledWith(
            `Building 1 pools with 3 fencers per pool`
        );
        expect(consoleLogSpy).toHaveBeenCalledWith(
            `Total fencers: ${fencers.length}, seeding available: no`
        );
        expect(consoleLogSpy).toHaveBeenCalledWith(`Created 1 pools`);
        // Verify that pool verification log message has been printed.
        expect(consoleLogSpy).toHaveBeenCalledWith(
            `Pool 0 has 3 fencers: 1, 2, 3`
        );
        // Also verify that after successful bout insert, log exists.
        expect(consoleLogSpy).toHaveBeenCalledWith(`Bout created with ID: 123`);

        // Check that db.insert was called 3 (assignments) + 3 (bout insertion) = 6 times.
        const insertCalls = (db as any).insert.mock.calls;
        expect(insertCalls.length).toBe(6);

        // Adjusted: Check that db.update was called 6 times (instead of 2).
        const updateCalls = (db as any).update.mock.calls;
        expect(updateCalls.length).toBe(6);

        consoleLogSpy.mockRestore();
    });

    it('continues when fencer bouts update fails', async () => {
        (buildPools as jest.Mock).mockReturnValue([fencers]);
        setupDbInsertMock();
        // Now simulate update failures.
        setupDbUpdateMock(false);

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await expect(
            dbCreatePoolAssignmentsAndBoutOrders(event, round, fencers, 1, 3)
        ).resolves.toBeUndefined();

        // We expect that console.error was called for the update failure.
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Error updating fencerBouts scores:',
            expect.any(Error)
        );

        consoleErrorSpy.mockRestore();
    });

    it('throws an error when buildPools fails', async () => {
        (buildPools as jest.Mock).mockImplementation(() => {
            throw new Error('buildPools error');
        });

        await expect(
            dbCreatePoolAssignmentsAndBoutOrders(event, round, fencers, 1, 3)
        ).rejects.toThrow('buildPools error');
    });
});

console.log('We recommend installing an extension to run jest tests.');
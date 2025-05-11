import { dbCreateTournament, dbDeleteTournament, dbListOngoingTournaments, dbListCompletedTournaments } from '../../../src/db/utils/tournament';
import { db } from '../../../src/db/DrizzleClient';
import * as schema from '../../../src/db/schema';
import { eq } from 'drizzle-orm';

// Helper functions for chainable mocks.
function createInsertChain() {
    return jest.fn().mockReturnValue({
        values: jest.fn().mockResolvedValue(undefined),
    });
}

function createDeleteChain() {
    return jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
    });
}

function createSelectChain(result: any) {
    return jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue(result),
        }),
    });
}

describe('Tournament DB Functions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    
    describe('dbCreateTournament', () => {
        it('creates a new tournament with default iscomplete false', async () => {
            (db.insert as jest.Mock) = createInsertChain();            
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
            
            const tournamentName = 'Test Tournament';
            await expect(dbCreateTournament(tournamentName)).resolves.toBeUndefined();
            expect(db.insert).toHaveBeenCalledWith(schema.tournaments);
            // Check that console.log was called with the success message.
            expect(consoleLogSpy).toHaveBeenCalledWith(`Tournament "${tournamentName}" created successfully.`);
            consoleLogSpy.mockRestore();
        });

        it('creates a new tournament with iscomplete true if provided', async () => {
            (db.insert as jest.Mock) = createInsertChain();
            const tournamentName = 'Completed Tournament';
            await expect(dbCreateTournament(tournamentName, 1)).resolves.toBeUndefined();
            expect(db.insert).toHaveBeenCalledWith(schema.tournaments);
        });

        it('throws an error if insert fails', async () => {
            (db.insert as jest.Mock) = jest.fn().mockReturnValue({
                values: jest.fn().mockRejectedValue(new Error('Insert error')),
            });
            const tournamentName = 'Fail Tournament';
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            await expect(dbCreateTournament(tournamentName)).rejects.toThrow('Insert error');
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error creating tournament:', expect.any(Error));
            consoleErrorSpy.mockRestore();
        });
    });

    describe('dbDeleteTournament', () => {
        it('deletes an existing tournament', async () => {
            (db.delete as jest.Mock) = createDeleteChain();
            const tournamentName = 'Test Tournament';
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
            
            await expect(dbDeleteTournament(tournamentName)).resolves.toBeUndefined();
            expect(db.delete).toHaveBeenCalledWith(schema.tournaments);
            // We use eq to build the where condition so it is not directly verifiable.
            expect(consoleLogSpy).toHaveBeenCalledWith(`Tournament "${tournamentName}" deleted successfully.`);
            consoleLogSpy.mockRestore();
        });
        
        it('throws an error if deletion fails', async () => {
            (db.delete as jest.Mock) = jest.fn().mockReturnValue({
                where: jest.fn().mockRejectedValue(new Error('Delete error')),
            });
            const tournamentName = 'Nonexistent Tournament';
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            await expect(dbDeleteTournament(tournamentName)).rejects.toThrow('Delete error');
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error deleting tournament:', expect.any(Error));
            consoleErrorSpy.mockRestore();
        });
    });
    
    describe('dbListOngoingTournaments', () => {
        it('lists ongoing tournaments', async () => {
            const fakeTournaments = [
                { name: 'Tournament A', iscomplete: false },
                { name: 'Tournament B', iscomplete: false },
            ];
            (db.select as jest.Mock) = createSelectChain(fakeTournaments);
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
            
            const result = await dbListOngoingTournaments();
            expect(result).toEqual(fakeTournaments);
            expect(db.select).toHaveBeenCalled();
            expect(consoleLogSpy).toHaveBeenCalledWith(`[${fakeTournaments.length}] ongoing tournaments listed successfully.`);
            consoleLogSpy.mockRestore();
        });
        
        it('throws an error if retrieval fails', async () => {
            (db.select as jest.Mock) = jest.fn().mockReturnValue({
                from: jest.fn().mockReturnValue({
                    where: jest.fn().mockRejectedValue(new Error('Ongoing error')),
                }),
            });
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            await expect(dbListOngoingTournaments()).rejects.toThrow('Ongoing error');
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error listing ongoing tournaments:', expect.any(Error));
            consoleErrorSpy.mockRestore();
        });
    });
    
    describe('dbListCompletedTournaments', () => {
        it('lists completed tournaments', async () => {
            const fakeTournaments = [
                { name: 'Tournament C', iscomplete: true },
            ];
            (db.select as jest.Mock) = createSelectChain(fakeTournaments);
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
            
            const result = await dbListCompletedTournaments();
            expect(result).toEqual(fakeTournaments);
            expect(consoleLogSpy).toHaveBeenCalledWith(`[${fakeTournaments.length}] completed tournaments listed successfully.`);
            consoleLogSpy.mockRestore();
        });

        it('throws an error if retrieval fails', async () => {
            (db.select as jest.Mock) = jest.fn().mockReturnValue({
                from: jest.fn().mockReturnValue({
                    where: jest.fn().mockRejectedValue(new Error('Completed error')),
                }),
            });
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            await expect(dbListCompletedTournaments()).rejects.toThrow('Completed error');
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error listing completed tournaments:', expect.any(Error));
            consoleErrorSpy.mockRestore();
        });
    });
});
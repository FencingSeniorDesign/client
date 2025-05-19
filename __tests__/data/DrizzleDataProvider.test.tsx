// __tests__/data/DrizzleDataProvider.test.tsx
import tournamentDataProvider from '../../src/data/DrizzleDataProvider';
import * as db from '../../src/db/DrizzleDatabaseUtils';
import tournamentClient from '../../src/networking/TournamentClient';
import { Event, Fencer } from '../../src/navigation/navigation/types';

jest.mock('../../src/db/DrizzleDatabaseUtils');
jest.mock('../../src/networking/TournamentClient', () => ({
    isConnected: jest.fn(),
    sendMessage: jest.fn(),
    waitForResponse: jest.fn(),
}));

describe('TournamentDataProvider', () => {
    describe('listOngoingTournaments', () => {
        it('returns tournaments from local DB when not connected remotely', async () => {
            (tournamentClient.isConnected as jest.Mock).mockReturnValue(false);
            const mockData = [{ id: 1, name: 'Mock Tournament' }];
            (db.dbListOngoingTournaments as jest.Mock).mockResolvedValue(mockData);

            const result = await tournamentDataProvider.listOngoingTournaments();
            expect(result).toEqual(mockData);
        });

        it('returns empty array when connected remotely', async () => {
            (tournamentClient.isConnected as jest.Mock).mockReturnValue(true);
            const result = await tournamentDataProvider.listOngoingTournaments();
            expect(result).toEqual([]);
        });
    });

    describe('getEvents', () => {
        const tournamentName = 'MockTournament';

        it('fetches events from local DB when not connected remotely', async () => {
            (tournamentClient.isConnected as jest.Mock).mockReturnValue(false);
            const events = [{ id: 101, name: 'Local Event' }];
            (db.dbListEvents as jest.Mock).mockResolvedValue(events);

            const result = await tournamentDataProvider.getEvents(tournamentName);
            expect(result).toEqual(events);
        });

        it('fetches events from remote server when connected remotely', async () => {
            (tournamentClient.isConnected as jest.Mock).mockReturnValue(true);
            (tournamentClient.waitForResponse as jest.Mock).mockResolvedValue({
                events: [{ id: 202, name: 'Remote Event' }],
            });

            const result = await tournamentDataProvider.getEvents(tournamentName);
            expect(result).toEqual([{ id: 202, name: 'Remote Event' }]);
        });

        it('returns empty array when remote response is invalid', async () => {
            (tournamentClient.isConnected as jest.Mock).mockReturnValue(true);
            (tournamentClient.waitForResponse as jest.Mock).mockResolvedValue(null);

            const result = await tournamentDataProvider.getEvents(tournamentName);
            expect(result).toEqual([]);
        });
    });

    describe('getFencers', () => {
        const mockEvent: Event = {
            id: 5,
            rounds: [],
            fencers: [],
            weapon: '',
            gender: '',
            age: '',
            class: '',
            seeding: '',
        };

        it('fetches fencers from local DB when not connected remotely', async () => {
            (tournamentClient.isConnected as jest.Mock).mockReturnValue(false);
            const fencers: Fencer[] = [
                {
                    id: 1,
                    fname: 'Alice',
                    lname: '',
                    erating: '',
                    eyear: 0,
                    frating: '',
                    fyear: 0,
                    srating: '',
                    syear: 0,
                },
            ];
            (db.dbGetFencersInEventById as jest.Mock).mockResolvedValue(fencers);

            const result = await tournamentDataProvider.getFencers(mockEvent);
            expect(result).toEqual(fencers);
        });

        it('fetches fencers from remote server when connected remotely', async () => {
            (tournamentClient.isConnected as jest.Mock).mockReturnValue(true);
            (tournamentClient.waitForResponse as jest.Mock).mockResolvedValue({
                fencers: [{ id: 2, name: 'Bob' }],
            });

            const result = await tournamentDataProvider.getFencers(mockEvent);
            expect(result).toEqual([{ id: 2, name: 'Bob' }]);
        });
    });
});

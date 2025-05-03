// __tests__/networking/MessageTypes.test.ts
import {
    validateMessage,
    isJoinRequestMessage,
    isGetEventsMessage,
    isWelcomeMessage,
    isJoinResponseMessage,
    isEventsListMessage,
    isTournamentDataMessage,
    isServerClosingMessage,
    isTournamentBroadcastMessage,
    isPoolsListMessage,
    isPoolBoutsListMessage,
    UserRole,
} from '../../src/networking/MessageTypes';

describe('MessageTypes', () => {
    describe('validateMessage', () => {
        it('returns true for valid messages', () => {
            // Valid message with type
            const validMessage = { type: 'test_type' };
            expect(validateMessage(validMessage)).toBe(true);

            // Valid message with additional properties
            const validMessageWithProps = {
                type: 'test_type',
                data: 'some data',
                timestamp: '2023-01-01T00:00:00Z',
            };
            expect(validateMessage(validMessageWithProps)).toBe(true);
        });

        it('returns false for invalid messages', () => {
            // Null message
            expect(validateMessage(null)).toBe(false);

            // Undefined message
            expect(validateMessage(undefined)).toBe(false);

            // Not an object
            expect(validateMessage('string')).toBe(false);
            expect(validateMessage(123)).toBe(false);

            // Object without type
            expect(validateMessage({})).toBe(false);

            // Object with non-string type
            expect(validateMessage({ type: 123 })).toBe(false);
        });
    });

    describe('isJoinRequestMessage', () => {
        it('returns true for valid join request messages', () => {
            const validJoinRequest = {
                type: 'join_request',
                clientId: 'client123',
                deviceId: 'ABC12',
                tournamentName: 'Test Tournament',
                role: UserRole.REFEREE,
            };

            expect(isJoinRequestMessage(validJoinRequest)).toBe(true);

            // Minimal valid join request
            const minimalJoinRequest = {
                type: 'join_request',
            };

            expect(isJoinRequestMessage(minimalJoinRequest)).toBe(true);
        });

        it('returns false for invalid join request messages', () => {
            // Wrong type
            expect(isJoinRequestMessage({ type: 'not_join_request' })).toBe(false);

            // Not a message at all
            expect(isJoinRequestMessage(null)).toBe(false);
            expect(isJoinRequestMessage(123)).toBe(false);
        });
    });

    describe('isGetEventsMessage', () => {
        it('returns true for valid get events messages', () => {
            const validGetEvents = {
                type: 'get_events',
                tournamentName: 'Test Tournament',
            };

            expect(isGetEventsMessage(validGetEvents)).toBe(true);
        });

        it('returns false for invalid get events messages', () => {
            // Wrong type
            expect(isGetEventsMessage({ type: 'not_get_events', tournamentName: 'Test' })).toBe(false);

            // Missing tournamentName
            expect(isGetEventsMessage({ type: 'get_events' })).toBe(false);

            // tournamentName is not a string
            expect(isGetEventsMessage({ type: 'get_events', tournamentName: 123 })).toBe(false);

            // Not a message at all
            expect(isGetEventsMessage(null)).toBe(false);
        });
    });

    describe('isWelcomeMessage', () => {
        it('returns true for valid welcome messages', () => {
            const validWelcome = {
                type: 'welcome',
                tournamentName: 'Test Tournament',
            };

            expect(isWelcomeMessage(validWelcome)).toBe(true);

            // With optional fields
            const welcomeWithVersion = {
                type: 'welcome',
                tournamentName: 'Test Tournament',
                serverVersion: '1.0.0',
            };

            expect(isWelcomeMessage(welcomeWithVersion)).toBe(true);
        });

        it('returns false for invalid welcome messages', () => {
            // Wrong type
            expect(isWelcomeMessage({ type: 'not_welcome', tournamentName: 'Test' })).toBe(false);

            // Missing tournamentName
            expect(isWelcomeMessage({ type: 'welcome' })).toBe(false);

            // tournamentName is not a string
            expect(isWelcomeMessage({ type: 'welcome', tournamentName: 123 })).toBe(false);

            // Not a message at all
            expect(isWelcomeMessage(null)).toBe(false);
        });
    });

    describe('isJoinResponseMessage', () => {
        it('returns true for valid join response messages', () => {
            const validResponse = {
                type: 'join_response',
                success: true,
                message: 'Successfully joined',
            };

            expect(isJoinResponseMessage(validResponse)).toBe(true);

            // With optional fields
            const responseWithOptionals = {
                type: 'join_response',
                success: false,
                message: 'Failed to join',
                tournamentName: 'Test Tournament',
                role: UserRole.SPECTATOR,
                permissions: ['view_events', 'view_pools'],
            };

            expect(isJoinResponseMessage(responseWithOptionals)).toBe(true);
        });

        it('returns false for invalid join response messages', () => {
            // Wrong type
            expect(isJoinResponseMessage({ type: 'not_join_response', success: true, message: 'Test' })).toBe(false);

            // Missing success
            expect(isJoinResponseMessage({ type: 'join_response', message: 'Test' })).toBe(false);

            // Missing message
            expect(isJoinResponseMessage({ type: 'join_response', success: true })).toBe(false);

            // success is not a boolean
            expect(isJoinResponseMessage({ type: 'join_response', success: 'yes', message: 'Test' })).toBe(false);

            // Not a message at all
            expect(isJoinResponseMessage(null)).toBe(false);
        });
    });

    describe('isEventsListMessage', () => {
        it('returns true for valid events list messages', () => {
            const validEventsList = {
                type: 'events_list',
                tournamentName: 'Test Tournament',
                events: [],
            };

            expect(isEventsListMessage(validEventsList)).toBe(true);

            // With events
            const eventsListWithEvents = {
                type: 'events_list',
                tournamentName: 'Test Tournament',
                events: [
                    { id: 1, name: 'Event 1' },
                    { id: 2, name: 'Event 2' },
                ],
            };

            expect(isEventsListMessage(eventsListWithEvents)).toBe(true);

            // With error
            const eventsListWithError = {
                type: 'events_list',
                tournamentName: 'Test Tournament',
                events: [],
                error: 'Failed to fetch events',
            };

            expect(isEventsListMessage(eventsListWithError)).toBe(true);
        });

        it('returns false for invalid events list messages', () => {
            // Wrong type
            expect(isEventsListMessage({ type: 'not_events_list', tournamentName: 'Test', events: [] })).toBe(false);

            // Missing tournamentName
            expect(isEventsListMessage({ type: 'events_list', events: [] })).toBe(false);

            // Missing events
            expect(isEventsListMessage({ type: 'events_list', tournamentName: 'Test' })).toBe(false);

            // events is not an array
            expect(isEventsListMessage({ type: 'events_list', tournamentName: 'Test', events: 'not an array' })).toBe(
                false
            );

            // Not a message at all
            expect(isEventsListMessage(null)).toBe(false);
        });
    });

    describe('isTournamentDataMessage', () => {
        it('returns true for valid tournament data messages', () => {
            const validTournamentData = {
                type: 'tournament_data',
                tournamentData: {
                    tournamentName: 'Test Tournament',
                    events: [],
                    lastUpdated: 1630000000000,
                },
            };

            expect(isTournamentDataMessage(validTournamentData)).toBe(true);
        });

        it('returns false for invalid tournament data messages', () => {
            // Wrong type
            expect(isTournamentDataMessage({ type: 'not_tournament_data', tournamentData: {} })).toBe(false);

            // Missing tournamentData
            expect(isTournamentDataMessage({ type: 'tournament_data' })).toBe(false);

            // tournamentData is not an object
            expect(isTournamentDataMessage({ type: 'tournament_data', tournamentData: 'not an object' })).toBe(false);

            // Not a message at all
            expect(isTournamentDataMessage(null)).toBe(false);
        });
    });

    describe('isServerClosingMessage', () => {
        it('returns true for valid server closing messages', () => {
            const validServerClosing = {
                type: 'server_closing',
                message: 'Server is shutting down',
            };

            expect(isServerClosingMessage(validServerClosing)).toBe(true);
        });

        it('returns false for invalid server closing messages', () => {
            // Wrong type
            expect(isServerClosingMessage({ type: 'not_server_closing' })).toBe(false);

            // Not a message at all
            expect(isServerClosingMessage(null)).toBe(false);
        });
    });

    describe('isTournamentBroadcastMessage', () => {
        it('returns true for valid tournament broadcast messages', () => {
            const validBroadcast = {
                type: 'tournament_broadcast',
                tournamentName: 'Test Tournament',
                hostIp: '192.168.1.100',
                port: 9001,
                timestamp: 1630000000000,
            };

            expect(isTournamentBroadcastMessage(validBroadcast)).toBe(true);
        });

        it('returns false for invalid tournament broadcast messages', () => {
            // Wrong type
            expect(
                isTournamentBroadcastMessage({
                    type: 'not_tournament_broadcast',
                    tournamentName: 'Test Tournament',
                    hostIp: '192.168.1.100',
                    port: 9001,
                    timestamp: 1630000000000,
                })
            ).toBe(false);

            // Missing tournamentName
            expect(
                isTournamentBroadcastMessage({
                    type: 'tournament_broadcast',
                    hostIp: '192.168.1.100',
                    port: 9001,
                    timestamp: 1630000000000,
                })
            ).toBe(false);

            // Missing hostIp
            expect(
                isTournamentBroadcastMessage({
                    type: 'tournament_broadcast',
                    tournamentName: 'Test Tournament',
                    port: 9001,
                    timestamp: 1630000000000,
                })
            ).toBe(false);

            // Missing port
            expect(
                isTournamentBroadcastMessage({
                    type: 'tournament_broadcast',
                    tournamentName: 'Test Tournament',
                    hostIp: '192.168.1.100',
                    timestamp: 1630000000000,
                })
            ).toBe(false);

            // tournamentName is not a string
            expect(
                isTournamentBroadcastMessage({
                    type: 'tournament_broadcast',
                    tournamentName: 123,
                    hostIp: '192.168.1.100',
                    port: 9001,
                    timestamp: 1630000000000,
                })
            ).toBe(false);

            // hostIp is not a string
            expect(
                isTournamentBroadcastMessage({
                    type: 'tournament_broadcast',
                    tournamentName: 'Test Tournament',
                    hostIp: 123,
                    port: 9001,
                    timestamp: 1630000000000,
                })
            ).toBe(false);

            // port is not a number
            expect(
                isTournamentBroadcastMessage({
                    type: 'tournament_broadcast',
                    tournamentName: 'Test Tournament',
                    hostIp: '192.168.1.100',
                    port: '9001',
                    timestamp: 1630000000000,
                })
            ).toBe(false);

            // Not a message at all
            expect(isTournamentBroadcastMessage(null)).toBe(false);
        });
    });

    describe('isPoolsListMessage', () => {
        it('returns true for valid pools list messages', () => {
            const validPoolsList = {
                type: 'pools_list',
                roundId: 1,
                pools: [],
            };

            expect(isPoolsListMessage(validPoolsList)).toBe(true);

            // With pools
            const poolsListWithPools = {
                type: 'pools_list',
                roundId: 1,
                pools: [
                    { id: 1, name: 'Pool 1' },
                    { id: 2, name: 'Pool 2' },
                ],
            };

            expect(isPoolsListMessage(poolsListWithPools)).toBe(true);

            // With error
            const poolsListWithError = {
                type: 'pools_list',
                roundId: 1,
                pools: [],
                error: 'Failed to fetch pools',
            };

            expect(isPoolsListMessage(poolsListWithError)).toBe(true);
        });

        it('returns false for invalid pools list messages', () => {
            // Wrong type
            expect(isPoolsListMessage({ type: 'not_pools_list', roundId: 1, pools: [] })).toBe(false);

            // Missing roundId
            expect(isPoolsListMessage({ type: 'pools_list', pools: [] })).toBe(false);

            // Missing pools
            expect(isPoolsListMessage({ type: 'pools_list', roundId: 1 })).toBe(false);

            // roundId is not a number
            expect(isPoolsListMessage({ type: 'pools_list', roundId: '1', pools: [] })).toBe(false);

            // pools is not an array
            expect(isPoolsListMessage({ type: 'pools_list', roundId: 1, pools: 'not an array' })).toBe(false);

            // Not a message at all
            expect(isPoolsListMessage(null)).toBe(false);
        });
    });

    describe('isPoolBoutsListMessage', () => {
        it('returns true for valid pool bouts list messages', () => {
            const validPoolBoutsList = {
                type: 'pool_bouts_list',
                roundId: 1,
                poolId: 2,
                bouts: [],
            };

            expect(isPoolBoutsListMessage(validPoolBoutsList)).toBe(true);

            // With bouts
            const boutsListWithBouts = {
                type: 'pool_bouts_list',
                roundId: 1,
                poolId: 2,
                bouts: [
                    { id: 1, fencerA: 'A', fencerB: 'B' },
                    { id: 2, fencerA: 'C', fencerB: 'D' },
                ],
            };

            expect(isPoolBoutsListMessage(boutsListWithBouts)).toBe(true);

            // With error
            const boutsListWithError = {
                type: 'pool_bouts_list',
                roundId: 1,
                poolId: 2,
                bouts: [],
                error: 'Failed to fetch bouts',
            };

            expect(isPoolBoutsListMessage(boutsListWithError)).toBe(true);
        });

        it('returns false for invalid pool bouts list messages', () => {
            // Wrong type
            expect(isPoolBoutsListMessage({ type: 'not_pool_bouts_list', roundId: 1, poolId: 2, bouts: [] })).toBe(
                false
            );

            // Missing roundId
            expect(isPoolBoutsListMessage({ type: 'pool_bouts_list', poolId: 2, bouts: [] })).toBe(false);

            // Missing poolId
            expect(isPoolBoutsListMessage({ type: 'pool_bouts_list', roundId: 1, bouts: [] })).toBe(false);

            // Missing bouts
            expect(isPoolBoutsListMessage({ type: 'pool_bouts_list', roundId: 1, poolId: 2 })).toBe(false);

            // roundId is not a number
            expect(isPoolBoutsListMessage({ type: 'pool_bouts_list', roundId: '1', poolId: 2, bouts: [] })).toBe(false);

            // poolId is not a number
            expect(isPoolBoutsListMessage({ type: 'pool_bouts_list', roundId: 1, poolId: '2', bouts: [] })).toBe(false);

            // bouts is not an array
            expect(
                isPoolBoutsListMessage({ type: 'pool_bouts_list', roundId: 1, poolId: 2, bouts: 'not an array' })
            ).toBe(false);

            // Not a message at all
            expect(isPoolBoutsListMessage(null)).toBe(false);
        });
    });
});

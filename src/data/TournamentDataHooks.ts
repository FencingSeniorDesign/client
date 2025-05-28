// src/data/TournamentDataHooks.ts
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query'; // Added useQueries import
import { Event, Fencer, Round, Official, PoolData } from '../navigation/navigation/types'; // Added PoolData import
import dataProvider from './DrizzleDataProvider';
import tournamentClient from '../networking/TournamentClient';

// Define query keys for consistent cache management
export const queryKeys = {
    tournaments: ['tournaments'] as const,
    ongoingTournaments: ['tournaments', 'ongoing'] as const,
    completedTournaments: ['tournaments', 'completed'] as const,
    tournament: (name: string) => ['tournament', name] as const,
    events: (tournamentName: string) => ['events', tournamentName] as const,
    event: (eventId: number) => ['event', eventId] as const,
    eventStatus: (eventId: number) => ['eventStatus', eventId] as const,
    eventStatuses: ['eventStatuses'] as const,
    fencers: (eventId: number) => ['fencers', eventId] as const,
    teams: (eventId: number) => ['teams', eventId] as const,
    rounds: (eventId: number) => ['rounds', eventId] as const,
    round: (roundId: number) => ['round', roundId] as const,
    roundStarted: (roundId: number) => ['round', roundId, 'started'] as const,
    roundCompleted: (roundId: number) => ['round', roundId, 'completed'] as const,
    pools: (roundId: number) => ['pools', roundId] as const,
    boutsForPool: (roundId: number, poolId: number) => ['bouts', 'pool', roundId, poolId] as const,
    bouts: (roundId: number) => ['bouts', roundId] as const,
    fencerSearch: (query: string) => ['fencerSearch', query] as const,
    clubs: ['clubs'] as const,
    clubSearch: (query: string) => ['clubSearch', query] as const,
    officials: (tournamentName: string) => ['officials', tournamentName] as const,
    referees: (tournamentName: string) => ['referees', tournamentName] as const,
    userRole: (deviceId: string, eventId: number) => ['userRole', deviceId, eventId] as const,
};

// ===== READ HOOKS =====

/**
 * Hook to get list of ongoing tournaments
 */
export function useOngoingTournaments() {
    return useQuery({
        queryKey: queryKeys.ongoingTournaments,
        queryFn: () => dataProvider.listOngoingTournaments(),
        staleTime: 60000, // 1 minute
    });
}

/**
 * Hook to get list of completed tournaments
 */
export function useCompletedTournaments() {
    return useQuery({
        queryKey: queryKeys.completedTournaments,
        queryFn: () => dataProvider.listCompletedTournaments(),
        staleTime: 60000, // 1 minute
    });
}

/**
 * Hook to get events for a tournament
 */
export function useEvents(tournamentName: string) {
    return useQuery({
        queryKey: queryKeys.events(tournamentName),
        queryFn: () => dataProvider.getEvents(tournamentName),
        enabled: !!tournamentName,
        // Set appropriate caching and refetch strategies
        staleTime: dataProvider.isRemoteConnection() ? 30000 : 60000, // 30 seconds for remote, 1 minute for local
        refetchInterval: dataProvider.isRemoteConnection() ? 30000 : false, // Less frequent polling for remote connections
    });
}

/**
 * Hook to get rounds for an event
 */
export function useRounds(eventId: number) {
    return useQuery({
        queryKey: queryKeys.rounds(eventId),
        queryFn: () => dataProvider.getRounds(eventId),
        enabled: !!eventId,
        staleTime: dataProvider.isRemoteConnection() ? 10000 : 60000,
    });
}

/**
 * Hook to check if a specific round is started
 */
export function useRoundStarted(roundId: number) {
    return useQuery({
        queryKey: queryKeys.roundStarted(roundId),
        queryFn: () => dataProvider.getRoundById(roundId), // Fetch the full round
        enabled: !!roundId,
        staleTime: dataProvider.isRemoteConnection() ? 5000 : 30000,
        select: roundDetails => !!roundDetails?.isstarted, // Select only the boolean status
    });
}

/**
 * Hook to check if a specific round is completed
 */
export function useRoundCompleted(roundId: number) {
    return useQuery({
        queryKey: queryKeys.roundCompleted(roundId),
        queryFn: () => {
            console.log(`Fetching completion status for round ID ${roundId}`);
            return dataProvider.getRoundById(roundId);
        }, // Fetch the full round
        enabled: !!roundId,
        staleTime: 0, // Don't cache this at all - always refetch when requested
        cacheTime: 0, // Don't keep old data in cache
        refetchOnMount: true, // Always refetch when the component mounts
        refetchOnWindowFocus: true, // Refetch when the window regains focus
        refetchInterval: 3000, // Poll every 3 seconds to pick up changes
        // Note: iscomplete is still number in Round type, needs boolean conversion
        select: roundDetails => {
            console.log(`Round details for ${roundId}:`, roundDetails);
            // Check for both numeric and boolean true values since the DB might return either
            const isComplete = roundDetails?.iscomplete === true || roundDetails?.iscomplete === 1;
            console.log(`Round ${roundId} completion status: ${isComplete}`);
            return isComplete;
        }, // Select only the boolean status
    });
}

/**
 * Hook to get fencers for an event
 */
export function useFencers(event: Event) {
    return useQuery({
        queryKey: queryKeys.fencers(event?.id),
        queryFn: () => dataProvider.getFencers(event),
        enabled: !!event?.id,
        staleTime: dataProvider.isRemoteConnection() ? 10000 : 60000,
    });
}

/**
 * Hook to get teams for an event
 */
export function useTeams(eventId: number) {
    return useQuery({
        queryKey: queryKeys.teams(eventId),
        queryFn: () => dataProvider.getEventTeams(eventId),
        enabled: !!eventId,
        staleTime: dataProvider.isRemoteConnection() ? 10000 : 60000,
    });
}

/**
 * Hook to get statuses for all events
 */
export function useEventStatuses(events: Event[]) {
    const queryClient = useQueryClient();

    // Extract just the event IDs for the query key
    const eventIds = React.useMemo(
        () => (Array.isArray(events) ? events.map(e => e?.id).filter(Boolean) : []),
        [events]
    );

    return useQuery({
        queryKey: queryKeys.eventStatuses,
        queryFn: async () => {
            if (!events || !Array.isArray(events) || events.length === 0) {
                return {};
            }

            const statuses: { [key: number]: boolean } = {};

            // Process each event to determine its status
            await Promise.all(
                events.map(async event => {
                    if (event?.id) {
                        try {
                            statuses[event.id] = await dataProvider.getEventStatus(event);
                        } catch (error) {
                            console.error(`Error getting status for event ${event.id}:`, error);
                            statuses[event.id] = false;
                        }
                    }
                })
            );

            return statuses;
        },
        enabled: Array.isArray(events) && events.length > 0,
        staleTime: dataProvider.isRemoteConnection() ? 5000 : 30000,
        refetchInterval: dataProvider.isRemoteConnection() ? 5000 : false,
    });
}

/**
 * Hook to search for fencers
 */
export function useSearchFencers(query: string) {
    return useQuery({
        queryKey: queryKeys.fencerSearch(query),
        queryFn: () => dataProvider.searchFencers(query),
        enabled: query.trim().length > 0,
        staleTime: 30000,
    });
}

/**
 * Hook to search for clubs
 */
export function useSearchClubs(query: string) {
    return useQuery({
        queryKey: queryKeys.clubSearch(query),
        queryFn: () => dataProvider.searchClubs(query),
        enabled: query.trim().length > 0,
        staleTime: 30000,
    });
}

/**
 * Hook to create a new club
 */
export function useCreateClub() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (club: { name: string; abbreviation?: string }) => {
            return dataProvider.createClub(club);
        },
        onSuccess: () => {
            // Invalidate club-related queries
            queryClient.invalidateQueries({ queryKey: queryKeys.clubs });
        },
    });
}

/**
 * Hook to get pools for a round
 */
export function usePools(roundId: number) {
    return useQuery({
        queryKey: queryKeys.pools(roundId),
        queryFn: () => dataProvider.getPools(roundId),
        enabled: !!roundId,
        staleTime: dataProvider.isRemoteConnection() ? 10000 : 60000,
    });
}

/**
 * Hook to get bouts for a pool
 */
export function useBoutsForPool(roundId: number, poolId: number) {
    return useQuery({
        queryKey: queryKeys.boutsForPool(roundId, poolId),
        queryFn: () => {
            console.log(
                `Fetching bouts for pool ${poolId} in round ${roundId}, isRemote: ${dataProvider.isRemoteConnection()}`
            );
            return dataProvider.getBoutsForPool(roundId, poolId);
        },
        enabled: !!roundId && poolId !== undefined,
        staleTime: dataProvider.isRemoteConnection() ? 5000 : 30000,
        // Add refetchInterval for remote connections to ensure data stays fresh
        refetchInterval: dataProvider.isRemoteConnection() ? 5000 : false,
    });
}

// ===== MUTATION HOOKS =====

/**
 * Hook to add a fencer to an event
 */
export function useAddFencer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ fencer, event }: { fencer: Fencer; event: Event }) => {
            return dataProvider.addFencer(fencer, event);
        },
        onSuccess: (_, { event }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.fencers(event.id) });
        },
    });
}

/**
 * Hook to create a new fencer
 */
export function useCreateFencer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ fencer, event, addToEvent = true }: { fencer: Fencer; event: Event; addToEvent?: boolean }) => {
            return dataProvider.createFencer(fencer, event, addToEvent);
        },
        onSuccess: (_, { event }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.fencers(event.id) });
        },
    });
}

/**
 * Hook to remove a fencer from an event
 */
export function useRemoveFencer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ fencer, event }: { fencer: Fencer; event: Event }) => {
            return dataProvider.removeFencer(fencer, event);
        },
        onSuccess: (_, { event }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.fencers(event.id) });
        },
    });
}

/**
 * Hook to create a new event
 */
export function useCreateEvent() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ tournamentName, event }: { tournamentName: string; event: Event }) => {
            return dataProvider.createEvent(tournamentName, event);
        },
        onSuccess: (_, { tournamentName }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.events(tournamentName) });
        },
    });
}

/**
 * Hook to delete an event
 */
export function useDeleteEvent() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (eventId: number) => {
            return dataProvider.deleteEvent(eventId);
        },
        onSuccess: () => {
            // Since we don't know the tournament name here, invalidate all events queries
            queryClient.invalidateQueries({ queryKey: ['events'] });
        },
    });
}

/**
 * Hook to add a round to an event
 */
export function useAddRound() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (round: Partial<Round>) => {
            return dataProvider.addRound(round);
        },
        onSuccess: (_, variables) => {
            if (variables.eventid) {
                queryClient.invalidateQueries({ queryKey: queryKeys.rounds(variables.eventid) });
                queryClient.invalidateQueries({ queryKey: queryKeys.eventStatuses });
            }
        },
    });
}

/**
 * Hook to update a round
 */
export function useUpdateRound() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (round: Round) => {
            return dataProvider.updateRound(round);
        },
        onSuccess: (_, variables) => {
            if (variables.eventid) {
                queryClient.invalidateQueries({ queryKey: queryKeys.rounds(variables.eventid) });
                queryClient.invalidateQueries({ queryKey: queryKeys.eventStatuses });
            }
        },
    });
}

/**
 * Hook to delete a round
 */
export function useDeleteRound() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ roundId, eventId }: { roundId: number; eventId: number }) => {
            return dataProvider.deleteRound(roundId);
        },
        onSuccess: (_, { eventId }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.rounds(eventId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.eventStatuses });
        },
    });
}

/**
 * Hook to initialize a round
 */
export function useInitializeRound() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ eventId, roundId }: { eventId: number; roundId: number }) => {
            return dataProvider.initializeRound(eventId, roundId);
        },
        onSuccess: (_, { eventId }) => {
            // When a round is initialized, we need to update both rounds and event statuses

            // First invalidate the rounds to refetch them
            queryClient.invalidateQueries({ queryKey: queryKeys.rounds(eventId) });

            // Directly update the event status in the cache - this ensures immediate UI update
            const currentStatuses = queryClient.getQueryData(queryKeys.eventStatuses) || {};
            queryClient.setQueryData(queryKeys.eventStatuses, {
                ...currentStatuses,
                [eventId]: true, // Set this event as started
            });

            // After directly updating, also invalidate to ensure eventual consistency
            queryClient.invalidateQueries({ queryKey: queryKeys.eventStatuses });
        },
    });
}

/**
 * Hook to complete a round
 */
export function useCompleteRound() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ roundId, eventId }: { roundId: number; eventId: number }) => {
            return dataProvider.completeRound(roundId);
        },
        onSuccess: (_, { roundId, eventId }) => {
            console.log(`Round ${roundId} successfully completed, invalidating queries`);

            // Invalidate specific round completion status
            queryClient.invalidateQueries({ queryKey: queryKeys.roundCompleted(roundId) });

            // Invalidate the specific round data
            queryClient.invalidateQueries({ queryKey: queryKeys.round(roundId) });

            // Invalidate all rounds for this event
            queryClient.invalidateQueries({ queryKey: queryKeys.rounds(eventId) });

            // Invalidate event statuses
            queryClient.invalidateQueries({ queryKey: queryKeys.eventStatuses });

            // Also invalidate any pool or bout data that might exist for this event
            queryClient.invalidateQueries({ queryKey: ['pools'] });
            queryClient.invalidateQueries({ queryKey: ['bouts'] });
        },
    });
}

/**
 * Custom hook to handle round results data processing
 */
export function useRoundResultsData(roundId: number, eventId: number, currentRoundIndex: number) {
    // Fetch pools data for the round
    const { data: poolsData, isLoading: poolsLoading, isError: poolsError } = usePools(roundId);

    // Fetch rounds data for the event
    const { data: roundsData, isLoading: roundsLoading, isError: roundsError } = useRounds(eventId);

    // Create a map of pool IDs to their bout data
    const poolIds = React.useMemo(() => poolsData?.map(pool => pool.poolid) || [], [poolsData]);

    // Use useQueries to fetch bouts for all pools dynamically
    const boutQueries = useQueries({
        queries: poolIds.map(poolId => ({
            queryKey: queryKeys.boutsForPool(roundId, poolId),
            queryFn: () => dataProvider.getBoutsForPool(roundId, poolId),
            enabled: !!roundId && poolId !== undefined,
            staleTime: dataProvider.isRemoteConnection() ? 5000 : 30000,
            // refetchInterval could be added here if needed per pool, but might be excessive
        })),
    });

    // Aggregate loading and error states from bout queries
    const isBoutsLoading = boutQueries.some(query => query.isLoading);
    const isBoutsError = boutQueries.some(query => query.isError);

    // Reconstruct boutsData map from successful queries
    const boutsData = React.useMemo(() => {
        const data: Record<number, any[]> = {};
        boutQueries.forEach((query, index) => {
            if (query.isSuccess) {
                const poolId = poolIds[index]; // Get corresponding poolId
                data[poolId] = query.data || [];
            }
        });
        return data;
    }, [boutQueries, poolIds]); // Fixed closing bracket

    // Process data to calculate pool results when all data is available
    const poolResults = React.useMemo(() => {
        // Don't calculate if data is still loading or has errors
        if (!poolsData || isBoutsLoading || poolsError || isBoutsError) {
            return [];
        }

        interface FencerStats {
            fencer: Fencer; // Use the imported Fencer type
            boutsCount: number;
            wins: number;
            touchesScored: number;
            touchesReceived: number;
            winRate: number;
            indicator: number;
        }

        interface PoolResult {
            poolid: number;
            stats: FencerStats[];
            bouts: any[]; // Include bouts in results
        }

        const results: PoolResult[] = [];

        // Process each pool
        for (const pool of poolsData as PoolData[]) {
            // Explicitly type 'pool'
            const statsMap = new Map<number, FencerStats>();

            // Initialize fencer stats
            pool.fencers.forEach(fencer => {
                if (fencer.id !== undefined) {
                    statsMap.set(fencer.id, {
                        fencer,
                        boutsCount: 0,
                        wins: 0,
                        touchesScored: 0,
                        touchesReceived: 0,
                        winRate: 0,
                        indicator: 0,
                    });
                }
            });

            // Get bouts for this pool from our state
            const bouts = boutsData[pool.poolid] || [];

            // Process bout data for this pool
            bouts.forEach((bout: any) => {
                const leftId = bout.left_fencerid;
                const rightId = bout.right_fencerid;
                const leftScore = bout.left_score ?? 0;
                const rightScore = bout.right_score ?? 0;

                if (statsMap.has(leftId)) {
                    const leftStats = statsMap.get(leftId)!;
                    leftStats.boutsCount += 1;
                    leftStats.touchesScored += leftScore;
                    leftStats.touchesReceived += rightScore;
                    if (leftScore > rightScore) {
                        leftStats.wins += 1;
                    }
                }
                if (statsMap.has(rightId)) {
                    const rightStats = statsMap.get(rightId)!;
                    rightStats.boutsCount += 1;
                    rightStats.touchesScored += rightScore;
                    rightStats.touchesReceived += leftScore;
                    if (rightScore > leftScore) {
                        rightStats.wins += 1;
                    }
                }
            });

            // Calculate final stats and sort
            const stats: FencerStats[] = [];
            statsMap.forEach(stat => {
                stat.winRate = stat.boutsCount > 0 ? (stat.wins / stat.boutsCount) * 100 : 0;
                stat.indicator = stat.touchesScored - stat.touchesReceived;
                stats.push(stat);
            });
            stats.sort((a, b) => b.winRate - a.winRate);

            // Add results for this pool including bout data
            results.push({
                poolid: pool.poolid,
                stats,
                bouts, // Include the bout data directly in the results
            });
        }

        return results;
    }, [poolsData, boutsData, isBoutsLoading, poolsError, isBoutsError]);

    // Process round data to determine next round information
    const nextRoundInfo = React.useMemo(() => {
        if (!roundsData || roundsLoading || roundsError) {
            return {
                nextRound: null,
                hasNextRound: false,
                nextRoundStarted: false,
            };
        }

        const nextRoundIndex = currentRoundIndex + 1;

        if (nextRoundIndex < roundsData.length) {
            const nextRound = roundsData[nextRoundIndex];
            return {
                nextRound,
                hasNextRound: true,
                nextRoundStarted: nextRound.isstarted, // Directly use the boolean value
            };
        }

        return {
            nextRound: null,
            hasNextRound: false,
            nextRoundStarted: false,
        };
    }, [roundsData, roundsLoading, roundsError, currentRoundIndex]);

    // Prepare an event object
    const event = React.useMemo(() => {
        return { id: eventId } as any;
    }, [eventId]);

    // Overall loading state
    const isLoading = poolsLoading || roundsLoading || isBoutsLoading;

    // Overall error state
    const isError = poolsError || roundsError || isBoutsError;

    return {
        poolResults,
        event,
        nextRoundInfo,
        isLoading,
        isError,
    };
}

export function useUpdatePoolBoutScores() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            boutId,
            scoreA,
            scoreB,
            fencerAId,
            fencerBId,
            roundId,
            poolId,
            winnerId,
        }: {
            boutId: number;
            scoreA: number;
            scoreB: number;
            fencerAId: number;
            fencerBId: number;
            roundId?: number;
            poolId?: number;
            winnerId: number;
        }) => {
            // Pass roundId and poolId to data provider for targeted cache invalidation
            return dataProvider.updatePoolBoutScores(
                boutId,
                scoreA,
                scoreB,
                fencerAId,
                fencerBId,
                roundId,
                poolId,
                winnerId
            );
        },
        onSuccess: (result, variables) => {
            console.log(`useUpdatePoolBoutScores onSuccess with result:`, result);
            const { roundId, poolId } = variables;

            // Client-side cache invalidation - the server will handle server-side invalidation
            // This ensures the client UI refreshes correctly

            // If we know the round and pool, do a targeted invalidation
            if (roundId !== undefined && poolId !== undefined) {
                console.log(`Client-side targeted invalidation for pool ${poolId} in round ${roundId}`);
                queryClient.invalidateQueries({
                    queryKey: queryKeys.boutsForPool(roundId, poolId),
                });

                queryClient.invalidateQueries({
                    queryKey: queryKeys.pools(roundId),
                });
            } else {
                // Otherwise do broader invalidation
                console.log(`Client-side broad invalidation of all bout queries after score update`);
                queryClient.invalidateQueries({
                    queryKey: ['bouts'],
                });

                console.log(`Client-side invalidation of all pool queries after score update`);
                queryClient.invalidateQueries({
                    queryKey: ['pools'],
                });
            }
        },
        // Also handle errors more gracefully
        onError: error => {
            console.error(`Error in useUpdatePoolBoutScores:`, error);
        },
    });
}

// Setup sync between remote server and local cache
export function setupTournamentSync(queryClient: any) {
    // Handle events_list updates
    tournamentClient.on('events_list', (data: any) => {
        if (data.tournamentName && Array.isArray(data.events)) {
            queryClient.setQueryData(queryKeys.events(data.tournamentName), data.events);

            // Update rounds cache for each event if rounds are embedded
            data.events.forEach((event: any) => {
                if (event?.id && Array.isArray(event.rounds)) {
                    queryClient.setQueryData(queryKeys.rounds(event.id), event.rounds);
                }
            });

            // Force a refresh of event statuses
            queryClient.invalidateQueries({ queryKey: queryKeys.eventStatuses });
        }
    });

    // Handle fencer updates
    tournamentClient.on('fencer_added', (data: any) => {
        if (data.eventId) {
            queryClient.invalidateQueries({
                queryKey: queryKeys.fencers(data.eventId),
            });
        }
    });

    tournamentClient.on('fencer_removed', (data: any) => {
        if (data.eventId) {
            queryClient.invalidateQueries({
                queryKey: queryKeys.fencers(data.eventId),
            });
        }
    });

    // Handle event updates
    tournamentClient.on('event_created', (data: any) => {
        if (data.tournamentName) {
            queryClient.invalidateQueries({
                queryKey: queryKeys.events(data.tournamentName),
            });
        }
    });

    tournamentClient.on('event_deleted', (data: any) => {
        // Invalidate all events queries since we don't know the tournament name
        queryClient.invalidateQueries({ queryKey: ['events'] });
    });

    // Handle event status updates
    tournamentClient.on('event_statuses', (data: any) => {
        if (data?.statuses) {
            // Merge with current statuses
            const currentStatuses = queryClient.getQueryData(queryKeys.eventStatuses) || {};
            queryClient.setQueryData(queryKeys.eventStatuses, { ...currentStatuses, ...data.statuses });
        }
    });

    // Handle rounds updates
    tournamentClient.on('rounds_list', (data: any) => {
        if (data?.eventId && Array.isArray(data.rounds)) {
            // Update rounds cache
            queryClient.setQueryData(queryKeys.rounds(data.eventId), data.rounds);

            // Update event status if needed
            if (data.rounds.length > 0) {
                const isStarted = data.rounds[0].isstarted;
                // Corrected boolean check for isStarted
                const isStartedBool = !!isStarted;

                const currentStatuses = queryClient.getQueryData(queryKeys.eventStatuses) || {};
                queryClient.setQueryData(queryKeys.eventStatuses, {
                    ...currentStatuses,
                    [data.eventId]: isStartedBool,
                });
            }
        }
    });

    // Handle round completion
    tournamentClient.on('round_completed', (data: any) => {
        if (data?.roundId) {
            console.log(`Client received round_completed for round ${data.roundId}`);
            // Find the affected queries in the cache
            const queriesData = queryClient.getQueriesData({ queryKey: ['rounds'] });
            for (const [queryKey, queryData] of queriesData) {
                if (Array.isArray(queryData)) {
                    // This is likely a rounds list
                    const eventId = queryKey[1]; // From the query key format ['rounds', eventId]
                    if (eventId) {
                        console.log(`Invalidating rounds and related data for event ${eventId}`);
                        queryClient.invalidateQueries({ queryKey: queryKeys.rounds(eventId as number) }); // Ensure eventId is number
                        // Also invalidate pools and bouts that might be affected
                        queryClient.invalidateQueries({ queryKey: ['pools'] });
                        queryClient.invalidateQueries({ queryKey: ['bouts'] });
                    }
                }
            }
        }
    });

    // Handle round completion broadcast (for other clients)
    tournamentClient.on('round_completed_broadcast', (data: any) => {
        if (data?.roundId) {
            console.log(`Client received round_completed_broadcast for round ${data.roundId}`);
            // Invalidate all rounds, pools, and bouts data
            queryClient.invalidateQueries({ queryKey: ['rounds'] });
            queryClient.invalidateQueries({ queryKey: ['pools'] });
            queryClient.invalidateQueries({ queryKey: ['bouts'] });
        }
    });

    // Handle fencers updates
    tournamentClient.on('fencers_list', (data: any) => {
        if (data?.eventId && Array.isArray(data.fencers)) {
            console.log(`Received ${data.fencers.length} fencers for event ${data.eventId}`);
            // Update fencers cache
            queryClient.setQueryData(queryKeys.fencers(data.eventId), data.fencers);
        }
    });

    // Handle pools updates
    tournamentClient.on('pools_list', (data: any) => {
        if (data?.roundId && Array.isArray(data.pools)) {
            console.log(`Received ${data.pools.length} pools for round ${data.roundId}`);
            // Update pools cache
            queryClient.setQueryData(queryKeys.pools(data.roundId), data.pools);
        }
    });

    // Handle pool bouts updates
    tournamentClient.on('pool_bouts_list', (data: any) => {
        if (data?.roundId && data?.poolId && Array.isArray(data.bouts)) {
            console.log(`Received ${data.bouts.length} bouts for pool ${data.poolId}`);
            // Update pool bouts cache
            queryClient.setQueryData(queryKeys.boutsForPool(data.roundId, data.poolId), data.bouts);
        }
    });

    // Handle bout score updates
    tournamentClient.on('bout_score_updated', (data: any) => {
        if (data?.boutId) {
            console.log(`Received score update for bout ${data.boutId}: ${data.scoreA}-${data.scoreB}`);

            // If roundId and poolId are available, do targeted invalidation
            if (data.roundId !== undefined && data.poolId !== undefined) {
                console.log(`Targeted invalidation for pool ${data.poolId} in round ${data.roundId}`);
                queryClient.invalidateQueries({
                    queryKey: queryKeys.boutsForPool(data.roundId, data.poolId),
                });

                queryClient.invalidateQueries({
                    queryKey: queryKeys.pools(data.roundId),
                });
            } else {
                // Otherwise, do broader invalidation
                console.log(`Invalidating all bout-related queries to refresh UI`);
                queryClient.invalidateQueries({ queryKey: ['bouts'] });

                console.log(`Invalidating all pool queries to refresh UI`);
                queryClient.invalidateQueries({ queryKey: ['pools'] });
            }
        }
    });

    // Handle bout scores updated confirmation
    tournamentClient.on('bout_scores_updated', (data: any) => {
        if (data?.boutId) {
            console.log(`Bout ${data.boutId} scores updated confirmation received:`, data);

            // Even though mutation should handle this, let's be extra safe and invalidate here too
            if (data.success) {
                // If roundId and poolId are available, do targeted invalidation
                if (data.roundId !== undefined && data.poolId !== undefined) {
                    console.log(
                        `bout_scores_updated: Targeted invalidation for pool ${data.poolId} in round ${data.roundId}`
                    );
                    queryClient.invalidateQueries({
                        queryKey: queryKeys.boutsForPool(data.roundId, data.poolId),
                    });

                    queryClient.invalidateQueries({
                        queryKey: queryKeys.pools(data.roundId),
                    });
                } else {
                    // Otherwise do broader invalidation
                    console.log(`bout_scores_updated: Invalidating all bout and pool queries to refresh UI`);
                    queryClient.invalidateQueries({ queryKey: ['bouts'] });
                    queryClient.invalidateQueries({ queryKey: ['pools'] });
                }
            }
        }
    });

    // Handle individual round updates
    tournamentClient.on('round_added', (data: any) => {
        if (data.eventId) {
            queryClient.invalidateQueries({
                queryKey: queryKeys.rounds(data.eventId),
            });
            queryClient.invalidateQueries({ queryKey: queryKeys.eventStatuses });
        }
    });

    tournamentClient.on('round_updated', (data: any) => {
        if (data.eventId) {
            queryClient.invalidateQueries({
                queryKey: queryKeys.rounds(data.eventId),
            });
            queryClient.invalidateQueries({ queryKey: queryKeys.eventStatuses });
        }
    });

    tournamentClient.on('round_deleted', (data: any) => {
        if (data.eventId) {
            queryClient.invalidateQueries({
                queryKey: queryKeys.rounds(data.eventId),
            });
            queryClient.invalidateQueries({ queryKey: queryKeys.eventStatuses });
        }
    });
}

/**
 * Hook to get officials for a tournament
 */
export function useOfficials(tournamentName: string) {
    return useQuery({
        queryKey: queryKeys.officials(tournamentName),
        queryFn: () => dataProvider.getOfficials(tournamentName),
        enabled: !!tournamentName,
        staleTime: 60000,
    });
}

/**
 * Hook to get referees for a tournament
 */
export function useReferees(tournamentName: string) {
    return useQuery({
        queryKey: queryKeys.referees(tournamentName),
        queryFn: () => dataProvider.getReferees(tournamentName),
        enabled: !!tournamentName,
        staleTime: 60000,
    });
}

/**
 * Hook to check user role by device ID
 */
export function useUserRole(deviceId: string, eventId: number) {
    return useQuery({
        queryKey: queryKeys.userRole(deviceId, eventId),
        queryFn: () => dataProvider.checkUserRole(deviceId, eventId),
        enabled: !!deviceId && !!eventId,
        staleTime: 300000, // Roles don't change often
    });
}

/**
 * Hook to add an official
 */
export function useAddOfficial() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ official, tournamentName }: { official: Official; tournamentName: string }) => {
            return dataProvider.addOfficial(official);
        },
        onSuccess: (result, variables) => {
            const { tournamentName } = variables;
            queryClient.invalidateQueries({
                queryKey: queryKeys.officials(tournamentName),
            });
        },
    });
}

/**
 * Hook to add a referee
 */
export function useAddReferee() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ referee, tournamentName }: { referee: Official; tournamentName: string }) => {
            return dataProvider.addReferee(referee);
        },
        onSuccess: (result, variables) => {
            const { tournamentName } = variables;
            queryClient.invalidateQueries({
                queryKey: queryKeys.referees(tournamentName),
            });
        },
    });
}

/**
 * Hook to remove a referee
 */
export function useRemoveReferee() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ refereeId, tournamentName }: { refereeId: number; tournamentName: string }) => {
            return dataProvider.removeReferee(refereeId);
        },
        onSuccess: (result, variables) => {
            const { tournamentName } = variables;
            queryClient.invalidateQueries({
                queryKey: queryKeys.referees(tournamentName),
            });
        },
    });
}

/**
 * Hook to remove an official
 */
export function useRemoveOfficial() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ officialId, tournamentName }: { officialId: number; tournamentName: string }) => {
            return dataProvider.removeOfficial(officialId);
        },
        onSuccess: (result, variables) => {
            const { tournamentName } = variables;
            queryClient.invalidateQueries({
                queryKey: queryKeys.officials(tournamentName),
            });
        },
    });
}

/**
 * Hook to update an official
 */
export function useUpdateOfficial() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ official, tournamentName }: { official: Official; tournamentName: string }) => {
            return dataProvider.updateOfficial(official);
        },
        onSuccess: (result, variables) => {
            const { tournamentName } = variables;
            queryClient.invalidateQueries({
                queryKey: queryKeys.officials(tournamentName),
            });
        },
    });
}

/**
 * Hook to update a referee
 */
export function useUpdateReferee() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ referee, tournamentName }: { referee: Official; tournamentName: string }) => {
            return dataProvider.updateReferee(referee);
        },
        onSuccess: (result, variables) => {
            const { tournamentName } = variables;
            queryClient.invalidateQueries({
                queryKey: queryKeys.referees(tournamentName),
            });
        },
    });
}

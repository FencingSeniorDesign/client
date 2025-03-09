// src/hooks/useTournamentQueries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Event, Tournament, Fencer, Round } from '../navigation/navigation/types';
import {
    dbListEvents,
    dbGetFencersInEventById,
    dbGetRoundsForEvent,
    dbAddFencerToEventById,
    dbCreateEvent
} from '../db/TournamentDatabaseUtils';
import tournamentClient from '../networking/TournamentClient';
import tournamentServer from '../networking/TournamentServer';

// Key factory for consistent query keys
const keys = {
    tournaments: ['tournaments'] as const,
    tournament: (name: string) => ['tournament', name] as const,
    events: (tournamentName: string) => ['events', tournamentName] as const,
    event: (eventId: number) => ['event', eventId] as const,
    fencers: (eventId: number) => ['fencers', eventId] as const,
    rounds: (eventId: number) => ['rounds', eventId] as const,
};

// Check if we're connected to a remote tournament
const isRemoteConnection = () => {
    return tournamentClient.isConnected();
};

// Get events for a tournament (works for both local and remote)
export function useEvents(tournamentName: string) {
    const queryClient = useQueryClient();

    return useQuery({
        queryKey: keys.events(tournamentName),
        queryFn: async () => {
            // For remote connections, fetch from server
            if (isRemoteConnection()) {
                try {
                    // Request events from server
                    tournamentClient.sendMessage({
                        type: 'get_events',
                        tournamentName
                    });

                    // This is a promise that will resolve when the server responds
                    const response = await tournamentClient.waitForResponse('events_list');
                    
                    // Ensure events is always an array
                    if (response && response.events) {
                        return Array.isArray(response.events) ? response.events : [];
                    }
                    return [];
                } catch (error) {
                    console.error('Error fetching remote events:', error);
                    return []; // Return empty array on error
                }
            }

            // For local tournaments, fetch from database
            return await dbListEvents(tournamentName);
        },
        // Configure refetch behavior
        refetchOnWindowFocus: true,
        staleTime: 1000 * 60, // 1 minute
        onSuccess: (data) => {
            if (!Array.isArray(data)) {
                console.error('Events data is not an array:', data);
                return;
            }
            
            // When we get events, prefetch fencers for each event
            data.forEach(event => {
                if (event && event.id) {
                    queryClient.prefetchQuery({
                        queryKey: keys.fencers(event.id),
                        queryFn: () => dbGetFencersInEventById(event)
                    });
                }
            });
        }
    });
}

// Get fencers for an event
export function useFencers(event: Event) {
    return useQuery({
        queryKey: keys.fencers(event.id),
        queryFn: () => dbGetFencersInEventById(event),
        enabled: !!event.id // Only run if we have an event ID
    });
}

// Get rounds for an event
export function useRounds(eventId: number) {
    return useQuery({
        queryKey: keys.rounds(eventId),
        queryFn: () => dbGetRoundsForEvent(eventId),
        enabled: !!eventId
    });
}

// Add a fencer to an event (mutation example)
export function useAddFencer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ fencer, event }: { fencer: Fencer, event: Event }) => {
            return dbAddFencerToEventById(fencer, event);
        },
        // When mutation succeeds, invalidate the fencers query so it refetches
        onSuccess: (_, { event }) => {
            queryClient.invalidateQueries({ queryKey: keys.fencers(event.id) });

            // If we're hosting a server, broadcast the update
            if (tournamentServer.isServerRunning()) {
                tournamentServer.broadcastTournamentUpdate({
                    type: 'fencer_added',
                    eventId: event.id
                });
            }
        }
    });
}

// Create a new event (mutation example)
export function useCreateEvent() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ tournamentName, event }: { tournamentName: string, event: Event }) => {
            return dbCreateEvent(tournamentName, event);
        },
        // When mutation succeeds, invalidate the events query
        onSuccess: (_, { tournamentName }) => {
            queryClient.invalidateQueries({ queryKey: keys.events(tournamentName) });

            // If we're hosting a server, broadcast the update
            if (tournamentServer.isServerRunning()) {
                tournamentServer.broadcastTournamentUpdate({
                    type: 'event_created',
                    tournamentName
                });
            }
        }
    });
}

// Add WebSocket event listeners to keep queries in sync
export function setupTournamentSync(queryClient: any) {
    // When we receive an event update from the server
    tournamentClient.on('events_list', (data: any) => {
        // Update the events cache
        queryClient.setQueryData(
            keys.events(data.tournamentName),
            data.events
        );
    });

    // When a fencer is added
    tournamentClient.on('fencer_added', (data: any) => {
        queryClient.invalidateQueries({
            queryKey: keys.fencers(data.eventId)
        });
    });

    // When an event is created
    tournamentClient.on('event_created', (data: any) => {
        queryClient.invalidateQueries({
            queryKey: keys.events(data.tournamentName)
        });
    });

    // Add more listeners for other event types
}
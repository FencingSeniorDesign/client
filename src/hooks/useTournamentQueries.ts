// src/hooks/useTournamentQueries.ts
import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Event, Tournament, Fencer, Round } from '../navigation/navigation/types';
import {
    dbListEvents,
    dbGetFencersInEventById,
    dbGetRoundsForEvent,
    dbAddFencerToEventById,
    dbCreateEvent,
    dbDeleteFencerFromEventById,
    dbCreateFencerByName,
    dbUpdateRound,
    dbDeleteRound,
    dbAddRound,
    dbSearchFencers
} from '../db/TournamentDatabaseUtils';
import tournamentClient from '../networking/TournamentClient';
import tournamentServer from '../networking/TournamentServer';

// Key factory for consistent query keys
export const keys = {
    tournaments: ['tournaments'] as const,
    tournament: (name: string) => ['tournament', name] as const,
    events: (tournamentName: string) => ['events', tournamentName] as const,
    event: (eventId: number) => ['event', eventId] as const,
    fencers: (eventId: number) => ['fencers', eventId] as const,
    rounds: (eventId: number) => ['rounds', eventId] as const,
    fencerSearch: (query: string) => ['fencerSearch', query] as const,
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
        staleTime: isRemoteConnection() ? 10000 : 60000, // 10 seconds for remote, 1 minute for local
        // Poll for events updates in remote mode
        refetchInterval: isRemoteConnection() ? 10000 : false, // 10 seconds
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
                    
                    // Also prefetch rounds to update event statuses
                    queryClient.prefetchQuery({
                        queryKey: keys.rounds(event.id),
                        queryFn: () => dbGetRoundsForEvent(event.id)
                    });
                }
            });
            
            // Force a refresh of event statuses whenever events are loaded
            queryClient.invalidateQueries(['eventStatuses']);
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

// Search for fencers
export function useSearchFencers(query: string) {
    return useQuery({
        queryKey: keys.fencerSearch(query),
        queryFn: () => dbSearchFencers(query),
        enabled: query.trim().length > 0, // Only run if we have a search query
        staleTime: 1000 * 30, // 30 seconds
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

// Get event statuses (for the EventManagement page)
export function useEventStatuses(events: Event[]) {
    const queryClient = useQueryClient();
    
    // Extract just the event IDs for the query key to avoid unnecessary rerenders
    const eventIds = React.useMemo(() => 
        Array.isArray(events) ? events.map(e => e?.id).filter(Boolean) : [], 
        [events]
    );
    
    return useQuery({
        queryKey: ['eventStatuses', eventIds],
        queryFn: async () => {
            if (!events || !Array.isArray(events) || events.length === 0) {
                return {};
            }
            
            const statuses: { [key: number]: boolean } = {};
            
            // For remote connections, try to get status from query results
            if (isRemoteConnection()) {
                console.log('Remote connection detected - trying to determine event statuses');
                
                // First check if we have a cached value
                const cachedEventStatuses = queryClient.getQueryData(['eventStatuses']);
                if (cachedEventStatuses) {
                    console.log('Using cached event statuses:', cachedEventStatuses);
                    
                    // If we have a cached value, make sure we've got data for all our events
                    let hasAllStatuses = true;
                    for (const eventId of eventIds) {
                        if (cachedEventStatuses[eventId] === undefined) {
                            hasAllStatuses = false;
                            break;
                        }
                    }
                    
                    if (hasAllStatuses) {
                        console.log('Cached statuses are complete, using them');
                        return cachedEventStatuses;
                    }
                }
                
                // Explicitly fetch rounds for all events to get accurate status
                console.log('Fetching rounds for all events to determine status');
                const manualStatuses: { [key: number]: boolean } = {};
                
                await Promise.all(
                    events.map(async (event) => {
                        if (event && event.id) {
                            try {
                                // Query the rounds explicitly
                                const rounds = await dbGetRoundsForEvent(event.id);
                                
                                // Determine status from first round's isstarted
                                if (rounds && rounds.length > 0) {
                                    const isStarted = rounds[0].isstarted;
                                    manualStatuses[event.id] = isStarted === 1 || 
                                                              isStarted === true || 
                                                              isStarted === "1" || 
                                                              !!isStarted;
                                } else {
                                    manualStatuses[event.id] = false;
                                }
                            } catch (error) {
                                console.error(`Error fetching rounds for event ${event.id}:`, error);
                                manualStatuses[event.id] = false;
                            }
                        }
                    })
                );
                
                console.log('Manually determined statuses:', manualStatuses);
                return manualStatuses;
            }
            
            // Local status checking - works for both local tournaments and as fallback for remote
            await Promise.all(
                events.map(async (evt) => {
                    if (!evt || typeof evt.id !== 'number') {
                        console.warn('Invalid event object:', evt);
                        return;
                    }
                    
                    // Try to get rounds from cache first
                    const cachedRounds = queryClient.getQueryData(keys.rounds(evt.id));
                    let rounds;
                    
                    if (cachedRounds) {
                        rounds = cachedRounds;
                    } else {
                        // If not in cache, fetch and cache for future use
                        rounds = await dbGetRoundsForEvent(evt.id);
                        queryClient.setQueryData(keys.rounds(evt.id), rounds);
                    }
                    
                    // An event is considered started if it has at least one round AND the first round has isstarted=1
                    if (rounds && rounds.length > 0) {
                        // Handle various ways isstarted might be represented
                        const isStarted = rounds[0].isstarted;
                        
                        // Convert various formats (1, true, "1", etc.) to boolean
                        statuses[evt.id] = isStarted === 1 || 
                                          isStarted === true || 
                                          isStarted === "1" || 
                                          !!isStarted;
                    } else {
                        statuses[evt.id] = false;
                    }
                    
                    // Also check if the event itself has an isStarted property (some servers might add this)
                    if (evt.isStarted !== undefined) {
                        statuses[evt.id] = !!evt.isStarted;
                    }
                })
            );
            
            return statuses;
        },
        enabled: Array.isArray(events) && events.length > 0,
        // Reduce stale time for remote connections to refresh status more frequently
        staleTime: isRemoteConnection() ? 10000 : 60000, // 10 seconds for remote, 1 minute for local
        // Also poll for updates regularly in remote mode, but less frequently to reduce spam
        refetchInterval: isRemoteConnection() ? 30000 : false, // 30 seconds for remote, disabled for local
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

// Remove a fencer from an event
export function useRemoveFencer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ fencer, event }: { fencer: Fencer, event: Event }) => {
            return dbDeleteFencerFromEventById(fencer, event);
        },
        onSuccess: (_, { event }) => {
            queryClient.invalidateQueries({ queryKey: keys.fencers(event.id) });

            // Broadcast update if hosting
            if (tournamentServer.isServerRunning()) {
                tournamentServer.broadcastTournamentUpdate({
                    type: 'fencer_removed',
                    eventId: event.id
                });
            }
        }
    });
}

// Create a new fencer and add to event
export function useCreateFencer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ fencer, event, addToEvent = true }: 
            { fencer: Fencer, event: Event, addToEvent?: boolean }) => {
            return dbCreateFencerByName(fencer, event, addToEvent);
        },
        onSuccess: (_, { event }) => {
            queryClient.invalidateQueries({ queryKey: keys.fencers(event.id) });
            
            // Broadcast update if hosting
            if (tournamentServer.isServerRunning()) {
                tournamentServer.broadcastTournamentUpdate({
                    type: 'fencer_added',
                    eventId: event.id
                });
            }
        }
    });
}

// Create a new event
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

// Delete an event
export function useDeleteEvent() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (eventId: number) => {
            return dbDeleteEvent(eventId);
        },
        onSuccess: (_, eventId) => {
            // Since we don't know the tournament name here, we'll invalidate all events queries
            queryClient.invalidateQueries({ queryKey: ['events'] });
            
            // If we're hosting a server, broadcast the update
            if (tournamentServer.isServerRunning()) {
                tournamentServer.broadcastTournamentUpdate({
                    type: 'event_deleted'
                });
            }
        }
    });
}

// Add a new round
export function useAddRound() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (round: Partial<Round>) => {
            return dbAddRound(round as any);
        },
        onSuccess: (_, variables) => {
            if (variables.eventid) {
                queryClient.invalidateQueries({ queryKey: keys.rounds(variables.eventid) });
                
                // Broadcast update if hosting
                if (tournamentServer.isServerRunning()) {
                    tournamentServer.broadcastTournamentUpdate({
                        type: 'round_added',
                        eventId: variables.eventid
                    });
                }
            }
        }
    });
}

// Update a round
export function useUpdateRound() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (round: Round) => {
            return dbUpdateRound(round);
        },
        onSuccess: (_, variables) => {
            if (variables.eventid) {
                queryClient.invalidateQueries({ queryKey: keys.rounds(variables.eventid) });
                
                // Broadcast update if hosting
                if (tournamentServer.isServerRunning()) {
                    tournamentServer.broadcastTournamentUpdate({
                        type: 'round_updated',
                        eventId: variables.eventid
                    });
                }
            }
        }
    });
}

// Delete a round
export function useDeleteRound() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ roundId, eventId }: { roundId: number, eventId: number }) => {
            return dbDeleteRound(roundId);
        },
        onSuccess: (_, { eventId }) => {
            queryClient.invalidateQueries({ queryKey: keys.rounds(eventId) });
            
            // Broadcast update if hosting
            if (tournamentServer.isServerRunning()) {
                tournamentServer.broadcastTournamentUpdate({
                    type: 'round_deleted',
                    eventId
                });
            }
        }
    });
}

// Add WebSocket event listeners to keep queries in sync
export function setupTournamentSync(queryClient: any) {
    // When we receive an event update from the server
    tournamentClient.on('events_list', (data: any) => {
        console.log('Received events list:', data);
        
        // Track if rounds are cached
        let shouldCacheRounds = false;
        
        // Process events to extract status information
        if (Array.isArray(data.events) && data.events.length > 0) {
            // Create deep copies to preserve embedded rounds
            const eventsWithRounds = data.events.map((event: any) => {
                // Make a deep copy of the event
                const eventCopy = { ...event };
                
                // If the event has rounds, we want to cache them separately
                if (Array.isArray(event.rounds) && event.rounds.length > 0) {
                    shouldCacheRounds = true;
                    eventCopy._hasRounds = true; // Flag to track which events have rounds
                }
                
                return eventCopy;
            });
            
            // Update the events cache
            queryClient.setQueryData(
                keys.events(data.tournamentName),
                eventsWithRounds
            );
            
            // First, check if we have rounds embedded in the events
            let hasEmbeddedRounds = false;
            let statuses: { [key: number]: boolean } = {};
            
            for (const event of data.events) {
                if (event && event.id) {
                    // Cache rounds data for each event if available
                    if (Array.isArray(event.rounds) && event.rounds.length > 0) {
                        console.log(`Caching rounds for event ${event.id}:`, event.rounds);
                        
                        // Store the rounds in the rounds cache
                        queryClient.setQueryData(
                            keys.rounds(event.id),
                            event.rounds
                        );
                        
                        hasEmbeddedRounds = true;
                        
                        // Determine status from the first round
                        const isStarted = event.rounds[0].isstarted;
                        statuses[event.id] = isStarted === 1 || 
                                           isStarted === true ||
                                           isStarted === "1" ||
                                           !!isStarted;
                    }
                    
                    // Some servers might directly include isStarted on the event
                    if (event.isStarted !== undefined) {
                        statuses[event.id] = !!event.isStarted;
                    }
                    
                    // Check for a has_started field
                    if (event.has_started !== undefined) {
                        statuses[event.id] = !!event.has_started;
                    }
                    
                    // Also check for started field (different naming conventions)
                    if (event.started !== undefined) {
                        statuses[event.id] = !!event.started;
                    }
                }
            }
            
            // If we found any status info, update the cache
            if (Object.keys(statuses).length > 0) {
                console.log('Extracted event statuses from events_list:', statuses);
                
                // Get current statuses and merge with the new ones
                const currentStatuses = queryClient.getQueryData(['eventStatuses']) || {};
                const updatedStatuses = { ...currentStatuses, ...statuses };
                
                // Update the cache
                queryClient.setQueryData(['eventStatuses'], updatedStatuses);
            }
            
            // If no embedded rounds were found, trigger rounds fetching for each event
            if (!hasEmbeddedRounds) {
                data.events.forEach((event: any) => {
                    if (event && event.id) {
                        // Try requesting rounds from server first
                        if (isRemoteConnection() && tournamentClient.isConnected()) {
                            console.log(`Requesting rounds for event ${event.id} from server`);
                            tournamentClient.sendMessage({
                                type: 'get_rounds',
                                eventId: event.id
                            });
                        } else {
                            // Prefetch rounds from local database
                            queryClient.prefetchQuery({
                                queryKey: keys.rounds(event.id),
                                queryFn: () => dbGetRoundsForEvent(event.id)
                            });
                        }
                    }
                });
                
                // Also invalidate event statuses to trigger a recalculation
                queryClient.invalidateQueries(['eventStatuses']);
            }
        } else {
            // If no events, just update the cache directly
            queryClient.setQueryData(
                keys.events(data.tournamentName),
                data.events || []
            );
        }
    });

    // When a fencer is added
    tournamentClient.on('fencer_added', (data: any) => {
        queryClient.invalidateQueries({
            queryKey: keys.fencers(data.eventId)
        });
    });

    // When a fencer is removed
    tournamentClient.on('fencer_removed', (data: any) => {
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
    
    // When event statuses are updated
    tournamentClient.on('event_statuses', (data: any) => {
        if (data?.statuses) {
            queryClient.setQueryData(
                ['eventStatuses'], 
                data.statuses
            );
        }
    });
    
    // When we receive rounds data for an event
    tournamentClient.on('rounds_list', (data: any) => {
        if (data?.eventId && Array.isArray(data.rounds)) {
            console.log(`Received rounds_list for event ${data.eventId}:`, data.rounds);
            
            // Cache the rounds data
            queryClient.setQueryData(
                keys.rounds(data.eventId),
                data.rounds
            );
            
            // Update event status if this is the first round
            if (data.rounds.length > 0) {
                const isStarted = data.rounds[0].isstarted;
                
                // Convert to boolean
                const isStartedBool = isStarted === 1 || 
                                    isStarted === true || 
                                    isStarted === "1" || 
                                    !!isStarted;
                
                // Update the status cache
                const currentStatuses = queryClient.getQueryData(['eventStatuses']) || {};
                
                queryClient.setQueryData(['eventStatuses'], {
                    ...currentStatuses,
                    [data.eventId]: isStartedBool
                });
            }
        }
    });

    // When a round is added, updated, or deleted
    tournamentClient.on('round_added', (data: any) => {
        if (data.eventId) {
            // Invalidate rounds for this event
            queryClient.invalidateQueries({
                queryKey: keys.rounds(data.eventId)
            });
            
            // Also invalidate event statuses since a round was added
            queryClient.invalidateQueries({
                queryKey: ['eventStatuses']
            });
        }
    });

    tournamentClient.on('round_updated', (data: any) => {
        if (data.eventId) {
            // Invalidate rounds for this event
            queryClient.invalidateQueries({
                queryKey: keys.rounds(data.eventId)
            });
            
            // Also invalidate event statuses when round is updated
            // (which could mean it was started)
            queryClient.invalidateQueries({
                queryKey: ['eventStatuses']
            });
            
            // If round.isstarted was toggled, update event statuses
            if (data.round && typeof data.round.isstarted === 'boolean') {
                // Get current event statuses
                const currentStatuses = queryClient.getQueryData(['eventStatuses']) || {};
                
                // Update the specific event's status
                const updatedStatuses = {
                    ...currentStatuses,
                    [data.eventId]: data.round.isstarted
                };
                
                // Set updated statuses in cache
                queryClient.setQueryData(['eventStatuses'], updatedStatuses);
            }
        }
    });

    tournamentClient.on('round_deleted', (data: any) => {
        if (data.eventId) {
            queryClient.invalidateQueries({
                queryKey: keys.rounds(data.eventId)
            });
            
            // Also invalidate event statuses
            queryClient.invalidateQueries({
                queryKey: ['eventStatuses']
            });
        }
    });
}
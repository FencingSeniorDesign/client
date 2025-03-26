// src/data/RealtimeQuerySync.ts
import { QueryClient } from '@tanstack/react-query';
import tournamentClient from '../networking/TournamentClient';
import {
    EntityType,
    UpdateOperation,
    EntityUpdateMessage,
    BulkEntityUpdateMessage,
    isEntityUpdateMessage,
    isBulkEntityUpdateMessage
} from '../networking/MessageTypes';
import { queryKeys } from './TournamentDataHooks';

/**
 * RealtimeQuerySync bridges the socket-based real-time updates with TanStack Query
 * It processes incoming real-time messages and updates the query cache accordingly
 */
class RealtimeQuerySync {
    private static instance: RealtimeQuerySync;
    private queryClient: QueryClient | null = null;
    private initialized: boolean = false;
    private lastProcessedVersion: number = 0;

    /**
     * Private constructor for singleton pattern
     */
    private constructor() {}

    /**
     * Get the singleton instance
     */
    public static getInstance(): RealtimeQuerySync {
        if (!RealtimeQuerySync.instance) {
            RealtimeQuerySync.instance = new RealtimeQuerySync();
        }
        return RealtimeQuerySync.instance;
    }

    /**
     * Initialize the RealtimeQuerySync with a QueryClient instance
     */
    public initialize(queryClient: QueryClient): void {
        if (this.initialized) return;

        this.queryClient = queryClient;

        // Set up listeners for real-time update messages
        tournamentClient.on('entity_update', this.handleEntityUpdate.bind(this));
        tournamentClient.on('bulk_entity_update', this.handleBulkEntityUpdate.bind(this));
        tournamentClient.on('connected', this.handleConnected.bind(this));

        console.log('[RealtimeQuerySync] Initialized with QueryClient');
        this.initialized = true;
    }

    /**
     * Handle a connection event (when client connects to server)
     */
    private handleConnected(tournamentName: string): void {
        console.log(`[RealtimeQuerySync] Connected to server for ${tournamentName}`);

        // Request missed updates if we have previously processed updates
        if (this.lastProcessedVersion > 0) {
            this.requestMissedUpdates();
        }
    }

    /**
     * Request missed updates since the last processed version
     */
    private requestMissedUpdates(): void {
        if (!tournamentClient.isConnected()) return;

        console.log(`[RealtimeQuerySync] Requesting missed updates since version ${this.lastProcessedVersion}`);

        tournamentClient.sendMessage({
            type: 'request_missed_updates',
            lastReceivedVersion: this.lastProcessedVersion
        });
    }

    /**
     * Handle an entity update message from the server
     */
    private handleEntityUpdate(message: EntityUpdateMessage): void {
        if (!this.queryClient) return;

        console.log(`[RealtimeQuerySync] Processing entity update for ${message.entityType} #${message.entityId}`);

        // Update the last processed version
        if (message.version > this.lastProcessedVersion) {
            this.lastProcessedVersion = message.version;
        }

        // Handle the update based on the entity type
        switch (message.entityType) {
            case EntityType.EVENT:
                this.handleEventUpdate(message);
                break;
            case EntityType.ROUND:
                this.handleRoundUpdate(message);
                break;
            case EntityType.POOL:
                this.handlePoolUpdate(message);
                break;
            case EntityType.BOUT:
                this.handleBoutUpdate(message);
                break;
            case EntityType.FENCER:
                this.handleFencerUpdate(message);
                break;
            case EntityType.SEEDING:
                this.handleSeedingUpdate(message);
                break;
            default:
                console.warn(`[RealtimeQuerySync] Unknown entity type: ${message.entityType}`);
        }
    }

    /**
     * Handle a bulk entity update message from the server
     */
    private handleBulkEntityUpdate(message: BulkEntityUpdateMessage): void {
        if (!this.queryClient) return;

        console.log(`[RealtimeQuerySync] Processing bulk update for ${message.updates.length} ${message.entityType} entities`);

        // Update the last processed version
        if (message.version > this.lastProcessedVersion) {
            this.lastProcessedVersion = message.version;
        }

        // Process each update in the bulk message
        message.updates.forEach(update => {
            const entityUpdateMessage: EntityUpdateMessage = {
                type: 'entity_update',
                entityType: message.entityType,
                entityId: update.entityId,
                operation: update.operation,
                data: update.data,
                timestamp: message.timestamp,
                version: message.version
            };

            this.handleEntityUpdate(entityUpdateMessage);
        });
    }

    /**
     * Handle an event update
     */
    private handleEventUpdate(message: EntityUpdateMessage): void {
        if (!this.queryClient) return;

        const { entityId, operation, data } = message;

        // Get the event's tournament name from the data
        const tournamentName = data.tname || data.tournamentName;

        if (!tournamentName) {
            console.warn('[RealtimeQuerySync] Event update missing tournament name', data);
            return;
        }

        // Handle different operations
        switch (operation) {
            case UpdateOperation.CREATE:
                // Invalidate the events query to refetch
                this.queryClient.invalidateQueries({ queryKey: queryKeys.events(tournamentName) });
                break;

            case UpdateOperation.UPDATE:
                // Update the event in the cache
                this.updateEventInCache(tournamentName, entityId, data);
                break;

            case UpdateOperation.DELETE:
                // Invalidate the events query to refetch
                this.queryClient.invalidateQueries({ queryKey: queryKeys.events(tournamentName) });
                break;
        }
    }

    /**
     * Handle a round update
     */
    private handleRoundUpdate(message: EntityUpdateMessage): void {
        if (!this.queryClient) return;

        const { entityId, operation, data } = message;

        // Get the event ID from the data
        const eventId = data.eventid || data.eventId;

        if (!eventId) {
            console.warn('[RealtimeQuerySync] Round update missing event ID', data);
            return;
        }

        // Handle different operations
        switch (operation) {
            case UpdateOperation.CREATE:
                // Invalidate the rounds query to refetch
                this.queryClient.invalidateQueries({ queryKey: queryKeys.rounds(eventId) });
                break;

            case UpdateOperation.UPDATE:
                // For round updates, we need to handle special cases like round completion
                if (data.iscomplete) {
                    // If the round is marked as complete, invalidate both rounds and event statuses
                    this.queryClient.invalidateQueries({ queryKey: queryKeys.rounds(eventId) });
                    this.queryClient.invalidateQueries({ queryKey: queryKeys.eventStatuses });

                    // Also invalidate any pool or bout data that might exist for this round
                    this.queryClient.invalidateQueries({ queryKey: ['pools'] });
                    this.queryClient.invalidateQueries({ queryKey: ['bouts'] });
                } else {
                    // For other updates, just update the round in the cache
                    this.updateRoundInCache(eventId, entityId, data);
                }
                break;

            case UpdateOperation.DELETE:
                // Invalidate the rounds query to refetch
                this.queryClient.invalidateQueries({ queryKey: queryKeys.rounds(eventId) });
                break;
        }
    }

    /**
     * Handle a pool update
     */
    private handlePoolUpdate(message: EntityUpdateMessage): void {
        if (!this.queryClient) return;

        const { entityId, operation, data } = message;

        // Get the round ID from the data
        const roundId = data.roundId;

        if (!roundId) {
            console.warn('[RealtimeQuerySync] Pool update missing round ID', data);
            return;
        }

        // For pool updates, we typically invalidate the pools query to refetch
        this.queryClient.invalidateQueries({ queryKey: queryKeys.pools(roundId) });
    }

    /**
     * Handle a bout update
     */
    private handleBoutUpdate(message: EntityUpdateMessage): void {
        if (!this.queryClient) return;

        const { entityId, operation, data } = message;

        // Get the pool ID and round ID from the data
        const poolId = data.poolId;
        const roundId = data.roundId;

        if (!poolId || !roundId) {
            console.warn('[RealtimeQuerySync] Bout update missing pool ID or round ID', data);
            return;
        }

        // Handle score updates
        if (operation === UpdateOperation.UPDATE && data.scoreA !== undefined && data.scoreB !== undefined) {
            // Update the bout in the cache
            this.updateBoutInCache(roundId, poolId, entityId, data);
        } else {
            // For other operations, invalidate the bouts query to refetch
            this.queryClient.invalidateQueries({ queryKey: queryKeys.boutsForPool(roundId, poolId) });
        }
    }

    /**
     * Handle a fencer update
     */
    private handleFencerUpdate(message: EntityUpdateMessage): void {
        if (!this.queryClient) return;

        const { entityId, operation, data } = message;

        // Get the event ID from the data
        const eventId = data.eventId;

        if (!eventId) {
            console.warn('[RealtimeQuerySync] Fencer update missing event ID', data);
            return;
        }

        // Invalidate the fencers query to refetch
        this.queryClient.invalidateQueries({ queryKey: queryKeys.fencers(eventId) });
    }

    /**
     * Handle a seeding update
     */
    private handleSeedingUpdate(message: EntityUpdateMessage): void {
        if (!this.queryClient) return;

        const { entityId, operation, data } = message;

        // Get the round ID from the data
        const roundId = data.roundId;

        if (!roundId) {
            console.warn('[RealtimeQuerySync] Seeding update missing round ID', data);
            return;
        }

        // For seeding updates, there's no dedicated query key, so we'll need to
        // invalidate related queries that might be affected
        this.queryClient.invalidateQueries({ queryKey: queryKeys.rounds(data.eventId) });
        this.queryClient.invalidateQueries({ queryKey: queryKeys.pools(roundId) });
    }

    /**
     * Update an event in the TanStack Query cache
     */
    private updateEventInCache(tournamentName: string, eventId: number, eventData: any): void {
        if (!this.queryClient) return;

        try {
            // Get the current events from the cache
            const queryKey = queryKeys.events(tournamentName);
            const events = this.queryClient.getQueryData<any[]>(queryKey);

            if (!events) {
                // If we don't have the events in the cache, invalidate to trigger a refetch
                this.queryClient.invalidateQueries({ queryKey });
                return;
            }

            // Find and update the event in the cache
            const updatedEvents = events.map(event =>
                event.id === eventId ? { ...event, ...eventData } : event
            );

            // Update the cache
            this.queryClient.setQueryData(queryKey, updatedEvents);
            console.log(`[RealtimeQuerySync] Updated event #${eventId} in cache`);
        } catch (error) {
            console.error('[RealtimeQuerySync] Error updating event in cache:', error);
            // If something goes wrong, invalidate to trigger a refetch
            this.queryClient.invalidateQueries({ queryKey: queryKeys.events(tournamentName) });
        }
    }

    /**
     * Update a round in the TanStack Query cache
     */
    private updateRoundInCache(eventId: number, roundId: number, roundData: any): void {
        if (!this.queryClient) return;

        try {
            // Get the current rounds from the cache
            const queryKey = queryKeys.rounds(eventId);
            const rounds = this.queryClient.getQueryData<any[]>(queryKey);

            if (!rounds) {
                // If we don't have the rounds in the cache, invalidate to trigger a refetch
                this.queryClient.invalidateQueries({ queryKey });
                return;
            }

            // Find and update the round in the cache
            const updatedRounds = rounds.map(round =>
                round.id === roundId ? { ...round, ...roundData } : round
            );

            // Update the cache
            this.queryClient.setQueryData(queryKey, updatedRounds);
            console.log(`[RealtimeQuerySync] Updated round #${roundId} in cache`);
        } catch (error) {
            console.error('[RealtimeQuerySync] Error updating round in cache:', error);
            // If something goes wrong, invalidate to trigger a refetch
            this.queryClient.invalidateQueries({ queryKey: queryKeys.rounds(eventId) });
        }
    }

    /**
     * Update a bout in the TanStack Query cache
     */
    private updateBoutInCache(roundId: number, poolId: number, boutId: number, boutData: any): void {
        if (!this.queryClient) return;

        try {
            // Get the current bouts from the cache
            const queryKey = queryKeys.boutsForPool(roundId, poolId);
            const bouts = this.queryClient.getQueryData<any[]>(queryKey);

            if (!bouts) {
                // If we don't have the bouts in the cache, invalidate to trigger a refetch
                this.queryClient.invalidateQueries({ queryKey });
                return;
            }

            // Find and update the bout in the cache
            const updatedBouts = bouts.map(bout => {
                if (bout.id === boutId) {
                    // For bout scores, we need to update specific fields
                    if (boutData.scoreA !== undefined && boutData.scoreB !== undefined) {
                        return {
                            ...bout,
                            left_score: boutData.scoreA,
                            right_score: boutData.scoreB
                        };
                    }
                    return { ...bout, ...boutData };
                }
                return bout;
            });

            // Update the cache
            this.queryClient.setQueryData(queryKey, updatedBouts);
            console.log(`[RealtimeQuerySync] Updated bout #${boutId} in cache`);
        } catch (error) {
            console.error('[RealtimeQuerySync] Error updating bout in cache:', error);
            // If something goes wrong, invalidate to trigger a refetch
            this.queryClient.invalidateQueries({ queryKey: queryKeys.boutsForPool(roundId, poolId) });
        }
    }
}

// Export singleton instance
export default RealtimeQuerySync.getInstance();
// src/networking/MessageTypes.ts
// Type definitions for all message types exchanged between client and server
import { Event, Tournament } from '../navigation/navigation/types';

/**
 * Base interface for all messages
 */
export interface BaseMessage {
    type: string;
    timestamp?: string;
}

/**
 * Message validation utility
 */
export function validateMessage(message: any): message is BaseMessage {
    return typeof message === 'object' && message !== null && typeof message.type === 'string';
}

/**
 * Client Messages
 */

/**
 * User role type for permission control
 */
export enum UserRole {
    TOURNAMENT_OFFICIAL = 'tournament_official',
    REFEREE = 'referee',
    SPECTATOR = 'spectator',
}

/**
 * Join request sent by client to connect to a tournament
 */
export interface JoinRequestMessage extends BaseMessage {
    type: 'join_request';
    clientId?: string;
    deviceId?: string; // The 5-character device ID for role assignment
    tournamentName?: string;
    role?: UserRole;
}

/**
 * Request from client for list of events in a tournament
 */
export interface GetEventsMessage extends BaseMessage {
    type: 'get_events';
    tournamentName: string;
}

/**
 * Request for full tournament data
 */
export interface RequestTournamentDataMessage extends BaseMessage {
    type: 'request_tournament_data';
    tournamentName?: string;
}

/**
 * Request event statuses
 */
export interface GetEventStatusesMessage extends BaseMessage {
    type: 'get_event_statuses';
    eventIds: number[];
}

/**
 * Request rounds for an event
 */
export interface GetRoundsMessage extends BaseMessage {
    type: 'get_rounds';
    eventId: number;
}

/**
 * Request pools for a round
 */
export interface GetPoolsMessage extends BaseMessage {
    type: 'get_pools';
    roundId: number;
}

/**
 * Request bouts for a pool
 */
export interface GetPoolBoutsMessage extends BaseMessage {
    type: 'get_pool_bouts';
    roundId: number;
    poolId: number;
}

/**
 * Request fencers for an event
 */
export interface GetFencersMessage extends BaseMessage {
    type: 'get_fencers';
    eventId: number;
}

/**
 * Update bout score message
 */
export interface UpdateScoreMessage extends BaseMessage {
    type: 'update_score';
    boutId: number;
    scoreA: number;
    scoreB: number;
}

/**
 * Update pool bout scores message
 */
export interface UpdatePoolBoutScoresMessage extends BaseMessage {
    type: 'update_pool_bout_scores';
    boutId: number;
    scoreA: number;
    scoreB: number;
    fencerAId: number;
    fencerBId: number;
}

/**
 * Complete round message
 */
export interface CompleteRoundMessage extends BaseMessage {
    type: 'complete_round';
    roundId: number;
}

/**
 * Server Messages
 */

/**
 * Welcome message sent by server on initial connection
 */
export interface WelcomeMessage extends BaseMessage {
    type: 'welcome';
    tournamentName: string;
    serverVersion?: string;
}

/**
 * Response to a join request
 */
export interface JoinResponseMessage extends BaseMessage {
    type: 'join_response';
    success: boolean;
    message: string;
    tournamentName?: string;
    role?: UserRole; // The assigned role based on device ID lookup
    permissions?: string[];
}

/**
 * List of events response
 */
export interface EventsListMessage extends BaseMessage {
    type: 'events_list';
    tournamentName: string;
    events: Event[];
    error?: string;
}

/**
 * Event statuses response
 */
export interface EventStatusesMessage extends BaseMessage {
    type: 'event_statuses';
    statuses: { [key: number]: boolean };
    error?: string;
}

/**
 * Rounds list response
 */
export interface RoundsListMessage extends BaseMessage {
    type: 'rounds_list';
    eventId: number;
    rounds: any[]; // Using 'any' to accommodate different round formats
    error?: string;
}

/**
 * Pools list response
 */
export interface PoolsListMessage extends BaseMessage {
    type: 'pools_list';
    roundId: number;
    pools: any[]; // Using 'any' to accommodate different pool formats
    error?: string;
}

/**
 * Pool bouts list response
 */
export interface PoolBoutsListMessage extends BaseMessage {
    type: 'pool_bouts_list';
    roundId: number;
    poolId: number;
    bouts: any[]; // Using 'any' to accommodate different bout formats
    error?: string;
}

/**
 * Fencers list response
 */
export interface FencersListMessage extends BaseMessage {
    type: 'fencers_list';
    eventId: number;
    fencers: any[]; // Using 'any' to accommodate different fencer formats
    error?: string;
}

/**
 * Complete tournament data response
 */
export interface TournamentDataMessage extends BaseMessage {
    type: 'tournament_data';
    tournamentData: {
        tournamentName: string;
        events: Event[];
        lastUpdated: number;
    };
}

/**
 * Score update broadcast message
 */
export interface ScoreUpdateMessage extends BaseMessage {
    type: 'score_update';
    boutId: number;
    scoreA: number;
    scoreB: number;
}

/**
 * Server closing notification
 */
export interface ServerClosingMessage extends BaseMessage {
    type: 'server_closing';
    message: string;
}

/**
 * Tournament update notification
 */
export interface TournamentUpdateMessage extends BaseMessage {
    type: 'tournament_update';
    tournamentName?: string;
    timestamp: string;
    data: any;
}

/**
 * Round completed response
 */
export interface RoundCompletedMessage extends BaseMessage {
    type: 'round_completed';
    roundId: number;
    success: boolean;
    error?: string;
}

/**
 * Round completed broadcast notification
 */
export interface RoundCompletedBroadcastMessage extends BaseMessage {
    type: 'round_completed_broadcast';
    roundId: number;
}

/**
 * Tournament broadcast message for local discovery
 */
export interface TournamentBroadcastMessage extends BaseMessage {
    type: 'tournament_broadcast';
    tournamentName: string;
    hostIp: string;
    port: number;
    timestamp: number;
}

/**
 * Network connection configuration
 */
export interface ConnectionConfig {
    hostIp: string;
    port: number;
    timeout?: number;
    maxReconnectAttempts?: number;
    autoReconnect?: boolean;
}

/**
 * All possible message types - union type
 */
export type TournamentMessage =
    | JoinRequestMessage
    | GetEventsMessage
    | RequestTournamentDataMessage
    | GetEventStatusesMessage
    | GetRoundsMessage
    | GetPoolsMessage
    | GetPoolBoutsMessage
    | GetFencersMessage
    | UpdateScoreMessage
    | UpdatePoolBoutScoresMessage
    | WelcomeMessage
    | JoinResponseMessage
    | EventsListMessage
    | EventStatusesMessage
    | RoundsListMessage
    | PoolsListMessage
    | PoolBoutsListMessage
    | FencersListMessage
    | TournamentDataMessage
    | ScoreUpdateMessage
    | ServerClosingMessage
    | TournamentUpdateMessage
    | TournamentBroadcastMessage
    | CompleteRoundMessage
    | RoundCompletedMessage
    | RoundCompletedBroadcastMessage;

/**
 * Type guard functions
 */
export const isJoinRequestMessage = (msg: any): msg is JoinRequestMessage =>
    validateMessage(msg) && msg.type === 'join_request';

export const isGetEventsMessage = (msg: any): msg is GetEventsMessage =>
    validateMessage(msg) && msg.type === 'get_events' && typeof msg.tournamentName === 'string';

export const isWelcomeMessage = (msg: any): msg is WelcomeMessage =>
    validateMessage(msg) && msg.type === 'welcome' && typeof msg.tournamentName === 'string';

export const isJoinResponseMessage = (msg: any): msg is JoinResponseMessage =>
    validateMessage(msg) &&
    msg.type === 'join_response' &&
    typeof msg.success === 'boolean' &&
    typeof msg.message === 'string';
export const isEventsListMessage = (msg: any): msg is EventsListMessage =>
    validateMessage(msg) &&
    msg.type === 'events_list' &&
    typeof msg.tournamentName === 'string' &&
    Array.isArray(msg.events);

export const isTournamentDataMessage = (msg: any): msg is TournamentDataMessage =>
    validateMessage(msg) && msg.type === 'tournament_data' && typeof msg.tournamentData === 'object';

export const isServerClosingMessage = (msg: any): msg is ServerClosingMessage =>
    validateMessage(msg) && msg.type === 'server_closing';

export const isTournamentBroadcastMessage = (msg: any): msg is TournamentBroadcastMessage =>
    validateMessage(msg) &&
    msg.type === 'tournament_broadcast' &&
    typeof msg.tournamentName === 'string' &&
    typeof msg.hostIp === 'string' &&
    typeof msg.port === 'number';

export const isPoolsListMessage = (msg: any): msg is PoolsListMessage =>
    validateMessage(msg) && msg.type === 'pools_list' && typeof msg.roundId === 'number' && Array.isArray(msg.pools);

export const isPoolBoutsListMessage = (msg: any): msg is PoolBoutsListMessage =>
    validateMessage(msg) &&
    msg.type === 'pool_bouts_list' &&
    typeof msg.roundId === 'number' &&
    typeof msg.poolId === 'number' &&
    Array.isArray(msg.bouts);

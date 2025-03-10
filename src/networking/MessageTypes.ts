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
  return typeof message === 'object' && 
         message !== null && 
         typeof message.type === 'string';
}

/**
 * Client Messages
 */

/**
 * Join request sent by client to connect to a tournament
 */
export interface JoinRequestMessage extends BaseMessage {
  type: 'join_request';
  clientId?: string;
  tournamentName?: string;
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
 * Update bout score message
 */
export interface UpdateScoreMessage extends BaseMessage {
  type: 'update_score';
  boutId: number;
  scoreA: number;
  scoreB: number;
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
  rounds: any[];  // Using 'any' to accommodate different round formats
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
  | UpdateScoreMessage
  | WelcomeMessage
  | JoinResponseMessage
  | EventsListMessage
  | EventStatusesMessage
  | RoundsListMessage
  | TournamentDataMessage
  | ScoreUpdateMessage
  | ServerClosingMessage
  | TournamentUpdateMessage;

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
  validateMessage(msg) && msg.type === 'join_response' && typeof msg.success === 'boolean';

export const isEventsListMessage = (msg: any): msg is EventsListMessage => 
  validateMessage(msg) && msg.type === 'events_list' && 
  typeof msg.tournamentName === 'string' && Array.isArray(msg.events);

export const isTournamentDataMessage = (msg: any): msg is TournamentDataMessage => 
  validateMessage(msg) && msg.type === 'tournament_data' && typeof msg.tournamentData === 'object';

export const isServerClosingMessage = (msg: any): msg is ServerClosingMessage => 
  validateMessage(msg) && msg.type === 'server_closing';
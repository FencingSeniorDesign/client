// src/data/DrizzleDataProvider.ts
import {Event, Fencer, Round, Official, Tournament, PoolData} from '../navigation/navigation/types'; // Added PoolData import
import { Role } from '../rbac/ability';
import {
  dbListEvents,
  dbGetFencersInEventById,
  dbGetRoundsForEvent,
  dbCreateEvent,
  dbDeleteFencerFromEventById,
  dbCreateFencerByName,
  dbAddFencerToEventById,
  dbDeleteEvent,
  dbAddRound,
  dbUpdateRound,
  dbDeleteRound,
  dbSearchFencers,
  dbGetOfficialsForEvent,
  dbGetRefereesForEvent,
  dbCreateOfficial,
  dbCreateReferee,
  dbAddOfficialToEvent,
  dbListOfficials,
  dbListReferees,
  dbAddRefereeToEvent,
  dbGetOfficialByDeviceId,
  dbGetRefereeByDeviceId,
  dbGetEventById,
  dbGetRoundById,
  dbGetSeedingForRound,
  dbGetPoolsForRound,
  dbGetBoutsForPool,
  dbUpdateBoutScores,
  dbMarkRoundAsComplete,
  dbInitializeRound,
  dbDeleteOfficial,
  dbDeleteReferee,
  dbListOngoingTournaments,
  dbListCompletedTournaments,
  dbGetBoutsForRound, // Added missing import
  dbGetBracketForRound, // Added missing import
  dbSearchClubs, // Added for club search
  dbCreateClub // Added for club creation
} from '../db/DrizzleDatabaseUtils';
import tournamentClient from '../networking/TournamentClient';
import tournamentServer from '../networking/TournamentServer';
import { getClientId } from '../networking/NetworkUtils';

/**
 * A class that abstracts data access for tournament-related operations,
 * determining whether to fetch data from the local database or remote server.
 */
export class TournamentDataProvider {
  // Tournament listing methods
  async listOngoingTournaments(): Promise<Tournament[]> {
    try {
      if (this.isRemoteConnection()) {
        console.log('[DataProvider] Ongoing tournament listings are always local');
        return [];
      }

      // For local tournaments, fetch from database
      return await dbListOngoingTournaments();
    } catch (error) {
      console.error('[DataProvider] Error listing ongoing tournaments:', error);
      return [];
    }
  }

  async listCompletedTournaments(): Promise<Tournament[]> {
    try {
      if (this.isRemoteConnection()) {
        console.log('[DataProvider] Completed tournament listings are always local');
        return [];
      }

      // For local tournaments, fetch from database
      return await dbListCompletedTournaments();
    } catch (error) {
      console.error('[DataProvider] Error listing completed tournaments:', error);
      return [];
    }
  }

  /**
   * Check if we're currently connected to a remote tournament server
   */
  isRemoteConnection(): boolean {
    return tournamentClient.isConnected();
  }

  /**
   * Get events for a tournament
   */
  async getEvents(tournamentName: string): Promise<Event[]> {
    console.log(`[DataProvider] Getting events for ${tournamentName}, remote: ${this.isRemoteConnection()}`);

    // Removed manual cache check

    if (this.isRemoteConnection()) {
      try {
        // Send a new request for events even if we've sent one before
        // This ensures we're not just waiting for a response that might never come
        console.log(`[DataProvider] Sending fresh 'get_events' request to server`);
        tournamentClient.sendMessage({
          type: 'get_events'
        });

        // Wait for the response from server with a longer timeout for first connection scenarios
        console.log(`[DataProvider] Waiting for events_list response from server`);
        const response = await tournamentClient.waitForResponse('events_list', 10000);

        // Process the response
        if (response && response.events) {
          const events = Array.isArray(response.events) ? response.events : [];
          console.log(`[DataProvider] Received ${events.length} events from server`);

          // Removed manual cache setting

          return events;
        }
        return [];
      } catch (error) {
        console.error('[DataProvider] Error fetching remote events:', error);
        // Let Tanstack Query handle retries and error state
        throw error; // Re-throw error for Tanstack Query
      }
    }

    // For local tournaments, fetch from database
    try {
      const events = await dbListEvents(tournamentName);
      console.log(`[DataProvider] Retrieved ${events.length} events from local database`);
      return events;
    } catch (error) {
      console.error('[DataProvider] Error reading local events:', error);
      throw error; // Re-throw error for Tanstack Query
    }
  }

  /**
   * Get rounds for an event
   */
  async getRounds(event: Event | number): Promise<Round[]> {
    const eventId = typeof event === 'number' ? event : event.id;
    console.log(`[DataProvider] Getting rounds for event ${eventId}, remote: ${this.isRemoteConnection()}`);

    if (this.isRemoteConnection()) {
      try {
        // First, check if the event already has rounds embedded in it
        if (typeof event !== 'number' && event.rounds && Array.isArray(event.rounds) && event.rounds.length > 0) {
          console.log(`[DataProvider] Using ${event.rounds.length} embedded rounds from event`);
          return event.rounds;
        }

        // Removed manual retry loop - Tanstack Query handles retries

        console.log(`[DataProvider] Attempting to fetch rounds for event ${eventId}`);

        // Request rounds from server
        tournamentClient.sendMessage({
          type: 'get_rounds',
          eventId
        });

        // Wait for the response with increased timeout
        const response = await tournamentClient.waitForResponse('rounds_list', 8000);

        if (response && Array.isArray(response.rounds)) {
          console.log(`[DataProvider] Received ${response.rounds.length} rounds from server`);
          return response.rounds;
        }

        console.log(`[DataProvider] Invalid rounds response received.`);
        throw new Error('Invalid rounds response from server'); // Throw error for Tanstack Query

      } catch (error) {
        console.error('[DataProvider] Error fetching remote rounds:', error);
        // Let Tanstack Query handle retries and error state
        throw error; // Re-throw error for Tanstack Query
      }
    }

    // For local tournaments, fetch from database
    try {
      const rounds = await dbGetRoundsForEvent(eventId);
      console.log(`[DataProvider] Retrieved ${rounds.length} rounds from local database`);
      return rounds;
    } catch (error) {
      console.error('[DataProvider] Error reading local rounds:', error);
      throw error; // Re-throw error for Tanstack Query
    }
  }

  /**
   * Get fencers for an event
   */
  async getFencers(event: Event): Promise<Fencer[]> {
    console.log(`[DataProvider] Getting fencers for event ${event.id}, remote: ${this.isRemoteConnection()}`);

    if (this.isRemoteConnection()) {
      try {
        // First, check if the event already has fencers embedded in it
        if (event.fencers && Array.isArray(event.fencers) && event.fencers.length > 0) {
          console.log(`[DataProvider] Using ${event.fencers.length} embedded fencers from event`);
          return event.fencers;
        }

        // Request fencers from server
        tournamentClient.sendMessage({
          type: 'get_fencers',
          eventId: event.id
        });

        // Wait for the response
        const response = await tournamentClient.waitForResponse('fencers_list', 5000);

        if (response && Array.isArray(response.fencers)) {
          console.log(`[DataProvider] Received ${response.fencers.length} fencers from server`);
          return response.fencers;
        }

        throw new Error('Failed to fetch fencers from server');
      } catch (error) {
        console.error('[DataProvider] Error fetching remote fencers:', error);
        throw error; // Re-throw error for Tanstack Query
      }
    }

    // For local tournaments, fetch from database
    try {
      const fencers = await dbGetFencersInEventById(event);
      console.log(`[DataProvider] Retrieved ${fencers.length} fencers from local database`);
      return fencers;
    } catch (error) {
      console.error('[DataProvider] Error reading local fencers:', error);
      throw error; // Re-throw error for Tanstack Query
    }
  }

  async getEventById(eventId: number): Promise<Event> {
    console.log(`[DataProvider] Getting event with ID ${eventId}, remote: ${this.isRemoteConnection()}`);

    if (this.isRemoteConnection()) {
      try {
        // Request event from server
        tournamentClient.sendMessage({
          type: 'get_event',
          eventId
        });

        // Wait for the response from server
        const response = await tournamentClient.waitForResponse('event_data');

        // Process the response
        if (response && response.event) {
          console.log(`[DataProvider] Received event from server`);
          return response.event;
        }
        throw new Error('Failed to fetch event from server');
      } catch (error) {
        console.error('[DataProvider] Error fetching remote event:', error);
        throw error; // Re-throw error for Tanstack Query
      }
    }

    // For local tournaments, fetch from database
    try {
      const event = await dbGetEventById(eventId);

      console.log(`[DataProvider] Retrieved event from local database`);
      return event;
    } catch (error) {
      console.error('[DataProvider] Error reading local event:', error);
      throw error; // Re-throw error for Tanstack Query
    }
  }

  /**
   * Get seeding data for a specific round
   */
  async getSeedingForRound(roundId: number): Promise<any[]> {
    console.log(`[DataProvider] Getting seeding for round ${roundId}, remote: ${this.isRemoteConnection()}`);

    if (this.isRemoteConnection()) {
      try {
        // Request seeding data from server
        tournamentClient.sendMessage({
          type: 'get_seeding',
          roundId
        });

        // Wait for the response
        const response = await tournamentClient.waitForResponse('seeding_data', 5000);

        if (response && Array.isArray(response.seeding)) {
          console.log(`[DataProvider] Received ${response.seeding.length} seeding entries from server`);
          return response.seeding;
        }

        throw new Error('Failed to fetch seeding data from server');
      } catch (error) {
        console.error('[DataProvider] Error fetching remote seeding:', error);
        throw error; // Re-throw error for Tanstack Query
      }
    }

    // For local tournaments, fetch from database
    try {
      const seeding = await dbGetSeedingForRound(roundId);

      console.log(`[DataProvider] Retrieved ${seeding.length} seeding entries from local database`);
      return seeding;
    } catch (error) {
      console.error('[DataProvider] Error reading local seeding:', error);
      throw error; // Re-throw error for Tanstack Query
    }
  }

  /**
   * Get status of an event (whether it has started)
   * NOTE: This still fetches full rounds if status isn't embedded.
   * Consider optimizing backend/DB if performance is critical.
   */
  async getEventStatus(event: Event | number): Promise<boolean> {
    const eventId = typeof event === 'number' ? event : event.id;
    console.log(`[DataProvider] Getting status for event ${eventId}, remote: ${this.isRemoteConnection()}`);

    // First, check if the event object has status information
    if (typeof event !== 'number') {
      // Check for various status fields
      if (event.isStarted !== undefined) return !!event.isStarted;
      if (event.has_started !== undefined) return !!event.has_started;
      if (event.started !== undefined) return !!event.started;
      if (event.isstarted !== undefined) return !!event.isstarted;

      // Check embedded rounds
      if (event.rounds && Array.isArray(event.rounds) && event.rounds.length > 0) {
        // Directly return the boolean value from the Round type
        return event.rounds[0].isstarted;
      }
    }

    // If we don't have status info in the event object, get rounds to determine status
    try {
      const rounds = await this.getRounds(eventId); // This uses the updated getRounds

      if (rounds && rounds.length > 0) {
        // Directly return the boolean value from the Round type
        return rounds[0].isstarted;
      }

      return false;
    } catch (error) {
      console.error('[DataProvider] Error determining event status:', error);
      // If fetching rounds failed, we can't determine status
      return false; // Or re-throw if error state is preferred
    }
  }

  /**
   * Search for fencers by name
   */
  async searchFencers(query: string): Promise<Fencer[]> {
    if (this.isRemoteConnection()) {
      try {
        // Request fencer search from server
        tournamentClient.sendMessage({
          type: 'search_fencers',
          query
        });

        // Wait for the response
        const response = await tournamentClient.waitForResponse('fencer_search_results', 5000);

        if (response && Array.isArray(response.fencers)) {
          return response.fencers;
        }

        throw new Error('Failed to fetch fencer search results from server');
      } catch (error) {
        console.error('[DataProvider] Error searching remote fencers:', error);
        throw error; // Re-throw error for Tanstack Query
      }
    }

    // For local tournaments, search in database
    try {
        return await dbSearchFencers(query);
    } catch(error) {
        console.error('[DataProvider] Error searching local fencers:', error);
        throw error; // Re-throw error for Tanstack Query
    }
  }

  /**
   * Search for clubs by name
   */
  async searchClubs(query: string): Promise<any[]> {
    if (this.isRemoteConnection()) {
      try {
        // Request club search from server
        tournamentClient.sendMessage({
          type: 'search_clubs',
          query
        });

        // Wait for the response
        const response = await tournamentClient.waitForResponse('club_search_results', 5000);

        if (response && Array.isArray(response.clubs)) {
          return response.clubs;
        }

        throw new Error('Failed to fetch club search results from server');
      } catch (error) {
        console.error('[DataProvider] Error searching remote clubs:', error);
        throw error; // Re-throw error for Tanstack Query
      }
    }

    // For local tournaments, search in database
    try {
      return await dbSearchClubs(query);
    } catch(error) {
      console.error('[DataProvider] Error searching local clubs:', error);
      throw error; // Re-throw error for Tanstack Query
    }
  }

  /**
   * Create a new club
   */
  async createClub(club: { name: string; abbreviation?: string }): Promise<number> {
    if (this.isRemoteConnection()) {
      try {
        // Send create club request to server
        tournamentClient.sendMessage({
          type: 'create_club',
          club
        });

        // Wait for confirmation
        const response = await tournamentClient.waitForResponse('club_created', 5000);

        return response && response.clubId ? response.clubId : -1;
      } catch (error) {
        console.error('[DataProvider] Error creating club remotely:', error);
        throw error;
      }
    }

    // For local tournaments, create in database
    try {
      return await dbCreateClub(club);
    } catch (error) {
      console.error('[DataProvider] Error creating club locally:', error);
      throw error;
    }
  }

  /**
   * Add a fencer to an event
   */
  async addFencer(fencer: Fencer, event: Event): Promise<boolean> {
    if (this.isRemoteConnection()) {
      try {
        // Send add fencer request to server
        tournamentClient.sendMessage({
          type: 'add_fencer',
          eventId: event.id,
          fencer
        });

        // Wait for confirmation
        const response = await tournamentClient.waitForResponse('fencer_added', 5000);

        return response && response.success === true;
      } catch (error) {
        console.error('[DataProvider] Error adding fencer remotely:', error);
        return false; // Mutations often return success/failure rather than throwing
      }
    }

    // For local tournaments, add to database
    try {
      await dbAddFencerToEventById(fencer, event);
      return true;
    } catch (error) {
      console.error('[DataProvider] Error adding fencer locally:', error);
      return false;
    }
  }

  /**
   * Create a new fencer and optionally add to an event
   */
  async createFencer(fencer: Fencer, event: Event, addToEvent: boolean = true): Promise<boolean> {
    if (this.isRemoteConnection()) {
      try {
        // Send create fencer request to server
        tournamentClient.sendMessage({
          type: 'create_fencer',
          fencer,
          eventId: event.id,
          addToEvent
        });

        // Wait for confirmation
        const response = await tournamentClient.waitForResponse('fencer_created', 5000);

        return response && response.success === true;
      } catch (error) {
        console.error('[DataProvider] Error creating fencer remotely:', error);
        return false;
      }
    }

    // For local tournaments, add to database
    try {
      await dbCreateFencerByName(fencer, event, addToEvent);
      return true;
    } catch (error) {
      console.error('[DataProvider] Error creating fencer locally:', error);
      return false;
    }
  }

  /**
   * Remove a fencer from an event
   */
  async removeFencer(fencer: Fencer, event: Event): Promise<boolean> {
    if (this.isRemoteConnection()) {
      try {
        // Send remove fencer request to server
        tournamentClient.sendMessage({
          type: 'remove_fencer',
          eventId: event.id,
          fencerId: fencer.id
        });

        // Wait for confirmation
        const response = await tournamentClient.waitForResponse('fencer_removed', 5000);

        return response && response.success === true;
      } catch (error) {
        console.error('[DataProvider] Error removing fencer remotely:', error);
        return false;
      }
    }

    // For local tournaments, remove from database
    try {
      await dbDeleteFencerFromEventById(fencer, event);
      return true;
    } catch (error) {
      console.error('[DataProvider] Error removing fencer locally:', error);
      return false;
    }
  }

  /**
   * Create a new event
   */
  async createEvent(tournamentName: string, event: Event): Promise<number> {
    if (this.isRemoteConnection()) {
      try {
        // Send create event request to server
        tournamentClient.sendMessage({
          type: 'create_event',
          tournamentName,
          event
        });

        // Wait for confirmation
        const response = await tournamentClient.waitForResponse('event_created', 5000);

        return response && response.eventId ? response.eventId : -1;
      } catch (error) {
        console.error('[DataProvider] Error creating event remotely:', error);
        return -1;
      }
    }

    // For local tournaments, create in database
    try {
      await dbCreateEvent(tournamentName, event);
      return event.id || -1;
    } catch (error) {
      console.error('[DataProvider] Error creating event locally:', error);
      return -1;
    }
  }

  /**
   * Delete an event
   */
  async deleteEvent(eventId: number): Promise<boolean> {
    if (this.isRemoteConnection()) {
      try {
        // Send delete event request to server
        tournamentClient.sendMessage({
          type: 'delete_event',
          eventId
        });

        // Wait for confirmation
        const response = await tournamentClient.waitForResponse('event_deleted', 5000);

        return response && response.success === true;
      } catch (error) {
        console.error('[DataProvider] Error deleting event remotely:', error);
        return false;
      }
    }

    // For local tournaments, delete from database
    try {
      await dbDeleteEvent(eventId);
      return true;
    } catch (error) {
      console.error('[DataProvider] Error deleting event locally:', error);
      return false;
    }
  }

  /**
   * Add a round to an event
   */
  async addRound(round: Partial<Round>): Promise<number> {
    if (this.isRemoteConnection()) {
      try {
        // Send add round request to server
        tournamentClient.sendMessage({
          type: 'add_round',
          round
        });

        // Wait for confirmation
        const response = await tournamentClient.waitForResponse('round_added', 5000);

        return response && response.roundId ? response.roundId : -1;
      } catch (error) {
        console.error('[DataProvider] Error adding round remotely:', error);
        return -1;
      }
    }

    // For local tournaments, add to database
    try {
      await dbAddRound(round as any);
      return round.id || -1;
    } catch (error) {
      console.error('[DataProvider] Error adding round locally:', error);
      return -1;
    }
  }

  /**
   * Update a round
   */
  async updateRound(round: Round): Promise<boolean> {
    if (this.isRemoteConnection()) {
      try {
        // Send update round request to server
        tournamentClient.sendMessage({
          type: 'update_round',
          round
        });

        // Wait for confirmation
        const response = await tournamentClient.waitForResponse('round_updated', 5000);

        return response && response.success === true;
      } catch (error) {
        console.error('[DataProvider] Error updating round remotely:', error);
        return false;
      }
    }

    // For local tournaments, update in database
    try {
      await dbUpdateRound(round);
      return true;
    } catch (error) {
      console.error('[DataProvider] Error updating round locally:', error);
      return false;
    }
  }

  /**
   * Delete a round
   */
  async deleteRound(roundId: number): Promise<boolean> {
    if (this.isRemoteConnection()) {
      try {
        // Send delete round request to server
        tournamentClient.sendMessage({
          type: 'delete_round',
          roundId
        });

        // Wait for confirmation
        const response = await tournamentClient.waitForResponse('round_deleted', 5000);

        return response && response.success === true;
      } catch (error) {
        console.error('[DataProvider] Error deleting round remotely:', error);
        return false;
      }
    }

    // For local tournaments, delete from database
    try {
      await dbDeleteRound(roundId);
      return true;
    } catch (error) {
      console.error('[DataProvider] Error deleting round locally:', error);
      return false;
    }
  }

  /**
   * Get bouts for a round
   */
  async getBouts(roundId: number): Promise<any[]> {
    console.log(`[DataProvider] Getting bouts for round ${roundId}, remote: ${this.isRemoteConnection()}`);

    if (this.isRemoteConnection()) {
      try {
        // Request bouts from server
        tournamentClient.sendMessage({
          type: 'get_bouts',
          roundId
        });

        // Wait for the response
        const response = await tournamentClient.waitForResponse('bouts_list', 5000);

        if (response && Array.isArray(response.bouts)) {
          console.log(`[DataProvider] Received ${response.bouts.length} bouts from server`);
          return response.bouts;
        }

        throw new Error('Failed to fetch bouts from server');
      } catch (error) {
        console.error('[DataProvider] Error fetching remote bouts:', error);
        throw error; // Re-throw error for Tanstack Query
      }
    }

    // For local tournaments, fetch from database
    try {
      const bouts = await dbGetBoutsForRound(roundId);

      console.log(`[DataProvider] Retrieved ${bouts.length} bouts from local database`);
      return bouts;
    } catch (error) {
      console.error('[DataProvider] Error reading local bouts:', error);
      throw error; // Re-throw error for Tanstack Query
    }
  }

  /**
   * Get bouts for a specific pool in a round
   */
  async getBoutsForPool(roundId: number, poolId: number): Promise<any[]> {
    console.log(`[DataProvider] Getting bouts for pool ${poolId} in round ${roundId}, remote: ${this.isRemoteConnection()}`);

    if (this.isRemoteConnection()) {
      try {
        // Removed manual retry loop - Tanstack Query handles retries

        console.log(`[DataProvider] Attempting to fetch bouts for pool ${poolId} in round ${roundId}`);

        // Request bouts for the pool from server
        tournamentClient.requestPoolBouts(roundId, poolId);

        // Wait for the response with increased timeout
        const response = await tournamentClient.waitForResponse('pool_bouts_list', 8000);

        if (response && Array.isArray(response.bouts)) {
          console.log(`[DataProvider] Received ${response.bouts.length} pool bouts from server`);
          return response.bouts;
        }

        console.log(`[DataProvider] Invalid pool bouts response received.`);
        throw new Error('Invalid pool bouts response from server'); // Throw error for Tanstack Query

      } catch (error) {
        console.error('[DataProvider] Error fetching remote pool bouts:', error);
        throw error; // Re-throw error for Tanstack Query
      }
    }

    // For local tournaments, fetch from database
    try {
      const bouts = await dbGetBoutsForPool(roundId, poolId);

      console.log(`[DataProvider] Retrieved ${bouts.length} pool bouts from local database`);
      return bouts;
    } catch (error) {
      console.error('[DataProvider] Error reading local pool bouts:', error);
      throw error; // Re-throw error for Tanstack Query
    }
  }

  /**
   * Get pools for a round
   */
  async getPools(roundId: number): Promise<PoolData[]> { // Updated return type
    console.log(`[DataProvider] Getting pools for round ${roundId}, remote: ${this.isRemoteConnection()}`);

    if (this.isRemoteConnection()) {
      try {
        // Removed manual retry loop - Tanstack Query handles retries

        console.log(`[DataProvider] Attempting to fetch pools for round ${roundId}`);

        // Request pools from server
        tournamentClient.requestPools(roundId);

        // Wait for the response with longer timeout
        const response = await tournamentClient.waitForResponse('pools_list', 8000);

        if (response && Array.isArray(response.pools)) {
          console.log(`[DataProvider] Received ${response.pools.length} pools from server`);
          return response.pools;
        }

        console.log(`[DataProvider] Invalid pools response received.`);
        throw new Error('Invalid pools response from server'); // Throw error for Tanstack Query

      } catch (error) {
        console.error('[DataProvider] Error fetching remote pools:', error);
        throw error; // Re-throw error for Tanstack Query
      }
    }

    // For local tournaments, fetch from database
    try {
      const poolsForRound = await dbGetPoolsForRound(roundId);

      console.log(`[DataProvider] Retrieved ${poolsForRound.length} pools from local database`);
      return poolsForRound;
    } catch (error) {
      console.error('[DataProvider] Error reading local pools:', error);
      throw error; // Re-throw error for Tanstack Query
    }
  }

  /**
   * Get bracket data for a DE round
   */
  async getBracketData(roundId: number): Promise<any> {
    console.log(`[DataProvider] Getting bracket for round ${roundId}, remote: ${this.isRemoteConnection()}`);

    if (this.isRemoteConnection()) {
      try {
        // Request bracket from server
        tournamentClient.sendMessage({
          type: 'get_bracket',
          roundId
        });

        // Wait for the response
        const response = await tournamentClient.waitForResponse('bracket_data', 5000);

        if (response && response.bracket) {
          console.log(`[DataProvider] Received bracket from server`);
          return response.bracket;
        }

        throw new Error('Failed to fetch bracket from server');
      } catch (error) {
        console.error('[DataProvider] Error fetching remote bracket:', error);
        throw error; // Re-throw error for Tanstack Query
      }
    }

    // For local tournaments, fetch from database
    try {
      const bracketData = await dbGetBracketForRound?.(roundId);

      console.log(`[DataProvider] Retrieved bracket from local database`);
      return bracketData;
    } catch (error) {
      console.error('[DataProvider] Error reading local bracket:', error);
      throw error; // Re-throw error for Tanstack Query
    }
  }

  /**
   * Update bout score
   */
  async updateBoutScore(boutId: number, scoreA: number, scoreB: number): Promise<boolean> {
    console.log(`[DataProvider] Updating bout ${boutId} score to ${scoreA}-${scoreB}, remote: ${this.isRemoteConnection()}`);

    if (this.isRemoteConnection()) {
      try {
        // Send update score request to server
        tournamentClient.sendMessage({
          type: 'update_bout_score',
          boutId,
          scoreA,
          scoreB
        });

        // Wait for confirmation
        const response = await tournamentClient.waitForResponse('bout_score_updated', 5000);

        return response && response.success === true;
      } catch (error) {
        console.error('[DataProvider] Error updating bout score remotely:', error);
        return false;
      }
    }

    // For local tournaments, update in database
    try {
      // We can't just update the score because we need the fencer IDs
      // This would require additional lookup to get fencer IDs
      console.error('[DataProvider] Error updating bout score locally: missing implementation');
      return false;
    } catch (error) {
      console.error('[DataProvider] Error updating bout score locally:', error);
      return false;
    }
  }

  /**
   * Update pool bout scores
   */
  async updatePoolBoutScores(
    boutId: number,
    scoreA: number,
    scoreB: number,
    fencerAId: number,
    fencerBId: number,
    roundId?: number,
    poolId?: number
  ): Promise<boolean> {
    console.log(`[DataProvider] Updating pool bout ${boutId} score to ${scoreA}-${scoreB}, remote: ${this.isRemoteConnection()}`);

    if (this.isRemoteConnection()) {
      try {
        // Send update pool bout scores request to server with round and pool IDs for targeted cache invalidation
        tournamentClient.updatePoolBoutScores(boutId, scoreA, scoreB, fencerAId, fencerBId, roundId, poolId);

        // Wait for confirmation
        const response = await tournamentClient.waitForResponse('bout_scores_updated', 10000); // Increased timeout

        console.log(`[DataProvider] Received response for updatePoolBoutScores:`, response);
        return response && response.success === true;
      } catch (error) {
        console.error('[DataProvider] Error updating pool bout scores remotely:', error);
        return false;
      }
    }

    // For local tournaments, update in database
    try {
      // Pass all parameters to the database utility
      await dbUpdateBoutScores(boutId, scoreA, scoreB, fencerAId, fencerBId);

      return true;
    } catch (error) {
      console.error('[DataProvider] Error updating pool bout scores locally:', error);
      return false;
    }
  }

  /**
   * Initialize a round (start a round)
   */
  async initializeRound(eventId: number, roundId: number): Promise<boolean> {
    console.log(`[DataProvider] Initializing round ${roundId} for event ${eventId}, remote: ${this.isRemoteConnection()}`);

    if (this.isRemoteConnection()) {
      try {
        // Send initialize round request to server using the proper method
        tournamentClient.requestInitializeRound(eventId, roundId);

        // Wait for confirmation
        const response = await tournamentClient.waitForResponse('round_initialized', 10000);

        return response && response.success === true;
      } catch (error) {
        console.error('[DataProvider] Error initializing round remotely:', error);
        return false;
      }
    }

    // For local tournaments, initialize in database
    try {
      // Get the necessary data to initialize the round
      const event = await dbGetEventById(eventId);
      const round = await dbGetRoundById(roundId);
      const fencers = await this.getFencers(event);

      // Initialize the round
      await dbInitializeRound(event, round, fencers);

      return true;
    } catch (error) {
      console.error('[DataProvider] Error initializing round locally:', error);
      return false;
    }
  }

  /**
   * Complete a round
   */
  async completeRound(roundId: number): Promise<boolean> {
    console.log(`[DataProvider] Completing round ${roundId}, remote: ${this.isRemoteConnection()}`);

    if (this.isRemoteConnection()) {
      try {
        // Send complete round request to server
        tournamentClient.sendMessage({
          type: 'complete_round',
          roundId
        });

        // Wait for confirmation
        const response = await tournamentClient.waitForResponse('round_completed', 10000);

        return response && response.success === true;
      } catch (error) {
        console.error('[DataProvider] Error completing round remotely:', error);
        return false;
      }
    }

    // For local tournaments, complete in database
    try {
      await dbMarkRoundAsComplete(roundId);

      return true;
    } catch (error) {
      console.error('[DataProvider] Error completing round locally:', error);
      return false;
    }
  }
  /**
   * Get officials for a tournament
   */
  async getOfficials(tournamentName: string): Promise<Official[]> {
    console.log(`[DataProvider] Getting officials for tournament ${tournamentName}, remote: ${this.isRemoteConnection()}`);

    if (this.isRemoteConnection()) {
      try {
        // Request officials from server
        tournamentClient.sendMessage({
          type: 'get_officials',
          tournamentName
        });

        // Wait for the response
        const response = await tournamentClient.waitForResponse('officials_list', 5000);

        if (response && Array.isArray(response.officials)) {
          console.log(`[DataProvider] Received ${response.officials.length} officials from server`);
          return response.officials;
        }

        throw new Error('Failed to fetch officials from server');
      } catch (error) {
        console.error('[DataProvider] Error fetching remote officials:', error);
        throw error; // Re-throw error for Tanstack Query
      }
    }

    // For local tournaments, fetch from database
    try {
      // Get all officials for the tournament
      // Note: We'll need to update the DB functions to support tournament-wide officials
      const officials = await dbListOfficials();
      console.log(`[DataProvider] Retrieved ${officials.length} officials from local database`);
      return officials;
    } catch (error) {
      console.error('[DataProvider] Error reading local officials:', error);
      throw error; // Re-throw error for Tanstack Query
    }
  }

  /**
   * Get referees for a tournament
   */
  async getReferees(tournamentName: string): Promise<Official[]> {
    console.log(`[DataProvider] Getting referees for tournament ${tournamentName}, remote: ${this.isRemoteConnection()}`);

    if (this.isRemoteConnection()) {
      try {
        // Request referees from server
        tournamentClient.sendMessage({
          type: 'get_referees',
          tournamentName
        });

        // Wait for the response
        const response = await tournamentClient.waitForResponse('referees_list', 5000);

        if (response && Array.isArray(response.referees)) {
          console.log(`[DataProvider] Received ${response.referees.length} referees from server`);
          return response.referees;
        }

        throw new Error('Failed to fetch referees from server');
      } catch (error) {
        console.error('[DataProvider] Error fetching remote referees:', error);
        throw error; // Re-throw error for Tanstack Query
      }
    }

    // For local tournaments, fetch from database
    try {
      // Get all referees for the tournament
      // Note: We'll need to update the DB functions to support tournament-wide referees
      const referees = await dbListReferees();
      console.log(`[DataProvider] Retrieved ${referees.length} referees from local database`);
      return referees;
    } catch (error) {
      console.error('[DataProvider] Error reading local referees:', error);
      throw error; // Re-throw error for Tanstack Query
    }
  }

  /**
   * Add an official to the tournament
   */
  async addOfficial(official: Official): Promise<boolean> {
    console.log(`[DataProvider] Adding official to tournament, remote: ${this.isRemoteConnection()}`);

    if (this.isRemoteConnection()) {
      try {
        // Send add official request to server
        tournamentClient.sendMessage({
          type: 'add_official',
          official
        });

        // Wait for confirmation
        const response = await tournamentClient.waitForResponse('official_added', 5000);

        return response && response.success === true;
      } catch (error) {
        console.error('[DataProvider] Error adding official remotely:', error);
        return false;
      }
    }

    // For local tournaments, add to database
    try {
      await dbCreateOfficial(official);
      return true;
    } catch (error) {
      console.error('[DataProvider] Error adding official locally:', error);
      return false;
    }
  }

  /**
   * Add a referee to the tournament
   */
  async addReferee(referee: Official): Promise<boolean> {
    console.log(`[DataProvider] Adding referee to tournament, remote: ${this.isRemoteConnection()}`);

    if (this.isRemoteConnection()) {
      try {
        // Send add referee request to server
        tournamentClient.sendMessage({
          type: 'add_referee',
          referee
        });

        // Wait for confirmation
        const response = await tournamentClient.waitForResponse('referee_added', 5000);

        return response && response.success === true;
      } catch (error) {
        console.error('[DataProvider] Error adding referee remotely:', error);
        return false;
      }
    }

    // For local tournaments, add to database
    try {
      await dbCreateReferee(referee);
      return true;
    } catch (error) {
      console.error('[DataProvider] Error adding referee locally:', error);
      return false;
    }
  }

  /**
   * Remove a referee from the tournament
   */
  async removeReferee(refereeId: number): Promise<boolean> {
    console.log(`[DataProvider] Removing referee ${refereeId} from tournament, remote: ${this.isRemoteConnection()}`);

    if (this.isRemoteConnection()) {
      try {
        // Send remove referee request to server
        tournamentClient.sendMessage({
          type: 'remove_referee',
          refereeId
        });

        // Wait for confirmation
        const response = await tournamentClient.waitForResponse('referee_removed', 5000);

        return response && response.success === true;
      } catch (error) {
        console.error('[DataProvider] Error removing referee remotely:', error);
        return false;
      }
    }

    // For local tournaments, remove from database
    try {
      await dbDeleteReferee(refereeId);
      return true;
    } catch (error) {
      console.error('[DataProvider] Error removing referee locally:', error);
      return false;
    }
  }

  /**
   * Remove an official from the tournament
   */
  async removeOfficial(officialId: number): Promise<boolean> {
    console.log(`[DataProvider] Removing official ${officialId} from tournament, remote: ${this.isRemoteConnection()}`);

    if (this.isRemoteConnection()) {
      try {
        // Send remove official request to server
        tournamentClient.sendMessage({
          type: 'remove_official',
          officialId
        });

        // Wait for confirmation
        const response = await tournamentClient.waitForResponse('official_removed', 5000);

        return response && response.success === true;
      } catch (error) {
        console.error('[DataProvider] Error removing official remotely:', error);
        return false;
      }
    }

    // For local tournaments, remove from database
    try {
      await dbDeleteOfficial(officialId);
      return true;
    } catch (error) {
      console.error('[DataProvider] Error removing official locally:', error);
      return false;
    }
  }

  /**
   * Check user role by device ID
   */
  async checkUserRole(deviceId: string, eventId: number): Promise<string> {
    console.log(`[DataProvider] Checking role for device ID ${deviceId} in event ${eventId}`);

    if (this.isRemoteConnection()) {
      try {
        // Request role check from server
        tournamentClient.sendMessage({
          type: 'check_role',
          deviceId,
          eventId
        });

        // Wait for the response
        const response = await tournamentClient.waitForResponse('role_check_result', 5000);

        if (response && response.role) {
          console.log(`[DataProvider] Received role from server: ${response.role}`);
          return response.role;
        }

        throw new Error('Failed to get role from server');
      } catch (error) {
        console.error('[DataProvider] Error checking role remotely:', error);
        // Default to spectator on error, or re-throw if needed
        return 'spectator';
      }
    }

    // For local tournaments, check in database
    try {
      // Check if device ID is in officials table
      const official = await dbGetOfficialByDeviceId(deviceId);
      if (official) {
        return 'tournament_official';
      }

      // Check if device ID is in referees table
      const referee = await dbGetRefereeByDeviceId(deviceId);
      if (referee) {
        return 'referee';
      }

      // Default to spectator
      return 'spectator';
    } catch (error) {
      console.error('[DataProvider] Error checking role locally:', error);
      return 'spectator';
    }
  }

  /**
   * Get the role (Official, Referee, Viewer) for a specific device within a given tournament.
   * Checks against the tournament's official and referee lists by iterating through its events.
   * NOTE: This should only be called for local data access scenarios. Remote role
   * determination should happen server-side.
   */
  async getTournamentRoleForDevice(deviceId: string, tournamentName: string): Promise<Role> {
    console.log(`[DataProvider] Checking tournament role for device ${deviceId} in tournament ${tournamentName}`);
    if (!deviceId || !tournamentName) {
      console.log('[DataProvider] Missing deviceId or tournamentName, defaulting to VIEWER');
      return Role.VIEWER;
    }

    // This method assumes local data access.
    if (this.isRemoteConnection()) {
      console.warn('[DataProvider] getTournamentRoleForDevice called on remote connection. Defaulting to VIEWER.');
      return Role.VIEWER;
    }

    try {
      // 1. Get all events for the tournament
      const events = await dbListEvents(tournamentName);
      if (!events || events.length === 0) {
        console.log(`[DataProvider] No events found for tournament ${tournamentName}. Defaulting to VIEWER.`);
        return Role.VIEWER;
      }

      // 2. Iterate through events and check official/referee lists for each event
      for (const event of events) {
        const eventId = event.id;

        // Check officials for this event
        const officials = await dbGetOfficialsForEvent(eventId);
        const isOfficial = officials.some(official => official.deviceId === deviceId);
        if (isOfficial) {
          console.log(`[DataProvider] Device ${deviceId} is an OFFICIAL for event ${eventId} in tournament ${tournamentName}`);
          return Role.OFFICIAL;
        }

        // Check referees for this event
        const referees = await dbGetRefereesForEvent(eventId);
        const isReferee = referees.some(referee => referee.deviceId === deviceId);
        if (isReferee) {
          console.log(`[DataProvider] Device ${deviceId} is a REFEREE for event ${eventId} in tournament ${tournamentName}`);
          return Role.REFEREE;
        }
      }

      // 3. If not found in any event's list, default to Viewer
      console.log(`[DataProvider] Device ${deviceId} is a VIEWER for tournament ${tournamentName}`);
      return Role.VIEWER;
    } catch (error) {
      console.error(`[DataProvider] Error checking tournament role for device ${deviceId}:`, error);
      return Role.VIEWER; // Default to viewer on error
    }
  }

  /**
   * Get round details by ID
   */
  async getRoundById(roundId: number): Promise<any> {
    console.log(`[DataProvider] Getting round status for round ${roundId}, remote: ${this.isRemoteConnection()}`);

    if (this.isRemoteConnection()) {
      try {
        // Request round data from server
        tournamentClient.sendMessage({
          type: 'get_rounds',
          eventId: roundId
        });

        // Wait for the response
        const response = await tournamentClient.waitForResponse('rounds_list', 5000);

        if (response && Array.isArray(response.rounds) && response.rounds.length > 0) {
          console.log(`[DataProvider] Received rounds data from server`);
          // Use the first round that matches the roundId
          const round = response.rounds.find((r: any) => r.id === roundId);
          if (round) {
            return round;
          }
        }

        throw new Error('Failed to fetch round data from server');
      } catch (error) {
        console.error('[DataProvider] Error fetching remote round data:', error);
        throw error; // Re-throw error for Tanstack Query
      }
    }

    // For local tournaments, fetch from database
    try {
      const round = await dbGetRoundById(roundId);
      console.log(`[DataProvider] Retrieved round data from local database`);
      return round;
    } catch (error) {
      console.error('[DataProvider] Error reading local round data:', error);
      throw error; // Re-throw error for Tanstack Query
    }
  }
}

// Create a singleton instance
const tournamentDataProvider = new TournamentDataProvider();

export default tournamentDataProvider;

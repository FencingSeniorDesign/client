/**
 * Database Views Service
 * Provides functions to access database views
 */
import { db } from './client';
import { 
  eventFencersView, 
  eventRoundsView, 
  fencerResultsView, 
  deBracketView,
  poolStandingsView 
} from './schema_views';
import { eq, and, desc, asc } from 'drizzle-orm';

/**
 * Event Fencers View Service
 * Access the denormalized view of fencers registered for events
 */
export const eventFencersViewService = {
  /**
   * Get all fencers for a specific event
   */
  getByEventId: async (eventId: number) => {
    return await db.select()
      .from(eventFencersView)
      .where(eq(eventFencersView.eventId, eventId))
      .orderBy(asc(eventFencersView.lname));
  },
  
  /**
   * Get all events for a specific fencer
   */
  getByFencerId: async (fencerId: number) => {
    return await db.select()
      .from(eventFencersView)
      .where(eq(eventFencersView.fencerId, fencerId))
      .orderBy(asc(eventFencersView.tname));
  },
  
  /**
   * Get all fencers for a specific tournament
   */
  getByTournament: async (tournamentName: string) => {
    return await db.select()
      .from(eventFencersView)
      .where(eq(eventFencersView.tname, tournamentName))
      .orderBy(asc(eventFencersView.lname));
  }
};

/**
 * Event Rounds View Service
 * Access the denormalized view of rounds for events
 */
export const eventRoundsViewService = {
  /**
   * Get all rounds for a specific event
   */
  getByEventId: async (eventId: number) => {
    return await db.select()
      .from(eventRoundsView)
      .where(eq(eventRoundsView.eventId, eventId))
      .orderBy(asc(eventRoundsView.roundOrder));
  },
  
  /**
   * Get all incomplete rounds for a specific event
   */
  getIncompleteByEventId: async (eventId: number) => {
    return await db.select()
      .from(eventRoundsView)
      .where(and(
        eq(eventRoundsView.eventId, eventId),
        eq(eventRoundsView.isComplete, 0)
      ))
      .orderBy(asc(eventRoundsView.roundOrder));
  },
  
  /**
   * Get all rounds for a specific tournament
   */
  getByTournament: async (tournamentName: string) => {
    return await db.select()
      .from(eventRoundsView)
      .where(eq(eventRoundsView.tname, tournamentName))
      .orderBy(asc(eventRoundsView.tname), asc(eventRoundsView.roundOrder));
  }
};

/**
 * Fencer Results View Service
 * Access the aggregated results for fencers
 */
export const fencerResultsViewService = {
  /**
   * Get results for all fencers in a specific event/round
   */
  getByEventAndRound: async (eventId: number, roundId: number) => {
    return await db.select()
      .from(fencerResultsView)
      .where(and(
        eq(fencerResultsView.eventId, eventId),
        eq(fencerResultsView.roundId, roundId)
      ))
      .orderBy(desc(fencerResultsView.victoryPercentage), desc(fencerResultsView.totalTouches));
  },
  
  /**
   * Get results for a specific fencer across all events
   */
  getByFencerId: async (fencerId: number) => {
    return await db.select()
      .from(fencerResultsView)
      .where(eq(fencerResultsView.fencerId, fencerId))
      .orderBy(asc(fencerResultsView.eventId), asc(fencerResultsView.roundId));
  }
};

/**
 * DE Bracket View Service
 * Access the denormalized view of DE brackets
 */
export const deBracketViewService = {
  /**
   * Get all bouts for a specific round
   */
  getByRoundId: async (roundId: number) => {
    return await db.select()
      .from(deBracketView)
      .where(eq(deBracketView.roundId, roundId))
      .orderBy(asc(deBracketView.bracketType), asc(deBracketView.bracketRound), asc(deBracketView.boutOrder));
  },
  
  /**
   * Get all bouts for a specific bracket type in a round
   */
  getByBracketType: async (roundId: number, bracketType: string) => {
    return await db.select()
      .from(deBracketView)
      .where(and(
        eq(deBracketView.roundId, roundId),
        eq(deBracketView.bracketType, bracketType)
      ))
      .orderBy(asc(deBracketView.bracketRound), asc(deBracketView.boutOrder));
  },
  
  /**
   * Get a specific bout by ID
   */
  getByBoutId: async (boutId: number) => {
    return await db.select()
      .from(deBracketView)
      .where(eq(deBracketView.boutId, boutId))
      .limit(1);
  }
};

/**
 * Pool Standings View Service
 * Access the denormalized view of pool standings
 */
export const poolStandingsViewService = {
  /**
   * Get standings for a specific pool
   */
  getByPoolId: async (roundId: number, poolId: number) => {
    return await db.select()
      .from(poolStandingsView)
      .where(and(
        eq(poolStandingsView.roundId, roundId),
        eq(poolStandingsView.poolId, poolId)
      ))
      .orderBy(
        desc(poolStandingsView.victoryPercent), 
        desc(poolStandingsView.indicatorValue)
      );
  },
  
  /**
   * Get standings for all pools in a round
   */
  getByRoundId: async (roundId: number) => {
    return await db.select()
      .from(poolStandingsView)
      .where(eq(poolStandingsView.roundId, roundId))
      .orderBy(
        asc(poolStandingsView.poolId),
        desc(poolStandingsView.victoryPercent), 
        desc(poolStandingsView.indicatorValue)
      );
  },
  
  /**
   * Get standings for a specific fencer across all pools
   */
  getByFencerId: async (fencerId: number) => {
    return await db.select()
      .from(poolStandingsView)
      .where(eq(poolStandingsView.fencerId, fencerId))
      .orderBy(asc(poolStandingsView.roundId), asc(poolStandingsView.poolId));
  }
};

/**
 * Combined export of all view services
 */
export const viewServices = {
  eventFencers: eventFencersViewService,
  eventRounds: eventRoundsViewService,
  fencerResults: fencerResultsViewService,
  deBracket: deBracketViewService,
  poolStandings: poolStandingsViewService
};
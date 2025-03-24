/**
 * Database View Hooks
 * React hooks for accessing database views with Tanstack Query
 */
import { useQuery } from '@tanstack/react-query';
import { viewServices } from './views';

/**
 * Event Fencers View Hooks
 */
export const useEventFencersView = {
  /**
   * Get all fencers for a specific event
   */
  byEventId: (eventId: number) => {
    return useQuery({
      queryKey: ['eventFencersView', 'byEventId', eventId],
      queryFn: () => viewServices.eventFencers.getByEventId(eventId),
      enabled: !!eventId
    });
  },
  
  /**
   * Get all events for a specific fencer
   */
  byFencerId: (fencerId: number) => {
    return useQuery({
      queryKey: ['eventFencersView', 'byFencerId', fencerId],
      queryFn: () => viewServices.eventFencers.getByFencerId(fencerId),
      enabled: !!fencerId
    });
  },
  
  /**
   * Get all fencers for a specific tournament
   */
  byTournament: (tournamentName: string) => {
    return useQuery({
      queryKey: ['eventFencersView', 'byTournament', tournamentName],
      queryFn: () => viewServices.eventFencers.getByTournament(tournamentName),
      enabled: !!tournamentName
    });
  }
};

/**
 * Event Rounds View Hooks
 */
export const useEventRoundsView = {
  /**
   * Get all rounds for a specific event
   */
  byEventId: (eventId: number) => {
    return useQuery({
      queryKey: ['eventRoundsView', 'byEventId', eventId],
      queryFn: () => viewServices.eventRounds.getByEventId(eventId),
      enabled: !!eventId
    });
  },
  
  /**
   * Get all incomplete rounds for a specific event
   */
  incompleteByEventId: (eventId: number) => {
    return useQuery({
      queryKey: ['eventRoundsView', 'incompleteByEventId', eventId],
      queryFn: () => viewServices.eventRounds.getIncompleteByEventId(eventId),
      enabled: !!eventId
    });
  },
  
  /**
   * Get all rounds for a specific tournament
   */
  byTournament: (tournamentName: string) => {
    return useQuery({
      queryKey: ['eventRoundsView', 'byTournament', tournamentName],
      queryFn: () => viewServices.eventRounds.getByTournament(tournamentName),
      enabled: !!tournamentName
    });
  }
};

/**
 * Fencer Results View Hooks
 */
export const useFencerResultsView = {
  /**
   * Get results for all fencers in a specific event/round
   */
  byEventAndRound: (eventId: number, roundId: number) => {
    return useQuery({
      queryKey: ['fencerResultsView', 'byEventAndRound', eventId, roundId],
      queryFn: () => viewServices.fencerResults.getByEventAndRound(eventId, roundId),
      enabled: !!eventId && !!roundId
    });
  },
  
  /**
   * Get results for a specific fencer across all events
   */
  byFencerId: (fencerId: number) => {
    return useQuery({
      queryKey: ['fencerResultsView', 'byFencerId', fencerId],
      queryFn: () => viewServices.fencerResults.getByFencerId(fencerId),
      enabled: !!fencerId
    });
  }
};

/**
 * DE Bracket View Hooks
 */
export const useDEBracketView = {
  /**
   * Get all bouts for a specific round
   */
  byRoundId: (roundId: number) => {
    return useQuery({
      queryKey: ['deBracketView', 'byRoundId', roundId],
      queryFn: () => viewServices.deBracket.getByRoundId(roundId),
      enabled: !!roundId
    });
  },
  
  /**
   * Get all bouts for a specific bracket type in a round
   */
  byBracketType: (roundId: number, bracketType: string) => {
    return useQuery({
      queryKey: ['deBracketView', 'byBracketType', roundId, bracketType],
      queryFn: () => viewServices.deBracket.getByBracketType(roundId, bracketType),
      enabled: !!roundId && !!bracketType
    });
  },
  
  /**
   * Get a specific bout by ID
   */
  byBoutId: (boutId: number | null) => {
    return useQuery({
      queryKey: ['deBracketView', 'byBoutId', boutId],
      queryFn: () => viewServices.deBracket.getByBoutId(boutId as number),
      enabled: !!boutId
    });
  }
};

/**
 * Pool Standings View Hooks
 */
export const usePoolStandingsView = {
  /**
   * Get standings for a specific pool
   */
  byPoolId: (roundId: number, poolId: number) => {
    return useQuery({
      queryKey: ['poolStandingsView', 'byPoolId', roundId, poolId],
      queryFn: () => viewServices.poolStandings.getByPoolId(roundId, poolId),
      enabled: !!roundId && !!poolId
    });
  },
  
  /**
   * Get standings for all pools in a round
   */
  byRoundId: (roundId: number) => {
    return useQuery({
      queryKey: ['poolStandingsView', 'byRoundId', roundId],
      queryFn: () => viewServices.poolStandings.getByRoundId(roundId),
      enabled: !!roundId
    });
  },
  
  /**
   * Get standings for a specific fencer across all pools
   */
  byFencerId: (fencerId: number) => {
    return useQuery({
      queryKey: ['poolStandingsView', 'byFencerId', fencerId],
      queryFn: () => viewServices.poolStandings.getByFencerId(fencerId),
      enabled: !!fencerId
    });
  }
};

/**
 * Combined export of all view hooks
 */
export const viewHooks = {
  useEventFencers: useEventFencersView,
  useEventRounds: useEventRoundsView,
  useFencerResults: useFencerResultsView,
  useDEBracket: useDEBracketView,
  usePoolStandings: usePoolStandingsView
};
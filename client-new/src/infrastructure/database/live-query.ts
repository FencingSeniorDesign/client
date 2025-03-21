import { useLiveQuery as drizzleUseLiveQuery } from 'drizzle-orm/expo-sqlite';
import { eq, and, SQL } from 'drizzle-orm';
import db from './client';
import { bouts, events, fencerBouts } from './schema';

/**
 * Re-export the Drizzle useLiveQuery hook
 */
export const useLiveQuery = drizzleUseLiveQuery;

/**
 * Custom hook for listening to event status changes
 * @param eventId The ID of the event to monitor
 */
export function useEventStatusLiveQuery(eventId: number) {
  return useLiveQuery(
    db.select().from(events).where(eq(events.id, eventId))
  );
}

/**
 * Custom hook for monitoring bout updates
 * @param boutId The ID of the bout to monitor
 */
export function useBoutLiveQuery(boutId: number) {
  return useLiveQuery(
    db.select().from(bouts).where(eq(bouts.id, boutId))
  );
}

/**
 * Custom hook for monitoring bout scores
 * @param boutId The ID of the bout to monitor
 */
export function useBoutScoresLiveQuery(boutId: number) {
  return useLiveQuery(
    db.select()
      .from(fencerBouts)
      .where(eq(fencerBouts.boutId, boutId))
  );
}

/**
 * Custom hook for monitoring all bouts in a round
 * @param roundId The ID of the round to monitor
 */
export function useRoundBoutsLiveQuery(roundId: number) {
  return useLiveQuery(
    db.select()
      .from(bouts)
      .where(eq(bouts.roundId, roundId))
  );
}

/**
 * Custom hook for monitoring all active bouts (those with a referee assigned)
 */
export function useActiveBoutsLiveQuery() {
  return useLiveQuery(
    db.select()
      .from(bouts)
      .where(
        and(
          // Only select bouts that have a referee assigned (not null)
          // Use IS NOT NULL condition
          // This is a simplified example - might need adjustment based on how referee assignment is stored
          db.sql`${bouts.referee} IS NOT NULL`
        )
      )
  );
}

/**
 * Custom hook for monitoring both bout details and scores together
 * @param boutId The ID of the bout to monitor
 */
export function useCompleteBoutLiveQuery(boutId: number) {
  // First, get the bout details
  const { data: boutData, error: boutError } = useLiveQuery(
    db.select().from(bouts).where(eq(bouts.id, boutId))
  );

  // Then, get the scores
  const { data: scoresData, error: scoresError } = useLiveQuery(
    db.select()
      .from(fencerBouts)
      .where(eq(fencerBouts.boutId, boutId))
  );

  // Combine the results
  return {
    bout: boutData?.[0],
    scores: scoresData,
    error: boutError || scoresError,
    isLoading: !boutData && !boutError,
  };
}
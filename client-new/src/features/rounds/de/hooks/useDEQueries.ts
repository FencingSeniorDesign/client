/**
 * DE Bracket Queries
 * Provides React Query hooks for direct elimination bracket data
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createQueryKeys, useInvalidateQueries } from '../../../../infrastructure/query/utils';
import { useLiveQuery } from '../../../../infrastructure/database/live-query';
import { bouts, deBracketBouts, fencers, fencerBouts } from '../../../../infrastructure/database/schema';
import db from '../../../../infrastructure/database/client';
import { eq, and, or, inArray } from 'drizzle-orm';

// Define a service for DE operations (this would normally be in a separate file)
const deService = {
  /**
   * Get all DE bouts for a round
   */
  getDEBouts: async (roundId: number) => {
    const result = await db
      .select({
        id: bouts.id,
        tableof: deBracketBouts.bracketType,
        lfencer: bouts.lFencer,
        rfencer: bouts.rFencer,
        victor: bouts.victor,
        bracket_round: deBracketBouts.bracketRound,
        bout_order: deBracketBouts.boutOrder,
        next_bout_id: deBracketBouts.nextBoutId,
        loser_next_bout_id: deBracketBouts.loserNextBoutId,
        // Add left/right fencer name/info by joining with fencers
        left_fname: db.selectFrom(fencers)
          .select(fencers.fname)
          .where(eq(fencers.id, bouts.lFencer))
          .as('left_fname'),
        left_lname: db.selectFrom(fencers)
          .select(fencers.lname)
          .where(eq(fencers.id, bouts.lFencer))
          .as('left_lname'),
        right_fname: db.selectFrom(fencers)
          .select(fencers.fname)
          .where(eq(fencers.id, bouts.rFencer))
          .as('right_fname'),
        right_lname: db.selectFrom(fencers)
          .select(fencers.lname)
          .where(eq(fencers.id, bouts.rFencer))
          .as('right_lname'),
        // Get scores from fencerBouts
        left_score: db.selectFrom(fencerBouts)
          .select(fencerBouts.score)
          .where(and(
            eq(fencerBouts.boutId, bouts.id),
            eq(fencerBouts.fencerId, bouts.lFencer)
          ))
          .as('left_score'),
        right_score: db.selectFrom(fencerBouts)
          .select(fencerBouts.score)
          .where(and(
            eq(fencerBouts.boutId, bouts.id),
            eq(fencerBouts.fencerId, bouts.rFencer)
          ))
          .as('right_score'),
      })
      .from(deBracketBouts)
      .leftJoin(bouts, eq(bouts.id, deBracketBouts.boutId))
      .where(eq(deBracketBouts.roundId, roundId));
      
    return result;
  },
  
  /**
   * Get a single DE bout by ID
   */
  getDEBoutById: async (boutId: number) => {
    const result = await db
      .select({
        id: bouts.id,
        tableof: deBracketBouts.bracketType,
        lfencer: bouts.lFencer,
        rfencer: bouts.rFencer,
        victor: bouts.victor,
        bracket_round: deBracketBouts.bracketRound,
        bout_order: deBracketBouts.boutOrder,
        next_bout_id: deBracketBouts.nextBoutId,
        loser_next_bout_id: deBracketBouts.loserNextBoutId,
        // Add left/right fencer name/info
        left_fname: db.selectFrom(fencers)
          .select(fencers.fname)
          .where(eq(fencers.id, bouts.lFencer))
          .as('left_fname'),
        left_lname: db.selectFrom(fencers)
          .select(fencers.lname)
          .where(eq(fencers.id, bouts.lFencer))
          .as('left_lname'),
        right_fname: db.selectFrom(fencers)
          .select(fencers.fname)
          .where(eq(fencers.id, bouts.rFencer))
          .as('right_fname'),
        right_lname: db.selectFrom(fencers)
          .select(fencers.lname)
          .where(eq(fencers.id, bouts.rFencer))
          .as('right_lname'),
        // Get scores
        left_score: db.selectFrom(fencerBouts)
          .select(fencerBouts.score)
          .where(and(
            eq(fencerBouts.boutId, bouts.id),
            eq(fencerBouts.fencerId, bouts.lFencer)
          ))
          .as('left_score'),
        right_score: db.selectFrom(fencerBouts)
          .select(fencerBouts.score)
          .where(and(
            eq(fencerBouts.boutId, bouts.id),
            eq(fencerBouts.fencerId, bouts.rFencer)
          ))
          .as('right_score'),
      })
      .from(deBracketBouts)
      .leftJoin(bouts, eq(bouts.id, deBracketBouts.boutId))
      .where(eq(bouts.id, boutId));
      
    return result[0];
  },
  
  /**
   * Update a DE bout with scores and determine/advance the winner
   */
  updateDEBout: async ({
    boutId,
    scoreA,
    scoreB,
    fencerAId,
    fencerBId
  }: {
    boutId: number,
    scoreA: number,
    scoreB: number,
    fencerAId: number,
    fencerBId: number
  }) => {
    // Start a transaction
    return await db.transaction(async (tx) => {
      // Determine the winner
      const victorId = scoreA > scoreB ? fencerAId : fencerBId;
      
      // Update the bout with the victor
      await tx.update(bouts)
        .set({ victor: victorId })
        .where(eq(bouts.id, boutId));
      
      // Update or insert score for fencer A
      await tx
        .insert(fencerBouts)
        .values({
          boutId,
          fencerId: fencerAId,
          score: scoreA
        })
        .onConflictDoUpdate({
          target: [fencerBouts.boutId, fencerBouts.fencerId],
          set: { score: scoreA }
        });
      
      // Update or insert score for fencer B
      await tx
        .insert(fencerBouts)
        .values({
          boutId,
          fencerId: fencerBId,
          score: scoreB
        })
        .onConflictDoUpdate({
          target: [fencerBouts.boutId, fencerBouts.fencerId],
          set: { score: scoreB }
        });
      
      // Get DE bracket info to find next bout
      const bracketInfo = await tx
        .select()
        .from(deBracketBouts)
        .where(eq(deBracketBouts.boutId, boutId));
      
      if (bracketInfo.length > 0) {
        const { nextBoutId, loserNextBoutId } = bracketInfo[0];
        
        // If there's a next bout for the winner, assign the winner
        if (nextBoutId) {
          // Get the next bout
          const nextBout = await tx
            .select()
            .from(deBracketBouts)
            .where(eq(deBracketBouts.boutId, nextBoutId));
          
          if (nextBout.length > 0) {
            // Get the actual bout
            const bout = await tx
              .select()
              .from(bouts)
              .where(eq(bouts.id, nextBoutId));
            
            if (bout.length > 0) {
              // Determine if this winner should be left or right fencer
              // This logic depends on your bracket structure
              // For simplicity, we'll just put even bouts on left, odd on right
              const isEvenBout = bracketInfo[0].bout_order % 2 === 0;
              
              if (isEvenBout) {
                await tx.update(bouts)
                  .set({ lFencer: victorId })
                  .where(eq(bouts.id, nextBoutId));
              } else {
                await tx.update(bouts)
                  .set({ rFencer: victorId })
                  .where(eq(bouts.id, nextBoutId));
              }
            }
          }
        }
        
        // If there's a next bout for the loser, assign the loser
        if (loserNextBoutId) {
          const loserId = victorId === fencerAId ? fencerBId : fencerAId;
          
          // Get the loser's next bout
          const loserNextBout = await tx
            .select()
            .from(deBracketBouts)
            .where(eq(deBracketBouts.boutId, loserNextBoutId));
          
          if (loserNextBout.length > 0) {
            // Get the actual bout
            const bout = await tx
              .select()
              .from(bouts)
              .where(eq(bouts.id, loserNextBoutId));
            
            if (bout.length > 0) {
              // Determine if this loser should be left or right fencer
              // This logic depends on your bracket structure
              // For simplicity, we'll just put them on the left
              await tx.update(bouts)
                .set({ lFencer: loserId })
                .where(eq(bouts.id, loserNextBoutId));
            }
          }
        }
      }
      
      // Return the updated bout
      return await deService.getDEBoutById(boutId);
    });
  }
};

// Query keys for DE bouts
export const deBoutKeys = createQueryKeys('de-bouts');

/**
 * Hook for getting all DE bouts for a round
 */
export function useGetDEBouts(roundId: number | undefined) {
  return useQuery({
    queryKey: roundId ? [...deBoutKeys.lists(), 'round', roundId] : deBoutKeys.lists(),
    queryFn: () => roundId ? deService.getDEBouts(roundId) : [],
    enabled: !!roundId,
    staleTime: 1000 * 30, // 30 seconds stale time (DE bouts change frequently)
  });
}

/**
 * Hook for getting a single DE bout by ID
 */
export function useGetDEBoutById(boutId: number | undefined) {
  return useQuery({
    queryKey: boutId ? deBoutKeys.detail(boutId) : deBoutKeys.details(),
    queryFn: () => boutId ? deService.getDEBoutById(boutId) : null,
    enabled: !!boutId,
    staleTime: 1000 * 30, // 30 seconds stale time
  });
}

/**
 * Live query hook for DE bouts for a round
 */
export function useLiveDEBouts(roundId: number | undefined) {
  const query = roundId
    ? db
        .select({
          id: bouts.id,
          tableof: deBracketBouts.bracketType,
          lfencer: bouts.lFencer,
          rfencer: bouts.rFencer,
          victor: bouts.victor,
          bracket_round: deBracketBouts.bracketRound,
          bout_order: deBracketBouts.boutOrder,
          next_bout_id: deBracketBouts.nextBoutId,
          loser_next_bout_id: deBracketBouts.loserNextBoutId,
        })
        .from(deBracketBouts)
        .leftJoin(bouts, eq(bouts.id, deBracketBouts.boutId))
        .where(eq(deBracketBouts.roundId, roundId))
    : null;

  return useLiveQuery(query, { enabled: !!roundId });
}

/**
 * Hook for updating a DE bout
 */
export function useUpdateDEBout() {
  const queryClient = useQueryClient();
  const { invalidateEntity } = useInvalidateQueries();
  
  return useMutation({
    mutationFn: deService.updateDEBout,
    onSuccess: (updatedBout) => {
      if (updatedBout) {
        // Invalidate the specific bout
        queryClient.invalidateQueries({
          queryKey: deBoutKeys.detail(updatedBout.id),
        });
        
        // Get the round ID from the bout to invalidate all bouts for that round
        const roundId = updatedBout.roundId;
        if (roundId) {
          queryClient.invalidateQueries({
            queryKey: [...deBoutKeys.lists(), 'round', roundId],
          });
        }
        
        // Use cascade invalidation for related entities
        invalidateEntity('bouts', updatedBout.id);
        invalidateEntity('fencers'); // All fencers might be affected by this change
      }
    },
  });
}

/**
 * Main hook for DE functionality
 * Aggregates all the individual hooks for convenience
 */
/**
 * Extension of deService for double elimination brackets
 */
deService.getDoubleBracketBouts = async (roundId: number) => {
  const bouts = await deService.getDEBouts(roundId);
  
  // Organize bouts into bracket categories
  const winners: any[] = [];
  const losers: any[] = [];
  const finals: any[] = [];
  
  bouts.forEach(bout => {
    if (bout.tableof === 'winners') {
      winners.push(bout);
    } else if (bout.tableof === 'losers') {
      losers.push(bout);
    } else if (bout.tableof === 'finals') {
      finals.push(bout);
    }
  });
  
  return { winners, losers, finals };
};

/**
 * Hook for getting double elimination bracket bouts
 */
export function useGetDoubleBracketBouts(roundId: number | undefined) {
  return useQuery({
    queryKey: roundId ? [...deBoutKeys.lists(), 'double-bracket', roundId] : deBoutKeys.lists(),
    queryFn: () => roundId ? deService.getDoubleBracketBouts(roundId) : { winners: [], losers: [], finals: [] },
    enabled: !!roundId,
    staleTime: 1000 * 30, // 30 seconds stale time
  });
}

export function useDEQueries() {
  return {
    // Query hooks
    useGetDEBouts,
    useGetDEBoutById,
    useLiveDEBouts,
    useGetDoubleBracketBouts, // Add the double elimination hook
    
    // Mutation hooks
    useUpdateDEBout,
    
    // Export query keys
    deBoutKeys,
  };
}

export default useDEQueries;
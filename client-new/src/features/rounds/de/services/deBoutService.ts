/**
 * DE Bout Service
 * Provides optimized data access functions for Direct Elimination bouts
 */
import { 
  bouts,
  deBracketBouts,
  deTable,
  fencerBouts,
  fencers
} from '../../../../infrastructure/database/schema';
import db from '../../../../infrastructure/database/client';
import { eq, and, asc, inArray, isNull, isNotNull, sql, desc } from 'drizzle-orm';

export type DEBracketType = 'winners' | 'losers' | 'finals' | 'east' | 'north' | 'west' | 'south';

export type DEBout = {
  id: number;
  roundId: number;
  boutId: number;
  bracketType: DEBracketType;
  bracketRound: number;
  boutOrder: number;
  nextBoutId?: number;
  loserNextBoutId?: number;
  fencerA?: {
    id: number;
    fname: string;
    lname: string;
    nickname?: string;
    seedNumber?: number;
  };
  fencerB?: {
    id: number;
    fname: string;
    lname: string;
    nickname?: string;
    seedNumber?: number; 
  };
  scoreA?: number;
  scoreB?: number;
  winnerId?: number;
  isBye: boolean;
  tableOf: number;
};

// Type for the response when getting bouts by bracket type
export type DESortedBouts = {
  winners: DEBout[];
  losers: DEBout[];
  finals: DEBout[];
  east?: DEBout[];
  north?: DEBout[];
  west?: DEBout[];
  south?: DEBout[];
};

// Type for batch updating DE bouts
export type DEBoutUpdate = {
  boutId: number;
  scoreA?: number;
  scoreB?: number;
  winnerId?: number;
};

// Prepare statements for optimized queries
const getDEBoutByIdStatement = db
  .select({
    bout: bouts,
    bracket: deBracketBouts,
    fencerA: fencers,
    fencerB: fencers,
    scoreA: fencerBouts,
    scoreB: fencerBouts
  })
  .from(bouts)
  .leftJoin(deBracketBouts, eq(deBracketBouts.boutId, bouts.id))
  .leftJoin(fencers.as('fencerA'), eq(bouts.lFencer, fencers.as('fencerA').id))
  .leftJoin(fencers.as('fencerB'), eq(bouts.rFencer, fencers.as('fencerB').id))
  .leftJoin(fencerBouts.as('scoreA'), and(
    eq(fencerBouts.as('scoreA').boutId, bouts.id),
    eq(fencerBouts.as('scoreA').fencerId, bouts.lFencer)
  ))
  .leftJoin(fencerBouts.as('scoreB'), and(
    eq(fencerBouts.as('scoreB').boutId, bouts.id),
    eq(fencerBouts.as('scoreB').fencerId, bouts.rFencer)
  ))
  .where(eq(bouts.id, sql.placeholder('boutId')))
  .prepare();

const getDEBoutsByRoundIdStatement = db
  .select({
    bout: bouts,
    bracket: deBracketBouts,
    fencerA: fencers,
    fencerB: fencers,
    scoreA: fencerBouts,
    scoreB: fencerBouts
  })
  .from(bouts)
  .leftJoin(deBracketBouts, eq(deBracketBouts.boutId, bouts.id))
  .leftJoin(fencers.as('fencerA'), eq(bouts.lFencer, fencers.as('fencerA').id))
  .leftJoin(fencers.as('fencerB'), eq(bouts.rFencer, fencers.as('fencerB').id))
  .leftJoin(fencerBouts.as('scoreA'), and(
    eq(fencerBouts.as('scoreA').boutId, bouts.id),
    eq(fencerBouts.as('scoreA').fencerId, bouts.lFencer)
  ))
  .leftJoin(fencerBouts.as('scoreB'), and(
    eq(fencerBouts.as('scoreB').boutId, bouts.id),
    eq(fencerBouts.as('scoreB').fencerId, bouts.rFencer)
  ))
  .where(eq(bouts.roundId, sql.placeholder('roundId')))
  .orderBy(
    asc(deBracketBouts.bracketRound),
    asc(deBracketBouts.boutOrder)
  )
  .prepare();

const getDEBoutsByBracketTypeStatement = db
  .select({
    bout: bouts,
    bracket: deBracketBouts,
    fencerA: fencers,
    fencerB: fencers,
    scoreA: fencerBouts,
    scoreB: fencerBouts
  })
  .from(bouts)
  .leftJoin(deBracketBouts, eq(deBracketBouts.boutId, bouts.id))
  .leftJoin(fencers.as('fencerA'), eq(bouts.lFencer, fencers.as('fencerA').id))
  .leftJoin(fencers.as('fencerB'), eq(bouts.rFencer, fencers.as('fencerB').id))
  .leftJoin(fencerBouts.as('scoreA'), and(
    eq(fencerBouts.as('scoreA').boutId, bouts.id),
    eq(fencerBouts.as('scoreA').fencerId, bouts.lFencer)
  ))
  .leftJoin(fencerBouts.as('scoreB'), and(
    eq(fencerBouts.as('scoreB').boutId, bouts.id),
    eq(fencerBouts.as('scoreB').fencerId, bouts.rFencer)
  ))
  .where(and(
    eq(bouts.roundId, sql.placeholder('roundId')),
    eq(deBracketBouts.bracketType, sql.placeholder('bracketType'))
  ))
  .orderBy(
    asc(deBracketBouts.bracketRound),
    asc(deBracketBouts.boutOrder)
  )
  .prepare();

/**
 * Get a DE bout by ID with all related information
 */
export async function getDEBoutById(boutId: number): Promise<DEBout | null> {
  try {
    const result = await getDEBoutByIdStatement.execute({ boutId });
    
    if (!result.length) {
      return null;
    }
    
    const data = result[0];
    return mapToDEBout(data);
  } catch (error) {
    console.error(`Failed to get DE bout with ID ${boutId}:`, error);
    throw new Error(`Failed to get DE bout: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get all DE bouts for a round with related information
 */
export async function getDEBoutsByRoundId(roundId: number): Promise<DEBout[]> {
  try {
    const result = await getDEBoutsByRoundIdStatement.execute({ roundId });
    return result.map(mapToDEBout);
  } catch (error) {
    console.error(`Failed to get DE bouts for round ${roundId}:`, error);
    throw new Error(`Failed to get DE bouts: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get DE bouts by bracket type (winners, losers, finals, etc.)
 */
export async function getDEBoutsByBracketType(
  roundId: number, 
  bracketType: DEBracketType
): Promise<DEBout[]> {
  try {
    const result = await getDEBoutsByBracketTypeStatement.execute({ 
      roundId, 
      bracketType 
    });
    return result.map(mapToDEBout);
  } catch (error) {
    console.error(`Failed to get ${bracketType} bracket bouts for round ${roundId}:`, error);
    throw new Error(`Failed to get DE bouts: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get all DE bouts organized by bracket type
 * This is useful for Double Elimination and Compass Draw formats
 */
export async function getDEBoutsByBracketTypes(roundId: number): Promise<DESortedBouts> {
  try {
    // Execute a single query to get all bouts and then sort them by bracket type
    const allBouts = await getDEBoutsByRoundId(roundId);
    
    const sortedBouts: DESortedBouts = {
      winners: [],
      losers: [],
      finals: [],
      east: [],
      north: [],
      west: [],
      south: []
    };
    
    // Sort bouts into appropriate bracket arrays
    allBouts.forEach(bout => {
      const bracketType = bout.bracketType;
      if (sortedBouts[bracketType]) {
        sortedBouts[bracketType].push(bout);
      }
    });
    
    return sortedBouts;
  } catch (error) {
    console.error(`Failed to get sorted DE bouts for round ${roundId}:`, error);
    throw new Error(`Failed to get sorted DE bouts: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get the table size for a DE round
 */
export async function getDETableSize(roundId: number): Promise<number> {
  try {
    const result = await db
      .select({ tableOf: deTable.tableOf })
      .from(deTable)
      .where(eq(deTable.roundId, roundId))
      .limit(1);
    
    return result.length > 0 ? result[0].tableOf : 0;
  } catch (error) {
    console.error(`Failed to get DE table size for round ${roundId}:`, error);
    throw new Error(`Failed to get DE table size: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Check if a DE round is complete (all bouts have winners)
 */
export async function isDERoundComplete(roundId: number): Promise<boolean> {
  try {
    // Get count of all bouts for this round
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(bouts)
      .where(eq(bouts.roundId, roundId));
    
    // Get count of bouts without a victor
    const [incompleteResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(bouts)
      .where(and(
        eq(bouts.roundId, roundId),
        isNull(bouts.victor)
      ));
    
    // Round is complete if all bouts have a victor
    const totalBouts = totalResult?.count || 0;
    const incompleteBouts = incompleteResult?.count || 0;
    
    return totalBouts > 0 && incompleteBouts === 0;
  } catch (error) {
    console.error(`Failed to check if DE round ${roundId} is complete:`, error);
    throw new Error(`Failed to check if DE round is complete: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Create a new DE bout
 */
export async function createDEBout(
  roundId: number,
  bracketType: DEBracketType,
  bracketRound: number,
  boutOrder: number,
  tableOf: number,
  fencerAId?: number,
  fencerBId?: number,
  nextBoutId?: number,
  loserNextBoutId?: number
): Promise<DEBout> {
  try {
    // First create the bout record
    const [newBout] = await db
      .insert(bouts)
      .values({
        roundId,
        lFencer: fencerAId,
        rFencer: fencerBId,
        tableOf,
        eventId: 0, // This will be filled in later from the round's eventId
      })
      .returning();
    
    if (!newBout) {
      throw new Error('Failed to create bout record');
    }
    
    // Then create the DE bracket bout record
    const [newDEBout] = await db
      .insert(deBracketBouts)
      .values({
        roundId,
        boutId: newBout.id,
        bracketType,
        bracketRound,
        boutOrder,
        nextBoutId,
        loserNextBoutId,
      })
      .returning();
    
    if (!newDEBout) {
      throw new Error('Failed to create DE bracket bout record');
    }
    
    // Now get the complete bout with all related data
    const completeBout = await getDEBoutById(newBout.id);
    if (!completeBout) {
      throw new Error('Failed to retrieve the newly created bout');
    }
    
    return completeBout;
  } catch (error) {
    console.error('Failed to create DE bout:', error);
    throw new Error(`Failed to create DE bout: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Update a DE bout's scores and set the winner
 */
export async function updateDEBoutScores(
  boutId: number,
  scoreA: number,
  scoreB: number,
  winnerId: number
): Promise<DEBout> {
  try {
    // Start a transaction to ensure atomicity
    return await db.transaction(async (tx) => {
      // First get the bout to determine fencer IDs
      const existingBout = await tx
        .select()
        .from(bouts)
        .where(eq(bouts.id, boutId))
        .limit(1);
      
      if (!existingBout.length) {
        throw new Error(`Bout with ID ${boutId} not found`);
      }
      
      const bout = existingBout[0];
      const fencerAId = bout.lFencer;
      const fencerBId = bout.rFencer;
      
      if (!fencerAId || !fencerBId) {
        throw new Error(`Bout with ID ${boutId} is missing one or both fencers`);
      }
      
      // Update the bout with the winner
      await tx
        .update(bouts)
        .set({ victor: winnerId })
        .where(eq(bouts.id, boutId));
      
      // Upsert fencer scores
      if (fencerAId) {
        await tx
          .insert(fencerBouts)
          .values({
            boutId,
            fencerId: fencerAId,
            score: scoreA,
          })
          .onConflictDoUpdate({
            target: [fencerBouts.boutId, fencerBouts.fencerId],
            set: { score: scoreA },
          });
      }
      
      if (fencerBId) {
        await tx
          .insert(fencerBouts)
          .values({
            boutId,
            fencerId: fencerBId,
            score: scoreB,
          })
          .onConflictDoUpdate({
            target: [fencerBouts.boutId, fencerBouts.fencerId],
            set: { score: scoreB },
          });
      }
      
      // Get the updated bout with all related information
      const updatedBout = await getDEBoutById(boutId);
      if (!updatedBout) {
        throw new Error('Failed to retrieve the updated bout');
      }
      
      return updatedBout;
    });
  } catch (error) {
    console.error(`Failed to update scores for bout ${boutId}:`, error);
    throw new Error(`Failed to update bout scores: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Update DE bout scores in batch
 */
export async function batchUpdateDEBoutScores(updates: DEBoutUpdate[]): Promise<DEBout[]> {
  try {
    if (updates.length === 0) {
      return [];
    }
    
    // Start a transaction to ensure atomicity
    return await db.transaction(async (tx) => {
      const updatedBouts: DEBout[] = [];
      
      for (const update of updates) {
        // Get current bout details
        const existingBout = await tx
          .select()
          .from(bouts)
          .where(eq(bouts.id, update.boutId))
          .limit(1);
        
        if (!existingBout.length) {
          continue;
        }
        
        const bout = existingBout[0];
        const fencerAId = bout.lFencer;
        const fencerBId = bout.rFencer;
        
        // Update winner if provided
        if (update.winnerId) {
          await tx
            .update(bouts)
            .set({ victor: update.winnerId })
            .where(eq(bouts.id, update.boutId));
        }
        
        // Update scores if provided
        if (fencerAId && update.scoreA !== undefined) {
          await tx
            .insert(fencerBouts)
            .values({
              boutId: update.boutId,
              fencerId: fencerAId,
              score: update.scoreA,
            })
            .onConflictDoUpdate({
              target: [fencerBouts.boutId, fencerBouts.fencerId],
              set: { score: update.scoreA },
            });
        }
        
        if (fencerBId && update.scoreB !== undefined) {
          await tx
            .insert(fencerBouts)
            .values({
              boutId: update.boutId,
              fencerId: fencerBId,
              score: update.scoreB,
            })
            .onConflictDoUpdate({
              target: [fencerBouts.boutId, fencerBouts.fencerId],
              set: { score: update.scoreB },
            });
        }
        
        // Get the updated bout
        const updatedBout = await getDEBoutById(update.boutId);
        if (updatedBout) {
          updatedBouts.push(updatedBout);
        }
      }
      
      return updatedBouts;
    });
  } catch (error) {
    console.error('Failed to batch update DE bout scores:', error);
    throw new Error(`Failed to batch update bout scores: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Update a DE bout and advance the winner to the next bout
 */
export async function updateDEBoutAndAdvanceWinner(
  boutId: number,
  scoreA: number,
  scoreB: number,
  winnerId: number
): Promise<DEBout> {
  try {
    // Start a transaction to ensure atomicity
    return await db.transaction(async (tx) => {
      // First update the bout scores and set the winner
      await updateDEBoutScores(boutId, scoreA, scoreB, winnerId);
      
      // Get the DE bracket bout to find the next bout
      const bracketBout = await tx
        .select()
        .from(deBracketBouts)
        .where(eq(deBracketBouts.boutId, boutId))
        .limit(1);
      
      if (!bracketBout.length) {
        throw new Error(`DE bracket bout with ID ${boutId} not found`);
      }
      
      const nextBoutId = bracketBout[0].nextBoutId;
      
      // If there's a next bout, update it with the winner
      if (nextBoutId) {
        // Get the next bout to determine which fencer position to update
        const nextBout = await tx
          .select()
          .from(bouts)
          .where(eq(bouts.id, nextBoutId))
          .limit(1);
        
        if (nextBout.length) {
          // Determine if this is the left or right fencer for the next bout
          const isLeftFencer = bracketBout[0].boutOrder % 2 === 0;
          
          // Update the appropriate fencer in the next bout
          await tx
            .update(bouts)
            .set(isLeftFencer ? { lFencer: winnerId } : { rFencer: winnerId })
            .where(eq(bouts.id, nextBoutId));
        }
      }
      
      // Get the loser ID
      const bout = await tx
        .select()
        .from(bouts)
        .where(eq(bouts.id, boutId))
        .limit(1);
      
      if (bout.length) {
        const loserNextBoutId = bracketBout[0].loserNextBoutId;
        const loserId = bout[0].lFencer === winnerId ? bout[0].rFencer : bout[0].lFencer;
        
        // If there's a losers bracket bout, update it with the loser
        if (loserNextBoutId && loserId) {
          const loserBout = await tx
            .select()
            .from(bouts)
            .where(eq(bouts.id, loserNextBoutId))
            .limit(1);
            
          if (loserBout.length) {
            // Determine if this is the left or right fencer for the loser bout
            const isLeftFencer = bracketBout[0].boutOrder % 2 === 0;
            
            // Update the appropriate fencer in the loser bout
            await tx
              .update(bouts)
              .set(isLeftFencer ? { lFencer: loserId } : { rFencer: loserId })
              .where(eq(bouts.id, loserNextBoutId));
          }
        }
      }
      
      // Get the updated bout with all related information
      const updatedBout = await getDEBoutById(boutId);
      if (!updatedBout) {
        throw new Error('Failed to retrieve the updated bout');
      }
      
      return updatedBout;
    });
  } catch (error) {
    console.error(`Failed to update and advance bout ${boutId}:`, error);
    throw new Error(`Failed to update and advance bout: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Helper function to map database result to DEBout type
export function mapToDEBout(data: any): DEBout {
  const hasFencerA = !!data.bout?.lFencer;
  const hasFencerB = !!data.bout?.rFencer;
  
  return {
    id: data.bout?.id,
    roundId: data.bout?.roundId,
    boutId: data.bracket?.boutId,
    bracketType: data.bracket?.bracketType as DEBracketType,
    bracketRound: data.bracket?.bracketRound,
    boutOrder: data.bracket?.boutOrder,
    nextBoutId: data.bracket?.nextBoutId,
    loserNextBoutId: data.bracket?.loserNextBoutId,
    fencerA: hasFencerA ? {
      id: data.fencerA?.id,
      fname: data.fencerA?.fname || '',
      lname: data.fencerA?.lname || '',
      nickname: data.fencerA?.nickname,
    } : undefined,
    fencerB: hasFencerB ? {
      id: data.fencerB?.id,
      fname: data.fencerB?.fname || '',
      lname: data.fencerB?.lname || '',
      nickname: data.fencerB?.nickname,
    } : undefined,
    scoreA: data.scoreA?.score,
    scoreB: data.scoreB?.score,
    winnerId: data.bout?.victor,
    isBye: (hasFencerA && !hasFencerB) || (!hasFencerA && hasFencerB),
    tableOf: data.bout?.tableOf,
  };
}
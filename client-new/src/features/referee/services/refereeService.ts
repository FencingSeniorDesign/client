/**
 * Referee Service
 * Provides optimized data access functions for the Referee domain
 */
import { Referee, Bout, FencerBout } from '../../../core/types';
import { referees, bouts, fencerBouts } from '../../../infrastructure/database/schema';
import db from '../../../infrastructure/database/client';
import { eq, and, or, like, sql } from 'drizzle-orm';

// Type definitions
export type RefereeInsert = {
  fname: string;
  lname: string;
  nickname?: string;
  deviceId?: string;
};

export type BatchRefereeUpdate = {
  id: number;
  data: Partial<Referee>;
};

export type BoutWithScores = {
  bout: Bout;
  scores: FencerBout[];
};

// Prepared statements for optimized queries
const getRefereeByIdStatement = db
  .select()
  .from(referees)
  .where(eq(referees.id, sql.placeholder('id')))
  .prepare();

const findRefereeByNameStatement = db
  .select()
  .from(referees)
  .where(
    and(
      eq(referees.fname, sql.placeholder('firstName')),
      eq(referees.lname, sql.placeholder('lastName'))
    )
  )
  .limit(1)
  .prepare();

const searchRefereesByNameStatement = db
  .select()
  .from(referees)
  .where(
    or(
      like(referees.fname, sql.placeholder('searchTerm')),
      like(referees.lname, sql.placeholder('searchTerm')),
      like(referees.nickname, sql.placeholder('searchTerm'))
    )
  )
  .prepare();

const getActiveBoutsByRefereeStatement = db
  .select()
  .from(bouts)
  .where(
    and(
      eq(bouts.referee, sql.placeholder('refereeId')),
      eq(bouts.victor, null)
    )
  )
  .prepare();

const getBoutByIdStatement = db
  .select()
  .from(bouts)
  .where(eq(bouts.id, sql.placeholder('boutId')))
  .limit(1)
  .prepare();

const getFencerBoutsForBoutStatement = db
  .select()
  .from(fencerBouts)
  .where(eq(fencerBouts.boutId, sql.placeholder('boutId')))
  .prepare();

const getFencerBoutStatement = db
  .select()
  .from(fencerBouts)
  .where(
    and(
      eq(fencerBouts.boutId, sql.placeholder('boutId')),
      eq(fencerBouts.fencerId, sql.placeholder('fencerId'))
    )
  )
  .limit(1)
  .prepare();

/**
 * Get all referees
 */
export async function getAllReferees(): Promise<Referee[]> {
  try {
    return await db.select().from(referees);
  } catch (error) {
    console.error('Failed to get all referees:', error);
    throw new Error(`Failed to get all referees: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get referee by ID
 */
export async function getRefereeById(id: number): Promise<Referee | null> {
  try {
    const result = await getRefereeByIdStatement.execute({ id });
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error(`Failed to get referee with ID ${id}:`, error);
    throw new Error(`Failed to get referee: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Find a referee by first and last name
 */
export async function findRefereeByName(firstName: string, lastName: string): Promise<Referee | null> {
  try {
    const result = await findRefereeByNameStatement.execute({ 
      firstName, 
      lastName 
    });
    
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error(`Failed to find referee by name ${firstName} ${lastName}:`, error);
    throw new Error(`Failed to find referee by name: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Search for referees by partial name match
 */
export async function searchRefereesByName(query: string): Promise<Referee[]> {
  try {
    if (!query || query.length < 2) {
      return [];
    }
    
    const searchTerm = `%${query}%`;
    return await searchRefereesByNameStatement.execute({ searchTerm });
  } catch (error) {
    console.error(`Failed to search referees by name "${query}":`, error);
    throw new Error(`Failed to search referees by name: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Find a referee by device ID
 */
export async function findRefereeByDeviceId(deviceId: string): Promise<Referee | null> {
  try {
    const result = await db
      .select()
      .from(referees)
      .where(eq(referees.deviceId, deviceId))
      .limit(1);
    
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error(`Failed to find referee by device ID ${deviceId}:`, error);
    throw new Error(`Failed to find referee by device ID: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Find all active bouts for a referee
 */
export async function getActiveBoutsByRefereeId(refereeId: number): Promise<Bout[]> {
  try {
    return await getActiveBoutsByRefereeStatement.execute({ refereeId });
  } catch (error) {
    console.error(`Failed to get active bouts for referee ${refereeId}:`, error);
    throw new Error(`Failed to get active bouts: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get a specific bout with its fencer scores
 */
export async function getBoutWithScores(boutId: number): Promise<BoutWithScores | null> {
  try {
    const boutResult = await getBoutByIdStatement.execute({ boutId });
    
    if (boutResult.length === 0) {
      return null;
    }
    
    const bout = boutResult[0];
    
    const scores = await getFencerBoutsForBoutStatement.execute({ boutId });
    
    return { bout, scores };
  } catch (error) {
    console.error(`Failed to get bout with scores for bout ${boutId}:`, error);
    throw new Error(`Failed to get bout with scores: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Create a new referee
 */
export async function createReferee(refereeData: RefereeInsert): Promise<Referee> {
  try {
    const result = await db
      .insert(referees)
      .values(refereeData)
      .returning();
    
    if (!result.length) {
      throw new Error('Failed to create referee: No result returned');
    }
    
    return result[0];
  } catch (error) {
    console.error('Failed to create referee:', error);
    throw new Error(`Failed to create referee: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Create multiple referees in a batch operation
 */
export async function createReferees(refereesList: RefereeInsert[]): Promise<Referee[]> {
  try {
    if (refereesList.length === 0) {
      return [];
    }
    
    return await db.insert(referees).values(refereesList).returning();
  } catch (error) {
    console.error('Failed to create referees in batch:', error);
    throw new Error(`Failed to create referees: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Update a referee
 */
export async function updateReferee(id: number, data: Partial<Referee>): Promise<Referee | null> {
  try {
    const result = await db
      .update(referees)
      .set(data)
      .where(eq(referees.id, id))
      .returning();
    
    if (!result.length) {
      return null;
    }
    
    return result[0];
  } catch (error) {
    console.error(`Failed to update referee with ID ${id}:`, error);
    throw new Error(`Failed to update referee: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Update multiple referees in a single transaction
 */
export async function batchUpdateReferees(updates: BatchRefereeUpdate[]): Promise<Referee[]> {
  try {
    if (updates.length === 0) {
      return [];
    }
    
    const updatedReferees: Referee[] = [];
    
    // Use transaction for atomicity
    await db.transaction(async (tx) => {
      for (const update of updates) {
        const result = await tx
          .update(referees)
          .set(update.data)
          .where(eq(referees.id, update.id))
          .returning();
        
        if (result.length > 0) {
          updatedReferees.push(result[0]);
        }
      }
    });
    
    return updatedReferees;
  } catch (error) {
    console.error('Failed to batch update referees:', error);
    throw new Error(`Failed to batch update referees: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Delete a referee
 */
export async function deleteReferee(id: number): Promise<boolean> {
  try {
    const result = await db
      .delete(referees)
      .where(eq(referees.id, id))
      .returning();
    
    return result.length > 0;
  } catch (error) {
    console.error(`Failed to delete referee with ID ${id}:`, error);
    throw new Error(`Failed to delete referee: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Delete multiple referees
 */
export async function batchDeleteReferees(ids: number[]): Promise<number> {
  try {
    if (ids.length === 0) {
      return 0;
    }
    
    const result = await db
      .delete(referees)
      .where(eq(referees.id, sql.placeholder('id')))
      .returning();
    
    return result.length;
  } catch (error) {
    console.error('Failed to batch delete referees:', error);
    throw new Error(`Failed to batch delete referees: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Update bout scores for two fencers
 * Uses a transaction to ensure data consistency
 */
export async function updateBoutScores(
  boutId: number, 
  fencer1Id: number, 
  fencer1Score: number, 
  fencer2Id: number, 
  fencer2Score: number
): Promise<void> {
  try {
    // Get the existing fencer bout records
    const fencer1Result = await getFencerBoutStatement.execute({ 
      boutId, 
      fencerId: fencer1Id 
    });
    
    const fencer2Result = await getFencerBoutStatement.execute({ 
      boutId, 
      fencerId: fencer2Id 
    });
    
    const fencer1Exists = fencer1Result.length > 0;
    const fencer2Exists = fencer2Result.length > 0;
    
    // Use a transaction to ensure both scores are updated atomically
    await db.transaction(async (tx) => {
      // Update or create the first fencer's score
      if (fencer1Exists) {
        await tx
          .update(fencerBouts)
          .set({ score: fencer1Score })
          .where(
            and(
              eq(fencerBouts.boutId, boutId),
              eq(fencerBouts.fencerId, fencer1Id)
            )
          );
      } else {
        await tx
          .insert(fencerBouts)
          .values({
            boutId,
            fencerId: fencer1Id,
            score: fencer1Score
          });
      }
      
      // Update or create the second fencer's score
      if (fencer2Exists) {
        await tx
          .update(fencerBouts)
          .set({ score: fencer2Score })
          .where(
            and(
              eq(fencerBouts.boutId, boutId),
              eq(fencerBouts.fencerId, fencer2Id)
            )
          );
      } else {
        await tx
          .insert(fencerBouts)
          .values({
            boutId,
            fencerId: fencer2Id,
            score: fencer2Score
          });
      }
    });
  } catch (error) {
    console.error(`Failed to update bout scores for bout ${boutId}:`, error);
    throw new Error(`Failed to update bout scores: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Set the victor for a bout
 */
export async function setBoutVictor(boutId: number, victorId: number): Promise<Bout | null> {
  try {
    const result = await db
      .update(bouts)
      .set({ victor: victorId })
      .where(eq(bouts.id, boutId))
      .returning();
    
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error(`Failed to set victor for bout ${boutId}:`, error);
    throw new Error(`Failed to set bout victor: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Create a new bout
 */
export async function createBout(boutData: Partial<Bout>): Promise<Bout> {
  try {
    const result = await db
      .insert(bouts)
      .values(boutData)
      .returning();
    
    if (!result.length) {
      throw new Error('Failed to create bout: No result returned');
    }
    
    return result[0];
  } catch (error) {
    console.error('Failed to create bout:', error);
    throw new Error(`Failed to create bout: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Update a bout
 */
export async function updateBout(id: number, data: Partial<Bout>): Promise<Bout | null> {
  try {
    const result = await db
      .update(bouts)
      .set(data)
      .where(eq(bouts.id, id))
      .returning();
    
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error(`Failed to update bout with ID ${id}:`, error);
    throw new Error(`Failed to update bout: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Delete a bout and its related fencer bouts
 */
export async function deleteBout(id: number): Promise<boolean> {
  try {
    let deleted = false;
    
    await db.transaction(async (tx) => {
      // First delete related fencer bouts
      await tx
        .delete(fencerBouts)
        .where(eq(fencerBouts.boutId, id));
      
      // Then delete the bout
      const result = await tx
        .delete(bouts)
        .where(eq(bouts.id, id))
        .returning();
      
      deleted = result.length > 0;
    });
    
    return deleted;
  } catch (error) {
    console.error(`Failed to delete bout with ID ${id}:`, error);
    throw new Error(`Failed to delete bout: ${error instanceof Error ? error.message : String(error)}`);
  }
}
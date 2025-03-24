/**
 * Fencer Service
 * Provides optimized data access functions for the Fencer domain
 */
import { Fencer, Event } from '../../../core/types';
import { fencers, fencerEvents, events } from '../../../infrastructure/database/schema';
import db from '../../../infrastructure/database/client';
import { eq, like, or, and, count, inArray, sql } from 'drizzle-orm';

// Type definitions
export type FencerInsert = {
  fname: string;
  lname: string;
  nickname?: string;
  gender?: string;
  club?: string;
  erating?: string;
  eyear?: number;
  frating?: string;
  fyear?: number;
  srating?: string;
  syear?: number;
};

export type FencerWithEvents = Fencer & {
  events?: Event[];
};

export type BatchFencerUpdate = {
  id: number;
  data: Partial<Fencer>;
};

// Prepared statements for optimized queries
const getFencerByIdStatement = db
  .select()
  .from(fencers)
  .where(eq(fencers.id, sql.placeholder('id')))
  .prepare();

const findFencerByNameStatement = db
  .select()
  .from(fencers)
  .where(
    and(
      eq(fencers.fname, sql.placeholder('firstName')),
      eq(fencers.lname, sql.placeholder('lastName'))
    )
  )
  .limit(1)
  .prepare();

const searchFencersByNameStatement = db
  .select()
  .from(fencers)
  .where(
    or(
      like(fencers.fname, sql.placeholder('searchTerm')),
      like(fencers.lname, sql.placeholder('searchTerm')),
      like(fencers.nickname, sql.placeholder('searchTerm'))
    )
  )
  .prepare();

const getFencersByClubStatement = db
  .select()
  .from(fencers)
  .where(eq(fencers.club, sql.placeholder('club')))
  .prepare();

const getFencersByEventStatement = db
  .select({
    id: fencers.id,
    fname: fencers.fname,
    lname: fencers.lname,
    nickname: fencers.nickname,
    gender: fencers.gender,
    club: fencers.club,
    erating: fencers.erating,
    eyear: fencers.eyear,
    frating: fencers.frating,
    fyear: fencers.fyear,
    srating: fencers.srating,
    syear: fencers.syear,
  })
  .from(fencerEvents)
  .leftJoin(fencers, eq(fencerEvents.fencerId, fencers.id))
  .where(eq(fencerEvents.eventId, sql.placeholder('eventId')))
  .prepare();

const getFencerCountStatement = db
  .select({ count: count() })
  .from(fencers)
  .prepare();

/**
 * Get all fencers
 */
export async function getAllFencers(): Promise<Fencer[]> {
  try {
    return await db.select().from(fencers);
  } catch (error) {
    console.error('Failed to get all fencers:', error);
    throw new Error(`Failed to get all fencers: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get fencer by ID with optional events data
 */
export async function getFencerById(id: number, includeEvents = false): Promise<Fencer | FencerWithEvents | null> {
  try {
    const result = await getFencerByIdStatement.execute({ id });
    
    if (!result.length) {
      return null;
    }
    
    const fencer = result[0];
    
    if (!includeEvents) {
      return fencer;
    }
    
    // Get related events
    const fencerEventsList = await db
      .select({
        id: events.id,
        tname: events.tname,
        weapon: events.weapon,
        gender: events.gender,
        age: events.age,
        class: events.class,
        seeding: events.seeding,
      })
      .from(fencerEvents)
      .leftJoin(events, eq(fencerEvents.eventId, events.id))
      .where(eq(fencerEvents.fencerId, id));
    
    // Combine everything
    return {
      ...fencer,
      events: fencerEventsList,
    };
  } catch (error) {
    console.error(`Failed to get fencer with ID ${id}:`, error);
    throw new Error(`Failed to get fencer: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Find a fencer by first and last name
 */
export async function findFencerByName(firstName: string, lastName: string): Promise<Fencer | null> {
  try {
    const result = await findFencerByNameStatement.execute({ 
      firstName, 
      lastName 
    });
    
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error(`Failed to find fencer by name ${firstName} ${lastName}:`, error);
    throw new Error(`Failed to find fencer by name: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Search for fencers by partial name match using optimized prepared statement
 */
export async function searchFencersByName(query: string): Promise<Fencer[]> {
  try {
    if (!query || query.length < 3) {
      return [];
    }
    
    const searchTerm = `%${query}%`;
    return await searchFencersByNameStatement.execute({ searchTerm });
  } catch (error) {
    console.error(`Failed to search fencers by name "${query}":`, error);
    throw new Error(`Failed to search fencers by name: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get fencers by club using optimized prepared statement
 */
export async function getFencersByClub(club: string): Promise<Fencer[]> {
  try {
    return await getFencersByClubStatement.execute({ club });
  } catch (error) {
    console.error(`Failed to get fencers by club "${club}":`, error);
    throw new Error(`Failed to get fencers by club: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get fencers by event using optimized prepared statement
 */
export async function getFencersByEvent(eventId: number): Promise<Fencer[]> {
  try {
    return await getFencersByEventStatement.execute({ eventId });
  } catch (error) {
    console.error(`Failed to get fencers for event ${eventId}:`, error);
    throw new Error(`Failed to get fencers for event: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get count of fencers
 */
export async function getFencerCount(): Promise<number> {
  try {
    const [result] = await getFencerCountStatement.execute();
    return result.count;
  } catch (error) {
    console.error('Failed to get fencer count:', error);
    throw new Error(`Failed to get fencer count: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Create a new fencer
 */
export async function createFencer(fencerData: FencerInsert): Promise<Fencer> {
  try {
    const defaultRating = {
      erating: 'U',
      eyear: 0,
      frating: 'U',
      fyear: 0,
      srating: 'U',
      syear: 0,
    };

    const result = await db
      .insert(fencers)
      .values({ ...defaultRating, ...fencerData })
      .returning();
    
    if (!result.length) {
      throw new Error('Failed to create fencer: No result returned');
    }
    
    return result[0];
  } catch (error) {
    console.error('Failed to create fencer:', error);
    throw new Error(`Failed to create fencer: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Create multiple fencers in a batch operation
 */
export async function createFencers(fencersList: FencerInsert[]): Promise<Fencer[]> {
  try {
    if (fencersList.length === 0) {
      return [];
    }
    
    const defaultRating = {
      erating: 'U',
      eyear: 0,
      frating: 'U',
      fyear: 0,
      srating: 'U',
      syear: 0,
    };
    
    const fencersWithDefaults = fencersList.map(fencer => ({
      ...defaultRating,
      ...fencer
    }));
    
    const result = await db.insert(fencers).values(fencersWithDefaults).returning();
    return result;
  } catch (error) {
    console.error('Failed to create fencers in batch:', error);
    throw new Error(`Failed to create fencers: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Update a fencer
 */
export async function updateFencer(id: number, data: Partial<Fencer>): Promise<Fencer | null> {
  try {
    const result = await db
      .update(fencers)
      .set(data)
      .where(eq(fencers.id, id))
      .returning();
    
    if (!result.length) {
      return null;
    }
    
    return result[0];
  } catch (error) {
    console.error(`Failed to update fencer with ID ${id}:`, error);
    throw new Error(`Failed to update fencer: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Update multiple fencers in a single transaction
 */
export async function batchUpdateFencers(updates: BatchFencerUpdate[]): Promise<Fencer[]> {
  try {
    if (updates.length === 0) {
      return [];
    }
    
    const updatedFencers: Fencer[] = [];
    
    // Use transaction for atomicity
    await db.transaction(async (tx) => {
      for (const update of updates) {
        const result = await tx
          .update(fencers)
          .set(update.data)
          .where(eq(fencers.id, update.id))
          .returning();
        
        if (result.length > 0) {
          updatedFencers.push(result[0]);
        }
      }
    });
    
    return updatedFencers;
  } catch (error) {
    console.error('Failed to batch update fencers:', error);
    throw new Error(`Failed to batch update fencers: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Delete a fencer and associated event relationships
 */
export async function deleteFencer(id: number): Promise<boolean> {
  try {
    // Use transaction to ensure all related records are deleted
    let deletedCount = 0;
    
    await db.transaction(async (tx) => {
      // First delete from fencerEvents junction table
      await tx.delete(fencerEvents).where(eq(fencerEvents.fencerId, id));
      
      // Then delete the fencer
      const result = await tx
        .delete(fencers)
        .where(eq(fencers.id, id))
        .returning();
      
      deletedCount = result.length;
    });
    
    return deletedCount > 0;
  } catch (error) {
    console.error(`Failed to delete fencer with ID ${id}:`, error);
    throw new Error(`Failed to delete fencer: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Delete multiple fencers
 */
export async function batchDeleteFencers(ids: number[]): Promise<number> {
  try {
    if (ids.length === 0) {
      return 0;
    }
    
    // Use transaction to ensure all related records are deleted
    let deletedCount = 0;
    
    await db.transaction(async (tx) => {
      // First delete from fencerEvents junction table
      await tx.delete(fencerEvents).where(inArray(fencerEvents.fencerId, ids));
      
      // Then delete the fencers
      const result = await tx
        .delete(fencers)
        .where(inArray(fencers.id, ids))
        .returning();
      
      deletedCount = result.length;
    });
    
    return deletedCount;
  } catch (error) {
    console.error('Failed to batch delete fencers:', error);
    throw new Error(`Failed to batch delete fencers: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Add a fencer to an event
 */
export async function addFencerToEvent(fencerId: number, eventId: number): Promise<void> {
  try {
    // Check if the relationship already exists
    const existing = await db
      .select()
      .from(fencerEvents)
      .where(
        and(
          eq(fencerEvents.fencerId, fencerId),
          eq(fencerEvents.eventId, eventId)
        )
      );

    if (existing.length > 0) {
      return; // Already exists, so we're good
    }

    // Add the relationship
    await db.insert(fencerEvents).values({
      fencerId,
      eventId,
    });
  } catch (error) {
    console.error(`Failed to add fencer ${fencerId} to event ${eventId}:`, error);
    throw new Error(`Failed to add fencer to event: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Remove a fencer from an event
 */
export async function removeFencerFromEvent(fencerId: number, eventId: number): Promise<void> {
  try {
    await db
      .delete(fencerEvents)
      .where(
        and(
          eq(fencerEvents.fencerId, fencerId),
          eq(fencerEvents.eventId, eventId)
        )
      );
  } catch (error) {
    console.error(`Failed to remove fencer ${fencerId} from event ${eventId}:`, error);
    throw new Error(`Failed to remove fencer from event: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Create a new fencer and optionally add to an event
 */
export async function createFencerAndAddToEvent(
  fencerData: FencerInsert,
  eventId?: number
): Promise<Fencer> {
  try {
    const fencer = await createFencer(fencerData);

    // If an event ID is provided, add the fencer to the event
    if (eventId) {
      await addFencerToEvent(fencer.id, eventId);
    }

    return fencer;
  } catch (error) {
    console.error('Failed to create fencer and add to event:', error);
    throw new Error(`Failed to create fencer and add to event: ${error instanceof Error ? error.message : String(error)}`);
  }
}
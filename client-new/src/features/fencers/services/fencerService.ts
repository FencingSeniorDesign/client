/**
 * Fencer Service
 * Provides data access functions for fencers
 */
import { Fencer, Event } from '../../../core/types';
import { fencers, fencerEvents } from '../../../infrastructure/database/schema';
import db from '../../../infrastructure/database/client';
import { eq, like, or, and } from 'drizzle-orm';

// Define the fencer insert type - used for creating new fencers
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
 * Get a fencer by ID
 */
export async function getFencerById(id: number): Promise<Fencer | undefined> {
  try {
    const result = await db
      .select()
      .from(fencers)
      .where(eq(fencers.id, id))
      .limit(1);
    
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error(`Failed to get fencer with ID ${id}:`, error);
    throw new Error(`Failed to get fencer with ID ${id}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Search for fencers by partial name match
 */
export async function searchFencersByName(query: string): Promise<Fencer[]> {
  try {
    if (!query || query.length < 3) {
      return [];
    }
    
    const searchTerm = `%${query}%`;
    return await db
      .select()
      .from(fencers)
      .where(
        or(
          like(fencers.fname, searchTerm),
          like(fencers.lname, searchTerm),
          like(fencers.nickname, searchTerm)
        )
      );
  } catch (error) {
    console.error(`Failed to search fencers by name "${query}":`, error);
    throw new Error(`Failed to search fencers by name: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get fencers by club
 */
export async function getFencersByClub(club: string): Promise<Fencer[]> {
  try {
    return await db
      .select()
      .from(fencers)
      .where(eq(fencers.club, club));
  } catch (error) {
    console.error(`Failed to get fencers by club "${club}":`, error);
    throw new Error(`Failed to get fencers by club: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get fencers by event
 */
export async function getFencersByEvent(eventId: number): Promise<Fencer[]> {
  try {
    // Using a single query with join to get all fencers at once
    const result = await db
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
      .where(eq(fencerEvents.eventId, eventId));
    
    return result;
  } catch (error) {
    console.error(`Failed to get fencers for event ${eventId}:`, error);
    throw new Error(`Failed to get fencers for event: ${error instanceof Error ? error.message : String(error)}`);
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
 * Update a fencer
 */
export async function updateFencer(id: number, data: Partial<Fencer>): Promise<Fencer> {
  try {
    const result = await db
      .update(fencers)
      .set(data)
      .where(eq(fencers.id, id))
      .returning();
    
    if (!result.length) {
      throw new Error(`Fencer with ID ${id} not found`);
    }
    
    return result[0];
  } catch (error) {
    console.error(`Failed to update fencer with ID ${id}:`, error);
    throw new Error(`Failed to update fencer: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Delete a fencer
 */
export async function deleteFencer(id: number): Promise<boolean> {
  try {
    const result = await db
      .delete(fencers)
      .where(eq(fencers.id, id))
      .returning();
    
    return result.length > 0;
  } catch (error) {
    console.error(`Failed to delete fencer with ID ${id}:`, error);
    throw new Error(`Failed to delete fencer: ${error instanceof Error ? error.message : String(error)}`);
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
/**
 * Official Service
 * Provides optimized data access functions for the Official domain
 */
import { Official } from '../../../core/types';
import { officials, officialEvents, events } from '../../../infrastructure/database/schema';
import db from '../../../infrastructure/database/client';
import { eq, and, like, or, sql, inArray } from 'drizzle-orm';

// Type definitions
export type OfficialInsert = {
  fname: string;
  lname: string;
  nickname?: string;
  deviceId?: string;
};

export type OfficialWithEvents = Official & {
  events?: { id: number; name: string }[];
};

export type BatchOfficialUpdate = {
  id: number;
  data: Partial<Official>;
};

// Prepared statements for optimized queries
const getOfficialByIdStatement = db
  .select()
  .from(officials)
  .where(eq(officials.id, sql.placeholder('id')))
  .prepare();

const findOfficialByNameStatement = db
  .select()
  .from(officials)
  .where(
    and(
      eq(officials.fname, sql.placeholder('firstName')),
      eq(officials.lname, sql.placeholder('lastName'))
    )
  )
  .limit(1)
  .prepare();

const searchOfficialsByNameStatement = db
  .select()
  .from(officials)
  .where(
    or(
      like(officials.fname, sql.placeholder('searchTerm')),
      like(officials.lname, sql.placeholder('searchTerm')),
      like(officials.nickname, sql.placeholder('searchTerm'))
    )
  )
  .prepare();

const getOfficialsByEventStatement = db
  .select({
    id: officials.id,
    fname: officials.fname,
    lname: officials.lname,
    nickname: officials.nickname,
    deviceId: officials.deviceId
  })
  .from(officials)
  .innerJoin(
    officialEvents, 
    eq(officials.id, officialEvents.officialId)
  )
  .where(eq(officialEvents.eventId, sql.placeholder('eventId')))
  .prepare();

const getEventsByOfficialStatement = db
  .select({
    id: events.id,
    name: events.tname
  })
  .from(officialEvents)
  .innerJoin(
    events,
    eq(officialEvents.eventId, events.id)
  )
  .where(eq(officialEvents.officialId, sql.placeholder('officialId')))
  .prepare();

const getOfficialEventAssignmentStatement = db
  .select()
  .from(officialEvents)
  .where(
    and(
      eq(officialEvents.officialId, sql.placeholder('officialId')),
      eq(officialEvents.eventId, sql.placeholder('eventId'))
    )
  )
  .prepare();

/**
 * Get all officials
 */
export async function getAllOfficials(): Promise<Official[]> {
  try {
    return await db.select().from(officials);
  } catch (error) {
    console.error('Failed to get all officials:', error);
    throw new Error(`Failed to get all officials: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get official by ID with optional events data
 */
export async function getOfficialById(id: number, includeEvents = false): Promise<Official | OfficialWithEvents | null> {
  try {
    const result = await getOfficialByIdStatement.execute({ id });
    
    if (!result.length) {
      return null;
    }
    
    const official = result[0];
    
    if (!includeEvents) {
      return official;
    }
    
    // Get related events
    const eventsResult = await getEventsByOfficialStatement.execute({ officialId: id });
    
    // Combine everything
    return {
      ...official,
      events: eventsResult,
    };
  } catch (error) {
    console.error(`Failed to get official with ID ${id}:`, error);
    throw new Error(`Failed to get official: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Find an official by first and last name
 */
export async function findOfficialByName(firstName: string, lastName: string): Promise<Official | null> {
  try {
    const result = await findOfficialByNameStatement.execute({ 
      firstName, 
      lastName 
    });
    
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error(`Failed to find official by name ${firstName} ${lastName}:`, error);
    throw new Error(`Failed to find official by name: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Search for officials by partial name match using optimized prepared statement
 */
export async function searchOfficialsByName(query: string): Promise<Official[]> {
  try {
    if (!query || query.length < 2) {
      return [];
    }
    
    const searchTerm = `%${query}%`;
    return await searchOfficialsByNameStatement.execute({ searchTerm });
  } catch (error) {
    console.error(`Failed to search officials by name "${query}":`, error);
    throw new Error(`Failed to search officials by name: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get officials by event using optimized prepared statement
 */
export async function getOfficialsByEvent(eventId: number): Promise<Official[]> {
  try {
    return await getOfficialsByEventStatement.execute({ eventId });
  } catch (error) {
    console.error(`Failed to get officials for event ${eventId}:`, error);
    throw new Error(`Failed to get officials for event: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get events by official using optimized prepared statement
 */
export async function getEventsByOfficial(officialId: number): Promise<{ id: number; name: string }[]> {
  try {
    return await getEventsByOfficialStatement.execute({ officialId });
  } catch (error) {
    console.error(`Failed to get events for official ${officialId}:`, error);
    throw new Error(`Failed to get events for official: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Create a new official
 */
export async function createOfficial(officialData: OfficialInsert): Promise<Official> {
  try {
    const result = await db
      .insert(officials)
      .values(officialData)
      .returning();
    
    if (!result.length) {
      throw new Error('Failed to create official: No result returned');
    }
    
    return result[0];
  } catch (error) {
    console.error('Failed to create official:', error);
    throw new Error(`Failed to create official: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Create multiple officials in a batch operation
 */
export async function createOfficials(officialsList: OfficialInsert[]): Promise<Official[]> {
  try {
    if (officialsList.length === 0) {
      return [];
    }
    
    return await db.insert(officials).values(officialsList).returning();
  } catch (error) {
    console.error('Failed to create officials in batch:', error);
    throw new Error(`Failed to create officials: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Update an official
 */
export async function updateOfficial(id: number, data: Partial<Official>): Promise<Official | null> {
  try {
    const result = await db
      .update(officials)
      .set(data)
      .where(eq(officials.id, id))
      .returning();
    
    if (!result.length) {
      return null;
    }
    
    return result[0];
  } catch (error) {
    console.error(`Failed to update official with ID ${id}:`, error);
    throw new Error(`Failed to update official: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Update multiple officials in a single transaction
 */
export async function batchUpdateOfficials(updates: BatchOfficialUpdate[]): Promise<Official[]> {
  try {
    if (updates.length === 0) {
      return [];
    }
    
    const updatedOfficials: Official[] = [];
    
    // Use transaction for atomicity
    await db.transaction(async (tx) => {
      for (const update of updates) {
        const result = await tx
          .update(officials)
          .set(update.data)
          .where(eq(officials.id, update.id))
          .returning();
        
        if (result.length > 0) {
          updatedOfficials.push(result[0]);
        }
      }
    });
    
    return updatedOfficials;
  } catch (error) {
    console.error('Failed to batch update officials:', error);
    throw new Error(`Failed to batch update officials: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Delete an official
 */
export async function deleteOfficial(id: number): Promise<boolean> {
  try {
    // Use transaction to ensure all related records are deleted
    let deletedCount = 0;
    
    await db.transaction(async (tx) => {
      // First delete from officialEvents junction table
      await tx.delete(officialEvents).where(eq(officialEvents.officialId, id));
      
      // Then delete the official
      const result = await tx
        .delete(officials)
        .where(eq(officials.id, id))
        .returning();
      
      deletedCount = result.length;
    });
    
    return deletedCount > 0;
  } catch (error) {
    console.error(`Failed to delete official with ID ${id}:`, error);
    throw new Error(`Failed to delete official: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Delete multiple officials
 */
export async function batchDeleteOfficials(ids: number[]): Promise<number> {
  try {
    if (ids.length === 0) {
      return 0;
    }
    
    // Use transaction to ensure all related records are deleted
    let deletedCount = 0;
    
    await db.transaction(async (tx) => {
      // First delete from officialEvents junction table
      await tx.delete(officialEvents).where(inArray(officialEvents.officialId, ids));
      
      // Then delete the officials
      const result = await tx
        .delete(officials)
        .where(inArray(officials.id, ids))
        .returning();
      
      deletedCount = result.length;
    });
    
    return deletedCount;
  } catch (error) {
    console.error('Failed to batch delete officials:', error);
    throw new Error(`Failed to batch delete officials: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Assign an official to an event
 */
export async function assignOfficialToEvent(officialId: number, eventId: number): Promise<void> {
  try {
    // Check if the relationship already exists
    const existing = await getOfficialEventAssignmentStatement.execute({ 
      officialId, 
      eventId 
    });

    if (existing.length > 0) {
      return; // Already exists, so we're good
    }

    // Add the relationship
    await db.insert(officialEvents).values({
      officialId,
      eventId,
    });
  } catch (error) {
    console.error(`Failed to assign official ${officialId} to event ${eventId}:`, error);
    throw new Error(`Failed to assign official to event: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Remove an official from an event
 */
export async function removeOfficialFromEvent(officialId: number, eventId: number): Promise<void> {
  try {
    await db
      .delete(officialEvents)
      .where(
        and(
          eq(officialEvents.officialId, officialId),
          eq(officialEvents.eventId, eventId)
        )
      );
  } catch (error) {
    console.error(`Failed to remove official ${officialId} from event ${eventId}:`, error);
    throw new Error(`Failed to remove official from event: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Assign an official to multiple events in a batch operation
 */
export async function assignOfficialToEvents(officialId: number, eventIds: number[]): Promise<void> {
  try {
    if (eventIds.length === 0) {
      return;
    }
    
    // Use transaction for atomicity
    await db.transaction(async (tx) => {
      for (const eventId of eventIds) {
        // Check if the relationship already exists
        const existing = await tx
          .select()
          .from(officialEvents)
          .where(
            and(
              eq(officialEvents.officialId, officialId),
              eq(officialEvents.eventId, eventId)
            )
          );
        
        // Only insert if it doesn't exist
        if (existing.length === 0) {
          await tx.insert(officialEvents).values({
            officialId,
            eventId,
          });
        }
      }
    });
  } catch (error) {
    console.error(`Failed to assign official ${officialId} to multiple events:`, error);
    throw new Error(`Failed to assign official to events: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Find official by device ID
 */
export async function findOfficialByDeviceId(deviceId: string): Promise<Official | null> {
  try {
    const result = await db
      .select()
      .from(officials)
      .where(eq(officials.deviceId, deviceId))
      .limit(1);
    
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error(`Failed to find official by device ID ${deviceId}:`, error);
    throw new Error(`Failed to find official by device ID: ${error instanceof Error ? error.message : String(error)}`);
  }
}
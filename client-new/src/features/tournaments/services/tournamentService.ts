/**
 * Tournament Service
 * Provides optimized data access functions for the Tournament domain
 */
import db from '../../../infrastructure/database/client';
import { tournaments, events, fencerEvents, fencers, refereeEvents, referees, officialEvents, officials, rounds } from '../../../infrastructure/database/schema';
import { eq, sql, count, inArray } from 'drizzle-orm';
import { Tournament, Event } from '../../../core/types';

// Type definitions
export type TournamentInsert = {
  name: string;
  isComplete?: boolean;
};

export type TournamentWithEvents = Tournament & {
  events?: Event[];
  stats?: {
    eventCount: number;
    fencerCount: number;
    officialCount: number;
    refereeCount: number;
    roundCount: number;
  };
};

export type BatchTournamentUpdate = {
  name: string;
  data: Partial<Tournament>;
};

// Prepared statements for optimized queries
const getTournamentByNameStatement = db
  .select()
  .from(tournaments)
  .where(eq(tournaments.name, sql.placeholder('name')))
  .prepare();

const getTournamentsByStatusStatement = db
  .select()
  .from(tournaments)
  .where(eq(tournaments.isComplete, sql.placeholder('isComplete')))
  .prepare();

const getTournamentCountStatement = db
  .select({ count: count() })
  .from(tournaments)
  .prepare();

/**
 * Get all tournaments
 */
export async function getAllTournaments(): Promise<Tournament[]> {
  try {
    return await db.select().from(tournaments);
  } catch (error) {
    console.error('Failed to get all tournaments:', error);
    throw new Error(`Failed to get tournaments: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get tournament by name with optional event data
 */
export async function getTournamentByName(name: string, includeEvents = false): Promise<TournamentWithEvents | null> {
  try {
    const result = await getTournamentByNameStatement.execute({ name });
    
    if (!result.length) {
      return null;
    }
    
    const tournament = result[0];
    
    if (!includeEvents) {
      return tournament;
    }
    
    // Get related events
    const tournamentEvents = await db
      .select()
      .from(events)
      .where(eq(events.tname, name));
    
    // Get tournament stats
    const eventIds = tournamentEvents.map(event => event.id);
    
    let stats = {
      eventCount: tournamentEvents.length,
      fencerCount: 0,
      officialCount: 0,
      refereeCount: 0,
      roundCount: 0,
    };
    
    if (eventIds.length > 0) {
      // Count unique fencers
      const [fencerCount] = await db
        .select({ count: count() })
        .from(fencerEvents)
        .leftJoin(fencers, eq(fencerEvents.fencerId, fencers.id))
        .where(inArray(fencerEvents.eventId, eventIds))
        .groupBy(fencerEvents.fencerId);
      
      // Count unique officials
      const [officialCount] = await db
        .select({ count: count() })
        .from(officialEvents)
        .leftJoin(officials, eq(officialEvents.officialId, officials.id))
        .where(inArray(officialEvents.eventId, eventIds))
        .groupBy(officialEvents.officialId);
      
      // Count unique referees
      const [refereeCount] = await db
        .select({ count: count() })
        .from(refereeEvents)
        .leftJoin(referees, eq(refereeEvents.refereeId, referees.id))
        .where(inArray(refereeEvents.eventId, eventIds))
        .groupBy(refereeEvents.refereeId);
      
      // Count rounds
      const [roundCount] = await db
        .select({ count: count() })
        .from(rounds)
        .where(inArray(rounds.eventId, eventIds));
      
      stats = {
        eventCount: tournamentEvents.length,
        fencerCount: fencerCount?.count || 0,
        officialCount: officialCount?.count || 0,
        refereeCount: refereeCount?.count || 0,
        roundCount: roundCount?.count || 0,
      };
    }
    
    // Combine everything
    return {
      ...tournament,
      events: tournamentEvents,
      stats,
    };
  } catch (error) {
    console.error(`Failed to get tournament with name ${name}:`, error);
    throw new Error(`Failed to get tournament: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get tournaments by completion status
 */
export async function getTournamentsByStatus(isComplete: boolean): Promise<Tournament[]> {
  try {
    return await getTournamentsByStatusStatement.execute({ isComplete });
  } catch (error) {
    console.error(`Failed to get tournaments with status ${isComplete}:`, error);
    throw new Error(`Failed to get tournaments by status: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Create a new tournament
 */
export async function createTournament(nameOrData: string | TournamentInsert): Promise<Tournament> {
  try {
    const data = typeof nameOrData === 'string' 
      ? { name: nameOrData, isComplete: false } 
      : nameOrData;
    
    const result = await db.insert(tournaments).values(data).returning();
    
    if (!result.length) {
      throw new Error('Failed to create tournament');
    }
    
    return result[0];
  } catch (error) {
    console.error('Failed to create tournament:', error);
    throw new Error(`Failed to create tournament: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Create multiple tournaments in a batch operation
 */
export async function createTournaments(tournamentsList: TournamentInsert[]): Promise<Tournament[]> {
  try {
    if (tournamentsList.length === 0) {
      return [];
    }
    
    const result = await db.insert(tournaments).values(tournamentsList).returning();
    return result;
  } catch (error) {
    console.error('Failed to create tournaments in batch:', error);
    throw new Error(`Failed to create tournaments: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Update a tournament
 */
export async function updateTournament(name: string, data: Partial<Tournament>): Promise<Tournament | null> {
  try {
    const result = await db
      .update(tournaments)
      .set(data)
      .where(eq(tournaments.name, name))
      .returning();
    
    if (!result.length) {
      return null;
    }
    
    return result[0];
  } catch (error) {
    console.error(`Failed to update tournament with name ${name}:`, error);
    throw new Error(`Failed to update tournament: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Update multiple tournaments in a single transaction
 */
export async function batchUpdateTournaments(updates: BatchTournamentUpdate[]): Promise<Tournament[]> {
  try {
    if (updates.length === 0) {
      return [];
    }
    
    const updatedTournaments: Tournament[] = [];
    
    // Use transaction for atomicity
    await db.transaction(async (tx) => {
      for (const update of updates) {
        const result = await tx
          .update(tournaments)
          .set(update.data)
          .where(eq(tournaments.name, update.name))
          .returning();
        
        if (result.length > 0) {
          updatedTournaments.push(result[0]);
        }
      }
    });
    
    return updatedTournaments;
  } catch (error) {
    console.error('Failed to batch update tournaments:', error);
    throw new Error(`Failed to batch update tournaments: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Delete a tournament
 */
export async function deleteTournament(name: string): Promise<boolean> {
  try {
    // Find all events related to this tournament for cascading delete
    const tournamentEvents = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.tname, name));
    
    const eventIds = tournamentEvents.map(event => event.id);
    
    // Use transaction to ensure all related records are deleted
    let deletedCount = 0;
    
    await db.transaction(async (tx) => {
      if (eventIds.length > 0) {
        // Delete all related records
        await tx.delete(fencerEvents).where(inArray(fencerEvents.eventId, eventIds));
        await tx.delete(refereeEvents).where(inArray(refereeEvents.eventId, eventIds));
        await tx.delete(officialEvents).where(inArray(officialEvents.eventId, eventIds));
        await tx.delete(rounds).where(inArray(rounds.eventId, eventIds));
        await tx.delete(events).where(inArray(events.id, eventIds));
      }
      
      // Then delete the tournament
      const result = await tx
        .delete(tournaments)
        .where(eq(tournaments.name, name))
        .returning();
      
      deletedCount = result.length;
    });
    
    return deletedCount > 0;
  } catch (error) {
    console.error(`Failed to delete tournament with name ${name}:`, error);
    throw new Error(`Failed to delete tournament: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Delete multiple tournaments
 */
export async function batchDeleteTournaments(names: string[]): Promise<number> {
  try {
    if (names.length === 0) {
      return 0;
    }
    
    // Find all events related to these tournaments for cascading delete
    const tournamentEvents = await db
      .select({ id: events.id })
      .from(events)
      .where(inArray(events.tname, names));
    
    const eventIds = tournamentEvents.map(event => event.id);
    
    // Use transaction to ensure all related records are deleted
    let deletedCount = 0;
    
    await db.transaction(async (tx) => {
      if (eventIds.length > 0) {
        // Delete all related records
        await tx.delete(fencerEvents).where(inArray(fencerEvents.eventId, eventIds));
        await tx.delete(refereeEvents).where(inArray(refereeEvents.eventId, eventIds));
        await tx.delete(officialEvents).where(inArray(officialEvents.eventId, eventIds));
        await tx.delete(rounds).where(inArray(rounds.eventId, eventIds));
        await tx.delete(events).where(inArray(events.id, eventIds));
      }
      
      // Then delete the tournaments
      const result = await tx
        .delete(tournaments)
        .where(inArray(tournaments.name, names))
        .returning();
      
      deletedCount = result.length;
    });
    
    return deletedCount;
  } catch (error) {
    console.error('Failed to batch delete tournaments:', error);
    throw new Error(`Failed to batch delete tournaments: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get count of tournaments
 */
export async function getTournamentCount(): Promise<number> {
  try {
    const [result] = await getTournamentCountStatement.execute();
    return result.count;
  } catch (error) {
    console.error('Failed to get tournament count:', error);
    throw new Error(`Failed to get tournament count: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Mark a tournament as complete or incomplete
 */
export async function setTournamentStatus(name: string, isComplete: boolean): Promise<Tournament | null> {
  return updateTournament(name, { isComplete });
}

/**
 * Get active (incomplete) tournaments
 */
export async function getActiveTournaments(): Promise<Tournament[]> {
  return getTournamentsByStatus(false);
}

/**
 * Get completed tournaments
 */
export async function getCompletedTournaments(): Promise<Tournament[]> {
  return getTournamentsByStatus(true);
}
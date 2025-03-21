/**
 * Official repository
 * Implements data access operations for the Official domain
 */

import { Official } from '../../core/types';
import { BaseRepository, IBaseRepository } from '../../infrastructure/database/base-repository';
import { officials, officialEvents, events } from '../../infrastructure/database/schema';
import db from '../../infrastructure/database/client';
import { eq, and, like, or } from 'drizzle-orm';

// Define the official insert type - used for creating new officials
export type OfficialInsert = {
  fname: string;
  lname: string;
  nickname?: string;
  deviceId?: string;
};

/**
 * Official repository interface
 * Extends the base repository interface with official-specific operations
 */
export interface IOfficialRepository extends IBaseRepository<Official, OfficialInsert> {
  /**
   * Find an official by name
   */
  findByName(firstName: string, lastName: string): Promise<Official | undefined>;

  /**
   * Search for officials by partial name match
   */
  searchByName(query: string): Promise<Official[]>;

  /**
   * Assign an official to an event
   */
  assignToEvent(officialId: number, eventId: number): Promise<void>;

  /**
   * Remove an official from an event
   */
  removeFromEvent(officialId: number, eventId: number): Promise<void>;

  /**
   * Get all officials assigned to a specific event
   */
  getOfficialsByEvent(eventId: number): Promise<Official[]>;

  /**
   * Get all events assigned to a specific official
   */
  getEventsByOfficial(officialId: number): Promise<number[]>;
}

/**
 * Officials repository implementation
 * Provides data access operations for officials using Drizzle ORM
 */
export class OfficialRepository 
  extends BaseRepository<Official, OfficialInsert>
  implements IOfficialRepository {
  
  constructor() {
    // Initialize with the officials table and the primary key
    super(officials, 'id');
  }

  /**
   * Find an official by first and last name
   */
  async findByName(firstName: string, lastName: string): Promise<Official | undefined> {
    const results = await db
      .select()
      .from(officials)
      .where(
        and(
          eq(officials.fname, firstName),
          eq(officials.lname, lastName)
        )
      )
      .limit(1);
    
    return results.length > 0 ? results[0] : undefined;
  }

  /**
   * Search for officials by partial name match
   */
  async searchByName(query: string): Promise<Official[]> {
    const searchTerm = `%${query}%`;
    return db
      .select()
      .from(officials)
      .where(
        or(
          like(officials.fname, searchTerm),
          like(officials.lname, searchTerm),
          like(officials.nickname, searchTerm)
        )
      );
  }

  /**
   * Assign an official to an event
   */
  async assignToEvent(officialId: number, eventId: number): Promise<void> {
    // Check if the assignment already exists
    const existing = await db
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
      await db.insert(officialEvents).values({
        officialId,
        eventId
      });
    }
  }

  /**
   * Remove an official from an event
   */
  async removeFromEvent(officialId: number, eventId: number): Promise<void> {
    await db
      .delete(officialEvents)
      .where(
        and(
          eq(officialEvents.officialId, officialId),
          eq(officialEvents.eventId, eventId)
        )
      );
  }

  /**
   * Get all officials assigned to a specific event
   */
  async getOfficialsByEvent(eventId: number): Promise<Official[]> {
    return db
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
      .where(eq(officialEvents.eventId, eventId));
  }

  /**
   * Get all events assigned to a specific official
   */
  async getEventsByOfficial(officialId: number): Promise<number[]> {
    const results = await db
      .select({
        eventId: officialEvents.eventId
      })
      .from(officialEvents)
      .where(eq(officialEvents.officialId, officialId));

    return results.map(r => r.eventId);
  }

  /**
   * Create a new official
   */
  async createOfficial(data: OfficialInsert): Promise<Official> {
    return this.create(data);
  }
}

// Create and export a singleton instance of the repository
export const officialRepository = new OfficialRepository();

// Export convenience functions for direct use
export const getAllOfficials = () => officialRepository.findAll();
export const getOfficialById = (id: number) => officialRepository.findById(id);
export const searchOfficials = (query: string) => officialRepository.searchByName(query);
export const createOfficial = (data: OfficialInsert) => officialRepository.create(data);
export const updateOfficial = (id: number, data: Partial<Official>) => officialRepository.update(id, data);
export const deleteOfficial = (id: number) => officialRepository.delete(id);
export const assignOfficialToEvent = (officialId: number, eventId: number) => officialRepository.assignToEvent(officialId, eventId);
export const removeOfficialFromEvent = (officialId: number, eventId: number) => officialRepository.removeFromEvent(officialId, eventId);
export const getOfficialsByEvent = (eventId: number) => officialRepository.getOfficialsByEvent(eventId);
export const getEventsByOfficial = (officialId: number) => officialRepository.getEventsByOfficial(officialId);

// Export the repository for direct access
export default officialRepository;
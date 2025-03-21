/**
 * Event repository
 * Implements data access operations for the Events domain
 */

import { Event } from '../../core/types';
import { BaseRepository, IBaseRepository } from '../../infrastructure/database/base-repository';
import { events } from '../../infrastructure/database/schema';
import db from '../../infrastructure/database/client';
import { eq, and } from 'drizzle-orm';

// Define the event insert type - used for creating new events
export type EventInsert = {
  tname: string;      // Tournament name
  weapon: string;     // Weapon type (foil, epee, sabre)
  gender: string;     // Gender category
  age: string;        // Age category
  class: string;      // Classification
  seeding?: string;   // Seeding method
};

/**
 * Event repository interface
 * Extends the base repository interface with event-specific operations
 */
export interface IEventRepository extends IBaseRepository<Event, EventInsert> {
  /**
   * Find events by tournament name
   */
  findByTournament(tournamentName: string): Promise<Event[]>;

  /**
   * Get event with all related data (fencers, referees, etc)
   */
  getEventWithRelations(eventId: number): Promise<Event>;
}

/**
 * Events repository implementation
 * Provides data access operations for events using Drizzle ORM
 */
export class EventRepository 
  extends BaseRepository<Event, EventInsert>
  implements IEventRepository {
  
  constructor() {
    // Initialize with the events table and the primary key (id)
    super(events, 'id');
  }

  /**
   * Find events by tournament name
   */
  async findByTournament(tournamentName: string): Promise<Event[]> {
    return this.findByField('tname', tournamentName);
  }

  /**
   * Get event with all related data (fencers, referees, etc)
   * This is a more complex query that joins multiple tables
   */
  async getEventWithRelations(eventId: number): Promise<Event> {
    // First get the basic event data
    const eventData = await this.findById(eventId);
    
    if (!eventData) {
      throw new Error(`Event with id ${eventId} not found`);
    }
    
    // TODO: Implement the relations loading when we have the fencer and referee domains
    // For now, just return the basic event data
    
    return eventData;
  }
}

// Create and export a singleton instance of the repository
export const eventRepository = new EventRepository();

// Export convenience functions for direct use
export const getAllEvents = () => eventRepository.findAll();
export const getEventById = (id: number) => eventRepository.findById(id);
export const getEventsByTournament = (tournamentName: string) => eventRepository.findByTournament(tournamentName);
export const createEvent = (data: EventInsert) => eventRepository.create(data);
export const updateEvent = (id: number, data: Partial<Event>) => eventRepository.update(id, data);
export const deleteEvent = (id: number) => eventRepository.delete(id);

// Export the repository for direct access
export default eventRepository;
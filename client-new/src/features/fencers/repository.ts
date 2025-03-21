/**
 * Fencer repository
 * Implements data access operations for the Fencer domain
 */

import { Fencer } from '../../core/types';
import { BaseRepository, IBaseRepository } from '../../infrastructure/database/base-repository';
import { fencers } from '../../infrastructure/database/schema';
import db from '../../infrastructure/database/client';
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
 * Fencer repository interface
 * Extends the base repository interface with fencer-specific operations
 */
export interface IFencerRepository extends IBaseRepository<Fencer, FencerInsert> {
  /**
   * Find a fencer by name
   */
  findByName(firstName: string, lastName: string): Promise<Fencer | undefined>;

  /**
   * Search for fencers by partial name match
   */
  searchByName(query: string): Promise<Fencer[]>;

  /**
   * Find fencers by club
   */
  findByClub(club: string): Promise<Fencer[]>;
}

/**
 * Fencers repository implementation
 * Provides data access operations for fencers using Drizzle ORM
 */
export class FencerRepository 
  extends BaseRepository<Fencer, FencerInsert>
  implements IFencerRepository {
  
  constructor() {
    // Initialize with the fencers table and the primary key (id)
    super(fencers, 'id');
  }

  /**
   * Find a fencer by first and last name
   */
  async findByName(firstName: string, lastName: string): Promise<Fencer | undefined> {
    const results = await db
      .select()
      .from(fencers)
      .where(
        and(
          eq(fencers.fname, firstName),
          eq(fencers.lname, lastName)
        )
      )
      .limit(1);
    
    return results.length > 0 ? results[0] : undefined;
  }

  /**
   * Search for fencers by partial name match
   */
  async searchByName(query: string): Promise<Fencer[]> {
    const searchTerm = `%${query}%`;
    return db
      .select()
      .from(fencers)
      .where(
        or(
          like(fencers.fname, searchTerm),
          like(fencers.lname, searchTerm),
          like(fencers.nickname, searchTerm)
        )
      );
  }

  /**
   * Find fencers by club
   */
  async findByClub(club: string): Promise<Fencer[]> {
    return this.findByField('club', club);
  }

  /**
   * Create a new fencer with full details
   */
  async createFencer(fencerData: FencerInsert): Promise<Fencer> {
    return this.create(fencerData);
  }
}

// Create and export a singleton instance of the repository
export const fencerRepository = new FencerRepository();

// Export convenience functions for direct use
export const getAllFencers = () => fencerRepository.findAll();
export const getFencerById = (id: number) => fencerRepository.findById(id);
export const searchFencers = (query: string) => fencerRepository.searchByName(query);
export const getFencersByClub = (club: string) => fencerRepository.findByClub(club);
export const createFencer = (data: FencerInsert) => fencerRepository.create(data);
export const updateFencer = (id: number, data: Partial<Fencer>) => fencerRepository.update(id, data);
export const deleteFencer = (id: number) => fencerRepository.delete(id);

// Export the repository for direct access
export default fencerRepository;
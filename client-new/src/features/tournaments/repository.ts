/**
 * Tournament repository
 * Implements data access operations for the Tournament domain
 */

import { Tournament } from '../../core/types';
import { BaseRepository, IBaseRepository } from '../../infrastructure/database/base-repository';
import { tournaments } from '../../infrastructure/database/schema';
import db from '../../infrastructure/database/client';
import { eq } from 'drizzle-orm';

// Define the tournament insert type - used for creating new tournaments
export type TournamentInsert = {
  name: string;
  isComplete?: boolean;
};

/**
 * Tournament repository interface
 * Extends the base repository interface with tournament-specific operations
 */
export interface ITournamentRepository extends IBaseRepository<Tournament, TournamentInsert> {
  /**
   * Find a tournament by name
   */
  findByName(name: string): Promise<Tournament | undefined>;

  /**
   * Find all tournaments of a specific type (complete/incomplete)
   */
  findByStatus(isComplete: boolean): Promise<Tournament[]>;

  /**
   * Create a tournament with default settings
   */
  createWithName(name: string): Promise<Tournament>;
}

/**
 * Tournaments repository implementation
 * Provides data access operations for tournaments using Drizzle ORM
 */
export class TournamentRepository 
  extends BaseRepository<Tournament, TournamentInsert>
  implements ITournamentRepository {
  
  constructor() {
    // Initialize with the tournaments table and the primary key (name)
    super(tournaments, 'name');
  }

  /**
   * Find a tournament by name
   */
  async findByName(name: string): Promise<Tournament | undefined> {
    return this.findById(name);
  }

  /**
   * Find all tournaments of a specific type (complete/incomplete)
   */
  async findByStatus(isComplete: boolean): Promise<Tournament[]> {
    return this.findByField('isComplete', isComplete);
  }

  /**
   * Create a tournament with default settings
   */
  async createWithName(name: string): Promise<Tournament> {
    return this.create({ name, isComplete: false });
  }
}

// Create and export a singleton instance of the repository
export const tournamentRepository = new TournamentRepository();

// Export convenience functions for direct use
export const getAllTournaments = () => tournamentRepository.findAll();
export const getTournamentByName = (name: string) => tournamentRepository.findByName(name);
export const createTournament = (name: string) => tournamentRepository.createWithName(name);
export const deleteTournament = (name: string) => tournamentRepository.delete(name);
export const getActiveTournaments = () => tournamentRepository.findByStatus(false);
export const getCompletedTournaments = () => tournamentRepository.findByStatus(true);

// Export the repository for direct access
export default tournamentRepository;
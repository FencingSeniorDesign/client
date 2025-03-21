/**
 * Referee repository
 * Implements data access operations for the Referee domain
 */

import { Referee, Bout, FencerBout } from '../../core/types';
import { BaseRepository, IBaseRepository } from '../../infrastructure/database/base-repository';
import { referees, bouts, fencerBouts } from '../../infrastructure/database/schema';
import db from '../../infrastructure/database/client';
import { eq, and, or } from 'drizzle-orm';

// Define the referee insert type - used for creating new referees
export type RefereeInsert = {
  fname: string;
  lname: string;
  nickname?: string;
  deviceId?: string;
};

/**
 * Referee repository interface
 * Extends the base repository interface with referee-specific operations
 */
export interface IRefereeRepository extends IBaseRepository<Referee, RefereeInsert> {
  /**
   * Find referees by name
   */
  findByName(name: string): Promise<Referee[]>;

  /**
   * Find a referee by device ID
   */
  findByDeviceId(deviceId: string): Promise<Referee | undefined>;

  /**
   * Find all active bouts for a referee
   */
  findActiveBoutsByRefereeId(refereeId: number): Promise<Bout[]>;

  /**
   * Update bout scores
   */
  updateBoutScores(boutId: number, fencer1Id: number, fencer1Score: number, fencer2Id: number, fencer2Score: number): Promise<void>;

  /**
   * Set bout victor
   */
  setBoutVictor(boutId: number, victorId: number): Promise<void>;

  /**
   * Get a specific bout with its fencer scores
   */
  getBoutWithScores(boutId: number): Promise<{ bout: Bout, scores: FencerBout[] } | undefined>;
}

/**
 * Referee repository implementation
 * Provides data access operations for referees using Drizzle ORM
 */
export class RefereeRepository 
  extends BaseRepository<Referee, RefereeInsert>
  implements IRefereeRepository {
  
  constructor() {
    // Initialize with the referee table and the primary key
    super(referees, 'id');
  }

  /**
   * Find referees by name (first, last, or nickname)
   */
  async findByName(name: string): Promise<Referee[]> {
    const searchTerm = `%${name}%`.toLowerCase();
    
    return db
      .select()
      .from(referees)
      .where(
        or(
          eq(referees.fname.toLowerCase(), searchTerm),
          eq(referees.lname.toLowerCase(), searchTerm),
          eq(referees.nickname?.toLowerCase(), searchTerm)
        )
      );
  }

  /**
   * Find a referee by device ID
   */
  async findByDeviceId(deviceId: string): Promise<Referee | undefined> {
    return this.findOneByField('deviceId', deviceId);
  }

  /**
   * Find all active bouts for a referee
   */
  async findActiveBoutsByRefereeId(refereeId: number): Promise<Bout[]> {
    return db
      .select()
      .from(bouts)
      .where(
        and(
          eq(bouts.referee, refereeId),
          eq(bouts.victor, null)
        )
      );
  }

  /**
   * Update bout scores for two fencers
   */
  async updateBoutScores(
    boutId: number, 
    fencer1Id: number, 
    fencer1Score: number, 
    fencer2Id: number, 
    fencer2Score: number
  ): Promise<void> {
    // First get or create the fencer bout records
    const fencer1Bout = await db
      .select()
      .from(fencerBouts)
      .where(
        and(
          eq(fencerBouts.boutId, boutId),
          eq(fencerBouts.fencerId, fencer1Id)
        )
      )
      .limit(1);
    
    const fencer2Bout = await db
      .select()
      .from(fencerBouts)
      .where(
        and(
          eq(fencerBouts.boutId, boutId),
          eq(fencerBouts.fencerId, fencer2Id)
        )
      )
      .limit(1);
    
    // Start a transaction
    await db.transaction(async (tx) => {
      // Update or create the first fencer's score
      if (fencer1Bout.length > 0) {
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
      if (fencer2Bout.length > 0) {
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
  }

  /**
   * Set the victor for a bout
   */
  async setBoutVictor(boutId: number, victorId: number): Promise<void> {
    await db
      .update(bouts)
      .set({ victor: victorId })
      .where(eq(bouts.id, boutId));
  }

  /**
   * Get a specific bout with its fencer scores
   */
  async getBoutWithScores(boutId: number): Promise<{ bout: Bout, scores: FencerBout[] } | undefined> {
    const boutResults = await db
      .select()
      .from(bouts)
      .where(eq(bouts.id, boutId))
      .limit(1);
    
    if (boutResults.length === 0) {
      return undefined;
    }
    
    const bout = boutResults[0];
    
    const scores = await db
      .select()
      .from(fencerBouts)
      .where(eq(fencerBouts.boutId, boutId));
    
    return { bout, scores };
  }
}

// Create and export a singleton instance of the repository
export const refereeRepository = new RefereeRepository();

// Export convenience functions for direct use
export const getAllReferees = () => refereeRepository.findAll();
export const getRefereeById = (id: number) => refereeRepository.findById(id);
export const getRefereesByName = (name: string) => refereeRepository.findByName(name);
export const getRefereeByDeviceId = (deviceId: string) => refereeRepository.findByDeviceId(deviceId);
export const getActiveBoutsByRefereeId = (refereeId: number) => refereeRepository.findActiveBoutsByRefereeId(refereeId);
export const updateBoutScores = (boutId: number, fencer1Id: number, fencer1Score: number, fencer2Id: number, fencer2Score: number) => 
  refereeRepository.updateBoutScores(boutId, fencer1Id, fencer1Score, fencer2Id, fencer2Score);
export const setBoutVictor = (boutId: number, victorId: number) => refereeRepository.setBoutVictor(boutId, victorId);
export const getBoutWithScores = (boutId: number) => refereeRepository.getBoutWithScores(boutId);

// Export the repository for direct access
export default refereeRepository;
/**
 * Tournament API
 * 
 * Domain-specific API methods for tournaments
 */

import { ApiClient } from '../../../infrastructure/networking/client';
import { Tournament } from '../../../core/types';

// Remote tournament type (from API) which might have additional properties
interface RemoteTournament {
  name: string;         // Used as the primary identifier
  isComplete: boolean;
  date?: string;
  location?: string;
}

export class TournamentApi {
  private client: ApiClient;
  
  constructor(client: ApiClient) {
    this.client = client;
  }
  
  /**
   * Get all tournaments
   */
  async getTournaments(): Promise<Tournament[]> {
    return this.client.get<RemoteTournament[]>('tournaments')
      .then(remoteTournaments => 
        remoteTournaments.map(rt => ({
          name: rt.name,
          isComplete: rt.isComplete
        }))
      );
  }
  
  /**
   * Get tournament by name
   */
  async getTournamentByName(name: string): Promise<Tournament | undefined> {
    return this.client.get<RemoteTournament>(`tournaments/${name}`)
      .then(remoteTournament => ({
        name: remoteTournament.name,
        isComplete: remoteTournament.isComplete
      }))
      .catch(() => undefined);
  }
  
  /**
   * Create a new tournament
   */
  async createTournament(name: string, isComplete: boolean = false): Promise<Tournament> {
    return this.client.post<RemoteTournament>(
      'tournaments', 
      { name, isComplete }
    ).then(remoteTournament => ({
      name: remoteTournament.name,
      isComplete: remoteTournament.isComplete
    }));
  }
  
  /**
   * Update a tournament
   */
  async updateTournament(name: string, data: Partial<Tournament>): Promise<Tournament> {
    return this.client.put<RemoteTournament>(
      `tournaments/${name}`, 
      data
    ).then(remoteTournament => ({
      name: remoteTournament.name,
      isComplete: remoteTournament.isComplete
    }));
  }
  
  /**
   * Delete a tournament
   */
  async deleteTournament(name: string): Promise<void> {
    return this.client.delete<void>(`tournaments/${name}`);
  }
  
  /**
   * Mark a tournament as complete
   */
  async completeTournament(name: string): Promise<Tournament> {
    return this.updateTournament(name, { isComplete: true });
  }
}

// Create and export a singleton instance using the default client
import tournamentClient from '../../../infrastructure/networking/client';
export const tournamentApi = new TournamentApi(tournamentClient);

// Export default for convenience
export default tournamentApi;
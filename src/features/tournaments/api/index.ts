/**
 * Tournament API
 * 
 * Domain-specific API methods for tournaments
 */

import { ApiClient } from '../../../infrastructure/networking/client';

// Example tournament type
interface Tournament {
  id: string;
  name: string;
  date: string;
  location: string;
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
    return this.client.get<Tournament[]>('tournaments');
  }
  
  /**
   * Get tournament by ID
   */
  async getTournamentById(id: string): Promise<Tournament> {
    return this.client.get<Tournament>(`tournaments/${id}`);
  }
  
  /**
   * Create a new tournament
   */
  async createTournament(tournament: Omit<Tournament, 'id'>): Promise<Tournament> {
    return this.client.post<Tournament>('tournaments', tournament);
  }
  
  /**
   * Update a tournament
   */
  async updateTournament(id: string, tournament: Partial<Tournament>): Promise<Tournament> {
    return this.client.put<Tournament>(`tournaments/${id}`, tournament);
  }
  
  /**
   * Delete a tournament
   */
  async deleteTournament(id: string): Promise<void> {
    return this.client.delete<void>(`tournaments/${id}`);
  }
}
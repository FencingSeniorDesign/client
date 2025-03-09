// src/networking/TournamentServer.ts - With data broadcasting
import TcpSocket from 'react-native-tcp-socket';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Tournament, Event } from '../navigation/navigation/types';
import { getLocalIpAddress } from './NetworkUtils';
import { dbListEvents, dbGetRoundsForEvent } from '../db/TournamentDatabaseUtils';

// Constants
const DEFAULT_PORT = 9001;
const SERVER_INFO_KEY = 'tournament_server_info';

interface ServerInfo {
    tournamentName: string;
    hostIp: string;
    port: number;
    isActive: boolean;
}

class TournamentServer {
    private server: any = null;
    private clients: Map<string, any> = new Map();
    private serverInfo: ServerInfo | null = null;
    private cachedTournamentData: any = null;
    private tournamentDataLastUpdated: number = 0;
    private tournamentDataRefreshInterval: number = 30000; // 30 seconds

    // Start TCP server for a tournament
    async startServer(tournament: Tournament): Promise<boolean> {
        try {
            if (this.server) {
                await this.stopServer();
            }

            // Get the device's local IP address
            const localIp = await getLocalIpAddress();

            console.log(`Starting server with local IP: ${localIp || 'unknown'}`);

            this.serverInfo = {
                tournamentName: tournament.name,
                hostIp: localIp || '0.0.0.0', // Use the actual IP if available
                port: DEFAULT_PORT,
                isActive: true
            };

            // Cache tournament data for quick responses
            await this.refreshTournamentData(tournament.name);

            // Create TCP server without specifying a host to avoid interface errors
            // This will bind to all available interfaces
            const options = {
                port: DEFAULT_PORT
                // Deliberately not specifying host to avoid interface errors
            };

            console.log('Creating server with options:', JSON.stringify(options));

            this.server = TcpSocket.createServer((socket) => {
                const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
                console.log(`Client connected: ${clientId}`);

                this.clients.set(clientId, socket);

                // Handle data received from client
                socket.on('data', (data) => {
                    try {
                        console.log(`Received from ${clientId}: ${data.toString()}`);
                        this.handleClientMessage(clientId, data.toString());
                    } catch (error) {
                        console.error(`Error processing data from ${clientId}:`, error);
                    }
                });

                // Handle client disconnection
                socket.on('close', () => {
                    console.log(`Client disconnected: ${clientId}`);
                    this.clients.delete(clientId);
                });

                // Handle errors
                socket.on('error', (error) => {
                    console.error(`Error with client ${clientId}:`, error);
                    this.clients.delete(clientId);
                    try {
                        socket.destroy();
                    } catch (e) {
                        console.error('Error destroying socket:', e);
                    }
                });

                // Send welcome message
                try {
                    socket.write(JSON.stringify({
                        type: 'welcome',
                        tournamentName: tournament.name
                    }));
                } catch (error) {
                    console.error('Error sending welcome message:', error);
                }
            });

            // Handle server errors
            this.server.on('error', (error: Error) => {
                console.error('Server error:', error);
                this.stopServer();
                return false;
            });

            // Start listening without specifying a host
            this.server.listen(options, () => {
                console.log(`Tournament server started for ${tournament.name} on port ${DEFAULT_PORT}`);
            });

            // Save server info to AsyncStorage
            await AsyncStorage.setItem(SERVER_INFO_KEY, JSON.stringify(this.serverInfo));
            return true;
        } catch (error) {
            console.error('Failed to start server:', error);
            this.serverInfo = null;
            return false;
        }
    }

    // Stop the server
    async stopServer(): Promise<boolean> {
        try {
            if (this.server) {
                // Notify all clients that the server is shutting down
                this.broadcastMessage({
                    type: 'server_closing',
                    message: 'Tournament server is shutting down'
                });

                // Close all client connections
                for (const client of this.clients.values()) {
                    try {
                        client.destroy();
                    } catch (e) {
                        console.error('Error closing client connection:', e);
                    }
                }
                this.clients.clear();

                // Clear cached data
                this.cachedTournamentData = null;

                // Close the server
                try {
                    this.server.close(() => {
                        console.log('Server closed successfully');
                    });
                } catch (e) {
                    console.error('Error closing server:', e);
                }

                this.server = null;
                this.serverInfo = null;

                // Remove server info from AsyncStorage
                await AsyncStorage.removeItem(SERVER_INFO_KEY);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to stop server:', error);
            return false;
        }
    }

    // Check if server is running
    isServerRunning(): boolean {
        return this.server !== null;
    }

    // Get current server info
    getServerInfo(): ServerInfo | null {
        return this.serverInfo;
    }

    // Fetch and cache tournament data (events, rounds, etc.)
    private async refreshTournamentData(tournamentName: string): Promise<void> {
        try {
            // Check if we need to refresh (based on time since last update)
            const now = Date.now();
            if (this.cachedTournamentData &&
                now - this.tournamentDataLastUpdated < this.tournamentDataRefreshInterval) {
                return; // Use cached data if it's recent enough
            }

            // Fetch events
            const events = await dbListEvents(tournamentName);

            // For each event, fetch its rounds
            const eventsWithRounds = await Promise.all(events.map(async (event) => {
                const rounds = await dbGetRoundsForEvent(event.id);
                return {
                    ...event,
                    rounds
                };
            }));

            // Cache the data
            this.cachedTournamentData = {
                tournamentName,
                events: eventsWithRounds,
                lastUpdated: now
            };

            this.tournamentDataLastUpdated = now;
            console.log(`Tournament data refreshed for ${tournamentName}`);
        } catch (error) {
            console.error('Error refreshing tournament data:', error);
        }
    }

    // Handle a message from a client
    private handleClientMessage(clientId: string, message: string): void {
        try {
            const data = JSON.parse(message);

            // Handle different message types
            switch (data.type) {
                case 'join_request':
                    this.handleJoinRequest(clientId, data);
                    break;
                case 'update_scores':
                    this.handleScoreUpdate(clientId, data);
                    break;
                case 'request_tournament_data':
                    this.handleTournamentDataRequest(clientId);
                    break;
                default:
                    console.log(`Unknown message type: ${data.type}`);
            }
        } catch (error) {
            console.error('Error handling client message:', error);
        }
    }

    // Handle a join request from a client
    private handleJoinRequest(clientId: string, data: any): void {
        const client = this.clients.get(clientId);
        if (client) {
            // Respond to the join request
            console.log(`Sending join response to ${clientId}`);
            try {
                client.write(JSON.stringify({
                    type: 'join_response',
                    success: true,
                    message: `Successfully joined ${this.serverInfo?.tournamentName}`
                }));
            } catch (error) {
                console.error('Error sending join response:', error);
            }
        }
    }

    // Handle a score update from a client
    private handleScoreUpdate(clientId: string, data: any): void {
        // Handle score update and broadcast to all clients
        console.log(`Broadcasting score update from ${clientId}`);
        this.broadcastMessage({
            type: 'score_update',
            boutId: data.boutId,
            scoreA: data.scoreA,
            scoreB: data.scoreB
        });
    }

    // Handle request for tournament data
    private async handleTournamentDataRequest(clientId: string): Promise<void> {
        console.log(`Client ${clientId} requested tournament data`);

        if (!this.serverInfo) {
            console.error('No server info available');
            return;
        }

        try {
            // Refresh tournament data if needed
            await this.refreshTournamentData(this.serverInfo.tournamentName);

            // Send data to the requesting client
            const client = this.clients.get(clientId);
            if (client) {
                client.write(JSON.stringify({
                    type: 'tournament_data',
                    tournamentData: this.cachedTournamentData
                }));
                console.log(`Tournament data sent to client ${clientId}`);
            }
        } catch (error) {
            console.error('Error handling tournament data request:', error);
        }
    }

    // Broadcast a message to all connected clients
    private broadcastMessage(message: any): void {
        const messageStr = JSON.stringify(message);
        for (const [clientId, client] of this.clients.entries()) {
            try {
                client.write(messageStr);
            } catch (error) {
                console.error(`Error sending message to client ${clientId}:`, error);
                try {
                    client.destroy();
                    this.clients.delete(clientId);
                } catch (e) {
                    console.error(`Error destroying client ${clientId}:`, e);
                }
            }
        }
    }

    // Broadcast tournament state update to all clients
    broadcastTournamentUpdate(data: any): void {
        const message = {
            type: 'tournament_update',
            tournamentName: this.serverInfo?.tournamentName,
            timestamp: new Date().toISOString(),
            data
        };

        this.broadcastMessage(message);
    }

    // Load server info from AsyncStorage
    async loadServerInfo(): Promise<ServerInfo | null> {
        try {
            const infoStr = await AsyncStorage.getItem(SERVER_INFO_KEY);
            if (infoStr) {
                this.serverInfo = JSON.parse(infoStr);
                return this.serverInfo;
            }
            return null;
        } catch (error) {
            console.error('Error loading server info:', error);
            return null;
        }
    }

    // Get the number of connected clients
    getConnectedClientCount(): number {
        return this.clients.size;
    }
}

// Create singleton instance
const tournamentServer = new TournamentServer();
export default tournamentServer;
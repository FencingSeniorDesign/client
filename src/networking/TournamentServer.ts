// src/networking/TournamentServer.ts - With Zeroconf service discovery and NDJSON format
// NDJSON (Newline Delimited JSON) provides improved streaming data handling by separating
// JSON objects with newlines, allowing for simpler parsing and better error recovery
import TcpSocket from 'react-native-tcp-socket';
import AsyncStorage from 'expo-sqlite/kv-store';
import { Tournament } from '../navigation/navigation/types';
import { getLocalIpAddress, publishTournamentService, unpublishTournamentService } from './NetworkUtils';
import {
    dbListEvents,
    dbGetRoundsForEvent,
    dbGetPoolsForRound,
    dbGetBoutsForPool,
    dbUpdateBoutScores,
    dbMarkRoundAsComplete,
} from '../db/DrizzleDatabaseUtils';

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
    private queryClient: any = null; // TanStack Query client

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
                isActive: true,
            };

            // Cache tournament data for quick responses
            await this.refreshTournamentData(tournament.name);

            // Invalidate any existing cache for this tournament if queryClient is available
            if (this.queryClient) {
                console.log(`🔄 Invalidating cache for tournament ${tournament.name} on server start`);
                this.queryClient.invalidateQueries({ queryKey: ['tournament', tournament.name] });
                this.queryClient.invalidateQueries({ queryKey: ['events', tournament.name] });
                this.queryClient.invalidateQueries({ queryKey: ['tournaments'] });
            }

            // Create TCP server without specifying a host to avoid interface errors
            // This will bind to all available interfaces
            const options = {
                port: DEFAULT_PORT,
                // Deliberately not specifying host to avoid interface errors
            };

            console.log('Creating server with options:', JSON.stringify(options));

            this.server = TcpSocket.createServer(socket => {
                const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
                console.log(`Client connected: ${clientId}`);

                this.clients.set(clientId, socket);

                // Handle data received from client
                let buffer = ''; // Buffer to accumulate partial messages

                socket.on('data', data => {
                    try {
                        const dataStr = data.toString();
                        console.log(`Raw data received from ${clientId}: ${dataStr.length} bytes`);

                        // Append to buffer
                        buffer += dataStr;

                        // Split by newlines and process each line (NDJSON format)
                        const lines = buffer.split('\n');

                        // Process all complete lines
                        for (let i = 0; i < lines.length - 1; i++) {
                            const line = lines[i].trim();
                            if (line) {
                                try {
                                    console.log(`Processing NDJSON line from ${clientId}: ${line.length} bytes`);
                                    this.handleClientMessage(clientId, line);
                                } catch (error) {
                                    console.error(`Error processing NDJSON line from ${clientId}:`, error);
                                }
                            }
                        }

                        // Keep the last potentially incomplete line in the buffer
                        buffer = lines[lines.length - 1];

                        // If buffer is getting too large without valid JSON, truncate it
                        if (buffer.length > 10000) {
                            console.error(
                                `Buffer for client ${clientId} too large (${buffer.length} bytes), truncating`
                            );
                            buffer = buffer.substring(buffer.length - 5000); // Keep last 5000 chars
                        }
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
                socket.on('error', error => {
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
                    socket.write(
                        JSON.stringify({
                            type: 'welcome',
                            tournamentName: tournament.name,
                        }) + '\n'
                    ); // Add newline for NDJSON format
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

                // Register the service with Zeroconf
                this.publishService(tournament.name);
            });

            // Save server info to KV store
            await AsyncStorage.setItem(SERVER_INFO_KEY, JSON.stringify(this.serverInfo));
            return true;
        } catch (error) {
            console.error('Failed to start server:', error);
            this.serverInfo = null;
            return false;
        }
    }

    // Publish service using Zeroconf for local discovery
    private publishService(tournamentName: string): void {
        try {
            // Pass the actual tournament name directly without modifications
            // The networking utils will handle making it unique internally
            const success = publishTournamentService(tournamentName, DEFAULT_PORT);

            if (success) {
                console.log(`Published Zeroconf service for tournament: ${tournamentName}`);
            } else {
                console.warn(`Zeroconf service publishing failed for tournament: ${tournamentName}`);
                console.log('Local network discovery may be limited, but direct IP connections will still work');

                // Since Zeroconf failed, we should show the IP address prominently
                this.logServerConnectionInfo();
            }
        } catch (error) {
            console.error('Error publishing service:', error);
            this.logServerConnectionInfo();
        }
    }

    // Log information about how to connect to this server
    private async logServerConnectionInfo(): Promise<void> {
        if (this.serverInfo) {
            console.log('=================================================');
            console.log('SERVER CONNECTION INFORMATION:');
            console.log(`Tournament: ${this.serverInfo.tournamentName}`);
            console.log(`IP Address: ${this.serverInfo.hostIp}`);
            console.log(`Port: ${this.serverInfo.port}`);
            console.log('Share this information with fencers who want to connect');
            console.log('=================================================');
        }
    }

    // Stop the server
    async stopServer(): Promise<boolean> {
        try {
            // Unpublish the service from Zeroconf
            unpublishTournamentService();

            if (this.server) {
                // Notify all clients that the server is shutting down
                this.broadcastMessage({
                    type: 'server_closing',
                    message: 'Tournament server is shutting down',
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

                // Invalidate all cached tournament data if queryClient is available
                if (this.queryClient && this.serverInfo?.tournamentName) {
                    console.log(`🔄 Invalidating all tournament cache on server stop`);
                    this.queryClient.invalidateQueries({ queryKey: ['tournament', this.serverInfo.tournamentName] });
                    this.queryClient.invalidateQueries({ queryKey: ['events', this.serverInfo.tournamentName] });
                    this.queryClient.invalidateQueries({ queryKey: ['tournaments'] });
                    this.queryClient.invalidateQueries({ queryKey: ['rounds'] });
                    this.queryClient.invalidateQueries({ queryKey: ['pools'] });
                    this.queryClient.invalidateQueries({ queryKey: ['bouts'] });
                }

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

                // Remove server info from KV store
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
            if (
                this.cachedTournamentData &&
                now - this.tournamentDataLastUpdated < this.tournamentDataRefreshInterval
            ) {
                return; // Use cached data if it's recent enough
            }

            // Fetch events
            const events = await dbListEvents(tournamentName);

            // For each event, fetch its rounds
            const eventsWithRounds = await Promise.all(
                events.map(async event => {
                    const rounds = await dbGetRoundsForEvent(event.id);
                    return {
                        ...event,
                        rounds,
                    };
                })
            );

            // Cache the data
            this.cachedTournamentData = {
                tournamentName,
                events: eventsWithRounds,
                lastUpdated: now,
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
            console.log(`Server received message from client ${clientId}, type: ${data.type}`);

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
                case 'get_events':
                    this.handleGetEvents(clientId, data);
                    break;
                case 'get_rounds':
                    this.handleGetRounds(clientId, data);
                    break;
                case 'get_pools':
                    this.handleGetPools(clientId, data);
                    break;
                case 'get_pool_bouts':
                    this.handleGetPoolBouts(clientId, data);
                    break;
                case 'update_pool_bout_scores':
                    this.handleUpdatePoolBoutScores(clientId, data);
                    break;
                case 'complete_round':
                    this.handleCompleteRound(clientId, data);
                    break;
                default:
                    console.log(`Unknown message type: ${data.type}`);
            }
        } catch (error) {
            console.error('Error handling client message:', error);
        }
    }

    // Handle a join request from a client
    async handleJoinRequest(clientId: string, data: any): Promise<void> {
        const client = this.clients.get(clientId);
        if (!client) return;

        const deviceId = data.deviceId;
        let assignedRole = 'viewer'; // Default role

        if (deviceId) {
            try {
                // Dynamically import DB utils inside the async method
                const { dbGetOfficialByDeviceId, dbGetRefereeByDeviceId } = require('../db/DrizzleDatabaseUtils');

                console.log(`[Server] Checking role for deviceId: ${deviceId}`);
                const official = await dbGetOfficialByDeviceId(deviceId);
                if (official) {
                    assignedRole = 'tournament_official';
                } else {
                    const referee = await dbGetRefereeByDeviceId(deviceId);
                    if (referee) {
                        assignedRole = 'referee';
                    }
                }
                console.log(`[Server] Assigned role: ${assignedRole} for deviceId: ${deviceId}`);
            } catch (error) {
                console.error(`[Server] Error checking role for deviceId ${deviceId}:`, error);
                // Keep default 'viewer' role on error
            }
        } else {
            console.warn(`[Server] No deviceId provided in join_request from ${clientId}. Assigning 'viewer' role.`);
        }

        // Respond to the join request including the determined role
        console.log(`[Server] Sending join response to ${clientId} with role: ${assignedRole}`);
        try {
            client.write(
                JSON.stringify({
                    type: 'join_response',
                    success: true,
                    message: `Successfully joined ${this.serverInfo?.tournamentName}`,
                    role: assignedRole, // Include the assigned role
                    tournamentName: this.serverInfo?.tournamentName, // Also include tournament name
                }) + '\n'
            ); // Add newline for NDJSON format
        } catch (error) {
            console.error('[Server] Error sending join response:', error);
        }
    }

    // Handle a score update from a client
    private handleScoreUpdate(clientId: string, data: any): void {
        // Handle score update and broadcast to all clients
        console.log(`Broadcasting score update from ${clientId}`);

        // Apply server-side cache invalidation if queryClient is available
        if (this.queryClient) {
            console.log(`🔄 Performing server-side cache invalidation for bout ${data.boutId}`);

            // Perform targeted invalidation if poolId and roundId are available
            if (data.poolId !== undefined && data.roundId !== undefined) {
                console.log(`🔄 Targeted invalidation for pool ${data.poolId} in round ${data.roundId}`);
                this.queryClient.invalidateQueries({
                    queryKey: ['bouts', 'pool', data.roundId, data.poolId],
                });
                this.queryClient.invalidateQueries({
                    queryKey: ['pools', data.roundId],
                });
            } else {
                // Otherwise do broader invalidation
                console.log(`🔄 Broad invalidation of all bout queries`);
                this.queryClient.invalidateQueries({ queryKey: ['bouts'] });
                this.queryClient.invalidateQueries({ queryKey: ['pools'] });
            }
        } else {
            console.log(`⚠️ No queryClient available for server-side cache invalidation`);
        }

        this.broadcastMessage({
            type: 'score_update',
            boutId: data.boutId,
            scoreA: data.scoreA,
            scoreB: data.scoreB,
            poolId: data.poolId,
            roundId: data.roundId,
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
                client.write(
                    JSON.stringify({
                        type: 'tournament_data',
                        tournamentData: this.cachedTournamentData,
                    }) + '\n'
                ); // Add newline for NDJSON format
                console.log(`Tournament data sent to client ${clientId}`);
            }
        } catch (error) {
            console.error('Error handling tournament data request:', error);
        }
    }

    private async handleGetEvents(clientId: string, data: any): Promise<void> {
        if (!this.serverInfo) {
            console.error('No server info available');
            return;
        }

        const tournamentName = data.tournamentName || this.serverInfo.tournamentName;

        try {
            // Refresh tournament data if needed
            await this.refreshTournamentData(tournamentName);

            // Extract just the events data, ensure it's an array
            let events = this.cachedTournamentData?.events || [];

            // Extra safety check to ensure events is always an array
            if (!Array.isArray(events)) {
                console.warn(`Events data is not an array, converting to empty array. Data was:`, events);
                events = [];
            }

            // Send events to the requesting client
            const client = this.clients.get(clientId);
            if (client) {
                try {
                    client.write(
                        JSON.stringify({
                            type: 'events_list',
                            tournamentName,
                            events,
                        }) + '\n'
                    ); // Add newline for NDJSON format
                    console.log(`Events list sent to client ${clientId}: ${events.length} events`);
                } catch (error) {
                    console.error(`Error sending events to client ${clientId}:`, error);
                }
            }
        } catch (error) {
            console.error('Error handling get_events request:', error);

            // Send error response with empty array
            const client = this.clients.get(clientId);
            if (client) {
                try {
                    client.write(
                        JSON.stringify({
                            type: 'events_list',
                            tournamentName,
                            events: [], // Always an array
                            error: 'Failed to fetch events',
                        }) + '\n'
                    ); // Add newline for NDJSON format
                } catch (error) {
                    console.error(`Error sending error response to client ${clientId}:`, error);
                }
            }
        }
    }

    /**
     * Handles a request for rounds data for a specific event
     */
    private async handleGetRounds(clientId: string, data: any): Promise<void> {
        if (!this.serverInfo) {
            console.error('No server info available');
            return;
        }

        console.log(`🔄 Handling get_rounds request from client ${clientId}, data:`, JSON.stringify(data));

        const eventId = data.eventId;
        if (!eventId) {
            console.error('No eventId provided in get_rounds request');

            // Send error response
            const client = this.clients.get(clientId);
            if (client) {
                try {
                    const errorResponse = {
                        type: 'rounds_list',
                        eventId: eventId,
                        rounds: [],
                        error: 'No eventId provided',
                    };
                    console.log(`Sending error rounds_list response to ${clientId}:`, JSON.stringify(errorResponse));
                    client.write(JSON.stringify(errorResponse) + '\n'); // Add newline for NDJSON format
                } catch (error) {
                    console.error(`Error sending error response to client ${clientId}:`, error);
                }
            }
            return;
        }

        try {
            // Fetch rounds from database directly rather than using cached data
            // This ensures we have the most up-to-date rounds information
            console.log(`🔍 Fetching rounds for event ${eventId}...`);
            const rounds = await dbGetRoundsForEvent(eventId);
            console.log(`✅ Fetched ${rounds.length} rounds for event ${eventId}`);

            // Send rounds to the requesting client
            const client = this.clients.get(clientId);
            if (client) {
                try {
                    // Make sure to handle the case where rounds might be null
                    const responseData = {
                        type: 'rounds_list',
                        eventId: eventId,
                        rounds: Array.isArray(rounds) ? rounds : [],
                    };

                    // Verify rounds is serializable
                    try {
                        const responseText = JSON.stringify(responseData);
                        console.log(
                            `🔄 Sending rounds_list response to client ${clientId}: ${rounds.length} rounds (${responseText.length} bytes)`
                        );

                        // Use setTimeout to ensure asynchronous sending, which can help with TCP buffer issues
                        setTimeout(() => {
                            try {
                                client.write(responseText + '\n'); // Add newline for NDJSON format
                                console.log(`✅ Rounds list sent to client ${clientId}`);
                            } catch (innerErr) {
                                console.error(`Error in delayed send to client ${clientId}:`, innerErr);
                            }
                        }, 0);
                    } catch (jsonError) {
                        console.error(`Error stringifying rounds response:`, jsonError);
                        throw new Error('Failed to serialize rounds response');
                    }
                } catch (error) {
                    console.error(`Error sending rounds to client ${clientId}:`, error);
                    throw error;
                }
            } else {
                console.error(`❌ Client ${clientId} not found when sending rounds response`);
                throw new Error(`Client ${clientId} not found`);
            }
        } catch (error) {
            console.error(`❌ Error handling get_rounds request for event ${eventId}:`, error);

            // Send error response with empty array
            const client = this.clients.get(clientId);
            if (client) {
                try {
                    const errorData = {
                        type: 'rounds_list',
                        eventId: eventId,
                        rounds: [],
                        error: 'Failed to fetch rounds: ' + error.message,
                    };
                    console.log(`Sending error rounds_list response:`, JSON.stringify(errorData));
                    client.write(JSON.stringify(errorData) + '\n'); // Add newline for NDJSON format
                } catch (sendError) {
                    console.error(`Error sending error response to client ${clientId}:`, sendError);
                }
            }
        }
    }

    /**
     * Handles a request for pools data for a specific round
     */
    private async handleGetPools(clientId: string, data: any): Promise<void> {
        if (!this.serverInfo) {
            console.error('No server info available');
            return;
        }

        console.log(`🔄 Handling get_pools request from client ${clientId}, data:`, JSON.stringify(data));

        const roundId = data.roundId;
        if (!roundId) {
            console.error('No roundId provided in get_pools request');

            // Send error response
            const client = this.clients.get(clientId);
            if (client) {
                try {
                    const errorResponse = {
                        type: 'pools_list',
                        roundId: roundId,
                        pools: [],
                        error: 'No roundId provided',
                    };
                    console.log(`Sending error pools_list response to ${clientId}:`, JSON.stringify(errorResponse));
                    client.write(JSON.stringify(errorResponse) + '\n'); // Add newline for NDJSON format
                } catch (error) {
                    console.error(`Error sending error response to client ${clientId}:`, error);
                }
            }
            return;
        }

        try {
            // Fetch pools from database
            console.log(`🔍 Fetching pools for round ${roundId}...`);
            const pools = await dbGetPoolsForRound(roundId);
            console.log(`✅ Fetched ${pools.length} pools for round ${roundId}`);

            // Send pools to the requesting client
            const client = this.clients.get(clientId);
            if (client) {
                try {
                    // Make sure to handle the case where pools might be null
                    const responseData = {
                        type: 'pools_list',
                        roundId: roundId,
                        pools: Array.isArray(pools) ? pools : [],
                    };

                    // Verify pools is serializable
                    try {
                        const responseText = JSON.stringify(responseData);
                        console.log(
                            `🔄 Sending pools_list response to client ${clientId}: ${pools.length} pools (${responseText.length} bytes)`
                        );

                        // Use setTimeout to ensure asynchronous sending, which can help with TCP buffer issues
                        setTimeout(() => {
                            try {
                                client.write(responseText + '\n'); // Add newline for NDJSON format
                                console.log(`✅ Pools list sent to client ${clientId}`);
                            } catch (innerErr) {
                                console.error(`Error in delayed send to client ${clientId}:`, innerErr);
                            }
                        }, 0);
                    } catch (jsonError) {
                        console.error(`Error stringifying pools response:`, jsonError);
                        throw new Error('Failed to serialize pools response');
                    }
                } catch (error) {
                    console.error(`Error sending pools to client ${clientId}:`, error);
                    throw error;
                }
            } else {
                console.error(`❌ Client ${clientId} not found when sending pools response`);
                throw new Error(`Client ${clientId} not found`);
            }
        } catch (error) {
            console.error(`❌ Error handling get_pools request for round ${roundId}:`, error);

            // Send error response with empty array
            const client = this.clients.get(clientId);
            if (client) {
                try {
                    const errorData = {
                        type: 'pools_list',
                        roundId: roundId,
                        pools: [],
                        error: 'Failed to fetch pools: ' + error.message,
                    };
                    console.log(`Sending error pools_list response:`, JSON.stringify(errorData));
                    client.write(JSON.stringify(errorData) + '\n'); // Add newline for NDJSON format
                } catch (sendError) {
                    console.error(`Error sending error response to client ${clientId}:`, sendError);
                }
            }
        }
    }

    /**
     * Handles a request for bouts data for a specific pool
     */
    private async handleGetPoolBouts(clientId: string, data: any): Promise<void> {
        if (!this.serverInfo) {
            console.error('No server info available');
            return;
        }

        console.log(`🔄 Handling get_pool_bouts request from client ${clientId}, data:`, JSON.stringify(data));

        const roundId = data.roundId;
        const poolId = data.poolId;

        if (!roundId || poolId === undefined) {
            console.error('Missing roundId or poolId in get_pool_bouts request');

            // Send error response
            const client = this.clients.get(clientId);
            if (client) {
                try {
                    const errorResponse = {
                        type: 'pool_bouts_list',
                        roundId: roundId,
                        poolId: poolId,
                        bouts: [],
                        error: 'Missing roundId or poolId',
                    };
                    console.log(`Sending error pool_bouts_list response:`, JSON.stringify(errorResponse));
                    client.write(JSON.stringify(errorResponse) + '\n'); // Add newline for NDJSON format
                } catch (error) {
                    console.error(`Error sending error response to client ${clientId}:`, error);
                }
            }
            return;
        }

        try {
            // Fetch bouts from database
            console.log(`🔍 Fetching bouts for pool ${poolId} in round ${roundId}...`);
            const bouts = await dbGetBoutsForPool(roundId, poolId);
            console.log(`✅ Fetched ${bouts.length} bouts for pool ${poolId} in round ${roundId}`);

            // Send bouts to the requesting client
            const client = this.clients.get(clientId);
            if (client) {
                try {
                    // Make sure to handle the case where bouts might be null
                    const responseData = {
                        type: 'pool_bouts_list',
                        roundId: roundId,
                        poolId: poolId,
                        bouts: Array.isArray(bouts) ? bouts : [],
                    };

                    // Verify bouts is serializable
                    try {
                        const responseText = JSON.stringify(responseData);
                        console.log(
                            `🔄 Sending pool_bouts_list response to client ${clientId}: ${bouts.length} bouts (${responseText.length} bytes)`
                        );

                        // Use setTimeout to ensure asynchronous sending, which can help with TCP buffer issues
                        setTimeout(() => {
                            try {
                                client.write(responseText + '\n'); // Add newline for NDJSON format
                                console.log(`✅ Pool bouts list sent to client ${clientId}`);
                            } catch (innerErr) {
                                console.error(`Error in delayed send to client ${clientId}:`, innerErr);
                            }
                        }, 0);
                    } catch (jsonError) {
                        console.error(`Error stringifying pool bouts response:`, jsonError);
                        throw new Error('Failed to serialize pool bouts response');
                    }
                } catch (error) {
                    console.error(`Error sending pool bouts to client ${clientId}:`, error);
                    throw error;
                }
            } else {
                console.error(`❌ Client ${clientId} not found when sending pool bouts response`);
                throw new Error(`Client ${clientId} not found`);
            }
        } catch (error) {
            console.error(`❌ Error handling get_pool_bouts request for pool ${poolId}:`, error);

            // Send error response with empty array
            const client = this.clients.get(clientId);
            if (client) {
                try {
                    const errorData = {
                        type: 'pool_bouts_list',
                        roundId: roundId,
                        poolId: poolId,
                        bouts: [], // Always an array
                        error: 'Failed to fetch pool bouts: ' + error.message,
                    };
                    console.log(`Sending error pool_bouts_list response:`, JSON.stringify(errorData));
                    client.write(JSON.stringify(errorData) + '\n'); // Add newline for NDJSON format
                } catch (sendError) {
                    console.error(`Error sending error response to client ${clientId}:`, sendError);
                }
            }
        }
    }

    /**
     * Handles completing a round
     */
    private async handleCompleteRound(clientId: string, data: any): Promise<void> {
        if (!this.serverInfo) {
            console.error('No server info available');
            return;
        }

        console.log(`🔄 Handling complete_round from client ${clientId}, data:`, JSON.stringify(data));

        const { roundId, eventId } = data;

        if (!roundId) {
            console.error('Missing roundId in complete_round request');

            // Send error response
            const client = this.clients.get(clientId);
            if (client) {
                try {
                    const errorResponse = {
                        type: 'round_completed',
                        roundId,
                        success: false,
                        error: 'Missing roundId',
                    };
                    console.log(`Sending error response: ${JSON.stringify(errorResponse)}`);
                    client.write(JSON.stringify(errorResponse) + '\n'); // Add newline for NDJSON format
                } catch (error) {
                    console.error(`Error sending error response to client ${clientId}:`, error);
                }
            }
            return;
        }

        try {
            // Mark the round as complete in the database
            console.log(`🔍 Marking round ${roundId} as complete...`);
            await dbMarkRoundAsComplete(roundId);
            console.log(`✅ Round ${roundId} marked as complete`);

            // Apply server-side cache invalidation if queryClient is available
            if (this.queryClient) {
                console.log(`🔄 Performing server-side cache invalidation for completed round ${roundId}`);

                // Invalidate rounds queries
                this.queryClient.invalidateQueries({ queryKey: ['rounds'] });

                // If eventId is provided, do targeted invalidation
                if (eventId) {
                    console.log(`🔄 Targeted invalidation for event ${eventId}`);
                    this.queryClient.invalidateQueries({ queryKey: ['rounds', eventId] });
                    this.queryClient.invalidateQueries({ queryKey: ['events', { eventId }] });
                }

                // Invalidate pools and bouts for this round
                this.queryClient.invalidateQueries({ queryKey: ['pools', roundId] });
                this.queryClient.invalidateQueries({ queryKey: ['bouts', roundId] });
            } else {
                console.log(`⚠️ No queryClient available for server-side cache invalidation`);
            }

            // Send confirmation to the requesting client
            const client = this.clients.get(clientId);
            if (client) {
                try {
                    const confirmationMessage = {
                        type: 'round_completed',
                        roundId,
                        eventId,
                        success: true,
                    };
                    console.log(
                        `🔄 Sending confirmation to client ${clientId}: ${JSON.stringify(confirmationMessage)}`
                    );

                    // Use setTimeout to avoid any potential network issues
                    setTimeout(() => {
                        try {
                            client.write(JSON.stringify(confirmationMessage) + '\n'); // Add newline for NDJSON format
                            console.log(`✅ Confirmation sent to client ${clientId}`);
                        } catch (innerErr) {
                            console.error(`Error in delayed confirmation send to ${clientId}:`, innerErr);
                        }
                    }, 0);
                } catch (error) {
                    console.error(`Error sending confirmation to client ${clientId}:`, error);
                    throw error;
                }
            }

            // Broadcast the round completion to all clients
            const broadcastMessage = {
                type: 'round_completed_broadcast',
                roundId,
                eventId,
            };
            console.log(`🔄 Broadcasting round completion to all clients: ${JSON.stringify(broadcastMessage)}`);
            this.broadcastMessage(broadcastMessage);
        } catch (error) {
            console.error(`❌ Error handling complete_round request:`, error);

            // Send error response
            const client = this.clients.get(clientId);
            if (client) {
                try {
                    const errorMessage = {
                        type: 'round_completed',
                        roundId,
                        success: false,
                        error: 'Failed to complete round: ' + error.message,
                    };
                    console.log(`Sending error response to client ${clientId}: ${JSON.stringify(errorMessage)}`);
                    client.write(JSON.stringify(errorMessage) + '\n'); // Add newline for NDJSON format
                } catch (sendError) {
                    console.error(`Error sending error response to client ${clientId}:`, sendError);
                }
            }
        }
    }

    /**
     * Handles updating scores for a pool bout
     */
    private async handleUpdatePoolBoutScores(clientId: string, data: any): Promise<void> {
        if (!this.serverInfo) {
            console.error('No server info available');
            return;
        }

        console.log(`🔄 Handling update_pool_bout_scores from client ${clientId}, data:`, JSON.stringify(data));

        // Extract winnerId along with other data
        const { boutId, scoreA, scoreB, fencerAId, fencerBId, winnerId, roundId, poolId } = data;

        if (!boutId || scoreA === undefined || scoreB === undefined || !fencerAId || !fencerBId) {
            console.error('Missing required data in update_pool_bout_scores request');

            // Send error response
            const client = this.clients.get(clientId);
            if (client) {
                try {
                    const errorResponse = {
                        type: 'bout_scores_updated',
                        boutId: boutId,
                        success: false,
                        error: 'Missing required data',
                    };
                    console.log(`Sending error response: ${JSON.stringify(errorResponse)}`);
                    client.write(JSON.stringify(errorResponse) + '\n'); // Add newline for NDJSON format
                } catch (error) {
                    console.error(`Error sending error response to client ${clientId}:`, error);
                }
            }
            return;
        }

        try {
            // Update bout scores in database using the correct function with all parameters, including winnerId
            console.log(
                `🔍 Updating bout ${boutId} scores to ${scoreA}-${scoreB} in database with fencers ${fencerAId} and ${fencerBId}, winner: ${winnerId}...`
            );
            // Pass winnerId to the database function
            await dbUpdateBoutScores(boutId, scoreA, scoreB, fencerAId, fencerBId, winnerId);
            console.log(`✅ Updated scores for bout ${boutId} to ${scoreA}-${scoreB}, winner: ${winnerId}`);

            // Apply server-side cache invalidation if queryClient is available
            if (this.queryClient) {
                console.log(`🔄 Performing server-side cache invalidation for bout ${boutId}`);

                // Perform targeted invalidation if poolId and roundId are available
                if (poolId !== undefined && roundId !== undefined) {
                    console.log(`🔄 Targeted invalidation for pool ${poolId} in round ${roundId}`);
                    this.queryClient.invalidateQueries({
                        queryKey: ['bouts', 'pool', roundId, poolId],
                    });
                    this.queryClient.invalidateQueries({
                        queryKey: ['pools', roundId],
                    });
                } else {
                    // Otherwise do broader invalidation
                    console.log(`🔄 Broad invalidation of all bout and pool queries`);
                    this.queryClient.invalidateQueries({ queryKey: ['bouts'] });
                    this.queryClient.invalidateQueries({ queryKey: ['pools'] });
                }
            } else {
                console.log(`⚠️ No queryClient available for server-side cache invalidation`);
            }

            // First send confirmation to the requesting client
            const client = this.clients.get(clientId);
            if (client) {
                try {
                    const confirmationMessage = {
                        type: 'bout_scores_updated', // This is what the client is waiting for
                        boutId: boutId,
                        scoreA: scoreA,
                        scoreB: scoreB,
                        winnerId: winnerId, // Include winnerId in confirmation
                        roundId: roundId, // Include roundId for targeted cache invalidation
                        poolId: poolId, // Include poolId for targeted cache invalidation
                        success: true,
                    };
                    console.log(
                        `🔄 Sending confirmation to client ${clientId}: ${JSON.stringify(confirmationMessage)}`
                    );

                    // Use setTimeout to avoid any potential network issues
                    setTimeout(() => {
                        try {
                            client.write(JSON.stringify(confirmationMessage) + '\n'); // Add newline for NDJSON format
                            console.log(`✅ Confirmation sent to client ${clientId}`);
                        } catch (innerErr) {
                            console.error(`Error in delayed confirmation send to ${clientId}:`, innerErr);
                        }
                    }, 0);
                } catch (error) {
                    console.error(`Error sending confirmation to client ${clientId}:`, error);
                    throw error;
                }
            }

            // Then broadcast the update to ALL clients
            // This ensures everyone gets the update
            const broadcastMessage = {
                type: 'bout_score_updated', // This is for UI updates in listening clients
                boutId: boutId,
                scoreA: scoreA,
                scoreB: scoreB,
                winnerId: winnerId, // Include winnerId in broadcast
                poolId: poolId, // Include poolId if available for better client handling
                roundId: roundId, // Include roundId if available for better client handling
            };
            console.log(`🔄 Broadcasting bout score update to all clients: ${JSON.stringify(broadcastMessage)}`);
            this.broadcastMessage(broadcastMessage);
        } catch (error) {
            console.error(`❌ Error handling update_pool_bout_scores request:`, error);

            // Send error response
            const client = this.clients.get(clientId);
            if (client) {
                try {
                    const errorMessage = {
                        type: 'bout_scores_updated',
                        boutId: boutId,
                        success: false,
                        error: 'Failed to update bout scores: ' + error.message,
                    };
                    console.log(`Sending error response to client ${clientId}: ${JSON.stringify(errorMessage)}`);
                    client.write(JSON.stringify(errorMessage) + '\n'); // Add newline for NDJSON format
                } catch (sendError) {
                    console.error(`Error sending error response to client ${clientId}:`, sendError);
                }
            }
        }
    }

    // Broadcast a message to all connected clients
    private broadcastMessage(message: any, excludeClientId?: string): void {
        const messageStr = JSON.stringify(message) + '\n'; // Add newline for NDJSON format
        for (const [clientId, client] of this.clients.entries()) {
            if (excludeClientId && clientId === excludeClientId) {
                continue; // Skip the excluded client
            }
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
            data,
        };

        // Apply server-side cache invalidation if queryClient is available
        if (this.queryClient && this.serverInfo?.tournamentName) {
            console.log(`🔄 Performing server-side cache invalidation for tournament update`);

            // Invalidate tournament data
            this.queryClient.invalidateQueries({
                queryKey: ['tournament', this.serverInfo.tournamentName],
            });

            // Invalidate events data
            this.queryClient.invalidateQueries({
                queryKey: ['events', this.serverInfo.tournamentName],
            });

            // If update contains specific data, perform targeted invalidation
            if (data.eventId) {
                this.queryClient.invalidateQueries({
                    queryKey: ['event', data.eventId],
                });
            }

            if (data.roundId) {
                this.queryClient.invalidateQueries({
                    queryKey: ['round', data.roundId],
                });
                this.queryClient.invalidateQueries({
                    queryKey: ['pools', data.roundId],
                });
            }
        } else {
            console.log(`⚠️ No queryClient or tournament name available for cache invalidation`);
        }

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

    // Set the query client for server-side cache invalidation
    setQueryClient(client: any): void {
        this.queryClient = client;
        console.log('TournamentServer: QueryClient has been set for server-side cache invalidation');
    }
}

// Create singleton instance
const tournamentServer = new TournamentServer();
export default tournamentServer;

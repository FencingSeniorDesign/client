// src/networking/TournamentClient.ts - Updated to use NDJSON format for streaming data
// NDJSON (Newline Delimited JSON) provides improved streaming data handling by separating
// JSON objects with newlines, allowing for simpler parsing and better error recovery
import { EventEmitter } from 'events';
import { Alert } from 'react-native';
import TcpSocket from 'react-native-tcp-socket';
import AsyncStorage from 'expo-sqlite/kv-store';

// Constants
const CLIENT_INFO_KEY = 'tournament_client_info';
const SAVED_REMOTE_TOURNAMENTS_KEY = 'saved_remote_tournaments';
const CONNECTION_TIMEOUT = 10000; // Increase timeout for simulators

interface ClientInfo {
    tournamentName: string;
    hostIp: string;
    port: number;
    isConnected: boolean;
    // Added fields for related tournament data
    tournamentData?: any;
}

class TournamentClient extends EventEmitter {
    private socket: any = null;
    private clientInfo: ClientInfo | null = null;
    private reconnectTimer: any = null;
    private messageQueue: string[] = [];
    private connectionAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    // Make this public so manual disconnects can set it to prevent alerts
    public isShowingDisconnectAlert: boolean = false;
    // Flag to track intentional disconnects
    public isIntentionalDisconnect: boolean = false;
    private responsePromises: Map<
        string,
        {
            resolve: (data: any) => void;
            reject: (error: any) => void;
            timeoutId: NodeJS.Timeout;
        }
    > = new Map();

    constructor() {
        super();
    }

    // Connect to a tournament server
    async connectToServer(hostIp: string, port: number): Promise<boolean> {
        try {
            // If we're already connected, disconnect first
            if (this.socket) {
                await this.disconnect();
            }

            // Try to resolve hostname or use IP directly
            let resolvedHost = hostIp;

            // Check if this is a hostname rather than an IP address
            if (!/^\d+\.\d+\.\d+\.\d+$/.test(hostIp)) {
                console.log(`Host appears to be a hostname: ${hostIp}`);

                // If hostname is from mDNS and missing .local suffix, add it
                if (!hostIp.includes('.')) {
                    console.log(`Adding .local suffix to hostname: ${hostIp}`);
                    resolvedHost = `${hostIp}.local`;
                }
                // If it has .local already, use it as is
                else if (hostIp.endsWith('.local')) {
                    console.log(`Using hostname with .local suffix: ${hostIp}`);
                    resolvedHost = hostIp;
                }
                // Otherwise try to use it directly
                else {
                    console.log(`Using hostname as provided: ${hostIp}`);
                }
            }

            console.log(`Attempting to connect to ${resolvedHost}:${port}...`);
            this.connectionAttempts = 0;

            return new Promise((resolve, reject) => {
                // Create simple connection options without problematic interface specifications
                const options = {
                    host: resolvedHost,
                    port: port,
                    tls: false,
                    timeout: CONNECTION_TIMEOUT,
                };

                console.log('Creating socket with options:', JSON.stringify(options));

                // Create TCP client
                try {
                    this.socket = TcpSocket.createConnection(options, async () => {
                        console.log(`Connected to server at ${hostIp}:${port}`);

                        // Import the function to get the device ID
                        const { getDeviceId, getClientId } = require('./NetworkUtils');
                        const deviceId = await getDeviceId();
                        const clientId = await getClientId();

                        console.log(`Sending join request with device ID: ${deviceId}`);

                        // Send join request with device ID
                        // Send join request WITHOUT requesting a specific role
                        this.sendMessageRaw(
                            JSON.stringify({
                                type: 'join_request',
                                deviceId,
                                clientId: clientId,
                            })
                        );

                        this.clientInfo = {
                            tournamentName: '', // Will be updated when server responds
                            hostIp,
                            port,
                            isConnected: true,
                        };

                        // Save client info to AsyncStorage
                        AsyncStorage.setItem(CLIENT_INFO_KEY, JSON.stringify(this.clientInfo));

                        this.connectionAttempts = 0;
                        resolve(true);
                    });
                } catch (error) {
                    console.error('Error creating socket connection:', error);
                    reject(error);
                    return;
                }

                // Set timeout for connection
                const connectionTimeout = setTimeout(() => {
                    console.log('Connection timeout reached!');
                    if (this.socket) {
                        try {
                            this.socket.destroy();
                        } catch (e) {
                            console.error('Error destroying socket on timeout:', e);
                        }
                        this.socket = null;
                    }
                    reject(new Error('Connection timeout - could not connect to server'));
                }, CONNECTION_TIMEOUT);

                // Handle data received from server
                let buffer = ''; // Buffer to accumulate partial messages

                this.socket.on('data', (data: Buffer) => {
                    clearTimeout(connectionTimeout);
                    try {
                        const dataStr = data.toString();
                        console.log(`Raw data received from server: ${dataStr.length} bytes`);

                        // Append to buffer
                        buffer += dataStr;

                        // Split by newlines and process each line (NDJSON format)
                        const lines = buffer.split('\n');

                        // Process all complete lines
                        for (let i = 0; i < lines.length - 1; i++) {
                            const line = lines[i].trim();
                            if (line) {
                                try {
                                    console.log(`Processing NDJSON line: ${line.length} bytes`);
                                    this.handleServerMessage(line);
                                } catch (error) {
                                    console.error('Error processing NDJSON line:', error);
                                }
                            }
                        }

                        // Keep the last potentially incomplete line in the buffer
                        buffer = lines[lines.length - 1];

                        // If buffer is getting too large without valid JSON, truncate it
                        if (buffer.length > 10000) {
                            console.error(`Server message buffer too large (${buffer.length} bytes), truncating`);
                            buffer = buffer.substring(buffer.length - 5000); // Keep last 5000 chars
                        }
                    } catch (error) {
                        console.error('Error processing data from server:', error);
                    }
                });

                // Handle connection closed
                this.socket.on('close', () => {
                    console.log('Connection closed');
                    clearTimeout(connectionTimeout);

                    if (this.socket) {
                        try {
                            this.socket.destroy();
                        } catch (e) {
                            console.error('Error destroying socket on close:', e);
                        }
                        this.socket = null;
                    }

                    if (this.clientInfo) {
                        this.clientInfo.isConnected = false;
                    }

                    this.emit('disconnected');

                    // For socket close, we need to be more cautious - the close event
                    // can be triggered by both intentional and unintentional disconnects
                    // For real server connection loss, emit this event
                    if (!this.isIntentionalDisconnect) {
                        console.log('Emitting connectionLost event due to unexpected socket close');
                        this.emit('connectionLost', this.clientInfo);
                    } else {
                        console.log('Skipping connectionLost event due to intentional disconnect');
                    }

                    // Reset the flag after emitting events
                    this.isIntentionalDisconnect = false;

                    // Don't attempt automatic reconnect as we'll navigate back to home
                    // this.scheduleReconnect();
                });

                // Handle errors
                this.socket.on('error', (error: Error) => {
                    console.error('Socket error:', error);
                    clearTimeout(connectionTimeout);

                    if (this.socket) {
                        try {
                            this.socket.destroy();
                        } catch (e) {
                            console.error('Error destroying socket on error:', e);
                        }
                        this.socket = null;
                    }

                    if (this.clientInfo) {
                        this.clientInfo.isConnected = false;
                    }

                    // For socket errors, we almost always want to emit connectionLost
                    // as errors typically indicate unexpected disconnections
                    console.log('Emitting connectionLost event due to socket error');
                    this.emit('connectionLost', this.clientInfo);

                    // Reset the flag after emitting events
                    this.isIntentionalDisconnect = false;

                    reject(error);
                });
            });
        } catch (error) {
            console.error('Failed to connect to server:', error);
            return false;
        }
    }

    // Disconnect from the server
    async disconnect(): Promise<boolean> {
        try {
            // Skip showing the alert entirely and mark as intentional disconnect
            this.isShowingDisconnectAlert = true;
            this.isIntentionalDisconnect = true;

            this.responsePromises.forEach((handlers, type) => {
                clearTimeout(handlers.timeoutId);
                handlers.reject(new Error('Disconnected from server'));
            });
            this.responsePromises.clear();

            if (this.socket) {
                try {
                    this.socket.destroy();
                } catch (e) {
                    console.error('Error destroying socket on disconnect:', e);
                }
                this.socket = null;
            }

            this.clientInfo = null;

            // Clear reconnect timer
            if (this.reconnectTimer) {
                clearTimeout(this.reconnectTimer);
                this.reconnectTimer = null;
            }

            // Clear message queue
            this.messageQueue = [];
            this.connectionAttempts = 0;

            // Remove client info from AsyncStorage
            await AsyncStorage.removeItem(CLIENT_INFO_KEY);

            // Emit the disconnect event for components that need to react
            this.emit('disconnected');
            return true;
        } catch (error) {
            console.error('Failed to disconnect:', error);
            return false;
        }
    }

    // Check if client is connected
    isConnected(): boolean {
        return this.socket !== null;
    }

    // Get current client info
    getClientInfo(): ClientInfo | null {
        return this.clientInfo;
    }

    // Send a message to the server
    sendMessage(message: any): boolean {
        const messageStr = JSON.stringify(message);
        return this.sendMessageRaw(messageStr);
    }

    // Send a raw string message to the server
    private sendMessageRaw(messageStr: string): boolean {
        if (this.socket) {
            try {
                // Append newline character for NDJSON format
                this.socket.write(messageStr + '\n');
                return true;
            } catch (error) {
                console.error('Error sending message:', error);
                this.messageQueue.push(messageStr);
                return false;
            }
        } else {
            // Queue the message for when connection is restored
            this.messageQueue.push(messageStr);
            return false;
        }
    }

    // Request tournament data from server - called automatically on connection
    requestTournamentData(): boolean {
        return this.sendMessage({
            type: 'request_tournament_data',
        });
    }

    // Request to initialize a round (start it)
    requestInitializeRound(eventId: number, roundId: number): boolean {
        return this.sendMessage({
            type: 'initialize_round',
            eventId,
            roundId,
        });
    }

    // Request pools for a specific round
    requestPools(roundId: number): boolean {
        console.log(`Sending get_pools request for round ${roundId}`);
        const result = this.sendMessage({
            type: 'get_pools',
            roundId,
        });
        if (result) {
            console.log(`Successfully sent get_pools message for round ${roundId}`);
        } else {
            console.error(`Failed to send get_pools message for round ${roundId}`);
        }
        return result;
    }

    // Request bouts for a specific pool
    requestPoolBouts(roundId: number, poolId: number): boolean {
        console.log(`Sending get_pool_bouts request for pool ${poolId} in round ${roundId}`);
        const result = this.sendMessage({
            type: 'get_pool_bouts',
            roundId,
            poolId,
        });
        if (result) {
            console.log(`Successfully sent get_pool_bouts message for pool ${poolId} in round ${roundId}`);
        } else {
            console.error(`Failed to send get_pool_bouts message for pool ${poolId} in round ${roundId}`);
        }
        return result;
    }

    // Update pool bout scores with winner ID for ties
    updatePoolBoutScores(
        boutId: number,
        scoreA: number,
        scoreB: number,
        fencerAId: number,
        fencerBId: number,
        roundId?: number,
        poolId?: number,
        winnerId?: number
    ): boolean {
        console.log(`Sending update_pool_bout_scores for bout ${boutId}: ${scoreA}-${scoreB}, winner: ${winnerId}`);
        const result = this.sendMessage({
            type: 'update_pool_bout_scores',
            boutId,
            scoreA,
            scoreB,
            fencerAId,
            fencerBId,
            roundId, // Include roundId if available for targeted cache invalidation
            poolId, // Include poolId if available for targeted cache invalidation
            winnerId, // Include winnerId to handle ties
        });

        if (result) {
            console.log(`Successfully sent update_pool_bout_scores for bout ${boutId}`);
        } else {
            console.error(`Failed to send update_pool_bout_scores for bout ${boutId}`);
        }

        return result;
    }

    // Handle a message from the server
    private handleServerMessage(message: string): void {
        try {
            const data = JSON.parse(message);
            console.log(
                `Processing message of type: ${data.type}, message:`,
                message.slice(0, 200) + (message.length > 200 ? '...' : '')
            );

            // Validate and normalize events data if present
            if (data.type === 'events_list' && data.events !== undefined) {
                // Ensure events is always an array
                if (!Array.isArray(data.events)) {
                    console.warn(`Received events_list with non-array events:`, data.events);
                    data.events = [];
                }
                console.log(`Normalized events_list contains ${data.events.length} events`);
            }

            // PRE-PROCESS POOLS LIST
            if (data.type === 'pools_list') {
                console.log(
                    `IMPORTANT: Received pools_list for round ${data.roundId} with ${data.pools?.length || 0} pools`
                );
                if (!Array.isArray(data.pools)) {
                    console.warn('pools_list has invalid pools property, fixing...');
                    data.pools = [];
                }
            }

            // PRE-PROCESS POOL BOUTS LIST
            if (data.type === 'pool_bouts_list') {
                console.log(
                    `IMPORTANT: Received pool_bouts_list for pool ${data.poolId} in round ${data.roundId} with ${data.bouts?.length || 0} bouts`
                );
                if (!Array.isArray(data.bouts)) {
                    console.warn('pool_bouts_list has invalid bouts property, fixing...');
                    data.bouts = [];
                }
            }

            // CRITICAL: Process waiting promises BEFORE event handling
            const promiseHandlers = this.responsePromises.get(data.type);
            if (promiseHandlers) {
                console.log(`✅ Resolving promise for ${data.type}`);
                // Call resolve in a setTimeout to avoid any blocking
                setTimeout(() => {
                    try {
                        promiseHandlers.resolve(data);
                    } catch (error) {
                        console.error(`Error in promise resolution for ${data.type}:`, error);
                    }
                }, 0);
            } else {
                console.log(`No waiting promise found for message type: ${data.type}`);
            }

            // Handle different message types
            switch (data.type) {
                case 'welcome':
                    this.handleWelcome(data);
                    break;
                case 'join_response':
                    this.handleJoinResponse(data);
                    break;
                case 'score_update':
                    this.handleScoreUpdate(data);
                    break;
                case 'tournament_update':
                    this.handleTournamentUpdate(data);
                    break;
                case 'tournament_data':
                    this.handleTournamentData(data);
                    break;
                case 'server_closing':
                    this.handleServerClosing(data);
                    break;
                case 'events_list':
                    console.log(`Received events_list with ${data.events ? data.events.length : 0} events`);
                    // Make sure data is complete before emitting
                    if (!data.events) {
                        console.warn('Received events_list with undefined events array, setting to empty array');
                        data.events = [];
                    }
                    break;
                case 'event_statuses':
                    console.log(`Received event_statuses update`);
                    break;
                case 'rounds_list':
                    console.log(
                        `Received rounds_list for event ${data.eventId} with ${data.rounds?.length || 0} rounds`
                    );
                    break;
                case 'round_added':
                case 'round_updated':
                case 'round_deleted':
                    console.log(`Received round update: ${data.type}`, data);
                    break;
                case 'bouts_list':
                    console.log(`Received bouts_list for round ${data.roundId} with ${data.bouts?.length || 0} bouts`);
                    break;
                case 'pools_list':
                    console.log(`Received pools_list for round ${data.roundId} with ${data.pools?.length || 0} pools`);
                    console.log(`Pools data:`, JSON.stringify(data.pools?.slice(0, 1))); // Log first pool as example
                    break;
                case 'fencers_list':
                    console.log(
                        `Received fencers_list for event ${data.eventId} with ${data.fencers?.length || 0} fencers`
                    );
                    break;
                case 'pool_bouts_list':
                    console.log(
                        `Received pool_bouts_list for pool ${data.poolId} in round ${data.roundId} with ${data.bouts?.length || 0} bouts`
                    );
                    console.log(`Pool bouts data:`, JSON.stringify(data.bouts?.slice(0, 1))); // Log first bout as example
                    break;
                case 'bracket_data':
                    console.log(`Received bracket data for round ${data.roundId}`);
                    break;
                case 'bout_score_updated':
                    console.log(`Received bout score update for bout ${data.boutId}: ${data.scoreA}-${data.scoreB}`);
                    break;
                case 'bout_scores_updated':
                    console.log(`Received confirmation that bout ${data.boutId} scores were updated: ${data.success}`);
                    break;
                case 'event_status':
                    console.log(
                        `Received event status for event ${data.eventId}: ${data.isStarted ? 'Started' : 'Not Started'}`
                    );
                    break;
                case 'round_initialized':
                    console.log(`Round ${data.roundId} for event ${data.eventId} has been initialized`);
                    break;
                case 'round_completed':
                    console.log(`Round ${data.roundId} has been completed: ${data.success ? 'Success' : 'Failed'}`);
                    break;
                case 'round_completed_broadcast':
                    console.log(`Received broadcast that round ${data.roundId} has been completed`);
                    break;
                default:
                    console.log(`Unknown message type: ${data.type}`);
            }

            // Emit the message to any listeners
            this.emit(data.type, data);
            this.emit('message', data);
        } catch (error) {
            console.error('Error handling server message:', error);
        }
    }

    async waitForResponse(type: string, timeout: number = 10000): Promise<any> {
        console.log(`Waiting for response of type: ${type} with timeout ${timeout}ms`);

        // If we already have a pending promise for this type, reuse it instead of rejecting
        if (this.responsePromises.has(type)) {
            console.log(`Reusing existing promise for ${type}`);

            // Create a new promise that will resolve when the original one does
            return new Promise((resolve, reject) => {
                const existingHandler = this.responsePromises.get(type);
                if (!existingHandler) {
                    // This shouldn't happen, but just in case
                    reject(new Error(`Promise handler for ${type} disappeared`));
                    return;
                }

                // Create a wrapper around the existing handler
                const originalResolve = existingHandler.resolve;
                existingHandler.resolve = data => {
                    // Call the original resolver
                    originalResolve(data);
                    // Also resolve this promise
                    resolve(data);
                };

                const originalReject = existingHandler.reject;
                existingHandler.reject = error => {
                    // Call the original reject
                    originalReject(error);
                    // Also reject this promise
                    reject(error);
                };
            });
        }

        return new Promise((resolve, reject) => {
            console.log(`Setting up new promise for response type: ${type}`);

            // Create a timeout to reject the promise if no response comes
            const timeoutId = setTimeout(() => {
                console.error(`Timeout reached for response type: ${type} after ${timeout}ms`);
                const promiseHandlers = this.responsePromises.get(type);
                if (promiseHandlers) {
                    this.responsePromises.delete(type);
                    reject(new Error(`Timeout waiting for response type: ${type}`));
                }
            }, timeout);

            // Store the promise handlers
            this.responsePromises.set(type, {
                resolve: data => {
                    console.log(`Resolving response for ${type}:`, JSON.stringify(data));
                    clearTimeout(timeoutId);
                    this.responsePromises.delete(type);
                    resolve(data);
                },
                reject: error => {
                    console.error(`Error in response for ${type}:`, error);
                    clearTimeout(timeoutId);
                    this.responsePromises.delete(type);
                    reject(error);
                },
                timeoutId,
            });

            // If we're not connected, reject immediately
            if (!this.isConnected()) {
                console.error(`Rejecting ${type} promise immediately - not connected to server`);
                clearTimeout(timeoutId);
                this.responsePromises.delete(type);
                reject(new Error('Not connected to server'));
            } else {
                console.log(`Successfully set up promise for ${type} response`);
            }
        });
    }

    // Handle welcome message from server
    private handleWelcome(data: any): void {
        console.log(`Received welcome message with tournament name: ${data.tournamentName}`);

        // Store the original tournament name
        const tournamentName = data.tournamentName;

        if (this.clientInfo) {
            if (tournamentName) {
                console.log(`Using actual tournament name from server: ${tournamentName}`);
                this.clientInfo.tournamentName = tournamentName;
            } else {
                console.log(`No tournament name provided in welcome message, using default`);
                this.clientInfo.tournamentName = 'Tournament';
            }

            this.clientInfo.isConnected = true;
            AsyncStorage.setItem(CLIENT_INFO_KEY, JSON.stringify(this.clientInfo));
        }

        this.emit('connected', tournamentName || 'Tournament');

        // Request tournament data after connecting
        this.requestTournamentData();

        // Immediately also request event list since that's what users see first
        // Make sure we're requesting events properly without requiring tournament name
        console.log('Requesting events list after welcome message');
        this.sendMessage({
            type: 'get_events',
        });

        // Don't request event statuses if the server doesn't support this message type
        // Based on server logs, the current server doesn't recognize 'get_event_statuses'
    }

    // Handle join response from server
    private handleJoinResponse(data: any): void {
        if (data.success) {
            // Store the assigned role if provided
            if (data.role) {
                console.log(`Server assigned role: ${data.role}`);
                // Store role in AsyncStorage for future reference
                AsyncStorage.setItem('tournament_user_role', data.role).catch(error =>
                    console.error('Error storing user role:', error)
                );
            }
            // Removed the else block that defaulted to 'referee'

            // Check if we also received a tournament name in the join response
            if (data.tournamentName && this.clientInfo) {
                console.log(`Server provided tournament name: ${data.tournamentName}`);
                this.clientInfo.tournamentName = data.tournamentName;
                AsyncStorage.setItem(CLIENT_INFO_KEY, JSON.stringify(this.clientInfo));
            } else if (
                this.clientInfo &&
                this.clientInfo.tournamentData &&
                this.clientInfo.tournamentData.tournamentName
            ) {
                // Use the tournament name from tournament data if available
                console.log(
                    `Using tournament name from tournament data: ${this.clientInfo.tournamentData.tournamentName}`
                );
                this.clientInfo.tournamentName = this.clientInfo.tournamentData.tournamentName;
                AsyncStorage.setItem(CLIENT_INFO_KEY, JSON.stringify(this.clientInfo));
            }

            this.emit('joined', data.message); // Existing event

            // Emit a new event when the server assigns a role
            if (data.role) {
                this.emit('roleAssigned', {
                    role: data.role,
                    tournamentName: this.clientInfo?.tournamentName,
                });
            }

            // Explicitly request events after successful join
            console.log('Requesting events list after successful join');
            this.sendMessage({
                type: 'get_events',
            });

            // Don't request event statuses if the server doesn't support this message type
            // Based on server logs, the current server doesn't recognize 'get_event_statuses'

            // Send any queued messages
            while (this.messageQueue.length > 0) {
                const message = this.messageQueue.shift();
                if (message && this.socket) {
                    try {
                        // Append newline character for NDJSON format if it doesn't already have one
                        const messageWithNewline = message.endsWith('\n') ? message : message + '\n';
                        this.socket.write(messageWithNewline);
                    } catch (error) {
                        console.error('Error sending queued message:', error);
                        // If we can't send, put it back in the queue
                        this.messageQueue.unshift(message);
                        break;
                    }
                }
            }
        } else {
            this.emit('joinFailed', data.message);
        }
    }

    // Handle score update from server
    private handleScoreUpdate(data: any): void {
        this.emit('scoreUpdate', {
            boutId: data.boutId,
            scoreA: data.scoreA,
            scoreB: data.scoreB,
        });
    }

    // Handle tournament update from server
    private handleTournamentUpdate(data: any): void {
        this.emit('tournamentUpdate', data);
    }

    // Handle tournament data from server (complete tournament data)
    private handleTournamentData(data: any): void {
        if (this.clientInfo) {
            // Store the tournament data
            this.clientInfo.tournamentData = data.tournamentData;

            // If we have a tournament name in the data, update the client info
            if (data.tournamentData?.tournamentName && !this.clientInfo.tournamentName) {
                console.log(`Updating tournament name from tournament_data: ${data.tournamentData.tournamentName}`);
                this.clientInfo.tournamentName = data.tournamentData.tournamentName;
            }

            // Save the updated client info
            AsyncStorage.setItem(CLIENT_INFO_KEY, JSON.stringify(this.clientInfo));
        }
        this.emit('tournamentData', data.tournamentData);
    }

    // Handle server closing message
    private handleServerClosing(data: any): void {
        console.log('Server is closing:', data.message);

        // This is an expected but server-initiated disconnect
        // We should still show the connection lost modal
        if (this.clientInfo) {
            console.log('Emitting connectionLost event due to server closing');
            this.emit('connectionLost', this.clientInfo);
        }

        // Then disconnect properly
        this.disconnect();
    }

    // Schedule reconnection attempt with exponential backoff
    private scheduleReconnect(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }

        this.connectionAttempts++;

        // Exponential backoff with max attempts
        if (this.connectionAttempts > this.maxReconnectAttempts) {
            console.log(`Exceeded max reconnection attempts (${this.maxReconnectAttempts})`);
            return;
        }

        // Calculate backoff time: 2^attempts * 1000ms, capped at 30 seconds
        const backoffTime = Math.min(Math.pow(2, this.connectionAttempts) * 1000, 30000);
        console.log(`Scheduling reconnect attempt ${this.connectionAttempts} in ${backoffTime}ms`);

        this.reconnectTimer = setTimeout(async () => {
            if (this.clientInfo) {
                const { hostIp, port } = this.clientInfo;
                try {
                    console.log(`Attempting reconnection to ${hostIp}:${port}...`);
                    await this.connectToServer(hostIp, port);
                } catch (error) {
                    console.error('Reconnection failed:', error);
                    // Next attempt will be scheduled by the close event
                }
            }
        }, backoffTime);
    }

    // Load client info from AsyncStorage
    async loadClientInfo(): Promise<ClientInfo | null> {
        try {
            const infoStr = await AsyncStorage.getItem(CLIENT_INFO_KEY);
            if (infoStr) {
                this.clientInfo = JSON.parse(infoStr);

                // If we were previously connected, try to reconnect
                if (this.clientInfo?.isConnected) {
                    this.connectToServer(this.clientInfo.hostIp, this.clientInfo.port).catch(error =>
                        console.error('Failed to reconnect:', error)
                    );
                }

                return this.clientInfo;
            }
            return null;
        } catch (error) {
            console.error('Error loading client info:', error);
            return null;
        }
    }

    // Save a remote tournament to AsyncStorage for later reconnection
    async saveRemoteTournament(): Promise<boolean> {
        try {
            if (!this.clientInfo) {
                console.error('No active connection to save');
                return false;
            }

            // Get the current list of saved tournaments
            const savedTournamentsStr = await AsyncStorage.getItem(SAVED_REMOTE_TOURNAMENTS_KEY);
            let savedTournaments = savedTournamentsStr ? JSON.parse(savedTournamentsStr) : [];

            // Check if this tournament is already saved
            const existingIndex = savedTournaments.findIndex(
                (t: ClientInfo) => t.tournamentName === this.clientInfo?.tournamentName
            );

            if (existingIndex >= 0) {
                // Update existing entry
                savedTournaments[existingIndex] = {
                    tournamentName: this.clientInfo.tournamentName,
                    hostIp: this.clientInfo.hostIp,
                    port: this.clientInfo.port,
                };
            } else {
                // Add new entry
                savedTournaments.push({
                    tournamentName: this.clientInfo.tournamentName,
                    hostIp: this.clientInfo.hostIp,
                    port: this.clientInfo.port,
                });
            }

            // Save back to AsyncStorage
            await AsyncStorage.setItem(SAVED_REMOTE_TOURNAMENTS_KEY, JSON.stringify(savedTournaments));
            console.log(`Saved remote tournament "${this.clientInfo.tournamentName}" for later reconnection`);
            return true;
        } catch (error) {
            console.error('Error saving remote tournament:', error);
            return false;
        }
    }

    // Get all saved remote tournaments
    async getSavedRemoteTournaments(): Promise<ClientInfo[]> {
        try {
            const savedTournamentsStr = await AsyncStorage.getItem(SAVED_REMOTE_TOURNAMENTS_KEY);
            return savedTournamentsStr ? JSON.parse(savedTournamentsStr) : [];
        } catch (error) {
            console.error('Error getting saved remote tournaments:', error);
            return [];
        }
    }

    // Remove a saved remote tournament
    async removeSavedRemoteTournament(tournamentName: string): Promise<boolean> {
        try {
            const savedTournamentsStr = await AsyncStorage.getItem(SAVED_REMOTE_TOURNAMENTS_KEY);
            if (!savedTournamentsStr) return false;

            let savedTournaments = JSON.parse(savedTournamentsStr);
            const newSavedTournaments = savedTournaments.filter((t: ClientInfo) => t.tournamentName !== tournamentName);

            if (newSavedTournaments.length === savedTournaments.length) {
                // No tournament was removed
                return false;
            }

            await AsyncStorage.setItem(SAVED_REMOTE_TOURNAMENTS_KEY, JSON.stringify(newSavedTournaments));
            console.log(`Removed saved remote tournament "${tournamentName}"`);
            return true;
        } catch (error) {
            console.error('Error removing saved remote tournament:', error);
            return false;
        }
    }
}

// Create singleton instance
const tournamentClient = new TournamentClient();
export default tournamentClient;

// src/networking/TournamentClient.ts - Updated with tournament data broadcasting
import { EventEmitter } from 'events';
import { Alert, Platform } from 'react-native';
import TcpSocket from 'react-native-tcp-socket';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Constants
const CLIENT_INFO_KEY = 'tournament_client_info';
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
    private responsePromises: Map<string, {
        resolve: (data: any) => void;
        reject: (error: any) => void;
        timeoutId: NodeJS.Timeout;
    }> = new Map();

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
                    timeout: CONNECTION_TIMEOUT
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
                        this.sendMessageRaw(JSON.stringify({
                            type: 'join_request',
                            deviceId,
                            clientId: clientId
                        }));

                        this.clientInfo = {
                            tournamentName: '',  // Will be updated when server responds
                            hostIp,
                            port,
                            isConnected: true
                        };

                        // Save client info to AsyncStorage
                        AsyncStorage.setItem(CLIENT_INFO_KEY, JSON.stringify(this.clientInfo));

                        this.connectionAttempts = 0;
                        resolve(true);
                    });
                } catch (error) {
                    console.error("Error creating socket connection:", error);
                    reject(error);
                    return;
                }

                // Set timeout for connection
                const connectionTimeout = setTimeout(() => {
                    console.log("Connection timeout reached!");
                    if (this.socket) {
                        try {
                            this.socket.destroy();
                        } catch (e) {
                            console.error("Error destroying socket on timeout:", e);
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
                        
                        // Try to process complete JSON objects
                        let startIdx = 0;
                        for (let i = 0; i < buffer.length; i++) {
                            // Look for what might be the end of a JSON object
                            if (buffer[i] === '}') {
                                try {
                                    // Try to parse from the current start index to this }
                                    const possibleJson = buffer.substring(startIdx, i + 1);
                                    const parsedData = JSON.parse(possibleJson);
                                    
                                    // If we get here, it parsed successfully
                                    console.log(`Successfully parsed message from server: ${possibleJson.length} bytes`);
                                    this.handleServerMessage(possibleJson);
                                    
                                    // Move start index to after this object
                                    startIdx = i + 1;
                                } catch (parseError) {
                                    // Not valid JSON yet, continue searching
                                }
                            }
                        }
                        
                        // Remove processed messages from buffer
                        if (startIdx > 0) {
                            buffer = buffer.substring(startIdx);
                        }
                        
                        // If buffer is getting too large without valid JSON, truncate it
                        if (buffer.length > 10000) {
                            console.error(`Server message buffer too large (${buffer.length} bytes), truncating`);
                            buffer = buffer.substring(buffer.length - 5000); // Keep last 5000 chars
                        }
                    } catch (error) {
                        console.error("Error processing data from server:", error);
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
                            console.error("Error destroying socket on close:", e);
                        }
                        this.socket = null;
                    }

                    if (this.clientInfo) {
                        this.clientInfo.isConnected = false;
                    }

                    // Let the disconnect method handle alerts
                    // We don't show the alert here

                    this.emit('disconnected');

                    // Attempt to reconnect with backoff
                    this.scheduleReconnect();
                });

                // Handle errors
                this.socket.on('error', (error: Error) => {
                    console.error('Socket error:', error);
                    clearTimeout(connectionTimeout);

                    if (this.socket) {
                        try {
                            this.socket.destroy();
                        } catch (e) {
                            console.error("Error destroying socket on error:", e);
                        }
                        this.socket = null;
                    }

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
            // Show a single disconnect alert if not already showing
            if (!this.isShowingDisconnectAlert) {
                this.isShowingDisconnectAlert = true;
                Alert.alert(
                    'Tournament Connection',
                    'The connection to the tournament server was lost.',
                    [{ 
                        text: 'OK', 
                        onPress: () => {
                            this.isShowingDisconnectAlert = false;
                        } 
                    }]
                );
            }
            
            this.responsePromises.forEach((handlers, type) => {
                clearTimeout(handlers.timeoutId);
                handlers.reject(new Error('Disconnected from server'));
            });
            this.responsePromises.clear();

            if (this.socket) {
                try {
                    this.socket.destroy();
                } catch (e) {
                    console.error("Error destroying socket on disconnect:", e);
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
                this.socket.write(messageStr);
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
            type: 'request_tournament_data'
        });
    }
    
    // Request to initialize a round (start it)
    requestInitializeRound(eventId: number, roundId: number): boolean {
        return this.sendMessage({
            type: 'initialize_round',
            eventId,
            roundId
        });
    }
    
    // Request pools for a specific round
    requestPools(roundId: number): boolean {
        console.log(`Sending get_pools request for round ${roundId}`);
        const result = this.sendMessage({
            type: 'get_pools',
            roundId
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
            poolId
        });
        if (result) {
            console.log(`Successfully sent get_pool_bouts message for pool ${poolId} in round ${roundId}`);
        } else {
            console.error(`Failed to send get_pool_bouts message for pool ${poolId} in round ${roundId}`);
        }
        return result;
    }
    
    // Update pool bout scores
    updatePoolBoutScores(
        boutId: number, 
        scoreA: number, 
        scoreB: number, 
        fencerAId: number, 
        fencerBId: number, 
        roundId?: number, 
        poolId?: number
    ): boolean {
        console.log(`Sending update_pool_bout_scores for bout ${boutId}: ${scoreA}-${scoreB}`);
        const result = this.sendMessage({
            type: 'update_pool_bout_scores',
            boutId,
            scoreA,
            scoreB,
            fencerAId,
            fencerBId,
            roundId, // Include roundId if available for targeted cache invalidation
            poolId   // Include poolId if available for targeted cache invalidation
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
            console.log(`Processing message of type: ${data.type}, message:`, message.slice(0, 200) + (message.length > 200 ? '...' : ''));

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
                console.log(`IMPORTANT: Received pools_list for round ${data.roundId} with ${data.pools?.length || 0} pools`);
                if (!Array.isArray(data.pools)) {
                    console.warn('pools_list has invalid pools property, fixing...');
                    data.pools = [];
                }
            }

            // PRE-PROCESS POOL BOUTS LIST
            if (data.type === 'pool_bouts_list') {
                console.log(`IMPORTANT: Received pool_bouts_list for pool ${data.poolId} in round ${data.roundId} with ${data.bouts?.length || 0} bouts`);
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
                    console.log(`Received events_list with ${data.events.length} events`);
                    break;
                case 'event_statuses':
                    console.log(`Received event_statuses update`);
                    break;
                case 'rounds_list':
                    console.log(`Received rounds_list for event ${data.eventId} with ${data.rounds?.length || 0} rounds`);
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
                    console.log(`Pools data:`, JSON.stringify(data.pools?.slice(0, 1)));  // Log first pool as example
                    break;
                case 'fencers_list':
                    console.log(`Received fencers_list for event ${data.eventId} with ${data.fencers?.length || 0} fencers`);
                    break;
                case 'pool_bouts_list':
                    console.log(`Received pool_bouts_list for pool ${data.poolId} in round ${data.roundId} with ${data.bouts?.length || 0} bouts`);
                    console.log(`Pool bouts data:`, JSON.stringify(data.bouts?.slice(0, 1)));  // Log first bout as example
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
                    console.log(`Received event status for event ${data.eventId}: ${data.isStarted ? 'Started' : 'Not Started'}`);
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
                existingHandler.resolve = (data) => {
                    // Call the original resolver
                    originalResolve(data);
                    // Also resolve this promise
                    resolve(data);
                };
                
                const originalReject = existingHandler.reject;
                existingHandler.reject = (error) => {
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
                resolve: (data) => {
                    console.log(`Resolving response for ${type}:`, JSON.stringify(data));
                    clearTimeout(timeoutId);
                    this.responsePromises.delete(type);
                    resolve(data);
                },
                reject: (error) => {
                    console.error(`Error in response for ${type}:`, error);
                    clearTimeout(timeoutId);
                    this.responsePromises.delete(type);
                    reject(error);
                },
                timeoutId
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
        if (this.clientInfo) {
            this.clientInfo.tournamentName = data.tournamentName;
            this.clientInfo.isConnected = true;
            AsyncStorage.setItem(CLIENT_INFO_KEY, JSON.stringify(this.clientInfo));
        }
        this.emit('connected', data.tournamentName);

        // Request tournament data after connecting
        this.requestTournamentData();
        
        // Immediately also request event list since that's what users see first
        this.sendMessage({
            type: 'get_events',
            tournamentName: data.tournamentName
        });
    }

    // Handle join response from server
    private handleJoinResponse(data: any): void {
        if (data.success) {
            // Store the assigned role if provided
            if (data.role) {
                console.log(`Server assigned role: ${data.role}`);
                // Store role in AsyncStorage for future reference
                AsyncStorage.setItem('tournament_user_role', data.role)
                    .catch(error => console.error('Error storing user role:', error));
            }
            
            this.emit('joined', data.message);

            // Send any queued messages
            while (this.messageQueue.length > 0) {
                const message = this.messageQueue.shift();
                if (message && this.socket) {
                    try {
                        this.socket.write(message);
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
            scoreB: data.scoreB
        });
    }

    // Handle tournament update from server
    private handleTournamentUpdate(data: any): void {
        this.emit('tournamentUpdate', data);
    }

    // Handle tournament data from server (complete tournament data)
    private handleTournamentData(data: any): void {
        if (this.clientInfo) {
            this.clientInfo.tournamentData = data.tournamentData;
            AsyncStorage.setItem(CLIENT_INFO_KEY, JSON.stringify(this.clientInfo));
        }
        this.emit('tournamentData', data.tournamentData);
    }

    // Handle server closing message
    private handleServerClosing(data: any): void {
        console.log('Server is closing:', data.message);
        
        // Let the disconnect method show the alert
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
                    this.connectToServer(this.clientInfo.hostIp, this.clientInfo.port)
                        .catch(error => console.error('Failed to reconnect:', error));
                }

                return this.clientInfo;
            }
            return null;
        } catch (error) {
            console.error('Error loading client info:', error);
            return null;
        }
    }
}

// Create singleton instance
const tournamentClient = new TournamentClient();
export default tournamentClient;
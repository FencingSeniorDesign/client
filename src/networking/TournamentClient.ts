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

            console.log(`Attempting to connect to ${hostIp}:${port}...`);
            this.connectionAttempts = 0;

            return new Promise((resolve, reject) => {
                // Create simple connection options without problematic interface specifications
                const options = {
                    host: hostIp,
                    port: port,
                    tls: false,
                    timeout: CONNECTION_TIMEOUT
                };

                console.log('Creating socket with options:', JSON.stringify(options));

                // Create TCP client
                try {
                    this.socket = TcpSocket.createConnection(options, () => {
                        console.log(`Connected to server at ${hostIp}:${port}`);

                        // Send join request
                        this.sendMessageRaw(JSON.stringify({
                            type: 'join_request'
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
                this.socket.on('data', (data: Buffer) => {
                    clearTimeout(connectionTimeout);
                    try {
                        const message = data.toString();
                        console.log(`Received from server: ${message}`);
                        this.handleServerMessage(message);
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

    // Handle a message from the server
    private handleServerMessage(message: string): void {
        try {
            const data = JSON.parse(message);
            console.log(`Processing message of type: ${data.type}`);

            // Validate and normalize events data if present
            if (data.type === 'events_list' && data.events !== undefined) {
                // Ensure events is always an array
                if (!Array.isArray(data.events)) {
                    console.warn(`Received events_list with non-array events:`, data.events);
                    data.events = [];
                }
                console.log(`Normalized events_list contains ${data.events.length} events`);
            }

            const promiseHandlers = this.responsePromises.get(data.type);
            if (promiseHandlers) {
                console.log(`Resolving promise for ${data.type}`);
                promiseHandlers.resolve(data);
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
                    break;
                case 'bracket_data':
                    console.log(`Received bracket data for round ${data.roundId}`);
                    break;
                case 'bout_score_updated':
                    console.log(`Received bout score update for bout ${data.boutId}: ${data.scoreA}-${data.scoreB}`);
                    break;
                case 'event_status':
                    console.log(`Received event status for event ${data.eventId}: ${data.isStarted ? 'Started' : 'Not Started'}`);
                    break;
                case 'round_initialized':
                    console.log(`Round ${data.roundId} for event ${data.eventId} has been initialized`);
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
        // If we already have a pending promise for this type, return it
        if (this.responsePromises.has(type)) {
            return new Promise((_, reject) => {
                reject(new Error(`Already waiting for response of type: ${type}`));
            });
        }

        return new Promise((resolve, reject) => {
            // Create a timeout to reject the promise if no response comes
            const timeoutId = setTimeout(() => {
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
                clearTimeout(timeoutId);
                this.responsePromises.delete(type);
                reject(new Error('Not connected to server'));
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
    }

    // Handle join response from server
    private handleJoinResponse(data: any): void {
        if (data.success) {
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
        Alert.alert('Tournament Connection', 'The tournament server has closed the connection.');
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
                if (this.clientInfo.isConnected) {
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
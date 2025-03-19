/**
 * Base networking client
 * 
 * This is a simplified version of the TournamentClient that will be replaced
 * with the actual implementation once we migrate all networking components.
 */
import { EventEmitter } from 'events';
import { Alert } from 'react-native';
import { ConnectionConfig } from './types';

/**
 * Client information
 */
interface ClientInfo {
  tournamentName: string;
  hostIp: string;
  port: number;
  isConnected: boolean;
  tournamentData?: any;
}

/**
 * Base networking client
 */
class NetworkClient extends EventEmitter {
  private socket: any = null;
  private clientInfo: ClientInfo | null = null;
  private reconnectTimer: any = null;
  private messageQueue: string[] = [];
  private connectionAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  public isShowingDisconnectAlert: boolean = false;

  constructor() {
    super();
  }

  /**
   * Connect to a server
   */
  async connect(config: ConnectionConfig): Promise<boolean> {
    console.log(`[NetworkClient] Connecting to ${config.hostIp}:${config.port}`);
    
    // Simulate connection
    this.clientInfo = {
      tournamentName: 'Test Tournament',
      hostIp: config.hostIp,
      port: config.port,
      isConnected: true
    };
    
    this.emit('connected', 'Test Tournament');
    return true;
  }

  /**
   * Disconnect from the server
   */
  async disconnect(): Promise<boolean> {
    console.log('[NetworkClient] Disconnecting');
    
    if (this.clientInfo) {
      this.clientInfo.isConnected = false;
      this.clientInfo = null;
    }
    
    this.socket = null;
    this.messageQueue = [];
    
    this.emit('disconnected');
    return true;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.clientInfo?.isConnected || false;
  }

  /**
   * Get client info
   */
  getClientInfo(): ClientInfo | null {
    return this.clientInfo;
  }

  /**
   * Send a message to the server
   */
  sendMessage(message: any): boolean {
    console.log('[NetworkClient] Sending message:', message);
    
    if (!this.isConnected()) {
      this.messageQueue.push(JSON.stringify(message));
      return false;
    }
    
    // Simulate message processing
    setTimeout(() => {
      if (message.type === 'request_tournament_data') {
        this.emit('tournamentData', {
          tournamentName: 'Test Tournament',
          events: [],
          lastUpdated: Date.now()
        });
      }
    }, 100);
    
    return true;
  }
}

// Create a singleton instance
const networkClient = new NetworkClient();
export default networkClient;
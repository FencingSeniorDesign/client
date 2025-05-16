import { State as BleState } from 'react-native-ble-plx';

export enum ScoringBoxType {
  TOURNAFENCE = 'TournaFence',
  ENPOINTE = 'EnPointe',
  SKEWERED = 'Skewered Fencing Box',
}

export interface BoxCapabilities {
  supportsScore: boolean;
  supportsMainTimer: boolean;
  supportsPassivityTimer: boolean;
  supportsFencerNames: boolean;
  supportsPenaltyCards: boolean;
  supportsBidirectional: boolean;
  supportsNFC: boolean;
}

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  SCANNING = 'scanning',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTING = 'disconnecting',
}

export interface BoxState {
  type: ScoringBoxType;
  connectionState: ConnectionState;
  deviceId?: string;
  deviceName?: string;
  error?: string;
  dataSource?: 'app' | 'box';
}

export interface ScoreUpdate {
  fencer: 'left' | 'right' | 'both';
  timestamp: number;
}

export interface TimerUpdate {
  timeMs: number;
  isRunning: boolean;
  timestamp: number;
}

export interface BoxCallbacks {
  onScoreUpdate?: (update: ScoreUpdate) => void;
  onTimerUpdate?: (update: TimerUpdate) => void;
  onConnectionStateChange?: (state: ConnectionState) => void;
  onError?: (error: Error) => void;
}

export interface IScoringBoxService {
  type: ScoringBoxType;
  capabilities: BoxCapabilities;
  state: BoxState;
  
  // Connection management
  connect(deviceId?: string): Promise<void>;
  disconnect(): Promise<void>;
  scan(timeout?: number): Promise<any>;
  
  // Data synchronization
  sendScore(leftScore: number, rightScore: number): Promise<void>;
  sendTimer(timeMs: number, isRunning: boolean): Promise<void>;
  sendPenalty?(fencer: 'left' | 'right', card: 'yellow' | 'red'): Promise<void>;
  sendFencerNames?(leftName: string, rightName: string): Promise<void>;
  
  // State management
  setDataSource(source: 'app' | 'box'): void;
  setCallbacks(callbacks: BoxCallbacks): void;
  
  // Commands
  startTimer(): Promise<void>;
  stopTimer(): Promise<void>;
  resetTimer(timeMs: number): Promise<void>;
}

// TournaFence specific types
export interface TournaFenceCommands {
  START: 'start';
  STOP: 'stop';
  RESET: 'reset';
}

export interface TournaFenceNotifications {
  SCORE_FENCER1: 'SCORE:FENCER1';
  SCORE_FENCER2: 'SCORE:FENCER2';
  SCORE_DOUBLE: 'SCORE:DOUBLE';
  ACK_PREFIX: 'ACK:';
  ERROR_PREFIX: 'ERROR:';
}

export const TOURNAFENCE_SERVICE_UUID = '12345678-1234-5678-1234-56789abcdef0';
export const TOURNAFENCE_CONTROL_UUID = '12345678-1234-5678-1234-56789abcdef1';
export const TOURNAFENCE_DEVICE_NAME = 'FencBox_01';
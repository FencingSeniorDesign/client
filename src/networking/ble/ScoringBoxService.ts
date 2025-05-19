import { Device } from 'react-native-ble-plx';
import { ScoringBoxType, BoxCapabilities, BoxState, ConnectionState, BoxCallbacks, IScoringBoxService } from './types';
import { BLEManagerSingleton } from './BLEManager';

export abstract class ScoringBoxService implements IScoringBoxService {
    abstract type: ScoringBoxType;
    abstract capabilities: BoxCapabilities;

    protected bleManager = BLEManagerSingleton.getInstance();
    protected callbacks: BoxCallbacks = {};
    protected device: Device | null = null;

    state: BoxState;

    constructor(type: ScoringBoxType) {
        this.state = {
            type,
            connectionState: ConnectionState.DISCONNECTED,
        };
    }

    setCallbacks(callbacks: BoxCallbacks): void {
        this.callbacks = callbacks;
    }

    setDataSource(source: 'app' | 'box'): void {
        this.state.dataSource = source;
    }

    protected updateConnectionState(state: ConnectionState, error?: string): void {
        this.state.connectionState = state;
        this.state.error = error;

        if (this.state.deviceId) {
            this.bleManager.setConnectionState(this.state.deviceId, state);
        }

        this.callbacks.onConnectionStateChange?.(state);

        if (error) {
            this.callbacks.onError?.(new Error(error));
        }
    }

    // Abstract methods that must be implemented by specific services
    abstract connect(deviceId?: string): Promise<void>;
    abstract disconnect(): Promise<void>;
    abstract scan(timeout?: number): Promise<any>;
    abstract sendScore(leftScore: number, rightScore: number): Promise<void>;
    abstract sendTimer(timeMs: number, isRunning: boolean): Promise<void>;
    abstract startTimer(): Promise<void>;
    abstract stopTimer(): Promise<void>;
    abstract resetTimer(timeMs: number): Promise<void>;
}

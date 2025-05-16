import { ScoringBoxType, BoxCapabilities, ConnectionState } from './types';
import { ScoringBoxService } from './ScoringBoxService';

export class SkeweredBoxService extends ScoringBoxService {
    type = ScoringBoxType.SKEWERED;

    capabilities: BoxCapabilities = {
        supportsScore: true,
        supportsMainTimer: true,
        supportsPassivityTimer: false,
        supportsFencerNames: false,
        supportsPenaltyCards: false,
        supportsBidirectional: false, // Read-only from BLE advertisements
        supportsNFC: false,
    };

    constructor() {
        super(ScoringBoxType.SKEWERED);
    }

    async scan(timeout: number = 5000): Promise<any> {
        // Placeholder implementation for BLE advertisement scanning
        this.updateConnectionState(ConnectionState.SCANNING);

        return new Promise((resolve, reject) => {
            setTimeout(() => {
                this.updateConnectionState(
                    ConnectionState.DISCONNECTED,
                    'Skewered box advertisement scanning not implemented'
                );
                reject(new Error('Skewered box advertisement scanning not implemented'));
            }, 1000);
        });
    }

    async connect(deviceId?: string): Promise<void> {
        // Skewered box doesn't support direct connection
        // It only broadcasts state via BLE advertisements
        this.updateConnectionState(ConnectionState.DISCONNECTED, 'Skewered box does not support direct connection');
    }

    async disconnect(): Promise<void> {
        this.updateConnectionState(ConnectionState.DISCONNECTED);
    }

    async sendScore(leftScore: number, rightScore: number): Promise<void> {
        // Skewered box is read-only
        console.log('Skewered box does not support sending scores');
    }

    async sendTimer(timeMs: number, isRunning: boolean): Promise<void> {
        // Skewered box is read-only
        console.log('Skewered box does not support sending timer');
    }

    async startTimer(): Promise<void> {
        console.log('Skewered box does not support timer control');
    }

    async stopTimer(): Promise<void> {
        console.log('Skewered box does not support timer control');
    }

    async resetTimer(timeMs: number): Promise<void> {
        console.log('Skewered box does not support timer control');
    }

    cancelScan(): void {
        // Placeholder implementation
        this.updateConnectionState(ConnectionState.DISCONNECTED);
        console.log('Skewered scan cancellation');
    }
}

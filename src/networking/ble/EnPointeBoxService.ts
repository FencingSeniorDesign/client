import { ScoringBoxType, BoxCapabilities, ConnectionState } from './types';
import { ScoringBoxService } from './ScoringBoxService';

export class EnPointeBoxService extends ScoringBoxService {
    type = ScoringBoxType.ENPOINTE;

    capabilities: BoxCapabilities = {
        supportsScore: true,
        supportsMainTimer: true,
        supportsPassivityTimer: false,
        supportsFencerNames: false,
        supportsPenaltyCards: false,
        supportsBidirectional: false, // One-way box->phone only
        supportsNFC: false,
    };

    constructor() {
        super(ScoringBoxType.ENPOINTE);
    }

    async scan(timeout: number = 3000): Promise<any> {
        // Placeholder implementation
        this.updateConnectionState(ConnectionState.SCANNING);

        return new Promise((resolve, reject) => {
            setTimeout(() => {
                this.updateConnectionState(ConnectionState.DISCONNECTED, 'EnPointe box scanning not implemented');
                reject(new Error('EnPointe box scanning not implemented'));
            }, 1000);
        });
    }

    async connect(deviceId?: string): Promise<void> {
        // Placeholder implementation
        this.updateConnectionState(ConnectionState.CONNECTING);

        setTimeout(() => {
            this.updateConnectionState(ConnectionState.DISCONNECTED, 'EnPointe box connection not implemented');
        }, 1000);
    }

    async disconnect(): Promise<void> {
        this.updateConnectionState(ConnectionState.DISCONNECTED);
    }

    async sendScore(leftScore: number, rightScore: number): Promise<void> {
        // EnPointe is one-way, cannot send score to box
        console.log('EnPointe box does not support sending scores');
    }

    async sendTimer(timeMs: number, isRunning: boolean): Promise<void> {
        // EnPointe is one-way, cannot send timer to box
        console.log('EnPointe box does not support sending timer');
    }

    async startTimer(): Promise<void> {
        console.log('EnPointe box does not support timer control');
    }

    async stopTimer(): Promise<void> {
        console.log('EnPointe box does not support timer control');
    }

    async resetTimer(timeMs: number): Promise<void> {
        console.log('EnPointe box does not support timer control');
    }

    cancelScan(): void {
        // Placeholder implementation
        this.updateConnectionState(ConnectionState.DISCONNECTED);
        console.log('EnPointe scan cancellation');
    }
}

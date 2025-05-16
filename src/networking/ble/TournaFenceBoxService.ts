import { Device, Subscription } from 'react-native-ble-plx';
import {
    ScoringBoxType,
    BoxCapabilities,
    ConnectionState,
    TOURNAFENCE_SERVICE_UUID,
    TOURNAFENCE_CONTROL_UUID,
    TOURNAFENCE_DEVICE_NAME,
} from './types';
import { ScoringBoxService } from './ScoringBoxService';

export class TournaFenceBoxService extends ScoringBoxService {
    type = ScoringBoxType.TOURNAFENCE;

    capabilities: BoxCapabilities = {
        supportsScore: true,
        supportsMainTimer: true,
        supportsPassivityTimer: false,
        supportsFencerNames: false,
        supportsPenaltyCards: false,
        supportsBidirectional: true,
        supportsNFC: true,
    };

    private notificationSubscription: Subscription | null = null;
    private currentScore = { left: 0, right: 0 };
    private timerState = { timeMs: 180000, isRunning: false }; // Default 3 minutes
    private reconnectAttempts = 0;
    private scanInProgress: boolean = false;
    private maxReconnectAttempts = 3;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private isIntentionalDisconnect: boolean = false;

    constructor() {
        super(ScoringBoxType.TOURNAFENCE);
    }

    private foundDevices: Device[] = [];

    async scan(timeout: number = 30000): Promise<Device[]> {
        // Always stop any existing scan before starting a new one
        try {
            this.bleManager.getBleManager().stopDeviceScan();
        } catch {
            // Ignore errors from stopping scan
        }

        return new Promise((resolve, reject) => {
            try {
                // Ensure BLE is ready
                this.bleManager
                    .enableBluetooth()
                    .then(() => {
                        this.updateConnectionState(ConnectionState.SCANNING);
                        this.foundDevices = [];
                        this.scanInProgress = true;
                        let scanStopped = false;

                        console.log('Starting BLE scan for TournaFence boxes...');
                        console.log('Current state:', this.state);

                        // If we were recently connected, add a small delay before scanning
                        // This helps with iOS BLE state caching issues
                        const wasConnected = !!this.state.deviceId;

                        // Clear state before scanning to ensure clean scan
                        if (wasConnected) {
                            this.state.deviceId = undefined;
                            this.state.deviceName = undefined;
                        }

                        const scanDelay = wasConnected ? 500 : 0;
                        console.log(`Using scan delay: ${scanDelay}ms`);

                        setTimeout(() => {
                            if (scanStopped || !this.scanInProgress) return;

                            this.bleManager.getBleManager().startDeviceScan(
                                null, // Scan for all services
                                { allowDuplicates: true }, // Allow duplicates to ensure we can find recently disconnected devices
                                (error, device) => {
                                    if (error) {
                                        console.error('Scan error:', error);
                                        this.updateConnectionState(ConnectionState.DISCONNECTED, error.message);
                                        if (!scanStopped) {
                                            scanStopped = true;
                                            this.scanInProgress = false;
                                            reject(error);
                                        }
                                        return;
                                    }

                                    if (device) {
                                        console.log(
                                            'Found device:',
                                            device.name || 'NO NAME',
                                            device.id,
                                            device.localName
                                        );

                                        // Check both name and localName as some devices use localName
                                        // Also check case-insensitive in case the device name changes case after reconnection
                                        const deviceName = device.name?.toLowerCase() || '';
                                        const localName = device.localName?.toLowerCase() || '';
                                        const targetName = TOURNAFENCE_DEVICE_NAME.toLowerCase();

                                        if (
                                            deviceName === targetName ||
                                            localName === targetName ||
                                            device.name === TOURNAFENCE_DEVICE_NAME ||
                                            device.localName === TOURNAFENCE_DEVICE_NAME
                                        ) {
                                            console.log('Found TournaFence box!');

                                            // Add to list if not already present
                                            if (!this.foundDevices.find(d => d.id === device.id)) {
                                                this.foundDevices.push(device);
                                            }
                                        }
                                    }
                                }
                            );
                        }, scanDelay);

                        // Stop scanning after timeout
                        setTimeout(() => {
                            if (!scanStopped && this.scanInProgress) {
                                console.log('Scan timeout reached');
                                this.bleManager.getBleManager().stopDeviceScan();
                                scanStopped = true;
                                this.scanInProgress = false;

                                this.updateConnectionState(ConnectionState.DISCONNECTED);

                                if (this.foundDevices.length === 0) {
                                    reject(new Error('No TournaFence box found'));
                                } else {
                                    console.log(`Found ${this.foundDevices.length} TournaFence box(es)`);
                                    resolve(this.foundDevices);
                                }
                            }
                        }, timeout + scanDelay);
                    })
                    .catch(error => {
                        console.error('Failed to enable Bluetooth:', error);
                        this.scanInProgress = false;
                        this.updateConnectionState(ConnectionState.DISCONNECTED, error.message);
                        reject(error);
                    });
            } catch (error) {
                console.error('Scan failed:', error);
                this.scanInProgress = false;
                this.updateConnectionState(ConnectionState.DISCONNECTED, error.message);
                reject(error);
            }
        });
    }

    cancelScan(): void {
        console.log('Cancelling scan...');
        if (this.scanInProgress) {
            this.scanInProgress = false;
            this.bleManager.getBleManager().stopDeviceScan();
            this.updateConnectionState(ConnectionState.DISCONNECTED);
            this.foundDevices = [];
        }
    }

    getFoundDevices(): Device[] {
        return this.foundDevices;
    }

    async connect(deviceId?: string): Promise<void> {
        try {
            const targetDeviceId = deviceId || this.state.deviceId;
            if (!targetDeviceId) {
                throw new Error('No device ID provided');
            }

            // Reset the intentional disconnect flag when connecting
            this.isIntentionalDisconnect = false;

            this.updateConnectionState(ConnectionState.CONNECTING);

            // Connect to device
            this.device = await this.bleManager.getBleManager().connectToDevice(targetDeviceId);
            await this.device.discoverAllServicesAndCharacteristics();

            // Find our service and characteristic
            const services = await this.device.services();
            console.log(
                'Available services:',
                services.map(s => s.uuid)
            );

            const service = services.find(s => s.uuid.toLowerCase() === TOURNAFENCE_SERVICE_UUID.toLowerCase());
            if (!service) {
                throw new Error(`Service ${TOURNAFENCE_SERVICE_UUID} not found`);
            }

            const characteristics = await service.characteristics();
            console.log(
                'Available characteristics:',
                characteristics.map(c => c.uuid)
            );

            const controlChar = characteristics.find(
                c => c.uuid.toLowerCase() === TOURNAFENCE_CONTROL_UUID.toLowerCase()
            );

            if (!controlChar) {
                throw new Error('Control characteristic not found');
            }

            console.log('Control characteristic properties:', {
                isWritableWithResponse: controlChar.isWritableWithResponse,
                isWritableWithoutResponse: controlChar.isWritableWithoutResponse,
                isNotifiable: controlChar.isNotifiable,
                isIndicatable: controlChar.isIndicatable,
            });

            // Subscribe to notifications
            try {
                if (controlChar.isNotifiable) {
                    // Small delay to ensure iOS is ready
                    await new Promise(resolve => setTimeout(resolve, 100));

                    this.notificationSubscription = controlChar.monitor((error, char) => {
                        if (error) {
                            console.error('Notification error:', error);
                            // Don't return here - continue processing if possible
                        }

                        if (char && char.value) {
                            const message = this.decodeMessage(char.value);
                            this.handleNotification(message);
                        }
                    });

                    console.log('Notification subscription created');
                } else {
                    console.log('Control characteristic does not support notifications');
                }
            } catch (error) {
                console.log('Failed to setup notifications:', error);
                // Continue without notifications - write operations will still work
            }

            // Monitor connection state
            this.device.onDisconnected(error => {
                console.log('Device disconnected:', error?.message || 'Unknown reason');
                this.handleDisconnection();
            });

            this.state.deviceId = targetDeviceId;
            this.updateConnectionState(ConnectionState.CONNECTED);
            this.reconnectAttempts = 0;

            console.log('Connected successfully to TournaFence box');
        } catch (error) {
            this.updateConnectionState(ConnectionState.DISCONNECTED, error.message);

            // Attempt auto-reconnect on connection failure
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.scheduleReconnect(targetDeviceId);
            }

            throw error;
        }
    }

    async disconnect(): Promise<void> {
        // Mark this as an intentional disconnect first to prevent race conditions
        this.isIntentionalDisconnect = true;
        
        try {
            this.updateConnectionState(ConnectionState.DISCONNECTING);

            // Clear any pending reconnect attempts
            this.clearReconnectTimeout();
            this.reconnectAttempts = 0;

            if (this.notificationSubscription) {
                this.notificationSubscription.remove();
                this.notificationSubscription = null;
            }

            if (this.device) {
                await this.device.cancelConnection();
                this.device = null;
            }

            // Clear the state
            this.state.deviceId = undefined;
            this.state.deviceName = undefined;

            // Give iOS time to clean up the connection
            await new Promise(resolve => setTimeout(resolve, 200));

            this.updateConnectionState(ConnectionState.DISCONNECTED);
        } catch (error) {
            // During intentional disconnect, don't report errors
            this.updateConnectionState(ConnectionState.DISCONNECTED);
        } finally {
            // Reset the flag after disconnect is complete
            this.isIntentionalDisconnect = false;
        }
    }

    async sendScore(leftScore: number, rightScore: number): Promise<void> {
        // TournaFence box doesn't support sending score from app
        // Score is only received from the box
        this.currentScore = { left: leftScore, right: rightScore };
    }

    async sendTimer(timeMs: number, isRunning: boolean): Promise<void> {
        // Timer commands are sent via start/stop/reset methods
        this.timerState = { timeMs, isRunning };
    }

    async startTimer(): Promise<void> {
        await this.sendCommand('start');
        this.timerState.isRunning = true;
    }

    async stopTimer(): Promise<void> {
        await this.sendCommand('stop');
        this.timerState.isRunning = false;
    }

    async resetTimer(timeMs: number): Promise<void> {
        await this.sendCommand(`reset:${timeMs}`);
        this.timerState.timeMs = timeMs;
        this.timerState.isRunning = false;
    }

    private async sendCommand(command: string): Promise<void> {
        if (!this.device || this.state.connectionState !== ConnectionState.CONNECTED) {
            throw new Error('Not connected to device');
        }

        try {
            const services = await this.device.services();
            const service = services.find(s => s.uuid.toLowerCase() === TOURNAFENCE_SERVICE_UUID.toLowerCase());

            if (!service) {
                throw new Error(`Service ${TOURNAFENCE_SERVICE_UUID} not found`);
            }

            const characteristics = await service.characteristics();
            const controlChar = characteristics.find(
                c => c.uuid.toLowerCase() === TOURNAFENCE_CONTROL_UUID.toLowerCase()
            );

            if (!controlChar) {
                throw new Error('Control characteristic not found');
            }

            const data = this.encodeMessage(command);
            await controlChar.writeWithResponse(data);
        } catch (error) {
            console.error('Failed to send command:', command, error);

            // Check if it's a disconnection error
            if (error.message && error.message.includes('disconnected')) {
                this.handleDisconnection();
            }

            this.callbacks.onError?.(error);
            throw error;
        }
    }

    private handleNotification(message: string): void {
        // Handle score notifications
        if (message === 'SCORE:FENCER1') {
            this.currentScore.left++;
            this.callbacks.onScoreUpdate?.({
                fencer: 'left',
                timestamp: Date.now(),
            });
        } else if (message === 'SCORE:FENCER2') {
            this.currentScore.right++;
            this.callbacks.onScoreUpdate?.({
                fencer: 'right',
                timestamp: Date.now(),
            });
        } else if (message === 'SCORE:DOUBLE') {
            this.currentScore.left++;
            this.currentScore.right++;
            this.callbacks.onScoreUpdate?.({
                fencer: 'both',
                timestamp: Date.now(),
            });
        }

        // Handle acknowledgments
        else if (message.startsWith('ACK:')) {
            console.log('Command acknowledged:', message);

            // Update timer state based on acknowledgments
            if (message.includes('start timer')) {
                this.timerState.isRunning = true;
                this.callbacks.onTimerUpdate?.({
                    ...this.timerState,
                    timestamp: Date.now(),
                });
            } else if (message.includes('stop timer')) {
                this.timerState.isRunning = false;
                this.callbacks.onTimerUpdate?.({
                    ...this.timerState,
                    timestamp: Date.now(),
                });
            } else if (message.includes('reset timer')) {
                const match = message.match(/reset timer to (\d+)ms/);
                if (match) {
                    this.timerState.timeMs = parseInt(match[1]);
                    this.timerState.isRunning = false;
                    this.callbacks.onTimerUpdate?.({
                        ...this.timerState,
                        timestamp: Date.now(),
                    });
                }
            }
        }

        // Handle errors
        else if (message.startsWith('ERROR:')) {
            this.callbacks.onError?.(new Error(message));
        }
    }

    private encodeMessage(message: string): string {
        // BLE expects base64 encoded data for writeWithResponse
        const encoder = new TextEncoder();
        const data = encoder.encode(message);
        const base64 = btoa(String.fromCharCode(...data));
        return base64;
    }

    private decodeMessage(data: string): string {
        // Decode base64 data from BLE notifications
        try {
            const decoded = atob(data);
            const bytes = new Uint8Array(decoded.split('').map(char => char.charCodeAt(0)));
            const decoder = new TextDecoder();
            return decoder.decode(bytes);
        } catch {
            // If decoding fails, assume it's already a plain string
            return data;
        }
    }

    private handleDisconnection(): void {
        // Only report an error if this wasn't an intentional disconnect
        if (!this.isIntentionalDisconnect) {
            this.updateConnectionState(ConnectionState.DISCONNECTED, 'Device disconnected unexpectedly');
            
            // Attempt auto-reconnect if we have a device ID
            if (this.state.deviceId && this.reconnectAttempts < this.maxReconnectAttempts) {
                this.scheduleReconnect(this.state.deviceId);
            }
        } else {
            // For intentional disconnects, just update the state without error
            this.updateConnectionState(ConnectionState.DISCONNECTED);
        }
    }

    private scheduleReconnect(deviceId: string): void {
        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 5000); // Exponential backoff, max 5s

        console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);

        this.reconnectTimeout = setTimeout(async () => {
            try {
                console.log(`Attempting to reconnect (attempt ${this.reconnectAttempts})`);
                await this.connect(deviceId);
            } catch (error) {
                console.error('Reconnection failed:', error);
            }
        }, delay);
    }

    private clearReconnectTimeout(): void {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
    }
}

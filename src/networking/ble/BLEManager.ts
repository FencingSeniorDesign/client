import { BleManager, State } from 'react-native-ble-plx';
import { Platform } from 'react-native';
import { ConnectionState } from './types';

export class BLEManagerSingleton {
  private static instance: BLEManagerSingleton;
  private bleManager: BleManager;
  private connectionStates: Map<string, ConnectionState> = new Map();
  
  private constructor() {
    this.bleManager = new BleManager();
    this.initializeBLE();
  }
  
  static getInstance(): BLEManagerSingleton {
    if (!BLEManagerSingleton.instance) {
      BLEManagerSingleton.instance = new BLEManagerSingleton();
    }
    return BLEManagerSingleton.instance;
  }
  
  private async initializeBLE() {
    try {
      if (Platform.OS === 'android') {
        // Request permissions on Android
        await this.requestPermissions();
      }
      
      // Subscribe to BLE state changes
      this.bleManager.onStateChange((state) => {
        console.log('BLE State changed to:', state);
        
        // Initialize BLE when it's powered on
        if (state === State.PoweredOn) {
          console.log('BLE is powered on and ready');
        } else if (state === State.Unsupported) {
          console.error('BLE is not supported on this device');
        } else if (state === State.PoweredOff) {
          console.error('Bluetooth is turned off');
        }
      }, true);
      
      // Check current state
      const currentState = await this.bleManager.state();
      console.log('Current BLE state:', currentState);
      
    } catch (error) {
      console.error('Failed to initialize BLE:', error);
    }
  }
  
  private async requestPermissions(): Promise<boolean> {
    // Android requires location permission for BLE scanning
    if (Platform.OS === 'android' && Platform.Version >= 23) {
      try {
        // TODO: Implement permission request using react-native permissions library
        // For now, we'll assume permissions are granted through app settings
        return true;
      } catch (error) {
        console.error('Failed to request permissions:', error);
        return false;
      }
    }
    return true;
  }
  
  getBleManager(): BleManager {
    return this.bleManager;
  }
  
  async checkBleState(): Promise<State> {
    return await this.bleManager.state();
  }
  
  async enableBluetooth(): Promise<void> {
    const state = await this.checkBleState();
    
    if (state === State.Unknown) {
      // Wait for the BLE to initialize
      await new Promise((resolve) => {
        const subscription = this.bleManager.onStateChange((newState) => {
          if (newState !== State.Unknown) {
            subscription.remove();
            resolve(newState);
          }
        }, true);
      });
    }
    
    const currentState = await this.checkBleState();
    
    if (currentState === State.Unsupported) {
      throw new Error('Bluetooth Low Energy is not supported on this device');
    }
    
    if (currentState === State.PoweredOff) {
      if (Platform.OS === 'android') {
        // On Android, we can request to enable Bluetooth
        await this.bleManager.enable();
      } else {
        // On iOS, we need to prompt user to enable in settings
        throw new Error('Please enable Bluetooth in Settings');
      }
    }
    
    if (currentState !== State.PoweredOn) {
      throw new Error(`Bluetooth is not ready. Current state: ${currentState}`);
    }
  }
  
  setConnectionState(deviceId: string, state: ConnectionState) {
    this.connectionStates.set(deviceId, state);
  }
  
  getConnectionState(deviceId: string): ConnectionState {
    return this.connectionStates.get(deviceId) || ConnectionState.DISCONNECTED;
  }
  
  async destroy() {
    await this.bleManager.destroy();
  }
}
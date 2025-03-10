// src/networking/NetworkUtils.ts - Updated to use expo-network
import { Platform } from 'react-native';
import * as Network from 'expo-network';
import DeviceInfo from 'react-native-device-info';

/**
 * Gets the device's local IP address
 * For iOS simulators, returns a special value that indicates we should use the Mac host's IP
 */
export async function getLocalIpAddress(): Promise<string | null> {
    try {
        // Get network state using expo-network
        const networkState = await Network.getNetworkStateAsync();
        
        // For iOS simulator, we need special handling
        if (Platform.OS === 'ios' && isRunningInSimulator()) {
            // Get IP directly from expo-network
            try {
                const ipAddress = await Network.getIpAddressAsync();
                if (ipAddress && ipAddress !== '0.0.0.0') {
                    console.log(`iOS Simulator detected IP: ${ipAddress}`);
                    return ipAddress;
                }
            } catch (ipError) {
                console.warn('Error getting simulator IP:', ipError);
            }
            
            // If we can't get a usable IP, use the localhost
            console.log("iOS Simulator detected but couldn't get IP directly");
            return '127.0.0.1';
        }

        // Use the expo-network IP address function for accurate IP detection
        const ipAddress = await Network.getIpAddressAsync();
        if (ipAddress && ipAddress !== '0.0.0.0') {
            return ipAddress;
        }

        // Fallback for other connection types
        return null;
    } catch (error) {
        console.error('Error getting local IP address:', error);
        return null;
    }
}

/**
 * Check if the device is connected to the internet
 */
export async function isConnectedToInternet(): Promise<boolean> {
    try {
        const networkState = await Network.getNetworkStateAsync();
        return networkState.isConnected && networkState.isInternetReachable === true;
    } catch (error) {
        console.error('Error checking internet connection:', error);
        return false;
    }
}

/**
 * Validates an IP address format
 */
export function isValidIpAddress(ip: string): boolean {
    const ipPattern = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipPattern.test(ip);
}

/**
 * Validates a port number
 */
export function isValidPort(port: number): boolean {
    return port >= 1024 && port <= 65535;
}

/**
 * Detect if we're running in a simulator
 */
export function isRunningInSimulator(): boolean {
    if (Platform.OS === 'ios') {
        // iOS simulator detection - check for typical simulator strings
        if (__DEV__) {
            return DeviceInfo.isEmulator();
        }
    }
    return false;
}

/**
 * Get the host machine's IP when running in simulator
 */
export function getSimulatorHostIP(): string {
    // For testing between simulators on the same Mac,
    // use the special localhost IP that routes to the Mac host
    return Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';
}

/**
 * Get network interface information (useful for debugging)
 */
export async function getNetworkInfo(): Promise<object> {
    try {
        const [ipAddress, networkState] = await Promise.all([
            Network.getIpAddressAsync(),
            Network.getNetworkStateAsync()
        ]);
        
        return {
            ipAddress,
            networkType: networkState.type,
            isConnected: networkState.isConnected,
            isInternetReachable: networkState.isInternetReachable
        };
    } catch (error) {
        console.error('Error getting network info:', error);
        return { error: 'Failed to get network information' };
    }
}
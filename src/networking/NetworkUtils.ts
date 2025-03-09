// src/networking/NetworkUtils.ts - Updated for iOS simulator support
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import DeviceInfo from 'react-native-device-info'

/**
 * Gets the device's local IP address
 * For iOS simulators, returns a special value that indicates we should use the Mac host's IP
 */
export async function getLocalIpAddress(): Promise<string | null> {
    try {
        // Get network state
        const state = await NetInfo.fetch();

        // For iOS simulator, we need special handling
        if (Platform.OS === 'ios' && isRunningInSimulator()) {
            // Check if the iOS simulator's network state gives us an IP
            if (state.type === 'wifi' && state.details && state.details.ipAddress) {
                // If we're on a simulator, the returned IP might not be routable between simulators
                console.log(`iOS Simulator detected IP: ${state.details.ipAddress}`);
                return state.details.ipAddress;
            }

            // Otherwise suggest the Mac's localhost IP for simulator testing
            console.log("iOS Simulator detected but couldn't get IP directly");
            return '127.0.0.1';
        }

        // Normal device IP detection
        if (state.type === 'wifi' && state.details) {
            return state.details.ipAddress || null;
        }

        // Fallback for other connection types
        return null;
    } catch (error) {
        console.error('Error getting local IP address:', error);
        return null;
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
 * This requires additional native code integration, so we're using
 * a simpler approach for now.
 */
export function getSimulatorHostIP(): string {
    // For testing between simulators on the same Mac,
    // use the special localhost IP that routes to the Mac host
    return '10.0.2.2'; // Standard Android emulator host machine address
}
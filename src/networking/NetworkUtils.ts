// src/networking/NetworkUtils.ts - Updated to use Zeroconf for service discovery
import { Platform, NativeModules } from 'react-native';
import * as Network from 'expo-network';
import DeviceInfo from 'react-native-device-info';
import tournamentClient from './TournamentClient';
import { EventEmitter } from 'events';
import Zeroconf from 'react-native-zeroconf';

// Constants
const SERVICE_TYPE = 'tournafence'; // Service type without underscores (added by the library)
const SERVICE_DOMAIN = 'local.';
const DEFAULT_PORT = 9001;
const DISCOVERY_TIMEOUT = 5000; // 5 seconds to collect responses

// Interface for a discovered server
export interface DiscoveredServer {
    tournamentName: string;
    hostIp: string;
    port: number;
    timestamp: number;
}

// Discovery event emitter singleton
class ServerDiscoveryEmitter extends EventEmitter {
    private discoveredServers: Map<string, DiscoveredServer> = new Map();
    private isScanning: boolean = false;
    private zeroconf: Zeroconf | null = null;
    private isZeroconfAvailable: boolean = true;
    private discoveryTimer: NodeJS.Timeout | null = null;

    constructor() {
        super();
        this.initializeZeroconf();
    }

    private initializeZeroconf() {
        try {
            // Check if the NativeModule exists
            if (!NativeModules.RNZeroconf) {
                console.warn('NativeModules.RNZeroconf is not available - local discovery will be disabled');
                this.isZeroconfAvailable = false;
                return;
            }
            
            const isPhysicalDevice = !DeviceInfo.isEmulator();
            console.log(`Initializing Zeroconf on ${isPhysicalDevice ? 'physical device' : 'simulator'}`);
            
            this.zeroconf = new Zeroconf();
            this.setupZeroconfListeners();
            
            // Special handling for physical iOS devices
            if (Platform.OS === 'ios' && isPhysicalDevice) {
                console.log('Physical iOS device detected, adding special handling');
                
                // Listen for errors that might indicate initialization issues
                const errorHandler = (error: any) => {
                    console.warn('Zeroconf initialization error on physical device:', error);
                    this.isZeroconfAvailable = false;
                };
                
                this.zeroconf.on('error', errorHandler);
                
                // If publishing is attempted on a physical device, we may need
                // to adapt our approach since it may not have all permissions
            }
            
            console.log('Zeroconf initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Zeroconf:', error);
            this.isZeroconfAvailable = false;
        }
    }

    private setupZeroconfListeners() {
        if (!this.zeroconf) return;

        // Handle service resolution
        this.zeroconf.on('resolved', service => {
            try {
                console.log('Zeroconf service resolved:', service);
                
                // Check if this is our service type - library adds underscores and .tcp
                // So we check for _tournafence._tcp
                if (service.type && service.type.includes(`_${SERVICE_TYPE}._tcp`)) {
                    // Get the tournament name from the TXT record if available
                    let tournamentName = 'Unknown Tournament';
                    
                    // Extract the real tournament name from the TXT record if available
                    if (service.txt && service.txt.name) {
                        tournamentName = service.txt.name;
                    } else if (service.name && service.name.startsWith('TournaFence-')) {
                        // If no TXT record, still show a friendly name by removing the random ID
                        tournamentName = 'Tournament';
                    } else {
                        tournamentName = service.name || 'Unknown Tournament';
                    }
                    
                    const server: DiscoveredServer = {
                        tournamentName: tournamentName,
                        hostIp: service.host || service.ip || '0.0.0.0',
                        port: service.port || DEFAULT_PORT,
                        timestamp: Date.now()
                    };
                    
                    console.log(`Discovered tournament server: ${server.tournamentName} at ${server.hostIp}:${server.port}`);
                    this.addServer(server);
                } else {
                    console.log(`Ignoring service of type: ${service.type}`);
                }
            } catch (error) {
                console.error('Error handling resolved service:', error);
            }
        });

        // Handle errors
        this.zeroconf.on('error', error => {
            console.error('Zeroconf error:', error);
            // If we get critical errors, disable Zeroconf
            if (error.message && error.message.includes('registerService')) {
                this.isZeroconfAvailable = false;
            }
        });

        // Handle scan timeout
        this.zeroconf.on('timeout', () => {
            console.log('Zeroconf scan timeout');
            this.setScanning(false);
        });

        // Handle stop scanning
        this.zeroconf.on('stop', () => {
            console.log('Zeroconf scanning stopped');
            this.setScanning(false);
        });
    }

    clearServers() {
        this.discoveredServers.clear();
        this.emit('serversUpdated', this.getServersList());
    }

    addServer(server: DiscoveredServer) {
        const key = `${server.hostIp}:${server.port}`;
        this.discoveredServers.set(key, server);
        this.emit('serverDiscovered', server);
        this.emit('serversUpdated', this.getServersList());
    }

    getServersList(): DiscoveredServer[] {
        return Array.from(this.discoveredServers.values());
    }

    setScanning(isScanning: boolean) {
        if (this.isScanning !== isScanning) {
            this.isScanning = isScanning;
            this.emit('scanningChanged', isScanning);
        }
    }

    isCurrentlyScanning(): boolean {
        return this.isScanning;
    }

    // For testing/debugging - force add a server to the list
    addTestServer(name: string, ip: string, port: number = DEFAULT_PORT) {
        const server: DiscoveredServer = {
            tournamentName: name,
            hostIp: ip,
            port: port,
            timestamp: Date.now()
        };
        
        this.addServer(server);
        console.log(`Added test server: ${name} at ${ip}:${port}`);
        return server;
    }

    startScan() {
        if (this.isScanning) {
            return;
        }

        this.clearServers();
        this.setScanning(true);
        
        // If Zeroconf isn't available, we'll use a simulated scan
        if (!this.isZeroconfAvailable || !this.zeroconf) {
            console.log('Zeroconf not available, simulating scan');
            
            // Set a timer to end the "scan" after a reasonable time
            setTimeout(() => {
                this.setScanning(false);
            }, DISCOVERY_TIMEOUT);
            
            return;
        }
        
        try {
            console.log(`Starting Zeroconf scan for service type: ${SERVICE_TYPE}`);
            
            // Start scanning for our service type using the library's expected format
            // The service type is passed without underscores - the library adds them
            this.zeroconf.scan(SERVICE_TYPE, 'tcp', SERVICE_DOMAIN);
            
            // Set a timeout to stop scanning after DISCOVERY_TIMEOUT
            if (this.discoveryTimer) {
                clearTimeout(this.discoveryTimer);
            }
            
            this.discoveryTimer = setTimeout(() => {
                this.stopScan();
            }, DISCOVERY_TIMEOUT);
        } catch (error) {
            console.error('Error starting Zeroconf scan:', error);
            this.setScanning(false);
            this.isZeroconfAvailable = false;
        }
    }

    stopScan() {
        if (this.discoveryTimer) {
            clearTimeout(this.discoveryTimer);
            this.discoveryTimer = null;
        }
        
        if (this.isScanning) {
            if (this.isZeroconfAvailable && this.zeroconf) {
                try {
                    this.zeroconf.stop();
                } catch (error) {
                    console.error('Error stopping Zeroconf scan:', error);
                }
            }
            this.setScanning(false);
        }
    }

    publishService(name: string, port: number) {
        if (!this.isZeroconfAvailable || !this.zeroconf) {
            console.warn('Zeroconf not available, cannot publish service');
            return false;
        }
        
        try {
            // Remove any existing service first
            this.unpublishService();
            
            // Use a very simple generic name that's unlikely to collide
            // Avoid the name parameter altogether to prevent collisions
            const uniqueId = Math.floor(Math.random() * 10000000);
            const simpleName = `TournaFence-${uniqueId}`;
            
            console.log(`Attempting to publish service with name: ${simpleName}`);
            
            // Use the exact method signature from the library's source code
            this.zeroconf.publishService(
                SERVICE_TYPE,      // type (without underscores)
                'tcp',             // protocol
                'local.',          // domain (always "local.")
                simpleName,        // name (simple unique ID)
                port,              // port number
                {                  // TXT record with the actual tournament name
                    name: name,    // Store the real name in TXT record
                    app: 'TournaFence'
                }
            );
            
            console.log(`Published Zeroconf service: ${simpleName} on port ${port}`);
            return true;
        } catch (error) {
            console.error('Error publishing Zeroconf service:', error);
            return false;
        }
    }

    unpublishService() {
        if (!this.isZeroconfAvailable || !this.zeroconf) {
            return false;
        }
        
        try {
            // The unpublishService method takes the service name
            // We don't have a way to track the current service name here,
            // but the library will typically clear all registered services
            this.zeroconf.unpublishService('');
            return true;
        } catch (error) {
            console.error('Error unpublishing Zeroconf service:', error);
            this.isZeroconfAvailable = false;
            return false;
        }
    }
}

export const serverDiscovery = new ServerDiscoveryEmitter();

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
 * Get a unique client identifier for this device
 */
export async function getClientId(): Promise<string> {
    try {
        return await DeviceInfo.getUniqueId();
    } catch (error) {
        console.error('Error getting device ID:', error);
        // Generate a random fallback ID
        return `client-${Math.random().toString(36).substring(2, 15)}`;
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

/**
 * Helper function to add isRemote parameter to navigation props
 * @param params The route parameters 
 * @param isRemote Whether this is a remote connection
 * @returns The parameters with isRemote added
 */
export function withRemoteFlag<T>(params: T, isRemote: boolean): T & { isRemote: boolean } {
    return {
        ...params,
        isRemote
    };
}

/**
 * Get the client ID and connection info - useful for permission checking
 */
export async function getClientConnectionInfo(): Promise<{
    clientId: string;
    isRemote: boolean;
    isHost: boolean;
}> {
    const clientId = await getClientId();
    const isRemote = tournamentClient && tournamentClient.isConnected();
    // For now, assume we're not the host if we're connected remotely
    const isHost = !isRemote;
    
    return {
        clientId,
        isRemote,
        isHost
    };
}

/**
 * Start scanning for tournament servers on the local network
 * Returns a promise that resolves with discovered servers
 */
export function startServerDiscovery(): Promise<DiscoveredServer[]> {
    return new Promise((resolve, reject) => {
        try {
            if (serverDiscovery.isCurrentlyScanning()) {
                console.log('Already scanning for servers, returning current list');
                return resolve(serverDiscovery.getServersList());
            }
            
            serverDiscovery.clearServers();
            
            // Set up listener for servers update
            const onServersUpdated = (servers: DiscoveredServer[]) => {
                // Don't resolve yet, keep collecting discoveries until timeout
            };
            
            const onScanningChanged = (isScanning: boolean) => {
                if (!isScanning) {
                    // Scanning finished, resolve with the collected servers
                    serverDiscovery.removeListener('serversUpdated', onServersUpdated);
                    serverDiscovery.removeListener('scanningChanged', onScanningChanged);
                    resolve(serverDiscovery.getServersList());
                }
            };
            
            serverDiscovery.on('serversUpdated', onServersUpdated);
            serverDiscovery.on('scanningChanged', onScanningChanged);
            
            // Start the scan
            serverDiscovery.startScan();
            
        } catch (error) {
            console.error('Error in server discovery:', error);
            serverDiscovery.setScanning(false);
            reject(error);
        }
    });
}

/**
 * Stop ongoing server discovery
 */
export function stopServerDiscovery(): void {
    serverDiscovery.stopScan();
}

/**
 * Get currently discovered servers
 */
export function getDiscoveredServers(): DiscoveredServer[] {
    return serverDiscovery.getServersList();
}

/**
 * Publish a tournament server service
 */
export function publishTournamentService(tournamentName: string, port: number = DEFAULT_PORT): boolean {
    return serverDiscovery.publishService(tournamentName, port);
}

/**
 * Unpublish a tournament server service
 */
export function unpublishTournamentService(): boolean {
    return serverDiscovery.unpublishService();
}
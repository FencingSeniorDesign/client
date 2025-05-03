// src/networking/NetworkUtils.ts - Updated to use Zeroconf for service discovery
import { Platform, NativeModules } from 'react-native';
import * as Network from 'expo-network';
import DeviceInfo from 'react-native-device-info';
import AsyncStorage from 'expo-sqlite/kv-store';
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
            // Log React Native modules for debugging
            console.log('Available NativeModules:', Object.keys(NativeModules));

            // Check if the NativeModule exists
            if (!NativeModules.RNZeroconf) {
                console.warn('NativeModules.RNZeroconf is not available - local discovery will be disabled');
                this.isZeroconfAvailable = false;
                return;
            }

            const isPhysicalDevice = !DeviceInfo.isEmulator();
            console.log(
                `Initializing Zeroconf on ${isPhysicalDevice ? 'physical device' : 'simulator'}, Platform: ${Platform.OS}`
            );

            // Create Zeroconf instance with debug mode enabled - this shows more logs
            this.zeroconf = new Zeroconf({ debug: true });
            console.log('Zeroconf instance created with debug enabled');

            // Log available methods on Zeroconf for debugging
            console.log('Zeroconf methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.zeroconf)));

            this.setupZeroconfListeners();
            console.log('Zeroconf listeners setup complete');

            // Special handling for physical iOS devices
            if (Platform.OS === 'ios' && isPhysicalDevice) {
                console.log('Physical iOS device detected, adding special handling');

                // Check if Bonjour services are authorized
                if (this.zeroconf.isServiceBrowserActive) {
                    console.log('Service browser is active');
                } else {
                    console.log('Service browser is NOT active');
                }

                // Listen for errors that might indicate initialization issues
                const errorHandler = (error: any) => {
                    console.warn('Zeroconf initialization error on physical device:', error);
                    console.warn('Error details:', JSON.stringify(error));

                    // Only disable if it's a critical error
                    if (
                        error.message &&
                        (error.message.includes('permission') ||
                            error.message.includes('NSNetService') ||
                            error.message.includes('denied'))
                    ) {
                        console.error('Critical permission error - disabling Zeroconf');
                        this.isZeroconfAvailable = false;
                    }
                };

                this.zeroconf.on('error', errorHandler);

                // For iOS 14+, ensure we have permission to use local network
                console.log(
                    'iOS device Info.plist should contain NSLocalNetworkUsageDescription and NSBonjourServices'
                );
                console.log('Triggering a quick scan to prompt for permission if needed');

                // Try a quick scan to trigger the permission dialog
                try {
                    setTimeout(() => {
                        try {
                            // Perform a quick scan to trigger the permission dialog
                            this.zeroconf.scan('', 'tcp', 'local.');
                            setTimeout(() => this.zeroconf.stop(), 1000);
                        } catch (innerError) {
                            console.warn('Error during permission prompt scan:', innerError);
                        }
                    }, 500);
                } catch (permissionError) {
                    console.warn('Error setting up permission prompt:', permissionError);
                }
            }

            console.log('Zeroconf initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Zeroconf:', error);
            console.error('Error details:', JSON.stringify(error));
            this.isZeroconfAvailable = false;
        }
    }

    private setupZeroconfListeners() {
        if (!this.zeroconf) {
            console.warn('Cannot setup listeners - Zeroconf instance is null');
            return;
        }

        // Listen for service found - this is when a service is discovered but not yet resolved
        this.zeroconf.on('found', service => {
            console.log('Zeroconf service found:', service);
        });

        // Handle service resolution
        this.zeroconf.on('resolved', service => {
            try {
                console.log('Zeroconf service resolved:', JSON.stringify(service, null, 2));

                // Check for our service based on name pattern rather than type
                // This is more reliable since some platforms don't consistently provide the type
                const isTournaFenceService =
                    (service.name && service.name.startsWith('TournaFence-')) ||
                    (service.fullName && service.fullName.includes('._tournafence._tcp.')) ||
                    (service.type && service.type.includes(`_${SERVICE_TYPE}`));

                if (isTournaFenceService) {
                    console.log('Service identified as TournaFence service');

                    // Get the tournament name from the TXT record if available
                    let tournamentName = 'Unknown Tournament';

                    // Extract the real tournament name from the TXT record if available
                    if (service.txt && service.txt.name) {
                        tournamentName = service.txt.name;
                        console.log('Using tournament name from TXT record:', tournamentName);
                    } else if (service.name && service.name.startsWith('TournaFence-')) {
                        // If no TXT record, extract name from the service name format we use
                        const nameParts = service.name.split('-');
                        if (nameParts.length >= 2) {
                            tournamentName = nameParts[1] || 'Tournament';
                        } else {
                            tournamentName = 'Tournament';
                        }
                        console.log('Extracted tournament name from service name:', tournamentName);
                    } else {
                        tournamentName = service.name || 'Unknown Tournament';
                        console.log('Using service name as tournament name:', tournamentName);
                    }

                    // Get the IP address - try multiple options
                    let hostIp = null;

                    // Always prefer IP addresses from addresses array if available
                    if (service.addresses && service.addresses.length > 0) {
                        // Try to find a non-local, IPv4 address (best choice for connectivity)
                        const ipv4Address = service.addresses.find(
                            addr =>
                                addr.includes('.') &&
                                !addr.startsWith('169.254.') && // Skip Link-local
                                !addr.startsWith('127.') && // Skip Loopback
                                !addr.includes(':') // Skip IPv6
                        );

                        if (ipv4Address) {
                            console.log('Using IPv4 address from addresses array:', ipv4Address);
                            hostIp = ipv4Address;
                        } else {
                            // If no suitable IPv4, look for any IPv4 address
                            const anyIPv4 = service.addresses.find(addr => addr.includes('.'));
                            if (anyIPv4) {
                                console.log('Using alternative IPv4 address:', anyIPv4);
                                hostIp = anyIPv4;
                            } else {
                                console.log('No IPv4 addresses found, using first address:', service.addresses[0]);
                                hostIp = service.addresses[0];
                            }
                        }
                    }
                    // Next try the ip property
                    else if (service.ip) {
                        console.log('Using IP from service:', service.ip);
                        hostIp = service.ip;
                    }
                    // Only use hostname as a last resort, and keep the .local suffix
                    else if (service.host) {
                        // For iOS, we need to keep the .local suffix for mDNS resolution
                        console.log('Using host from service (with .local if present):', service.host);

                        // If we have full hostname/IP, use it instead
                        if (service.host.includes('.') && !service.host.endsWith('.local')) {
                            hostIp = service.host;
                        } else {
                            // Legacy clients might need this
                            hostIp = service.host;
                        }
                    }

                    const port = service.port || DEFAULT_PORT;

                    // Skip services without valid connection info
                    if (!hostIp || hostIp === '0.0.0.0') {
                        console.log('Skipping service with invalid IP address');
                        return;
                    }

                    const server: DiscoveredServer = {
                        tournamentName: tournamentName,
                        hostIp: hostIp,
                        port: port,
                        timestamp: Date.now(),
                    };

                    console.log(
                        `Discovered tournament server: ${server.tournamentName} at ${server.hostIp}:${server.port}`
                    );
                    this.addServer(server);
                } else {
                    console.log(`Ignoring service, not matching TournaFence pattern:`, service.name, service.fullName);
                }
            } catch (error) {
                console.error('Error handling resolved service:', error);
                console.error('Error details:', JSON.stringify(error));
            }
        });

        // Handle errors
        this.zeroconf.on('error', error => {
            console.error('Zeroconf error:', error);
            console.error('Error details:', JSON.stringify(error));

            // Check for permissions-related errors
            if (error.message) {
                if (error.message.includes('permission') || error.message.includes('Permission')) {
                    console.error('Likely permissions issue with Zeroconf');
                }

                // If we get critical errors, disable Zeroconf
                if (error.message.includes('registerService')) {
                    console.error('Critical error with registerService, disabling Zeroconf');
                    this.isZeroconfAvailable = false;
                }
            }
        });

        // Listen for start events
        this.zeroconf.on('start', () => {
            console.log('Zeroconf scan started');
        });

        // Handle scan timeout
        this.zeroconf.on('timeout', () => {
            console.log('Zeroconf scan timeout - no more services will be discovered');
            this.setScanning(false);
        });

        // Handle stop scanning
        this.zeroconf.on('stop', () => {
            console.log('Zeroconf scanning stopped');
            this.setScanning(false);
        });

        console.log('All Zeroconf event listeners registered');
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
            timestamp: Date.now(),
        };

        this.addServer(server);
        console.log(`Added test server: ${name} at ${ip}:${port}`);
        return server;
    }

    // Manually add a server from console logs for testing
    manualDiscoverServer(server: DiscoveredServer) {
        if (!server.timestamp) {
            server.timestamp = Date.now();
        }
        this.addServer(server);
        console.log(`Manually added server: ${server.tournamentName} at ${server.hostIp}:${server.port}`);
        return server;
    }

    startScan() {
        if (this.isScanning) {
            console.log('Already scanning, ignoring startScan request');
            return;
        }

        console.log('Starting server discovery scan...');

        // Report current system state for debugging
        console.log('Zeroconf available:', this.isZeroconfAvailable);
        console.log('Platform:', Platform.OS);
        console.log('Is simulator:', DeviceInfo.isEmulator());

        this.clearServers();
        this.setScanning(true);

        // If Zeroconf isn't available, we'll use a simulated scan
        if (!this.isZeroconfAvailable || !this.zeroconf) {
            console.log('Zeroconf not available, simulating scan');

            // Set a timer to end the "scan" after a reasonable time
            setTimeout(() => {
                this.setScanning(false);
                console.log('Simulated scan completed - no servers found');
            }, DISCOVERY_TIMEOUT);

            return;
        }

        // Print info about current Zeroconf state
        console.log('Zeroconf object:', this.zeroconf ? 'exists' : 'null');
        if (this.zeroconf) {
            console.log(
                'Zeroconf service browser active:',
                this.zeroconf.isServiceBrowserActive !== undefined ? this.zeroconf.isServiceBrowserActive : 'unknown'
            );
        }

        try {
            // Check if we're on a physical iOS device and log accordingly
            const isPhysicalDevice = !DeviceInfo.isEmulator();
            if (Platform.OS === 'ios' && isPhysicalDevice) {
                console.log('Starting real device scan - checking for Local Network permissions');

                // Check permission state if possible
                if (this.zeroconf.isServiceBrowserActive !== undefined) {
                    console.log('Service browser active state:', this.zeroconf.isServiceBrowserActive);
                }
            }

            console.log(
                `Starting Zeroconf scan for service type: ${SERVICE_TYPE}, protocol: tcp, domain: ${SERVICE_DOMAIN}`
            );

            // Start scanning for our service type using the library's expected format
            // The service type is passed without underscores - the library adds them
            this.zeroconf.scan(SERVICE_TYPE, 'tcp', SERVICE_DOMAIN);
            console.log('Scan initiated - waiting for services to be discovered...');

            // Set a timeout to stop scanning after DISCOVERY_TIMEOUT
            if (this.discoveryTimer) {
                clearTimeout(this.discoveryTimer);
            }

            this.discoveryTimer = setTimeout(() => {
                console.log(`Scan timeout after ${DISCOVERY_TIMEOUT}ms`);
                this.stopScan();
            }, DISCOVERY_TIMEOUT);
        } catch (error) {
            console.error('Error starting Zeroconf scan:', error);
            console.error('Error details:', JSON.stringify(error));
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

            // Create a unique ID that's based on the tournament name and a random suffix
            // This ensures the name is both user-friendly and unique
            const safeNamePart = name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
            const uniqueId = Math.floor(Math.random() * 10000);
            const simpleName = `TournaFence-${safeNamePart}-${uniqueId}`;

            console.log(`Attempting to publish service with name: ${simpleName}`);

            // Use the exact method signature from the library's source code
            this.zeroconf.publishService(
                SERVICE_TYPE, // type (without underscores)
                'tcp', // protocol
                'local.', // domain (always "local.")
                simpleName, // name (includes user-friendly part)
                port, // port number
                {
                    // TXT record with the actual tournament name
                    name: name, // Store the real name in TXT record
                    app: 'TournaFence',
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
    const ipPattern =
        /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
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
            Network.getNetworkStateAsync(),
        ]);

        return {
            ipAddress,
            networkType: networkState.type,
            isConnected: networkState.isConnected,
            isInternetReachable: networkState.isInternetReachable,
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
        isRemote,
    };
}

/**
 * Get device ID for role-based permissions
 * Generates a 5-character ID that persists across app installs
 */
export async function getDeviceId(): Promise<string> {
    try {
        // Try to get the stored short ID first
        const storedId = await AsyncStorage.getItem('tournament_device_id');
        if (storedId) {
            return storedId;
        }

        // Generate a new 5-character device ID if none exists
        const uniqueId = await DeviceInfo.getUniqueId();

        // Generate a 5-character alphanumeric ID that's derived from the device's unique ID
        // Use a combination of letters and numbers, avoiding confusing characters like 0/O and 1/I
        const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
        let shortId = '';

        // Use hash of the uniqueId to generate more random distribution
        const hash = uniqueId.split('').reduce((a, b) => {
            a = (a << 5) - a + b.charCodeAt(0);
            return a & a;
        }, 0);

        // Generate 5 characters for the ID
        for (let i = 0; i < 5; i++) {
            const index = Math.abs(hash + i * 13) % alphabet.length;
            shortId += alphabet[index];
        }

        // Store the ID for future use
        await AsyncStorage.setItem('tournament_device_id', shortId);

        return shortId;
    } catch (error) {
        console.error('Error getting device ID:', error);
        // Fall back to a random 5-character ID if device ID can't be obtained
        const randomId = Math.random().toString(36).substring(2, 7).toUpperCase();
        return randomId;
    }
}

/**
 * Get the client ID and connection info - useful for permission checking
 */
export async function getClientConnectionInfo(): Promise<{
    clientId: string;
    deviceId: string;
    isRemote: boolean;
    isHost: boolean;
}> {
    const clientId = await getClientId();
    const deviceId = await getDeviceId();
    const isRemote = tournamentClient && tournamentClient.isConnected();
    // For now, assume we're not the host if we're connected remotely
    const isHost = !isRemote;

    return {
        clientId,
        deviceId,
        isRemote,
        isHost,
    };
}

/**
 * Start scanning for tournament servers on the local network
 * Returns a promise that resolves with discovered servers
 */
// Tracks whether we've initialized Zeroconf with a first scan
// This helps trigger the iOS permissions prompt on first use
let hasTriggeredInitialScan = false;

export function startServerDiscovery(): Promise<DiscoveredServer[]> {
    return new Promise((resolve, reject) => {
        try {
            // For physical iOS devices, we might need to trigger the permissions dialog
            if (!hasTriggeredInitialScan && Platform.OS === 'ios' && !DeviceInfo.isEmulator()) {
                console.log('First scan on physical iOS device - should trigger permissions dialog');
                hasTriggeredInitialScan = true;
            }

            if (serverDiscovery.isCurrentlyScanning()) {
                console.log('Already scanning for servers, returning current list');
                return resolve(serverDiscovery.getServersList());
            }

            console.log('Starting server discovery with promise...');
            serverDiscovery.clearServers();

            // Set up listener for servers update
            const onServersUpdated = (servers: DiscoveredServer[]) => {
                // Don't resolve yet, keep collecting discoveries until timeout
                console.log(`Server updates during scan: ${servers.length} servers found`);
            };

            const onScanningChanged = (isScanning: boolean) => {
                if (!isScanning) {
                    // Scanning finished, resolve with the collected servers
                    console.log('Scan completed, resolving promise');
                    serverDiscovery.removeListener('serversUpdated', onServersUpdated);
                    serverDiscovery.removeListener('scanningChanged', onScanningChanged);

                    const servers = serverDiscovery.getServersList();
                    console.log(`Discovered ${servers.length} servers in total`);

                    resolve(servers);
                }
            };

            serverDiscovery.on('serversUpdated', onServersUpdated);
            serverDiscovery.on('scanningChanged', onScanningChanged);

            // Start the scan
            serverDiscovery.startScan();
        } catch (error) {
            console.error('Error in server discovery:', error);
            console.error('Error details:', JSON.stringify(error));
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

/**
 * Networking infrastructure for client-server communication in the tournament application
 */

// Export the client and server implementations
export { default as tournamentClient } from './client';
export { default as tournamentServer } from './server';

// Export types
export * from './types';
export * from './errors';

// Export utility functions
export {
  getLocalIpAddress,
  isConnectedToInternet,
  getClientId,
  isValidIpAddress,
  isValidPort,
  withRemoteFlag,
  getDeviceId,
  getClientConnectionInfo,
  startServerDiscovery,
  stopServerDiscovery,
  getDiscoveredServers,
  publishTournamentService,
  unpublishTournamentService,
  type DiscoveredServer
} from './utils';

// Re-export components
export { default as ConnectionStatusBar } from './components/ConnectionStatusBar';

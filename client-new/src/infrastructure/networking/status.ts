/**
 * Network Status Management
 * Provides utilities for monitoring and managing network connectivity
 */
import NetInfo, { NetInfoState, NetInfoSubscription } from '@react-native-community/netinfo';
import { useCallback, useEffect, useState } from 'react';
import { queryClient } from '../query';

// Store the current network status
let isConnected = true;
let subscribers: ((status: NetworkStatus) => void)[] = [];

// Network status type
export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
  isWifi: boolean;
  isCellular: boolean;
  details: any;
  timestamp: number;
}

/**
 * Initialize network status monitoring
 */
export function initNetworkMonitoring(): NetInfoSubscription {
  return NetInfo.addEventListener(handleNetworkChange);
}

/**
 * Handle changes in network connectivity
 */
function handleNetworkChange(state: NetInfoState) {
  const oldConnected = isConnected;
  isConnected = state.isConnected === true;
  
  // Construct the network status object
  const status: NetworkStatus = {
    isConnected: state.isConnected === true,
    isInternetReachable: state.isInternetReachable,
    type: state.type,
    isWifi: state.type === 'wifi',
    isCellular: state.type === 'cellular',
    details: state.details,
    timestamp: Date.now()
  };
  
  // Notify subscribers
  subscribers.forEach(callback => callback(status));
  
  // If we've reconnected, resume paused queries
  if (!oldConnected && isConnected) {
    queryClient.resumePausedMutations();
    queryClient.invalidateQueries();
  }
}

/**
 * Subscribe to network status changes
 */
export function subscribeToNetworkStatus(callback: (status: NetworkStatus) => void): () => void {
  subscribers.push(callback);
  
  // Return unsubscribe function
  return () => {
    subscribers = subscribers.filter(cb => cb !== callback);
  };
}

/**
 * Get the current network status
 */
export async function getNetworkStatus(): Promise<NetworkStatus> {
  const state = await NetInfo.fetch();
  
  return {
    isConnected: state.isConnected === true,
    isInternetReachable: state.isInternetReachable,
    type: state.type,
    isWifi: state.type === 'wifi',
    isCellular: state.type === 'cellular',
    details: state.details,
    timestamp: Date.now()
  };
}

/**
 * React hook for using network status in components
 */
export function useNetworkStatus(): NetworkStatus & { refresh: () => Promise<void> } {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: null,
    type: 'unknown',
    isWifi: false,
    isCellular: false,
    details: null,
    timestamp: Date.now()
  });
  
  // Refresh the network status
  const refresh = useCallback(async () => {
    const networkStatus = await getNetworkStatus();
    setStatus(networkStatus);
  }, []);
  
  useEffect(() => {
    // Set initial status
    refresh();
    
    // Subscribe to changes
    const unsubscribe = subscribeToNetworkStatus(setStatus);
    
    return () => {
      unsubscribe();
    };
  }, [refresh]);
  
  return { ...status, refresh };
}

/**
 * Configure React Query based on network status
 */
export function configureQueryForNetworkStatus() {
  // When network is offline, pause mutations automatically
  subscribeToNetworkStatus((status) => {
    if (!status.isConnected) {
      queryClient.pauseQueries();
    } else {
      queryClient.resumeQueries();
    }
  });
  
  // Default configuration
  queryClient.setDefaultOptions({
    queries: {
      networkMode: 'always',
      retry: (failureCount, error) => {
        // Don't retry if network is offline
        if (!isConnected) return false;
        // Otherwise use default retry logic (up to 3 times)
        return failureCount < 3;
      }
    },
    mutations: {
      networkMode: 'always',
      retry: (failureCount, error) => {
        // Don't retry if network is offline
        if (!isConnected) return false;
        // Otherwise retry once
        return failureCount < 1;
      }
    }
  });
}

/**
 * Initialize everything related to network status
 */
export function initializeNetworkStatusInfrastructure() {
  const unsubscribe = initNetworkMonitoring();
  configureQueryForNetworkStatus();
  
  return unsubscribe;
}
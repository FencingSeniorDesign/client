/**
 * Query Persistence Configuration
 * Implements persistent storage for Tanstack Query using AsyncStorage
 */
import { AsyncStorageWrapper, persistQueryClient } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import React from 'react';

// Define the storage key for persisted queries
const QUERY_CACHE_KEY = 'FENCING_APP_QUERY_CACHE';

/**
 * Creates an AsyncStorage persister for React Native
 */
export const createAsyncStoragePersister = () => {
  return persistQueryClient({
    persister: new AsyncStorageWrapper(AsyncStorage),
    key: QUERY_CACHE_KEY,
    // Maximum age of cache in milliseconds
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    // Customize what data gets persisted
    serialize: data => JSON.stringify(data),
    deserialize: data => JSON.parse(data),
    // Filter out queries that shouldn't be persisted
    filter: (query) => {
      // Don't persist queries that are meant to be transient
      if (query.queryKey.includes('transient') || query.queryKey.includes('live')) {
        return false;
      }
      
      // Only persist successful queries
      return query.state.status === 'success';
    },
    // Dehydration/hydration options
    dehydrateOptions: {
      // Don't include error or loading state
      shouldDehydrateQuery: (query) => query.state.status === 'success',
    },
  });
};

/**
 * Creates a localStorage persister for web platforms
 */
export const createLocalStoragePersister = () => {
  return createSyncStoragePersister({
    key: QUERY_CACHE_KEY,
    storage: window.localStorage,
    // Maximum age of cache in milliseconds
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    // Customize serialization/deserialization
    serialize: data => JSON.stringify(data),
    deserialize: data => JSON.parse(data),
  });
};

/**
 * Platform-agnostic persister factory
 * Creates the appropriate persister based on the platform
 */
export const createPersister = () => {
  // Check if we're in a React Native environment or web
  if (typeof window !== 'undefined' && window.localStorage) {
    return createLocalStoragePersister();
  }
  
  return createAsyncStoragePersister();
};

/**
 * Persistent Query Provider
 * Wraps the application with PersistQueryClientProvider for offline support
 */
interface PersistentQueryProviderProps {
  children: React.ReactNode;
  queryClient: QueryClient;
  enableDevtools?: boolean;
}

export const PersistentQueryProvider: React.FC<PersistentQueryProviderProps> = ({
  children,
  queryClient,
  enableDevtools = process.env.NODE_ENV === 'development'
}) => {
  const persister = React.useMemo(() => createPersister(), []);
  
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
    >
      {children}
      {enableDevtools && 
        typeof window !== 'undefined' && 
        React.createElement(React.lazy(() => 
          import('@tanstack/react-query-devtools').then(mod => ({ 
            default: mod.ReactQueryDevtools 
          }))
        ), { initialIsOpen: false })
      }
    </PersistQueryClientProvider>
  );
};

/**
 * Helper function to clear the persisted cache
 * Useful for logout scenarios or troubleshooting
 */
export const clearPersistedQueries = async () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(QUERY_CACHE_KEY);
    } else {
      await AsyncStorage.removeItem(QUERY_CACHE_KEY);
    }
    return true;
  } catch (error) {
    console.error('Failed to clear persisted queries:', error);
    return false;
  }
};
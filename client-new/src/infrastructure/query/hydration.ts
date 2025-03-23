/**
 * Query Hydration/Dehydration
 * Implements efficient state transfer for Tanstack Query
 */
import { 
  QueryClient, 
  dehydrate, 
  hydrate, 
  HydrateOptions, 
  DehydrateOptions 
} from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getQueryClient } from './advanced';

// Define a key to store dehydrated state
const HYDRATION_STATE_KEY = 'TOURNAMENT_QUERY_STATE';

/**
 * Save the current query state for later hydration
 * @param options Customization options for dehydration
 * @returns Promise resolving when state is saved
 */
export async function saveQueryState(options?: DehydrateOptions): Promise<boolean> {
  try {
    const queryClient = getQueryClient();
    
    // Create a dehydrated representation of the current cache
    const dehydratedState = dehydrate(queryClient, {
      // Don't include errors or loading state
      shouldDehydrateQuery: query => query.state.status === 'success',
      // Additional options
      ...options
    });
    
    // Compress the state by removing unnecessary fields
    const serializedState = JSON.stringify(dehydratedState);
    
    // Save to AsyncStorage
    await AsyncStorage.setItem(HYDRATION_STATE_KEY, serializedState);
    
    console.log(`Query state saved: ${(serializedState.length / 1024).toFixed(2)} KB`);
    return true;
  } catch (error) {
    console.error('Failed to save query state:', error);
    return false;
  }
}

/**
 * Save a subset of queries for targeted hydration
 * @param queryKeys Array of query keys to save
 * @returns Promise resolving when state is saved
 */
export async function saveQuerySubset(queryKeys: unknown[][], storageKey?: string): Promise<boolean> {
  try {
    const queryClient = getQueryClient();
    const key = storageKey || `${HYDRATION_STATE_KEY}_SUBSET_${Date.now()}`;
    
    // Create a new temporary client to extract just the queries we want
    const temporaryClient = new QueryClient();
    
    // For each query key, get the data and add it to the temporary client
    for (const queryKey of queryKeys) {
      const queryData = queryClient.getQueryData(queryKey);
      if (queryData) {
        temporaryClient.setQueryData(queryKey, queryData);
      }
    }
    
    // Dehydrate only our selected queries
    const dehydratedState = dehydrate(temporaryClient);
    
    // Compress the state by removing unnecessary fields
    const serializedState = JSON.stringify(dehydratedState);
    
    // Save to AsyncStorage
    await AsyncStorage.setItem(key, serializedState);
    
    console.log(`Query subset saved (${queryKeys.length} queries): ${(serializedState.length / 1024).toFixed(2)} KB`);
    return true;
  } catch (error) {
    console.error('Failed to save query subset:', error);
    return false;
  }
}

/**
 * Load the saved query state and hydrate the query client
 * @param options Customization options for hydration
 * @returns Promise resolving when state is restored
 */
export async function loadQueryState(options?: HydrateOptions): Promise<boolean> {
  try {
    // Get the query client
    const queryClient = getQueryClient();
    
    // Load from AsyncStorage
    const serializedState = await AsyncStorage.getItem(HYDRATION_STATE_KEY);
    if (!serializedState) {
      console.log('No saved query state found');
      return false;
    }
    
    // Parse the saved state
    const dehydratedState = JSON.parse(serializedState);
    
    // Hydrate the query client with the saved state
    hydrate(queryClient, dehydratedState, options);
    
    console.log(`Query state restored: ${(serializedState.length / 1024).toFixed(2)} KB`);
    return true;
  } catch (error) {
    console.error('Failed to load query state:', error);
    return false;
  }
}

/**
 * Load a subset of queries from a saved state
 * @param storageKey The key used when saving the subset
 * @returns Promise resolving when subset is restored
 */
export async function loadQuerySubset(storageKey: string): Promise<boolean> {
  try {
    // Get the query client
    const queryClient = getQueryClient();
    
    // Load from AsyncStorage
    const serializedState = await AsyncStorage.getItem(storageKey);
    if (!serializedState) {
      console.log(`No saved query subset found for key: ${storageKey}`);
      return false;
    }
    
    // Parse the saved state
    const dehydratedState = JSON.parse(serializedState);
    
    // Hydrate the query client with the saved state
    hydrate(queryClient, dehydratedState);
    
    console.log(`Query subset restored: ${(serializedState.length / 1024).toFixed(2)} KB`);
    return true;
  } catch (error) {
    console.error('Failed to load query subset:', error);
    return false;
  }
}

/**
 * Save query state for a specific domain
 * @param domain The domain to save (e.g., 'tournaments', 'events')
 * @returns Promise resolving when state is saved
 */
export async function saveDomainState(domain: string): Promise<boolean> {
  try {
    const queryClient = getQueryClient();
    const key = `${HYDRATION_STATE_KEY}_${domain.toUpperCase()}`;
    
    // Get all queries for this domain
    const domainQueries = queryClient.getQueriesData({
      predicate: query => 
        Array.isArray(query.queryKey) && 
        query.queryKey[0] === domain
    });
    
    // Create a new temporary client to extract just this domain's queries
    const temporaryClient = new QueryClient();
    
    // Add each query to the temporary client
    for (const [queryKey, queryData] of domainQueries) {
      if (queryData) {
        temporaryClient.setQueryData(queryKey, queryData);
      }
    }
    
    // Dehydrate only our domain queries
    const dehydratedState = dehydrate(temporaryClient);
    
    // Compress the state by removing unnecessary fields
    const serializedState = JSON.stringify(dehydratedState);
    
    // Save to AsyncStorage
    await AsyncStorage.setItem(key, serializedState);
    
    console.log(`Domain state saved for '${domain}': ${(serializedState.length / 1024).toFixed(2)} KB`);
    return true;
  } catch (error) {
    console.error(`Failed to save domain state for '${domain}':`, error);
    return false;
  }
}

/**
 * Load query state for a specific domain
 * @param domain The domain to load (e.g., 'tournaments', 'events')
 * @returns Promise resolving when state is restored
 */
export async function loadDomainState(domain: string): Promise<boolean> {
  try {
    // Get the query client
    const queryClient = getQueryClient();
    const key = `${HYDRATION_STATE_KEY}_${domain.toUpperCase()}`;
    
    // Load from AsyncStorage
    const serializedState = await AsyncStorage.getItem(key);
    if (!serializedState) {
      console.log(`No saved domain state found for '${domain}'`);
      return false;
    }
    
    // Parse the saved state
    const dehydratedState = JSON.parse(serializedState);
    
    // Hydrate the query client with the saved state
    hydrate(queryClient, dehydratedState);
    
    console.log(`Domain state restored for '${domain}': ${(serializedState.length / 1024).toFixed(2)} KB`);
    return true;
  } catch (error) {
    console.error(`Failed to load domain state for '${domain}':`, error);
    return false;
  }
}

/**
 * Clear saved query state
 * @param domain Optional domain to clear (if not provided, clears all)
 * @returns Promise resolving when state is cleared
 */
export async function clearSavedQueryState(domain?: string): Promise<boolean> {
  try {
    if (domain) {
      const key = `${HYDRATION_STATE_KEY}_${domain.toUpperCase()}`;
      await AsyncStorage.removeItem(key);
      console.log(`Cleared saved query state for domain '${domain}'`);
    } else {
      await AsyncStorage.removeItem(HYDRATION_STATE_KEY);
      console.log('Cleared all saved query state');
    }
    return true;
  } catch (error) {
    console.error('Failed to clear saved query state:', error);
    return false;
  }
}

/**
 * Export hydration utilities
 */
export const hydrationUtils = {
  saveQueryState,
  loadQueryState,
  saveQuerySubset,
  loadQuerySubset,
  saveDomainState,
  loadDomainState,
  clearSavedQueryState
};
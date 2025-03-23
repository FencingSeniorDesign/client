/**
 * Advanced Query Utilities
 * Provides enhanced features for Tanstack Query
 */
import { 
  QueryClient, 
  MutationOptions,
  UseMutationOptions,
  QueryKey
} from '@tanstack/react-query';

/**
 * Enhanced invalidation strategy that handles cascading invalidations
 * Ensures that when data changes, all related queries are properly invalidated
 */
export function createInvalidationMap(queryClient: QueryClient) {
  // Map of entity types to their related entities that should be invalidated
  const invalidationMap: Record<string, string[]> = {
    'tournaments': ['events'],
    'events': ['rounds', 'fencers', 'officials', 'referees', 'fencerEvents', 'officialEvents', 'refereeEvents'],
    'rounds': ['pools', 'brackets', 'poolBouts', 'deBouts', 'seeding'],
    'pools': ['poolBouts', 'seeding', 'fencers'],
    'brackets': ['deBouts', 'fencers'],
    'fencers': ['pools', 'seeding', 'fencerEvents', 'poolBouts', 'deBouts', 'fencerBouts'],
    'officials': ['officialEvents', 'events'],
    'referees': ['refereeEvents', 'bouts', 'events'],
    'poolBouts': ['pools', 'seeding', 'fencerBouts', 'fencers'],
    'deBouts': ['brackets', 'fencerBouts', 'fencers'],
    'fencerBouts': ['poolBouts', 'deBouts', 'fencers'],
    'fencerEvents': ['events', 'fencers'],
    'refereeEvents': ['events', 'referees'],
    'officialEvents': ['events', 'officials'],
    'seeding': ['pools', 'rounds', 'fencers', 'events'],
  };

  /**
   * Performs cascade invalidation by entity type
   * @param entityType The type of entity that was modified
   * @param id Optional ID of the specific entity
   * @param tournamentName Optional tournament name for context
   */
  const invalidateEntity = (
    entityType: string, 
    id?: number | string,
    tournamentName?: string
  ) => {
    // First invalidate the modified entity itself
    if (id !== undefined) {
      queryClient.invalidateQueries({ 
        queryKey: [entityType, 'detail', id] 
      });
    }
    
    // Invalidate lists of this entity type
    queryClient.invalidateQueries({ 
      queryKey: [entityType, 'list'],
      exact: false
    });
    
    // If tournament specific, invalidate those queries
    if (tournamentName) {
      queryClient.invalidateQueries({ 
        queryKey: [entityType, 'list', 'tournament', tournamentName],
        exact: false
      });
    }
    
    // Cascade to related entities
    const relatedEntities = invalidationMap[entityType] || [];
    for (const relatedEntityType of relatedEntities) {
      // For related entities, we just invalidate lists, not specific items
      queryClient.invalidateQueries({ 
        queryKey: [relatedEntityType, 'list'],
        exact: false
      });
      
      // If tournament specific, invalidate those queries for related entities
      if (tournamentName) {
        queryClient.invalidateQueries({ 
          queryKey: [relatedEntityType, 'list', 'tournament', tournamentName],
          exact: false
        });
      }
    }
  };

  return { invalidateEntity };
}

/**
 * Creates an optimistic update configuration for a mutation
 * This makes the UI update immediately before the server confirms the change
 */
export function createOptimisticUpdate<TData, TError, TVariables, TContext, TResult = unknown>(
  queryKey: QueryKey,
  updateFn: (oldData: TData | undefined, variables: TVariables) => TData,
  options: Omit<UseMutationOptions<TResult, TError, TVariables, TContext>, 'onMutate' | 'onError' | 'onSettled'> = {}
): UseMutationOptions<TResult, TError, TVariables, TContext> {
  return {
    ...options,
    
    // Before the mutation runs:
    onMutate: async (variables) => {
      // Get the query client
      const client = getQueryClient();
      
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await client.cancelQueries({ queryKey });
      
      // Save the previous value
      const previousData = client.getQueryData<TData>(queryKey);
      
      // Optimistically update the cache with our expected result
      client.setQueryData<TData>(queryKey, (oldData) => 
        updateFn(oldData, variables)
      );
      
      // Return the snapshotted value
      return { previousData };
    },
    
    // If the mutation fails, use the context we created above
    onError: (err, variables, context) => {
      // Get the query client
      const client = getQueryClient();
      
      // Roll back to the previous value if the mutation fails
      if (context?.previousData) {
        client.setQueryData(queryKey, context.previousData);
      }
      
      // Call the original onError if it exists
      if (options.onError) {
        options.onError(err, variables, context as any);
      }
    },
    
    // Always refetch after error or success:
    onSettled: (data, error, variables, context) => {
      // Get the query client
      const client = getQueryClient();
      
      // Invalidate related queries to ensure consistency
      client.invalidateQueries({ queryKey });
      
      // Call the original onSettled if it exists
      if (options.onSettled) {
        options.onSettled(data, error, variables, context as any);
      }
    },
  };
}

/**
 * Configure silent background updates
 * Makes queries refresh in the background without showing loading indicators
 */
export function configureSilentUpdates(queryClient: QueryClient) {
  // Modify global defaults for less disruptive updates
  queryClient.setDefaultOptions({
    queries: {
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      // This tells React Query to keep the previous results visible while refetching
      keepPreviousData: true,
      // Don't show loading state if we already have data
      notifyOnChangeProps: ['data', 'error'],
    },
  });
}

// Global queryClient instance - this will be initialized in the provider
let queryClient: QueryClient;

export function setQueryClient(client: QueryClient) {
  queryClient = client;
}

export function getQueryClient() {
  if (!queryClient) {
    throw new Error('Query client not initialized. Call setQueryClient first.');
  }
  return queryClient;
}

export const advancedQueryUtils = {
  createInvalidationMap,
  createOptimisticUpdate,
  configureSilentUpdates,
};
import { useQuery, useMutation, useQueryClient, UseMutationOptions, UseQueryOptions } from '@tanstack/react-query';

/**
 * Generic hook for querying data using Tanstack Query
 * @param queryKey The key for the query
 * @param queryFn The function that fetches the data
 * @param options Additional options for the query
 */
export function useGenericQuery<TData, TError = unknown>(
  queryKey: unknown[],
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError, TData, unknown[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey,
    queryFn,
    ...options,
  });
}

/**
 * Generic hook for mutations using Tanstack Query
 * @param mutationKey The key for the mutation
 * @param mutationFn The function that performs the mutation
 * @param options Additional options for the mutation
 */
export function useGenericMutation<TData, TVariables, TError = unknown, TContext = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: Omit<UseMutationOptions<TData, TError, TVariables, TContext>, 'mutationFn'>
) {
  return useMutation({
    mutationFn,
    ...options,
  });
}

/**
 * Utility hook for invalidating queries based on a prefix
 * Useful for invalidating related queries after a mutation
 */
export function useInvalidateQueries() {
  const queryClient = useQueryClient();
  
  return {
    /**
     * Invalidate queries by prefix
     * @param prefixes The prefixes to invalidate
     */
    invalidateByPrefix: async (...prefixes: string[]) => {
      await Promise.all(
        prefixes.map(prefix => 
          queryClient.invalidateQueries({ predicate: query => 
            Array.isArray(query.queryKey) && 
            typeof query.queryKey[0] === 'string' && 
            query.queryKey[0].startsWith(prefix)
          })
        )
      );
    },
    
    /**
     * Invalidate specific queries by exact keys
     * @param queryKeys The keys to invalidate
     */
    invalidateExact: async (...queryKeys: unknown[][]) => {
      await Promise.all(
        queryKeys.map(queryKey => queryClient.invalidateQueries({ queryKey }))
      );
    },
    
    /**
     * Set query data directly
     * @param queryKey The query key to update
     * @param data The new data
     */
    setQueryData: <T>(queryKey: unknown[], data: T) => {
      queryClient.setQueryData(queryKey, data);
    },
    
    /**
     * Get query data directly
     * @param queryKey The query key to get data for
     */
    getQueryData: <T>(queryKey: unknown[]): T | undefined => {
      return queryClient.getQueryData<T>(queryKey);
    }
  };
}

/**
 * Create query key builder for consistent key patterns
 * @param domain The domain prefix for the queries (e.g., 'tournaments')
 */
export function createQueryKeys(domain: string) {
  return {
    all: () => [domain] as const,
    lists: () => [domain, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [domain, 'list', filters] as const,
    details: () => [domain, 'detail'] as const,
    detail: (id: string | number) => [domain, 'detail', id] as const,
  };
}

/**
 * Type for defining a custom query hook based on repository methods
 */
export type RepositoryQueryHooks<T, I> = {
  useGetAll: (options?: Omit<UseQueryOptions<T[], unknown, T[], unknown[]>, 'queryKey' | 'queryFn'>) => ReturnType<typeof useQuery>;
  useGetById: (id: string | number, options?: Omit<UseQueryOptions<T | undefined, unknown, T | undefined, unknown[]>, 'queryKey' | 'queryFn'>) => ReturnType<typeof useQuery>;
  useCreate: (options?: Omit<UseMutationOptions<T, unknown, I, unknown>, 'mutationFn'>) => ReturnType<typeof useMutation>;
  useUpdate: (options?: Omit<UseMutationOptions<T | undefined, unknown, { id: string | number, data: Partial<T> }, unknown>, 'mutationFn'>) => ReturnType<typeof useMutation>;
  useDelete: (options?: Omit<UseMutationOptions<boolean, unknown, string | number, unknown>, 'mutationFn'>) => ReturnType<typeof useMutation>;
};
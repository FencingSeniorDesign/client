/**
 * Query Data Transformations
 * Provides utilities for transforming and selecting data from queries
 */
import { 
  useQuery, 
  UseQueryOptions, 
  useQueries, 
  UseQueryResult, 
  UseQueryOptionsWithSelect
} from '@tanstack/react-query';
import { useMemo } from 'react';

/**
 * Selector type definition with generic input and output types
 */
export type Selector<TData, TResult> = (data: TData) => TResult;

/**
 * Create a memoized selector function for consistent performance
 * @param selector The selector function to memoize
 * @returns A memoized version of the selector
 */
export function createSelector<TData, TResult>(
  selector: Selector<TData, TResult>
): Selector<TData, TResult> {
  return selector;
}

/**
 * Hook to use a query with data transformation
 * @param queryKey The key for the query
 * @param queryFn The function to fetch the data
 * @param selector The selector function to transform the data
 * @param options Additional options for the query
 */
export function useTransformedQuery<TData, TResult, TError = unknown>(
  queryKey: unknown[],
  queryFn: () => Promise<TData>,
  selector: Selector<TData, TResult>,
  options?: Omit<UseQueryOptionsWithSelect<TData, TError, TResult, TData, unknown[]>, 'queryKey' | 'queryFn' | 'select'>
) {
  // Create a stable reference to the selector
  const stableSelector = useMemo(() => selector, [selector]);
  
  return useQuery({
    queryKey,
    queryFn,
    select: stableSelector,
    ...options,
  });
}

/**
 * Create a selector that picks specific properties from an object
 * @param keys The keys to pick from the object
 * @returns A selector function that returns an object with only the picked properties
 */
export function createPickSelector<T extends object, K extends keyof T>(
  keys: K[]
): Selector<T, Pick<T, K>> {
  return (data: T) => {
    if (!data) return {} as Pick<T, K>;
    
    const result = {} as Pick<T, K>;
    for (const key of keys) {
      if (key in data) {
        result[key] = data[key];
      }
    }
    return result;
  };
}

/**
 * Create a selector that transforms an array of items
 * @param itemSelector The selector to apply to each item
 * @returns A selector that maps the array using the item selector
 */
export function createArraySelector<TItem, TResult>(
  itemSelector: Selector<TItem, TResult>
): Selector<TItem[], TResult[]> {
  return (data: TItem[]) => {
    if (!data || !Array.isArray(data)) return [];
    return data.map(itemSelector);
  };
}

/**
 * Create a selector that filters and transforms an array
 * @param predicate The filter predicate function
 * @param itemSelector Optional selector to transform each item
 * @returns A selector that filters and optionally transforms the array
 */
export function createFilterSelector<TItem, TResult = TItem>(
  predicate: (item: TItem) => boolean,
  itemSelector?: Selector<TItem, TResult>
): Selector<TItem[], TResult[]> {
  return (data: TItem[]) => {
    if (!data || !Array.isArray(data)) return [];
    
    const filtered = data.filter(predicate);
    
    if (itemSelector) {
      return filtered.map(itemSelector);
    }
    
    return filtered as unknown as TResult[];
  };
}

/**
 * Create a selector that sorts an array
 * @param compareFn The comparison function for sorting
 * @param itemSelector Optional selector to transform each item after sorting
 * @returns A selector that sorts and optionally transforms the array
 */
export function createSortSelector<TItem, TResult = TItem>(
  compareFn: (a: TItem, b: TItem) => number,
  itemSelector?: Selector<TItem, TResult>
): Selector<TItem[], TResult[]> {
  return (data: TItem[]) => {
    if (!data || !Array.isArray(data)) return [];
    
    const sorted = [...data].sort(compareFn);
    
    if (itemSelector) {
      return sorted.map(itemSelector);
    }
    
    return sorted as unknown as TResult[];
  };
}

/**
 * Create a selector for finding an item in an array
 * @param predicate The predicate function to find the item
 * @returns A selector that returns the found item or undefined
 */
export function createFindSelector<TItem>(
  predicate: (item: TItem) => boolean
): Selector<TItem[], TItem | undefined> {
  return (data: TItem[]) => {
    if (!data || !Array.isArray(data)) return undefined;
    return data.find(predicate);
  };
}

/**
 * Create a selector for grouping items in an array
 * @param keyFn The function to determine the group key for each item
 * @returns A selector that returns a map of groups
 */
export function createGroupSelector<TItem, TKey extends string | number>(
  keyFn: (item: TItem) => TKey
): Selector<TItem[], Record<TKey, TItem[]>> {
  return (data: TItem[]) => {
    if (!data || !Array.isArray(data)) return {} as Record<TKey, TItem[]>;
    
    return data.reduce((groups, item) => {
      const key = keyFn(item);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {} as Record<TKey, TItem[]>);
  };
}

/**
 * Create a selector that combines multiple selectors
 * @param selectors The selectors to combine
 * @returns A selector that applies all selectors in sequence
 */
export function createPipeSelector<TData, TIntermediate, TResult>(
  selectors: Selector<TData, TIntermediate>[],
  finalSelector: Selector<TIntermediate, TResult>
): Selector<TData, TResult> {
  return (data: TData) => {
    let result = selectors.reduce(
      (current, selector) => selector(current as any),
      data as unknown as TIntermediate
    );
    
    return finalSelector(result);
  };
}

/**
 * Hook to combine and transform results from multiple queries
 * @param queryResults The query results to combine
 * @param combineFunction The function to combine the results
 * @returns The combined and transformed result
 */
export function useCombinedQueries<TData, TResult>(
  queryResults: UseQueryResult<TData, unknown>[],
  combineFunction: (data: TData[]) => TResult
): {
  data: TResult | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
} {
  // Check if any query is loading
  const isLoading = queryResults.some(result => result.isLoading);
  
  // Check if any query has an error
  const isError = queryResults.some(result => result.isError);
  
  // Get the first error, if any
  const error = queryResults.find(result => result.error)?.error;
  
  // Combine data if all queries have data
  const data = useMemo(() => {
    const allData = queryResults.map(result => result.data);
    
    // Only combine if all queries have data
    if (allData.every(data => data !== undefined)) {
      return combineFunction(allData as TData[]);
    }
    
    return undefined;
  }, [queryResults, combineFunction]);
  
  return { data, isLoading, isError, error };
}

/**
 * Hook for derived state from a query
 * @param queryResult The query result to derive from
 * @param deriveFn The function to derive the state
 * @returns The derived state
 */
export function useDerivedQueryState<TData, TDerived>(
  queryResult: UseQueryResult<TData, unknown>,
  deriveFn: (data: TData | undefined, isLoading: boolean, isError: boolean) => TDerived
): TDerived {
  return useMemo(() => {
    return deriveFn(
      queryResult.data, 
      queryResult.isLoading, 
      queryResult.isError
    );
  }, [queryResult.data, queryResult.isLoading, queryResult.isError, deriveFn]);
}

/**
 * Export all transformation utilities
 */
export const transformUtils = {
  createSelector,
  useTransformedQuery,
  createPickSelector,
  createArraySelector,
  createFilterSelector,
  createSortSelector,
  createFindSelector,
  createGroupSelector,
  createPipeSelector,
  useCombinedQueries,
  useDerivedQueryState
};
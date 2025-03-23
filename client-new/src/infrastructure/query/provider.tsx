import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { PersistentQueryProvider } from './persist';
import { configureSilentUpdates } from './advanced';

// Create a client with optimized default options
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60, // 1 hour - changed from cacheTime which is deprecated
      retry: 1,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: true, // Changed to true to keep data fresh
      refetchOnMount: true,
      // Keep previous data while fetching new data for smoother UIs
      keepPreviousData: true,
      // Only notify on data and error changes to reduce re-renders
      notifyOnChangeProps: ['data', 'error'],
    },
    mutations: {
      retry: 1,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

// Configure silent background updates
configureSilentUpdates(queryClient);

interface QueryProviderProps {
  children: React.ReactNode;
  enableDevtools?: boolean;
  enablePersistence?: boolean;
}

/**
 * Provider component for React Query
 * Wraps the application with React Query's QueryClientProvider or PersistentQueryProvider
 * and optionally includes the React Query Devtools
 */
export const QueryProvider: React.FC<QueryProviderProps> = ({ 
  children,
  enableDevtools = process.env.NODE_ENV === 'development',
  enablePersistence = true
}) => {
  // Use persistent storage by default, but allow it to be disabled
  if (enablePersistence) {
    return (
      <PersistentQueryProvider 
        queryClient={queryClient} 
        enableDevtools={enableDevtools}
      >
        {children}
      </PersistentQueryProvider>
    );
  }
  
  // Fall back to non-persistent provider if persistence is disabled
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {enableDevtools && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
};

// Export the query client for direct access
export { queryClient };
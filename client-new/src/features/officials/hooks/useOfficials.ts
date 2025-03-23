/**
 * Official Custom Hooks
 * Provides Tanstack Query hooks for the Officials domain
 */
import { 
  useQuery, 
  useMutation, 
  useQueryClient,
  UseMutationOptions,
  UseQueryOptions
} from '@tanstack/react-query';
import { Official } from '../../../core/types';
import { 
  getAllOfficials,
  getOfficialById,
  findOfficialByName,
  searchOfficialsByName,
  getOfficialsByEvent,
  getEventsByOfficial,
  createOfficial,
  createOfficials,
  updateOfficial,
  batchUpdateOfficials,
  deleteOfficial,
  batchDeleteOfficials,
  assignOfficialToEvent,
  removeOfficialFromEvent,
  assignOfficialToEvents,
  findOfficialByDeviceId,
  OfficialInsert,
  OfficialWithEvents,
  BatchOfficialUpdate
} from '../services/officialService';
import { createOptimisticUpdate } from '../../../infrastructure/query/advanced';
import { db } from '../../../infrastructure/database';

/**
 * Query keys for officials
 */
export const officialKeys = {
  all: ['officials'] as const,
  lists: () => [...officialKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...officialKeys.lists(), filters] as const,
  details: () => [...officialKeys.all, 'detail'] as const,
  detail: (id: number) => [...officialKeys.details(), id] as const,
  byEvent: (eventId: number) => [...officialKeys.lists(), 'byEvent', eventId] as const,
  search: (query: string) => [...officialKeys.lists(), 'search', query] as const,
  events: (officialId: number) => [...officialKeys.all, 'events', officialId] as const,
  byDevice: (deviceId: string) => [...officialKeys.all, 'byDevice', deviceId] as const,
};

// ********************* STANDARD QUERY HOOKS *********************

/**
 * Hook to fetch all officials
 */
export function useGetAllOfficials(options?: UseQueryOptions<Official[]>) {
  return useQuery<Official[]>({
    queryKey: officialKeys.lists(),
    queryFn: () => getAllOfficials(),
    ...options
  });
}

/**
 * Hook to fetch a specific official by ID
 */
export function useGetOfficialById(id: number, includeEvents = false, options?: UseQueryOptions<OfficialWithEvents | Official | null>) {
  return useQuery<OfficialWithEvents | Official | null>({
    queryKey: officialKeys.detail(id),
    queryFn: () => getOfficialById(id, includeEvents),
    enabled: id !== undefined && id !== null,
    ...options
  });
}

/**
 * Hook to find an official by name
 */
export function useFindOfficialByName(firstName: string, lastName: string, options?: UseQueryOptions<Official | null>) {
  return useQuery<Official | null>({
    queryKey: [...officialKeys.lists(), 'byName', firstName, lastName],
    queryFn: () => findOfficialByName(firstName, lastName),
    enabled: !!firstName && !!lastName,
    ...options
  });
}

/**
 * Hook to search officials by name
 */
export function useSearchOfficialsByName(query: string, options?: UseQueryOptions<Official[]>) {
  return useQuery<Official[]>({
    queryKey: officialKeys.search(query),
    queryFn: () => searchOfficialsByName(query),
    enabled: query?.length >= 2,
    ...options
  });
}

/**
 * Hook to get officials for a specific event
 */
export function useGetOfficialsByEvent(eventId: number, options?: UseQueryOptions<Official[]>) {
  return useQuery<Official[]>({
    queryKey: officialKeys.byEvent(eventId),
    queryFn: () => getOfficialsByEvent(eventId),
    enabled: eventId !== undefined && eventId !== null,
    ...options
  });
}

/**
 * Hook to get events for a specific official
 */
export function useGetEventsByOfficial(officialId: number, options?: UseQueryOptions<{ id: number; name: string }[]>) {
  return useQuery<{ id: number; name: string }[]>({
    queryKey: officialKeys.events(officialId),
    queryFn: () => getEventsByOfficial(officialId),
    enabled: officialId !== undefined && officialId !== null,
    ...options
  });
}

/**
 * Hook to find an official by device ID
 */
export function useFindOfficialByDeviceId(deviceId: string, options?: UseQueryOptions<Official | null>) {
  return useQuery<Official | null>({
    queryKey: officialKeys.byDevice(deviceId),
    queryFn: () => findOfficialByDeviceId(deviceId),
    enabled: !!deviceId,
    ...options
  });
}

// ********************* LIVE QUERY HOOKS *********************

/**
 * Hook to get all officials with live updates
 */
export function useLiveAllOfficials(options?: UseQueryOptions<Official[]>) {
  const queryOptions = {
    ...options,
    refetchInterval: 2000, // Poll every 2 seconds as a fallback
  };
  
  const result = useGetAllOfficials(queryOptions);
  
  // Set up live query subscription
  const queryClient = useQueryClient();
  
  React.useEffect(() => {
    const unsubscribe = db.liveMany('officials', (updatedOfficials) => {
      queryClient.setQueryData(officialKeys.lists(), updatedOfficials);
    });
    
    return () => {
      unsubscribe();
    };
  }, [queryClient]);
  
  return result;
}

/**
 * Hook to get a specific official with live updates
 */
export function useLiveOfficialById(id: number, includeEvents = false, options?: UseQueryOptions<OfficialWithEvents | Official | null>) {
  const queryOptions = {
    ...options,
    refetchInterval: 2000, // Poll every 2 seconds as a fallback
  };
  
  const result = useGetOfficialById(id, includeEvents, queryOptions);
  
  // Set up live query subscription
  const queryClient = useQueryClient();
  
  React.useEffect(() => {
    if (id === undefined || id === null) return;
    
    const unsubscribe = db.liveOne('officials', id, async (official) => {
      if (!official) {
        queryClient.setQueryData(officialKeys.detail(id), null);
        return;
      }
      
      if (!includeEvents) {
        queryClient.setQueryData(officialKeys.detail(id), official);
        return;
      }
      
      // If we need events, get them and merge with the official
      const events = await getEventsByOfficial(id);
      const officialWithEvents: OfficialWithEvents = {
        ...official,
        events
      };
      
      queryClient.setQueryData(officialKeys.detail(id), officialWithEvents);
    });
    
    return () => {
      unsubscribe();
    };
  }, [queryClient, id, includeEvents]);
  
  return result;
}

/**
 * Hook to get officials for a specific event with live updates
 */
export function useLiveOfficialsByEvent(eventId: number, options?: UseQueryOptions<Official[]>) {
  const queryOptions = {
    ...options,
    refetchInterval: 2000, // Poll every 2 seconds as a fallback
  };
  
  const result = useGetOfficialsByEvent(eventId, queryOptions);
  
  // Set up live query subscription for both officials and official-event relationships
  const queryClient = useQueryClient();
  
  React.useEffect(() => {
    if (eventId === undefined || eventId === null) return;
    
    // We need to watch both officials table and officialEvents table
    const unsubscribeOfficials = db.liveMany('officials', (updatedOfficials) => {
      // When officials change, refetch the list for this event
      queryClient.invalidateQueries({ queryKey: officialKeys.byEvent(eventId) });
    });
    
    const unsubscribeOfficialEvents = db.liveMany('officialEvents', (updatedOfficialEvents) => {
      // When officialEvents change, refetch the list for this event
      queryClient.invalidateQueries({ queryKey: officialKeys.byEvent(eventId) });
    });
    
    return () => {
      unsubscribeOfficials();
      unsubscribeOfficialEvents();
    };
  }, [queryClient, eventId]);
  
  return result;
}

// ********************* MUTATION HOOKS *********************

/**
 * Hook to create a new official
 */
export function useCreateOfficial(
  options?: UseMutationOptions<Official, Error, OfficialInsert>
) {
  const queryClient = useQueryClient();
  
  return useMutation<Official, Error, OfficialInsert>({
    mutationFn: (data) => createOfficial(data),
    onSuccess: (newOfficial) => {
      // Update lists that contain officials
      queryClient.invalidateQueries({ queryKey: officialKeys.lists() });
      
      // Update the detail view
      queryClient.setQueryData(officialKeys.detail(newOfficial.id), newOfficial);
    },
    ...options
  });
}

/**
 * Hook to create multiple officials
 */
export function useCreateOfficials(
  options?: UseMutationOptions<Official[], Error, OfficialInsert[]>
) {
  const queryClient = useQueryClient();
  
  return useMutation<Official[], Error, OfficialInsert[]>({
    mutationFn: (data) => createOfficials(data),
    onSuccess: (newOfficials) => {
      // Update lists that contain officials
      queryClient.invalidateQueries({ queryKey: officialKeys.lists() });
      
      // Update individual officials
      newOfficials.forEach(official => {
        queryClient.setQueryData(officialKeys.detail(official.id), official);
      });
    },
    ...options
  });
}

/**
 * Hook to update an official with optimistic updates
 */
export function useUpdateOfficial(
  options?: Omit<UseMutationOptions<Official | null, Error, { id: number; data: Partial<Official> }>, 'onMutate' | 'onError' | 'onSettled'>
) {
  const queryClient = useQueryClient();
  
  return useMutation<Official | null, Error, { id: number; data: Partial<Official> }>({
    mutationFn: ({ id, data }) => updateOfficial(id, data),
    ...createOptimisticUpdate(
      // The generic key we'll invalidate
      officialKeys.lists(),
      // Our optimistic update function
      (oldData: Official[] | undefined, variables: { id: number; data: Partial<Official> }) => {
        if (!oldData) return [] as Official[];
        
        // Find and update the specific official
        return oldData.map(official => 
          official.id === variables.id
            ? { ...official, ...variables.data }
            : official
        );
      },
      // Additional options from the caller
      {
        ...options,
        onSuccess: (updatedOfficial, variables, context) => {
          if (updatedOfficial) {
            // Invalidate detail view
            queryClient.setQueryData(officialKeys.detail(updatedOfficial.id), updatedOfficial);
            
            // Invalidate any events this official may be associated with
            queryClient.invalidateQueries({ 
              queryKey: ['events', 'list'],
              exact: false
            });
          }
          
          // Call the original onSuccess if it exists
          if (options?.onSuccess) {
            options.onSuccess(updatedOfficial, variables, context as any);
          }
        }
      }
    )
  });
}

/**
 * Hook to batch update multiple officials
 */
export function useBatchUpdateOfficials(
  options?: UseMutationOptions<Official[], Error, BatchOfficialUpdate[]>
) {
  const queryClient = useQueryClient();
  
  return useMutation<Official[], Error, BatchOfficialUpdate[]>({
    mutationFn: (updates) => batchUpdateOfficials(updates),
    onSuccess: (updatedOfficials) => {
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: officialKeys.lists() });
      
      // Update individual officials
      updatedOfficials.forEach(official => {
        queryClient.setQueryData(officialKeys.detail(official.id), official);
      });
      
      // Invalidate any events these officials may be associated with
      queryClient.invalidateQueries({ 
        queryKey: ['events', 'list'],
        exact: false
      });
    },
    ...options
  });
}

/**
 * Hook to delete an official
 */
export function useDeleteOfficial(
  options?: UseMutationOptions<boolean, Error, number>
) {
  const queryClient = useQueryClient();
  
  return useMutation<boolean, Error, number>({
    mutationFn: (id) => deleteOfficial(id),
    onSuccess: (_, id) => {
      // Invalidate and remove this official
      queryClient.invalidateQueries({ queryKey: officialKeys.lists() });
      queryClient.removeQueries({ queryKey: officialKeys.detail(id) });
      
      // Invalidate any events this official may be associated with
      queryClient.invalidateQueries({ 
        queryKey: ['events', 'list'],
        exact: false
      });
      
      // Invalidate officialEvents relationships
      queryClient.invalidateQueries({ 
        queryKey: ['officialEvents', 'list'],
        exact: false
      });
    },
    ...options
  });
}

/**
 * Hook to batch delete multiple officials
 */
export function useBatchDeleteOfficials(
  options?: UseMutationOptions<number, Error, number[]>
) {
  const queryClient = useQueryClient();
  
  return useMutation<number, Error, number[]>({
    mutationFn: (ids) => batchDeleteOfficials(ids),
    onSuccess: (_, ids) => {
      // Invalidate and remove these officials
      queryClient.invalidateQueries({ queryKey: officialKeys.lists() });
      
      ids.forEach(id => {
        queryClient.removeQueries({ queryKey: officialKeys.detail(id) });
      });
      
      // Invalidate any events these officials may be associated with
      queryClient.invalidateQueries({ 
        queryKey: ['events', 'list'],
        exact: false
      });
      
      // Invalidate officialEvents relationships
      queryClient.invalidateQueries({ 
        queryKey: ['officialEvents', 'list'],
        exact: false
      });
    },
    ...options
  });
}

/**
 * Hook to assign an official to an event
 */
export function useAssignOfficialToEvent(
  options?: UseMutationOptions<void, Error, { officialId: number; eventId: number }>
) {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, { officialId: number; eventId: number }>({
    mutationFn: ({ officialId, eventId }) => assignOfficialToEvent(officialId, eventId),
    onSuccess: (_, { officialId, eventId }) => {
      // Invalidate officials for this event
      queryClient.invalidateQueries({ queryKey: officialKeys.byEvent(eventId) });
      
      // Invalidate events for this official
      queryClient.invalidateQueries({ queryKey: officialKeys.events(officialId) });
      
      // Invalidate the official detail with events included
      queryClient.invalidateQueries({ queryKey: officialKeys.detail(officialId) });
      
      // Invalidate the event
      queryClient.invalidateQueries({ queryKey: ['events', 'detail', eventId] });
      
      // Invalidate officialEvents relationships
      queryClient.invalidateQueries({ 
        queryKey: ['officialEvents', 'list'],
        exact: false
      });
    },
    ...options
  });
}

/**
 * Hook to remove an official from an event
 */
export function useRemoveOfficialFromEvent(
  options?: UseMutationOptions<void, Error, { officialId: number; eventId: number }>
) {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, { officialId: number; eventId: number }>({
    mutationFn: ({ officialId, eventId }) => removeOfficialFromEvent(officialId, eventId),
    onSuccess: (_, { officialId, eventId }) => {
      // Invalidate officials for this event
      queryClient.invalidateQueries({ queryKey: officialKeys.byEvent(eventId) });
      
      // Invalidate events for this official
      queryClient.invalidateQueries({ queryKey: officialKeys.events(officialId) });
      
      // Invalidate the official detail with events included
      queryClient.invalidateQueries({ queryKey: officialKeys.detail(officialId) });
      
      // Invalidate the event
      queryClient.invalidateQueries({ queryKey: ['events', 'detail', eventId] });
      
      // Invalidate officialEvents relationships
      queryClient.invalidateQueries({ 
        queryKey: ['officialEvents', 'list'],
        exact: false
      });
    },
    ...options
  });
}

/**
 * Hook to assign an official to multiple events
 */
export function useAssignOfficialToEvents(
  options?: UseMutationOptions<void, Error, { officialId: number; eventIds: number[] }>
) {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, { officialId: number; eventIds: number[] }>({
    mutationFn: ({ officialId, eventIds }) => assignOfficialToEvents(officialId, eventIds),
    onSuccess: (_, { officialId, eventIds }) => {
      // Invalidate events for this official
      queryClient.invalidateQueries({ queryKey: officialKeys.events(officialId) });
      
      // Invalidate the official detail
      queryClient.invalidateQueries({ queryKey: officialKeys.detail(officialId) });
      
      // Invalidate officials for all affected events
      eventIds.forEach(eventId => {
        queryClient.invalidateQueries({ queryKey: officialKeys.byEvent(eventId) });
        queryClient.invalidateQueries({ queryKey: ['events', 'detail', eventId] });
      });
      
      // Invalidate officialEvents relationships
      queryClient.invalidateQueries({ 
        queryKey: ['officialEvents', 'list'],
        exact: false
      });
    },
    ...options
  });
}

// Fix missing React import
import React from 'react';
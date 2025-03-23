/**
 * Referee Custom Hooks
 * Provides Tanstack Query hooks for the Referee domain
 */
import { 
  useQuery, 
  useMutation, 
  useQueryClient,
  UseMutationOptions,
  UseQueryOptions
} from '@tanstack/react-query';
import { Referee, Bout, FencerBout } from '../../../core/types';
import { 
  getAllReferees,
  getRefereeById,
  findRefereeByName,
  searchRefereesByName,
  findRefereeByDeviceId,
  createReferee,
  createReferees,
  updateReferee,
  batchUpdateReferees,
  deleteReferee,
  batchDeleteReferees,
  getActiveBoutsByRefereeId,
  getBoutWithScores,
  updateBoutScores,
  setBoutVictor,
  createBout,
  updateBout,
  deleteBout,
  RefereeInsert,
  BatchRefereeUpdate,
  BoutWithScores
} from '../services/refereeService';
import { createOptimisticUpdate } from '../../../infrastructure/query/advanced';
import { db } from '../../../infrastructure/database';
import React from 'react';

/**
 * Query keys for referees and bouts
 */
export const refereeKeys = {
  all: ['referees'] as const,
  lists: () => [...refereeKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...refereeKeys.lists(), filters] as const,
  details: () => [...refereeKeys.all, 'detail'] as const,
  detail: (id: number) => [...refereeKeys.details(), id] as const,
  search: (query: string) => [...refereeKeys.lists(), 'search', query] as const,
  byDevice: (deviceId: string) => [...refereeKeys.all, 'byDevice', deviceId] as const,
};

export const boutKeys = {
  all: ['bouts'] as const,
  lists: () => [...boutKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...boutKeys.lists(), filters] as const,
  details: () => [...boutKeys.all, 'detail'] as const,
  detail: (id: number) => [...boutKeys.details(), id] as const,
  byReferee: (refereeId: number) => [...boutKeys.lists(), 'byReferee', refereeId] as const,
  active: (refereeId: number) => [...boutKeys.lists(), 'active', refereeId] as const,
  withScores: (boutId: number) => [...boutKeys.detail(boutId), 'withScores'] as const,
};

// ********************* STANDARD QUERY HOOKS *********************

/**
 * Hook to fetch all referees
 */
export function useGetAllReferees(options?: UseQueryOptions<Referee[]>) {
  return useQuery<Referee[]>({
    queryKey: refereeKeys.lists(),
    queryFn: () => getAllReferees(),
    ...options
  });
}

/**
 * Hook to fetch a specific referee by ID
 */
export function useGetRefereeById(id: number, options?: UseQueryOptions<Referee | null>) {
  return useQuery<Referee | null>({
    queryKey: refereeKeys.detail(id),
    queryFn: () => getRefereeById(id),
    enabled: id !== undefined && id !== null,
    ...options
  });
}

/**
 * Hook to find a referee by name
 */
export function useFindRefereeByName(firstName: string, lastName: string, options?: UseQueryOptions<Referee | null>) {
  return useQuery<Referee | null>({
    queryKey: [...refereeKeys.lists(), 'byName', firstName, lastName],
    queryFn: () => findRefereeByName(firstName, lastName),
    enabled: !!firstName && !!lastName,
    ...options
  });
}

/**
 * Hook to search referees by name
 */
export function useSearchRefereesByName(query: string, options?: UseQueryOptions<Referee[]>) {
  return useQuery<Referee[]>({
    queryKey: refereeKeys.search(query),
    queryFn: () => searchRefereesByName(query),
    enabled: query?.length >= 2,
    ...options
  });
}

/**
 * Hook to find a referee by device ID
 */
export function useFindRefereeByDeviceId(deviceId: string, options?: UseQueryOptions<Referee | null>) {
  return useQuery<Referee | null>({
    queryKey: refereeKeys.byDevice(deviceId),
    queryFn: () => findRefereeByDeviceId(deviceId),
    enabled: !!deviceId,
    ...options
  });
}

/**
 * Hook to get active bouts for a referee
 */
export function useGetActiveBoutsByReferee(refereeId: number, options?: UseQueryOptions<Bout[]>) {
  return useQuery<Bout[]>({
    queryKey: boutKeys.active(refereeId),
    queryFn: () => getActiveBoutsByRefereeId(refereeId),
    enabled: refereeId !== undefined && refereeId !== null,
    ...options
  });
}

/**
 * Hook to get a specific bout with its scores
 */
export function useGetBoutWithScores(boutId: number, options?: UseQueryOptions<BoutWithScores | null>) {
  return useQuery<BoutWithScores | null>({
    queryKey: boutKeys.withScores(boutId),
    queryFn: () => getBoutWithScores(boutId),
    enabled: boutId !== undefined && boutId !== null,
    ...options
  });
}

// ********************* LIVE QUERY HOOKS *********************

/**
 * Hook to get all referees with live updates
 */
export function useLiveAllReferees(options?: UseQueryOptions<Referee[]>) {
  const queryOptions = {
    ...options,
    refetchInterval: 2000, // Poll every 2 seconds as a fallback
  };
  
  const result = useGetAllReferees(queryOptions);
  
  // Set up live query subscription
  const queryClient = useQueryClient();
  
  React.useEffect(() => {
    const unsubscribe = db.liveMany('referees', (updatedReferees) => {
      queryClient.setQueryData(refereeKeys.lists(), updatedReferees);
    });
    
    return () => {
      unsubscribe();
    };
  }, [queryClient]);
  
  return result;
}

/**
 * Hook to get a specific referee with live updates
 */
export function useLiveRefereeById(id: number, options?: UseQueryOptions<Referee | null>) {
  const queryOptions = {
    ...options,
    refetchInterval: 2000, // Poll every 2 seconds as a fallback
  };
  
  const result = useGetRefereeById(id, queryOptions);
  
  // Set up live query subscription
  const queryClient = useQueryClient();
  
  React.useEffect(() => {
    if (id === undefined || id === null) return;
    
    const unsubscribe = db.liveOne('referees', id, (referee) => {
      queryClient.setQueryData(refereeKeys.detail(id), referee);
    });
    
    return () => {
      unsubscribe();
    };
  }, [queryClient, id]);
  
  return result;
}

/**
 * Hook to get active bouts for a referee with live updates
 */
export function useLiveActiveBoutsByReferee(refereeId: number, options?: UseQueryOptions<Bout[]>) {
  const queryOptions = {
    ...options,
    refetchInterval: 2000, // Poll every 2 seconds as a fallback
  };
  
  const result = useGetActiveBoutsByReferee(refereeId, queryOptions);
  
  // Set up live query subscription
  const queryClient = useQueryClient();
  
  React.useEffect(() => {
    if (refereeId === undefined || refereeId === null) return;
    
    const unsubscribe = db.liveMany('bouts', (updatedBouts) => {
      // Filter active bouts for this referee
      const activeBouts = updatedBouts.filter(bout => 
        bout.referee === refereeId && bout.victor === null
      );
      
      queryClient.setQueryData(boutKeys.active(refereeId), activeBouts);
    });
    
    return () => {
      unsubscribe();
    };
  }, [queryClient, refereeId]);
  
  return result;
}

/**
 * Hook to get a bout with scores with live updates
 * This is especially useful for real-time score display
 */
export function useLiveBoutWithScores(boutId: number, options?: UseQueryOptions<BoutWithScores | null>) {
  const queryOptions = {
    ...options,
    refetchInterval: 1000, // Poll every second as a fallback for scores that need frequent updates
  };
  
  const result = useGetBoutWithScores(boutId, queryOptions);
  
  // Set up live query subscriptions
  const queryClient = useQueryClient();
  
  React.useEffect(() => {
    if (boutId === undefined || boutId === null) return;
    
    // Subscribe to bout updates
    const boutUnsubscribe = db.liveOne('bouts', boutId, async (bout) => {
      if (!bout) {
        queryClient.setQueryData(boutKeys.withScores(boutId), null);
        return;
      }
      
      // Get the current data
      const currentData = queryClient.getQueryData<BoutWithScores | null>(boutKeys.withScores(boutId));
      
      // Update just the bout part, keeping the scores if available
      queryClient.setQueryData(boutKeys.withScores(boutId), {
        bout,
        scores: currentData?.scores || [],
      });
    });
    
    // Subscribe to fencer bout score updates
    const scoresUnsubscribe = db.liveMany('fencerBouts', (updatedScores) => {
      // Filter scores for this bout
      const boutScores = updatedScores.filter(score => 
        score.boutId === boutId
      );
      
      // Get the current data
      const currentData = queryClient.getQueryData<BoutWithScores | null>(boutKeys.withScores(boutId));
      
      // Only update if we have existing bout data
      if (currentData?.bout) {
        queryClient.setQueryData(boutKeys.withScores(boutId), {
          bout: currentData.bout,
          scores: boutScores,
        });
      }
    });
    
    return () => {
      boutUnsubscribe();
      scoresUnsubscribe();
    };
  }, [queryClient, boutId]);
  
  return result;
}

// ********************* MUTATION HOOKS *********************

/**
 * Hook to create a new referee
 */
export function useCreateReferee(
  options?: UseMutationOptions<Referee, Error, RefereeInsert>
) {
  const queryClient = useQueryClient();
  
  return useMutation<Referee, Error, RefereeInsert>({
    mutationFn: (data) => createReferee(data),
    onSuccess: (newReferee) => {
      // Update lists that contain referees
      queryClient.invalidateQueries({ queryKey: refereeKeys.lists() });
      
      // Update the detail view
      queryClient.setQueryData(refereeKeys.detail(newReferee.id), newReferee);
    },
    ...options
  });
}

/**
 * Hook to create multiple referees
 */
export function useCreateReferees(
  options?: UseMutationOptions<Referee[], Error, RefereeInsert[]>
) {
  const queryClient = useQueryClient();
  
  return useMutation<Referee[], Error, RefereeInsert[]>({
    mutationFn: (data) => createReferees(data),
    onSuccess: (newReferees) => {
      // Update lists that contain referees
      queryClient.invalidateQueries({ queryKey: refereeKeys.lists() });
      
      // Update individual referees
      newReferees.forEach(referee => {
        queryClient.setQueryData(refereeKeys.detail(referee.id), referee);
      });
    },
    ...options
  });
}

/**
 * Hook to update a referee with optimistic updates
 */
export function useUpdateReferee(
  options?: Omit<UseMutationOptions<Referee | null, Error, { id: number; data: Partial<Referee> }>, 'onMutate' | 'onError' | 'onSettled'>
) {
  const queryClient = useQueryClient();
  
  return useMutation<Referee | null, Error, { id: number; data: Partial<Referee> }>({
    mutationFn: ({ id, data }) => updateReferee(id, data),
    ...createOptimisticUpdate(
      // The generic key we'll invalidate
      refereeKeys.lists(),
      // Our optimistic update function
      (oldData: Referee[] | undefined, variables: { id: number; data: Partial<Referee> }) => {
        if (!oldData) return [] as Referee[];
        
        // Find and update the specific referee
        return oldData.map(referee => 
          referee.id === variables.id
            ? { ...referee, ...variables.data }
            : referee
        );
      },
      // Additional options from the caller
      {
        ...options,
        onSuccess: (updatedReferee, variables, context) => {
          if (updatedReferee) {
            // Invalidate detail view
            queryClient.setQueryData(refereeKeys.detail(updatedReferee.id), updatedReferee);
          }
          
          // Call the original onSuccess if it exists
          if (options?.onSuccess) {
            options.onSuccess(updatedReferee, variables, context as any);
          }
        }
      }
    )
  });
}

/**
 * Hook to batch update multiple referees
 */
export function useBatchUpdateReferees(
  options?: UseMutationOptions<Referee[], Error, BatchRefereeUpdate[]>
) {
  const queryClient = useQueryClient();
  
  return useMutation<Referee[], Error, BatchRefereeUpdate[]>({
    mutationFn: (updates) => batchUpdateReferees(updates),
    onSuccess: (updatedReferees) => {
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: refereeKeys.lists() });
      
      // Update individual referees
      updatedReferees.forEach(referee => {
        queryClient.setQueryData(refereeKeys.detail(referee.id), referee);
      });
    },
    ...options
  });
}

/**
 * Hook to delete a referee
 */
export function useDeleteReferee(
  options?: UseMutationOptions<boolean, Error, number>
) {
  const queryClient = useQueryClient();
  
  return useMutation<boolean, Error, number>({
    mutationFn: (id) => deleteReferee(id),
    onSuccess: (_, id) => {
      // Invalidate and remove this referee
      queryClient.invalidateQueries({ queryKey: refereeKeys.lists() });
      queryClient.removeQueries({ queryKey: refereeKeys.detail(id) });
      
      // Invalidate potentially affected bouts
      queryClient.invalidateQueries({ 
        queryKey: boutKeys.lists(),
        exact: false
      });
    },
    ...options
  });
}

/**
 * Hook to batch delete multiple referees
 */
export function useBatchDeleteReferees(
  options?: UseMutationOptions<number, Error, number[]>
) {
  const queryClient = useQueryClient();
  
  return useMutation<number, Error, number[]>({
    mutationFn: (ids) => batchDeleteReferees(ids),
    onSuccess: (_, ids) => {
      // Invalidate and remove these referees
      queryClient.invalidateQueries({ queryKey: refereeKeys.lists() });
      
      ids.forEach(id => {
        queryClient.removeQueries({ queryKey: refereeKeys.detail(id) });
      });
      
      // Invalidate potentially affected bouts
      queryClient.invalidateQueries({ 
        queryKey: boutKeys.lists(),
        exact: false
      });
    },
    ...options
  });
}

/**
 * Hook to create a bout
 */
export function useCreateBout(
  options?: UseMutationOptions<Bout, Error, Partial<Bout>>
) {
  const queryClient = useQueryClient();
  
  return useMutation<Bout, Error, Partial<Bout>>({
    mutationFn: (data) => createBout(data),
    onSuccess: (newBout) => {
      // Update bout lists
      queryClient.invalidateQueries({ queryKey: boutKeys.lists() });
      
      // Update referee's active bouts if this is an active bout
      if (newBout.referee && newBout.victor === null) {
        queryClient.invalidateQueries({ queryKey: boutKeys.active(newBout.referee) });
      }
      
      // Update the detail view
      queryClient.setQueryData(boutKeys.detail(newBout.id), newBout);
    },
    ...options
  });
}

/**
 * Hook to update a bout with optimistic updates
 */
export function useUpdateBout(
  options?: Omit<UseMutationOptions<Bout | null, Error, { id: number; data: Partial<Bout> }>, 'onMutate' | 'onError' | 'onSettled'>
) {
  const queryClient = useQueryClient();
  
  return useMutation<Bout | null, Error, { id: number; data: Partial<Bout> }>({
    mutationFn: ({ id, data }) => updateBout(id, data),
    ...createOptimisticUpdate(
      // The generic key we'll invalidate
      boutKeys.lists(),
      // Our optimistic update function
      (oldData: Bout[] | undefined, variables: { id: number; data: Partial<Bout> }) => {
        if (!oldData) return [] as Bout[];
        
        // Find and update the specific bout
        return oldData.map(bout => 
          bout.id === variables.id
            ? { ...bout, ...variables.data }
            : bout
        );
      },
      // Additional options from the caller
      {
        ...options,
        onSuccess: (updatedBout, variables, context) => {
          if (updatedBout) {
            // Update detail view
            queryClient.setQueryData(boutKeys.detail(updatedBout.id), updatedBout);
            
            // If referee or victor changed, update active bouts
            if (variables.data.referee || variables.data.victor !== undefined) {
              // If old referee exists, invalidate their active bouts
              const oldBout = queryClient.getQueryData<Bout>(boutKeys.detail(variables.id));
              if (oldBout?.referee) {
                queryClient.invalidateQueries({ queryKey: boutKeys.active(oldBout.referee) });
              }
              
              // If new referee exists, invalidate their active bouts
              if (updatedBout.referee) {
                queryClient.invalidateQueries({ queryKey: boutKeys.active(updatedBout.referee) });
              }
            }
            
            // Invalidate bout with scores
            queryClient.invalidateQueries({ queryKey: boutKeys.withScores(updatedBout.id) });
          }
          
          // Call the original onSuccess if it exists
          if (options?.onSuccess) {
            options.onSuccess(updatedBout, variables, context as any);
          }
        }
      }
    )
  });
}

/**
 * Hook to delete a bout
 */
export function useDeleteBout(
  options?: UseMutationOptions<boolean, Error, number>
) {
  const queryClient = useQueryClient();
  
  return useMutation<boolean, Error, number>({
    mutationFn: (id) => deleteBout(id),
    onSuccess: (_, id) => {
      // Get the bout before it's removed from cache
      const bout = queryClient.getQueryData<Bout>(boutKeys.detail(id));
      
      // Invalidate and remove this bout
      queryClient.invalidateQueries({ queryKey: boutKeys.lists() });
      queryClient.removeQueries({ queryKey: boutKeys.detail(id) });
      queryClient.removeQueries({ queryKey: boutKeys.withScores(id) });
      
      // If this bout had a referee, invalidate their active bouts
      if (bout?.referee) {
        queryClient.invalidateQueries({ queryKey: boutKeys.active(bout.referee) });
      }
    },
    ...options
  });
}

/**
 * Hook for updating bout scores with optimistic updates
 * This is particularly useful for real-time scoring
 */
export function useUpdateBoutScores(
  options?: Omit<UseMutationOptions<void, Error, { 
    boutId: number; 
    fencer1Id: number; 
    fencer1Score: number; 
    fencer2Id: number; 
    fencer2Score: number; 
  }>, 'onMutate' | 'onError' | 'onSettled'>
) {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, { 
    boutId: number; 
    fencer1Id: number; 
    fencer1Score: number; 
    fencer2Id: number; 
    fencer2Score: number; 
  }>({
    mutationFn: ({ boutId, fencer1Id, fencer1Score, fencer2Id, fencer2Score }) => 
      updateBoutScores(boutId, fencer1Id, fencer1Score, fencer2Id, fencer2Score),
    ...createOptimisticUpdate(
      // The bout with scores key we'll update optimistically
      boutKeys.withScores(0), // This is a dummy key, we'll get the real key from variables
      // Our optimistic update function
      (oldData: BoutWithScores | null | undefined, variables: { 
        boutId: number; 
        fencer1Id: number; 
        fencer1Score: number; 
        fencer2Id: number; 
        fencer2Score: number; 
      }) => {
        // This function will be called once per query key that matches our filter
        // Since we can't get the boutId in the key factory, we need to check if this is our key
        const boutsWithScoresKey = boutKeys.withScores(variables.boutId);
        
        // If this is not the right key, return oldData unchanged
        if (!oldData || !Array.isArray(boutsWithScoresKey)) {
          return oldData;
        }
        
        // Clone the data to avoid mutating the cache directly
        const updatedData: BoutWithScores = {
          bout: { ...oldData.bout },
          scores: [...oldData.scores]
        };
        
        // Update or add fencer1 score
        const fencer1Index = updatedData.scores.findIndex(s => s.fencerId === variables.fencer1Id);
        if (fencer1Index >= 0) {
          updatedData.scores[fencer1Index] = {
            ...updatedData.scores[fencer1Index],
            score: variables.fencer1Score
          };
        } else {
          updatedData.scores.push({
            boutId: variables.boutId,
            fencerId: variables.fencer1Id,
            score: variables.fencer1Score,
            id: -1 // Temporary ID until real one is assigned by the DB
          });
        }
        
        // Update or add fencer2 score
        const fencer2Index = updatedData.scores.findIndex(s => s.fencerId === variables.fencer2Id);
        if (fencer2Index >= 0) {
          updatedData.scores[fencer2Index] = {
            ...updatedData.scores[fencer2Index],
            score: variables.fencer2Score
          };
        } else {
          updatedData.scores.push({
            boutId: variables.boutId,
            fencerId: variables.fencer2Id,
            score: variables.fencer2Score,
            id: -2 // Temporary ID until real one is assigned by the DB
          });
        }
        
        return updatedData;
      },
      // Additional options from the caller
      {
        ...options,
        onSuccess: (_, variables, context) => {
          // Invalidate the specific bout with scores
          queryClient.invalidateQueries({ 
            queryKey: boutKeys.withScores(variables.boutId) 
          });
          
          // Call the original onSuccess if it exists
          if (options?.onSuccess) {
            options.onSuccess(_, variables, context as any);
          }
        }
      }
    )
  });
}

/**
 * Hook for setting a bout victor with optimistic updates
 */
export function useSetBoutVictor(
  options?: Omit<UseMutationOptions<Bout | null, Error, { 
    boutId: number; 
    victorId: number; 
  }>, 'onMutate' | 'onError' | 'onSettled'>
) {
  const queryClient = useQueryClient();
  
  return useMutation<Bout | null, Error, { boutId: number; victorId: number }>({
    mutationFn: ({ boutId, victorId }) => setBoutVictor(boutId, victorId),
    ...createOptimisticUpdate(
      // The bout key we'll update optimistically
      boutKeys.withScores(0), // This is a dummy key, we'll get the real key from variables
      // Our optimistic update function
      (oldData: BoutWithScores | null | undefined, variables: { boutId: number; victorId: number }) => {
        // If this is not our data, return it unchanged
        if (!oldData) return oldData;
        
        // Update the bout with the victor
        return {
          ...oldData,
          bout: {
            ...oldData.bout,
            victor: variables.victorId
          }
        };
      },
      // Additional options from the caller
      {
        ...options,
        onSuccess: (updatedBout, variables, context) => {
          if (updatedBout) {
            // Update the bout detail
            queryClient.setQueryData(boutKeys.detail(variables.boutId), updatedBout);
            
            // Invalidate the bout with scores
            queryClient.invalidateQueries({ 
              queryKey: boutKeys.withScores(variables.boutId) 
            });
            
            // If this bout had a referee, invalidate their active bouts
            if (updatedBout.referee) {
              queryClient.invalidateQueries({ 
                queryKey: boutKeys.active(updatedBout.referee) 
              });
            }
          }
          
          // Call the original onSuccess if it exists
          if (options?.onSuccess) {
            options.onSuccess(updatedBout, variables, context as any);
          }
        }
      }
    )
  });
}
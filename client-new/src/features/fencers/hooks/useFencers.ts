/**
 * useFencers hook
 * Provides reactive data access for fencers using Tanstack Query
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as fencerService from '../services/fencerService';
import { Fencer } from '../../../core/types';

// Query keys for cache invalidation
export const FENCER_KEYS = {
  all: ['fencers'] as const,
  lists: () => [...FENCER_KEYS.all, 'list'] as const,
  list: (filters: any) => [...FENCER_KEYS.lists(), { filters }] as const,
  details: () => [...FENCER_KEYS.all, 'detail'] as const,
  detail: (id: number) => [...FENCER_KEYS.details(), id] as const,
  byEvent: (eventId: number) => [...FENCER_KEYS.lists(), { event: eventId }] as const,
  byTournament: (tournamentName: string) => [...FENCER_KEYS.lists(), { tournament: tournamentName }] as const,
};

/**
 * Hook to access fencers data
 */
export default function useFencers() {
  const queryClient = useQueryClient();

  // Get all fencers
  const useAllFencers = () => {
    return useQuery({
      queryKey: FENCER_KEYS.lists(),
      queryFn: fencerService.getAllFencers,
    });
  };

  // Get fencer by ID
  const useFencerById = (id: number) => {
    return useQuery({
      queryKey: FENCER_KEYS.detail(id),
      queryFn: () => fencerService.getFencerById(id),
      enabled: !!id,
    });
  };

  // Get fencers by event
  const useFencersByEvent = (eventId: number) => {
    return useQuery({
      queryKey: FENCER_KEYS.byEvent(eventId),
      queryFn: () => fencerService.getFencersByEvent(eventId),
      enabled: !!eventId,
    });
  };

  // Get fencers by tournament
  const useFencersByTournament = (tournamentName: string) => {
    return useQuery({
      queryKey: FENCER_KEYS.byTournament(tournamentName),
      queryFn: () => fencerService.getFencersByTournament(tournamentName),
      enabled: !!tournamentName,
    });
  };

  // Create fencer mutation
  const useCreateFencer = () => {
    return useMutation({
      mutationFn: fencerService.createFencer,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: FENCER_KEYS.lists() });
      },
    });
  };

  // Update fencer mutation
  const useUpdateFencer = () => {
    return useMutation({
      mutationFn: ({ id, data }: { id: number; data: Partial<Fencer> }) =>
        fencerService.updateFencer(id, data),
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: FENCER_KEYS.detail(variables.id) });
        queryClient.invalidateQueries({ queryKey: FENCER_KEYS.lists() });
      },
    });
  };

  // Delete fencer mutation
  const useDeleteFencer = () => {
    return useMutation({
      mutationFn: fencerService.deleteFencer,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: FENCER_KEYS.lists() });
      },
    });
  };

  // Add fencer to event mutation
  const useAddFencerToEvent = () => {
    return useMutation({
      mutationFn: ({ fencerId, eventId }: { fencerId: number; eventId: number }) =>
        fencerService.addFencerToEvent(fencerId, eventId),
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: FENCER_KEYS.byEvent(variables.eventId) });
        queryClient.invalidateQueries({ queryKey: FENCER_KEYS.detail(variables.fencerId) });
      },
    });
  };

  // Remove fencer from event mutation
  const useRemoveFencerFromEvent = () => {
    return useMutation({
      mutationFn: ({ fencerId, eventId }: { fencerId: number; eventId: number }) =>
        fencerService.removeFencerFromEvent(fencerId, eventId),
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: FENCER_KEYS.byEvent(variables.eventId) });
        queryClient.invalidateQueries({ queryKey: FENCER_KEYS.detail(variables.fencerId) });
      },
    });
  };

  // Batch add fencers to event mutation
  const useBatchAddFencersToEvent = () => {
    return useMutation({
      mutationFn: ({ fencerIds, eventId }: { fencerIds: number[]; eventId: number }) =>
        fencerService.batchAddFencersToEvent(fencerIds, eventId),
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: FENCER_KEYS.byEvent(variables.eventId) });
        variables.fencerIds.forEach(id => {
          queryClient.invalidateQueries({ queryKey: FENCER_KEYS.detail(id) });
        });
      },
    });
  };

  return {
    useAllFencers,
    useFencerById,
    useFencersByEvent,
    useFencersByTournament,
    useCreateFencer,
    useUpdateFencer,
    useDeleteFencer,
    useAddFencerToEvent,
    useRemoveFencerFromEvent,
    useBatchAddFencersToEvent,
  };
}
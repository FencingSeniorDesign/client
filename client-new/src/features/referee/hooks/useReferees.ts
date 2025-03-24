/**
 * useReferees hook
 * Provides reactive data access for referees using Tanstack Query
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as refereeService from '../services/refereeService';
import { Referee } from '../../../core/types';

// Query keys for cache invalidation
export const REFEREE_KEYS = {
  all: ['referees'] as const,
  lists: () => [...REFEREE_KEYS.all, 'list'] as const,
  list: (filters: any) => [...REFEREE_KEYS.lists(), { filters }] as const,
  details: () => [...REFEREE_KEYS.all, 'detail'] as const,
  detail: (id: number) => [...REFEREE_KEYS.details(), id] as const,
  byEvent: (eventId: number) => [...REFEREE_KEYS.lists(), { event: eventId }] as const,
  byTournament: (tournamentName: string) => [...REFEREE_KEYS.lists(), { tournament: tournamentName }] as const,
};

/**
 * Hook to access referees data
 */
export default function useReferees() {
  const queryClient = useQueryClient();

  // Get all referees
  const useAllReferees = () => {
    return useQuery({
      queryKey: REFEREE_KEYS.lists(),
      queryFn: refereeService.getAllReferees,
    });
  };

  // Get referee by ID
  const useRefereeById = (id: number) => {
    return useQuery({
      queryKey: REFEREE_KEYS.detail(id),
      queryFn: () => refereeService.getRefereeById(id),
      enabled: !!id,
    });
  };

  // Get referees by event
  const useRefereesByEvent = (eventId: number) => {
    return useQuery({
      queryKey: REFEREE_KEYS.byEvent(eventId),
      queryFn: () => refereeService.getRefereesByEvent(eventId),
      enabled: !!eventId,
    });
  };

  // Get referees by tournament
  const useRefereesByTournament = (tournamentName: string) => {
    return useQuery({
      queryKey: REFEREE_KEYS.byTournament(tournamentName),
      queryFn: () => refereeService.getRefereesByTournament(tournamentName),
      enabled: !!tournamentName,
    });
  };

  // Create referee mutation
  const useCreateReferee = () => {
    return useMutation({
      mutationFn: refereeService.createReferee,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: REFEREE_KEYS.lists() });
      },
    });
  };

  // Update referee mutation
  const useUpdateReferee = () => {
    return useMutation({
      mutationFn: ({ id, data }: { id: number; data: Partial<Referee> }) =>
        refereeService.updateReferee(id, data),
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: REFEREE_KEYS.detail(variables.id) });
        queryClient.invalidateQueries({ queryKey: REFEREE_KEYS.lists() });
      },
    });
  };

  // Delete referee mutation
  const useDeleteReferee = () => {
    return useMutation({
      mutationFn: refereeService.deleteReferee,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: REFEREE_KEYS.lists() });
      },
    });
  };

  // Add referee to event mutation
  const useAddRefereeToEvent = () => {
    return useMutation({
      mutationFn: ({ refereeId, eventId }: { refereeId: number; eventId: number }) =>
        refereeService.addRefereeToEvent(refereeId, eventId),
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: REFEREE_KEYS.byEvent(variables.eventId) });
        queryClient.invalidateQueries({ queryKey: REFEREE_KEYS.detail(variables.refereeId) });
      },
    });
  };

  // Remove referee from event mutation
  const useRemoveRefereeFromEvent = () => {
    return useMutation({
      mutationFn: ({ refereeId, eventId }: { refereeId: number; eventId: number }) =>
        refereeService.removeRefereeFromEvent(refereeId, eventId),
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: REFEREE_KEYS.byEvent(variables.eventId) });
        queryClient.invalidateQueries({ queryKey: REFEREE_KEYS.detail(variables.refereeId) });
      },
    });
  };

  // Get referee by device ID
  const useRefereeByDeviceId = (deviceId: string) => {
    return useQuery({
      queryKey: [...REFEREE_KEYS.lists(), { deviceId }],
      queryFn: () => refereeService.getRefereeByDeviceId(deviceId),
      enabled: !!deviceId,
    });
  };

  // Update referee device ID mutation
  const useUpdateRefereeDeviceId = () => {
    return useMutation({
      mutationFn: ({ id, deviceId }: { id: number; deviceId: string }) =>
        refereeService.updateRefereeDeviceId(id, deviceId),
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: REFEREE_KEYS.detail(variables.id) });
        queryClient.invalidateQueries({ queryKey: REFEREE_KEYS.lists() });
      },
    });
  };

  // Get referee assignments
  const useRefereeAssignments = (refereeId: number) => {
    return useQuery({
      queryKey: [...REFEREE_KEYS.detail(refereeId), 'assignments'],
      queryFn: () => refereeService.getRefereeAssignments(refereeId),
      enabled: !!refereeId,
    });
  };

  return {
    useAllReferees,
    useRefereeById,
    useRefereesByEvent,
    useRefereesByTournament,
    useCreateReferee,
    useUpdateReferee,
    useDeleteReferee,
    useAddRefereeToEvent,
    useRemoveRefereeFromEvent,
    useRefereeByDeviceId,
    useUpdateRefereeDeviceId,
    useRefereeAssignments,
  };
}
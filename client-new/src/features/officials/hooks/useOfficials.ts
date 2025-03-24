/**
 * useOfficials hook
 * Provides reactive data access for officials using Tanstack Query
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as officialService from '../services/officialService';
import { Official } from '../../../core/types';

// Query keys for cache invalidation
export const OFFICIAL_KEYS = {
  all: ['officials'] as const,
  lists: () => [...OFFICIAL_KEYS.all, 'list'] as const,
  list: (filters: any) => [...OFFICIAL_KEYS.lists(), { filters }] as const,
  details: () => [...OFFICIAL_KEYS.all, 'detail'] as const,
  detail: (id: number) => [...OFFICIAL_KEYS.details(), id] as const,
  byEvent: (eventId: number) => [...OFFICIAL_KEYS.lists(), { event: eventId }] as const,
  byTournament: (tournamentName: string) => [...OFFICIAL_KEYS.lists(), { tournament: tournamentName }] as const,
};

/**
 * Hook to access officials data
 */
export default function useOfficials() {
  const queryClient = useQueryClient();

  // Get all officials
  const useAllOfficials = () => {
    return useQuery({
      queryKey: OFFICIAL_KEYS.lists(),
      queryFn: officialService.getAllOfficials,
    });
  };

  // Get official by ID
  const useOfficialById = (id: number) => {
    return useQuery({
      queryKey: OFFICIAL_KEYS.detail(id),
      queryFn: () => officialService.getOfficialById(id),
      enabled: !!id,
    });
  };

  // Get officials by event
  const useOfficialsByEvent = (eventId: number) => {
    return useQuery({
      queryKey: OFFICIAL_KEYS.byEvent(eventId),
      queryFn: () => officialService.getOfficialsByEvent(eventId),
      enabled: !!eventId,
    });
  };

  // Get officials by tournament
  const useOfficialsByTournament = (tournamentName: string) => {
    return useQuery({
      queryKey: OFFICIAL_KEYS.byTournament(tournamentName),
      queryFn: () => officialService.getOfficialsByTournament(tournamentName),
      enabled: !!tournamentName,
    });
  };

  // Create official mutation
  const useCreateOfficial = () => {
    return useMutation({
      mutationFn: officialService.createOfficial,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: OFFICIAL_KEYS.lists() });
      },
    });
  };

  // Update official mutation
  const useUpdateOfficial = () => {
    return useMutation({
      mutationFn: ({ id, data }: { id: number; data: Partial<Official> }) =>
        officialService.updateOfficial(id, data),
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: OFFICIAL_KEYS.detail(variables.id) });
        queryClient.invalidateQueries({ queryKey: OFFICIAL_KEYS.lists() });
      },
    });
  };

  // Delete official mutation
  const useDeleteOfficial = () => {
    return useMutation({
      mutationFn: officialService.deleteOfficial,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: OFFICIAL_KEYS.lists() });
      },
    });
  };

  // Add official to event mutation
  const useAddOfficialToEvent = () => {
    return useMutation({
      mutationFn: ({ officialId, eventId }: { officialId: number; eventId: number }) =>
        officialService.addOfficialToEvent(officialId, eventId),
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: OFFICIAL_KEYS.byEvent(variables.eventId) });
        queryClient.invalidateQueries({ queryKey: OFFICIAL_KEYS.detail(variables.officialId) });
      },
    });
  };

  // Remove official from event mutation
  const useRemoveOfficialFromEvent = () => {
    return useMutation({
      mutationFn: ({ officialId, eventId }: { officialId: number; eventId: number }) =>
        officialService.removeOfficialFromEvent(officialId, eventId),
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: OFFICIAL_KEYS.byEvent(variables.eventId) });
        queryClient.invalidateQueries({ queryKey: OFFICIAL_KEYS.detail(variables.officialId) });
      },
    });
  };

  // Get official by device ID
  const useOfficialByDeviceId = (deviceId: string) => {
    return useQuery({
      queryKey: [...OFFICIAL_KEYS.lists(), { deviceId }],
      queryFn: () => officialService.getOfficialByDeviceId(deviceId),
      enabled: !!deviceId,
    });
  };

  // Update official device ID mutation
  const useUpdateOfficialDeviceId = () => {
    return useMutation({
      mutationFn: ({ id, deviceId }: { id: number; deviceId: string }) =>
        officialService.updateOfficialDeviceId(id, deviceId),
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: OFFICIAL_KEYS.detail(variables.id) });
        queryClient.invalidateQueries({ queryKey: OFFICIAL_KEYS.lists() });
      },
    });
  };

  return {
    useAllOfficials,
    useOfficialById,
    useOfficialsByEvent,
    useOfficialsByTournament,
    useCreateOfficial,
    useUpdateOfficial,
    useDeleteOfficial,
    useAddOfficialToEvent,
    useRemoveOfficialFromEvent,
    useOfficialByDeviceId,
    useUpdateOfficialDeviceId,
  };
}
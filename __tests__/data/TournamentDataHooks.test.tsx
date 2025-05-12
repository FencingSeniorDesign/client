// __tests__/data/TournamentDataHooks.test.tsx
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import * as hooks from '../../src/data/TournamentDataHooks';
import dataProvider from '../../src/data/DrizzleDataProvider';

jest.mock('../../src/data/DrizzleDataProvider');

const createWrapper = () => {
  const queryClient = new QueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('TournamentDataHooks', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('useOngoingTournaments returns data from dataProvider', async () => {
    const mockTournaments = [{ name: 'Mock Tournament 1' }];
    (dataProvider.listOngoingTournaments as jest.Mock).mockResolvedValue(mockTournaments);

    const { result } = renderHook(() => hooks.useOngoingTournaments(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockTournaments);
  });

  test('useCompletedTournaments returns data from dataProvider', async () => {
    const mockCompleted = [{ name: 'Completed Tournament' }];
    (dataProvider.listCompletedTournaments as jest.Mock).mockResolvedValue(mockCompleted);

    const { result } = renderHook(() => hooks.useCompletedTournaments(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockCompleted);
  });
});

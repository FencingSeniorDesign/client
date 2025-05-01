// EventManagement.test.tsx

// Mock expo-sqlite before any imports
jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => ({
    transaction: jest.fn(),
    exec: jest.fn(),
    close: jest.fn(),
  })),
}));

// Mock DrizzleClient
jest.mock('../../../src/db/DrizzleClient', () => ({
  db: {
    query: jest.fn(),
    transaction: jest.fn(),
  },
}));

// Mock DrizzleDataProvider
jest.mock('../../../src/data/DrizzleDataProvider', () => ({
  default: {
    getEvents: jest.fn(() => []),
    getEventStatuses: jest.fn(() => ({})),
    createEvent: jest.fn(),
    deleteEvent: jest.fn(),
  },
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EventManagement } from '../../../src/navigation/screens/EventManagement';

// Mock data hooks
jest.mock('../../../src/data/TournamentDataHooks', () => ({
  useEvents: jest.fn(() => ({ data: [], isLoading: false, isError: false })),
  useEventStatuses: jest.fn(() => ({ data: {}, isLoading: false })),
  useInitializeRound: jest.fn(() => ({ mutate: jest.fn(), isLoading: false })),
  useCreateEvent: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useDeleteEvent: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useRounds: jest.fn(() => ({ data: [], isLoading: false })),
  useFencers: jest.fn(() => ({ data: [], isLoading: false })),
  queryKeys: {
    events: () => ['events'],
    eventStatuses: 'eventStatuses',
    fencers: () => ['fencers'],
    rounds: () => ['rounds'],
  },
}));

// Mock RBAC and navigation context
jest.mock('../../../src/rbac/AbilityContext', () => ({
  useAbility: jest.fn(() => ({ ability: { can: () => true } })),
}));
jest.mock('../../../src/rbac/PermissionsDisplay', () => ({
  PermissionsDisplay: () => null,
}));
jest.mock('../../../src/rbac/Can', () => ({
  Can: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock networking and utils
jest.mock('../../../src/networking/TournamentServer', () => ({
  loadServerInfo: jest.fn(),
  getServerInfo: jest.fn(() => null),
  isServerRunning: jest.fn(() => false),
  startServer: jest.fn(),
  stopServer: jest.fn(),
}));
jest.mock('../../../src/networking/TournamentClient', () => ({
  getClientInfo: jest.fn(() => null),
  isShowingDisconnectAlert: false,
  isConnected: jest.fn(() => false),
  disconnect: jest.fn(),
}));
jest.mock('../../../src/networking/NetworkUtils', () => ({
  getLocalIpAddress: jest.fn(() => Promise.resolve(null)),
  isConnectedToInternet: jest.fn(() => Promise.resolve(false)),
  getNetworkInfo: jest.fn(() => Promise.resolve(null)),
}));
jest.mock('../../../src/networking/components/ConnectionStatusBar', () => () => null);
jest.mock('../../../src/navigation/utils/DENavigationUtil', () => ({
  navigateToDEPage: jest.fn(),
}));

// Mock navigation hook
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

// Wrapper for QueryClientProvider
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('EventManagement', () => {
  it('renders tournament name', () => {
    const { getByText } = render(
      <EventManagement route={{ key: 'test-key', name: 'params', params: { tournamentName: 'Test Tournament' } }} />,
      { wrapper: createWrapper() }
    );
    expect(getByText('Test Tournament')).toBeTruthy();
  });

  it('shows empty state message when no events exist', () => {
    const { getByText } = render(
      <EventManagement route={{ key: 'test-key', name: 'params', params: { tournamentName: 'Test Tournament' } }} />,
      { wrapper: createWrapper() }
    );
    expect(getByText('No events created yet')).toBeTruthy();
  });

  it('renders manage officials button', () => {
    const { getByText } = render(
      <EventManagement route={{ key: 'test-key', name: 'params', params: { tournamentName: 'Test Tournament' } }} />,
      { wrapper: createWrapper() }
    );
    expect(getByText('Manage Officials')).toBeTruthy();
  });
});

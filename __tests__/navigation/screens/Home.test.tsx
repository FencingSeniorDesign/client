// __tests__/navigation/screens/Home.test.tsx
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Home } from '../../../src/navigation/screens/Home';
import tournamentClient from '../../../src/networking/TournamentClient';

// Mock tournamentClient methods
jest.mock('../../../src/networking/TournamentClient', () => ({
  loadClientInfo: jest.fn(),
  getClientInfo: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock TanStack Query hooks
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useQueryClient: () => ({
    invalidateQueries: jest.fn(),
  }),
}));

// Mock Tournament Data Hooks
jest.mock('../../../src/data/TournamentDataHooks', () => ({
  useOngoingTournaments: () => ({
    isLoading: false,
    isError: false,
    data: [],
  }),
  useCompletedTournaments: () => ({
    isLoading: false,
    isError: false,
    data: [],
  }),
}));

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

// Mock vector icons
jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: 'MaterialIcons',
}));

// Mock logo asset
jest.mock('../../../src/assets/logo.png', () => ({}));

// Mock child components used by Home with corrected paths
jest.mock('../../../src/navigation/screens/CreateTournamentModal', () => ({
  CreateTournamentButton: (props: any) => (
    <button onClick={props.onTournamentCreated}>Create Tournament</button>
  ),
}));

jest.mock('../../../src/navigation/screens/TournamentListComponent', () => ({
  TournamentList: (props: any) => <div>{props.tournaments.length} Tournaments</div>,
}));

jest.mock('../../../src/navigation/screens/JoinTournamentModal', () => ({
  JoinTournamentModal: (props: any) =>
    props.visible ? <div data-testid="joinTournamentModal">JoinTournamentModal</div> : null,
}));

describe('Home Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders join tournament button when not connected', async () => {
    (tournamentClient.getClientInfo as jest.Mock).mockReturnValue(null);
    (tournamentClient.loadClientInfo as jest.Mock).mockResolvedValue(undefined);

    const { getByText } = render(<Home />);
    await waitFor(() => {
      expect(getByText('Join Tournament')).toBeTruthy();
    });
  });

  it('displays connected tournament info and disconnects', async () => {
    (tournamentClient.getClientInfo as jest.Mock).mockReturnValue({
      isConnected: true,
      tournamentName: 'Tournament 1',
    });
    (tournamentClient.loadClientInfo as jest.Mock).mockResolvedValue(undefined);

    const { getByText } = render(<Home />);
    await waitFor(() => {
      expect(getByText(/Connected to:/)).toBeTruthy();
    });

    const disconnectButton = getByText('Disconnect');
    expect(disconnectButton).toBeTruthy();

    await act(async () => {
      fireEvent.press(disconnectButton);
    });
    expect(tournamentClient.disconnect).toHaveBeenCalled();
  });

  it('opens join tournament modal when join button is pressed', async () => {
    (tournamentClient.getClientInfo as jest.Mock).mockReturnValue(null);
    (tournamentClient.loadClientInfo as jest.Mock).mockResolvedValue(undefined);

    const { getByText, queryByTestId } = render(<Home />);
    expect(queryByTestId('joinTournamentModal')).toBeNull();

    const joinButton = getByText('Join Tournament');
    await act(async () => {
      fireEvent.press(joinButton);
    });

    await waitFor(() => {
      expect(queryByTestId('joinTournamentModal')).toBeTruthy();
    });
  });
});

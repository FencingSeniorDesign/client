// __tests__/navigation/screens/Home.test.tsx
jest.mock('expo-sqlite/kv-store', () => ({
    __esModule: true,
    default: {
        getItem: jest.fn(() => Promise.resolve(null)),
        setItem: jest.fn(() => Promise.resolve(null)),
        removeItem: jest.fn(() => Promise.resolve(null)),
        clear: jest.fn(() => Promise.resolve(null)),
    },
}));

// Stub out all of react-native-device-info
jest.mock('react-native-device-info', () => ({
    getVersion: jest.fn(() => '1.0.0'),
    getSystemName: jest.fn(() => 'TestOS'),
    getUniqueId: jest.fn(() => 'mock-device-id'),
    // add any other methods your code uses...
}));

// Mock SQLite and database before any other imports
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
        getTournaments: jest.fn(() => []),
        getCompletedTournaments: jest.fn(() => []),
        createTournament: jest.fn(),
        deleteTournament: jest.fn(),
    },
}));

// Mock AbilityContext
jest.mock('../../../src/rbac/AbilityContext', () => ({
    useAbility: () => ({
        setTournamentContext: jest.fn(),
    }),
}));

// __tests__/navigation/screens/Home.test.tsx
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Home } from '../../../src/navigation/screens/Home';
import tournamentClient from '../../../src/networking/TournamentClient';
import { View, Text, TouchableOpacity } from 'react-native';

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
jest.mock('../../../src/navigation/screens/JoinTournamentModal', () => {
    const ReactNative = require('react-native');
    return {
        JoinTournamentModal: ({ visible }: { visible: boolean }) => {
            if (!visible) return null;
            return (
                <ReactNative.View testID="joinTournamentModal">
                    <ReactNative.Text>JoinTournamentModal</ReactNative.Text>
                </ReactNative.View>
            );
        },
    };
});

jest.mock('../../../src/navigation/screens/CreateTournamentModal', () => {
    const ReactNative = require('react-native');
    return {
        CreateTournamentButton: ({ onTournamentCreated }: { onTournamentCreated: () => void }) => (
            <ReactNative.TouchableOpacity onPress={onTournamentCreated}>
                <ReactNative.Text>createTournament</ReactNative.Text>
            </ReactNative.TouchableOpacity>
        ),
    };
});

jest.mock('../../../src/navigation/screens/TournamentListComponent', () => {
    const ReactNative = require('react-native');
    return {
        TournamentList: ({ tournaments }: { tournaments: { id: string; name: string }[] }) => (
            <ReactNative.View>
                <ReactNative.Text>{tournaments.length} Tournaments</ReactNative.Text>
            </ReactNative.View>
        ),
    };
});

describe('Home Screen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders join tournament button when not connected', async () => {
        (tournamentClient.getClientInfo as jest.Mock).mockReturnValue(null);
        (tournamentClient.loadClientInfo as jest.Mock).mockResolvedValue(undefined);

        const { getByText } = render(<Home />);
        await waitFor(() => {
            expect(getByText('joinTournament')).toBeTruthy();
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
            expect(getByText(/connectedTo/)).toBeTruthy();
        });

        const disconnectButton = getByText('disconnect');
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

        const joinButton = getByText('joinTournament');

        await act(async () => {
            fireEvent.press(joinButton);
            // Add a small delay to allow state updates
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        await waitFor(
            () => {
                expect(queryByTestId('joinTournamentModal')).toBeTruthy();
            },
            {
                timeout: 2000, // Increase timeout
                interval: 100, // Check more frequently
            }
        );
    });
});

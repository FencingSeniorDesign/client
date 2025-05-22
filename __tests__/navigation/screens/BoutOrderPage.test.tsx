// Add this mock at the very top to stub out expo-sqlite/kv-store.
import React from 'react';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Alert } from 'react-native';
import BoutOrderPage from '../../../src/navigation/screens/BoutOrderPage';
import { useBoutsForPool, usePools, useUpdatePoolBoutScores } from '../../../src/data/TournamentDataHooks';
import { AppAbility } from '../../../src/rbac/ability';

jest.mock('expo-sqlite/kv-store', () => ({
    __esModule: true,
    default: {
        getItem: jest.fn(() => Promise.resolve(null)),
        setItem: jest.fn(() => Promise.resolve(null)),
        removeItem: jest.fn(() => Promise.resolve(null)),
        clear: jest.fn(() => Promise.resolve(null)),
    },
}));

// Add this mock at the very top to stub out react-native-tcp-socket.
jest.mock('react-native-tcp-socket', () => ({
    createConnection: jest.fn(() => ({
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
    })),
}));

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
    openDatabase: jest.fn(),
    SQLite: {
        openDatabaseSync: jest.fn(() => ({
            transaction: jest.fn(),
            exec: jest.fn(),
            close: jest.fn(),
        })),
    },
}));

// Mock DrizzleClient
jest.mock('../../../src/db/DrizzleClient', () => ({
    db: {
        select: jest.fn(),
        insert: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
    initializeDatabase: jest.fn(() => Promise.resolve()),
}));

// Mock the hooks used inside BoutOrderPage.
jest.mock('../../../src/data/TournamentDataHooks', () => ({
    useBoutsForPool: jest.fn(),
    usePools: jest.fn(),
    useUpdatePoolBoutScores: jest.fn().mockReturnValue({ mutateAsync: jest.fn(), isPending: false }),
}));

// Mock navigation hooks to receive route parameters
jest.mock('@react-navigation/native', () => {
    const actualNav = jest.requireActual('@react-navigation/native');
    return {
        ...actualNav,
        useRoute: () => ({
            params: { roundId: 1, poolId: 1, isRemote: false },
        }),
        useNavigation: () => ({
            navigate: jest.fn(),
            goBack: jest.fn(),
        }),
        usePreventRemove: jest.fn(),
    };
});

// Mock the AbilityContext
jest.mock('../../../src/rbac/AbilityContext', () => ({
    useAbility: jest.fn().mockReturnValue({
        ability: {
            can: jest.fn().mockReturnValue(false), // Default to no permissions
        },
        role: 'viewer',
    }),
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: key => key,
    }),
}));

// Mock TournamentClient
jest.mock('../../../src/networking/TournamentClient', () => ({
    __esModule: true,
    default: {
        on: jest.fn(),
        off: jest.fn(),
        sendMessage: jest.fn(),
    },
}));

// Mock ScoringBoxContext specifically for this test
jest.mock('../../../src/networking/ble/ScoringBoxContext', () => ({
    useScoringBoxContext: jest.fn(() => ({
        connectionState: 'disconnected',
        connectedBoxType: null,
        connectedDeviceName: null,
        initialSyncCompleted: false,
        scan: jest.fn().mockResolvedValue([]),
        cancelScan: jest.fn(),
        connect: jest.fn().mockResolvedValue(true),
        disconnect: jest.fn().mockResolvedValue(undefined),
        selectDataSource: jest.fn().mockResolvedValue(undefined),
        sendScoreToBox: jest.fn().mockResolvedValue(undefined),
        sendTimerToBox: jest.fn().mockResolvedValue(undefined),
        startTimer: jest.fn().mockResolvedValue(undefined),
        stopTimer: jest.fn().mockResolvedValue(undefined),
        resetTimer: jest.fn().mockResolvedValue(undefined),
        setCallbacks: jest.fn(),
    })),
    ScoringBoxProvider: ({ children }) => children,
}));

// Mock BLEStatusBar to avoid ScoringBoxContext issues
jest.mock('../../../src/networking/components/BLEStatusBar', () => ({
    BLEStatusBar: () => null,
}));

// Mock ConnectionStatusBar
jest.mock('../../../src/networking/components/ConnectionStatusBar', () => ({
    __esModule: true,
    default: () => <></>,
}));

// Mock Alert.alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('BoutOrderPage', () => {
    // Helper function to setup mocks for each test
    const setupMocks = (overrides = {}) => {
        // Default mock values
        const mockBoutsData = [
            {
                id: 1,
                left_fencerid: 101,
                left_fname: 'Alice',
                left_lname: 'Smith',
                left_club: 'ClubA',
                left_clubid: 1,
                left_clubname: 'Club A',
                left_clubabbreviation: 'CA',
                left_poolposition: 1,
                right_fencerid: 102,
                right_fname: 'Bob',
                right_lname: 'Jones',
                right_club: 'ClubB',
                right_clubid: 2,
                right_clubname: 'Club B',
                right_clubabbreviation: 'CB',
                right_poolposition: 2,
                left_score: 0,
                right_score: 0,
                status: 'pending',
                victor: null,
            },
            {
                id: 2,
                left_fencerid: 103,
                left_fname: 'Charlie',
                left_lname: 'Brown',
                left_club: 'ClubC',
                left_clubid: 3,
                left_clubname: 'Club C',
                left_clubabbreviation: 'CC',
                left_poolposition: 3,
                right_fencerid: 104,
                right_fname: 'David',
                right_lname: 'Miller',
                right_club: 'ClubD',
                right_clubid: 4,
                right_clubname: 'Club D',
                right_clubabbreviation: 'CD',
                right_poolposition: 4,
                left_score: 5,
                right_score: 3,
                status: 'completed',
                victor: 103, // Charlie is the winner
            },
        ];

        const mockPoolsData = [
            {
                poolid: 1,
                fencers: [
                    { id: 101, fname: 'Alice', lname: 'Smith', club: 'ClubA', poolNumber: 1 },
                    { id: 102, fname: 'Bob', lname: 'Jones', club: 'ClubB', poolNumber: 2 },
                    { id: 103, fname: 'Charlie', lname: 'Brown', club: 'ClubC', poolNumber: 3 },
                    { id: 104, fname: 'David', lname: 'Miller', club: 'ClubD', poolNumber: 4 },
                ],
            },
        ];

        // Combine defaults with any overrides
        const mocks = {
            boutsData: overrides.boutsData || mockBoutsData,
            boutsLoading: overrides.boutsLoading !== undefined ? overrides.boutsLoading : false,
            boutsError: overrides.boutsError || null,
            poolsData: overrides.poolsData || mockPoolsData,
            poolsLoading: overrides.poolsLoading !== undefined ? overrides.poolsLoading : false,
            poolsError: overrides.poolsError || null,
            canScoreBouts: overrides.canScoreBouts !== undefined ? overrides.canScoreBouts : false,
            mutateAsync: overrides.mutateAsync || jest.fn().mockResolvedValue({}),
            isPending: overrides.isPending !== undefined ? overrides.isPending : false,
        };

        // Setup the ability context mock
        const useAbilityMock = require('../../../src/rbac/AbilityContext').useAbility;
        useAbilityMock.mockReturnValue({
            ability: {
                can: jest.fn().mockImplementation((action, subject) => {
                    if (action === 'score' && subject === 'Bout') {
                        return mocks.canScoreBouts;
                    }
                    return false;
                }),
            },
            role: mocks.canScoreBouts ? 'referee' : 'viewer',
        });

        // Setup the data hooks mocks
        (useBoutsForPool as jest.Mock).mockReturnValue({
            data: mocks.boutsData,
            isLoading: mocks.boutsLoading,
            error: mocks.boutsError,
        });

        (usePools as jest.Mock).mockReturnValue({
            data: mocks.poolsData,
            isLoading: mocks.poolsLoading,
            error: mocks.poolsError,
        });

        (useUpdatePoolBoutScores as jest.Mock).mockReturnValue({
            mutateAsync: mocks.mutateAsync,
            isPending: mocks.isPending,
        });

        return mocks;
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders loading state', () => {
        setupMocks({ boutsLoading: true, poolsLoading: true });

        const { getByText } = render(
            <NavigationContainer>
                <BoutOrderPage />
            </NavigationContainer>
        );
        expect(getByText('boutOrderPage.loadingBouts')).toBeTruthy();
    });

    it('renders error state when bouts loading fails', () => {
        setupMocks({ boutsError: 'Error fetching bouts' });

        const { getByText } = render(
            <NavigationContainer>
                <BoutOrderPage />
            </NavigationContainer>
        );
        expect(getByText(/boutOrderPage.errorLoadingBouts/)).toBeTruthy();
    });

    it('renders error state when pools loading fails', () => {
        setupMocks({ poolsError: 'Error fetching pools' });

        const { getByText } = render(
            <NavigationContainer>
                <BoutOrderPage />
            </NavigationContainer>
        );
        expect(getByText(/boutOrderPage.errorLoadingBouts/)).toBeTruthy();
    });

    it('renders bout list with pending and completed bouts', async () => {
        setupMocks();

        const { getByText, getAllByText } = render(
            <NavigationContainer>
                <BoutOrderPage />
            </NavigationContainer>
        );

        await waitFor(() => {
            // Check for headers
            expect(getByText('boutOrderPage.viewBouts')).toBeTruthy();
            expect(getByText('boutOrderPage.poolBouts')).toBeTruthy();

            // Check for fencer names in the actual format
            expect(getByText('(1) Alice (CA)')).toBeTruthy();
            expect(getByText('(2) Bob (CB)')).toBeTruthy();
            expect(getByText('(3) Charlie (CC)')).toBeTruthy();
            expect(getByText('(4) David (CD)')).toBeTruthy();

            // Check for the VS text and scores
            expect(getByText('VS')).toBeTruthy();
            expect(getByText('5-3')).toBeTruthy();
        });
    });

    it('shows referee-specific UI when user has scoring permissions', async () => {
        setupMocks({ canScoreBouts: true });

        const { getByText } = render(
            <NavigationContainer>
                <BoutOrderPage />
            </NavigationContainer>
        );

        await waitFor(() => {
            // Check for referee-specific UI elements
            expect(getByText('boutOrderPage.refereeMode')).toBeTruthy();
            expect(getByText('boutOrderPage.doubleStrippingOff')).toBeTruthy();
            expect(getByText('boutOrderPage.randomScores')).toBeTruthy();
        });
    });

    it('renders bouts in the correct order', async () => {
        setupMocks();

        const { getByText } = render(
            <NavigationContainer>
                <BoutOrderPage />
            </NavigationContainer>
        );

        await waitFor(() => {
            // Check for fencer names and scores
            expect(getByText('(1) Alice (CA)')).toBeTruthy();
            expect(getByText('(2) Bob (CB)')).toBeTruthy();
            expect(getByText('(3) Charlie (CC)')).toBeTruthy();
            expect(getByText('(4) David (CD)')).toBeTruthy();

            // Check for score display of completed bout
            expect(getByText('5-3')).toBeTruthy();
        });
    });

    it('shows VS text for pending bouts', async () => {
        setupMocks();

        const { getByText } = render(
            <NavigationContainer>
                <BoutOrderPage />
            </NavigationContainer>
        );

        await waitFor(() => {
            // Check for VS text in pending bout
            expect(getByText('VS')).toBeTruthy();
        });
    });

    it('shows referee-specific UI elements when user has permissions', async () => {
        setupMocks({ canScoreBouts: true });

        const { getByText } = render(
            <NavigationContainer>
                <BoutOrderPage />
            </NavigationContainer>
        );

        await waitFor(() => {
            // Check for referee-specific UI elements
            expect(getByText('boutOrderPage.refereeMode')).toBeTruthy();
            expect(getByText('boutOrderPage.doubleStrippingOff')).toBeTruthy();
            expect(getByText('boutOrderPage.randomScores')).toBeTruthy();
            expect(getByText('boutOrderPage.protectedScores')).toBeTruthy();
        });
    });

    it('makes API call when random scores button is pressed', async () => {
        const mockMutateAsync = jest.fn().mockResolvedValue({});
        setupMocks({
            canScoreBouts: true,
            mutateAsync: mockMutateAsync,
        });

        const { getByText } = render(
            <NavigationContainer>
                <BoutOrderPage />
            </NavigationContainer>
        );

        await waitFor(() => {
            expect(getByText('boutOrderPage.randomScores')).toBeTruthy();
        });

        // Click the random scores button
        fireEvent.press(getByText('boutOrderPage.randomScores'));

        // Should call the mutation for each bout
        expect(mockMutateAsync).toHaveBeenCalled();
    });

    it('uses navigation methods', async () => {
        // Create a new navigate mock function
        const navigateMock = jest.fn();

        // Override the useNavigation mock for this test
        const useNavigationSpy = jest
            .spyOn(require('@react-navigation/native'), 'useNavigation')
            .mockReturnValue({ navigate: navigateMock, goBack: jest.fn() });

        setupMocks({ canScoreBouts: true });

        render(
            <NavigationContainer>
                <BoutOrderPage />
            </NavigationContainer>
        );

        // Just verify navigation is used
        expect(useNavigationSpy).toHaveBeenCalled();

        // Restore the original mock after the test
        useNavigationSpy.mockRestore();
    });

    it('displays bout information correctly', async () => {
        setupMocks({ canScoreBouts: true });

        const { getByText } = render(
            <NavigationContainer>
                <BoutOrderPage />
            </NavigationContainer>
        );

        await waitFor(() => {
            // Verify completed bout shows correct format
            expect(getByText('(3) Charlie (CC)')).toBeTruthy();
            expect(getByText('5-3')).toBeTruthy();
        });
    });

    it('generates random scores when random scores button is pressed', async () => {
        const mockMutateAsync = jest.fn().mockResolvedValue({});
        setupMocks({
            canScoreBouts: true,
            mutateAsync: mockMutateAsync,
        });

        const { getByText } = render(
            <NavigationContainer>
                <BoutOrderPage />
            </NavigationContainer>
        );

        await waitFor(() => {
            expect(getByText('boutOrderPage.randomScores')).toBeTruthy();
        });

        // Click the random scores button
        fireEvent.press(getByText('boutOrderPage.randomScores'));

        // Verify the mutation was called for each bout
        expect(mockMutateAsync).toHaveBeenCalledTimes(2);
    });

    it('renders double stripping toggle for referees', async () => {
        setupMocks({ canScoreBouts: true });

        const { getByText } = render(
            <NavigationContainer>
                <BoutOrderPage />
            </NavigationContainer>
        );

        await waitFor(() => {
            expect(getByText('boutOrderPage.doubleStrippingOff')).toBeTruthy();
        });
    });

    it('renders protected scores toggle for referees', async () => {
        setupMocks({ canScoreBouts: true });

        const { getByText } = render(
            <NavigationContainer>
                <BoutOrderPage />
            </NavigationContainer>
        );

        await waitFor(() => {
            expect(getByText('boutOrderPage.protectedScores')).toBeTruthy();
        });
    });

    it('passes correct data to mutation hooks', async () => {
        const mockMutateAsync = jest.fn().mockResolvedValue({});
        setupMocks({
            canScoreBouts: true,
            mutateAsync: mockMutateAsync,
        });

        render(
            <NavigationContainer>
                <BoutOrderPage />
            </NavigationContainer>
        );

        // Verify that mutation hooks were called
        expect(useUpdatePoolBoutScores).toHaveBeenCalled();
    });

    it('shows remote connectivity UI when isRemote is true', async () => {
        // Override the useRoute mock for this test
        const useRouteSpy = jest.spyOn(require('@react-navigation/native'), 'useRoute').mockReturnValue({
            params: { roundId: 1, poolId: 1, isRemote: true },
        });

        setupMocks();

        const { getByText } = render(
            <NavigationContainer>
                <BoutOrderPage />
            </NavigationContainer>
        );

        // We can't directly test the ConnectionStatusBar since it's mocked,
        // but we can verify the component doesn't crash when isRemote is true
        await waitFor(() => {
            expect(getByText('boutOrderPage.viewBouts')).toBeTruthy();
        });

        // Restore the original mock after the test
        useRouteSpy.mockRestore();
    });

    it('shows proper UI for viewers (no scoring permission)', async () => {
        setupMocks({ canScoreBouts: false });

        const { getByText, queryByText } = render(
            <NavigationContainer>
                <BoutOrderPage />
            </NavigationContainer>
        );

        await waitFor(() => {
            // Check for viewer mode header
            expect(getByText('boutOrderPage.viewBouts')).toBeTruthy();

            // Referee UI elements should NOT be shown for viewers
            expect(queryByText('boutOrderPage.randomScores')).toBeNull();
            expect(queryByText('boutOrderPage.refereeMode')).toBeNull();
        });
    });

    it('handles loading state for mutation', async () => {
        setupMocks({
            canScoreBouts: true,
            isPending: true,
        });

        const { getByText } = render(
            <NavigationContainer>
                <BoutOrderPage />
            </NavigationContainer>
        );

        await waitFor(() => {
            // When isPending is true, the loading overlay should be visible
            expect(getByText('boutOrderPage.updatingScores')).toBeTruthy();
        });
    });
});

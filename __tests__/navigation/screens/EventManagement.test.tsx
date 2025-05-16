// EventManagement.test.tsx

// Mock expo-sqlite before any imports
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EventManagement } from '../../../src/navigation/screens/EventManagement';
import dataProvider from '../../../src/data/DrizzleDataProvider';
import tournamentServer from '../../../src/networking/TournamentServer';
import tournamentClient from '../../../src/networking/TournamentClient';
import { getLocalIpAddress } from '../../../src/networking/NetworkUtils';

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
        getRounds: jest.fn(() => []),
        getFencers: jest.fn(() => []),
        initializeRound: jest.fn(() => true),
    },
}));

// Mock data hooks
const mockUseEvents = jest.fn(() => ({ data: [], isLoading: false, isError: false }));
const mockUseEventStatuses = jest.fn(() => ({ data: {}, isLoading: false }));
const mockUseInitializeRound = jest.fn(() => ({ mutateAsync: jest.fn().mockResolvedValue(true), isLoading: false }));
const mockUseCreateEvent = jest.fn(() => ({ mutate: jest.fn(), isPending: false }));
const mockUseDeleteEvent = jest.fn(() => ({ mutate: jest.fn(), isPending: false }));
const mockUseRounds = jest.fn(() => ({ data: [], isLoading: false }));
const mockUseFencers = jest.fn(() => ({ data: [], isLoading: false }));

jest.mock('../../../src/data/TournamentDataHooks', () => ({
    useEvents: jest.fn(() => mockUseEvents()),
    useEventStatuses: jest.fn(() => mockUseEventStatuses()),
    useInitializeRound: jest.fn(() => mockUseInitializeRound()),
    useCreateEvent: jest.fn(() => mockUseCreateEvent()),
    useDeleteEvent: jest.fn(() => mockUseDeleteEvent()),
    useRounds: jest.fn(() => mockUseRounds()),
    useFencers: jest.fn(() => mockUseFencers()),
    queryKeys: {
        events: jest.fn().mockReturnValue(['events']),
        eventStatuses: 'eventStatuses',
        fencers: jest.fn().mockReturnValue(['fencers']),
        rounds: jest.fn().mockReturnValue(['rounds']),
    },
}));

// Mock RBAC and navigation context
const mockAbilityCan = jest.fn(() => true);
jest.mock('../../../src/rbac/AbilityContext', () => ({
    useAbility: jest.fn(() => ({ ability: { can: (...args) => mockAbilityCan(...args) } })),
}));
jest.mock('../../../src/rbac/PermissionsDisplay', () => ({
    PermissionsDisplay: () => null,
}));
jest.mock('../../../src/rbac/Can', () => ({
    Can: ({ children, I, a }) => {
        if (mockAbilityCan(I, a)) {
            return <>{children}</>;
        }
        return null;
    },
}));

// Mock navigation and navigation hooks
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
    useFocusEffect: jest.fn(),
    RouteProp: jest.fn(),
}));

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
    // If there are buttons and the last one has an onPress callback, simulate pressing it
    if (buttons && buttons.length > 0 && buttons[buttons.length - 1].onPress) {
        buttons[buttons.length - 1].onPress();
    }
});

// Mock networking and utils
jest.mock('../../../src/networking/TournamentServer', () => ({
    loadServerInfo: jest.fn().mockResolvedValue(undefined),
    getServerInfo: jest.fn(() => null),
    isServerRunning: jest.fn(() => false),
    startServer: jest.fn().mockResolvedValue(true),
    stopServer: jest.fn().mockResolvedValue(true),
    default: {
        loadServerInfo: jest.fn().mockResolvedValue(undefined),
        getServerInfo: jest.fn(() => null),
        isServerRunning: jest.fn(() => false),
        startServer: jest.fn().mockResolvedValue(true),
        stopServer: jest.fn().mockResolvedValue(true),
    },
}));
jest.mock('../../../src/networking/TournamentClient', () => ({
    getClientInfo: jest.fn(() => null),
    isShowingDisconnectAlert: false,
    isConnected: jest.fn(() => false),
    disconnect: jest.fn().mockResolvedValue(undefined),
    sendMessage: jest.fn(),
    default: {
        getClientInfo: jest.fn(() => null),
        isShowingDisconnectAlert: false,
        isConnected: jest.fn(() => false),
        disconnect: jest.fn().mockResolvedValue(undefined),
        sendMessage: jest.fn(),
    },
}));
jest.mock('../../../src/networking/NetworkUtils', () => ({
    getLocalIpAddress: jest.fn(() => Promise.resolve('192.168.1.100')),
    isConnectedToInternet: jest.fn(() => Promise.resolve(true)),
    getNetworkInfo: jest.fn(() => Promise.resolve({ type: 'wifi' })),
}));
jest.mock('../../../src/networking/components/ConnectionStatusBar', () => () => null);
jest.mock('../../../src/navigation/utils/DENavigationUtil', () => ({
    navigateToDEPage: jest.fn(),
}));

// Mock BackHandler
jest.mock('react-native', () => {
    const reactNative = jest.requireActual('react-native');
    reactNative.BackHandler = {
        addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    };
    return reactNative;
});

// Mock i18n
jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: key => key }),
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
    beforeEach(() => {
        jest.clearAllMocks();
        mockUseEvents.mockReturnValue({ data: [], isLoading: false, isError: false });
        mockUseEventStatuses.mockReturnValue({ data: {}, isLoading: false });
        mockAbilityCan.mockReturnValue(true);
    });

    it('renders tournament name', () => {
        const { getByText } = render(
            <EventManagement
                route={{ key: 'test-key', name: 'params', params: { tournamentName: 'Test Tournament' } }}
            />,
            { wrapper: createWrapper() }
        );
        expect(getByText('Test Tournament')).toBeTruthy();
    });

    it('shows empty state message when no events exist', () => {
        const { getByText } = render(
            <EventManagement
                route={{ key: 'test-key', name: 'params', params: { tournamentName: 'Test Tournament' } }}
            />,
            { wrapper: createWrapper() }
        );
        expect(getByText('eventManagement.noEvents')).toBeTruthy();
    });

    it('renders manage officials button when user has permissions', () => {
        const { getByText } = render(
            <EventManagement
                route={{ key: 'test-key', name: 'params', params: { tournamentName: 'Test Tournament' } }}
            />,
            { wrapper: createWrapper() }
        );
        expect(getByText('eventManagement.manageOfficials')).toBeTruthy();
    });

    it('does not render manage officials button when user lacks permissions', () => {
        mockAbilityCan.mockImplementation((action, subject) => {
            if (action === 'manage' && subject === 'Official') return false;
            return true;
        });

        const { queryByText } = render(
            <EventManagement
                route={{ key: 'test-key', name: 'params', params: { tournamentName: 'Test Tournament' } }}
            />,
            { wrapper: createWrapper() }
        );
        expect(queryByText('eventManagement.manageOfficials')).toBeNull();
    });

    it('renders create event button when user has permissions', () => {
        const { getByText } = render(
            <EventManagement
                route={{ key: 'test-key', name: 'params', params: { tournamentName: 'Test Tournament' } }}
            />,
            { wrapper: createWrapper() }
        );
        expect(getByText('eventManagement.createEvent')).toBeTruthy();
    });

    it('does not render create event button when user lacks permissions', () => {
        mockAbilityCan.mockImplementation((action, subject) => {
            if (action === 'create' && subject === 'Event') return false;
            return true;
        });

        const { queryByText } = render(
            <EventManagement
                route={{ key: 'test-key', name: 'params', params: { tournamentName: 'Test Tournament' } }}
            />,
            { wrapper: createWrapper() }
        );
        expect(queryByText('eventManagement.createEvent')).toBeNull();
    });

    it('renders events when they exist', () => {
        const mockEvents = [
            { id: 1, weapon: 'Foil', gender: 'Mixed', age: 'Senior' },
            { id: 2, weapon: 'Epee', gender: 'Mens', age: 'Veteran' },
        ];

        mockUseEvents.mockReturnValue({ data: mockEvents, isLoading: false, isError: false });

        const { getByText, queryByText } = render(
            <EventManagement
                route={{ key: 'test-key', name: 'params', params: { tournamentName: 'Test Tournament' } }}
            />,
            { wrapper: createWrapper() }
        );

        expect(queryByText('eventManagement.noEvents')).toBeNull();
        expect(getByText('Senior Mixed Foil')).toBeTruthy();
        expect(getByText('Veteran Mens Epee')).toBeTruthy();
    });

    it('shows loading indicator when events are loading', () => {
        mockUseEvents.mockReturnValue({ data: undefined, isLoading: true, isError: false });

        const { getByText } = render(
            <EventManagement
                route={{ key: 'test-key', name: 'params', params: { tournamentName: 'Test Tournament' } }}
            />,
            { wrapper: createWrapper() }
        );

        expect(getByText('common.loading')).toBeTruthy();
    });

    it('shows error message when events loading fails', () => {
        mockUseEvents.mockReturnValue({ data: undefined, isLoading: false, isError: true });

        const { getByText } = render(
            <EventManagement
                route={{ key: 'test-key', name: 'params', params: { tournamentName: 'Test Tournament' } }}
            />,
            { wrapper: createWrapper() }
        );

        expect(getByText('eventManagement.errorLoading')).toBeTruthy();
    });

    it('opens create event modal when button is clicked', () => {
        const { getByText, getAllByText } = render(
            <EventManagement
                route={{ key: 'test-key', name: 'params', params: { tournamentName: 'Test Tournament' } }}
            />,
            { wrapper: createWrapper() }
        );

        // Find the Create Event button (not the modal title) and press it
        const createEventButton = getByText('eventManagement.createEvent');
        fireEvent.press(createEventButton);

        // After pressing button, modal should be visible
        // There will be multiple elements with eventManagement.createEvent text (button + modal title)
        expect(getAllByText('eventManagement.createEvent').length).toBeGreaterThan(1);
        expect(getByText('common.submit')).toBeTruthy();
        expect(getByText('common.cancel')).toBeTruthy();
    });

    it('navigates to event settings when edit button is pressed', () => {
        const mockEvents = [{ id: 1, weapon: 'Foil', gender: 'Mixed', age: 'Senior' }];

        mockUseEvents.mockReturnValue({ data: mockEvents, isLoading: false, isError: false });
        mockUseEventStatuses.mockReturnValue({ data: { 1: false }, isLoading: false });

        const { getAllByText } = render(
            <EventManagement
                route={{ key: 'test-key', name: 'params', params: { tournamentName: 'Test Tournament' } }}
            />,
            { wrapper: createWrapper() }
        );

        // Find the Edit button for the event and press it
        fireEvent.press(getAllByText('Edit')[0]);

        expect(mockNavigate).toHaveBeenCalledWith('EventSettings', {
            event: mockEvents[0],
            onSave: expect.any(Function),
            isRemote: false,
        });
    });

    it('handles remote connection mode properly', async () => {
        tournamentClient.getClientInfo = jest.fn().mockReturnValue({
            tournamentName: 'Remote Tournament',
            hostIp: '192.168.1.200',
            port: 9001,
        });
        tournamentClient.isConnected = jest.fn().mockReturnValue(true);

        const { getByText } = render(
            <EventManagement
                route={{
                    key: 'test-key',
                    name: 'params',
                    params: { tournamentName: 'Local Name', isRemoteConnection: true },
                }}
            />,
            { wrapper: createWrapper() }
        );

        // Wait for remote connection info to be processed
        await waitFor(() => {
            expect(getByText('Remote Tournament')).toBeTruthy();
            expect(getByText('Connected to remote tournament')).toBeTruthy();
            expect(getByText('Host: 192.168.1.200')).toBeTruthy();
            expect(getByText('Disconnect')).toBeTruthy();
        });

        // Verify client sent appropriate message
        expect(tournamentClient.sendMessage).toHaveBeenCalledWith({
            type: 'get_events',
        });
    });

    it('shows server controls when in local mode', async () => {
        // Mock server as not running
        tournamentServer.isServerRunning = jest.fn().mockReturnValue(false);

        const { getByText } = render(
            <EventManagement
                route={{ key: 'test-key', name: 'params', params: { tournamentName: 'Test Tournament' } }}
            />,
            { wrapper: createWrapper() }
        );

        // Should show button to enable server
        expect(getByText('Enable Server')).toBeTruthy();

        // Press button to enable server
        fireEvent.press(getByText('Enable Server'));

        // Mock server as running after button press
        tournamentServer.isServerRunning = jest.fn().mockReturnValue(true);
        tournamentServer.getServerInfo = jest.fn().mockReturnValue({
            hostIp: '0.0.0.0',
            port: 9001,
        });

        // Check that the server start method was called
        await waitFor(() => {
            expect(tournamentServer.startServer).toHaveBeenCalled();
        });
    });

    it('confirms and deletes an event when delete button is pressed', () => {
        // Mock ability to make sure delete permission is granted
        mockAbilityCan.mockImplementation((action, subject) => {
            return true;
        });

        // Setup mock event
        const mockEvents = [{ id: 1, weapon: 'Foil', gender: 'Mixed', age: 'Senior' }];

        mockUseEvents.mockReturnValue({ data: mockEvents, isLoading: false, isError: false });

        const mockDeleteMutate = jest.fn();
        mockUseDeleteEvent.mockReturnValue({ mutate: mockDeleteMutate, isPending: false });

        // Render component with mock event
        const { getByText } = render(
            <EventManagement
                route={{ key: 'test-key', name: 'params', params: { tournamentName: 'Test Tournament' } }}
            />,
            { wrapper: createWrapper() }
        );

        // Find and press the remove icon (typically an X or ✖)
        const removeButton = getByText('✖');
        fireEvent.press(removeButton);

        // Alert should be shown and confirmed automatically because of our Alert mock
        expect(Alert.alert).toHaveBeenCalledWith(
            'eventManagement.confirmDelete',
            'eventManagement.confirmDeleteMessage',
            expect.arrayContaining([
                expect.objectContaining({ text: 'common.cancel' }),
                expect.objectContaining({ text: 'common.confirm', onPress: expect.any(Function) }),
            ]),
            expect.objectContaining({ cancelable: true })
        );

        // The delete mutation should be called with the event ID
        expect(mockDeleteMutate).toHaveBeenCalledWith(1);
    });

    it('shows start event confirmation when start button is pressed', async () => {
        // Setup mock event with status not started
        const mockEvents = [{ id: 1, weapon: 'Foil', gender: 'Mixed', age: 'Senior' }];

        mockUseEvents.mockReturnValue({ data: mockEvents, isLoading: false, isError: false });
        mockUseEventStatuses.mockReturnValue({ data: { 1: false }, isLoading: false });

        // Mock ability to ensure user has permission
        mockAbilityCan.mockImplementation((action, subject) => {
            return true;
        });

        // Render component
        const { getAllByText } = render(
            <EventManagement
                route={{ key: 'test-key', name: 'params', params: { tournamentName: 'Test Tournament' } }}
            />,
            { wrapper: createWrapper() }
        );

        // Find and press the start button
        const startButton = getAllByText('eventManagement.start')[0];
        fireEvent.press(startButton);

        // Alert should be shown and confirmed
        expect(Alert.alert).toHaveBeenCalledWith(
            'eventManagement.confirmStart',
            'eventManagement.confirmStartMessage',
            expect.arrayContaining([
                expect.objectContaining({ text: 'common.cancel' }),
                expect.objectContaining({ text: 'common.confirm', onPress: expect.any(Function) }),
            ]),
            expect.objectContaining({ cancelable: true })
        );
    });

    it('submits event creation form correctly', async () => {
        const mockCreateMutate = jest.fn();
        mockUseCreateEvent.mockReturnValue({ mutate: mockCreateMutate, isPending: false });

        const { getByText } = render(
            <EventManagement
                route={{ key: 'test-key', name: 'params', params: { tournamentName: 'Test Tournament' } }}
            />,
            { wrapper: createWrapper() }
        );

        // Open create event modal
        fireEvent.press(getByText('eventManagement.createEvent'));

        // Select options (using default values as set in component)
        // Could also test selecting different options if needed

        // Submit the form
        fireEvent.press(getByText('common.submit'));

        // Check that create mutation was called with correct params
        expect(mockCreateMutate).toHaveBeenCalledWith({
            tournamentName: 'Test Tournament',
            event: {
                weapon: 'Foil',
                gender: 'Mixed',
                age: 'Senior',
            },
        });
    });

    it('shows disconnect confirmation dialog', async () => {
        // Setup mock for remote connection
        tournamentClient.getClientInfo = jest.fn().mockReturnValue({
            tournamentName: 'Remote Tournament',
            hostIp: '192.168.1.200',
            port: 9001,
        });
        tournamentClient.isConnected = jest.fn().mockReturnValue(true);

        const { getByText } = render(
            <EventManagement
                route={{
                    key: 'test-key',
                    name: 'params',
                    params: { tournamentName: 'Local Name', isRemoteConnection: true },
                }}
            />,
            { wrapper: createWrapper() }
        );

        // Wait for remote connection info to be processed
        await waitFor(() => {
            expect(getByText('Disconnect')).toBeTruthy();
        });

        // Press disconnect button
        fireEvent.press(getByText('Disconnect'));

        // Alert should be shown
        expect(Alert.alert).toHaveBeenCalledWith(
            'Disconnect from Tournament',
            'Are you sure you want to disconnect from this tournament?',
            expect.arrayContaining([
                expect.objectContaining({ text: 'Cancel' }),
                expect.objectContaining({
                    text: 'Disconnect',
                    style: 'destructive',
                    onPress: expect.any(Function),
                }),
            ])
        );
    });

    it('tests server stopping when it is running', async () => {
        // Mock server as running
        tournamentServer.isServerRunning = jest.fn().mockReturnValue(true);
        tournamentServer.getServerInfo = jest.fn().mockReturnValue({
            hostIp: '0.0.0.0',
            port: 9001,
        });

        // Mock network info
        getLocalIpAddress.mockResolvedValue('192.168.1.100');

        const { getByText } = render(
            <EventManagement
                route={{ key: 'test-key', name: 'params', params: { tournamentName: 'Test Tournament' } }}
            />,
            { wrapper: createWrapper() }
        );

        // Wait for server info to be processed
        await waitFor(() => {
            expect(getByText('Disable Server')).toBeTruthy();
        });

        // Press button to disable server
        fireEvent.press(getByText('Disable Server'));

        // Check that stop server was called
        await waitFor(() => {
            expect(tournamentServer.stopServer).toHaveBeenCalled();
        });
    });

    it('tests navigation to manage officials page', () => {
        // Setup mock navigation
        const { getByText } = render(
            <EventManagement
                route={{ key: 'test-key', name: 'params', params: { tournamentName: 'Test Tournament' } }}
            />,
            { wrapper: createWrapper() }
        );

        // Find and press the manage officials button
        const manageOfficialsButton = getByText('eventManagement.manageOfficials');
        fireEvent.press(manageOfficialsButton);

        // Check that navigate was called with correct parameters
        expect(mockNavigate).toHaveBeenCalledWith('ManageOfficials', {
            tournamentName: 'Test Tournament',
            isRemote: false,
        });
    });

    it('tests server operations error handling', async () => {
        // Mock to simulate network connectivity check failure
        const isConnectedMock = require('../../../src/networking/NetworkUtils').isConnectedToInternet;
        isConnectedMock.mockRejectedValueOnce(new Error('Network check failed'));

        // Render component
        const { getByText } = render(
            <EventManagement
                route={{ key: 'test-key', name: 'params', params: { tournamentName: 'Test Tournament' } }}
            />,
            { wrapper: createWrapper() }
        );

        // Press button to enable server
        fireEvent.press(getByText('Enable Server'));

        // Await the network check error to be caught
        await waitFor(() => {
            // The checkNetworkConnectivity method should catch the error and set isNetworkConnected to false
            expect(isConnectedMock).toHaveBeenCalled();
        });
    });

    it('simulates tournament event cancel form', () => {
        // Render component with modal control
        const { getByText } = render(
            <EventManagement
                route={{ key: 'test-key', name: 'params', params: { tournamentName: 'Test Tournament' } }}
            />,
            { wrapper: createWrapper() }
        );

        // Open create event modal
        fireEvent.press(getByText('eventManagement.createEvent'));

        // Press cancel button
        fireEvent.press(getByText('common.cancel'));

        // Modal should be dismissed
        // Since this is mostly a UI test, we don't have a great way to assert this
        // without querying modal visibility directly, but we can at least verify
        // the code paths are executed and don't throw exceptions
    });
});

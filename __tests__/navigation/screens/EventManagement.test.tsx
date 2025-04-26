import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { EventManagement } from '../../../src/navigation/screens/EventManagement';
import { useEvents, useEventStatuses } from '../../../src/data/TournamentDataHooks';
import tournamentServer from '../../../src/networking/TournamentServer';
import tournamentClient from '../../../src/networking/TournamentClient';
import { getLocalIpAddress } from '../../../src/networking/NetworkUtils';
import { useAbility } from '../../../src/rbac/AbilityContext';

// Mock the hooks and modules
jest.mock('../../../src/data/TournamentDataHooks');
jest.mock('../../../src/networking/TournamentServer');
jest.mock('../../../src/networking/TournamentClient');
jest.mock('../../../src/networking/NetworkUtils');
jest.mock('../../../src/rbac/AbilityContext');

// Mock navigation
jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({
        navigate: jest.fn(),
        goBack: jest.fn(),
    }),
    useRoute: () => ({
        params: {
            tournamentName: 'Test Tournament',
            isRemoteConnection: false,
        },
    }),
}));

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// Define the route type
type EventManagementRouteParams = {
    params: {
        tournamentName: string;
        isRemoteConnection?: boolean;
    };
};

// Create a mock route object that matches RouteProp type
const createMockRoute = (params: EventManagementRouteParams['params']): RouteProp<EventManagementRouteParams, 'params'> => ({
    key: 'test-key',
    name: 'params',
    params,
});

describe('EventManagement', () => {
    const mockEvents = [
        {
            id: 1,
            weapon: 'Foil',
            gender: 'Mixed',
            age: 'Senior',
        },
    ];

    const mockEventStatuses = {
        1: true, // Event 1 is started
    };

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock hook returns
        (useEvents as jest.Mock).mockReturnValue({
            data: mockEvents,
            isLoading: false,
            isError: false,
        });

        (useEventStatuses as jest.Mock).mockReturnValue({
            data: mockEventStatuses,
            isLoading: false,
        });

        // Mock ability context
        (useAbility as jest.Mock).mockReturnValue({
            ability: {
                can: jest.fn().mockReturnValue(true),
            },
        });

        // Mock network utilities
        (getLocalIpAddress as jest.Mock).mockResolvedValue('192.168.1.100');
    });

    it('renders event management screen', async () => {
        const mockRoute = createMockRoute({ tournamentName: 'Test Tournament' });
        const { getByText } = render(<EventManagement route={mockRoute} />);
        
        await waitFor(() => {
            expect(getByText('Test Tournament')).toBeTruthy();
            expect(getByText('Create Event')).toBeTruthy();
        });
    });

    it('displays list of events', async () => {
        const mockRoute = createMockRoute({ tournamentName: 'Test Tournament' });
        const { getByText } = render(<EventManagement route={mockRoute} />);
        
        await waitFor(() => {
            expect(getByText('Senior Mixed Foil')).toBeTruthy();
        });
    });

    it('opens create event modal when create button is pressed', async () => {
        const mockRoute = createMockRoute({ tournamentName: 'Test Tournament' });
        const { getByText } = render(<EventManagement route={mockRoute} />);
        
        fireEvent.press(getByText('Create Event'));
        
        await waitFor(() => {
            expect(getByText('Create Event')).toBeTruthy();
            expect(getByText('Foil')).toBeTruthy();
            expect(getByText('Mixed')).toBeTruthy();
            expect(getByText('Senior')).toBeTruthy();
        });
    });

    it('handles server toggle', async () => {
        const mockRoute = createMockRoute({ tournamentName: 'Test Tournament' });
        const { getByText } = render(<EventManagement route={mockRoute} />);
        
        const serverButton = getByText('Enable Server');
        await act(async () => {
            fireEvent.press(serverButton);
        });

        expect(tournamentServer.startServer).toHaveBeenCalled();
    });

    it('handles remote connection mode', async () => {
        (tournamentClient.getClientInfo as jest.Mock).mockReturnValue({
            tournamentName: 'Remote Tournament',
            hostIp: '192.168.1.101',
            port: 9001,
        });

        const mockRoute = createMockRoute({
            tournamentName: 'Test Tournament',
            isRemoteConnection: true
        });
        
        const { getByText } = render(<EventManagement route={mockRoute} />);
        
        await waitFor(() => {
            expect(getByText('Connected to remote tournament')).toBeTruthy();
            expect(getByText('Host: 192.168.1.101')).toBeTruthy();
        });
    });

    it('confirms event deletion', async () => {
        const mockRoute = createMockRoute({ tournamentName: 'Test Tournament' });
        const { getByText } = render(<EventManagement route={mockRoute} />);
        
        const removeButtons = document.querySelectorAll('✖');
        fireEvent.press(removeButtons[0]);

        expect(Alert.alert).toHaveBeenCalledWith(
            'Confirm Delete',
            'Are you sure you want to delete this event?',
            expect.any(Array)
        );
    });

    it('navigates to event settings', async () => {
        const mockRoute = createMockRoute({ tournamentName: 'Test Tournament' });
        const navigation = require('@react-navigation/native').useNavigation();
        const { getAllByText } = render(<EventManagement route={mockRoute} />);
        
        const editButtons = getAllByText('Edit');
        fireEvent.press(editButtons[0]);

        expect(navigation.navigate).toHaveBeenCalledWith('EventSettings', expect.any(Object));
    });

    it('handles start/open event based on status', async () => {
        const mockRoute = createMockRoute({ tournamentName: 'Test Tournament' });
        const navigation = require('@react-navigation/native').useNavigation();
        const { getAllByText } = render(<EventManagement route={mockRoute} />);
        
        // Event is started, should show "Open"
        const openButtons = getAllByText('Open');
        fireEvent.press(openButtons[0]);

        expect(navigation.navigate).toHaveBeenCalled();
    });

    it('shows loading state while fetching events', async () => {
        const mockRoute = createMockRoute({ tournamentName: 'Test Tournament' });
        (useEvents as jest.Mock).mockReturnValue({
            data: [],
            isLoading: true,
            isError: false,
        });

        const { getByText } = render(<EventManagement route={mockRoute} />);
        
        expect(getByText('Loading events...')).toBeTruthy();
    });

    it('shows error state when fetching events fails', async () => {
        const mockRoute = createMockRoute({ tournamentName: 'Test Tournament' });
        (useEvents as jest.Mock).mockReturnValue({
            data: [],
            isLoading: false,
            isError: true,
        });

        const { getByText } = render(<EventManagement route={mockRoute} />);
        
        expect(getByText('Error loading events. Please try again.')).toBeTruthy();
    });

    it('handles disconnection in remote mode', async () => {
        const mockRoute = createMockRoute({
            tournamentName: 'Test Tournament',
            isRemoteConnection: true
        });
        
        const { getByText } = render(<EventManagement route={mockRoute} />);
        
        fireEvent.press(getByText('Disconnect'));

        expect(Alert.alert).toHaveBeenCalledWith(
            'Disconnect from Tournament',
            'Are you sure you want to disconnect from this tournament?',
            expect.any(Array)
        );
    });
});
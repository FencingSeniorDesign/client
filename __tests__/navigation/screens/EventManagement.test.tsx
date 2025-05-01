// Mock expo modules before any imports
jest.mock('expo-modules-core', () => ({
    Platform: {
        OS: 'test',
    },
}));

jest.mock('expo-sqlite', () => ({
    openDatabaseSync: jest.fn(() => ({
        transaction: jest.fn(),
        exec: jest.fn(),
        close: jest.fn(),
    })),
}));

jest.mock('expo-network', () => ({
    getIpAddressAsync: jest.fn(() => Promise.resolve('192.168.1.1')),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve(null)),
}));

// Mock TCP socket
jest.mock('react-native-tcp-socket', () => ({
    createServer: jest.fn(),
    createConnection: jest.fn(),
}));

// Mock database client
jest.mock('../../../src/db/DrizzleClient', () => ({
    db: {
        query: jest.fn(),
        transaction: jest.fn(),
    },
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { EventManagement } from '../../../src/navigation/screens/EventManagement';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouteProp } from '@react-navigation/native';

// Define the route param types
type EventManagementParamList = {
    params: {
        tournamentName: string;
        isRemoteConnection?: boolean;
    };
};

// Create a properly typed mock route object
const mockRoute: RouteProp<EventManagementParamList, 'params'> = {
    key: 'EventManagement',
    name: 'params' as const, // Use literal type
    params: {
        tournamentName: 'Test Tournament',
        isRemoteConnection: false,
    },
};

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({
        navigate: mockNavigate,
        goBack: mockGoBack,
    }),
    useRoute: () => mockRoute,
}));

// Mock hooks
jest.mock('../../../src/data/TournamentDataHooks', () => ({
    useEvents: jest.fn(() => ({
        data: [],
        isLoading: false,
        isError: false,
    })),
    useEventStatuses: jest.fn(() => ({
        data: {},
        isLoading: false,
    })),
    useCreateEvent: jest.fn(() => ({
        mutate: jest.fn(),
        isPending: false,
    })),
    useDeleteEvent: jest.fn(() => ({
        mutate: jest.fn(),
    })),
}));

// Mock RBAC
jest.mock('../../../src/rbac/AbilityContext', () => ({
    useAbility: () => ({
        ability: {
            can: jest.fn(() => true),
        },
    }),
}));

// Create a wrapper component with QueryClientProvider
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
        // Clear any cached modules
        jest.resetModules();
    });

    it('renders tournament name', () => {
        const { getByText } = render(<EventManagement route={mockRoute} />, {
            wrapper: createWrapper(),
        });
        expect(getByText('Test Tournament')).toBeTruthy();
    });

    it('shows loading state while fetching events', () => {
        const { useEvents } = require('../../../src/data/TournamentDataHooks');
        useEvents.mockReturnValueOnce({
            data: [],
            isLoading: true,
            isError: false,
        });

        const { getByText } = render(<EventManagement route={mockRoute} />, {
            wrapper: createWrapper(),
        });
        expect(getByText('Loading events...')).toBeTruthy();
    });

    it('shows error state when events fail to load', () => {
        const { useEvents } = require('../../../src/data/TournamentDataHooks');
        useEvents.mockReturnValueOnce({
            data: [],
            isLoading: false,
            isError: true,
        });

        const { getByText } = render(<EventManagement route={mockRoute} />, {
            wrapper: createWrapper(),
        });
        expect(getByText('Error loading events. Please try again.')).toBeTruthy();
    });

    it('shows empty state when no events exist', () => {
        const { useEvents } = require('../../../src/data/TournamentDataHooks');
        useEvents.mockReturnValueOnce({
            data: [],
            isLoading: false,
            isError: false,
        });

        const { getByText } = render(<EventManagement route={mockRoute} />, {
            wrapper: createWrapper(),
        });
        expect(getByText('No events created yet')).toBeTruthy();
    });

    it('renders create event button when user has permission', () => {
        const { getByText } = render(<EventManagement route={mockRoute} />, {
            wrapper: createWrapper(),
        });
        expect(getByText('Create Event')).toBeTruthy();
    });

    it('renders manage officials button when user has permission', () => {
        const { getByText } = render(<EventManagement route={mockRoute} />, {
            wrapper: createWrapper(),
        });
        expect(getByText('Manage Officials')).toBeTruthy();
    });

    it('navigates to manage officials screen when button is pressed', () => {
        const { getByText } = render(<EventManagement route={mockRoute} />, {
            wrapper: createWrapper(),
        });
        fireEvent.press(getByText('Manage Officials'));
        
        expect(mockNavigate).toHaveBeenCalledWith('ManageOfficials', {
            tournamentName: 'Test Tournament',
            isRemote: false,
        });
    });
});
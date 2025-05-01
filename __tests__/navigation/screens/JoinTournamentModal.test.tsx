// Mock expo modules before any other imports
jest.mock('expo-modules-core', () => ({
    NativeModulesProxy: {
        ExpoNetwork: {
            getIpAddressAsync: jest.fn(() => Promise.resolve('192.168.1.1')),
            getNetworkStateAsync: jest.fn(() => Promise.resolve({ isConnected: true })),
        },
    },
}));

jest.mock('expo-network', () => ({
    getIpAddressAsync: jest.fn(() => Promise.resolve('192.168.1.1')),
    getNetworkStateAsync: jest.fn(() => Promise.resolve({ isConnected: true })),
}));

// Mock react-native with StyleSheet.flatten
jest.mock('react-native', () => ({
    NativeEventEmitter: jest.fn(() => ({
        addListener: jest.fn(),
        removeListener: jest.fn(),
    })),
    Platform: {
        select: jest.fn(),
        OS: 'ios',
    },
    Alert: {
        alert: jest.fn(),
    },
    View: 'View',
    Text: 'Text',
    Modal: 'Modal',
    TextInput: 'TextInput',
    TouchableOpacity: 'TouchableOpacity',
    ActivityIndicator: 'ActivityIndicator',
    FlatList: 'FlatList',
    StyleSheet: {
        create: (styles: any) => styles,
        flatten: (style: any) => ({ ...style }),
        compose: (style1: any, style2: any) => ({ ...style1, ...style2 }),
    },
    NativeModules: {
        ExpoNetwork: {
            getIpAddressAsync: jest.fn(() => Promise.resolve('192.168.1.1')),
        },
    },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
    setItem: jest.fn(() => Promise.resolve()),
    getItem: jest.fn(() => Promise.resolve(null)),
    removeItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-tcp-socket', () => ({
    createServer: jest.fn(() => ({
        listen: jest.fn(),
        on: jest.fn(),
    })),
    createConnection: jest.fn(() => ({
        write: jest.fn(),
        on: jest.fn(),
        connect: jest.fn(),
    })),
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { JoinTournamentModal } from '../../../src/navigation/screens/JoinTournamentModal';
import tournamentClient from '../../../src/networking/TournamentClient';
import {
    startServerDiscovery,
    stopServerDiscovery,
    serverDiscovery,
} from '../../../src/networking/NetworkUtils';

// Add act import from react test renderer
import { act } from 'react-test-renderer';

// Mock the networking modules
jest.mock('../../../src/networking/TournamentClient');
jest.mock('../../../src/networking/NetworkUtils');

// Mock navigation
jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({
        navigate: jest.fn(),
    }),
}));

describe('JoinTournamentModal', () => {
    const mockOnClose = jest.fn();
    const mockOnJoinSuccess = jest.fn();
    const mockDiscoveredServers = [
        {
            tournamentName: 'Test Tournament 1',
            hostIp: '192.168.1.100',
            port: 9001,
        },
        {
            tournamentName: 'Test Tournament 2',
            hostIp: '192.168.1.101',
            port: 9001,
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        // Mock server discovery
        (startServerDiscovery as jest.Mock).mockResolvedValue(mockDiscoveredServers);
    });

    it('renders server discovery view by default', () => {
        const { getByText, queryByPlaceholderText } = render(
            <JoinTournamentModal
                visible={true}
                onClose={mockOnClose}
                onJoinSuccess={mockOnJoinSuccess}
            />
        );

        expect(getByText('Join Tournament')).toBeTruthy();
        expect(queryByPlaceholderText('Enter host IP')).toBeNull();
        expect(getByText('Enter IP Manually')).toBeTruthy();
    });

    it('displays discovered servers', async () => {
        const { getByText } = render(
            <JoinTournamentModal
                visible={true}
                onClose={mockOnClose}
                onJoinSuccess={mockOnJoinSuccess}
            />
        );

        await waitFor(() => {
            expect(getByText('Test Tournament 1')).toBeTruthy();
            expect(getByText('Test Tournament 2')).toBeTruthy();
        });
    });

    it('switches to manual entry view', () => {
        const { getByText, getByPlaceholderText } = render(
            <JoinTournamentModal
                visible={true}
                onClose={mockOnClose}
                onJoinSuccess={mockOnJoinSuccess}
            />
        );

        fireEvent.press(getByText('Enter IP Manually'));

        expect(getByText('Manual Connection')).toBeTruthy();
        expect(getByPlaceholderText(/Enter host IP/)).toBeTruthy();
    });

    it('validates IP address in manual entry', async () => {
        const { getByText, getByPlaceholderText } = render(
            <JoinTournamentModal
                visible={true}
                onClose={mockOnClose}
                onJoinSuccess={mockOnJoinSuccess}
            />
        );

        // Switch to manual entry
        fireEvent.press(getByText('Enter IP Manually'));

        // Enter invalid IP
        fireEvent.changeText(getByPlaceholderText(/Enter host IP/), 'invalid-ip');
        fireEvent.press(getByText('Connect'));

        await waitFor(() => {
            expect(getByText(/Please enter a valid IP address/)).toBeTruthy();
        });
    });

    it('handles successful manual connection', async () => {
        (tournamentClient.connectToServer as jest.Mock).mockResolvedValue(true);
        (tournamentClient.getClientInfo as jest.Mock).mockReturnValue({
            tournamentName: 'Test Tournament',
        });

        const { getByText, getByPlaceholderText } = render(
            <JoinTournamentModal
                visible={true}
                onClose={mockOnClose}
                onJoinSuccess={mockOnJoinSuccess}
            />
        );

        // Switch to manual entry
        fireEvent.press(getByText('Enter IP Manually'));

        // Enter valid IP and port
        fireEvent.changeText(getByPlaceholderText(/Enter host IP/), '192.168.1.100');
        fireEvent.changeText(getByPlaceholderText(/Enter port/), '9001');
        
        await act(async () => {
            fireEvent.press(getByText('Connect'));
        });

        expect(tournamentClient.connectToServer).toHaveBeenCalledWith('192.168.1.100', 9001);
        expect(mockOnJoinSuccess).toHaveBeenCalledWith('Test Tournament');
    });

    it('handles connection failure', async () => {
        (tournamentClient.connectToServer as jest.Mock).mockRejectedValue(
            new Error('Connection failed')
        );

        const { getByText } = render(
            <JoinTournamentModal
                visible={true}
                onClose={mockOnClose}
                onJoinSuccess={mockOnJoinSuccess}
            />
        );

        // Try connecting to a discovered server
        fireEvent.press(getByText('Test Tournament 1'));

        await waitFor(() => {
            expect(getByText(/Failed to connect/)).toBeTruthy();
        });
    });

    it('refreshes server list', async () => {
        const { getByText } = render(
            <JoinTournamentModal
                visible={true}
                onClose={mockOnClose}
                onJoinSuccess={mockOnJoinSuccess}
            />
        );

        fireEvent.press(getByText('Refresh'));

        expect(startServerDiscovery).toHaveBeenCalled();
        await waitFor(() => {
            expect(getByText('Test Tournament 1')).toBeTruthy();
        });
    });

    it('handles server discovery failure', async () => {
        (startServerDiscovery as jest.Mock).mockRejectedValue(
            new Error('Discovery failed')
        );

        const { getByText } = render(
            <JoinTournamentModal
                visible={true}
                onClose={mockOnClose}
                onJoinSuccess={mockOnJoinSuccess}
            />
        );

        fireEvent.press(getByText('Refresh'));

        await waitFor(() => {
            expect(getByText(/Failed to discover servers/)).toBeTruthy();
        });
    });

    it('cleans up server discovery on close', () => {
        const { unmount } = render(
            <JoinTournamentModal
                visible={true}
                onClose={mockOnClose}
                onJoinSuccess={mockOnJoinSuccess}
            />
        );

        unmount();
        expect(stopServerDiscovery).toHaveBeenCalled();
    });

    it('handles successful connection via discovered server', async () => {
        (tournamentClient.connectToServer as jest.Mock).mockResolvedValue(true);
        (tournamentClient.getClientInfo as jest.Mock).mockReturnValue({
            tournamentName: 'Test Tournament 1',
        });

        const { getByText } = render(
            <JoinTournamentModal
                visible={true}
                onClose={mockOnClose}
                onJoinSuccess={mockOnJoinSuccess}
            />
        );

        await waitFor(() => {
            fireEvent.press(getByText('Test Tournament 1'));
        });

        expect(tournamentClient.connectToServer).toHaveBeenCalledWith(
            '192.168.1.100',
            9001
        );
        expect(mockOnJoinSuccess).toHaveBeenCalledWith('Test Tournament 1');
    });
});

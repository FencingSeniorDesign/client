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

function act(arg0: () => Promise<void>) {
    throw new Error('Function not implemented.');
}

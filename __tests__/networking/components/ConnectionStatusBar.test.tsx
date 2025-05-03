// __tests__/networking/components/ConnectionStatusBar.test.tsx
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { ConnectionStatusBar } from '../../../src/networking/components/ConnectionStatusBar';
import tournamentClient from '../../../src/networking/TournamentClient';

// Mock the TournamentClient
jest.mock('../../../src/networking/TournamentClient', () => ({
    isConnected: jest.fn(),
    getClientInfo: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn(),
}));

describe('ConnectionStatusBar Component', () => {
    // Mock implementations for tournamentClient
    const mockDisconnect = jest.fn();
    const mockOnFunction = jest.fn();
    const mockRemoveListener = jest.fn();

    // Store event handlers to trigger them in tests
    let connectedHandler: (name: string) => void;
    let disconnectedHandler: () => void;

    beforeEach(() => {
        jest.clearAllMocks();

        // Reset handlers
        connectedHandler = () => {};
        disconnectedHandler = () => {};

        // Setup mock implementations
        (tournamentClient.isConnected as jest.Mock).mockReturnValue(false);
        (tournamentClient.getClientInfo as jest.Mock).mockReturnValue(null);

        // Mock the on method to capture event handlers
        (tournamentClient.on as jest.Mock).mockImplementation((event, handler) => {
            if (event === 'connected') {
                connectedHandler = handler;
            } else if (event === 'disconnected') {
                disconnectedHandler = handler;
            }
            return mockOnFunction();
        });

        // Mock the removeListener method
        (tournamentClient.removeListener as jest.Mock).mockImplementation(mockRemoveListener);
    });

    it('does not render when not connected and no tournament name provided', () => {
        const { toJSON } = render(<ConnectionStatusBar />);

        // The component should not render anything
        expect(toJSON()).toBeNull();
    });

    it('renders when connected', () => {
        // Mock client as connected
        (tournamentClient.isConnected as jest.Mock).mockReturnValue(true);
        (tournamentClient.getClientInfo as jest.Mock).mockReturnValue({
            tournamentName: 'Test Tournament',
            isConnected: true,
        });

        const { getByText } = render(<ConnectionStatusBar />);

        // Should display connected message
        expect(getByText('Connected to: Test Tournament')).toBeTruthy();
    });

    it('renders with provided tournament name even when not connected', () => {
        const { getByText } = render(<ConnectionStatusBar tournamentName="Specific Tournament" />);

        // Should display not connected message with the specific tournament
        expect(getByText('Not connected to Specific Tournament')).toBeTruthy();
    });

    it('displays disconnect button when connected and onDisconnect prop provided', () => {
        // Mock client as connected
        (tournamentClient.isConnected as jest.Mock).mockReturnValue(true);
        (tournamentClient.getClientInfo as jest.Mock).mockReturnValue({
            tournamentName: 'Test Tournament',
            isConnected: true,
        });

        const { getByText } = render(<ConnectionStatusBar onDisconnect={mockDisconnect} />);

        // Should display disconnect button
        const disconnectButton = getByText('Disconnect');
        expect(disconnectButton).toBeTruthy();

        // Click the disconnect button
        fireEvent.press(disconnectButton);

        // Check that onDisconnect was called
        expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });

    it('updates state when connected event is triggered', () => {
        // First render to get access to the handlers
        render(<ConnectionStatusBar />);

        // Verify handlers were set up
        expect(tournamentClient.on).toHaveBeenCalledWith('connected', expect.any(Function));

        // Update mock to simulate connected state
        (tournamentClient.isConnected as jest.Mock).mockReturnValue(true);
        (tournamentClient.getClientInfo as jest.Mock).mockReturnValue({
            tournamentName: 'Dynamic Tournament',
            isConnected: true,
        });

        // Trigger the connected event
        act(() => {
            connectedHandler('Dynamic Tournament');
        });

        // Render again to verify state update
        const { getByText } = render(<ConnectionStatusBar />);
        expect(getByText('Connected to: Dynamic Tournament')).toBeTruthy();
    });

    it('updates state when disconnected event is triggered', () => {
        // Set initial connected state
        (tournamentClient.isConnected as jest.Mock).mockReturnValue(true);
        (tournamentClient.getClientInfo as jest.Mock).mockReturnValue({
            tournamentName: 'Test Tournament',
            isConnected: true,
        });

        // First render to get access to the handlers
        const { getByText } = render(<ConnectionStatusBar />);
        expect(getByText('Connected to: Test Tournament')).toBeTruthy();

        // Update mock to simulate disconnected state
        (tournamentClient.isConnected as jest.Mock).mockReturnValue(false);
        (tournamentClient.getClientInfo as jest.Mock).mockReturnValue(null);

        // Trigger the disconnected event
        act(() => {
            disconnectedHandler();
        });

        // Render again to verify state update
        const { queryByText } = render(<ConnectionStatusBar />);
        expect(queryByText(/Connected to:/)).toBeNull();
    });

    it('renders in compact mode', () => {
        // Mock client as connected
        (tournamentClient.isConnected as jest.Mock).mockReturnValue(true);

        const { getByText } = render(<ConnectionStatusBar compact={true} />);

        // Should display compact connected message
        expect(getByText('Connected')).toBeTruthy();
    });

    it('shows disconnected status in compact mode', () => {
        (tournamentClient.isConnected as jest.Mock).mockReturnValue(false);

        const { getByText } = render(<ConnectionStatusBar compact={true} tournamentName="Test Tournament" />);

        // Should display disconnected message in compact mode
        expect(getByText('Disconnected')).toBeTruthy();
    });

    it('removes event listeners on unmount', () => {
        const { unmount } = render(<ConnectionStatusBar />);

        // Should have registered listeners
        expect(tournamentClient.on).toHaveBeenCalledWith('connected', expect.any(Function));
        expect(tournamentClient.on).toHaveBeenCalledWith('disconnected', expect.any(Function));

        // Unmount component
        unmount();

        // Should have removed listeners
        expect(tournamentClient.removeListener).toHaveBeenCalledWith('connected', expect.any(Function));
        expect(tournamentClient.removeListener).toHaveBeenCalledWith('disconnected', expect.any(Function));
    });

    it('prioritizes explicit tournamentName prop over client info', () => {
        // Mock client as connected
        (tournamentClient.isConnected as jest.Mock).mockReturnValue(true);
        (tournamentClient.getClientInfo as jest.Mock).mockReturnValue({
            tournamentName: 'Client Tournament',
            isConnected: true,
        });

        const { getByText } = render(<ConnectionStatusBar tournamentName="Prop Tournament" />);

        // Should use the prop tournament name
        expect(getByText('Connected to: Prop Tournament')).toBeTruthy();
    });
});

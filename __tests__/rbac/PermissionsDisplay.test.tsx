// __tests__/rbac/PermissionsDisplay.test.tsx
import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { PermissionsDisplay } from '../../src/rbac/PermissionsDisplay';
import { useAbility } from '../../src/rbac/AbilityContext';
import { Role } from '../../src/rbac/ability';
import { getDeviceId } from '../../src/networking/NetworkUtils';

// Mock the hooks and utilities
jest.mock('../../src/rbac/AbilityContext', () => ({
    useAbility: jest.fn(),
}));

jest.mock('../../src/networking/NetworkUtils', () => ({
    getDeviceId: jest.fn(),
}));

describe('PermissionsDisplay Component', () => {
    // Setup default mocks
    beforeEach(() => {
        jest.clearAllMocks();
        (getDeviceId as jest.Mock).mockResolvedValue('test-device-id');
        (useAbility as jest.Mock).mockReturnValue({
            ability: { can: jest.fn(), cannot: jest.fn() },
            role: Role.VIEWER,
            refreshAbility: jest.fn(),
        });
    });

    it('should not render anything when no tournament name is provided', () => {
        // Render component without tournament name
        const { toJSON } = render(<PermissionsDisplay />);

        // Component should not render anything
        expect(toJSON()).toBeNull();
    });

    it('should display viewer role correctly', () => {
        // Setup
        (useAbility as jest.Mock).mockReturnValue({
            ability: { can: jest.fn(), cannot: jest.fn() },
            role: Role.VIEWER,
            refreshAbility: jest.fn(),
        });

        // Render
        const { getByText } = render(<PermissionsDisplay tournamentName="Test Tournament" />);

        // Assert
        expect(getByText('Role: Viewer')).toBeTruthy();
    });

    it('should display tournament creator role correctly', () => {
        // Setup
        (useAbility as jest.Mock).mockReturnValue({
            ability: { can: jest.fn(), cannot: jest.fn() },
            role: Role.TOURNAMENT_CREATOR,
            refreshAbility: jest.fn(),
        });

        // Render
        const { getByText } = render(<PermissionsDisplay tournamentName="Test Tournament" />);

        // Assert
        expect(getByText('Role: Tournament Creator')).toBeTruthy();
    });

    it('should display official role correctly', () => {
        // Setup
        (useAbility as jest.Mock).mockReturnValue({
            ability: { can: jest.fn(), cannot: jest.fn() },
            role: Role.OFFICIAL,
            refreshAbility: jest.fn(),
        });

        // Render
        const { getByText } = render(<PermissionsDisplay tournamentName="Test Tournament" />);

        // Assert
        expect(getByText('Role: Tournament Official')).toBeTruthy();
    });

    it('should display referee role correctly', () => {
        // Setup
        (useAbility as jest.Mock).mockReturnValue({
            ability: { can: jest.fn(), cannot: jest.fn() },
            role: Role.REFEREE,
            refreshAbility: jest.fn(),
        });

        // Render
        const { getByText } = render(<PermissionsDisplay tournamentName="Test Tournament" />);

        // Assert
        expect(getByText('Role: Referee')).toBeTruthy();
    });

    it('should call getDeviceId', () => {
        // Setup
        (getDeviceId as jest.Mock).mockResolvedValue('mock-device-id-123');

        // Render
        render(<PermissionsDisplay tournamentName="Test Tournament" />);

        // Initial render should call getDeviceId
        expect(getDeviceId).toHaveBeenCalled();
    });

    it('should handle error when fetching device ID', async () => {
        // Setup
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        (getDeviceId as jest.Mock).mockRejectedValue(new Error('Failed to get device ID'));

        // Render
        render(<PermissionsDisplay tournamentName="Test Tournament" />);

        // The error should be logged
        expect(getDeviceId).toHaveBeenCalled();

        // Wait for the async effect to complete
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching device ID:', expect.any(Error));

        // Clean up
        consoleErrorSpy.mockRestore();
    });

    it('should render in compact mode', () => {
        // Setup
        (useAbility as jest.Mock).mockReturnValue({
            ability: { can: jest.fn(), cannot: jest.fn() },
            role: Role.TOURNAMENT_CREATOR,
            refreshAbility: jest.fn(),
        });

        // Render in compact mode
        const { getByText, queryByText } = render(
            <PermissionsDisplay tournamentName="Test Tournament" compact={true} />
        );

        // Should show role but not the other elements
        expect(getByText('Tournament Creator')).toBeTruthy();
        expect(queryByText('Device ID:')).toBeNull();
        expect(queryByText('Permissions')).toBeNull();
    });
});

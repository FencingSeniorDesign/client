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

    it('should display viewer role correctly', async () => {
        // Setup
        (useAbility as jest.Mock).mockReturnValue({
            ability: { can: jest.fn(), cannot: jest.fn() },
            role: Role.VIEWER,
            refreshAbility: jest.fn(),
        });

        // Mock getDeviceId to resolve immediately to prevent act warnings
        (getDeviceId as jest.Mock).mockImplementation(() => Promise.resolve('test-id'));

        const { getByText } = render(<PermissionsDisplay tournamentName="Test Tournament" />);

        // Wait for async operations to complete
        await act(async () => {
            await Promise.resolve();
        });

        // Assert - with i18n mock, translation keys are returned as their last part
        expect(getByText(/role/)).toBeTruthy();
        expect(getByText(/viewer/)).toBeTruthy();
    });

    it('should display tournament creator role correctly', async () => {
        // Setup
        (useAbility as jest.Mock).mockReturnValue({
            ability: { can: jest.fn(), cannot: jest.fn() },
            role: Role.TOURNAMENT_CREATOR,
            refreshAbility: jest.fn(),
        });

        // Mock getDeviceId to resolve immediately
        (getDeviceId as jest.Mock).mockImplementation(() => Promise.resolve('test-id'));

        const { getByText } = render(<PermissionsDisplay tournamentName="Test Tournament" />);

        // Wait for async operations to complete
        await act(async () => {
            await Promise.resolve();
        });

        // Assert - using regex pattern to match partial text
        expect(getByText(/tournamentCreator/)).toBeTruthy();
    });

    it('should display official role correctly', async () => {
        // Setup
        (useAbility as jest.Mock).mockReturnValue({
            ability: { can: jest.fn(), cannot: jest.fn() },
            role: Role.OFFICIAL,
            refreshAbility: jest.fn(),
        });

        // Mock getDeviceId to resolve immediately
        (getDeviceId as jest.Mock).mockImplementation(() => Promise.resolve('test-id'));

        const { getByText } = render(<PermissionsDisplay tournamentName="Test Tournament" />);

        // Wait for async operations to complete
        await act(async () => {
            await Promise.resolve();
        });

        // Assert - using regex pattern to match partial text
        expect(getByText(/official/)).toBeTruthy();
    });

    it('should display referee role correctly', async () => {
        // Setup
        (useAbility as jest.Mock).mockReturnValue({
            ability: { can: jest.fn(), cannot: jest.fn() },
            role: Role.REFEREE,
            refreshAbility: jest.fn(),
        });

        // Mock getDeviceId to resolve immediately
        (getDeviceId as jest.Mock).mockImplementation(() => Promise.resolve('test-id'));

        const { getByText } = render(<PermissionsDisplay tournamentName="Test Tournament" />);

        // Wait for async operations to complete
        await act(async () => {
            await Promise.resolve();
        });

        // Assert - using regex pattern to match partial text
        expect(getByText(/referee/)).toBeTruthy();
    });

    it('should call getDeviceId', async () => {
        // Setup
        (getDeviceId as jest.Mock).mockReturnValue(Promise.resolve('mock-device-id-123'));

        render(<PermissionsDisplay tournamentName="Test Tournament" />);

        // Wait for async operations to complete
        await act(async () => {
            await Promise.resolve();
        });

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
        await act(async () => {
            // Wait for promises to resolve
            await Promise.resolve();
        });

        expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching device ID:', expect.any(Error));
        consoleErrorSpy.mockRestore();
    });

    it('should render in compact mode', async () => {
        // Setup
        (useAbility as jest.Mock).mockReturnValue({
            ability: { can: jest.fn(), cannot: jest.fn() },
            role: Role.TOURNAMENT_CREATOR,
            refreshAbility: jest.fn(),
        });

        // Mock getDeviceId to resolve immediately
        (getDeviceId as jest.Mock).mockImplementation(() => Promise.resolve('test-id'));

        // Render in compact mode
        const { getByText, queryByText } = render(
            <PermissionsDisplay tournamentName="Test Tournament" compact={true} />
        );

        // Wait for async operations to complete
        await act(async () => {
            await Promise.resolve();
        });

        // Should show role but not the other elements
        expect(getByText(/tournamentCreator/)).toBeTruthy();
        expect(queryByText(/deviceId/)).toBeNull();
        expect(queryByText(/title/)).toBeNull();
    });
});

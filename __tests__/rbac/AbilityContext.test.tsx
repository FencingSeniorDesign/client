// __tests__/rbac/AbilityContext.test.tsx
import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AbilityProvider, useAbility, AbilityContext } from '../../src/rbac/AbilityContext';
import { Role } from '../../src/rbac/ability';
import AsyncStorage from 'expo-sqlite/kv-store';
import dataProvider from '../../src/data/DrizzleDataProvider';
import { getDeviceId } from '../../src/networking/NetworkUtils';
import tournamentClient from '../../src/networking/TournamentClient';

// Mock all dependencies
jest.mock('../../src/data/DrizzleDataProvider', () => ({
  isRemoteConnection: jest.fn(),
}));

jest.mock('../../src/networking/NetworkUtils', () => ({
  getDeviceId: jest.fn(),
}));

jest.mock('../../src/networking/TournamentClient', () => ({
  on: jest.fn(),
  off: jest.fn(),
}));

jest.mock('expo-sqlite/kv-store', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Test component to consume the context
const TestComponent = () => {
  const { ability, role, refreshAbility, setTournamentContext } = useAbility();
  
  return (
    <>
      <Text testID="role">{role}</Text>
      <Text testID="canManageAll">{ability.can('manage', 'all').toString()}</Text>
      <Text testID="refresh" onPress={() => refreshAbility('Test Tournament')}>Refresh</Text>
      <Text testID="setContext" onPress={() => setTournamentContext('New Tournament')}>Set Context</Text>
    </>
  );
};

describe('AbilityContext', () => {
  // Setup before each test
  let roleAssignedHandler: Function;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    (getDeviceId as jest.Mock).mockResolvedValue('test-device-id');
    (dataProvider.isRemoteConnection as jest.Mock).mockReturnValue(false);
    
    // Capture event handlers
    roleAssignedHandler = jest.fn();
    (tournamentClient.on as jest.Mock).mockImplementation((event, handler) => {
      if (event === 'roleAssigned') {
        roleAssignedHandler = handler;
      }
      return undefined;
    });

    // Add a spy to console.error to catch errors
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Helper to trigger the roleAssigned event
  const triggerRoleAssigned = (roleData: any) => {
    if (roleAssignedHandler) {
      act(() => {
        // @ts-ignore - Call the handler with the role data
        roleAssignedHandler(roleData);
      });
    }
  };

  it('should initialize with default viewer role', async () => {
    // Render with the AbilityProvider
    const { getByTestId } = render(
      <AbilityProvider>
        <TestComponent />
      </AbilityProvider>
    );
    
    // Initially, should have viewer role
    await waitFor(() => {
      expect(getByTestId('role').props.children).toBe(Role.VIEWER);
    });
  });

  it('should set tournament creator role for local device', async () => {
    // Setup mocks for local device
    (dataProvider.isRemoteConnection as jest.Mock).mockReturnValue(false);
    
    // Render with the AbilityProvider
    const { getByTestId } = render(
      <AbilityProvider>
        <TestComponent />
      </AbilityProvider>
    );
    
    // Click to set tournament context
    act(() => {
      getByTestId('setContext').props.onPress();
    });
    
    // Should have tournament creator role
    await waitFor(() => {
      expect(getByTestId('role').props.children).toBe(Role.TOURNAMENT_CREATOR);
      expect(getByTestId('canManageAll').props.children).toBe('true');
    });
  });

  it('should update role when server assigns a role', async () => {
    // Render with the AbilityProvider
    const { getByTestId } = render(
      <AbilityProvider>
        <TestComponent />
      </AbilityProvider>
    );
    
    // Trigger role assignment event
    triggerRoleAssigned({ 
      role: 'referee',
      tournamentName: 'Server Tournament'
    });
    
    // Role should be updated to referee
    await waitFor(() => {
      expect(getByTestId('role').props.children).toBe(Role.REFEREE);
    });
  });

  it('should handle unknown role from server', async () => {
    // Render with the AbilityProvider
    render(
      <AbilityProvider>
        <TestComponent />
      </AbilityProvider>
    );
    
    // Trigger role assignment with unknown role
    triggerRoleAssigned({ 
      role: 'unknown_role',
      tournamentName: 'Test Tournament'
    });
    
    // Should warn about unknown role
    await waitFor(() => {
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("Received unknown role string 'unknown_role'")
      );
    });
  });

  it('should refresh ability when called', async () => {
    // Render with the AbilityProvider
    const { getByTestId } = render(
      <AbilityProvider>
        <TestComponent />
      </AbilityProvider>
    );
    
    // Setup for local device = tournament creator
    (dataProvider.isRemoteConnection as jest.Mock).mockReturnValue(false);
    
    // Call refresh
    act(() => {
      getByTestId('refresh').props.onPress();
    });
    
    // Role should be updated to tournament creator
    await waitFor(() => {
      expect(getByTestId('role').props.children).toBe(Role.TOURNAMENT_CREATOR);
      expect(getByTestId('canManageAll').props.children).toBe('true');
    });
  });

  it('should clean up event listeners on unmount', () => {
    // Render with the AbilityProvider
    const { unmount } = render(
      <AbilityProvider>
        <TestComponent />
      </AbilityProvider>
    );
    
    // Unmount component
    unmount();
    
    // Should have removed event listeners
    expect(tournamentClient.off).toHaveBeenCalledWith('roleAssigned', expect.any(Function));
  });

  it('should handle error in getDeviceId', async () => {
    // Mock console.error and force getDeviceId to throw
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (getDeviceId as jest.Mock).mockRejectedValue(new Error('Device ID error'));
    
    // Render with the AbilityProvider
    render(
      <AbilityProvider>
        <TestComponent />
      </AbilityProvider>
    );
    
    // Wait for the async effect to run
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching device ID:',
        expect.any(Error)
      );
    });
    
    consoleErrorSpy.mockRestore();
  });

  it('should handle remote connections correctly', async () => {
    // Setup mocks for remote connection
    (dataProvider.isRemoteConnection as jest.Mock).mockReturnValue(true);
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    // Render with the AbilityProvider
    const { getByTestId } = render(
      <AbilityProvider>
        <TestComponent />
      </AbilityProvider>
    );
    
    // Trigger a refresh to call determineRole
    act(() => {
      getByTestId('refresh').props.onPress();
    });
    
    // Should default to VIEWER for remote connections
    await waitFor(() => {
      expect(getByTestId('role').props.children).toBe(Role.VIEWER);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Remote connection detected.'
      );
    });
    
    consoleLogSpy.mockRestore();
  });

  it('should handle errors in determineRole function', async () => {
    // Setup mocks to throw error in determineRole
    (dataProvider.isRemoteConnection as jest.Mock).mockImplementation(() => {
      throw new Error('Test error in determineRole');
    });
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Render with the AbilityProvider
    const { getByTestId } = render(
      <AbilityProvider>
        <TestComponent />
      </AbilityProvider>
    );
    
    // Call refresh to trigger determineRole
    act(() => {
      getByTestId('refresh').props.onPress();
    });
    
    // Should default to VIEWER on error
    await waitFor(() => {
      expect(getByTestId('role').props.children).toBe(Role.VIEWER);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error determining role:',
        expect.any(Error)
      );
    });
    
    consoleErrorSpy.mockRestore();
  });
  
  it('should reach the default VIEWER case in determineRole', async () => {
    // Setup to test the default case
    // Make getDeviceId return null to force a path that reaches the default return
    (getDeviceId as jest.Mock).mockResolvedValue(null);
    
    // Render with the AbilityProvider
    const { getByTestId } = render(
      <AbilityProvider>
        <TestComponent />
      </AbilityProvider>
    );
    
    // Force refresh to trigger the code path where we want 100% coverage
    act(() => {
      getByTestId('refresh').props.onPress();
    });
    
    // Wait for the role to be updated to VIEWER (default value)
    await waitFor(() => {
      expect(getByTestId('role').props.children).toBe(Role.VIEWER);
    });
  });

  it('should handle all role types from server', async () => {
    // Render with the AbilityProvider
    const { getByTestId } = render(
      <AbilityProvider>
        <TestComponent />
      </AbilityProvider>
    );
    
    // Test tournament_official role
    triggerRoleAssigned({ 
      role: 'tournament_official',
      tournamentName: 'Server Tournament'
    });
    
    await waitFor(() => {
      expect(getByTestId('role').props.children).toBe(Role.OFFICIAL);
    });
    
    // Test tournament_creator role
    triggerRoleAssigned({ 
      role: 'tournament_creator',
      tournamentName: 'Server Tournament'
    });
    
    await waitFor(() => {
      expect(getByTestId('role').props.children).toBe(Role.TOURNAMENT_CREATOR);
    });
    
    // Test viewer role
    triggerRoleAssigned({ 
      role: 'viewer',
      tournamentName: 'Server Tournament'
    });
    
    await waitFor(() => {
      expect(getByTestId('role').props.children).toBe(Role.VIEWER);
    });
  });

  it('should skip refresh when tournament context is not changed', async () => {
    // Setup
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    // Render with the AbilityProvider
    const { getByTestId } = render(
      <AbilityProvider>
        <TestComponent />
      </AbilityProvider>
    );
    
    // Set initial tournament context
    act(() => {
      getByTestId('setContext').props.onPress();
    });
    
    // Wait for the first call to complete
    await waitFor(() => {
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Setting tournament context to:')
      );
    });
    
    // Clear mock calls
    consoleLogSpy.mockClear();
    
    // Call setTournamentContext with the same name again
    act(() => {
      // The TestComponent passes 'New Tournament' to setTournamentContext
      getByTestId('setContext').props.onPress();
    });
    
    // We need to set the role to something other than VIEWER to trigger the skip path
    triggerRoleAssigned({ 
      role: 'tournament_creator',
      tournamentName: 'New Tournament'
    });
    
    // Then call setTournamentContext again with the same name
    act(() => {
      getByTestId('setContext').props.onPress();
    });
    
    // Should log that refresh is skipped
    await waitFor(() => {
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Tournament context already set to New Tournament, skipping refresh.')
      );
    });
    
    consoleLogSpy.mockRestore();
  });
});
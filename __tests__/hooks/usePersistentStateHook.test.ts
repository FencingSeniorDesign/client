// __tests__/hooks/usePersistentStateHook.test.ts
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { usePersistentState } from '../../src/hooks/usePersistentStateHook';

import AsyncStorage from 'expo-sqlite/kv-store';

// Mock AsyncStorage
jest.mock('expo-sqlite/kv-store', () => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
}));

describe('usePersistentState Hook', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should initialize with default value when no stored value exists', async () => {
        // Setup
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

        // Execute
        const { result } = renderHook(() => usePersistentState('testKey', 'default value'));

        // Assert
        expect(result.current[0]).toBe('default value');
        expect(AsyncStorage.getItem).toHaveBeenCalledWith('testKey');

        // Wait for the effect to run
        await waitFor(() => {
            expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);
        });
    });

    it('should load stored value when available', async () => {
        // Setup
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify('stored value'));

        // Execute
        const { result } = renderHook(() => usePersistentState('testKey', 'default value'));

        // Wait for the effect to run and update state
        await waitFor(() => {
            expect(result.current[0]).toBe('stored value');
        });

        // Assert
        expect(AsyncStorage.getItem).toHaveBeenCalledWith('testKey');
    });

    it('should save state changes to AsyncStorage', async () => {
        // Setup
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

        // Execute
        const { result } = renderHook(() => usePersistentState('testKey', 'default value'));

        // Update the state
        act(() => {
            result.current[1]('new value');
        });

        // Wait for the effect to run
        await waitFor(() => {
            expect(AsyncStorage.setItem).toHaveBeenCalledWith('testKey', JSON.stringify('new value'));
        });
    });

    it('should not save to AsyncStorage if value equals the default', async () => {
        // Setup
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

        // Execute
        const { result } = renderHook(() => usePersistentState('testKey', 'default value'));

        // Update the state to the default value (which shouldn't trigger saving)
        act(() => {
            result.current[1]('default value');
        });

        // Wait a bit to make sure the effect had time to run
        await waitFor(() => {
            expect(AsyncStorage.setItem).not.toHaveBeenCalled();
        });
    });

    it('should handle errors when loading from AsyncStorage', async () => {
        // Setup
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

        // Execute
        const { result } = renderHook(() => usePersistentState('testKey', 'default value'));

        // Wait for the effect to run
        await waitFor(() => {
            expect(consoleErrorSpy).toHaveBeenCalled();
        });

        // Assert that we used the default value
        expect(result.current[0]).toBe('default value');

        // Clean up
        consoleErrorSpy.mockRestore();
    });

    it('should handle errors when saving to AsyncStorage', async () => {
        // Setup
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
        (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

        // Execute
        const { result } = renderHook(() => usePersistentState('testKey', 'default value'));

        // Update the state
        act(() => {
            result.current[1]('new value');
        });

        // Wait for the effect to run
        await waitFor(() => {
            expect(consoleErrorSpy).toHaveBeenCalled();
        });

        // Clean up
        consoleErrorSpy.mockRestore();
    });

    it('should work with complex data types like objects', async () => {
        // Setup
        const defaultValue = { name: 'default', count: 0 };
        const storedValue = { name: 'stored', count: 5 };
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(storedValue));

        // Execute
        const { result } = renderHook(() => usePersistentState('testKey', defaultValue));

        // Wait for the effect to run
        await waitFor(() => {
            expect(result.current[0]).toEqual(storedValue);
        });

        // Update the state
        const newValue = { name: 'updated', count: 10 };
        act(() => {
            result.current[1](newValue);
        });

        // Wait for the effect to run
        await waitFor(() => {
            expect(AsyncStorage.setItem).toHaveBeenCalledWith('testKey', JSON.stringify(newValue));
        });
    });
});

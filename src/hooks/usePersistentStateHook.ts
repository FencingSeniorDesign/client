import React from 'react';
import AsyncStorage from 'expo-sqlite/kv-store';

/**
 * usePersistentState
 * A custom hook for persisting state across app sessions.
 *
 * @param key The unique storage key (specific to the screen/page).
 * @param defaultValue The initial state value.
 * @returns [state, setState] State variable and setter function.
 */
export function usePersistentState<T>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [state, setState] = React.useState<T>(defaultValue);

    // Load saved state from AsyncStorage when the component mounts
    React.useEffect(() => {
        const loadState = async () => {
            try {
                const savedState = await AsyncStorage.getItem(key);
                if (savedState !== null) {
                    setState(JSON.parse(savedState) as T); // Restore state
                }
            } catch (error) {
                console.error(`Error restoring state for key "${key}":`, error);
            }
        };

        loadState();
    }, [key]);

    // Save state to AsyncStorage whenever it changes
    React.useEffect(() => {
        const saveState = async () => {
            try {
                await AsyncStorage.setItem(key, JSON.stringify(state));
            } catch (error) {
                console.error(`Error saving state for key "${key}":`, error);
            }
        };

        if (state !== defaultValue) saveState(); // Avoid storing default state unnecessarily
    }, [key, state, defaultValue]);

    return [state, setState];
}

// __tests__/App.test.tsx
jest.mock('react-native-gesture-handler', () => {
    const { View } = require('react-native');
    return {
        GestureHandlerRootView: View,
        // Stub the default export with a no-op install function.
        default: { install: () => {} },
    };
});

import React from 'react';
import { render } from '@testing-library/react-native';
import { App } from '../src/App';

// Mock expo modules to avoid executing their real logic during tests
jest.mock('expo-asset', () => ({
    Asset: {
        loadAsync: jest.fn(() => Promise.resolve()),
    },
}));

jest.mock('expo-splash-screen', () => ({
    preventAutoHideAsync: jest.fn(() => Promise.resolve()),
    hideAsync: jest.fn(() => Promise.resolve()),
}));

// Mock the database initialization so it doesn't run real operations
jest.mock('../src/db/DrizzleClient', () => ({
    initializeDatabase: jest.fn(() => Promise.resolve()),
}));

// Mock tournament sync—this just prevents side effects in tests
jest.mock('../src/data/TournamentDataHooks', () => ({
    setupTournamentSync: jest.fn(),
}));

// Mock TournamentServer with __esModule flag so that its default export includes setQueryClient
jest.mock('../src/networking/TournamentServer', () => ({
    __esModule: true,
    default: {
        setQueryClient: jest.fn(),
    },
}));

// Optionally, mock the Navigation component to isolate tests for App.
// Here we render a simple Text element with testID "navigation" in place of Navigation.
jest.mock('../src/navigation', () => {
    const React = require('react');
    const { Text } = require('react-native');
    return {
        Navigation: (props: any) => <Text testID="navigation">Navigation Component</Text>,
    };
});

describe('App Component', () => {
    it('renders without crashing and displays the Navigation component', () => {
        const { getByTestId, toJSON } = render(<App />);
        // Check that the mocked Navigation component is rendered.
        expect(getByTestId('navigation')).toBeTruthy();
        // Optionally, take a snapshot for regression testing.
        expect(toJSON()).toMatchSnapshot();
    });
});

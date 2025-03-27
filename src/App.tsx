// src/App.tsx
import { Assets as NavigationAssets } from '@react-navigation/elements';
import { Asset } from 'expo-asset';
import * as SplashScreen from 'expo-splash-screen';
import * as React from 'react';
import { Navigation } from './navigation';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupTournamentSync } from './data/TournamentDataHooks';
import { initializeDatabase } from "./db/DrizzleClient";
import tournamentServer from './networking/TournamentServer';

// Create a client
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60, // 1 minute
            retry: 1,
        },
    },
});

// Initialize database
initializeDatabase().catch(error => {
    console.error('Error initializing database:', error);
});

// Set up tournament sync with real-time updates
setupTournamentSync(queryClient);

// Share the queryClient with the TournamentServer for server-side cache invalidation
tournamentServer.setQueryClient(queryClient);

Asset.loadAsync([
    ...NavigationAssets,
    require('./assets/logo.png'),
]);

SplashScreen.preventAutoHideAsync();

export function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <GestureHandlerRootView style={{ flex: 1 }}>
                <Navigation
                    linking={{
                        enabled: 'auto',
                        prefixes: [
                            // Change the scheme to match your app's scheme defined in app.json
                            'helloworld://',
                        ],
                    }}
                    onReady={() => {
                        SplashScreen.hideAsync();
                    }}
                />
            </GestureHandlerRootView>
        </QueryClientProvider>
    );
}
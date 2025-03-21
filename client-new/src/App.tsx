/**
 * App.tsx - Main application component
 */
import { Assets as NavigationAssets } from '@react-navigation/elements';
import { Asset } from 'expo-asset';
import * as SplashScreen from 'expo-splash-screen';
import * as React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import our custom QueryProvider instead of using @tanstack/react-query directly
import { QueryProvider } from './infrastructure/query';
import { initializeDatabase } from './infrastructure/database';
import Navigation from './navigation';

// Load assets
Asset.loadAsync([
  ...NavigationAssets,
  require('./assets/logo.png'),
]);

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function App() {
  // Initialize the database when the app starts
  React.useEffect(() => {
    const init = async () => {
      try {
        await initializeDatabase();
        console.log('Database initialized');
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
    };
    
    init();
  }, []);

  return (
    <SafeAreaProvider>
      <QueryProvider enableDevtools={__DEV__}>
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
      </QueryProvider>
    </SafeAreaProvider>
  );
}
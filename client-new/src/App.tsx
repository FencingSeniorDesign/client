/**
 * App.tsx - Main application component
 */
import { Assets as NavigationAssets } from '@react-navigation/elements';
import { Asset } from 'expo-asset';
import * as SplashScreen from 'expo-splash-screen';
import * as React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppState, AppStateStatus } from 'react-native';

// Import our custom infrastructure
import { QueryProvider } from './infrastructure/query';
import { 
  initializeDatabase, 
  exportDatabaseState, 
  scheduleBackups 
} from './infrastructure/database';
import { 
  initializeNetworkStatusInfrastructure, 
  useNetworkStatus 
} from './infrastructure/networking';
import Navigation from './navigation';

// Load assets
Asset.loadAsync([
  ...NavigationAssets,
  require('./assets/logo.png'),
]);

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [isReady, setIsReady] = React.useState(false);
  const networkStatus = useNetworkStatus();
  const appState = React.useRef(AppState.currentState);
  
  // Initialize the app when it starts
  React.useEffect(() => {
    const init = async () => {
      try {
        // Initialize database
        await initializeDatabase();
        console.log('Database initialized');
        
        // Initialize network monitoring
        initializeNetworkStatusInfrastructure();
        console.log('Network monitoring initialized');
        
        // Schedule database backups (every 30 minutes)
        const cleanupBackups = scheduleBackups(1000 * 60 * 30);
        
        // App is ready
        setIsReady(true);
        
        return () => {
          cleanupBackups();
        };
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };
    
    init();
  }, []);
  
  // Handle app state changes
  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      // When app comes to the foreground from background
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('App has come to the foreground');
      }
      
      // When app goes to the background
      if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        console.log('App has gone to the background');
        // Backup the database when app goes to background
        exportDatabaseState().catch(err => {
          console.error('Failed to backup database:', err);
        });
      }
      
      appState.current = nextAppState;
    });
    
    return () => {
      subscription.remove();
    };
  }, []);

  if (!isReady) {
    return null; // Show nothing until everything is initialized
  }

  return (
    <SafeAreaProvider>
      <QueryProvider 
        enableDevtools={__DEV__}
        enablePersistence={true} // Enable query persistence
      >
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
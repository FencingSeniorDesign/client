// App.tsx
import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { copyDatabaseIfNotExists, openDatabase } from '../src/db/DatabaseInit';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Keep splash screen visible while we do async stuff
SplashScreen.preventAutoHideAsync();

export function App() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // 1. Copy database to device (if it isn't there yet)
        await copyDatabaseIfNotExists();

        // 2. If you want to test opening right away:
        const db = openDatabase();
        // Example test transaction (optional):
        db.transaction((tx: any) => {
            tx.executeSql(
              'SELECT 1 as testVal',
              [],
              (_: any, result: any) => {
                console.log('Test query success:', result.rows._array);
              },
              (_: any, error: any) => {
                console.log('Test query error:', error);
                return false;
              }
            );
          });
      } catch (error) {
        console.error('Error in database init:', error);
      } finally {
        setDbReady(true);
        SplashScreen.hideAsync(); // Hide the splash screen
      }
    })();
  }, []);

  if (!dbReady) {
    return <Text>Loading DB...</Text>;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Your main app navigation or screens go here */}
      <Text>Your app is now ready!</Text>
    </GestureHandlerRootView>
  );
}

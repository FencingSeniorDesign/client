import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Navigation will be imported from the new structure
// import Navigation from './navigation';

// Example of importing from the new structure
// import { TournamentDataProvider } from './infrastructure/state/providers/TournamentDataProvider';
// import { ConnectionStatusBar } from './infrastructure/networking/components/ConnectionStatusBar';

export default function App() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        {/* Example of how the app would be structured with the new organization */}
        {/* <TournamentDataProvider> */}
          <React.Fragment>
            {/* <Navigation /> */}
            {/* <ConnectionStatusBar /> */}
            <Text>New domain-based structure</Text>
          </React.Fragment>
        {/* </TournamentDataProvider> */}
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
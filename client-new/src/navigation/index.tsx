/**
 * Navigation configuration
 */
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import React from 'react';

// Import screens from their domain locations
import { Home } from '../features/tournaments/screens/Home';
import { CreateTournamentModal } from '../features/tournaments/components/CreateTournamentModal';
import { JoinTournamentModal } from '../features/tournaments/components/JoinTournamentModal';

import { EventManagement } from '../features/events/screens/EventManagement';
import { EventSettings } from '../features/events/screens/EventSettings';

import { PoolsPage } from '../features/rounds/pool/screens/PoolsPage';
import { BoutOrderPage } from '../features/rounds/pool/screens/BoutOrderPage';

import { DEBracketPage } from '../features/rounds/de/screens/DEBracketPage';
import { DoubleEliminationPage } from '../features/rounds/de/double/screens/DoubleEliminationPage';
import { CompassDrawPage } from '../features/rounds/de/compass/screens/CompassDrawPage';
import { RoundResults } from '../features/rounds/results/screens/RoundResults';

import { ManageOfficials } from '../features/officials/screens/ManageOfficials';
import { RefereeModule } from '../features/referee/screens/RefereeModule';

import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

interface NavigationProps {
  linking?: any;
  onReady?: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ linking, onReady }) => {
  return (
    <NavigationContainer linking={linking} onReady={onReady}>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen 
          name="Home" 
          component={Home} 
          options={{ 
            title: 'Home',
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="CreateTournament" 
          component={CreateTournamentModal} 
          options={{ title: 'Create Tournament' }}
        />
        <Stack.Screen 
          name="JoinTournament" 
          component={JoinTournamentModal} 
          options={{ title: 'Join Tournament' }}
        />
        <Stack.Screen 
          name="EventManagement" 
          component={EventManagement} 
          options={{ title: 'Edit Tournament' }}
        />
        <Stack.Screen 
          name="EventSettings" 
          component={EventSettings} 
          options={{ title: 'Event Settings' }}
        />
        <Stack.Screen 
          name="Pools" 
          component={PoolsPage} 
          options={{ title: 'Pools' }}
        />
        <Stack.Screen 
          name="BoutOrder" 
          component={BoutOrderPage} 
          options={{ title: 'Bout Order' }}
        />
        <Stack.Screen 
          name="DEBracket" 
          component={DEBracketPage} 
          options={{ title: 'Single Elimination' }}
        />
        <Stack.Screen 
          name="DoubleElimination" 
          component={DoubleEliminationPage} 
          options={{ title: 'Double Elimination' }}
        />
        <Stack.Screen 
          name="CompassDraw" 
          component={CompassDrawPage} 
          options={{ title: 'Compass Draw' }}
        />
        <Stack.Screen 
          name="RoundResults" 
          component={RoundResults} 
          options={{ title: 'Round Results' }}
        />
        <Stack.Screen 
          name="ManageOfficials" 
          component={ManageOfficials} 
          options={{ title: 'Manage Officials' }}
        />
        <Stack.Screen 
          name="RefereeModule" 
          component={RefereeModule} 
          options={{ title: 'Referee Module' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Navigation;
// index.tsx
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createStaticNavigation, StaticParamList } from '@react-navigation/native';

import {Home} from './screens/Home';
import { EventManagement } from './screens/EventManagement';
import { EventSettings } from './screens/EventSettings';
import { RefereeModule } from './screens/RefereeModule/RefereeModule';
import PoolsPage from './screens/PoolsPage';

// NEW: Import the new BoutOrderPage
import BoutOrderPage from './screens/BoutOrderPage';

const RootStack = createNativeStackNavigator({
  screens: {
    HomeTabs: {
      screen: Home,
      options: {
        title: 'Home',
        headerShown: false,
      },
    },
    EventManagement: {
      screen: EventManagement,
      options: {
        title: 'Event Management',
      },
    },
    EventSettings: {
      screen: EventSettings,
      options: {
        title: 'Event Settings',
      },
    },
    RefereeModule: {
      screen: RefereeModule,
      options: {
        title: 'Referee Module',
      },
    },
    PoolsPage: {
      screen: PoolsPage,
      options: {
        title: 'Pools',
      },
    },
    // ADD THIS SCREEN
    BoutOrderPage: {
      screen: BoutOrderPage,
      options: {
        title: 'Bout Order',
      },
    },
  },
});

export const Navigation = createStaticNavigation(RootStack);

export type RootStackParamList = StaticParamList<typeof RootStack>;

// Extend React Navigation types with our RootStackParamList
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

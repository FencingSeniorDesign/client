// index.tsx

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createStaticNavigation, StaticParamList } from '@react-navigation/native';

import { Home } from './screens/Home';
import { EventManagement } from './screens/EventManagement';
import { EventSettings } from './screens/EventSettings';
import { RefereeModule } from './screens/RefereeModule/RefereeModule';
import PoolsPage from './screens/PoolsPage';
import BoutOrderPage from './screens/BoutOrderPage';

/**
 * NEW: import your DEBracketPage
 * (wherever you put it, e.g. ./screens/DEBracketPage)
 */
import DEBracketPage from './screens/DEBracketPage';

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
        title: 'Edit Tournament',
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
    BoutOrderPage: {
      screen: BoutOrderPage,
      options: {
        title: 'Bout Order',
      },
    },
    /**
     * REGISTER THE NEW DE BRACKET SCREEN
     */
    DEBracketPage: {
      screen: DEBracketPage,
      options: {
        title: 'DE Bracket',
      },
    },
  },
});

export const Navigation = createStaticNavigation(RootStack);

export type RootStackParamList = StaticParamList<typeof RootStack>;

/**
 * Extend ReactNavigation's global types so
 * "useNavigation()" and "useRoute()" know about your routes
 */
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

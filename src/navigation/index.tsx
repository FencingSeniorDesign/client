// src/navigation/index.tsx
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createStaticNavigation } from '@react-navigation/native';
import React from 'react';
import { Home } from './screens/Home';
import { EventManagement } from './screens/EventManagement';
import { EventSettings } from './screens/EventSettings';
import { RefereeModule } from './screens/RefereeModule/RefereeModule';
import PoolsPage from './screens/PoolsPage';
import BoutOrderPage from './screens/BoutOrderPage';
import RoundResults from "./screens/RoundResults";
import DEBracketPage from './screens/DEBracketPage';
import DoubleEliminationPage from './screens/DoubleEliminationPage';
import CompassDrawPage from './screens/CompassDrawPage';

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
    RoundResults: {
      screen: RoundResults,
    },
    DEBracketPage: {
      screen: DEBracketPage,
      options: {
        title: 'Single Elimination',
      },
    },
    DoubleEliminationPage: {
      screen: DoubleEliminationPage,
      options: {
        title: 'Double Elimination',
      },
    },
    CompassDrawPage: {
      screen: CompassDrawPage,
      options: {
        title: 'Compass Draw',
      },
    }
  },
});

// Create the static navigation with the stack
export const Navigation = createStaticNavigation(RootStack);
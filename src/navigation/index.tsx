import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HeaderButton, Text } from '@react-navigation/elements';
import {
  createStaticNavigation,
  StaticParamList,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home } from './screens/Home';

import { EditTournament } from "./screens/EditTournament"
import { RefereeModule } from "./screens/RefereeModule/RefereeModule";


const RootStack = createNativeStackNavigator({
  screens: {
    HomeTabs: {
      screen: Home,
      options: {
        title: 'Home',
        headerShown: false,
      },
    },
    // HomeTabs: {
    //   screen: HomeTabs,
    //   options: {
    //     title: 'Home',
    //     headerShown: false,
    //   },
    // },
    // Profile: {
    //   screen: Profile,
    //   linking: {
    //     path: ':user(@[a-zA-Z0-9-_]+)',
    //     parse: {
    //       user: (value) => value.replace(/^@/, ''),
    //     },
    //     stringify: {
    //       user: (value) => `@${value}`,
    //     },
    //   },
    // },
    // Settings: {
    //   screen: Settings,
    //   options: ({ navigation }) => ({
    //     presentation: 'modal',
    //     headerRight: () => (
    //       <HeaderButton onPress={navigation.goBack}>
    //         <Text>Close</Text>
    //       </HeaderButton>
    //     ),
    //   }),
    // },
    EditTournament: {
      screen: EditTournament,
      options: ({ navigation }) => ({
        // presentation: 'modal',
      }),
    },
    RefereeModule: {
      screen: RefereeModule,
      options: {
        title: 'Referee Module',
      },
    },

  },
});

export const Navigation = createStaticNavigation(RootStack);

type RootStackParamList = StaticParamList<typeof RootStack>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

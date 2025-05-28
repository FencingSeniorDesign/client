import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createStaticNavigation } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { Home } from './screens/Home';
import { EventManagement } from './screens/EventManagement';
import { EventSettings } from './screens/EventSettings';
import { RefereeModule } from './screens/RefereeModule/RefereeModule';
import PoolsPage from './screens/PoolsPage';
import BoutOrderPage from './screens/BoutOrderPage';
import RoundResults from './screens/RoundResults';
import DEBracketPage from './screens/DEBracketPage';
import DoubleEliminationPage from './screens/DoubleEliminationPage';
import CompassDrawPage from './screens/CompassDrawPage';
import ManageOfficials from './screens/ManageOfficials';
import TournamentResultsPage from './screens/TournamentResultsPage'; // Add this import
import TeamManagement from './screens/TeamManagement';
import TeamRoundRobinPage from './screens/TeamRoundRobinPage';
import TeamBoutOrderPage from './screens/TeamBoutOrderPage';
import NCAATeamBoutPage from './screens/NCAATeamBoutPage';
import RelayTeamBoutPage from './screens/RelayTeamBoutPage';
import TeamDEBracketPage from './screens/TeamDEBracketPage';
import i18n from '../i18n';
import { useTranslation } from 'react-i18next';
import * as SplashScreen from 'expo-splash-screen';

const RootStack = createNativeStackNavigator({
    screens: {
        HomeTabs: {
            screen: Home,
            options: () => ({
                title: i18n.t('home.title'),
                headerShown: false,
            }),
        },
        EventManagement: {
            screen: EventManagement,
            options: () => ({
                title: i18n.t('eventManagement.editTournament'),
            }),
        },
        EventSettings: {
            screen: EventSettings,
            options: () => ({
                title: i18n.t('eventSettings.title'),
            }),
        },
        RefereeModule: {
            screen: RefereeModule,
            options: () => ({
                title: i18n.t('refereeModule.title'),
            }),
        },
        PoolsPage: {
            screen: PoolsPage,
            options: () => ({
                title: i18n.t('poolsPage.title'),
            }),
        },
        BoutOrderPage: {
            screen: BoutOrderPage,
            options: () => ({
                title: i18n.t('boutOrderPage.poolBouts'),
            }),
        },
        RoundResults: {
            screen: RoundResults,
            options: () => ({
                title: i18n.t('roundResults.title'),
            }),
        },
        DEBracketPage: {
            screen: DEBracketPage,
            options: () => ({
                title: i18n.t('deBracketPage.singleElimination'),
            }),
        },
        DoubleEliminationPage: {
            screen: DoubleEliminationPage,
            options: () => ({
                title: i18n.t('deBracketPage.doubleElimination'),
            }),
        },
        CompassDrawPage: {
            screen: CompassDrawPage,
            options: () => ({
                title: i18n.t('compassDrawPage.title'),
            }),
        },
        ManageOfficials: {
            screen: ManageOfficials,
            options: () => ({
                title: i18n.t('manageOfficials.title'),
            }),
        },
        TournamentResultsPage: {
            screen: TournamentResultsPage,
            options: () => ({
                title: i18n.t('tournamentResults.title'),
            }),
        },
        TeamManagement: {
            screen: TeamManagement,
            options: () => ({
                title: i18n.t('teamManagement.teams'),
            }),
        },
        TeamRoundRobinPage: {
            screen: TeamRoundRobinPage,
            options: () => ({
                title: i18n.t('poolsPage.title'),
            }),
        },
        TeamBoutOrderPage: {
            screen: TeamBoutOrderPage,
            options: () => ({
                title: i18n.t('teamBoutOrderPage.teamBouts'),
            }),
        },
        NCAATeamBoutPage: {
            screen: NCAATeamBoutPage,
            options: () => ({
                title: i18n.t('ncaaTeamBoutPage.title'),
            }),
        },
        RelayTeamBoutPage: {
            screen: RelayTeamBoutPage,
            options: () => ({
                title: i18n.t('relayTeamBoutPage.title'),
            }),
        },
        TeamDEBracketPage: {
            screen: TeamDEBracketPage,
            options: () => ({
                title: i18n.t('teamDEBracketPage.title'),
            }),
        },
    },
});

// Create the static navigation with the stack
export const Navigation = createStaticNavigation(RootStack);

// React component wrapper for navigation to make it reactive to language changes
export const AppNavigator = () => {
    const { t, i18n: i18nHook } = useTranslation();

    // This effect will make screen titles refresh when language changes
    useEffect(() => {
        // The screen titles will be automatically re-evaluated when language changes
        // because we're using function options instead of static strings
    }, [i18nHook.language]);

    return (
        <Navigation
            linking={{
                enabled: 'auto',
                prefixes: [
                    // Change the scheme to match your app's scheme defined in app.json
                    'helloworld://',
                ],
            }}
            onReady={() => {
                if (typeof SplashScreen !== 'undefined' && SplashScreen.hideAsync) {
                    SplashScreen.hideAsync();
                }
            }}
        />
    );
};

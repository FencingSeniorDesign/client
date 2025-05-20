import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import tournamentClient from '../TournamentClient';
import { RootStackParamList } from '../../navigation/navigation/types';
import { useTranslation } from 'react-i18next';
import { useAbility } from '../../rbac/AbilityContext';

/**
 * Component that listens for connection events and handles them
 * This component does not render anything, it just listens for events
 */
export const ConnectionEventHandler: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { t } = useTranslation();
    const { setTournamentContext } = useAbility();

    useEffect(() => {
        // Handle unexpected connection lost
        const handleConnectionLost = (clientInfo: any) => {
            console.log('Connection lost:', clientInfo);
            
            // Show a toast or notification to the user
            Alert.alert(
                t('connectionStatus.connectionLost'),
                t('connectionStatus.connectionLostMessage'),
                [
                    {
                        text: t('common.ok'),
                        onPress: () => {
                            // This happens automatically when alert is dismissed
                        }
                    }
                ]
            );

            // Reset ability context
            setTournamentContext(null);
            
            // Navigate back to home screen
            navigation.dispatch(
                CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'HomeTabs' }]
                })
            );
        };

        // Add event listener
        tournamentClient.on('connectionLost', handleConnectionLost);

        // Clean up
        return () => {
            tournamentClient.removeListener('connectionLost', handleConnectionLost);
        };
    }, [navigation, t, setTournamentContext]);

    // This component doesn't render anything
    return null;
};

export default ConnectionEventHandler;
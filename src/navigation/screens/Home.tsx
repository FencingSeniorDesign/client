// src/navigation/screens/Home.tsx with Join Tournament functionality
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { CreateTournamentButton } from './CreateTournamentModal';
import { TournamentList } from './TournamentListComponent';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack'; // Import navigation prop type
import { Tournament, RootStackParamList } from '../navigation/types'; // Import RootStackParamList
import { JoinTournamentModal } from './JoinTournamentModal';
import tournamentClient from '../../networking/TournamentClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { useOngoingTournaments, useCompletedTournaments } from '../../data/TournamentDataHooks';
import { getDeviceId } from '../../networking/NetworkUtils';
import { useAbility } from '../../rbac/AbilityContext'; // Import useAbility
import { useTranslation } from 'react-i18next'; // Import translation hook
import LanguageSwitcher from '../../components/ui/LanguageSwitcher';
import { BLEStatusBar } from '../../networking/components/BLEStatusBar';
import { ConnectionLostModal } from '../../networking/components/ConnectionLostModal';

// Import the logo image
import logo from '../../assets/logo.png';

export function Home() {
    // Explicitly type the navigation prop
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const queryClient = useQueryClient();
    const { setTournamentContext } = useAbility(); // Get the context setter
    const { t } = useTranslation(); // Initialize the translation hook

    // State for join tournament modal
    const [joinModalVisible, setJoinModalVisible] = useState(false);
    const [deviceId, setDeviceId] = useState<string>('');

    // Use TanStack Query hooks for tournaments
    const ongoingTournamentsQuery = useOngoingTournaments();
    const completedTournamentsQuery = useCompletedTournaments();

    // State for saved remote tournaments
    const [savedRemoteTournaments, setSavedRemoteTournaments] = useState<any[]>([]);
    
    // Connection lost state
    const [connectionLostModalVisible, setConnectionLostModalVisible] = useState(false);
    const [lostConnectionInfo, setLostConnectionInfo] = useState<any>(null);

    // Listen for connection lost events
    useEffect(() => {
        const handleConnectionLost = (clientInfo: any) => {
            console.log('Connection lost event received in Home', clientInfo);
            // Only show the modal if we have connection info
            if (clientInfo) {
                setLostConnectionInfo(clientInfo);
                setConnectionLostModalVisible(true);
                console.log('Setting connection lost modal to visible in Home');
            }
        };
        
        // Add the event listener
        tournamentClient.on('connectionLost', handleConnectionLost);
        
        return () => {
            // Remove the event listener when component unmounts
            tournamentClient.off('connectionLost', handleConnectionLost);
        };
    }, []);
    
    // Get device ID and saved remote tournaments on load
    useEffect(() => {
        const initializeData = async () => {
            // Load client info but don't maintain connection
            await tournamentClient.loadClientInfo();
            
            // Get saved remote tournaments
            const remoteTournaments = await tournamentClient.getSavedRemoteTournaments();
            setSavedRemoteTournaments(remoteTournaments);
            
            // Get and set device ID
            const id = await getDeviceId();
            setDeviceId(id);
        };

        initializeData();
    }, []);
    
    // Automatically disconnect when returning to Home screen
    useFocusEffect(
        React.useCallback(() => {
            const disconnectFromTournament = async () => {
                if (tournamentClient.isConnected()) {
                    // Save the tournament before disconnecting
                    await tournamentClient.saveRemoteTournament();
                    
                    // Set flags to prevent alert and connection lost modal
                    tournamentClient.isShowingDisconnectAlert = true;
                    tournamentClient.isIntentionalDisconnect = true;
                    
                    // Disconnect and reset context
                    await tournamentClient.disconnect();
                    setTournamentContext(null); // Reset the ability context
                    tournamentClient.isShowingDisconnectAlert = false;
                    
                    // Refresh the saved remote tournaments list
                    const remoteTournaments = await tournamentClient.getSavedRemoteTournaments();
                    setSavedRemoteTournaments(remoteTournaments);
                }
            };
            
            disconnectFromTournament();
        }, [])
    );

    const handleJoinSuccess = (tournamentName: string) => {
        // No alert, just proceed silently
    };
    
    // Handle connecting to a saved remote tournament
    const handleConnectToSavedTournament = async (tournament: any) => {
        try {
            // Connect to the tournament without showing alerts
            const success = await tournamentClient.connectToServer(tournament.hostIp, tournament.port);
            
            if (success) {
                // Navigate to the tournament's event management screen
                navigation.navigate('EventManagement', {
                    tournamentName: tournament.tournamentName,
                    isRemoteConnection: true,
                });
            } else {
                console.error('Failed to connect to saved tournament');
            }
        } catch (error) {
            console.error('Error connecting to saved tournament:', error);
        }
    };
    
    // Handle removing a saved remote tournament
    const handleRemoveSavedTournament = async (tournamentName: string) => {
        try {
            await tournamentClient.removeSavedRemoteTournament(tournamentName);
            
            // Refresh the saved remote tournaments list
            const remoteTournaments = await tournamentClient.getSavedRemoteTournaments();
            setSavedRemoteTournaments(remoteTournaments);
        } catch (error) {
            console.error('Error removing saved tournament:', error);
        }
    };

    const refreshTournaments = () => {
        queryClient.invalidateQueries({ queryKey: ['tournaments'] });
    };

    return (
        <>
        <View style={styles.container}>
            {/* BLE connection status */}
            <BLEStatusBar compact={true} />
            
            <Image source={logo} style={styles.logo} resizeMode="contain" />

            <View style={styles.buttonContainer}>
                {/* Create Tournament Button */}
                <CreateTournamentButton onTournamentCreated={refreshTournaments} />

                {/* Join Tournament Button */}
                <TouchableOpacity style={styles.joinButton} onPress={() => setJoinModalVisible(true)}>
                    <MaterialIcons name="people" size={24} color="#fff" style={styles.buttonIcon} />
                    <Text style={styles.buttonText}>{t('home.joinTournament')}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.contentContainer} contentContainerStyle={styles.scrollContent}>
                {/* Saved Remote Tournaments */}
                {savedRemoteTournaments.length > 0 && (
                    <>
                        <Text style={styles.tournamentHistoryTitle}>{t('home.remoteTournaments')}</Text>
                        <View style={[styles.ongoingTournamentsContainer, { maxHeight: 'auto' }]}>
                            {savedRemoteTournaments.map((tournament, index) => (
                                <View key={index} style={styles.tournamentContainer}>
                                    <TouchableOpacity 
                                        style={styles.tournamentItem}
                                        onPress={() => handleConnectToSavedTournament(tournament)}
                                    >
                                        <Text style={styles.tournamentName}>{tournament.tournamentName}</Text>
                                        <Text style={styles.tournamentInfo}>{tournament.hostIp}:{tournament.port}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={styles.deleteButton} 
                                        onPress={() => handleRemoveSavedTournament(tournament.tournamentName)}
                                    >
                                        <MaterialIcons name="link-off" size={20} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    </>
                )}
                
                {/* Ongoing Tournaments */}
                <Text style={styles.tournamentHistoryTitle}>{t('home.ongoingTournaments')}</Text>
                <View style={styles.ongoingTournamentsContainer}>
                    {ongoingTournamentsQuery.isLoading ? (
                        <ActivityIndicator size="large" color="#001f3f" />
                    ) : ongoingTournamentsQuery.isError ? (
                        <Text style={styles.errorText}>{t('home.errorLoadingTournaments')}</Text>
                    ) : (
                        <TournamentList
                            tournaments={ongoingTournamentsQuery.data || []}
                            onTournamentDeleted={refreshTournaments}
                            isComplete={false}
                        />
                    )}
                </View>

                {/* Tournament History Section */}
                <Text style={styles.tournamentHistoryTitle}>{t('home.tournamentHistory')}</Text>
                <View style={styles.historyContainer}>
                    {completedTournamentsQuery.isLoading ? (
                        <ActivityIndicator size="large" color="#001f3f" />
                    ) : completedTournamentsQuery.isError ? (
                        <Text style={styles.errorText}>{t('home.errorLoadingHistory')}</Text>
                    ) : (
                        <TournamentList
                            tournaments={completedTournamentsQuery.data || []}
                            onTournamentDeleted={refreshTournaments}
                            isComplete={true}
                        />
                    )}
                </View>
            </ScrollView>

            {/* Device ID display */}
            <Text style={styles.deviceIdText}>
                {t('home.deviceId')} {deviceId}
            </Text>

            {/* Language Switcher */}
            <View style={styles.languageSwitcherContainer}>
                <LanguageSwitcher />
            </View>

            {/* Referee Module Button */}
            <TouchableOpacity
                style={styles.refereeButton}
                onPress={() =>
                    navigation.navigate('RefereeModule', {
                        boutIndex: 0,
                        fencer1Name: t('refereeModule.defaultLeft'),
                        fencer2Name: t('refereeModule.defaultRight'),
                        currentScore1: 0,
                        currentScore2: 0,
                        /* onSaveScores: undefined - Optional */
                    })
                }
            >
                <MaterialIcons name="timer" size={24} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>{t('home.refereeModule')}</Text>
            </TouchableOpacity>

            {/* Join Tournament Modal */}
            <JoinTournamentModal
                visible={joinModalVisible}
                onClose={() => setJoinModalVisible(false)}
                onJoinSuccess={handleJoinSuccess}
            />
            
            {/* Connection Lost Modal */}
            <ConnectionLostModal
                visible={connectionLostModalVisible}
                clientInfo={lostConnectionInfo}
                onReconnect={async () => {
                    if (lostConnectionInfo) {
                        try {
                            // Try to reconnect
                            const success = await tournamentClient.connectToServer(
                                lostConnectionInfo.hostIp,
                                lostConnectionInfo.port
                            );
                            
                            if (success) {
                                setConnectionLostModalVisible(false);
                                // Navigate to EventManagement on success
                                navigation.navigate('EventManagement', {
                                    tournamentName: lostConnectionInfo.tournamentName,
                                    isRemoteConnection: true,
                                });
                            } else {
                                // Connection failed, keep modal open
                                Alert.alert(t('home.failedToConnect'));
                            }
                        } catch (error) {
                            console.error('Error reconnecting:', error);
                            Alert.alert(t('home.failedToConnect'));
                        }
                    }
                }}
                onBackToHome={() => {
                    setConnectionLostModalVisible(false);
                    // Already on home screen, so just close modal
                }}
            />
        </View>
        </>
    );
}

const styles = StyleSheet.create({
    // Tournament Styles - for both local and remote tournaments
    tournamentContainer: {
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        marginVertical: 6,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        overflow: 'hidden',
    },
    tournamentItem: {
        flex: 1,
        padding: 16,
    },
    tournamentName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333333',
        marginBottom: 4,
    },
    tournamentInfo: {
        fontSize: 12,
        color: '#666666',
    },
    container: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
        backgroundColor: '#f8f9fa',
    },
    logo: {
        width: 280,
        height: 140,
        marginBottom: 20,
    },
    deviceIdText: {
        fontSize: 12,
        color: '#666',
        marginBottom: 5,
        alignSelf: 'center',
    },
    languageSwitcherContainer: {
        width: '100%',
        marginBottom: 15,
    },
    buttonContainer: {
        width: '100%',
        flexDirection: 'column',
        marginBottom: 15,
        gap: 10,
    },
    contentContainer: {
        width: '100%',
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 20,
        flexGrow: 1,
    },
    customButton: {
        backgroundColor: '#001f3f',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '48%',
        height: 50, // Fixed height
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    buttonIcon: {
        marginRight: 8,
    },
    refereeButton: {
        backgroundColor: '#001f3f',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '90%',
        height: 50, // Match other buttons
        marginVertical: 15,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    ongoingTournamentsContainer: {
        width: '100%',
        backgroundColor: '#ffffff',
        padding: 15,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'flex-start',
        minHeight: 100,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        maxHeight: 'auto',
        overflow: 'visible',
    },
    historyContainer: {
        width: '100%',
        backgroundColor: '#ffffff',
        padding: 15,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'flex-start',
        minHeight: 100,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        maxHeight: 'auto',
        overflow: 'visible',
    },
    tournamentHistoryTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333333',
        marginTop: 10,
        marginBottom: 10,
        alignSelf: 'flex-start',
        paddingLeft: 5,
    },
    joinButton: {
        backgroundColor: '#228B22',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: 50, // Match the Create Tournament button height
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    errorText: {
        color: '#ff3b30',
        fontSize: 16,
        textAlign: 'center',
        padding: 10,
        fontWeight: '500',
    },
    deleteButton: {
        padding: 16,
        backgroundColor: '#ff3b30',
        justifyContent: 'center',
        alignItems: 'center',
        width: 50,
    },
    deleteButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

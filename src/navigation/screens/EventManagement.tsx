// src/navigation/screens/EventManagement.tsx - Updated for remote connections
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Button,
    Modal,
    TouchableOpacity,
    Alert,
    ScrollView,
    TextInput,
    BackHandler,
    ActivityIndicator,
} from 'react-native';
import { useNavigation, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Event, Round, Fencer } from '../navigation/types';
import { navigateToDEPage } from '../utils/DENavigationUtil';
import tournamentServer from '../../networking/TournamentServer';
import tournamentClient from '../../networking/TournamentClient';
import { getLocalIpAddress, isConnectedToInternet, getNetworkInfo } from '../../networking/NetworkUtils';
import ConnectionStatusBar from '../../networking/components/ConnectionStatusBar';
import { useQueryClient } from '@tanstack/react-query';
import {
    useEvents,
    useCreateEvent,
    useEventStatuses,
    useDeleteEvent,
    useRounds,
    useFencers,
    useInitializeRound,
    queryKeys,
} from '../../data/TournamentDataHooks';
import dataProvider from '../../data/DrizzleDataProvider';
import { PermissionsDisplay } from '../../rbac/PermissionsDisplay';
import { Can } from '../../rbac/Can';
import { useAbility } from '../../rbac/AbilityContext';
import { useTranslation } from 'react-i18next';
import { BLEStatusBar } from '../../networking/components/BLEStatusBar';
import { ConnectionLostModal } from '../../networking/components/ConnectionLostModal';

type Props = {
    route: RouteProp<{ params: { tournamentName: string; isRemoteConnection?: boolean } }, 'params'>;
};

export const EventManagement = ({ route }: Props) => {
    const { tournamentName, isRemoteConnection = false } = route.params;
    const queryClient = useQueryClient();
    const { t } = useTranslation();

    // Use TanStack Query for fetching events
    const { data: events = [], isLoading: eventsLoading, isError: eventsError } = useEvents(tournamentName);

    // We'll use TanStack Query for event statuses instead of local state
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [editingEventId, setEditingEventId] = useState<number | null>(null);

    // Fields for event creation
    const [selectedGender, setSelectedGender] = useState<string>('Mixed');
    const [selectedWeapon, setSelectedWeapon] = useState<string>('Foil');
    const [selectedAge, setSelectedAge] = useState<string>('Senior');

    // Server hosting state
    const [serverEnabled, setServerEnabled] = useState(false);
    const [serverInfo, setServerInfo] = useState<{ ip: string | null; port: number } | null>(null);
    const [localIpAddress, setLocalIpAddress] = useState<string | null>(null);
    const [serverOperationPending, setServerOperationPending] = useState(false);

    // Network connectivity state
    const [isNetworkConnected, setIsNetworkConnected] = useState(true);
    const [networkInfo, setNetworkInfo] = useState<any>(null);

    // Remote connection state
    const [isRemote, setIsRemote] = useState(isRemoteConnection);
    const [remoteConnectionInfo, setRemoteConnectionInfo] = useState<{
        tournamentName: string;
        hostIp: string;
        port: number;
    } | null>(null);

    // Connection lost state
    const [connectionLostModalVisible, setConnectionLostModalVisible] = useState(false);
    const [lostConnectionInfo, setLostConnectionInfo] = useState<any>(null);

    // Use TanStack Query mutation for creating events
    const createEventMutation = useCreateEvent();

    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { ability } = useAbility();

    // Listen for connection lost events
    useEffect(() => {
        const handleConnectionLost = (clientInfo: any) => {
            console.log('Connection lost event received in EventManagement', clientInfo);
            if (isRemote) {
                // Store the info and show the modal
                setLostConnectionInfo(clientInfo);
                setConnectionLostModalVisible(true);
                console.log('Setting connection lost modal to visible');
            }
        };

        // Add the event listener
        tournamentClient.on('connectionLost', handleConnectionLost);

        return () => {
            // Remove the event listener when component unmounts
            tournamentClient.off('connectionLost', handleConnectionLost);
        };
    }, [isRemote]);

    // Custom back button handling for remote connections
    useEffect(() => {
        if (isRemote) {
            const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
                // Show a confirmation dialog before disconnecting
                Alert.alert(t('eventManagement.disconnectTournament'), t('eventManagement.disconnectConfirm'), [
                    {
                        text: t('common.cancel'),
                        style: 'cancel',
                        onPress: () => {},
                    },
                    {
                        text: t('home.disconnect'),
                        style: 'destructive',
                        onPress: () => {
                            // Set flags to prevent alert and connection lost modal
                            tournamentClient.isShowingDisconnectAlert = true;
                            tournamentClient.isIntentionalDisconnect = true;
                            tournamentClient.disconnect();
                            // Reset the flag after navigation
                            setTimeout(() => {
                                tournamentClient.isShowingDisconnectAlert = false;
                            }, 500);
                            navigation.goBack();
                        },
                    },
                ]);
                return true; // prevents default back button behavior
            });

            return () => backHandler.remove();
        }
        return undefined;
    }, [isRemote, navigation, t]);

    // Get connection info when in remote mode
    useEffect(() => {
        if (isRemote) {
            const clientInfo = tournamentClient.getClientInfo();
            if (clientInfo) {
                // Use the exact tournamentName from the client info rather than a default
                // This ensures we're using the name the server provided
                console.log(`Setting remote connection info with tournament name: ${clientInfo.tournamentName}`);

                // Update both the connection info and parameters used throughout the component
                const actualTournamentName = clientInfo.tournamentName || tournamentName || 'Tournament';

                setRemoteConnectionInfo({
                    tournamentName: actualTournamentName,
                    hostIp: clientInfo.hostIp,
                    port: clientInfo.port,
                });

                // Also explicitly request events list when in remote mode
                if (isRemote && tournamentClient.isConnected()) {
                    console.log(
                        `Requesting events list for tournament "${actualTournamentName}" from EventManagement component`
                    );
                    tournamentClient.sendMessage({
                        type: 'get_events',
                    });

                    // Don't send get_event_statuses if the server doesn't support it
                    // This is based on the server logs showing it doesn't recognize this type
                    // We'll handle status calculation differently
                }
            }
        }
    }, [isRemote, tournamentName]);

    // Connection alerts are now handled by the ConnectionAlertProvider in App.tsx

    // Use TanStack Query to get event statuses
    const { data: eventStatuses = {}, isLoading: eventStatusesLoading } = useEventStatuses(events);

    // Function to check actual server status
    const checkServerStatus = useCallback(async () => {
        await tournamentServer.loadServerInfo();
        const info = tournamentServer.getServerInfo();
        const isRunning = tournamentServer.isServerRunning();

        // Update UI state based on actual server status
        setServerEnabled(isRunning);

        if (isRunning && info) {
            setServerInfo({
                ip: info.hostIp === '0.0.0.0' ? localIpAddress : info.hostIp,
                port: info.port,
            });
        } else if (!isRunning) {
            setServerInfo(null);
        }

        return isRunning;
    }, [localIpAddress]);

    // Function to check network connectivity
    const checkNetworkConnectivity = useCallback(async () => {
        try {
            const connected = await isConnectedToInternet();
            setIsNetworkConnected(connected);

            // Get detailed network info if needed
            if (serverEnabled || !connected) {
                const info = await getNetworkInfo();
                setNetworkInfo(info);
            }

            return connected;
        } catch (error) {
            //console.error('Error checking network connectivity:', error);
            setIsNetworkConnected(false);
            return false;
        }
    }, [serverEnabled]);

    // This effect runs when component mounts
    useEffect(() => {
        // Get the local IP address and check connectivity
        const initializeNetworking = async () => {
            const ip = await getLocalIpAddress();
            setLocalIpAddress(ip);

            await checkNetworkConnectivity();
            await checkServerStatus();
        };

        initializeNetworking();

        // Set up periodic checks (every 5 seconds)
        const serverStatusInterval = setInterval(() => {
            checkServerStatus();
        }, 5000);

        const networkCheckInterval = setInterval(() => {
            checkNetworkConnectivity();
        }, 10000); // Check network less frequently

        // Clean up intervals on unmount
        return () => {
            clearInterval(serverStatusInterval);
            clearInterval(networkCheckInterval);
        };
    }, [checkServerStatus, checkNetworkConnectivity]);

    const openCreateModal = () => {
        setEditingEventId(null);
        setSelectedGender('Mixed');
        setSelectedWeapon('Foil');
        setSelectedAge('Senior');
        setModalVisible(true);
    };

    // Use TanStack Query hook for deleting events
    const deleteEventMutation = useDeleteEvent();

    // When submitting an event creation, include the rounds and pool settings
    const handleSubmitEvent = async () => {
        try {
            const event = {
                weapon: selectedWeapon,
                gender: selectedGender,
                age: selectedAge,
            };

            if (editingEventId === null) {
                // Use the mutation from useTournamentQueries
                await createEventMutation.mutate({
                    tournamentName,
                    event: event as any, // ts-ignore via casting
                });
            }
            setModalVisible(false);
        } catch (error) {
            //Alert.alert(t('common.error'), t('eventManagement.failedToOpenEvent'));
            //console.error(error);
        }
    };

    const handleRemoveEvent = async (id: number) => {
        try {
            deleteEventMutation.mutate(id);
        } catch (error) {
            //console.error('Error deleting event:', error);
        }
    };

    const confirmRemoveEvent = (id: number) => {
        Alert.alert(
            t('eventManagement.confirmDelete'),
            t('eventManagement.confirmDeleteMessage'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('common.confirm'), onPress: () => handleRemoveEvent(id) },
            ],
            { cancelable: true }
        );
    };

    const confirmStartEvent = (id: number) => {
        Alert.alert(
            t('eventManagement.confirmStart'),
            t('eventManagement.confirmStartMessage'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('common.confirm'), onPress: () => handleStartEvent(id) },
            ],
            { cancelable: true }
        );
    };

    const navigateToRoundPage = (event: Event, round: Round, roundIndex: number) => {
        if (!round || !round.type) {
            //console.error('Cannot navigate: round or round.type is undefined');
            //Alert.alert(t('common.error'), t('eventManagement.failedToNavigateRound'));
            return;
        }

        if (round.type === 'pool') {
            navigation.navigate('PoolsPage', {
                event: event,
                currentRoundIndex: roundIndex,
                roundId: round.id,
                isRemote: isRemote, // Pass the isRemote flag to the PoolsPage
            });
        } else if (round.type === 'de') {
            // Pass isRemote flag to the DE navigation utility
            navigateToDEPage(navigation, event, round, roundIndex, isRemote);
        } else {
            //console.error(`Unknown round type: ${round.type}`);
            //Alert.alert(t('common.error'), t('eventManagement.unknownRoundType', { type: round.type }));
        }
    };

    // Use the initialize round mutation hook
    const initializeRoundMutation = useInitializeRound();

    // Create a function to initialize a round and handle navigation
    const initializeAndNavigate = async (
        eventId: number,
        roundId: number,
        event: Event,
        round: Round,
        roundIndex: number
    ) => {
        try {
            console.log(`Initializing round ${roundId} for event ${eventId}`);
            const success = await initializeRoundMutation.mutateAsync({ eventId, roundId });

            if (success) {
                console.log(`Round initialization successful. EventID: ${eventId}, Status now: true`);

                // Log to verify the event status update in the cache
                const statuses = queryClient.getQueryData(queryKeys.eventStatuses);
                console.log('Current event statuses after init:', statuses);

                navigateToRoundPage(event, round, roundIndex);
            } else {
                console.log(`Round initialization failed for event ${eventId}`);
                //Alert.alert(t('common.error'), t('eventManagement.roundNotInitialized'));
            }
        } catch (error) {
            //console.error('Error initializing round:', error);
            //Alert.alert(t('common.error'), t('eventManagement.roundNotInitialized'));
        }
    };

    const handleStartEvent = async (eventId: number) => {
        const eventToStart = events.find(evt => evt.id === eventId);
        if (!eventToStart) return;

        try {
            // Explicitly fetch fencers and rounds to ensure we have the latest data
            // We're not using the hooks' direct return values because this is a function,
            // not a component, so we need to ensure the data is fetched before continuing
            await queryClient.fetchQuery({
                queryKey: queryKeys.fencers(eventId),
                queryFn: () => dataProvider.getFencers(eventToStart), // This is what useFencers calls internally
            });

            await queryClient.fetchQuery({
                queryKey: queryKeys.rounds(eventId),
                queryFn: () => dataProvider.getRounds(eventToStart), // This is what useRounds calls internally
            });

            // Get the freshly fetched data from the cache
            const fencers = queryClient.getQueryData<Fencer[]>(queryKeys.fencers(eventId));
            const rounds = queryClient.getQueryData<Round[]>(queryKeys.rounds(eventId));

            if (!fencers || fencers.length === 0) {
                Alert.alert(t('common.error'), t('eventManagement.cannotStartNoFencers'));
                return;
            }

            if (!rounds || rounds.length === 0) {
                Alert.alert(t('common.error'), t('eventManagement.noRoundsDefinedError'));
                return;
            }

            const poolRoundsWithoutConfig = rounds.filter(
                round => round.type === 'pool' && (!round.poolcount || !round.poolsize)
            );

            if (poolRoundsWithoutConfig.length > 0) {
                Alert.alert(t('common.error'), t('eventManagement.somePoolRoundsNoConfig'));
                return;
            }

            const firstRound = rounds[0];

            if (firstRound.type === 'de') {
                let tableSize = 2;
                while (tableSize < fencers.length) {
                    tableSize *= 2;
                }

                Alert.alert(
                    t('eventManagement.startingDE'),
                    t('eventManagement.bracketSizeMessage', { size: tableSize, count: fencers.length }),
                    [
                        { text: t('common.cancel'), style: 'cancel' },
                        {
                            text: t('eventManagement.continue'),
                            onPress: () =>
                                initializeAndNavigate(eventToStart.id, firstRound.id, eventToStart, firstRound, 0),
                        },
                    ]
                );
            } else {
                await initializeAndNavigate(eventToStart.id, firstRound.id, eventToStart, firstRound, 0);
            }
        } catch (error) {
           // console.error('Error starting event:', error);
            Alert.alert(t('common.error'), t('eventManagement.failedToStartEvent'));
        }
    };

    const handleOpenEvent = async (eventId: number) => {
        console.log('Opening event:', eventId);
        const eventToOpen = events.find(evt => evt.id === eventId);
        if (!eventToOpen) return;

        try {
            console.log('Event to open:', eventToOpen);

            // Fetch the latest rounds data using the proper query key
            await queryClient.fetchQuery({
                queryKey: queryKeys.rounds(eventId),
                queryFn: () => dataProvider.getRounds(eventToOpen), // This is what useRounds calls internally
            });

            // Get the rounds from the query cache
            const rounds = queryClient.getQueryData<Round[]>(queryKeys.rounds(eventId));
            console.log('Retrieved rounds:', rounds);

            if (!rounds || rounds.length === 0) {
                Alert.alert(t('common.error'), t('eventManagement.noRoundsDefinedError'));
                return;
            }

            const poolRoundsWithoutConfig = rounds.filter(
                round => round.type === 'pool' && (!round.poolcount || !round.poolsize)
            );

            if (poolRoundsWithoutConfig.length > 0) {
                Alert.alert(t('common.error'), t('eventManagement.somePoolRoundsNoConfig'));
                return;
            }

            const firstRound = rounds[0];

            if (!firstRound.isstarted) {
                Alert.alert(t('eventManagement.roundNotStarted'), t('eventManagement.initializeRoundMessage'), [
                    { text: t('common.cancel'), style: 'cancel' },
                    { text: t('eventManagement.startRound'), onPress: () => handleStartEvent(eventId) },
                ]);
                return;
            }

            navigateToRoundPage(eventToOpen, firstRound, 0);
        } catch (error) {
            //console.error('Error opening event:', error);
            Alert.alert(t('common.error'), t('eventManagement.failedToOpenEvent'));
        }
    };

    const handleSaveEventSettings = async (updatedEvent: Event) => {
        try {
            // Invalidate events query to refresh the data
            queryClient.invalidateQueries({ queryKey: queryKeys.events(tournamentName) });
        } catch (error) {
           //('Error updating event settings:', error);
        }
    };

    const handleToggleServer = async () => {
        // Don't allow multiple operations in progress
        if (serverOperationPending) return;

        setServerOperationPending(true);

        try {
            if (serverEnabled) {
                // Verify server is actually running before trying to stop it
                const isRunning = await checkServerStatus();
                if (!isRunning) {
                    // Server isn't actually running - reset UI and return
                    setServerEnabled(false);
                    setServerInfo(null);
                    setServerOperationPending(false);
                    return;
                }

                // Stop the server
                const success = await tournamentServer.stopServer();

                // Check actual server status after stop attempt
                const stillRunning = await checkServerStatus();

                if (!stillRunning) {
                    Alert.alert(t('eventManagement.serverStopped'), t('eventManagement.serverStoppedMessage'));
                } else {
                    Alert.alert(t('common.error'), t('eventManagement.serverStopFailed'));
                }
            } else {
                // Check internet connectivity first
                const isConnected = await isConnectedToInternet();
                if (!isConnected) {
                    Alert.alert(t('eventManagement.networkIssue'), t('eventManagement.networkIssueMessage'), [
                        { text: t('common.cancel'), style: 'cancel' },
                        {
                            text: t('eventManagement.startAnyway'),
                            onPress: async () => {
                                await startTournamentServer();
                            },
                        },
                    ]);
                    setServerOperationPending(false);
                    return;
                }

                await startTournamentServer();
            }
        } catch (error) {
           //('Error toggling server:', error);
            //A/lert.alert(t('common.error'), t('eventManagement.unexpectedServerError'));
        } finally {
            setServerOperationPending(false);
        }
    };

    // Extracted method to start the tournament server
    const startTournamentServer = async () => {
        try {
            // Get latest network information for better diagnostics
            const networkInfo = await getNetworkInfo();
            console.log('Network info before starting server:', networkInfo);

            // Start the server
            const tournament = { name: tournamentName, isComplete: false }; // Add isComplete property
            const success = await tournamentServer.startServer(tournament);

            // Verify server actually started
            const isRunning = await checkServerStatus();

            if (isRunning) {
                const info = tournamentServer.getServerInfo();
                if (info) {
                    // Get fresh IP address
                    const currentIp = await getLocalIpAddress();

                    setServerInfo({
                        ip: info.hostIp === '0.0.0.0' ? currentIp : info.hostIp,
                        port: info.port,
                    });

                    Alert.alert(
                        t('eventManagement.serverStarted'),
                        t('eventManagement.serverStartedMessage', { ip: currentIp, port: info.port })
                    );
                }
            } else {
                Alert.alert(t('common.error'), t('eventManagement.serverStartFailed'));
            }
        } catch (error) {
           //('Error starting tournament server:', error);
            //Alert.alert(t('common.error'), t('eventManagement.unexpectedServerError'));
        }
    };

    const handleDisconnect = async () => {
        if (isRemote) {
            Alert.alert(t('eventManagement.disconnectConfirmTitle'), t('eventManagement.disconnectConfirmMessage'), [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('eventManagement.disconnect'),
                    style: 'destructive',
                    onPress: async () => {
                        // Set flags to prevent alert and connection lost modal
                        tournamentClient.isShowingDisconnectAlert = true;
                        tournamentClient.isIntentionalDisconnect = true;
                        await tournamentClient.disconnect();
                        // Reset the flag after navigation
                        setTimeout(() => {
                            tournamentClient.isShowingDisconnectAlert = false;
                        }, 500);
                        navigation.goBack();
                    },
                },
            ]);
        }
    };

    return (
        <>
            <ScrollView contentContainerStyle={styles.container}>
                {/* BLE connection status */}
                {ability.can('score', 'Bout') && <BLEStatusBar compact={true} />}

                {/* Tournament title at the top, centered */}
                <Text style={styles.title}>
                    {isRemote
                        ? remoteConnectionInfo?.tournamentName || tournamentName || t('common.tournament')
                        : tournamentName}
                </Text>

                {/* Display user permissions */}
                <PermissionsDisplay tournamentName={tournamentName} />

                <View style={styles.headerContainer}>
                    {/* IP Address Banner (for server mode only) */}
                    {serverEnabled && localIpAddress && !isRemote && (
                        <View style={styles.ipBanner}>
                            <Text style={styles.ipText}>
                                {t('eventManagement.tournamentIp')} {localIpAddress}
                            </Text>
                            <Text style={styles.ipTextSmall}>
                                {t('eventManagement.port')}: {serverInfo?.port || 9001}
                            </Text>
                            <View style={styles.networkStatusContainer}>
                                <View
                                    style={[
                                        styles.networkStatusIndicator,
                                        isNetworkConnected ? styles.networkConnected : styles.networkDisconnected,
                                    ]}
                                />
                                <Text style={styles.networkStatusText}>
                                    {isNetworkConnected
                                        ? t('eventManagement.networkConnected')
                                        : t('eventManagement.networkDisconnected')}
                                </Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* Server Control Button (only for local tournaments) */}
                {!isRemote && (
                    <TouchableOpacity
                        style={[
                            styles.serverButton,
                            serverEnabled ? styles.serverEnabledButton : styles.serverDisabledButton,
                            serverOperationPending && styles.serverPendingButton,
                        ]}
                        onPress={handleToggleServer}
                        disabled={serverOperationPending}
                    >
                        {serverOperationPending ? (
                            <View style={styles.buttonLoadingContainer}>
                                <ActivityIndicator size="small" color="#fff" />
                                <Text style={styles.serverButtonText}>
                                    {serverEnabled ? t('eventManagement.stopping') : t('eventManagement.starting')}
                                </Text>
                            </View>
                        ) : (
                            <Text style={styles.serverButtonText}>
                                {serverEnabled ? t('eventManagement.disableServer') : t('eventManagement.enableServer')}
                            </Text>
                        )}
                    </TouchableOpacity>
                )}

                {/* Conditionally render Manage Officials button with Can tag and only when server is started */}
                {(serverEnabled || isRemote) && (
                    <Can I="manage" a="Official">
                        <TouchableOpacity
                            style={styles.manageOfficialsButton}
                            onPress={() =>
                                navigation.navigate('ManageOfficials', {
                                    tournamentName: tournamentName,
                                    isRemote: isRemote,
                                })
                            }
                        >
                            <Text style={styles.manageOfficialsText}>{t('eventManagement.manageOfficials')}</Text>
                        </TouchableOpacity>
                    </Can>
                )}

                {/* Use CASL's Can component to enable creating events only if user has permission */}
                <Can I="create" a="Event">
                    <Button
                        title={t('eventManagement.createEvent')}
                        onPress={openCreateModal}
                        disabled={createEventMutation.isPending}
                    />
                </Can>

                {eventsLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#001f3f" />
                        <Text style={styles.loadingText}>{t('common.loading')}</Text>
                    </View>
                ) : eventsError ? (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{t('eventManagement.errorLoading')}</Text>
                    </View>
                ) : (
                    <View style={styles.eventList}>
                        {events.length === 0 ? (
                            <Text style={styles.noEventsText}>{t('eventManagement.noEvents')}</Text>
                        ) : (
                            events.map(event => (
                                <View key={event.id} style={styles.eventItem}>
                                    <Text style={styles.eventText}>
                                        {event.age} {event.gender} {event.weapon}
                                    </Text>
                                    <View style={styles.eventActions}>
                                        <Can I="update" a="Event" this={event}>
                                            {/* Hide Edit button when tournament is started */}
                                            {!(eventStatuses && eventStatuses[event.id] === true) && (
                                                <TouchableOpacity
                                                    style={[styles.actionButton, styles.flexAction]}
                                                    onPress={() =>
                                                        navigation.navigate('EventSettings', {
                                                            event: event,
                                                            onSave: handleSaveEventSettings,
                                                            isRemote: isRemote,
                                                        })
                                                    }
                                                >
                                                    <Text style={styles.buttonText}>{t('eventManagement.edit')}</Text>
                                                </TouchableOpacity>
                                            )}
                                        </Can>
                                        <TouchableOpacity
                                            style={[styles.actionButton, styles.flexAction]}
                                            onPress={() => {
                                                console.log(
                                                    'Event status for',
                                                    event.id,
                                                    ':',
                                                    eventStatuses?.[event.id]
                                                );
                                                console.log('All current event statuses:', eventStatuses);
                                                const isStarted = eventStatuses && eventStatuses[event.id] === true;
                                                console.log(`Event ${event.id} isStarted: ${isStarted}`);

                                                if (isStarted) {
                                                    // Anyone can open a started event (read access)
                                                    handleOpenEvent(event.id);
                                                } else if (ability.can('update', 'Event')) {
                                                    // Only those with update permission can start an event
                                                    confirmStartEvent(event.id);
                                                }
                                            }}
                                            disabled={
                                                !(eventStatuses && eventStatuses[event.id] === true) &&
                                                !ability.can('update', 'Event')
                                            }
                                        >
                                            <Text
                                                style={[
                                                    styles.buttonText,
                                                    !(eventStatuses && eventStatuses[event.id] === true) &&
                                                        !ability.can('update', 'Event') &&
                                                        styles.disabledText,
                                                ]}
                                            >
                                                {eventStatuses && eventStatuses[event.id] === true
                                                    ? t('eventManagement.open')
                                                    : t('eventManagement.start')}
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.actionButton, styles.viewResultsButton]}
                                            onPress={() =>
                                                navigation.navigate('TournamentResultsPage', {
                                                    eventId: event.id,
                                                    isRemote: isRemote,
                                                })
                                            }
                                        ></TouchableOpacity>

                                        <Can I="delete" a="Event">
                                            <TouchableOpacity
                                                onPress={() => confirmRemoveEvent(event.id)}
                                                style={styles.removeIconContainer}
                                                disabled={deleteEventMutation.isPending}
                                            >
                                                <Text style={styles.removeIcon}>{t('eventManagement.removeIcon')}</Text>
                                            </TouchableOpacity>
                                        </Can>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                )}

                <Modal
                    visible={modalVisible}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>{t('eventManagement.createEvent')}</Text>

                            {/* AGE SELECTOR */}
                            <View style={styles.rowGroup}>
                                {[t('eventFilters.cadet'), t('eventFilters.senior'), t('eventFilters.veteran')].map(
                                    ageOption => (
                                        <TouchableOpacity
                                            key={ageOption}
                                            style={[
                                                styles.optionButton,
                                                selectedAge === ageOption && styles.selectedButton,
                                            ]}
                                            onPress={() => setSelectedAge(ageOption)}
                                        >
                                            <Text
                                                style={[
                                                    styles.optionText,
                                                    { color: selectedAge === ageOption ? '#fff' : '#000' },
                                                ]}
                                            >
                                                {ageOption}
                                            </Text>
                                        </TouchableOpacity>
                                    )
                                )}
                            </View>

                            {/* GENDER BUTTONS */}
                            <View style={styles.rowGroup}>
                                {[t('eventFilters.mens'), t('eventFilters.mixed'), t('eventFilters.womens')].map(
                                    gender => (
                                        <TouchableOpacity
                                            key={gender}
                                            style={[
                                                styles.optionButton,
                                                selectedGender === gender && styles.selectedButton,
                                            ]}
                                            onPress={() => setSelectedGender(gender)}
                                        >
                                            <Text
                                                style={[
                                                    styles.optionText,
                                                    { color: selectedGender === gender ? '#fff' : '#000' },
                                                ]}
                                            >
                                                {gender}
                                            </Text>
                                        </TouchableOpacity>
                                    )
                                )}
                            </View>

                            {/* WEAPON BUTTONS */}
                            <View style={styles.rowGroup}>
                                {[t('eventFilters.epee'), t('eventFilters.foil'), t('eventFilters.saber')].map(
                                    weapon => (
                                        <TouchableOpacity
                                            key={weapon}
                                            style={[
                                                styles.optionButton,
                                                selectedWeapon === weapon && styles.selectedButton,
                                            ]}
                                            onPress={() => setSelectedWeapon(weapon)}
                                        >
                                            <Text
                                                style={[
                                                    styles.optionText,
                                                    { color: selectedWeapon === weapon ? '#fff' : '#000' },
                                                ]}
                                            >
                                                {weapon}
                                            </Text>
                                        </TouchableOpacity>
                                    )
                                )}
                            </View>

                            <View style={styles.modalActions}>
                                <TouchableOpacity style={styles.modalActionButton} onPress={handleSubmitEvent}>
                                    <Text style={styles.modalActionText}>{t('common.submit')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalActionButton, styles.cancelButton]}
                                    onPress={() => setModalVisible(false)}
                                >
                                    <Text style={styles.modalActionText}>{t('common.cancel')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </ScrollView>

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
                                // Refresh data
                                queryClient.invalidateQueries({ queryKey: queryKeys.events });
                            } else {
                                // Connection failed, keep modal open
                                //Alert.alert(t('joinTournament.errorConnectionFailed'));
                            }
                        } catch (error) {
                            //console.error('Error reconnecting:', error);
                            //Alert.alert(t('joinTournament.errorConnectionFailed'));
                        }
                    }
                }}
                onBackToHome={() => {
                    setConnectionLostModalVisible(false);
                    navigation.navigate('HomeTabs');
                }}
            />
        </>
    );
};

const navyBlue = '#263e5e';
const white = '#ffffff';
const greyAccent = '#cccccc';
const steelBlue = '#4682B4';
const green = '#4CAF50';
const dustyRed = '#CD5C5C';

const styles = StyleSheet.create({
    container: {
        padding: 20,
        flexGrow: 1,
        backgroundColor: white,
    },
    title: {
        fontSize: 26,
        marginBottom: 20,
        color: navyBlue,
        textAlign: 'center',
        fontWeight: 'bold',
    },
    headerContainer: {
        width: '100%',
        marginBottom: 10,
    },
    tournamentName: {
        fontSize: 18,
        marginBottom: 5,
        color: navyBlue,
    },
    ipBanner: {
        backgroundColor: '#4CAF50',
        padding: 10,
        borderRadius: 5,
        marginTop: 5,
        marginBottom: 2,
    },
    ipText: {
        color: white,
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    ipTextSmall: {
        color: white,
        fontSize: 14,
        textAlign: 'center',
        marginTop: 2,
    },
    networkStatusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    networkStatusIndicator: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 6,
    },
    networkConnected: {
        backgroundColor: '#4ade80',
    },
    networkDisconnected: {
        backgroundColor: '#f87171',
    },
    networkStatusText: {
        color: white,
        fontSize: 12,
    },
    remoteConnectionBanner: {
        backgroundColor: '#007AFF',
        padding: 10,
        borderRadius: 5,
        marginTop: 5,
        marginBottom: 10,
    },
    remoteConnectionText: {
        color: white,
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 5,
    },
    disconnectButton: {
        backgroundColor: '#FF3B30',
        padding: 6,
        borderRadius: 5,
        alignSelf: 'center',
        marginTop: 5,
    },
    disconnectButtonText: {
        color: white,
        fontSize: 14,
        fontWeight: 'bold',
    },
    eventList: {
        marginTop: 20,
    },
    eventItem: {
        borderWidth: 1,
        borderColor: greyAccent,
        padding: 10,
        marginBottom: 15,
        borderRadius: 5,
        backgroundColor: white,
    },
    eventText: {
        fontSize: 16,
        marginBottom: 10,
        color: navyBlue,
    },
    eventActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    actionButton: {
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 3,
        backgroundColor: navyBlue,
    },
    flexAction: {
        flex: 1,
        marginHorizontal: 5,
    },
    buttonText: {
        color: white,
        fontSize: 14,
    },
    removeIconContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 10,
    },
    removeIcon: {
        fontSize: 20,
        color: 'red',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: white,
        padding: 20,
        borderRadius: 12,
        width: '80%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    eventNameInput: {
        borderWidth: 1,
        borderColor: steelBlue,
        padding: 10,
        borderRadius: 6,
        marginBottom: 15,
        backgroundColor: white,
        color: navyBlue,
    },
    rowGroup: {
        flexDirection: 'row',
        marginBottom: 15,
        justifyContent: 'space-between',
    },
    optionButton: {
        flex: 1,
        backgroundColor: white,
        borderWidth: 1,
        borderColor: steelBlue,
        paddingVertical: 14,
        borderRadius: 5,
        alignItems: 'center',
        marginHorizontal: 4,
    },
    selectedButton: {
        backgroundColor: navyBlue,
    },
    optionText: {
        fontSize: 16,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 10,
        borderRadius: 6,
        marginBottom: 20,
        backgroundColor: white,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 10,
    },
    modalActionButton: {
        backgroundColor: green,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 5,
        width: '40%',
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: dustyRed,
    },
    modalActionText: {
        color: white,
        fontSize: 16,
    },
    serverButton: {
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
        marginTop: 2,
        marginBottom: 8,
        alignItems: 'center',
    },
    serverEnabledButton: {
        backgroundColor: '#ff3b30',
    },
    serverDisabledButton: {
        backgroundColor: '#34c759',
    },
    serverPendingButton: {
        backgroundColor: '#6c757d',
        opacity: 0.8,
    },
    serverButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    buttonLoadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    serverInfoContainer: {
        backgroundColor: '#f0f0f0',
        padding: 10,
        borderRadius: 8,
        marginBottom: 15,
    },
    serverInfoText: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 5,
    },
    manageOfficialsButton: {
        backgroundColor: '#4CAF50',
        padding: 12,
        borderRadius: 6,
        marginBottom: 16,
        alignItems: 'center',
    },
    manageOfficialsText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    loadingContainer: {
        marginTop: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: navyBlue,
    },
    errorContainer: {
        marginTop: 30,
        padding: 15,
        backgroundColor: '#ffeeee',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ff3b30',
    },
    errorText: {
        color: '#ff3b30',
        fontSize: 16,
        textAlign: 'center',
    },
    noEventsText: {
        fontSize: 16,
        textAlign: 'center',
        marginTop: 20,
        color: '#666',
        fontStyle: 'italic',
    },
    viewResultsButton: {
        backgroundColor: '#007AFF',
    },
    disabledButton: {
        backgroundColor: '#ccc',
        opacity: 0.7,
    },
    disabledText: {
        color: '#999',
    },
});

export default EventManagement;

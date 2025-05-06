// src/navigation/screens/JoinTournamentModal.tsx - Updated with server discovery
import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import tournamentClient from '../../networking/TournamentClient';
import {
    isValidIpAddress,
    isValidPort,
    startServerDiscovery,
    stopServerDiscovery,
    serverDiscovery,
    DiscoveredServer,
} from '../../networking/NetworkUtils';
import { RootStackParamList } from '../navigation/types';
import { useTranslation } from 'react-i18next';

interface JoinTournamentModalProps {
    visible: boolean;
    onClose: () => void;
    onJoinSuccess: (tournamentName: string) => void;
}

export const JoinTournamentModal: React.FC<JoinTournamentModalProps> = ({ visible, onClose, onJoinSuccess }) => {
    // States for manual connection
    const [hostIp, setHostIp] = useState('');
    const [port, setPort] = useState('9001');
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // States for server discovery
    const [showManualEntry, setShowManualEntry] = useState(false); // Start with server discovery as default
    const [discoveredServers, setDiscoveredServers] = useState<DiscoveredServer[]>([]);
    const [isDiscovering, setIsDiscovering] = useState(false);

    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { t } = useTranslation();

    // Start server discovery when modal is visible
    useEffect(() => {
        if (visible) {
            handleRefreshServers();
        }

        // Set up event listeners for discovery updates
        const serversUpdatedListener = (servers: DiscoveredServer[]) => {
            console.log('Servers updated event received:', servers.length, 'servers found');
            servers.forEach(server => {
                console.log(`Server in list: ${server.tournamentName} at ${server.hostIp}:${server.port}`);
            });
            setDiscoveredServers(servers);
        };

        const scanningChangedListener = (scanning: boolean) => {
            console.log('Scanning changed event received:', scanning);
            setIsDiscovering(scanning);
        };

        // Listen for individual server discovery events too
        const serverDiscoveredListener = (server: DiscoveredServer) => {
            console.log(`New server discovered: ${server.tournamentName} at ${server.hostIp}:${server.port}`);
        };

        serverDiscovery.on('serversUpdated', serversUpdatedListener);
        serverDiscovery.on('scanningChanged', scanningChangedListener);
        serverDiscovery.on('serverDiscovered', serverDiscoveredListener);

        // Clean up when modal closes
        return () => {
            if (visible) {
                stopServerDiscovery();
            }
            serverDiscovery.removeListener('serversUpdated', serversUpdatedListener);
            serverDiscovery.removeListener('scanningChanged', scanningChangedListener);
            serverDiscovery.removeListener('serverDiscovered', serverDiscoveredListener);
        };
    }, [visible]);

    // Set up client connection event listeners
    useEffect(() => {
        // Set up event listeners
        const joinedListener = (message: string) => {
            setConnecting(false);
            const clientInfo = tournamentClient.getClientInfo();
            if (clientInfo) {
                // Explicitly request events list from the server
                console.log('Requesting events list after successful connection');
                tournamentClient.sendMessage({
                    type: 'get_events',
                });

                // Also request event statuses to ensure the UI is properly updated
                tournamentClient.sendMessage({
                    type: 'get_event_statuses',
                    eventIds: [], // Empty array to get all event statuses
                });

                // Notify parent component
                onJoinSuccess(clientInfo.tournamentName || 'Tournament');

                // After successful connection, navigate to EventManagement screen
                // with the tournament name from the connection
                navigation.navigate('EventManagement', {
                    tournamentName: clientInfo.tournamentName || 'Tournament',
                    isRemoteConnection: true, // Flag to indicate this is a remote connection
                });

                // Close the modal after navigation is triggered
                onClose();
            }
        };

        const joinFailedListener = (message: string) => {
            setConnecting(false);
            setError(message);
        };

        tournamentClient.on('joined', joinedListener);
        tournamentClient.on('joinFailed', joinFailedListener);

        // Clean up event listeners
        return () => {
            tournamentClient.removeListener('joined', joinedListener);
            tournamentClient.removeListener('joinFailed', joinFailedListener);
        };
    }, [onJoinSuccess, onClose, navigation]);

    // Handle manual connect button press
    const handleManualConnect = async () => {
        // Validate inputs
        if (!hostIp.trim()) {
            setError(t('joinTournament.errorEmptyIp'));
            return;
        }

        if (!isValidIpAddress(hostIp)) {
            setError(t('joinTournament.errorInvalidIp'));
            return;
        }

        const portNum = parseInt(port, 10);
        if (isNaN(portNum) || !isValidPort(portNum)) {
            setError(t('joinTournament.errorInvalidPort'));
            return;
        }

        setError(null);
        setConnecting(true);

        try {
            const success = await tournamentClient.connectToServer(hostIp, portNum);
            if (!success) {
                setConnecting(false);
                setError(t('joinTournament.errorConnectionFailed'));
            }
        } catch (error: any) {
            setConnecting(false);
            setError(error.message || t('joinTournament.errorConnectionFailed'));
        }
    };

    // Handle selecting a discovered server
    const handleSelectServer = async (server: DiscoveredServer) => {
        setHostIp(server.hostIp);
        setPort(server.port.toString());
        setError(null);
        setConnecting(true);

        try {
            const success = await tournamentClient.connectToServer(server.hostIp, server.port);
            if (!success) {
                setConnecting(false);
                setError(t('joinTournament.errorConnectionFailed'));
            }
        } catch (error: any) {
            setConnecting(false);
            setError(error.message || t('joinTournament.errorConnectionFailed'));
        }
    };

    // Handle refresh servers button press
    const handleRefreshServers = async () => {
        setError(null);
        setIsDiscovering(true);
        try {
            // First try regular discovery
            const servers = await startServerDiscovery();
            setDiscoveredServers(servers);
        } catch (error: any) {
            console.error('Error discovering servers:', error);
            setError(t('joinTournament.errorConnectionFailed'));
        } finally {
            setIsDiscovering(false);
        }
    };

    // Sort servers by name
    const sortedServers = useMemo(() => {
        return [...discoveredServers].sort((a, b) => a.tournamentName.localeCompare(b.tournamentName));
    }, [discoveredServers]);

    // Render a discovered server item
    const renderServerItem = ({ item }: { item: DiscoveredServer }) => (
        <TouchableOpacity style={styles.serverItem} onPress={() => handleSelectServer(item)} disabled={connecting}>
            <Text style={styles.serverName}>{item.tournamentName}</Text>
            <Text style={styles.serverAddress}>
                {item.hostIp}:{item.port}
            </Text>
        </TouchableOpacity>
    );

    return (
        <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>{t('joinTournament.title')}</Text>

                    {error && <Text style={styles.errorText}>{error}</Text>}

                    {/* Server discovery view */}
                    {!showManualEntry ? (
                        <>
                            {sortedServers.length > 0 ? (
                                <Text style={styles.sectionTitle}>{t('joinTournament.availableTournaments')}</Text>
                            ) : (
                                <Text style={styles.emptyText}>
                                    {isDiscovering
                                        ? t('joinTournament.searching')
                                        : t('joinTournament.noTournamentsFound')}
                                </Text>
                            )}

                            <FlatList
                                data={sortedServers}
                                renderItem={renderServerItem}
                                keyExtractor={item => `${item.hostIp}:${item.port}`}
                                style={styles.serverList}
                                contentContainerStyle={sortedServers.length === 0 ? styles.emptyListContent : undefined}
                                ListEmptyComponent={
                                    isDiscovering ? <ActivityIndicator size="large" color="#001f3f" /> : null
                                }
                            />

                            <View style={styles.buttonRow}>
                                <TouchableOpacity
                                    style={[styles.refreshButton, isDiscovering && styles.disabledButton]}
                                    onPress={handleRefreshServers}
                                    disabled={isDiscovering || connecting}
                                >
                                    {isDiscovering ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <Text style={styles.buttonText}>{t('joinTournament.refresh')}</Text>
                                    )}
                                </TouchableOpacity>
                            </View>

                            <View style={styles.buttonContainer}>
                                <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={connecting}>
                                    <Text style={styles.buttonText}>{t('common.cancel')}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.manualConnectButton}
                                    onPress={() => setShowManualEntry(true)}
                                    disabled={connecting}
                                >
                                    <Text style={styles.buttonText}>{t('joinTournament.enterIpManually')}</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        // Manual connection view
                        <>
                            <Text style={styles.sectionTitle}>{t('joinTournament.manualConnection')}</Text>

                            <Text style={styles.inputLabel}>{t('joinTournament.hostIpAddress')}</Text>
                            <TextInput
                                style={styles.input}
                                value={hostIp}
                                onChangeText={setHostIp}
                                placeholder={t('joinTournament.enterHostIp')}
                                autoCapitalize="none"
                                autoCorrect={false}
                                keyboardType="numeric"
                                editable={!connecting}
                            />

                            <Text style={styles.inputLabel}>{t('joinTournament.port')}</Text>
                            <TextInput
                                style={styles.input}
                                value={port}
                                onChangeText={setPort}
                                placeholder={t('joinTournament.enterPort')}
                                keyboardType="numeric"
                                editable={!connecting}
                            />

                            <View style={styles.buttonContainer}>
                                <TouchableOpacity
                                    style={styles.backButton}
                                    onPress={() => setShowManualEntry(false)}
                                    disabled={connecting}
                                >
                                    <Text style={styles.buttonText}>{t('common.back')}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.connectButton, connecting && styles.disabledButton]}
                                    onPress={handleManualConnect}
                                    disabled={connecting}
                                >
                                    {connecting ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <Text style={styles.buttonText}>{t('joinTournament.connect')}</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    modalContent: {
        backgroundColor: '#fff',
        padding: 24,
        borderRadius: 16,
        width: '90%',
        maxHeight: '80%',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 20,
        textAlign: 'center',
        color: '#333',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
        color: '#444',
    },
    errorText: {
        color: '#ff3b30',
        marginBottom: 12,
        textAlign: 'center',
        fontWeight: '500',
    },
    emptyText: {
        textAlign: 'center',
        marginVertical: 20,
        color: '#888',
        fontSize: 15,
        fontStyle: 'italic',
    },
    serverList: {
        maxHeight: 220,
        marginBottom: 15,
    },
    emptyListContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        height: 150,
    },
    serverItem: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        backgroundColor: '#f8f9fa',
        marginBottom: 8,
        borderRadius: 10,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 1,
    },
    serverName: {
        fontSize: 17,
        fontWeight: '600',
        color: '#333',
    },
    serverAddress: {
        fontSize: 14,
        color: '#777',
        marginTop: 4,
    },
    inputLabel: {
        fontSize: 16,
        marginBottom: 6,
        fontWeight: '500',
        color: '#555',
    },
    input: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
        backgroundColor: '#f9f9f9',
        padding: 12,
        borderRadius: 10,
        marginBottom: 20,
        fontSize: 16,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 16,
    },
    refreshButton: {
        padding: 12,
        borderRadius: 10,
        backgroundColor: '#4CAF50',
        width: '50%',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    cancelButton: {
        padding: 12,
        borderRadius: 10,
        flex: 1,
        marginHorizontal: 6,
        backgroundColor: '#ff3b30',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    backButton: {
        padding: 12,
        borderRadius: 10,
        flex: 1,
        marginHorizontal: 6,
        backgroundColor: '#777',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    connectButton: {
        padding: 12,
        borderRadius: 10,
        flex: 1,
        marginHorizontal: 6,
        backgroundColor: '#001f3f',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    manualConnectButton: {
        padding: 12,
        borderRadius: 10,
        flex: 1,
        marginHorizontal: 6,
        backgroundColor: '#007AFF',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    disabledButton: {
        backgroundColor: '#999',
    },
    buttonText: {
        color: '#fff',
        fontSize: 15,
        textAlign: 'center',
        fontWeight: '600',
    },
});

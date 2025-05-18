import React from 'react';
import { StyleSheet, View, FlatList, Text, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { dbDeleteTournament } from '../../db/DrizzleDatabaseUtils';
import { Tournament } from '../navigation/types';
import { useAbility } from '../../rbac/AbilityContext'; // Import useAbility
import tournamentClient from '../../networking/TournamentClient';

interface TournamentListProps {
    tournaments: Tournament[];
    onTournamentDeleted: () => void;
    isComplete: boolean; // Add isComplete as a prop
}

export const TournamentList: React.FC<TournamentListProps> = ({ tournaments, onTournamentDeleted, isComplete }) => {
    const { t } = useTranslation();
    const navigation = useNavigation();
    const { setTournamentContext } = useAbility(); // Get the context setter function

    const handleTournamentPress = async (tournament: Tournament) => {
        console.log(`Tournament pressed: ${tournament.name}`);
        
        // If it's a disconnected remote tournament, try to reconnect
        if (tournament.isRemote && !tournament.isConnected && tournament.hostIp && tournament.port) {
            try {
                console.log(`Attempting to reconnect to ${tournament.name} at ${tournament.hostIp}:${tournament.port}`);
                const success = await tournamentClient.connectToServer(tournament.hostIp, tournament.port);
                if (success) {
                    Alert.alert(t('common.success'), `${t('home.connectedTo')} ${tournament.name}`);
                    onTournamentDeleted(); // Refresh the list to update connection status
                    return;
                }
            } catch (error) {
                console.error('Failed to reconnect:', error);
                Alert.alert(t('common.error'), t('home.failedToConnect'));
                return;
            }
        }
        
        // Otherwise proceed with normal navigation
        console.log(`Setting tournament context for: ${tournament.name}`);
        setTournamentContext(tournament.name); // Set the context before navigating
        // @ts-ignore - Keep ignoring navigation type for now
        navigation.navigate('EventManagement', { tournamentName: tournament.name });
    };

    const handleDelete = async (tournamentName: string) => {
        Alert.alert(
            t('tournamentList.deleteTournament'),
            t('tournamentList.deleteTournamentConfirm', { name: tournamentName }),
            [
                {
                    text: t('common.cancel'),
                    style: 'cancel',
                },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await dbDeleteTournament(tournamentName);
                            onTournamentDeleted(); // Refresh the tournament list
                        } catch (error) {
                            Alert.alert(t('common.error'), t('tournamentList.deleteFailed'));
                            console.error(error);
                        }
                    },
                },
            ]
        );
    };

    const renderTournament = ({ item }: { item: Tournament }) => (
        <View style={styles.tournamentContainer}>
            <TouchableOpacity
                style={[
                    styles.tournamentItem, 
                    isComplete && styles.tournamentHistoryButton,
                    item.isRemote && !item.isConnected && styles.disconnectedTournament
                ]}
                onPress={() => handleTournamentPress(item)}
            >
                <View>
                    <Text style={styles.tournamentName}>{item.name}</Text>
                    {item.isRemote && !item.isConnected && (
                        <Text style={styles.disconnectedText}>{t('common.disconnected')}</Text>
                    )}
                </View>
            </TouchableOpacity>
            {item.isRemote ? (
                <TouchableOpacity 
                    style={[styles.disconnectButton, !item.isConnected && styles.reconnectButton]} 
                    onPress={async () => {
                        if (item.isConnected) {
                            // Disconnect
                            tournamentClient.isShowingDisconnectAlert = true;
                            await tournamentClient.disconnect(true); // Pass true to preserve info
                            tournamentClient.isShowingDisconnectAlert = false;
                            onTournamentDeleted(); // Refresh the list
                        } else {
                            // Attempt to reconnect
                            await handleTournamentPress(item);
                        }
                    }}
                >
                    <Text style={styles.disconnectButtonText}>
                        {item.isConnected ? t('home.disconnect') : t('home.reconnect')}
                    </Text>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item.name)}>
                    <Text style={styles.deleteButtonText}>✖</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <View style={styles.listContainer}>
            {tournaments.length === 0 ? (
                <Text style={styles.emptyText}>{t('tournamentList.noTournaments')}</Text>
            ) : (
                <FlatList
                    data={tournaments}
                    renderItem={renderTournament}
                    keyExtractor={item => item.name.toString()}
                    contentContainerStyle={{ flexGrow: 1 }}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    listContainer: {
        width: '100%',
    },
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
        textAlign: 'left',
        color: '#333333',
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
    emptyText: {
        textAlign: 'center',
        color: '#888888',
        fontSize: 16,
        fontStyle: 'italic',
        padding: 20,
    },
    tournamentHistoryButton: {
        backgroundColor: '#f5f5f5',
        borderLeftWidth: 4,
        borderLeftColor: '#888888',
    },
    tournamentHistoryButtonText: {
        color: '#555555',
        fontSize: 16,
    },
    disconnectedTournament: {
        backgroundColor: '#f5f5f5',
        borderLeftWidth: 4,
        borderLeftColor: '#ffa500', // Orange color for disconnected
    },
    disconnectedText: {
        fontSize: 12,
        color: '#888888',
        marginTop: 4,
        fontStyle: 'italic',
    },
    disconnectButton: {
        padding: 16,
        backgroundColor: '#ff3b30',
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 100,
    },
    reconnectButton: {
        backgroundColor: '#228B22', // Green for reconnect
    },
    disconnectButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default TournamentList;

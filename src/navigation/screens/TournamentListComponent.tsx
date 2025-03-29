import React from 'react';
import {
    StyleSheet,
    View,
    FlatList,
    Text,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { dbDeleteTournament } from '../../db/DrizzleDatabaseUtils';
import {Tournament} from "../navigation/types";

interface TournamentListProps {
    tournaments: Tournament[];
    onTournamentDeleted: () => void;
    isComplete: boolean; // Add isComplete as a prop
}

export const TournamentList: React.FC<TournamentListProps> = ({
                                                                  tournaments,
                                                                  onTournamentDeleted,
                                                                  isComplete,
                                                              }) => {
    const navigation = useNavigation();

    const handleTournamentPress = (tournamentName: string) => {
        // @ts-ignore
        navigation.navigate('EventManagement', { tournamentName });
    };

    const handleDelete = async (tournamentName: string) => {
        Alert.alert(
            'Delete Tournament',
            `Are you sure you want to delete "${tournamentName}"?`,
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await dbDeleteTournament(tournamentName);
                            onTournamentDeleted(); // Refresh the tournament list
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete the tournament');
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
                ]}
                onPress={() => handleTournamentPress(item.name)}
            >
                <Text style={styles.tournamentName}>{item.name}</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(item.name)}
            >
                <Text style={styles.deleteButtonText}>✖</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.listContainer}>
            {tournaments.length === 0 ? (
                <Text style={styles.emptyText}>No tournaments created yet.</Text>
            ) : (
                <FlatList
                    data={tournaments}
                    renderItem={renderTournament}
                    keyExtractor={(item) => item.name.toString()}
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
});

export default TournamentList;

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
import { dbDeleteTournament } from '../../db/TournamentDatabaseUtils';

interface TournamentListProps {
    tournaments: Array<{ name: string }>;
    onTournamentDeleted: () => void;
}

export const TournamentList: React.FC<TournamentListProps> = ({
                                                                  tournaments,
                                                                  onTournamentDeleted,
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

    const renderTournament = ({ item }: { item: { name: string } }) => (
        <View style={styles.tournamentContainer}>
            <TouchableOpacity
                style={styles.tournamentItem}
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
        backgroundColor: '#f2f4fb', // Lighter navy blue interior
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        marginVertical: 4, // Increased vertical spacing between items

    },
    tournamentItem: {
        flex: 1,
        marginLeft: 16,
        padding: 16,
    },
    tournamentName: {
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'center', // Center the tournament name
    },
    deleteButton: {
        padding: 16,
        backgroundColor: '#5a0b0b',
        borderTopRightRadius: 8,
        borderBottomRightRadius: 8,
    },
    deleteButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    emptyText: {
        textAlign: 'center',
        color: '#666',
        fontSize: 16,
    },
});

export default TournamentList;

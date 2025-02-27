import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { dbGetPoolsForRound } from "../../db/TournamentDatabaseUtils";
import { RootStackParamList, Event, Fencer } from '../navigation/types';

type PoolsPageRouteParams = {
    event: Event;
    currentRoundIndex: number;
    roundId: number; // Ensure roundId is provided when navigating here
};

type PoolsPageNavProp = NativeStackNavigationProp<RootStackParamList, 'PoolsPage'>;

const PoolsPage: React.FC = () => {
    const route = useRoute<RouteProp<{ params: PoolsPageRouteParams }, 'params'>>();
    const navigation = useNavigation<PoolsPageNavProp>();

    const { event, currentRoundIndex, roundId } = route.params;
    const [pools, setPools] = useState<{ poolid: number; fencers: Fencer[] }[]>([]);
    const [expandedPools, setExpandedPools] = useState<boolean[]>([]);

    useEffect(() => {
        async function fetchPools() {
            try {
                console.log("Fetching pools for roundId:", roundId);
                const poolsData = await dbGetPoolsForRound(roundId);
                console.log("Pools data fetched:", JSON.stringify(poolsData.map(pool => pool.fencers), null, 2));
                setPools(poolsData);
                setExpandedPools(new Array(poolsData.length).fill(false));
            } catch (error) {
                console.error("Error fetching pools from DB:", error);
            }
        }
        fetchPools();
    }, [roundId]);

    const togglePool = (index: number) => {
        setExpandedPools((prev) => {
            const updated = [...prev];
            updated[index] = !updated[index];
            return updated;
        });
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            {pools.length === 0 && (
                <Text style={styles.infoText}>
                    No pool assignments found. Please verify that the round has been initialized.
                </Text>
            )}
            {pools.map((poolObj, index) => (
                <View key={poolObj.poolid} style={styles.poolContainer}>
                    <TouchableOpacity onPress={() => togglePool(index)} style={styles.poolHeader}>
                        <View style={styles.poolHeaderRow}>
                            <Text style={styles.poolHeaderText}>
                                Pool {poolObj.poolid + 1} : {poolObj.fencers.length} fencer{poolObj.fencers.length !== 1 ? 's' : ''}
                            </Text>
                            <Text style={styles.arrowText}>
                                {expandedPools[index] ? '▼' : '▶'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                    {expandedPools[index] && (
                        <View style={styles.fencerList}>
                            {poolObj.fencers.map((fencer, i) => (
                                <Text key={i} style={styles.fencerText}>
                                    {fencer.lname}, {fencer.fname}
                                </Text>
                            ))}
                        </View>
                    )}
                </View>
            ))}
        </ScrollView>
    );
};

export default PoolsPage;

const styles = StyleSheet.create({
    container: {
        padding: 20,
    },
    infoText: {
        fontSize: 16,
        color: 'red',
        textAlign: 'center',
        marginVertical: 10,
    },
    poolContainer: {
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        overflow: 'hidden',
    },
    poolHeader: {
        padding: 15,
        backgroundColor: '#007AFF',
    },
    poolHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    poolHeaderText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    arrowText: {
        color: '#fff',
        fontSize: 30,
        marginRight: 10,
    },
    fencerList: {
        padding: 15,
        backgroundColor: '#f9f9f9',
    },
    fencerText: {
        fontSize: 16,
        marginBottom: 10,
    },
});

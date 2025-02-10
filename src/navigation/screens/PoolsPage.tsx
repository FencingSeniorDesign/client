// PoolsPage.tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Make sure to import from your types file
import { RootStackParamList } from '../navigation/types';

type PoolsPageRouteParams = {
    eventId: number;
    fencers: Fencer[];
    poolCount: number;
    fencersPerPool: number;
};

type Fencer = {
    id: number;
    firstName: string;
    lastName: string;
    rating: string;
};

// Define typed navigation
type PoolsPageNavProp = NativeStackNavigationProp<RootStackParamList, 'PoolsPage'>;

const PoolsPage: React.FC = () => {
    const route = useRoute<RouteProp<{ params: PoolsPageRouteParams }, 'params'>>();
    const navigation = useNavigation<PoolsPageNavProp>();

    const { fencers, poolCount, fencersPerPool } = route.params;

    const [pools, setPools] = useState<Fencer[][]>([]);
    const [expandedPools, setExpandedPools] = useState<boolean[]>([]);

    useEffect(() => {
        // Shuffle fencers randomly
        const shuffledFencers = [...fencers].sort(() => Math.random() - 0.5);
        const newPools: Fencer[][] = [];
        let startIndex = 0;

        for (let i = 0; i < poolCount; i++) {
            const poolFencers = shuffledFencers.slice(startIndex, startIndex + fencersPerPool);
            newPools.push(poolFencers);
            startIndex += fencersPerPool;
        }

        setPools(newPools);
        setExpandedPools(new Array(poolCount).fill(false));
    }, [fencers, poolCount, fencersPerPool]);

    const togglePool = (index: number) => {
        setExpandedPools((prev) => {
            const updated = [...prev];
            updated[index] = !updated[index];
            return updated;
        });
    };

    // Handler to navigate to BoutOrderPage
    const handleRefereePress = (poolFencers: Fencer[]) => {
        navigation.navigate('BoutOrderPage', {
            poolFencers,
        });
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            {pools.map((pool, index) => (
                <View key={index} style={styles.poolContainer}>
                    <TouchableOpacity
                        onPress={() => togglePool(index)}
                        style={styles.poolHeader}
                    >
                        <View style={styles.poolHeaderRow}>
                            <Text style={styles.poolHeaderText}>
                                Pool {index + 1} : {pool.length} fencer
                                {pool.length !== 1 ? 's' : ''}
                            </Text>
                            {/* Arrow that changes depending on expanded/collapsed state */}
                            <Text style={styles.arrowText}>
                                {expandedPools[index] ? '▼' : '▶'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                    {expandedPools[index] && (
                        <View style={styles.fencerList}>
                            {pool.map((fencer, i) => (
                                <Text key={i} style={styles.fencerText}>
                                    {fencer.lastName}, {fencer.firstName}, {fencer.rating}
                                </Text>
                            ))}
                            {/* REFEREE BUTTON */}
                            <TouchableOpacity
                                style={styles.refButton}
                                onPress={() => handleRefereePress(pool)}
                            >
                                <Text style={styles.refButtonText}>Referee</Text>
                            </TouchableOpacity>
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
    refButton: {
        backgroundColor: '#000080',
        paddingVertical: 10,
        borderRadius: 6,
        marginTop: 10,
        alignItems: 'center',
    },
    refButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

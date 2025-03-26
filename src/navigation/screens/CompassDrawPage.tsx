// src/navigation/screens/CompassDrawPage.tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Event, Round } from '../navigation/types';
import DEBoutCard from '../components/DEBoutCard';
import {
    dbGetRoundsForEvent,
    dbUpdateDEBoutAndAdvanceWinner,
    dbGetCompassBracketBouts,
} from '../../db/DrizzleDatabaseUtils';
import { getCompassDirectionName } from '../utils/CompassDrawUtils';

type CompassDrawPageParams = {
    event: Event;
    currentRoundIndex: number;
    roundId: number;
};

type CompassDrawPageRouteProp = RouteProp<{ params: CompassDrawPageParams }, 'params'>;
type CompassDrawPageNavProp = NativeStackNavigationProp<RootStackParamList, 'CompassDrawPage'>;

type BracketType = 'east' | 'north' | 'west' | 'south';

const CompassDrawPage: React.FC = () => {
    const route = useRoute<CompassDrawPageRouteProp>();
    const navigation = useNavigation<CompassDrawPageNavProp>();
    const { event, currentRoundIndex, roundId } = route.params;

    const [round, setRound] = useState<Round | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshKey, setRefreshKey] = useState<number>(0);

    const [eastBracket, setEastBracket] = useState<any[]>([]);
    const [northBracket, setNorthBracket] = useState<any[]>([]);
    const [westBracket, setWestBracket] = useState<any[]>([]);
    const [southBracket, setSouthBracket] = useState<any[]>([]);

    const [selectedTab, setSelectedTab] = useState<BracketType>('east');

    useEffect(() => {
        async function fetchBrackets() {
            try {
                setLoading(true);

                // Get round info
                const rounds = await dbGetRoundsForEvent(event.id);
                const currentRound = rounds.find(r => r.id === roundId);

                if (!currentRound) {
                    throw new Error('Round not found');
                }

                setRound(currentRound);

                // Fetch compass draw bracket data
                const { east, north, west, south } = await dbGetCompassBracketBouts(roundId);

                setEastBracket(east);
                setNorthBracket(north);
                setWestBracket(west);
                setSouthBracket(south);

            } catch (error) {
                console.error('Error loading compass draw brackets:', error);
                Alert.alert('Error', 'Failed to load bracket data');
            } finally {
                setLoading(false);
            }
        }

        fetchBrackets();
    }, [event, roundId, refreshKey]);

    const handleBoutPress = (bout: any) => {
        // Skip if it's a BYE
        if (bout.isBye) {
            Alert.alert('BYE', 'This fencer advances automatically.');
            return;
        }

        // Skip if both fencers aren't set yet
        if (!bout.lfencer || !bout.rfencer) {
            Alert.alert('Not Ready', 'This bout is waiting for fencers from previous rounds.');
            return;
        }

        // Navigate to Referee Module
        navigation.navigate('RefereeModule', {
            boutIndex: bout.bout_order || 0,
            fencer1Name: `${bout.left_fname} ${bout.left_lname}`,
            fencer2Name: `${bout.right_fname} ${bout.right_lname}`,
            currentScore1: bout.left_score || 0,
            currentScore2: bout.right_score || 0,
            onSaveScores: async (score1: number, score2: number) => {
                try {
                    // Update bout scores and advance winner
                    await dbUpdateDEBoutAndAdvanceWinner(
                        bout.id,
                        score1,
                        score2,
                        bout.lfencer,
                        bout.rfencer
                    );

                    // Refresh to show updated scores and advancement
                    setRefreshKey(prev => prev + 1);
                } catch (error) {
                    console.error('Error updating bout scores:', error);
                    Alert.alert('Error', 'Failed to save scores.');
                }
            },
        });
    };

    // Group bouts by round for better display
    const groupBoutsByRound = (bouts: any[]) => {
        const grouped: Record<number, any[]> = {};

        bouts.forEach(bout => {
            const round = bout.bracket_round || 1;
            if (!grouped[round]) {
                grouped[round] = [];
            }
            grouped[round].push(bout);
        });

        return Object.entries(grouped)
            .sort(([roundA], [roundB]) => parseInt(roundA) - parseInt(roundB))
            .map(([round, bouts]) => ({
                round: parseInt(round),
                bouts
            }));
    };

    const renderBout = (bout: any, bracketType: BracketType) => {
        // Convert bracket types to match DEBoutCard's expected types
        const cardBracketType =
            bracketType === 'east' ? 'winners' :
                bracketType === 'north' || bracketType === 'west' ? 'losers' : 'compass';

        return (
            <DEBoutCard
                key={bout.id}
                id={bout.id}
                fencerA={bout.lfencer ? {
                    id: bout.lfencer,
                    fname: bout.left_fname || '',
                    lname: bout.left_lname || '',
                    erating: 'U',
                    eyear: 0,
                    frating: 'U',
                    fyear: 0,
                    srating: 'U',
                    syear: 0
                } : undefined}
                fencerB={bout.rfencer ? {
                    id: bout.rfencer,
                    fname: bout.right_fname || '',
                    lname: bout.right_lname || '',
                    erating: 'U',
                    eyear: 0,
                    frating: 'U',
                    fyear: 0,
                    srating: 'U',
                    syear: 0
                } : undefined}
                scoreA={bout.left_score !== null ? bout.left_score : undefined}
                scoreB={bout.right_score !== null ? bout.right_score : undefined}
                seedA={bout.seed_left}
                seedB={bout.seed_right}
                winner={bout.victor}
                isBye={!bout.lfencer || !bout.rfencer}
                bracketType={cardBracketType}
                onPress={() => handleBoutPress(bout)}
            />
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading compass draw brackets...</Text>
            </View>
        );
    }

    // Group bouts by round
    const groupedEast = groupBoutsByRound(eastBracket);
    const groupedNorth = groupBoutsByRound(northBracket);
    const groupedWest = groupBoutsByRound(westBracket);
    const groupedSouth = groupBoutsByRound(southBracket);

    // Get the current bracket display
    const getCurrentBracketView = () => {
        switch (selectedTab) {
            case 'east':
                return (
                    <>
                        {groupedEast.map(group => (
                            <View key={`east-${group.round}`} style={styles.roundContainer}>
                                <Text style={styles.roundTitle}>
                                    East Round {group.round}
                                </Text>
                                {group.bouts.map(bout => renderBout(bout, 'east'))}
                            </View>
                        ))}
                        {groupedEast.length === 0 && (
                            <Text style={styles.emptyText}>No bouts in East bracket</Text>
                        )}
                    </>
                );
            case 'north':
                return (
                    <>
                        {groupedNorth.map(group => (
                            <View key={`north-${group.round}`} style={styles.roundContainer}>
                                <Text style={styles.roundTitle}>
                                    North Round {group.round}
                                </Text>
                                {group.bouts.map(bout => renderBout(bout, 'north'))}
                            </View>
                        ))}
                        {groupedNorth.length === 0 && (
                            <Text style={styles.emptyText}>No bouts in North bracket yet</Text>
                        )}
                    </>
                );
            case 'west':
                return (
                    <>
                        {groupedWest.map(group => (
                            <View key={`west-${group.round}`} style={styles.roundContainer}>
                                <Text style={styles.roundTitle}>
                                    West Round {group.round}
                                </Text>
                                {group.bouts.map(bout => renderBout(bout, 'west'))}
                            </View>
                        ))}
                        {groupedWest.length === 0 && (
                            <Text style={styles.emptyText}>No bouts in West bracket yet</Text>
                        )}
                    </>
                );
            case 'south':
                return (
                    <>
                        {groupedSouth.map(group => (
                            <View key={`south-${group.round}`} style={styles.roundContainer}>
                                <Text style={styles.roundTitle}>
                                    South Round {group.round}
                                </Text>
                                {group.bouts.map(bout => renderBout(bout, 'south'))}
                            </View>
                        ))}
                        {groupedSouth.length === 0 && (
                            <Text style={styles.emptyText}>No bouts in South bracket yet</Text>
                        )}
                    </>
                );
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>
                {event.weapon} {event.gender} {event.age}
            </Text>
            <Text style={styles.subtitle}>Compass Draw</Text>

            {/* Tab selector */}
            <View style={styles.tabContainer}>
                {(['east', 'north', 'west', 'south'] as BracketType[]).map((direction) => (
                    <TouchableOpacity
                        key={direction}
                        style={[
                            styles.tab,
                            selectedTab === direction && styles.activeTab,
                            styles[`${direction}Tab`]
                        ]}
                        onPress={() => setSelectedTab(direction)}
                    >
                        <Text style={[
                            styles.tabText,
                            selectedTab === direction && styles.activeTabText
                        ]}>
                            {direction.charAt(0).toUpperCase() + direction.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.directionDescription}>
                {getCompassDirectionName(selectedTab)}
            </Text>

            <ScrollView style={styles.bracketContainer}>
                {getCurrentBracketView()}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 15,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 5,
        color: '#666',
    },
    tabContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        marginBottom: 5,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
    },
    eastTab: {
        borderBottomColor: '#4CAF50',
    },
    northTab: {
        borderBottomColor: '#2196F3',
    },
    westTab: {
        borderBottomColor: '#FFC107',
    },
    southTab: {
        borderBottomColor: '#F44336',
    },
    activeTab: {
        borderBottomWidth: 3,
    },
    tabText: {
        fontSize: 14,
        color: '#666',
    },
    activeTabText: {
        fontWeight: 'bold',
    },
    directionDescription: {
        textAlign: 'center',
        fontSize: 14,
        fontStyle: 'italic',
        color: '#666',
        paddingVertical: 5,
    },
    bracketContainer: {
        flex: 1,
        padding: 10,
    },
    roundContainer: {
        marginBottom: 20,
    },
    roundTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        backgroundColor: '#f0f0f0',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 4,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 30,
        fontSize: 16,
        color: '#666',
        fontStyle: 'italic',
    }
});

export default CompassDrawPage;
// src/navigation/screens/DEBracketPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput } from 'react-native';
import { useRoute, RouteProp, useNavigation, useFocusEffect, usePreventRemove } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Event, Fencer, Round } from '../navigation/types';
import { useTranslation } from 'react-i18next';
import { BLEStatusBar } from '../../networking/components/BLEStatusBar';
import { useScoringBoxContext } from '../../networking/ble/ScoringBoxContext';
import { ConnectionState } from '../../networking/ble/types';
import {
    dbGetDEBouts,
    dbGetRoundsForEvent,
    dbUpdateBoutScores,
    dbUpdateDEBoutAndAdvanceWinner,
    dbGetDETableSize,
    dbIsDERoundComplete, // Add this import
} from '../../db/DrizzleDatabaseUtils';

type DEBracketPageParams = {
    event: Event;
    currentRoundIndex: number;
    roundId: number;
};

type DEBracketPageRouteProp = RouteProp<{ params: DEBracketPageParams }, 'params'>;
type DEBracketPageNavProp = NativeStackNavigationProp<RootStackParamList, 'DEBracketPage'>;

interface DEBout {
    id: number;
    tableOf: number;
    boutIndex: number;
    fencerA?: Fencer;
    fencerB?: Fencer;
    scoreA?: number;
    scoreB?: number;
    winner?: number; // ID of the winner
    isBye?: boolean;
    seedA?: number;
    seedB?: number;
}

interface DEBracketRound {
    roundIndex: number;
    tableOf: number;
    matches: DEBout[];
}

interface DEBracketData {
    rounds: DEBracketRound[];
}

const DEBracketPage: React.FC = () => {
    const route = useRoute<DEBracketPageRouteProp>();
    const navigation = useNavigation<DEBracketPageNavProp>();
    const { event, currentRoundIndex, roundId, isRemote = false } = route.params;
    const { t } = useTranslation();
    const { connectionState, disconnect, connectedDeviceName } = useScoringBoxContext();

    const [round, setRound] = useState<Round | null>(null);
    const [bracketData, setBracketData] = useState<DEBracketData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshKey, setRefreshKey] = useState<number>(0); // Used to force re-render
    const [bracketFormat, setBracketFormat] = useState<'single' | 'double' | 'compass'>('single');
    const [isRoundComplete, setIsRoundComplete] = useState<boolean>(false); // Add this state
    const [isFinalRound, setIsFinalRound] = useState<boolean>(false); // Add this state
    const [isRandomizing, setIsRandomizing] = useState<boolean>(false); // For Random Score button
    const [expandedBoutIndex, setExpandedBoutIndex] = useState<number | null>(null);
    const [scoreInputs, setScoreInputs] = useState<{ [key: number]: { scoreA: string; scoreB: string } }>({});

    // Check if we should prevent navigation
    const shouldPreventNavigation = connectionState === ConnectionState.CONNECTED;

    // Use the recommended hook for preventing navigation
    usePreventRemove(shouldPreventNavigation, ({ data }) => {
        Alert.alert(
            t('deBracketPage.disconnectBoxPromptTitle'),
            t('deBracketPage.disconnectBoxPromptMessage'),
            [
                {
                    text: t('common.cancel'),
                    style: 'cancel',
                },
                {
                    text: t('deBracketPage.exitWithoutDisconnecting'),
                    onPress: () => navigation.dispatch(data.action),
                },
                {
                    text: t('deBracketPage.disconnectAndExit'),
                    onPress: async () => {
                        try {
                            await disconnect();
                            navigation.dispatch(data.action);
                        } catch (error) {
                            //console.error('Failed to disconnect:', error);
                            navigation.dispatch(data.action);
                        }
                    },
                    style: 'destructive',
                },
            ],
            { cancelable: true }
        );
    });

    useEffect(() => {
        async function fetchRoundAndBracket() {
            try {
                setLoading(true);

                // 1. Get the current round
                const rounds = await dbGetRoundsForEvent(event.id);
                const currentRound = rounds.find(r => r.id === roundId);

                if (!currentRound) {
                    throw new Error('Round not found');
                }

                setRound(currentRound);

                // Check if this is the final round
                setIsFinalRound(currentRoundIndex === rounds.length - 1);

                if (currentRound.type !== 'de') {
                    Alert.alert(t('common.error'), t('deBracketPage.notDERound'));
                    navigation.goBack();
                    return;
                }

                // Set bracket format based on round data
                setBracketFormat(currentRound.deformat as 'single' | 'double' | 'compass');

                // 2. Get the DE table size
                const tableSize = currentRound.detablesize || 0;

                // 3. Get all bouts for this round
                const bouts = await dbGetDEBouts(roundId);
                console.log(`Fetched ${bouts.length} DE bouts for round ${roundId}`);

                // 4. Check if the round is complete
                const roundComplete = await dbIsDERoundComplete(roundId);
                setIsRoundComplete(roundComplete);

                // 5. Organize bouts into bracket rounds
                const processedBracket = processBoutsIntoBracket(bouts, tableSize);
                setBracketData(processedBracket);
            } catch (error) {
                //console.error('Error loading DE bracket:', error);
                //Alert.alert(t('common.error'), t('deBracketPage.failedToLoadBracket'));
            } finally {
                setLoading(false);
            }
        }

        fetchRoundAndBracket();
    }, [event, currentRoundIndex, roundId, refreshKey]);

    const processBoutsIntoBracket = (bouts: any[], tableSize: number): DEBracketData => {
        console.log(`Processing ${bouts?.length || 0} bouts into bracket with tableSize=${tableSize}`);
        if (!bouts || bouts.length === 0) {
            console.log('No bouts to process, returning empty bracket');
            return { rounds: [] };
        }

        // Calculate number of rounds based on table size
        const numRounds = Math.log2(tableSize);
        const rounds: DEBracketRound[] = [];

        // Create rounds
        for (let i = 0; i < numRounds; i++) {
            const currentTableOf = tableSize / Math.pow(2, i);
            const roundBouts = bouts.filter(bout => bout.tableof === currentTableOf);
            console.log(`Round ${i}: found ${roundBouts.length} bouts for tableOf=${currentTableOf}`);

            // Sort bouts by their position in the bracket
            roundBouts.sort((a, b) => a.id - b.id);

            const matches: DEBout[] = [];
            for (let j = 0; j < roundBouts.length; j++) {
                const bout = roundBouts[j];
                matches.push({
                    id: bout.id,
                    tableOf: bout.tableof,
                    boutIndex: j,
                    fencerA: bout.lfencer
                        ? {
                              id: bout.lfencer,
                              fname: bout.left_fname !== null && bout.left_fname !== undefined ? bout.left_fname : '',
                              lname: bout.left_lname !== null && bout.left_lname !== undefined ? bout.left_lname : '',
                              erating: 'U',
                              eyear: 0,
                              frating: 'U',
                              fyear: 0,
                              srating: 'U',
                              syear: 0,
                          }
                        : undefined,
                    fencerB: bout.rfencer
                        ? {
                              id: bout.rfencer,
                              fname:
                                  bout.right_fname !== null && bout.right_fname !== undefined ? bout.right_fname : '',
                              lname:
                                  bout.right_lname !== null && bout.right_lname !== undefined ? bout.right_lname : '',
                              erating: 'U',
                              eyear: 0,
                              frating: 'U',
                              fyear: 0,
                              srating: 'U',
                              syear: 0,
                          }
                        : undefined,
                    scoreA: bout.left_score !== null ? bout.left_score : undefined,
                    scoreB: bout.right_score !== null ? bout.right_score : undefined,
                    winner: bout.victor,
                    // Mark as a BYE if exactly one fencer is present and the bout has a victor set
                    // (true BYEs are automatic advancements)
                    isBye: (!bout.lfencer && bout.rfencer) || (bout.lfencer && !bout.rfencer),
                    seedA: bout.seed_left,
                    seedB: bout.seed_right,
                });
            }

            rounds.push({
                roundIndex: i,
                tableOf: currentTableOf,
                matches,
            });
        }

        return { rounds };
    };

    const handleBoutPress = (bout: DEBout) => {
        try {
            // Skip if it's a BYE - these have a single fencer who automatically advances
            if (bout.isBye) {
                Alert.alert(t('deBracketPage.byeTitle'), t('deBracketPage.byeMessage'));
                return;
            }

            // Skip if both fencers aren't set yet (TBD - waiting for previous round)
            if (!bout.fencerA || !bout.fencerB) {
                Alert.alert(t('deBracketPage.tbdTitle'), t('deBracketPage.tbdMessage'));
                return;
            }

            // Toggle expanded state for this bout
            if (expandedBoutIndex === bout.id) {
                setExpandedBoutIndex(null);
            } else {
                setExpandedBoutIndex(bout.id);
                // Initialize score inputs for this bout if not already present
                if (!scoreInputs[bout.id]) {
                    setScoreInputs(prev => ({
                        ...prev,
                        [bout.id]: {
                            scoreA: String(bout.scoreA || 0),
                            scoreB: String(bout.scoreB || 0),
                        },
                    }));
                }
            }
        } catch (error) {
            //console.error('Error in handleBoutPress:', error);
            //Alert.alert(t('common.error'), t('deBracketPage.unexpectedBoutError'));
        }
    };

    // Handle score input changes
    const handleScoreChange = (boutId: number, which: 'A' | 'B', value: string) => {
        setScoreInputs(prev => ({
            ...prev,
            [boutId]: {
                ...prev[boutId],
                [`score${which}`]: value,
            },
        }));
    };

    // Handle score submission
    const handleSubmitScores = async (bout: DEBout) => {
        try {
            const inputs = scoreInputs[bout.id];
            if (!inputs) return;

            const scoreA = parseInt(inputs.scoreA, 10) || 0;
            const scoreB = parseInt(inputs.scoreB, 10) || 0;

            // Update bout scores and advance winner
            await dbUpdateDEBoutAndAdvanceWinner(bout.id, scoreA, scoreB, bout.fencerA!.id, bout.fencerB!.id);

            // Refresh to show updated scores and advancement
            setRefreshKey(prev => prev + 1);
            setExpandedBoutIndex(null);

            // Check if connected to scoring box and show disconnect prompt
            if (connectionState === ConnectionState.CONNECTED) {
                Alert.alert(
                    t('common.disconnectBoxPromptTitle'),
                    t('common.disconnectBoxPromptMessage'),
                    [
                        {
                            text: t('common.cancel'),
                            style: 'cancel',
                        },
                        {
                            text: t('common.exitWithoutDisconnecting'),
                            onPress: () => {
                                // Just close the alert - already saved scores
                            },
                        },
                        {
                            text: t('common.disconnectAndExit'),
                            onPress: async () => {
                                try {
                                    await disconnect();
                                } catch (error) {
                                    //console.error('Failed to disconnect:', error);
                                }
                            },
                            style: 'destructive',
                        },
                    ],
                    { cancelable: true }
                );
            }
        } catch (error) {
            //console.error('Error updating bout scores:', error);
            //Alert.alert(t('common.error'), t('deBracketPage.failedToSaveScores'));
        }
    };

    // Open referee module
    const openRefModuleForBout = (bout: DEBout) => {
        // Create safe fencer names
        const fencer1Name =
            `${bout.fencerA!.fname || ''} ${bout.fencerA!.lname || ''}`.trim() || t('common.defaultFencerA');
        const fencer2Name =
            `${bout.fencerB!.fname || ''} ${bout.fencerB!.lname || ''}`.trim() || t('common.defaultFencerB');

        // Navigate to Referee Module
        navigation.navigate('RefereeModule', {
            boutIndex: bout.boutIndex,
            fencer1Name: fencer1Name,
            fencer2Name: fencer2Name,
            currentScore1: bout.scoreA || 0,
            currentScore2: bout.scoreB || 0,
            weapon: event.weapon,
            onSaveScores: async (score1: number, score2: number) => {
                try {
                    // Update bout scores and advance winner
                    await dbUpdateDEBoutAndAdvanceWinner(bout.id, score1, score2, bout.fencerA!.id, bout.fencerB!.id);

                    // Refresh to show updated scores and advancement
                    setRefreshKey(prev => prev + 1);
                    setExpandedBoutIndex(null);

                    // Check if connected to scoring box and show disconnect prompt
                    if (connectionState === ConnectionState.CONNECTED) {
                        Alert.alert(
                            t('common.disconnectBoxPromptTitle'),
                            t('common.disconnectBoxPromptMessage'),
                            [
                                {
                                    text: t('common.cancel'),
                                    style: 'cancel',
                                },
                                {
                                    text: t('common.exitWithoutDisconnecting'),
                                    onPress: () => {
                                        // Just close the alert - already saved scores
                                    },
                                },
                                {
                                    text: t('common.disconnectAndExit'),
                                    onPress: async () => {
                                        try {
                                            await disconnect();
                                        } catch (error) {
                                            //console.error('Failed to disconnect:', error);
                                        }
                                    },
                                    style: 'destructive',
                                },
                            ],
                            { cancelable: true }
                        );
                    }
                } catch (error) {
                    //console.error('Error updating bout scores:', error);
                    //Alert.alert(t('common.error'), t('deBracketPage.failedToSaveScores'));
                }
            },
        });
    };

    const handleViewResults = () => {
        navigation.navigate('TournamentResultsPage', {
            eventId: event.id,
            isRemote,
        });
    };

    // Function to randomly assign scores to all bouts in the bracket
    const handleRandomizeScores = async () => {
        if (!bracketData || isRandomizing) return;

        try {
            setIsRandomizing(true);

            const scoreAllAvailableBouts = async () => {
                // Get fresh bracket data
                const rounds = await dbGetRoundsForEvent(event.id);
                const currentRound = rounds.find(r => r.id === roundId);
                if (!currentRound) {
                    throw new Error('Round not found');
                }

                const tableSize = currentRound.detablesize || 0;
                const bouts = await dbGetDEBouts(roundId);

                // Find all unscored bouts with both fencers assigned
                const unscoredBouts: any[] = bouts.filter(
                    bout =>
                        bout.lfencer &&
                        bout.rfencer &&
                        (bout.left_score === null || bout.left_score === undefined) &&
                        (bout.right_score === null || bout.right_score === undefined)
                );

                if (unscoredBouts.length === 0) {
                    return false; // No more bouts to score
                }

                console.log(`Found ${unscoredBouts.length} unscored bouts to randomize`);

                // Sort by tableOf in descending order to process earlier rounds first
                unscoredBouts.sort((a, b) => b.tableof - a.tableof);

                // Process each bout
                for (const bout of unscoredBouts) {
                    // Generate random scores
                    const winnerScore = Math.floor(Math.random() * 6) + 10; // 10-15
                    const loserScore = Math.floor(Math.random() * winnerScore); // 0 to (winnerScore-1)

                    // Randomly decide which fencer gets the higher score
                    let scoreA, scoreB;
                    if (Math.random() < 0.5) {
                        scoreA = winnerScore;
                        scoreB = loserScore;
                    } else {
                        scoreA = loserScore;
                        scoreB = winnerScore;
                    }

                    // Update bout scores and advance winner
                    await dbUpdateDEBoutAndAdvanceWinner(bout.id, scoreA, scoreB, bout.lfencer, bout.rfencer);
                }

                return true; // Successfully scored some bouts
            };

            // Recursive function to score all bouts until no more are available
            const recursivelyScoreAllBouts = async () => {
                const moreAvailable = await scoreAllAvailableBouts();
                if (moreAvailable) {
                    // Wait a moment for database operations to complete
                    await new Promise(resolve => setTimeout(resolve, 300));
                    // Check if there are newly created bouts to score
                    return recursivelyScoreAllBouts();
                }
                return;
            };

            // Ask for confirmation before randomizing scores
            Alert.alert(
                t('deBracketPage.randomizeScoresTitle'),
                t('deBracketPage.randomizeScoresMessage', { count: 'all' }),
                [
                    {
                        text: t('common.cancel'),
                        style: 'cancel',
                        onPress: () => setIsRandomizing(false),
                    },
                    {
                        text: t('common.confirm'),
                        onPress: async () => {
                            try {
                                await recursivelyScoreAllBouts();
                                // Refresh to show updated bracket
                                setRefreshKey(prev => prev + 1);
                            } catch (error) {
                                //console.error('Error in recursive scoring:', error);
                                //Alert.alert(t('common.error'), t('deBracketPage.failedToRandomizeScores'));
                            } finally {
                                setIsRandomizing(false);
                            }
                        },
                    },
                ],
                { cancelable: false }
            );
        } catch (error) {
            //console.error('Error randomizing scores:', error);
            //Alert.alert(t('common.error'), t('deBracketPage.failedToRandomizeScores'));
            setIsRandomizing(false);
        }
    };

    const renderBout = (bout: DEBout) => {
        // Check if bout is valid
        if (!bout) {
            //console.error('Received invalid bout in renderBout');
            return null;
        }

        // Safely create fencer names with null checks
        let fencerAName = 'TBD';
        if (bout.fencerA) {
            if (bout.fencerA.lname !== undefined && bout.fencerA.fname !== undefined) {
                fencerAName = `${bout.fencerA.lname}, ${bout.fencerA.fname}`;
            } else if (bout.fencerA.lname) {
                fencerAName = bout.fencerA.lname;
            } else if (bout.fencerA.fname) {
                fencerAName = bout.fencerA.fname;
            }
        }

        let fencerBName = 'TBD';
        if (bout.fencerB) {
            if (bout.fencerB.lname !== undefined && bout.fencerB.fname !== undefined) {
                fencerBName = `${bout.fencerB.lname}, ${bout.fencerB.fname}`;
            } else if (bout.fencerB.lname) {
                fencerBName = bout.fencerB.lname;
            } else if (bout.fencerB.fname) {
                fencerBName = bout.fencerB.fname;
            }
        }

        // Determine styles based on bout status
        const boutCompleted = bout.winner !== undefined;
        const isTBD = !bout.fencerA && !bout.fencerB;
        // A bout is a true BYE if it's marked as such or has exactly one fencer
        const isActualBye = bout.isBye || (!bout.fencerA && bout.fencerB) || (bout.fencerA && !bout.fencerB);

        // Determine winner (if completed)
        const fencerAWon = bout.winner === bout.fencerA?.id;
        const fencerBWon = bout.winner === bout.fencerB?.id;

        return (
            <TouchableOpacity
                style={[
                    styles.boutContainer,
                    isActualBye && styles.byeBout,
                    isTBD && styles.tbdBout,
                    boutCompleted && styles.completedBout,
                ]}
                onPress={() => handleBoutPress(bout)}
                disabled={isActualBye || isTBD}
            >
                <View style={styles.fencerRow}>
                    <View style={styles.fencerInfo}>
                        <Text
                            style={[
                                styles.seedText,
                                bout.seedA !== undefined && bout.fencerA !== undefined && styles.seedVisible,
                            ]}
                        >
                            {bout.seedA !== undefined && bout.fencerA !== undefined ? `(${bout.seedA})` : ''}
                        </Text>
                        <Text
                            style={[
                                styles.fencerName,
                                fencerAWon && styles.winnerText,
                                !bout.fencerA && (isTBD ? styles.tbdText : styles.byeText),
                            ]}
                        >
                            {bout.fencerA ? fencerAName : isTBD ? t('deBracketPage.tbd') : t('deBracketPage.bye')}
                        </Text>
                    </View>
                    <Text style={styles.fencerScore}>{bout.scoreA !== undefined ? bout.scoreA : '-'}</Text>
                </View>
                <View style={styles.fencerRow}>
                    <View style={styles.fencerInfo}>
                        <Text
                            style={[
                                styles.seedText,
                                bout.seedB !== undefined && bout.fencerB !== undefined && styles.seedVisible,
                            ]}
                        >
                            {bout.seedB !== undefined && bout.fencerB !== undefined ? `(${bout.seedB})` : ''}
                        </Text>
                        <Text
                            style={[
                                styles.fencerName,
                                fencerBWon && styles.winnerText,
                                !bout.fencerB && (isTBD ? styles.tbdText : styles.byeText),
                            ]}
                        >
                            {bout.fencerB ? fencerBName : isTBD ? t('deBracketPage.tbd') : t('deBracketPage.bye')}
                        </Text>
                    </View>
                    <Text style={styles.fencerScore}>{bout.scoreB !== undefined ? bout.scoreB : '-'}</Text>
                </View>
            </TouchableOpacity>

            {/* Expanded view with score entry */}
            {expandedBoutIndex === bout.id && !bout.winner && bout.fencerA && bout.fencerB && (
                <View style={styles.scoreEntryContainer}>
                    <View style={styles.scoreEntryRow}>
                        <View style={styles.scoreColumn}>
                            <Text style={styles.scoreFencerLabel}>
                                {fencerAName}:
                            </Text>
                            <TextInput
                                style={styles.scoreInput}
                                keyboardType="numeric"
                                value={scoreInputs[bout.id]?.scoreA || ''}
                                onChangeText={val => handleScoreChange(bout.id, 'A', val)}
                            />
                        </View>
                        <View style={styles.scoreColumn}>
                            <Text style={styles.scoreFencerLabel}>
                                {fencerBName}:
                            </Text>
                            <TextInput
                                style={styles.scoreInput}
                                keyboardType="numeric"
                                value={scoreInputs[bout.id]?.scoreB || ''}
                                onChangeText={val => handleScoreChange(bout.id, 'B', val)}
                            />
                        </View>
                    </View>
                    <View style={styles.scoreButtonsRow}>
                        <TouchableOpacity
                            style={styles.enterButton}
                            onPress={() => handleSubmitScores(bout)}
                        >
                            <Text style={styles.enterButtonText}>{t('common.enter')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.refModuleButton}
                            onPress={() => openRefModuleForBout(bout)}
                        >
                            <Text style={styles.refModuleButtonText}>{t('deBracketPage.refModule')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Expanded view for completed bouts */}
            {expandedBoutIndex === bout.id && bout.winner && (
                <View style={styles.boutDetailsContainer}>
                    <Text style={styles.boutDetailsTitle}>{t('deBracketPage.boutResult')}</Text>
                    <View style={styles.fencerDetailRow}>
                        <Text style={[styles.fencerDetailName, bout.winner === bout.fencerA?.id && styles.winnerDetailText]}>
                            {fencerAName}
                        </Text>
                        <Text style={[styles.fencerDetailScore, bout.winner === bout.fencerA?.id && styles.winnerDetailText]}>
                            {bout.scoreA || 0}
                        </Text>
                    </View>
                    <View style={styles.fencerDetailRow}>
                        <Text style={[styles.fencerDetailName, bout.winner === bout.fencerB?.id && styles.winnerDetailText]}>
                            {fencerBName}
                        </Text>
                        <Text style={[styles.fencerDetailScore, bout.winner === bout.fencerB?.id && styles.winnerDetailText]}>
                            {bout.scoreB || 0}
                        </Text>
                    </View>
                </View>
            )}
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>{t('deBracketPage.loadingBracket')}</Text>
            </View>
        );
    }

    if (!bracketData || !round) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{t('deBracketPage.failedToLoadBracketData')}</Text>
            </View>
        );
    }

    // Render based on the bracket format
    return (
        <ScrollView style={styles.container}>
            <BLEStatusBar compact={true} />
            <Text style={styles.title}>
                {event.weapon} {event.gender} {event.age} DE
            </Text>

            <Text style={styles.formatText}>
                {t('deBracketPage.format')}: {t(`deBracketPage.${bracketFormat}Elimination`)}
            </Text>

            {/* Add View Results button if this is the final round and it's complete */}
            {isRoundComplete && isFinalRound && (
                <TouchableOpacity style={styles.viewResultsButton} onPress={handleViewResults}>
                    <Text style={styles.viewResultsButtonText}>{t('deBracketPage.viewTournamentResults')}</Text>
                </TouchableOpacity>
            )}

            {/* Random Score button */}
            <TouchableOpacity
                style={[styles.randomScoreButton, isRandomizing && styles.disabledButton]}
                onPress={handleRandomizeScores}
                disabled={isRandomizing}
            >
                {isRandomizing ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <Text style={styles.randomScoreButtonText}>{t('deBracketPage.randomizeScores')}</Text>
                )}
            </TouchableOpacity>

            {bracketData.rounds.map((round, index) => (
                <View key={index} style={styles.roundContainer}>
                    <Text style={styles.roundTitle}>{getRoundName(round.tableOf, t)}</Text>
                    <View style={styles.boutsContainer}>
                        {round.matches.map((bout, boutIndex) => (
                            <View key={boutIndex} style={styles.boutWrapper}>
                                {renderBout(bout)}
                            </View>
                        ))}
                    </View>
                </View>
            ))}
        </ScrollView>
    );
};

// Helper function to get round name based on tableOf value
// Now accepts the translation function as a parameter to avoid hook rules violation
function getRoundName(tableOf: number, t: (key: string, options?: any) => string): string {
    switch (tableOf) {
        case 2:
            return t('deBracketPage.finals');
        case 4:
            return t('deBracketPage.semiFinals');
        case 8:
            return t('deBracketPage.quarterFinals');
        case 16:
            return t('deBracketPage.tableOf16');
        case 32:
            return t('deBracketPage.tableOf32');
        case 64:
            return t('deBracketPage.tableOf64');
        case 128:
            return t('deBracketPage.tableOf128');
        case 256:
            return t('deBracketPage.tableOf256');
        default:
            return t('deBracketPage.tableOfX', { number: tableOf });
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
        backgroundColor: '#fff',
    },
    viewResultsButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 15,
        marginHorizontal: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 10,
    },
    viewResultsButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    randomScoreButton: {
        backgroundColor: '#FF9500',
        paddingVertical: 15,
        marginHorizontal: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    randomScoreButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    disabledButton: {
        opacity: 0.6,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: 'red',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        marginVertical: 15,
        color: '#001f3f',
    },
    formatText: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 15,
        color: '#666',
    },
    roundContainer: {
        marginBottom: 25,
    },
    roundTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
        backgroundColor: '#f0f0f0',
        paddingVertical: 8,
        borderRadius: 4,
        color: '#001f3f',
    },
    boutsContainer: {
        flexDirection: 'column',
    },
    boutWrapper: {
        marginBottom: 15,
        alignItems: 'center',
    },
    boutContainer: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 12,
        width: '90%',
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    byeBout: {
        backgroundColor: '#f9f9f9',
        opacity: 0.8,
        borderStyle: 'dashed',
        borderColor: '#ccc',
    },
    tbdBout: {
        backgroundColor: '#f5f5f5',
        opacity: 0.7,
        borderStyle: 'dotted',
        borderColor: '#ddd',
    },
    completedBout: {
        borderColor: '#4CAF50',
        borderWidth: 2,
    },
    fencerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    fencerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    seedText: {
        fontSize: 14,
        marginRight: 6,
        color: '#666',
        opacity: 0,
    },
    seedVisible: {
        opacity: 1,
    },
    fencerName: {
        fontSize: 16,
    },
    byeText: {
        fontStyle: 'italic',
        fontWeight: '500',
        color: '#777', // Darker color for BYEs to distinguish them
    },
    tbdText: {
        fontStyle: 'italic',
        fontWeight: '300',
        color: '#aaa', // Lighter color for TBDs
    },
    fencerScore: {
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 10,
        minWidth: 30,
        textAlign: 'center',
    },
    winnerText: {
        fontWeight: 'bold',
        color: '#4CAF50',
    },
    scoreEntryContainer: {
        backgroundColor: '#f8f8f8',
        padding: 15,
        marginTop: -8,
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#ccc',
        marginHorizontal: '5%',
    },
    scoreEntryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    scoreColumn: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 4,
    },
    scoreFencerLabel: {
        fontSize: 16,
        marginBottom: 8,
        textAlign: 'center',
        fontWeight: '500',
    },
    scoreInput: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 6,
        width: 80,
        padding: 8,
        textAlign: 'center',
        fontSize: 18,
        backgroundColor: '#fff',
    },
    scoreButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
        gap: 10,
    },
    enterButton: {
        flex: 1,
        backgroundColor: '#4CAF50',
        paddingVertical: 12,
        borderRadius: 6,
        alignItems: 'center',
    },
    enterButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    refModuleButton: {
        flex: 1,
        backgroundColor: '#007AFF',
        paddingVertical: 12,
        borderRadius: 6,
        alignItems: 'center',
    },
    refModuleButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    boutDetailsContainer: {
        backgroundColor: '#f0f0f0',
        padding: 15,
        marginTop: -8,
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#ccc',
        marginHorizontal: '5%',
    },
    boutDetailsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    fencerDetailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
    },
    fencerDetailName: {
        fontSize: 16,
        flex: 1,
    },
    fencerDetailScore: {
        fontSize: 18,
        fontWeight: 'bold',
        width: 40,
        textAlign: 'center',
    },
    winnerDetailText: {
        color: '#4CAF50',
        fontWeight: 'bold',
    },
});

export default DEBracketPage;

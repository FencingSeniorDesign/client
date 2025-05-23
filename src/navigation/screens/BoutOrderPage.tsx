// src/navigation/screens/BoutOrderPage.tsx
import React, { useEffect, useState } from 'react';
import { useAbility } from '../../rbac/AbilityContext';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Modal,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useRoute, RouteProp, useNavigation, useFocusEffect, usePreventRemove } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, Fencer, Bout } from '../navigation/types';
import { useBoutsForPool, useUpdatePoolBoutScores, usePools } from '../../data/TournamentDataHooks';
import { assignPoolPositions, getBoutOrder } from '../utils/BoutOrderUtils';
import tournamentClient from '../../networking/TournamentClient';
import ConnectionStatusBar from '../../networking/components/ConnectionStatusBar';
import { useTranslation } from 'react-i18next';
import { BLEStatusBar } from '../../networking/components/BLEStatusBar';
import { useScoringBoxContext } from '../../networking/ble/ScoringBoxContext';
import { ConnectionState } from '../../networking/ble/types';

type BoutOrderPageRouteProps = RouteProp<RootStackParamList, 'BoutOrderPage'>;
type BoutOrderPageNavProp = StackNavigationProp<RootStackParamList, 'BoutOrderPage'>;

const BoutOrderPage: React.FC = () => {
    const route = useRoute<BoutOrderPageRouteProps>();
    const navigation = useNavigation<BoutOrderPageNavProp>();
    const { roundId, poolId, isRemote = false, weapon } = route.params;
    const { ability } = useAbility();
    const { t } = useTranslation();
    const { connectionState, disconnect, connectedDeviceName } = useScoringBoxContext();

    // Check if user has permission to score bouts
    const canScoreBouts = ability.can('score', 'Bout');

    // Use React Query hooks, ensuring they respect remote status
    const { data: boutsData, isLoading: boutsLoading, error: boutsError } = useBoutsForPool(roundId, poolId);
    const { data: poolsData, isLoading: poolsLoading, error: poolsError } = usePools(roundId);
    const updateBoutScoresMutation = useUpdatePoolBoutScores();

    const [bouts, setBouts] = useState<Bout[]>([]);
    const [fencers, setFencers] = useState<Fencer[]>([]);
    const [expandedBoutIndex, setExpandedBoutIndex] = useState<number | null>(null);

    // Scoring-related state (only used by referees)
    const [protectedScores, setProtectedScores] = useState<boolean>(false);
    const [alterModalVisible, setAlterModalVisible] = useState<boolean>(false);
    const [alterIndex, setAlterIndex] = useState<number | null>(null);
    const [alterScoreA, setAlterScoreA] = useState<string>('0');
    const [alterScoreB, setAlterScoreB] = useState<string>('0');

    // Tie resolution state
    const [tieModalVisible, setTieModalVisible] = useState<boolean>(false);
    const [tieBoutIndex, setTieBoutIndex] = useState<number | null>(null);
    const [selectedWinnerId, setSelectedWinnerId] = useState<number | null>(null);

    // Toggle for double stripping mode (only used by referees)
    const [doubleStripping, setDoubleStripping] = useState<boolean>(false);
    const activeCount = doubleStripping ? 2 : 1;
    const onDeckCount = doubleStripping ? 2 : 1;

    // Check if we should prevent navigation
    const shouldPreventNavigation = canScoreBouts && connectionState === ConnectionState.CONNECTED;

    // Use the recommended hook for preventing navigation
    usePreventRemove(shouldPreventNavigation, ({ data }) => {
        Alert.alert(
            t('boutOrderPage.disconnectBoxPromptTitle'),
            t('boutOrderPage.disconnectBoxPromptMessage'),
            [
                {
                    text: t('common.cancel'),
                    style: 'cancel',
                },
                {
                    text: t('boutOrderPage.exitWithoutDisconnecting'),
                    onPress: () => navigation.dispatch(data.action),
                },
                {
                    text: t('boutOrderPage.disconnectAndExit'),
                    onPress: async () => {
                        try {
                            await disconnect();
                            navigation.dispatch(data.action);
                        } catch (error) {
                            console.error('Failed to disconnect:', error);
                            navigation.dispatch(data.action);
                        }
                    },
                    style: 'destructive',
                },
            ],
            { cancelable: true }
        );
    });

    // Extract fencers from pools data
    useEffect(() => {
        if (poolsData) {
            const currentPool = poolsData.find(pool => pool.poolid === poolId);
            if (currentPool && currentPool.fencers) {
                // Apply club-based pool positions
                const fencersWithPositions = assignPoolPositions(currentPool.fencers);
                setFencers(fencersWithPositions);
            }
        }
    }, [poolsData, poolId]);

    // Process the bouts data when it loads from the hook
    useEffect(() => {
        if (boutsData && fencers.length > 0) {
            console.log(
                `Received bout data for pool ${poolId} (Remote: ${isRemote}):`,
                JSON.stringify(boutsData.slice(0, 1))
            ); // Log first bout for debugging

            // Get the official bout order based on pool size and club affiliations
            const poolSize = fencers.length;
            const boutOrder = getBoutOrder(poolSize, fencers);

            // Map the bout data to our Bout objects
            const fetchedBouts: Bout[] = boutsData.map((row: any) => {
                // Create consistent Bout objects regardless of data source
                const fencerA: Fencer = {
                    id: row.left_fencerid,
                    fname: row.left_fname,
                    lname: row.left_lname,
                    club: row.left_club,
                    clubid: row.left_clubid,
                    clubName: row.left_clubname,
                    clubAbbreviation: row.left_clubabbreviation,
                    erating: 'U',
                    eyear: 0,
                    frating: 'U',
                    fyear: 0,
                    srating: 'U',
                    syear: 0,
                    poolNumber: row.left_poolposition,
                };
                const fencerB: Fencer = {
                    id: row.right_fencerid,
                    fname: row.right_fname,
                    lname: row.right_lname,
                    club: row.right_club,
                    clubid: row.right_clubid,
                    clubName: row.right_clubname,
                    clubAbbreviation: row.right_clubabbreviation,
                    erating: 'U',
                    eyear: 0,
                    frating: 'U',
                    fyear: 0,
                    srating: 'U',
                    syear: 0,
                    poolNumber: row.right_poolposition,
                };
                const scoreA = row.left_score ?? 0;
                const scoreB = row.right_score ?? 0;
                const status = scoreA !== 0 || scoreB !== 0 ? 'completed' : 'pending';

                // Extract winner ID from the victor field
                const winnerId = row.victor !== null ? row.victor : undefined;

                console.log(
                    `Processing bout ${row.id}: scoreA=${scoreA}, scoreB=${scoreB}, victor=${row.victor}, winnerId=${winnerId}`
                );

                const bout = {
                    id: row.id,
                    fencerA,
                    fencerB,
                    scoreA,
                    scoreB,
                    status,
                    winnerId,
                };

                // Add boutOrderPosition for sorting
                const boutPosition = boutOrder.findIndex(([posA, posB]) => {
                    return (
                        (fencerA.poolNumber === posA && fencerB.poolNumber === posB) ||
                        (fencerA.poolNumber === posB && fencerB.poolNumber === posA)
                    );
                });

                return { ...bout, boutOrderPosition: boutPosition !== -1 ? boutPosition : Number.MAX_SAFE_INTEGER };
            });

            // Sort bouts according to the official bout order positions
            const sortedBouts = [...fetchedBouts].sort((a, b) => a.boutOrderPosition - b.boutOrderPosition);

            console.log(
                'Sorted bouts by official bout order:',
                sortedBouts.map(b => `${b.fencerA.poolNumber}-${b.fencerB.poolNumber} (pos: ${b.boutOrderPosition})`)
            );

            setBouts(sortedBouts);
        }
    }, [boutsData, fencers, poolId, isRemote]);

    // For pending bouts, compute a pendingRank based on order in the list.
    let pendingCounter = 0;
    const getPendingRank = (bout: Bout): number | null => {
        if (bout.status === 'pending') {
            return pendingCounter++;
        }
        return null;
    };

    // Handle bout expansion
    const handleBoutPress = (index: number) => {
        setExpandedBoutIndex(prev => (prev === index ? null : index));
    };

    // Handle score submission - only called for referees
    const handleSubmitScores = async (index: number) => {
        if (!canScoreBouts) return;

        const bout = bouts[index];

        // Check for tie and prompt for winner selection if scores are equal
        if (bout.scoreA === bout.scoreB) {
            setTieBoutIndex(index);
            setSelectedWinnerId(null); // Reset winner selection
            setTieModalVisible(true);
            return;
        }

        // If not a tie, automatically set winner based on scores
        const winnerId = bout.scoreA > bout.scoreB ? bout.fencerA.id : bout.fencerB.id;

        try {
            console.log(`Submitting scores for bout ${bout.id}: ${bout.scoreA}-${bout.scoreB}, winner: ${winnerId}`);
            const result = await updateBoutScoresMutation.mutateAsync({
                boutId: bout.id,
                scoreA: bout.scoreA,
                scoreB: bout.scoreB,
                fencerAId: bout.fencerA.id!,
                fencerBId: bout.fencerB.id!,
                roundId,
                poolId,
                winnerId,
            });
            console.log(`Score update completed with result:`, result);

            // Update local bout state with winner ID
            const updatedBouts = bouts.map((b, i) => {
                if (i === index) {
                    return { ...b, winnerId };
                }
                return b;
            });
            setBouts(updatedBouts);

            setExpandedBoutIndex(null);
        } catch (error) {
            console.error('Error updating bout scores:', error);
            Alert.alert(t('common.error'), t('boutOrderPage.failedToUpdateScores'));
        }
    };

    // Handle score changes in the input fields - only called for referees
    const handleScoreChange = (index: number, which: 'A' | 'B', val: string) => {
        if (!canScoreBouts) return;

        const intVal = parseInt(val, 10) || 0;
        const updatedBouts = bouts.map((b, i) => {
            if (i === index) {
                return which === 'A' ? { ...b, scoreA: intVal } : { ...b, scoreB: intVal };
            }
            return b;
        });
        setBouts(updatedBouts);
    };

    // Allow altering scores regardless of bout status if protectedScores is off (for referees only)
    const handleBoutLongPress = (index: number) => {
        if (!canScoreBouts || protectedScores) return;

        setAlterIndex(index);
        setAlterScoreA(String(bouts[index].scoreA));
        setAlterScoreB(String(bouts[index].scoreB));
        setAlterModalVisible(true);
    };

    // Save altered scores - only called for referees
    const handleAlterSave = async () => {
        if (!canScoreBouts || alterIndex === null) return;

        const bout = bouts[alterIndex];
        const newScoreA = parseInt(alterScoreA, 10) || 0;
        const newScoreB = parseInt(alterScoreB, 10) || 0;

        // If entering a tie, close the alter modal and show tie resolution modal
        if (newScoreA === newScoreB) {
            // Store the entered scores first
            const updatedBouts = bouts.map((b, i) => {
                if (i === alterIndex) {
                    return { ...b, scoreA: newScoreA, scoreB: newScoreB };
                }
                return b;
            });
            setBouts(updatedBouts);

            setAlterModalVisible(false);
            setTieBoutIndex(alterIndex);
            setSelectedWinnerId(null);
            setTieModalVisible(true);
            return;
        }

        // If not a tie, set winner automatically
        const winnerId = newScoreA > newScoreB ? bout.fencerA.id : bout.fencerB.id;

        try {
            console.log(`Altering scores for bout ${bout.id} to ${newScoreA}-${newScoreB}, winner: ${winnerId}`);
            const result = await updateBoutScoresMutation.mutateAsync({
                boutId: bout.id,
                scoreA: newScoreA,
                scoreB: newScoreB,
                fencerAId: bout.fencerA.id!,
                fencerBId: bout.fencerB.id!,
                roundId,
                poolId,
                winnerId,
            });

            console.log(`Score alteration completed with result:`, result);

            // Update the local bout state with the new scores and winner
            const updatedBouts = bouts.map((b, i) => {
                if (i === alterIndex) {
                    return { ...b, scoreA: newScoreA, scoreB: newScoreB, winnerId };
                }
                return b;
            });
            setBouts(updatedBouts);

            setAlterModalVisible(false);
            setAlterIndex(null);
        } catch (error) {
            console.error('Error updating bout scores:', error);
            Alert.alert(t('common.error'), t('boutOrderPage.failedToUpdateScores'));
        }
    };

    // Open referee module - only called for referees
    const openRefModuleForBout = (index: number) => {
        if (!canScoreBouts) return;

        const bout = bouts[index];
        navigation.navigate('RefereeModule', {
            boutIndex: index,
            fencer1Name: bout.fencerA.lname || bout.fencerA.fname,
            fencer2Name: bout.fencerB.lname || bout.fencerB.fname,
            currentScore1: bout.scoreA,
            currentScore2: bout.scoreB,
            weapon: weapon,
            onSaveScores: async (score1: number, score2: number) => {
                try {
                    // Handle tie case when returned from referee module
                    if (score1 === score2) {
                        // Store the scores temporarily
                        const updatedBouts = bouts.map((b, i) => {
                            if (i === index) {
                                return { ...b, scoreA: score1, scoreB: score2 };
                            }
                            return b;
                        });
                        setBouts(updatedBouts);

                        // Show tie resolution modal on next render
                        setTimeout(() => {
                            setTieBoutIndex(index);
                            setSelectedWinnerId(null);
                            setTieModalVisible(true);
                        }, 500);
                        return;
                    }

                    // If not a tie, set winner automatically
                    const winnerId = score1 > score2 ? bout.fencerA.id : bout.fencerB.id;

                    console.log(
                        `Saving scores from ref module for bout ${bout.id}: ${score1}-${score2}, winner: ${winnerId}`
                    );
                    const result = await updateBoutScoresMutation.mutateAsync({
                        boutId: bout.id,
                        scoreA: score1,
                        scoreB: score2,
                        fencerAId: bout.fencerA.id!,
                        fencerBId: bout.fencerB.id!,
                        roundId,
                        poolId,
                        winnerId,
                    });

                    // Update local bout state with the new scores and winner
                    const updatedBouts = bouts.map((b, i) => {
                        if (i === index) {
                            return { ...b, scoreA: score1, scoreB: score2, winnerId };
                        }
                        return b;
                    });
                    setBouts(updatedBouts);

                    console.log(`Ref module score update completed with result:`, result);
                } catch (error) {
                    console.error('Error updating bout scores:', error);
                }
            },
        });
    };

    // Handle submitting tied bout with selected winner
    const handleTieWinnerSubmit = async () => {
        if (!canScoreBouts || tieBoutIndex === null || selectedWinnerId === null) {
            setTieModalVisible(false);
            return;
        }

        const bout = bouts[tieBoutIndex];

        try {
            console.log(
                `Submitting tied bout ${bout.id} with scores ${bout.scoreA}-${bout.scoreB}, selected winner: ${selectedWinnerId}`
            );

            // Ensure winner ID is explicitly cast to a number to avoid type issues
            const winnerIdAsNumber = Number(selectedWinnerId);
            console.log(`Winner ID converted to number: ${winnerIdAsNumber}, type: ${typeof winnerIdAsNumber}`);

            const result = await updateBoutScoresMutation.mutateAsync({
                boutId: bout.id,
                scoreA: bout.scoreA,
                scoreB: bout.scoreB,
                fencerAId: bout.fencerA.id!,
                fencerBId: bout.fencerB.id!,
                roundId,
                poolId,
                winnerId: winnerIdAsNumber,
            });

            console.log(`Tie resolution completed with result:`, result);

            // Update local bout state with the winner ID
            const updatedBouts = bouts.map((b, i) => {
                if (i === tieBoutIndex) {
                    console.log(`Updating local bout state for index ${i}, setting winnerId to ${winnerIdAsNumber}`);
                    return { ...b, winnerId: winnerIdAsNumber, status: 'completed' };
                }
                return b;
            });
            setBouts(updatedBouts);

            // Close the tie modal
            setTieModalVisible(false);
            setTieBoutIndex(null);
            setSelectedWinnerId(null);
        } catch (error) {
            console.error('Error updating tied bout:', error);
            Alert.alert(t('common.error'), t('boutOrderPage.failedToUpdateScores'));
        }
    };

    // Handle resetting a bout from the alter scores screen
    const handleResetBout = async () => {
        if (!canScoreBouts || alterIndex === null) {
            setAlterModalVisible(false);
            return;
        }

        const bout = bouts[alterIndex];

        try {
            console.log(`Resetting bout ${bout.id} to pending status with no scores or winner`);

            const result = await updateBoutScoresMutation.mutateAsync({
                boutId: bout.id,
                scoreA: 0,
                scoreB: 0,
                fencerAId: bout.fencerA.id!,
                fencerBId: bout.fencerB.id!,
                roundId,
                poolId,
                winnerId: null, // Explicitly setting winner to null to reset the bout
            });

            console.log(`Bout reset completed with result:`, result);

            // Update local bout state to reset the bout
            const updatedBouts = bouts.map((b, i) => {
                if (i === alterIndex) {
                    console.log(`Resetting local bout state for index ${i}`);
                    return { ...b, scoreA: 0, scoreB: 0, winnerId: undefined, status: 'pending' };
                }
                return b;
            });
            setBouts(updatedBouts);

            // Close the alter modal
            setAlterModalVisible(false);
            setAlterIndex(null);
        } catch (error) {
            console.error('Error resetting bout:', error);
            Alert.alert(t('common.error'), t('boutOrderPage.failedToResetBout'));
        }
    };

    // Function to update every bout with random scores - only called for referees
    const handleRandomScores = async () => {
        if (!canScoreBouts) return;

        // Update each bout with random scores.
        const updatedBouts = await Promise.all(
            bouts.map(async bout => {
                // Generate random scores - ensure they're not equal
                let randomScoreA = Math.floor(Math.random() * 6); // generates 0-5
                let randomScoreB = Math.floor(Math.random() * 6);

                // In the rare case of a tie, add 1 to one of the scores (randomly)
                if (randomScoreA === randomScoreB) {
                    if (Math.random() > 0.5) {
                        randomScoreA = Math.min(randomScoreA + 1, 5);
                    } else {
                        randomScoreB = Math.min(randomScoreB + 1, 5);
                    }
                }

                // Determine winner based on the scores
                const winnerId = randomScoreA > randomScoreB ? bout.fencerA.id : bout.fencerB.id;

                try {
                    console.log(
                        `Updating bout ${bout.id} with random scores: ${randomScoreA}-${randomScoreB}, winner: ${winnerId}`
                    );
                    const result = await updateBoutScoresMutation.mutateAsync({
                        boutId: bout.id,
                        scoreA: randomScoreA,
                        scoreB: randomScoreB,
                        fencerAId: bout.fencerA.id!,
                        fencerBId: bout.fencerB.id!,
                        roundId,
                        poolId,
                        winnerId,
                    });
                    console.log(`Random score update for bout ${bout.id} completed with result:`, result);
                    return {
                        ...bout,
                        scoreA: randomScoreA,
                        scoreB: randomScoreB,
                        status: 'completed',
                        winnerId,
                    } as Bout;
                } catch (error) {
                    console.error(`Error updating bout ${bout.id} with random scores:`, error);
                    Alert.alert(t('common.error'), t('boutOrderPage.failedToUpdateRandomScores', { boutId: bout.id }));
                    return bout;
                }
            })
        );
        setBouts(updatedBouts);
    };

    // Show loading state
    if (boutsLoading || poolsLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
                <Text style={styles.loadingText}>{t('boutOrderPage.loadingBouts')}</Text>
            </View>
        );
    }

    // Show error message if there was an error
    if (boutsError || poolsError) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>
                    {t('boutOrderPage.errorLoadingBouts')}: {(boutsError || poolsError)?.toString()}
                </Text>
            </View>
        );
    }

    // Render each bout using the original order.
    const renderBoutWithRank = (bout: Bout, index: number) => {
        const pendingRank = bout.status === 'pending' ? getPendingRank(bout) : null;

        // Apply styling for pending bouts based on pendingRank.
        let styleOverride = {};
        if (bout.status === 'pending' && pendingRank !== null && canScoreBouts) {
            if (pendingRank < activeCount) {
                styleOverride = { borderColor: green, borderWidth: 2 };
            } else if (pendingRank < activeCount + onDeckCount) {
                styleOverride = { borderColor: green, borderWidth: 2, borderStyle: 'dashed', opacity: 0.8 };
            } else {
                styleOverride = { borderColor: '#ccc', borderWidth: 1, opacity: 0.5 };
            }
        } else {
            styleOverride = { borderColor: mediumGrey, borderWidth: 1, opacity: 0.5 };
        }

        return (
            <View key={index} style={{ marginBottom: 12 }}>
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => handleBoutPress(index)}
                    onLongPress={() => handleBoutLongPress(index)}
                    style={[styles.boutContainer, styleOverride]}
                >
                    <View style={styles.fencerBox}>
                        <Text style={[styles.fencerText, bout.winnerId === bout.fencerA.id && styles.winnerText]}>
                            {`(${bout.fencerA.poolNumber || '-'}) ${bout.fencerA.fname}`}
                            {bout.fencerA.clubAbbreviation && ` (${bout.fencerA.clubAbbreviation})`}
                        </Text>
                    </View>
                    <Text style={styles.middleText}>
                        {bout.status === 'completed' ? `${bout.scoreA}-${bout.scoreB}` : t('common.vs')}
                    </Text>
                    <View style={styles.fencerBox}>
                        <Text style={[styles.fencerText, bout.winnerId === bout.fencerB.id && styles.winnerText]}>
                            {`(${bout.fencerB.poolNumber || '-'}) ${bout.fencerB.fname}`}
                            {bout.fencerB.clubAbbreviation && ` (${bout.fencerB.clubAbbreviation})`}
                        </Text>
                    </View>
                </TouchableOpacity>

                {/* Details panel when a bout is expanded */}
                {expandedBoutIndex === index && (
                    <View style={styles.scoreEntryContainer}>
                        {/* For referees with scoring permissions and pending bouts - show score entry */}
                        {canScoreBouts && bout.status === 'pending' ? (
                            <>
                                <Text style={styles.scoreEntryTitle}>{t('boutOrderPage.enterScores')}</Text>
                                <View style={styles.scoreRow}>
                                    <Text style={styles.scoreFencerLabel}>
                                        {bout.fencerA.lname}, {bout.fencerA.fname}:
                                    </Text>
                                    <TextInput
                                        style={styles.scoreInput}
                                        keyboardType="numeric"
                                        value={String(bout.scoreA)}
                                        onChangeText={val => handleScoreChange(index, 'A', val)}
                                    />
                                </View>
                                <View style={styles.scoreRow}>
                                    <Text style={styles.scoreFencerLabel}>
                                        {bout.fencerB.lname}, {bout.fencerB.fname}:
                                    </Text>
                                    <TextInput
                                        style={styles.scoreInput}
                                        keyboardType="numeric"
                                        value={String(bout.scoreB)}
                                        onChangeText={val => handleScoreChange(index, 'B', val)}
                                    />
                                </View>
                                <View style={styles.scoreButtonsRow}>
                                    <TouchableOpacity
                                        style={styles.enterButton}
                                        onPress={() => handleSubmitScores(index)}
                                    >
                                        <Text style={styles.enterButtonText}>{t('boutOrderPage.enter')}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.refModuleButton}
                                        onPress={() => openRefModuleForBout(index)}
                                    >
                                        <Text style={styles.refModuleButtonText}>{t('boutOrderPage.refModule')}</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        ) : (
                            // For viewers or completed bouts - show detailed info
                            <View style={styles.boutDetailsContainer}>
                                <Text style={styles.boutDetailsTitle}>
                                    {bout.status === 'completed'
                                        ? t('boutOrderPage.boutResult')
                                        : t('boutOrderPage.pendingBout')}
                                </Text>
                                <View style={styles.fencerDetailRow}>
                                    <Text
                                        style={[
                                            styles.fencerDetailName,
                                            bout.winnerId === bout.fencerA.id && styles.winnerDetailText,
                                        ]}
                                    >
                                        {bout.fencerA.lname}, {bout.fencerA.fname}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.fencerDetailScore,
                                            bout.winnerId === bout.fencerA.id && styles.winnerDetailText,
                                        ]}
                                    >
                                        {bout.scoreA}
                                    </Text>
                                </View>
                                <View style={styles.fencerDetailRow}>
                                    <Text
                                        style={[
                                            styles.fencerDetailName,
                                            bout.winnerId === bout.fencerB.id && styles.winnerDetailText,
                                        ]}
                                    >
                                        {bout.fencerB.lname}, {bout.fencerB.fname}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.fencerDetailScore,
                                            bout.winnerId === bout.fencerB.id && styles.winnerDetailText,
                                        ]}
                                    >
                                        {bout.scoreB}
                                    </Text>
                                </View>
                                <Text style={styles.boutStatusText}>
                                    {(() => {
                                        // Debug logging for bout winner information
                                        console.log(`Bout status check: id=${bout.id}, status=${bout.status}, winnerId=${bout.winnerId}, 
                                                     scores: ${bout.scoreA}-${bout.scoreB}, 
                                                     fencerA.id=${bout.fencerA.id}, fencerB.id=${bout.fencerB.id}`);

                                        if (bout.status === 'completed') {
                                            if (bout.winnerId) {
                                                const winnerName =
                                                    bout.winnerId === bout.fencerA.id
                                                        ? bout.fencerA.lname
                                                        : bout.fencerB.lname;
                                                return t('boutOrderPage.winner', { winnerName: winnerName });
                                            } else {
                                                return t('boutOrderPage.noWinnerRecorded');
                                            }
                                        } else {
                                            return t('boutOrderPage.boutNotYetScored');
                                        }
                                    })()}
                                </Text>
                            </View>
                        )}
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={{ flex: 1 }}>
            {/* Show connection status if in remote mode */}
            {isRemote && <ConnectionStatusBar compact={true} />}

            {/* Show BLE connection status if referee is connected to scoring box */}
            {canScoreBouts && <BLEStatusBar compact={true} />}

            {/* Header - double stripping toggle only shown to referees */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>
                    {canScoreBouts ? t('boutOrderPage.refereeMode') : t('boutOrderPage.viewBouts')}
                </Text>
                {canScoreBouts && (
                    <TouchableOpacity style={styles.toggleButton} onPress={() => setDoubleStripping(prev => !prev)}>
                        <Text style={styles.toggleButtonText}>
                            {doubleStripping
                                ? t('boutOrderPage.doubleStrippingOn')
                                : t('boutOrderPage.doubleStrippingOff')}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Protected scores toggle only shown to referees */}
            {canScoreBouts && (
                <View style={styles.toggleRow}>
                    <TouchableOpacity
                        style={[styles.toggleButtonSmall, protectedScores && styles.toggleButtonActive]}
                        onPress={() => setProtectedScores(!protectedScores)}
                    >
                        <Text style={styles.toggleButtonText}>{t('boutOrderPage.protectedScores')}</Text>
                    </TouchableOpacity>
                </View>
            )}

            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.title}>{t('boutOrderPage.poolBouts')}</Text>
                {bouts.map((bout, index) => renderBoutWithRank(bout, index))}
            </ScrollView>

            {/* Random Scores Button - only shown to referees */}
            {canScoreBouts && (
                <TouchableOpacity style={styles.randomScoresButton} onPress={handleRandomScores}>
                    <Text style={styles.randomScoresButtonText}>{t('boutOrderPage.randomScores')}</Text>
                </TouchableOpacity>
            )}

            {/* Alter Scores Modal - only used by referees */}
            <Modal visible={alterModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.alterModalContent}>
                        <Text style={styles.alterModalTitle}>{t('boutOrderPage.alterBoutScore')}</Text>
                        {alterIndex !== null && (
                            <View
                                style={{
                                    backgroundColor: '#f0f0f0',
                                    padding: 10,
                                    borderRadius: 6,
                                    marginBottom: 16,
                                    borderWidth: 1,
                                    borderColor: navyBlue,
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 18,
                                        fontWeight: 'bold',
                                        textAlign: 'center',
                                        color: navyBlue,
                                    }}
                                >
                                    {bouts[alterIndex].fencerA.lname} vs {bouts[alterIndex].fencerB.lname}
                                </Text>
                            </View>
                        )}
                        <View style={styles.scoreRow}>
                            <Text style={styles.scoreFencerLabel}>
                                {alterIndex !== null ? bouts[alterIndex].fencerA.lname : t('common.defaultFencerA')}:
                            </Text>
                            <TextInput
                                style={styles.scoreInput}
                                keyboardType="numeric"
                                value={alterScoreA}
                                onChangeText={setAlterScoreA}
                            />
                        </View>
                        <View style={styles.scoreRow}>
                            <Text style={styles.scoreFencerLabel}>
                                {alterIndex !== null ? bouts[alterIndex].fencerB.lname : t('common.defaultFencerB')}:
                            </Text>
                            <TextInput
                                style={styles.scoreInput}
                                keyboardType="numeric"
                                value={alterScoreB}
                                onChangeText={setAlterScoreB}
                            />
                        </View>
                        <View style={styles.scoreButtonsRow}>
                            <TouchableOpacity style={styles.enterButton} onPress={handleAlterSave}>
                                <Text style={styles.enterButtonText}>{t('boutOrderPage.save')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.enterButton, { backgroundColor: '#666' }]}
                                onPress={() => setAlterModalVisible(false)}
                            >
                                <Text style={styles.enterButtonText}>{t('boutOrderPage.cancel')}</Text>
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity style={[styles.resetBoutButton]} onPress={handleResetBout}>
                            <Text style={styles.resetBoutButtonText}>{t('boutOrderPage.resetBout')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Loading overlay for mutations */}
            {updateBoutScoresMutation.isPending && (
                <View style={styles.modalOverlay}>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#fff" />
                        <Text style={styles.loadingText}>{t('boutOrderPage.updatingScores')}</Text>
                    </View>
                </View>
            )}

            {/* Tie Resolution Modal */}
            <Modal visible={tieModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.alterModalContent}>
                        <Text style={styles.alterModalTitle}>{t('boutOrderPage.selectWinnerForTiedBout')}</Text>
                        <Text style={styles.tieWarningText}>{t('boutOrderPage.boutsCannotEndInTie')}</Text>

                        {tieBoutIndex !== null && (
                            <>
                                <TouchableOpacity
                                    style={[
                                        styles.winnerSelectButton,
                                        selectedWinnerId === bouts[tieBoutIndex]?.fencerA.id &&
                                            styles.winnerSelectButtonActive,
                                    ]}
                                    onPress={() => setSelectedWinnerId(bouts[tieBoutIndex].fencerA.id)}
                                >
                                    <Text style={styles.winnerSelectText}>
                                        {bouts[tieBoutIndex].fencerA.lname}, {bouts[tieBoutIndex].fencerA.fname}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.winnerSelectButton,
                                        selectedWinnerId === bouts[tieBoutIndex]?.fencerB.id &&
                                            styles.winnerSelectButtonActive,
                                    ]}
                                    onPress={() => setSelectedWinnerId(bouts[tieBoutIndex].fencerB.id)}
                                >
                                    <Text style={styles.winnerSelectText}>
                                        {bouts[tieBoutIndex].fencerB.lname}, {bouts[tieBoutIndex].fencerB.fname}
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}

                        <View style={styles.scoreButtonsRow}>
                            <TouchableOpacity
                                style={[styles.enterButton, !selectedWinnerId && { opacity: 0.5 }]}
                                onPress={handleTieWinnerSubmit}
                                disabled={!selectedWinnerId}
                            >
                                <Text style={styles.enterButtonText}>{t('boutOrderPage.submit')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.enterButton, { backgroundColor: '#666' }]}
                                onPress={() => {
                                    setTieModalVisible(false);
                                    setTieBoutIndex(null);
                                    setSelectedWinnerId(null);
                                }}
                            >
                                <Text style={styles.enterButtonText}>{t('boutOrderPage.cancel')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default BoutOrderPage;

/** ------------ Styles ------------ */
const navyBlue = '#000080';
const darkGrey = '#4f4f4f';
const mediumGrey = '#888888';
const green = '#4CAF50';
const red = '#FF0000';

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#001f3f',
        padding: 10,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    toggleButton: {
        padding: 8,
        backgroundColor: green,
        borderRadius: 4,
    },
    toggleButtonSmall: {
        padding: 8,
        backgroundColor: '#ccc',
        borderRadius: 4,
        alignSelf: 'flex-end',
        margin: 10,
    },
    toggleButtonActive: {
        backgroundColor: green,
    },
    toggleButtonText: {
        color: '#fff',
        fontSize: 14,
    },
    toggleRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    title: {
        fontSize: 24,
        textAlign: 'center',
        padding: 16,
        fontWeight: 'bold',
    },
    boutContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 6,
        padding: 8,
    },
    fencerBox: {
        flex: 1,
        padding: 12,
        borderRadius: 6,
        marginHorizontal: 4,
        justifyContent: 'center',
    },
    fencerText: {
        fontSize: 16,
        textAlign: 'center',
        fontWeight: '600',
    },
    winnerText: {
        color: green,
        fontWeight: 'bold',
    },
    middleText: {
        color: '#000',
        fontSize: 18,
        fontWeight: 'bold',
    },
    scoreEntryContainer: {
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 6,
        marginTop: 4,
    },
    scoreEntryTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    scoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    scoreFencerLabel: {
        fontSize: 16,
        marginRight: 8,
    },
    scoreInput: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 6,
        width: 60,
        padding: 6,
        textAlign: 'center',
        fontSize: 16,
    },
    scoreButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    enterButton: {
        backgroundColor: navyBlue,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
        alignItems: 'center',
        flex: 1,
        marginRight: 4,
    },
    enterButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    refModuleButton: {
        backgroundColor: navyBlue,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
        alignItems: 'center',
        flex: 1,
        marginLeft: 4,
    },
    refModuleButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    alterModalContent: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 8,
        width: '80%',
    },
    alterModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    loadingContainer: {
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: 20,
        borderRadius: 8,
        alignItems: 'center',
    },
    loadingText: {
        color: '#fff',
        marginTop: 10,
        fontSize: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        color: red,
        fontSize: 16,
        textAlign: 'center',
    },
    randomScoresButton: {
        backgroundColor: green,
        padding: 12,
        borderRadius: 6,
        margin: 16,
        alignItems: 'center',
    },
    randomScoresButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    // New styles for detailed bout view (for viewers)
    boutDetailsContainer: {
        padding: 12,
        backgroundColor: '#f9f9f9',
        borderRadius: 6,
    },
    boutDetailsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
        color: navyBlue,
    },
    fencerDetailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    fencerDetailName: {
        fontSize: 16,
        fontWeight: '500',
        flex: 1,
    },
    fencerDetailScore: {
        fontSize: 18,
        fontWeight: 'bold',
        paddingHorizontal: 12,
    },
    winnerDetailText: {
        color: green,
    },
    boutStatusText: {
        marginTop: 10,
        fontSize: 14,
        textAlign: 'center',
        fontStyle: 'italic',
        color: darkGrey,
    },
    // New styles for tie resolution
    tieWarningText: {
        fontSize: 16,
        marginVertical: 10,
        textAlign: 'center',
        color: red,
    },
    winnerSelectButton: {
        backgroundColor: '#f0f0f0',
        padding: 16,
        borderRadius: 6,
        marginVertical: 8,
        borderWidth: 1,
        borderColor: '#ccc',
    },
    winnerSelectButtonActive: {
        backgroundColor: '#d0f0d0',
        borderColor: green,
        borderWidth: 2,
    },
    winnerSelectText: {
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'center',
    },
    resetBoutButton: {
        backgroundColor: red,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
        alignItems: 'center',
        marginTop: 16,
    },
    resetBoutButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
});

export { BoutOrderPage };

// src/navigation/screens/PoolsPage.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    Modal,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { useRoute, RouteProp, useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { dbGetSeedingForRound } from '../../db/DrizzleDatabaseUtils';
import { RootStackParamList, Event, Fencer } from '../navigation/types';
import { assignPoolPositions } from '../utils/BoutOrderUtils';
import { usePools, useCompleteRound, useRoundCompleted, queryKeys } from '../../data/TournamentDataHooks';
import ConnectionStatusBar from '../../networking/components/ConnectionStatusBar';
import dataProvider from '../../data/DrizzleDataProvider';
import { useQueryClient } from '@tanstack/react-query';
import { Can } from '../../rbac/Can';
import { useAbility } from '../../rbac/AbilityContext';
import { useTranslation } from 'react-i18next';
import { BLEStatusBar } from '../../networking/components/BLEStatusBar';
import { useScoringBoxContext } from '../../networking/ble/ScoringBoxContext';
import { ConnectionState } from '../../networking/ble/types';

type PoolsPageRouteParams = {
    event: Event;
    currentRoundIndex: number;
    roundId: number;
    isRemote?: boolean;
};

type PoolsPageNavProp = NativeStackNavigationProp<RootStackParamList, 'PoolsPage'>;

const PoolsPage: React.FC = () => {
    const route = useRoute<RouteProp<{ params: PoolsPageRouteParams }, 'params'>>();
    const navigation = useNavigation<PoolsPageNavProp>();
    const queryClient = useQueryClient();
    const { ability } = useAbility();
    const { t } = useTranslation();
    const { connectionState, disconnect } = useScoringBoxContext();

    const { event, currentRoundIndex, roundId, isRemote = false } = route.params;
    const [pools, setPools] = useState<{ poolid: number; fencers: Fencer[] }[]>([]);
    const [expandedPools, setExpandedPools] = useState<boolean[]>([]);
    const [poolCompletionStatus, setPoolCompletionStatus] = useState<{ [poolId: number]: boolean }>({});

    // For strip number modal
    const [stripModalVisible, setStripModalVisible] = useState<boolean>(false);
    const [currentPoolForStrip, setCurrentPoolForStrip] = useState<number | null>(null);
    const [stripInput, setStripInput] = useState<string>('');
    const [poolStrips, setPoolStrips] = useState<{ [poolId: number]: number }>({});

    // Seeding modal state
    const [seedingModalVisible, setSeedingModalVisible] = useState<boolean>(false);
    const [seeding, setSeeding] = useState<{ seed: number; fencer: Fencer }[]>([]);

    // Use the pools hook instead of direct database access
    const { data: poolsData, isLoading, error } = usePools(roundId);

    // Use the complete round mutation
    const completeRoundMutation = useCompleteRound();

    // Check if the round is already completed
    const {
        data: isRoundCompleted,
        isLoading: isRoundCompletedLoading,
        refetch: refetchRoundCompleted,
    } = useRoundCompleted(roundId);

    // Add debugging for round completion status
    useEffect(() => {
        console.log(`Round ${roundId} completed status:`, isRoundCompleted);
    }, [isRoundCompleted, roundId]);

    // Refetch completion status when component is focused to ensure we have latest status
    useFocusEffect(
        useCallback(() => {
            console.log('PoolsPage focused - refetching round completion status');
            refetchRoundCompleted();
        }, [refetchRoundCompleted])
    );

    // Set pools data when it's fetched from the server or database
    useEffect(() => {
        if (poolsData) {
            // Debug log for remote connections to check if isComplete is provided by server
            if (isRemote) {
                console.log(
                    'Remote pools data fetched:',
                    JSON.stringify(
                        poolsData.map(pool => ({
                            poolid: pool.poolid,
                            fencersCount: pool.fencers ? pool.fencers.length : 0,
                            isComplete: pool.isComplete, // Log the server's completion status
                        })),
                        null,
                        2
                    )
                );
            } else {
                console.log(
                    'Local pools data fetched:',
                    JSON.stringify(
                        poolsData.map(pool => ({
                            poolid: pool.poolid,
                            fencersCount: pool.fencers ? pool.fencers.length : 0,
                        })),
                        null,
                        2
                    )
                );
            }

            // Apply club-based pool positions to each pool's fencers
            const poolsWithPositions = poolsData.map(pool => {
                // Make sure pool.fencers exists and is an array before applying assignPoolPositions
                if (!pool.fencers || !Array.isArray(pool.fencers)) {
                    console.error(`Missing or invalid fencers array for pool ${pool.poolid}`, pool);
                    return { ...pool, fencers: [] };
                }

                // Debug log to check fencers data
                console.log(
                    `Pool ${pool.poolid} has ${pool.fencers.length} fencers:`,
                    pool.fencers.map(f => `${f.fname} ${f.lname} (${f.poolNumber || 'no position'})`)
                );

                // Only apply assignPoolPositions if pool positions are not already assigned
                // This allows our database-assigned positions to take precedence
                if (pool.fencers.some(f => f.poolNumber === undefined)) {
                    return {
                        ...pool, // Preserve all original properties including isComplete
                        fencers: assignPoolPositions(pool.fencers),
                    };
                } else {
                    // If pool numbers are already assigned, keep them
                    return pool; // Preserve all original properties including isComplete
                }
            });

            setPools(poolsWithPositions);
            setExpandedPools(new Array(poolsData.length).fill(false));
            
            // If remote connection, also trigger checkBoutsCompletion to process server-provided completion status
            if (isRemote && poolsWithPositions.length > 0) {
                console.log('Triggering checkBoutsCompletion to process server-provided completion status');
                // The checkBoutsCompletion will be called by the useEffect below
            }
        }
    }, [poolsData, isRemote]);

    // Modified to use the data provider instead of direct database calls,
    // with special handling for remote connections to respect server's completion status
    const checkBoutsCompletion = useCallback(async () => {
        // Initialize with all pools marked as incomplete
        const statusObj: { [poolId: number]: boolean } = {};
        
        // Initialize all pools as not complete by default
        pools.forEach(pool => {
            statusObj[pool.poolid] = false;
        });

        if (isRemote) {
            // For remote clients, use the server's completion status
            // Each pool object from the server should have an isComplete field
            console.log('Remote client: Using server-provided pool completion status');
            
            pools.forEach(pool => {
                // Use the server's completion status directly
                const serverCompletionStatus = pool.isComplete === true;
                console.log(`Pool ${pool.poolid} server completion status: ${serverCompletionStatus}`);
                statusObj[pool.poolid] = serverCompletionStatus;
            });
        } else {
            // For local tournaments, calculate completion based on bout scores
            // Process each pool individually to handle per-pool errors
            console.log('Local client: Calculating pool completion status');
            
            for (const pool of pools) {
                try {
                    // Use data provider instead of direct DB access
                    const bouts = await dataProvider.getBoutsForPool(roundId, pool.poolid);

                    // Check if all bouts have scores
                    const complete = bouts.every(bout => {
                        const scoreA = bout.left_score ?? 0;
                        const scoreB = bout.right_score ?? 0;
                        
                        // Original check for local tournaments
                        return scoreA !== 0 || scoreB !== 0;
                    });

                    statusObj[pool.poolid] = complete;
                } catch (error) {
                    // If there's an error fetching bout data for this pool,
                    // ensure it stays marked as incomplete (default false)
                    console.error(`Error checking completion for pool ${pool.poolid}:`, error);
                    // The pool already has a default "false" status from initialization
                }
            }
        }

        setPoolCompletionStatus(statusObj);

        // Log the completion status of all pools
        console.log('Pool completion status:', statusObj);
        const allPoolsComplete = Object.values(statusObj).every(status => status);
        console.log('All pools complete:', allPoolsComplete);
    }, [pools, roundId, isRemote]);

    useEffect(() => {
        if (pools.length > 0) {
            checkBoutsCompletion();
        }
    }, [pools, checkBoutsCompletion]);

    useFocusEffect(
        useCallback(() => {
            if (pools.length > 0) {
                checkBoutsCompletion();
            }
        }, [pools, checkBoutsCompletion])
    );

    const togglePool = (index: number) => {
        setExpandedPools(prev => {
            const updated = [...prev];
            updated[index] = !updated[index];
            return updated;
        });
    };

    const handlePoolLongPress = (poolId: number) => {
        setCurrentPoolForStrip(poolId);
        setStripInput('');
        setStripModalVisible(true);
    };

    const submitStripNumber = () => {
        if (currentPoolForStrip !== null && stripInput.trim() !== '') {
            const num = parseInt(stripInput, 10);
            if (!isNaN(num)) {
                setPoolStrips(prev => ({ ...prev, [currentPoolForStrip]: num }));
            }
        }
        setStripModalVisible(false);
        setCurrentPoolForStrip(null);
        setStripInput('');
    };

    // Seeding modal code
    const fetchSeeding = async () => {
        try {
            // For seeding, we're keeping the direct DB call for now
            // In a full implementation, this should also go through dataProvider
            const seedingData = await dbGetSeedingForRound(roundId);
            console.log('Seeding data fetched:', seedingData);
            setSeeding(seedingData);
            setSeedingModalVisible(true);
        } catch (error) {
            console.error('Error fetching seeding:', error);
            Alert.alert(t('common.error'), t('poolsPage.errorFetchingSeeding'));
        }
    };

    const confirmEndRound = () => {
        Alert.alert(t('poolsPage.endRound'), t('poolsPage.confirmEndRound'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
                text: t('common.yes'),
                onPress: async () => {
                    try {
                        console.log(`Marking round ${roundId} as complete...`);

                        const result = await completeRoundMutation.mutateAsync({
                            roundId,
                            eventId: event.id,
                        });

                        console.log(`Result of marking round ${roundId} as complete:`, result);

                        // Force refetch of round completion status
                        await queryClient.invalidateQueries({
                            queryKey: queryKeys.roundCompleted(roundId),
                        });

                        // Also invalidate the entire round data
                        await queryClient.invalidateQueries({
                            queryKey: queryKeys.round(roundId),
                        });

                        // Explicitly refetch the round completion status
                        console.log('Explicitly refetching round completion status');
                        await refetchRoundCompleted();

                        // Instead of immediately navigating, delay navigation to allow the UI to update
                        setTimeout(() => {
                            // Check if connected to scoring box before navigating
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
                                                // Navigate to results
                                                console.log('Navigating to RoundResults');
                                                navigation.navigate('RoundResults', {
                                                    roundId,
                                                    eventId: event.id,
                                                    currentRoundIndex,
                                                });
                                            },
                                        },
                                        {
                                            text: t('common.disconnectAndExit'),
                                            onPress: async () => {
                                                try {
                                                    await disconnect();
                                                    // Navigate to results
                                                    console.log('Navigating to RoundResults');
                                                    navigation.navigate('RoundResults', {
                                                        roundId,
                                                        eventId: event.id,
                                                        currentRoundIndex,
                                                    });
                                                } catch (error) {
                                                    console.error('Failed to disconnect:', error);
                                                    // Navigate anyway
                                                    navigation.navigate('RoundResults', {
                                                        roundId,
                                                        eventId: event.id,
                                                        currentRoundIndex,
                                                    });
                                                }
                                            },
                                            style: 'destructive',
                                        },
                                    ],
                                    { cancelable: true }
                                );
                            } else {
                                // Navigate to results
                                console.log('Navigating to RoundResults');
                                navigation.navigate('RoundResults', {
                                    roundId,
                                    eventId: event.id,
                                    currentRoundIndex,
                                });
                            }
                        }, 500);
                    } catch (error) {
                        console.error('Error marking round as complete:', error);
                        Alert.alert(t('common.error'), t('poolsPage.failedToCompleteRound'));
                    }
                },
            },
        ]);
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            {isRemote && <ConnectionStatusBar compact={true} />}
            {ability.can('score', 'Bout') && <BLEStatusBar compact={true} />}
            <Text style={styles.title}>{t('poolsPage.title')}</Text>

            <TouchableOpacity style={styles.viewSeedingButton} onPress={fetchSeeding}>
                <Text style={styles.viewSeedingButtonText}>{t('poolsPage.viewSeeding')}</Text>
            </TouchableOpacity>

            {isLoading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#0000ff" />
                    <Text style={styles.loadingText}>{t('poolsPage.loadingPools')}</Text>
                </View>
            )}

            {error && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>
                        {t('poolsPage.errorLoadingPools')}: {error.toString()}
                    </Text>
                </View>
            )}

            {pools.map((poolObj, index) => {
                const displayPoolNumber = poolObj.poolid + 1;
                const isExpanded = expandedPools[index];
                const complete = poolCompletionStatus[poolObj.poolid] || false;
                const stripText = poolStrips[poolObj.poolid]
                    ? t('poolsPage.onStrip', { strip: poolStrips[poolObj.poolid] })
                    : '';

                // Build the header text manually to avoid template string issues
                const fencerCount = poolObj.fencers.length;
                const fencerText = fencerCount === 1 ? t('poolsPage.fencerSingular') : t('poolsPage.fencerPlural');

                const headerText = `${t('poolsPage.poolPrefix')} ${displayPoolNumber}: ${fencerCount} ${fencerText}${stripText}`;
                return (
                    <View key={poolObj.poolid} style={styles.poolContainer}>
                        <TouchableOpacity
                            onPress={() => togglePool(index)}
                            onLongPress={() => handlePoolLongPress(poolObj.poolid)}
                            style={[styles.poolHeader, complete ? styles.poolHeaderComplete : styles.poolHeaderOngoing]}
                        >
                            <View style={styles.poolHeaderRow}>
                                <Text style={styles.poolHeaderText}>{headerText}</Text>
                                <Text style={styles.arrowText}>{isExpanded ? '▼' : '▶'}</Text>
                            </View>
                        </TouchableOpacity>
                        {isExpanded && (
                            <View style={styles.fencerList}>
                                {Array.isArray(poolObj.fencers) && poolObj.fencers.length > 0 ? (
                                    poolObj.fencers.map((fencer, i) => (
                                        <Text key={i} style={styles.fencerText}>
                                            {fencer.poolNumber && `(${fencer.poolNumber}) `}
                                            {fencer.lname}, {fencer.fname}
                                            {fencer.clubAbbreviation && ` (${fencer.clubAbbreviation})`}
                                        </Text>
                                    ))
                                ) : (
                                    <Text style={styles.noFencersText}>{t('poolsPage.noFencers')}</Text>
                                )}
                                <TouchableOpacity
                                    style={styles.refereeButton}
                                    onPress={() =>
                                        navigation.navigate('BoutOrderPage', {
                                            roundId: roundId,
                                            poolId: poolObj.poolid,
                                            isRemote: isRemote,
                                            weapon: event.weapon,
                                        })
                                    }
                                >
                                    <Text style={styles.refereeButtonText}>
                                        {ability.can('score', 'Bout')
                                            ? complete
                                                ? t('poolsPage.editCompletedPool')
                                                : t('poolsPage.referee')
                                            : t('poolsPage.open')}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                );
            })}

            <Can I="update" a="Round">
                {allowed => {
                    // Debug values affecting button
                    console.log('Button debug - isRoundCompleted:', isRoundCompleted);
                    console.log(
                        'Button debug - all pools complete:',
                        Object.values(poolCompletionStatus).every(status => status)
                    );
                    console.log('Button debug - allowed:', allowed);

                    const allPoolsComplete = Object.values(poolCompletionStatus).every(status => status);
                    const buttonDisabled = (!isRoundCompleted && !allPoolsComplete) || !allowed;

                    return (
                        <TouchableOpacity
                            style={[styles.endRoundButton, buttonDisabled && styles.disabledButton]}
                            disabled={buttonDisabled}
                            onPress={
                                isRoundCompleted
                                    ? () => {
                                          // Check if connected to scoring box before navigating
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
                                                              navigation.navigate('RoundResults', {
                                                                  roundId,
                                                                  eventId: event.id,
                                                                  currentRoundIndex,
                                                              });
                                                          },
                                                      },
                                                      {
                                                          text: t('common.disconnectAndExit'),
                                                          onPress: async () => {
                                                              try {
                                                                  await disconnect();
                                                                  navigation.navigate('RoundResults', {
                                                                      roundId,
                                                                      eventId: event.id,
                                                                      currentRoundIndex,
                                                                  });
                                                              } catch (error) {
                                                                  console.error('Failed to disconnect:', error);
                                                                  // Navigate anyway
                                                                  navigation.navigate('RoundResults', {
                                                                      roundId,
                                                                      eventId: event.id,
                                                                      currentRoundIndex,
                                                                  });
                                                              }
                                                          },
                                                          style: 'destructive',
                                                      },
                                                  ],
                                                  { cancelable: true }
                                              );
                                          } else {
                                              navigation.navigate('RoundResults', {
                                                  roundId,
                                                  eventId: event.id,
                                                  currentRoundIndex,
                                              });
                                          }
                                      }
                                    : confirmEndRound
                            }
                        >
                            <Text style={[styles.endRoundButtonText, !allowed && styles.disabledText]}>
                                {isRoundCompleted ? t('poolsPage.showResults') : t('poolsPage.endRound')}
                            </Text>
                        </TouchableOpacity>
                    );
                }}
            </Can>

            {/* Strip Number Modal */}
            <Modal
                visible={stripModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setStripModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{t('poolsPage.enterStripNumber')}</Text>
                        <TextInput
                            style={styles.stripInput}
                            keyboardType="number-pad"
                            placeholder={t('poolsPage.stripPlaceholder')}
                            placeholderTextColor="#999"
                            value={stripInput}
                            onChangeText={setStripInput}
                        />
                        <TouchableOpacity style={styles.modalButton} onPress={submitStripNumber}>
                            <Text style={styles.modalButtonText}>{t('common.submit')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.cancelButton]}
                            onPress={() => setStripModalVisible(false)}
                        >
                            <Text style={styles.modalButtonText}>{t('common.cancel')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Seeding Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={seedingModalVisible}
                onRequestClose={() => setSeedingModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{t('poolsPage.currentSeeding')}</Text>
                        <ScrollView style={styles.seedingList}>
                            {seeding.map(item => (
                                <View key={item.fencer.id} style={styles.seedingItem}>
                                    {/* Put them on the same line via flexDirection: 'row' */}
                                    <View style={styles.seedingRow}>
                                        <Text style={styles.seedNumber}>{item.seed}</Text>
                                        <Text style={styles.seedFencer}>
                                            {item.fencer.lname}, {item.fencer.fname}
                                            {item.fencer.frating !== 'U' &&
                                                ` (${item.fencer.frating}${item.fencer.fyear})`}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                        <TouchableOpacity style={styles.closeButton} onPress={() => setSeedingModalVisible(false)}>
                            <Text style={styles.closeButtonText}>{t('common.close')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
};

export default PoolsPage;

const styles = StyleSheet.create({
    container: {
        padding: 20,
        paddingBottom: 40,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    loadingContainer: {
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
    noFencersText: {
        fontSize: 14,
        fontStyle: 'italic',
        color: '#888',
        marginBottom: 10,
    },
    errorContainer: {
        backgroundColor: '#ffeded',
        padding: 16,
        borderRadius: 8,
        marginVertical: 10,
    },
    errorText: {
        color: 'red',
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
    },
    poolHeaderOngoing: {
        backgroundColor: '#007AFF',
    },
    poolHeaderComplete: {
        backgroundColor: '#4CAF50',
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
    refereeButton: {
        backgroundColor: '#000080',
        paddingVertical: 10,
        borderRadius: 6,
        alignItems: 'center',
        marginTop: 10,
    },
    refereeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    endRoundButton: {
        backgroundColor: '#228B22',
        paddingVertical: 15,
        borderRadius: 6,
        alignItems: 'center',
        marginTop: 20,
    },
    endRoundButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    disabledButton: {
        backgroundColor: '#ccc',
        opacity: 0.7,
    },
    disabledText: {
        color: '#999',
    },
    viewSeedingButton: {
        backgroundColor: '#4682B4',
        paddingVertical: 12,
        borderRadius: 6,
        alignItems: 'center',
        marginBottom: 15,
    },
    viewSeedingButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        width: '80%',
        maxHeight: '80%',
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    seedingList: {
        maxHeight: 700,
    },
    seedingItem: {
        // Let each item sit on its own row
        // But keep seed number and name side-by-side
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    // We add a new style for a row:
    seedingRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    seedNumber: {
        width: 40,
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginRight: 8,
    },
    seedFencer: {
        flex: 1,
        fontSize: 16,
    },
    closeButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 12,
        borderRadius: 6,
        alignItems: 'center',
        marginTop: 15,
        width: '60%',
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    stripInput: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 6,
        padding: 10,
        width: '60%',
        textAlign: 'center',
        marginBottom: 15,
    },
    modalButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 6,
        marginBottom: 10,
        width: '60%',
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#ccc',
    },
    modalButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

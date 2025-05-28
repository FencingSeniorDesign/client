// src/navigation/screens/TeamRoundRobinPage.tsx
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
    RefreshControl,
} from 'react-native';
import { useRoute, RouteProp, useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Event, Team } from '../navigation/types';
import { useQueryClient } from '@tanstack/react-query';
import { Can } from '../../rbac/Can';
import { useAbility } from '../../rbac/AbilityContext';
import { useTranslation } from 'react-i18next';
import { BLEStatusBar } from '../../networking/components/BLEStatusBar';
import { db } from '../../db/DrizzleClient';
import * as teamPoolUtils from '../../db/utils/teamPool';
import * as teamUtils from '../../db/utils/team';
import * as teamBoutUtils from '../../db/utils/teamBoutNCAA';
import * as relayBoutUtils from '../../db/utils/teamBoutRelay';
import * as schema from '../../db/schema';
import { eq } from 'drizzle-orm';
import { Ionicons } from '@expo/vector-icons';

type TeamRoundRobinPageRouteParams = {
    event: Event;
    currentRoundIndex: number;
    roundId: number;
    isRemote?: boolean;
};

type TeamRoundRobinPageNavProp = NativeStackNavigationProp<RootStackParamList, 'TeamRoundRobinPage'>;

type TeamBout = {
    id: number;
    team_a_id: number;
    team_b_id: number;
    teamA?: Team;
    teamB?: Team;
    ncaaStatus?: any;
    relayStatus?: any;
};

const TeamRoundRobinPage: React.FC = () => {
    const route = useRoute<RouteProp<{ params: TeamRoundRobinPageRouteParams }, 'params'>>();
    const navigation = useNavigation<TeamRoundRobinPageNavProp>();
    const queryClient = useQueryClient();
    const { ability } = useAbility();
    const { t } = useTranslation();

    const { event, currentRoundIndex, roundId, isRemote = false } = route.params;
    const [teams, setTeams] = useState<Team[]>([]);
    const [teamBouts, setTeamBouts] = useState<TeamBout[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [boutStrips, setBoutStrips] = useState<{ [boutId: number]: number }>({});
    const [showTeamList, setShowTeamList] = useState(true);

    // For strip number modal
    const [stripModalVisible, setStripModalVisible] = useState<boolean>(false);
    const [stripInput, setStripInput] = useState<string>('');
    const [currentBoutForStrip, setCurrentBoutForStrip] = useState<number | null>(null);
    
    // For auto-assignment modal
    const [autoAssignModalVisible, setAutoAssignModalVisible] = useState<boolean>(false);
    const [numberOfStrips, setNumberOfStrips] = useState<string>('');

    // Load teams and bouts
    const loadData = useCallback(async () => {
        try {
            const client = db;
            
            // Get all teams for the event
            const eventTeams = await teamUtils.getEventTeams(client, event.id);
            setTeams(eventTeams);
            
            // For round robin, there's only one pool (poolId = 1)
            const poolId = 1;
            
            // Get team bouts for this round
            const bouts = await teamPoolUtils.dbGetTeamBoutsForPool(
                client,
                roundId,
                poolId,
                event.team_format || 'NCAA'
            );

            // Get full bout details including status and team information
            const boutsWithDetails = await Promise.all(
                bouts.map(async (bout) => {
                    // Get team details
                    const [teamA, teamB] = await Promise.all([
                        teamUtils.getTeam(client, bout.team_a_id),
                        teamUtils.getTeam(client, bout.team_b_id),
                    ]);
                    
                    let boutWithTeams = { ...bout, teamA, teamB };
                    
                    if (event.team_format === 'NCAA') {
                        const status = await teamBoutUtils.getNCAABoutStatus(client, bout.id);
                        return { ...boutWithTeams, ncaaStatus: status };
                    } else {
                        const status = await relayBoutUtils.getRelayBoutStatus(client, bout.id);
                        return { ...boutWithTeams, relayStatus: status };
                    }
                })
            );

            setTeamBouts(boutsWithDetails);
        } catch (error) {
            console.error('Error loading team round robin data:', error);
            Alert.alert(t('common.error'), t('teamRoundRobinPage.errorLoadingData'));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [event.id, event.team_format, roundId, t]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Refresh when returning to this screen
    useFocusEffect(
        useCallback(() => {
            if (!loading) {
                loadData();
            }
        }, [loadData, loading])
    );

    const handleOpenBout = (bout: TeamBout) => {
        if (event.team_format === 'NCAA') {
            navigation.navigate('NCAATeamBoutPage' as any, {
                teamBoutId: bout.id,
                event,
                isRemote,
            });
        } else {
            navigation.navigate('RelayTeamBoutPage' as any, {
                teamBoutId: bout.id,
                event,
                isRemote,
            });
        }
    };

    const getBoutStatus = (bout: TeamBout): { text: string; isComplete: boolean } => {
        if (event.team_format === 'NCAA' && bout.ncaaStatus) {
            const { teamAScore, teamBScore, isComplete } = bout.ncaaStatus;
            if (isComplete) {
                return { 
                    text: `${t('teamBoutOrderPage.complete')}: ${teamAScore}-${teamBScore}`,
                    isComplete: true
                };
            }
            return { 
                text: `${t('teamBoutOrderPage.inProgress')}: ${teamAScore}-${teamBScore}`,
                isComplete: false
            };
        } else if (event.team_format === '45-touch' && bout.relayStatus) {
            const { teamAScore, teamBScore, isComplete } = bout.relayStatus;
            if (isComplete) {
                return { 
                    text: `${t('teamBoutOrderPage.complete')}: ${teamAScore}-${teamBScore}`,
                    isComplete: true
                };
            }
            return { 
                text: `${t('teamBoutOrderPage.inProgress')}: ${teamAScore}-${teamBScore}`,
                isComplete: false
            };
        }
        return { text: t('teamBoutOrderPage.notStarted'), isComplete: false };
    };

    const handleEndRound = async () => {
        // Since button is disabled when bouts are incomplete, we can directly confirm
        confirmEndRound();
    };

    const confirmEndRound = () => {
        Alert.alert(
            t('poolsPage.confirmEndRound'),
            t('poolsPage.confirmEndRound'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.confirm'),
                    onPress: async () => {
                        try {
                            // Complete the pool
                            await teamPoolUtils.dbCompleteTeamPool(db, roundId, 1);
                            
                            // Complete the round
                            await db.update(schema.rounds)
                                .set({ iscomplete: 1 })
                                .where(eq(schema.rounds.id, roundId));
                                
                            navigation.navigate('RoundResults', {
                                roundId,
                                eventId: event.id,
                                currentRoundIndex,
                                isRemote,
                            });
                        } catch (error) {
                            console.error('Error completing round:', error);
                            Alert.alert(t('common.error'), t('poolsPage.failedToCompleteRound'));
                        }
                    },
                },
            ]
        );
    };

    const handleOpenStripModal = (boutId: number) => {
        setCurrentBoutForStrip(boutId);
        setStripInput(boutStrips[boutId]?.toString() || '');
        setStripModalVisible(true);
    };

    const handleSetStrip = () => {
        if (currentBoutForStrip !== null) {
            const number = parseInt(stripInput, 10);
            if (!isNaN(number)) {
                setBoutStrips(prev => ({ ...prev, [currentBoutForStrip]: number }));
            }
        }
        setStripModalVisible(false);
        setStripInput('');
        setCurrentBoutForStrip(null);
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const assignRandomScores = async () => {
        try {
            const client = db;
            
            // Process each team bout
            for (const bout of teamBouts) {
                if (event.team_format === 'NCAA') {
                    // For NCAA format: assign scores to all 9 individual bouts
                    for (let boutNumber = 1; boutNumber <= 9; boutNumber++) {
                        // Generate random scores between 0 and 5
                        const scoreA = Math.floor(Math.random() * 6);
                        const scoreB = Math.floor(Math.random() * 6);
                        
                        // If scores are tied, make one score 5 and the other random 0-4
                        let finalScoreA = scoreA;
                        let finalScoreB = scoreB;
                        let winnerId = undefined;
                        
                        if (scoreA === scoreB) {
                            // Get the fencers for this bout
                            const ncaaStatus = await teamBoutUtils.getNCAABoutStatus(client, bout.id);
                            const individualBout = ncaaStatus?.boutScores.find(b => b.boutNumber === boutNumber);
                            
                            if (Math.random() > 0.5) {
                                finalScoreA = 5;
                                finalScoreB = Math.floor(Math.random() * 5);
                                winnerId = individualBout?.fencerAId;
                            } else {
                                finalScoreA = Math.floor(Math.random() * 5);
                                finalScoreB = 5;
                                winnerId = individualBout?.fencerBId;
                            }
                        }
                        
                        await teamBoutUtils.updateNCAABoutScore(
                            client,
                            bout.id,
                            boutNumber,
                            finalScoreA,
                            finalScoreB,
                            winnerId
                        );
                    }
                } else {
                    // For Relay format: assign scores to all 9 legs
                    for (let legNumber = 1; legNumber <= 9; legNumber++) {
                        // Generate random scores that would sum to 45 total
                        // Each leg typically goes to 5 points, but we'll vary it
                        const maxScore = legNumber === 9 ? 45 : (legNumber * 5);
                        const currentTotalA = Math.floor(Math.random() * maxScore);
                        const currentTotalB = Math.floor(Math.random() * maxScore);
                        
                        // Make sure the final leg reaches 45 for one team
                        let finalScoreA = currentTotalA;
                        let finalScoreB = currentTotalB;
                        
                        if (legNumber === 9) {
                            if (Math.random() > 0.5) {
                                finalScoreA = 45;
                                finalScoreB = Math.floor(Math.random() * 40) + 5; // 5-44
                            } else {
                                finalScoreA = Math.floor(Math.random() * 40) + 5; // 5-44
                                finalScoreB = 45;
                            }
                        }
                        
                        await relayBoutUtils.updateRelayLegScore(
                            client,
                            bout.id,
                            legNumber,
                            finalScoreA,
                            finalScoreB
                        );
                    }
                }
            }
            
            await loadData();
            Alert.alert('Success', 'Random scores assigned to all bouts');
        } catch (error) {
            console.error('Error assigning random scores:', error);
            Alert.alert(t('common.error'), 'Failed to assign random scores');
        }
    };

    // Auto-assign strips to bouts
    const handleAutoAssignStrips = () => {
        const numStrips = parseInt(numberOfStrips, 10);
        if (isNaN(numStrips) || numStrips < 1) {
            Alert.alert(t('common.error'), t('teamRoundRobinPage.invalidNumberOfStrips'));
            return;
        }

        const newBoutStrips: { [boutId: number]: number } = {};
        
        // Group bouts into waves where no team appears twice in the same wave
        const waves: TeamBout[][] = [];
        const unassignedBouts = [...teamBouts];
        
        while (unassignedBouts.length > 0) {
            const wave: TeamBout[] = [];
            const teamsInWave = new Set<number>();
            
            // Build a wave by selecting bouts where neither team is already in the wave
            for (let i = 0; i < unassignedBouts.length && wave.length < numStrips; i++) {
                const bout = unassignedBouts[i];
                if (!teamsInWave.has(bout.team_a_id) && !teamsInWave.has(bout.team_b_id)) {
                    wave.push(bout);
                    teamsInWave.add(bout.team_a_id);
                    teamsInWave.add(bout.team_b_id);
                }
            }
            
            // Remove assigned bouts from unassigned list
            wave.forEach(bout => {
                const index = unassignedBouts.findIndex(b => b.id === bout.id);
                if (index !== -1) {
                    unassignedBouts.splice(index, 1);
                }
            });
            
            waves.push(wave);
        }
        
        // Track which strip each team prefers (based on previous assignments)
        const teamPreferredStrip: { [teamId: number]: number } = {};
        
        // Assign strips to each wave
        waves.forEach((wave, waveIndex) => {
            const usedStrips = new Set<number>();
            
            wave.forEach(bout => {
                let assignedStrip: number | null = null;
                
                // Try to keep teams on their preferred strips
                const teamAPreferred = teamPreferredStrip[bout.team_a_id];
                const teamBPreferred = teamPreferredStrip[bout.team_b_id];
                
                // If both teams prefer the same strip and it's available, use it
                if (teamAPreferred !== undefined && teamAPreferred === teamBPreferred && !usedStrips.has(teamAPreferred)) {
                    assignedStrip = teamAPreferred;
                }
                // If only team A has a preference and it's available, use it
                else if (teamAPreferred !== undefined && !usedStrips.has(teamAPreferred)) {
                    assignedStrip = teamAPreferred;
                }
                // If only team B has a preference and it's available, use it
                else if (teamBPreferred !== undefined && !usedStrips.has(teamBPreferred)) {
                    assignedStrip = teamBPreferred;
                }
                // Otherwise, find the first available strip
                else {
                    for (let strip = 0; strip < numStrips; strip++) {
                        if (!usedStrips.has(strip)) {
                            assignedStrip = strip;
                            break;
                        }
                    }
                }
                
                if (assignedStrip !== null) {
                    // Assign the bout to the strip (1-indexed for display)
                    newBoutStrips[bout.id] = assignedStrip + 1;
                    usedStrips.add(assignedStrip);
                    
                    // Update team preferences for next wave
                    teamPreferredStrip[bout.team_a_id] = assignedStrip;
                    teamPreferredStrip[bout.team_b_id] = assignedStrip;
                }
            });
        });

        setBoutStrips(newBoutStrips);
        setAutoAssignModalVisible(false);
        setNumberOfStrips('');
        
        Alert.alert(
            t('common.success'), 
            t('teamRoundRobinPage.stripsAssignedSuccess', { count: Object.keys(newBoutStrips).length })
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#001f3f" />
                <Text style={styles.loadingText}>{t('teamRoundRobinPage.loadingData')}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <BLEStatusBar compact={true} />
            
            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                <Text style={styles.title}>
                    {event.age} {event.gender} {event.weapon} - {t('teamRoundRobinPage.title')}
                </Text>

                <Text style={styles.formatInfo}>
                    {t('teamBoutOrderPage.format')}: {event.team_format === 'NCAA' ? 'NCAA (9 bouts)' : '45-touch Relay'}
                </Text>

                {/* Team List Section */}
                <TouchableOpacity 
                    style={styles.teamListHeader}
                    onPress={() => setShowTeamList(!showTeamList)}
                >
                    <Text style={styles.teamListTitle}>
                        {t('teamRoundRobinPage.teams')} ({teams.length})
                    </Text>
                    <Text style={styles.expandIcon}>{showTeamList ? '▼' : '▶'}</Text>
                </TouchableOpacity>

                {showTeamList && (
                    <View style={styles.teamListContainer}>
                        {teams.map((team, index) => {
                            const starterCount = team.members?.filter(m => m.role === 'starter').length || 0;
                            return (
                                <View key={team.id} style={styles.teamItem}>
                                    <Text style={styles.teamText}>
                                        {index + 1}. {team.name}
                                    </Text>
                                    <Text style={styles.teamRoster}>
                                        {starterCount} {t('teamRoundRobinPage.starters')}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* Bout List */}
                <View style={styles.boutsSectionHeader}>
                    <Text style={styles.sectionTitle}>{t('teamRoundRobinPage.bouts')}</Text>
                    <View style={styles.stripButtonsContainer}>
                        <Can I="update" a="Pool">
                            <TouchableOpacity
                                style={styles.autoAssignButton}
                                onPress={() => setAutoAssignModalVisible(true)}
                            >
                                <Text style={styles.autoAssignButtonText}>
                                    🎯 {t('teamRoundRobinPage.autoAssignStrips')}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.resetStripsButton}
                                onPress={() => {
                                    Alert.alert(
                                        t('teamRoundRobinPage.resetStrips'),
                                        t('teamRoundRobinPage.resetStripsConfirm'),
                                        [
                                            { text: t('common.cancel'), style: 'cancel' },
                                            {
                                                text: t('common.confirm'),
                                                onPress: () => {
                                                    setBoutStrips({});
                                                    Alert.alert(
                                                        t('common.success'),
                                                        t('teamRoundRobinPage.stripsResetSuccess')
                                                    );
                                                },
                                                style: 'destructive'
                                            }
                                        ]
                                    );
                                }}
                            >
                                <Ionicons name="refresh" size={20} color="#fff" />
                            </TouchableOpacity>
                        </Can>
                    </View>
                </View>
                {teamBouts.length === 0 ? (
                    <Text style={styles.noBoutsText}>{t('teamBoutOrderPage.noBouts')}</Text>
                ) : (
                    teamBouts.map((bout, index) => {
                        const status = getBoutStatus(bout);
                        return (
                            <TouchableOpacity
                                key={bout.id}
                                style={[
                                    styles.boutCard,
                                    status.isComplete && styles.completedBoutCard
                                ]}
                                onPress={() => handleOpenBout(bout)}
                            >
                                <View style={styles.boutHeader}>
                                    <View style={styles.boutNumberContainer}>
                                        <Text style={styles.boutNumber}>
                                            {t('teamBoutOrderPage.boutNumber', { number: index + 1 })}
                                        </Text>
                                        {boutStrips[bout.id] && (
                                            <Text style={styles.boutStrip}>
                                                {t('teamRoundRobinPage.onStrip', { strip: boutStrips[bout.id] })}
                                            </Text>
                                        )}
                                    </View>
                                    <Text style={[
                                        styles.boutStatus,
                                        status.isComplete && styles.completedStatus
                                    ]}>
                                        {status.text}
                                    </Text>
                                </View>
                                <View style={styles.boutTeams}>
                                    <Text style={styles.teamName}>{bout.teamA?.name || `Team ${bout.team_a_id}`}</Text>
                                    <Text style={styles.vsText}>vs</Text>
                                    <Text style={styles.teamName}>{bout.teamB?.name || `Team ${bout.team_b_id}`}</Text>
                                </View>
                                <Can I="update" a="Pool">
                                    <TouchableOpacity
                                        style={styles.boutStripButton}
                                        onPress={(e) => {
                                            e.stopPropagation();
                                            handleOpenStripModal(bout.id);
                                        }}
                                    >
                                        <Text style={styles.boutStripButtonText}>
                                            📍 {boutStrips[bout.id] ? t('teamRoundRobinPage.changeStrip') : t('teamRoundRobinPage.assignStrip')}
                                        </Text>
                                    </TouchableOpacity>
                                </Can>
                            </TouchableOpacity>
                        );
                    })
                )}

                {teamBouts.length > 0 && (
                    <>
                        {/* Assign Random Scores Button */}
                        <TouchableOpacity
                            style={styles.randomScoresButton}
                            onPress={assignRandomScores}
                        >
                            <Text style={styles.randomScoresButtonText}>Assign Random Scores to All Bouts</Text>
                        </TouchableOpacity>
                        
                        <Can I="update" a="Round">
                            <TouchableOpacity 
                                style={[
                                    styles.endRoundButton,
                                    teamBouts.some(bout => !getBoutStatus(bout).isComplete) && styles.endRoundButtonDisabled
                                ]} 
                                onPress={handleEndRound}
                                disabled={teamBouts.some(bout => !getBoutStatus(bout).isComplete)}
                            >
                                <Text style={[
                                    styles.endRoundButtonText,
                                    teamBouts.some(bout => !getBoutStatus(bout).isComplete) && styles.endRoundButtonTextDisabled
                                ]}>
                                    {teamBouts.some(bout => !getBoutStatus(bout).isComplete) 
                                        ? t('teamRoundRobinPage.completeBoutsFirst') 
                                        : t('teamRoundRobinPage.endRound')}
                                </Text>
                            </TouchableOpacity>
                        </Can>
                    </>
                )}
            </ScrollView>

            {/* Strip Number Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={stripModalVisible}
                onRequestClose={() => setStripModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{t('poolsPage.enterStripNumber')}</Text>
                        <TextInput
                            style={styles.stripInput}
                            value={stripInput}
                            onChangeText={setStripInput}
                            keyboardType="numeric"
                            placeholder={t('poolsPage.stripPlaceholder')}
                            placeholderTextColor="#999"
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.modalButton} onPress={handleSetStrip}>
                                <Text style={styles.modalButtonText}>{t('common.confirm')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setStripModalVisible(false)}
                            >
                                <Text style={styles.modalButtonText}>{t('common.cancel')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Auto-Assignment Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={autoAssignModalVisible}
                onRequestClose={() => setAutoAssignModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{t('teamRoundRobinPage.autoAssignStrips')}</Text>
                        <Text style={styles.modalDescription}>
                            {t('teamRoundRobinPage.autoAssignDescription')}
                        </Text>
                        <TextInput
                            style={styles.stripInput}
                            value={numberOfStrips}
                            onChangeText={setNumberOfStrips}
                            keyboardType="numeric"
                            placeholder={t('teamRoundRobinPage.numberOfStripsPlaceholder')}
                            placeholderTextColor="#999"
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.modalButton} onPress={handleAutoAssignStrips}>
                                <Text style={styles.modalButtonText}>{t('teamRoundRobinPage.assign')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setAutoAssignModalVisible(false)}
                            >
                                <Text style={styles.modalButtonText}>{t('common.cancel')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f7f7f7',
    },
    scrollContent: {
        padding: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
        color: '#001f3f',
    },
    formatInfo: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 15,
        color: '#666',
    },
    teamListHeader: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 15,
        marginBottom: 5,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    teamListTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#001f3f',
    },
    expandIcon: {
        fontSize: 16,
        color: '#001f3f',
    },
    teamListContainer: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 15,
        marginBottom: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    teamItem: {
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    teamText: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    teamRoster: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    boutsSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#001f3f',
    },
    stripButtonsContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    autoAssignButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#007acc',
        borderRadius: 6,
    },
    autoAssignButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    resetStripsButton: {
        padding: 8,
        backgroundColor: '#dc3545',
        borderRadius: 6,
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noBoutsText: {
        fontSize: 16,
        textAlign: 'center',
        marginTop: 50,
        color: '#666',
    },
    boutCard: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 15,
        marginBottom: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    completedBoutCard: {
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#28a745',
    },
    boutHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    boutNumberContainer: {
        flex: 1,
    },
    boutNumber: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#001f3f',
    },
    boutStrip: {
        fontSize: 14,
        color: '#666',
        fontStyle: 'italic',
        marginTop: 2,
    },
    boutStatus: {
        fontSize: 14,
        color: '#666',
    },
    completedStatus: {
        color: '#28a745',
        fontWeight: '600',
    },
    boutTeams: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    teamName: {
        fontSize: 16,
        color: '#333',
        flex: 1,
    },
    vsText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#666',
        marginHorizontal: 10,
    },
    boutStripButton: {
        marginTop: 10,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#f0f0f0',
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    boutStripButtonText: {
        fontSize: 14,
        color: '#001f3f',
        fontWeight: '600',
    },
    endRoundButton: {
        backgroundColor: '#dc3545',
        padding: 15,
        borderRadius: 8,
        marginTop: 20,
        alignItems: 'center',
    },
    endRoundButtonDisabled: {
        backgroundColor: '#cccccc',
        opacity: 0.6,
    },
    endRoundButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    endRoundButtonTextDisabled: {
        color: '#f0f0f0',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        width: '80%',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#001f3f',
    },
    modalDescription: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 15,
    },
    stripInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 6,
        padding: 10,
        fontSize: 16,
        width: '100%',
        textAlign: 'center',
    },
    modalButtons: {
        flexDirection: 'row',
        marginTop: 20,
        gap: 10,
    },
    modalButton: {
        backgroundColor: '#001f3f',
        paddingHorizontal: 30,
        paddingVertical: 10,
        borderRadius: 6,
    },
    cancelButton: {
        backgroundColor: '#6c757d',
    },
    modalButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    randomScoresButton: {
        backgroundColor: '#007bff',
        paddingHorizontal: 20,
        paddingVertical: 12,
        marginTop: 20,
        marginBottom: 10,
        borderRadius: 8,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    randomScoresButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default TeamRoundRobinPage;
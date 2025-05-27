// src/navigation/screens/TeamPoolsPage.tsx
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
import { RootStackParamList, Event, Team } from '../navigation/types';
import { useQueryClient } from '@tanstack/react-query';
import { Can } from '../../rbac/Can';
import { useAbility } from '../../rbac/AbilityContext';
import { useTranslation } from 'react-i18next';
import { BLEStatusBar } from '../../networking/components/BLEStatusBar';
import { db } from '../../db/DrizzleClient';
import * as teamPoolUtils from '../../db/utils/teamPool';
import * as teamUtils from '../../db/utils/team';
import * as schema from '../../db/schema';
import { eq } from 'drizzle-orm';

type TeamPoolsPageRouteParams = {
    event: Event;
    currentRoundIndex: number;
    roundId: number;
    isRemote?: boolean;
};

type TeamPoolsPageNavProp = NativeStackNavigationProp<RootStackParamList, 'PoolsPage'>;

const TeamPoolsPage: React.FC = () => {
    const route = useRoute<RouteProp<{ params: TeamPoolsPageRouteParams }, 'params'>>();
    const navigation = useNavigation<TeamPoolsPageNavProp>();
    const queryClient = useQueryClient();
    const { ability } = useAbility();
    const { t } = useTranslation();

    const { event, currentRoundIndex, roundId, isRemote = false } = route.params;
    const [pools, setPools] = useState<{ poolid: number; teams: Team[] }[]>([]);
    const [expandedPools, setExpandedPools] = useState<boolean[]>([]);
    const [poolCompletionStatus, setPoolCompletionStatus] = useState<{ [poolId: number]: boolean }>({});
    const [loading, setLoading] = useState(true);

    // For strip number modal
    const [stripModalVisible, setStripModalVisible] = useState<boolean>(false);
    const [currentPoolForStrip, setCurrentPoolForStrip] = useState<number | null>(null);
    const [stripInput, setStripInput] = useState<string>('');
    const [poolStrips, setPoolStrips] = useState<{ [poolId: number]: number }>({});

    // Load team pools
    const loadPools = useCallback(async () => {
        try {
            setLoading(true);
            
            // Get all teams for the event
            const teams = await teamUtils.getEventTeams(db, event.id);
            
            // Get unique pool IDs
            const poolIds = new Set<number>();
            const roundData = await db.select()
                .from(schema.teamPoolAssignment)
                .where(eq(schema.teamPoolAssignment.roundid, roundId));
            
            console.log(`Found ${roundData.length} team pool assignments for round ${roundId}`);
            
            roundData.forEach(assignment => {
                poolIds.add(assignment.poolid);
                console.log(`Team ${assignment.teamid} assigned to pool ${assignment.poolid}`);
            });

            console.log(`Unique pool IDs: ${Array.from(poolIds).join(', ')}`);

            // Load teams for each pool
            const poolsData: { poolid: number; teams: Team[] }[] = [];
            for (const poolId of poolIds) {
                const teamsInPool = await teamPoolUtils.dbGetTeamsInPool(db, roundId, poolId);
                console.log(`Pool ${poolId} has ${teamsInPool.length} teams`);
                poolsData.push({ poolid: poolId, teams: teamsInPool });
            }

            setPools(poolsData);
            setExpandedPools(new Array(poolsData.length).fill(false));
        } catch (error) {
            console.error('Error loading team pools:', error);
            Alert.alert(t('common.error'), t('poolsPage.errorLoadingPools'));
        } finally {
            setLoading(false);
        }
    }, [event.id, roundId, t]);

    useEffect(() => {
        loadPools();
    }, [loadPools]);

    const togglePool = (index: number) => {
        const newExpandedPools = [...expandedPools];
        newExpandedPools[index] = !newExpandedPools[index];
        setExpandedPools(newExpandedPools);
    };

    const openPoolBouts = (poolId: number) => {
        navigation.navigate('TeamBoutOrderPage' as any, {
            roundId,
            poolId,
            event,
            isRemote,
        });
    };

    const handleEndRound = async () => {
        Alert.alert(
            t('poolsPage.confirmEndRound'),
            t('poolsPage.confirmEndRound'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.confirm'),
                    onPress: async () => {
                        try {
                            // Complete the round
                            await completeRound();
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

    const completeRound = async () => {
        // Mark round as complete
        await db.update(schema.rounds)
            .set({ iscomplete: 1 })
            .where(eq(schema.rounds.id, roundId));
    };

    const handleOpenStripModal = (poolId: number) => {
        setCurrentPoolForStrip(poolId);
        setStripInput(poolStrips[poolId]?.toString() || '');
        setStripModalVisible(true);
    };

    const handleSetStrip = () => {
        if (currentPoolForStrip !== null) {
            const stripNumber = parseInt(stripInput, 10);
            if (!isNaN(stripNumber)) {
                setPoolStrips(prev => ({ ...prev, [currentPoolForStrip]: stripNumber }));
            }
        }
        setStripModalVisible(false);
        setStripInput('');
    };

    const isAllPoolsComplete = () => {
        return pools.every(pool => poolCompletionStatus[pool.poolid] === true);
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#001f3f" />
                <Text style={styles.loadingText}>{t('poolsPage.loadingPools')}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <BLEStatusBar compact={true} />
            
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.title}>
                    {event.age} {event.gender} {event.weapon} - {t('poolsPage.title')}
                </Text>

                {pools.length === 0 ? (
                    <Text style={styles.noPoolsText}>{t('teamPoolsPage.noTeams')}</Text>
                ) : (
                    pools.map((pool, index) => (
                        <View key={pool.poolid} style={styles.poolContainer}>
                            <TouchableOpacity onPress={() => togglePool(index)} style={styles.poolHeader}>
                                <Text style={styles.poolTitle}>
                                    {t('poolsPage.poolPrefix')} {pool.poolid + 1} - {pool.teams.length} {t('teamPoolsPage.teams')}
                                </Text>
                                <Text style={styles.expandIcon}>{expandedPools[index] ? '▼' : '▶'}</Text>
                            </TouchableOpacity>
                            {expandedPools[index] && (
                                <View style={styles.poolContent}>
                                    {pool.teams.map((team, teamIndex) => {
                                        const starterCount = team.members?.filter(m => m.role === 'starter').length || 0;
                                        return (
                                            <View key={team.id} style={styles.teamItem}>
                                                <Text style={styles.teamText}>
                                                    {teamIndex + 1}. {team.name}
                                                </Text>
                                                <Text style={styles.teamRoster}>
                                                    {starterCount} {t('teamPoolsPage.starters')}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                    <View style={styles.poolActions}>
                                        {poolStrips[pool.poolid] && (
                                            <Text style={styles.stripInfo}>
                                                {t('poolsPage.onStrip', { strip: poolStrips[pool.poolid] })}
                                            </Text>
                                        )}
                                        <Can I="update" a="Pool">
                                            <TouchableOpacity
                                                style={styles.assignStripButton}
                                                onPress={() => handleOpenStripModal(pool.poolid)}
                                            >
                                                <Text style={styles.assignStripText}>📍</Text>
                                            </TouchableOpacity>
                                        </Can>
                                        <TouchableOpacity
                                            style={[
                                                styles.openButton,
                                                poolCompletionStatus[pool.poolid] && styles.completedButton,
                                            ]}
                                            onPress={() => openPoolBouts(pool.poolid)}
                                        >
                                            <Text style={styles.openButtonText}>
                                                {poolCompletionStatus[pool.poolid]
                                                    ? t('poolsPage.editCompletedPool')
                                                    : t('poolsPage.open')}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        </View>
                    ))
                )}

                {pools.length > 0 && (
                    <Can I="update" a="Round">
                        <TouchableOpacity style={styles.endRoundButton} onPress={handleEndRound}>
                            <Text style={styles.endRoundButtonText}>{t('poolsPage.endRound')}</Text>
                        </TouchableOpacity>
                    </Can>
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
        marginBottom: 20,
        textAlign: 'center',
        color: '#001f3f',
    },
    noPoolsText: {
        fontSize: 16,
        textAlign: 'center',
        marginTop: 50,
        color: '#666',
    },
    poolContainer: {
        backgroundColor: '#fff',
        borderRadius: 8,
        marginBottom: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    poolHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    poolTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#001f3f',
    },
    expandIcon: {
        fontSize: 16,
        color: '#001f3f',
    },
    poolContent: {
        padding: 15,
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
    poolActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 15,
        gap: 10,
    },
    stripInfo: {
        fontSize: 14,
        color: '#666',
        flex: 1,
    },
    assignStripButton: {
        padding: 10,
    },
    assignStripText: {
        fontSize: 20,
    },
    openButton: {
        backgroundColor: '#001f3f',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 6,
    },
    completedButton: {
        backgroundColor: '#28a745',
    },
    openButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    endRoundButton: {
        backgroundColor: '#dc3545',
        padding: 15,
        borderRadius: 8,
        marginTop: 20,
        alignItems: 'center',
    },
    endRoundButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
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
});

export default TeamPoolsPage;
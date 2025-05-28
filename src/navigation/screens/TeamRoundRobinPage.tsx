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

type TeamRoundRobinPageRouteParams = {
    event: Event;
    currentRoundIndex: number;
    roundId: number;
    isRemote?: boolean;
};

type TeamRoundRobinPageNavProp = NativeStackNavigationProp<RootStackParamList, 'PoolsPage'>;

const TeamRoundRobinPage: React.FC = () => {
    const route = useRoute<RouteProp<{ params: TeamRoundRobinPageRouteParams }, 'params'>>();
    const navigation = useNavigation<TeamRoundRobinPageNavProp>();
    const queryClient = useQueryClient();
    const { ability } = useAbility();
    const { t } = useTranslation();

    const { event, currentRoundIndex, roundId, isRemote = false } = route.params;
    const [groups, setGroups] = useState<{ groupId: number; teams: Team[] }[]>([]);
    const [expandedGroups, setExpandedGroups] = useState<boolean[]>([]);
    const [groupCompletionStatus, setGroupCompletionStatus] = useState<{ [groupId: number]: boolean }>({});
    const [loading, setLoading] = useState(true);

    // For strip number modal
    const [stripModalVisible, setStripModalVisible] = useState<boolean>(false);
    const [currentGroupForStrip, setCurrentGroupForStrip] = useState<number | null>(null);
    const [stripInput, setStripInput] = useState<string>('');
    const [groupStrips, setGroupStrips] = useState<{ [groupId: number]: number }>({});

    // Load team round robin groups
    const loadGroups = useCallback(async () => {
        try {
            setLoading(true);
            
            // Get all teams for the event
            const teams = await teamUtils.getEventTeams(db, event.id);
            
            // Get unique group IDs from pool assignments
            const groupIds = new Set<number>();
            const roundData = await db.select()
                .from(schema.teamPoolAssignment)
                .where(eq(schema.teamPoolAssignment.roundid, roundId));
            
            console.log(`Found ${roundData.length} team group assignments for round ${roundId}`);
            
            roundData.forEach(assignment => {
                groupIds.add(assignment.poolid);
                console.log(`Team ${assignment.teamid} assigned to group ${assignment.poolid}`);
            });

            console.log(`Unique group IDs: ${Array.from(groupIds).join(', ')}`);

            // Load teams for each group
            const groupsData: { groupId: number; teams: Team[] }[] = [];
            for (const groupId of groupIds) {
                const teamsInGroup = await teamPoolUtils.dbGetTeamsInPool(db, roundId, groupId);
                console.log(`Group ${groupId} has ${teamsInGroup.length} teams`);
                groupsData.push({ groupId: groupId, teams: teamsInGroup });
            }

            setGroups(groupsData);
            setExpandedGroups(new Array(groupsData.length).fill(false));
        } catch (error) {
            console.error('Error loading team pools:', error);
            Alert.alert(t('common.error'), t('teamRoundRobinPage.errorLoadingGroups'));
        } finally {
            setLoading(false);
        }
    }, [event.id, roundId, t]);

    useEffect(() => {
        loadGroups();
    }, [loadGroups]);

    const toggleGroup = (index: number) => {
        const newExpandedGroups = [...expandedGroups];
        newExpandedGroups[index] = !newExpandedGroups[index];
        setExpandedGroups(newExpandedGroups);
    };

    const openGroupBouts = (groupId: number) => {
        navigation.navigate('TeamBoutOrderPage' as any, {
            roundId,
            poolId: groupId, // Still using poolId for compatibility with existing code
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

    const handleOpenStripModal = (groupId: number) => {
        setCurrentGroupForStrip(groupId);
        setStripInput(groupStrips[groupId]?.toString() || '');
        setStripModalVisible(true);
    };

    const handleSetStrip = () => {
        if (currentGroupForStrip !== null) {
            const stripNumber = parseInt(stripInput, 10);
            if (!isNaN(stripNumber)) {
                setGroupStrips(prev => ({ ...prev, [currentGroupForStrip]: stripNumber }));
            }
        }
        setStripModalVisible(false);
        setStripInput('');
    };

    const isAllGroupsComplete = () => {
        return groups.every(group => groupCompletionStatus[group.groupId] === true);
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#001f3f" />
                <Text style={styles.loadingText}>{t('teamRoundRobinPage.loadingGroups')}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <BLEStatusBar compact={true} />
            
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.title}>
                    {event.age} {event.gender} {event.weapon} - {t('teamRoundRobinPage.title')}
                </Text>

                {groups.length === 0 ? (
                    <Text style={styles.noGroupsText}>{t('teamRoundRobinPage.noTeams')}</Text>
                ) : (
                    groups.map((group, index) => (
                        <View key={group.groupId} style={styles.groupContainer}>
                            <TouchableOpacity onPress={() => toggleGroup(index)} style={styles.groupHeader}>
                                <Text style={styles.groupTitle}>
                                    {t('teamRoundRobinPage.groupPrefix')} {group.groupId + 1} - {group.teams.length} {t('teamRoundRobinPage.teams')}
                                </Text>
                                <Text style={styles.expandIcon}>{expandedGroups[index] ? '▼' : '▶'}</Text>
                            </TouchableOpacity>
                            {expandedGroups[index] && (
                                <View style={styles.groupContent}>
                                    {group.teams.map((team, teamIndex) => {
                                        const starterCount = team.members?.filter(m => m.role === 'starter').length || 0;
                                        return (
                                            <View key={team.id} style={styles.teamItem}>
                                                <Text style={styles.teamText}>
                                                    {teamIndex + 1}. {team.name}
                                                </Text>
                                                <Text style={styles.teamRoster}>
                                                    {starterCount} {t('teamRoundRobinPage.starters')}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                    <View style={styles.groupActions}>
                                        {groupStrips[group.groupId] && (
                                            <Text style={styles.stripInfo}>
                                                {t('teamRoundRobinPage.onStrip', { strip: groupStrips[group.groupId] })}
                                            </Text>
                                        )}
                                        <Can I="update" a="Pool">
                                            <TouchableOpacity
                                                style={styles.assignStripButton}
                                                onPress={() => handleOpenStripModal(group.groupId)}
                                            >
                                                <Text style={styles.assignStripText}>📍</Text>
                                            </TouchableOpacity>
                                        </Can>
                                        <TouchableOpacity
                                            style={[
                                                styles.openButton,
                                                groupCompletionStatus[group.groupId] && styles.completedButton,
                                            ]}
                                            onPress={() => openGroupBouts(group.groupId)}
                                        >
                                            <Text style={styles.openButtonText}>
                                                {groupCompletionStatus[group.groupId]
                                                    ? t('teamRoundRobinPage.editCompletedGroup')
                                                    : t('teamRoundRobinPage.open')}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        </View>
                    ))
                )}

                {groups.length > 0 && (
                    <Can I="update" a="Round">
                        <TouchableOpacity style={styles.endRoundButton} onPress={handleEndRound}>
                            <Text style={styles.endRoundButtonText}>{t('teamRoundRobinPage.endRound')}</Text>
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
    noGroupsText: {
        fontSize: 16,
        textAlign: 'center',
        marginTop: 50,
        color: '#666',
    },
    groupContainer: {
        backgroundColor: '#fff',
        borderRadius: 8,
        marginBottom: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    groupHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    groupTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#001f3f',
    },
    expandIcon: {
        fontSize: 16,
        color: '#001f3f',
    },
    groupContent: {
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
    groupActions: {
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

export default TeamRoundRobinPage;
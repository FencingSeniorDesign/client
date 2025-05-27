import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Alert,
    Modal,
    ActivityIndicator,
    FlatList,
} from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { Event, Team, Fencer, TeamMember } from '../navigation/types';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { db } from '../../db/DrizzleClient';
import * as teamUtils from '../../db/utils/team';
import { useFencers } from '../../data/TournamentDataHooks';

type Props = {
    route: RouteProp<{ params: { event: Event; isRemote?: boolean } }, 'params'>;
};

export const TeamManagement = ({ route }: Props) => {
    const { event, isRemote = false } = route.params || {};
    const { t } = useTranslation();
    const navigation = useNavigation();
    const queryClient = useQueryClient();

    // State
    const [teams, setTeams] = useState<Team[]>([]);
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showRosterModal, setShowRosterModal] = useState(false);
    const [teamName, setTeamName] = useState('');
    const [loading, setLoading] = useState(false);

    // Get fencers for the event
    const { data: fencers = [], isLoading: fencersLoading } = useFencers(event);

    // Load teams when component mounts
    React.useEffect(() => {
        loadTeams();
    }, [event.id]);

    const loadTeams = async () => {
        try {
            setLoading(true);
            const eventTeams = await teamUtils.getEventTeams(db, event.id);
            setTeams(eventTeams);
        } catch (error) {
            console.error('Error loading teams:', error);
            Alert.alert(t('common.error'), t('teamManagement.loadingError'));
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTeam = async () => {
        if (!teamName.trim()) {
            Alert.alert(t('common.error'), t('teamManagement.teamNameRequired'));
            return;
        }

        try {
            const teamId = await teamUtils.createTeam(db, {
                name: teamName.trim(),
                eventid: event.id,
            });

            await loadTeams();
            setShowCreateModal(false);
            setTeamName('');
        } catch (error) {
            console.error('Error creating team:', error);
            Alert.alert(t('common.error'), t('teamManagement.createError'));
        }
    };

    const handleDeleteTeam = async (teamId: number) => {
        Alert.alert(
            t('teamManagement.confirmDelete'),
            t('teamManagement.confirmDeleteMessage'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await teamUtils.deleteTeam(db, teamId);
                            await loadTeams();
                        } catch (error) {
                            console.error('Error deleting team:', error);
                            Alert.alert(t('common.error'), t('teamManagement.deleteError'));
                        }
                    },
                },
            ]
        );
    };

    const handleOpenRoster = (team: Team) => {
        setSelectedTeam(team);
        setShowRosterModal(true);
    };

    const renderTeamItem = ({ item: team }: { item: Team }) => {
        const starterCount = team.members?.filter(m => m.role === 'starter').length || 0;
        const subCount = team.members?.filter(m => m.role === 'substitute').length || 0;

        return (
            <View style={styles.teamItem}>
                <View style={styles.teamInfo}>
                    <Text style={styles.teamName}>{team.name}</Text>
                    <Text style={styles.teamStats}>
                        {starterCount} {t('teamManagement.starters')}, {subCount} {t('teamManagement.substitutes')}
                    </Text>
                </View>
                <View style={styles.teamActions}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleOpenRoster(team)}
                    >
                        <Text style={styles.actionButtonText}>{t('teamManagement.roster')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={() => handleDeleteTeam(team.id!)}
                    >
                        <Text style={styles.deleteButtonText}>{t('common.removeIcon')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>
                {event.age} {event.gender} {event.weapon} - {t('teamManagement.teams')}
            </Text>

            <TouchableOpacity
                style={styles.createButton}
                onPress={() => setShowCreateModal(true)}
            >
                <Text style={styles.createButtonText}>{t('teamManagement.createTeam')}</Text>
            </TouchableOpacity>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#001f3f" />
                    <Text style={styles.loadingText}>{t('common.loading')}</Text>
                </View>
            ) : teams.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>{t('teamManagement.noTeams')}</Text>
                </View>
            ) : (
                <FlatList
                    data={teams}
                    renderItem={renderTeamItem}
                    keyExtractor={(team) => team.id?.toString() || ''}
                    contentContainerStyle={styles.teamsList}
                />
            )}

            {/* Create Team Modal */}
            <Modal
                visible={showCreateModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowCreateModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{t('teamManagement.createTeam')}</Text>
                        
                        <TextInput
                            style={styles.input}
                            placeholder={t('teamManagement.teamNamePlaceholder')}
                            placeholderTextColor="#999"
                            value={teamName}
                            onChangeText={setTeamName}
                            autoFocus
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalButton}
                                onPress={handleCreateTeam}
                            >
                                <Text style={styles.modalButtonText}>{t('common.create')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => {
                                    setShowCreateModal(false);
                                    setTeamName('');
                                }}
                            >
                                <Text style={styles.modalButtonText}>{t('common.cancel')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Roster Management Modal */}
            {showRosterModal && selectedTeam && (
                <TeamRosterModal
                    team={selectedTeam}
                    event={event}
                    fencers={fencers}
                    visible={showRosterModal}
                    onClose={() => {
                        setShowRosterModal(false);
                        loadTeams(); // Reload teams to get updated member counts
                    }}
                />
            )}
        </View>
    );
};

// Team Roster Modal Component
const TeamRosterModal = ({
    team,
    event,
    fencers,
    visible,
    onClose,
}: {
    team: Team;
    event: Event;
    fencers: Fencer[];
    visible: boolean;
    onClose: () => void;
}) => {
    const { t } = useTranslation();
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [availableFencers, setAvailableFencers] = useState<Fencer[]>([]);
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        if (visible && team.id) {
            loadRoster();
        }
    }, [visible, team.id]);

    const loadRoster = async () => {
        try {
            setLoading(true);
            
            // Get team members
            const teamMembers = await teamUtils.getTeamMembers(db, team.id!);
            setMembers(teamMembers);

            // Get fencers not on any team in this event
            const allTeams = await teamUtils.getEventTeams(db, event.id);
            const assignedFencerIds = new Set<number>();
            
            allTeams.forEach(t => {
                t.members?.forEach(m => {
                    if (m.fencerid) assignedFencerIds.add(m.fencerid);
                });
            });

            const available = fencers.filter(f => f.id && !assignedFencerIds.has(f.id));
            setAvailableFencers(available);
        } catch (error) {
            console.error('Error loading roster:', error);
            Alert.alert(t('common.error'), t('teamManagement.rosterLoadError'));
        } finally {
            setLoading(false);
        }
    };

    const handleAddMember = async (fencer: Fencer, role: 'starter' | 'substitute') => {
        if (!fencer.id || !team.id) return;

        try {
            // For starters, determine the next available position
            let position: number | undefined;
            if (role === 'starter') {
                const starters = members.filter(m => m.role === 'starter');
                if (starters.length >= 3) {
                    Alert.alert(t('common.error'), t('teamManagement.maxStartersReached'));
                    return;
                }
                // Find the first available position (1, 2, or 3)
                for (let i = 1; i <= 3; i++) {
                    if (!starters.some(s => s.position === i)) {
                        position = i;
                        break;
                    }
                }
            }

            await teamUtils.addTeamMember(db, {
                teamid: team.id,
                fencerid: fencer.id,
                role,
                position,
            });

            await loadRoster();
        } catch (error: any) {
            console.error('Error adding team member:', error);
            Alert.alert(t('common.error'), error.message || t('teamManagement.addMemberError'));
        }
    };

    const handleRemoveMember = async (member: TeamMember) => {
        if (!team.id || !member.fencerid) return;

        try {
            await teamUtils.removeTeamMember(db, team.id, member.fencerid);
            await loadRoster();
        } catch (error) {
            console.error('Error removing team member:', error);
            Alert.alert(t('common.error'), t('teamManagement.removeMemberError'));
        }
    };

    const handleChangeRole = async (member: TeamMember) => {
        if (!team.id || !member.fencerid) return;

        const newRole = member.role === 'starter' ? 'substitute' : 'starter';
        
        try {
            if (newRole === 'starter') {
                const starters = members.filter(m => m.role === 'starter');
                if (starters.length >= 3) {
                    Alert.alert(t('common.error'), t('teamManagement.maxStartersReached'));
                    return;
                }
                
                // Find available position
                let position: number | undefined;
                for (let i = 1; i <= 3; i++) {
                    if (!starters.some(s => s.position === i)) {
                        position = i;
                        break;
                    }
                }
                
                await teamUtils.updateTeamMember(db, team.id, member.fencerid, {
                    role: newRole,
                    position,
                });
            } else {
                await teamUtils.updateTeamMember(db, team.id, member.fencerid, {
                    role: newRole,
                    position: undefined,
                });
            }

            await loadRoster();
        } catch (error) {
            console.error('Error changing member role:', error);
            Alert.alert(t('common.error'), t('teamManagement.changeRoleError'));
        }
    };

    const starters = members.filter(m => m.role === 'starter').sort((a, b) => (a.position || 0) - (b.position || 0));
    const substitutes = members.filter(m => m.role === 'substitute');

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, styles.largeModal]}>
                    <Text style={styles.modalTitle}>{team.name} - {t('teamManagement.roster')}</Text>

                    {loading ? (
                        <ActivityIndicator size="large" color="#001f3f" />
                    ) : (
                        <ScrollView style={styles.rosterContainer}>
                            {/* Starters Section */}
                            <Text style={styles.sectionTitle}>{t('teamManagement.starters')} ({starters.length}/3)</Text>
                            {starters.map((member) => (
                                <View key={member.id} style={styles.memberItem}>
                                    <Text style={styles.memberPosition}>#{member.position}</Text>
                                    <Text style={styles.memberName}>
                                        {member.fencer?.lname}, {member.fencer?.fname}
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.roleButton}
                                        onPress={() => handleChangeRole(member)}
                                    >
                                        <Text style={styles.roleButtonText}>{t('teamManagement.makeSub')}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => handleRemoveMember(member)}
                                        style={styles.removeButton}
                                    >
                                        <Text style={styles.removeButtonText}>{t('common.removeIcon')}</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}

                            {/* Substitutes Section */}
                            <Text style={[styles.sectionTitle, styles.sectionSpacing]}>
                                {t('teamManagement.substitutes')} ({substitutes.length})
                            </Text>
                            {substitutes.map((member) => (
                                <View key={member.id} style={styles.memberItem}>
                                    <Text style={styles.memberName}>
                                        {member.fencer?.lname}, {member.fencer?.fname}
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.roleButton}
                                        onPress={() => handleChangeRole(member)}
                                        disabled={starters.length >= 3}
                                    >
                                        <Text style={[
                                            styles.roleButtonText,
                                            starters.length >= 3 && styles.disabledText
                                        ]}>
                                            {t('teamManagement.makeStarter')}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => handleRemoveMember(member)}
                                        style={styles.removeButton}
                                    >
                                        <Text style={styles.removeButtonText}>{t('common.removeIcon')}</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}

                            {/* Available Fencers Section */}
                            <Text style={[styles.sectionTitle, styles.sectionSpacing]}>
                                {t('teamManagement.availableFencers')} ({availableFencers.length})
                            </Text>
                            {availableFencers.map((fencer) => (
                                <View key={fencer.id} style={styles.memberItem}>
                                    <Text style={styles.memberName}>
                                        {fencer.lname}, {fencer.fname}
                                        {fencer.clubAbbreviation && ` (${fencer.clubAbbreviation})`}
                                    </Text>
                                    <TouchableOpacity
                                        style={[styles.addButton, starters.length < 3 && styles.primaryButton]}
                                        onPress={() => handleAddMember(fencer, starters.length < 3 ? 'starter' : 'substitute')}
                                    >
                                        <Text style={styles.addButtonText}>
                                            {starters.length < 3 ? t('teamManagement.addStarter') : t('teamManagement.addSub')}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>
                    )}

                    <TouchableOpacity
                        style={[styles.modalButton, styles.closeButton]}
                        onPress={onClose}
                    >
                        <Text style={styles.modalButtonText}>{t('common.close')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f7f7f7',
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#001f3f',
        marginBottom: 20,
        textAlign: 'center',
    },
    createButton: {
        backgroundColor: '#001f3f',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 20,
    },
    createButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        color: '#666',
        fontSize: 16,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        color: '#666',
        fontSize: 16,
        fontStyle: 'italic',
    },
    teamsList: {
        paddingBottom: 20,
    },
    teamItem: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    teamInfo: {
        flex: 1,
    },
    teamName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#001f3f',
        marginBottom: 4,
    },
    teamStats: {
        fontSize: 14,
        color: '#666',
    },
    teamActions: {
        flexDirection: 'row',
        gap: 10,
    },
    actionButton: {
        backgroundColor: '#001f3f',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 6,
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
    deleteButton: {
        backgroundColor: '#d9534f',
        paddingHorizontal: 10,
    },
    deleteButtonText: {
        color: '#fff',
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 12,
        width: '80%',
    },
    largeModal: {
        width: '90%',
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#001f3f',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 6,
        padding: 12,
        fontSize: 16,
        marginBottom: 20,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    modalButton: {
        backgroundColor: '#001f3f',
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 6,
        minWidth: 100,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#6c757d',
    },
    closeButton: {
        marginTop: 15,
        alignSelf: 'center',
    },
    modalButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    rosterContainer: {
        maxHeight: 400,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#001f3f',
        marginBottom: 10,
    },
    sectionSpacing: {
        marginTop: 20,
    },
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    memberPosition: {
        fontSize: 16,
        fontWeight: '600',
        color: '#001f3f',
        marginRight: 10,
        width: 30,
    },
    memberName: {
        flex: 1,
        fontSize: 16,
        color: '#333',
    },
    roleButton: {
        backgroundColor: '#6c757d',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
        marginRight: 10,
    },
    roleButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '500',
    },
    removeButton: {
        padding: 5,
    },
    removeButtonText: {
        color: '#d9534f',
        fontSize: 18,
    },
    addButton: {
        backgroundColor: '#28a745',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
    },
    primaryButton: {
        backgroundColor: '#001f3f',
    },
    addButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '500',
    },
    disabledText: {
        opacity: 0.5,
    },
});

export default TeamManagement;
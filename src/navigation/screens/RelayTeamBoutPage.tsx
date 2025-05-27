// src/navigation/screens/RelayTeamBoutPage.tsx
import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Event } from '../navigation/types';
import { useTranslation } from 'react-i18next';
import { BLEStatusBar } from '../../networking/components/BLEStatusBar';
import DrizzleClient from '../../db/DrizzleClient';
import * as relayBoutUtils from '../../db/utils/teamBoutRelay';
import * as teamUtils from '../../db/utils/team';
import * as schema from '../../db/schema';
import { eq } from 'drizzle-orm';

type RelayTeamBoutPageRouteParams = {
    teamBoutId: number;
    event: Event;
    isRemote?: boolean;
};

const RelayTeamBoutPage: React.FC = () => {
    const route = useRoute<RouteProp<{ params: RelayTeamBoutPageRouteParams }, 'params'>>();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { t } = useTranslation();

    const { teamBoutId, event, isRemote = false } = route.params;
    const [boutStatus, setBoutStatus] = useState<relayBoutUtils.RelayBoutStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [teamAName, setTeamAName] = useState('Team A');
    const [teamBName, setTeamBName] = useState('Team B');
    const [updating, setUpdating] = useState(false);

    const loadBoutStatus = useCallback(async () => {
        try {
            setLoading(true);
            const client = await DrizzleClient.getInstance();
            const status = await relayBoutUtils.getRelayBoutStatus(client, teamBoutId);
            
            if (status) {
                setBoutStatus(status);
                
                // Get team names
                const teamBout = await client.select()
                    .from(schema.teamBouts)
                    .where(eq(schema.teamBouts.id, teamBoutId))
                    .limit(1);
                
                if (teamBout[0]) {
                    if (teamBout[0].team_a_id) {
                        const teamA = await teamUtils.getTeam(client, teamBout[0].team_a_id);
                        if (teamA) setTeamAName(teamA.name);
                    }
                    if (teamBout[0].team_b_id) {
                        const teamB = await teamUtils.getTeam(client, teamBout[0].team_b_id);
                        if (teamB) setTeamBName(teamB.name);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading bout status:', error);
            Alert.alert(t('common.error'), t('relayTeamBout.errorLoading'));
        } finally {
            setLoading(false);
        }
    }, [teamBoutId, t]);

    useEffect(() => {
        loadBoutStatus();
    }, [loadBoutStatus]);

    const handleOpenRefereeModule = () => {
        if (!boutStatus || boutStatus.isComplete) {
            return;
        }

        navigation.navigate('RefereeModule', {
            boutIndex: 1,
            fencer1Name: boutStatus.currentFencerAName,
            fencer2Name: boutStatus.currentFencerBName,
            currentScore1: boutStatus.teamAScore,
            currentScore2: boutStatus.teamBScore,
            isRemote,
            weapon: event.weapon,
            onSaveScores: async (score1: number, score2: number) => {
                try {
                    setUpdating(true);
                    const client = await DrizzleClient.getInstance();
                    await relayBoutUtils.updateRelayBoutScore(
                        client,
                        teamBoutId,
                        score1,
                        score2
                    );
                    await loadBoutStatus();
                } catch (error) {
                    console.error('Error updating relay score:', error);
                    Alert.alert(t('common.error'), t('relayTeamBout.errorUpdating'));
                } finally {
                    setUpdating(false);
                }
            },
        });
    };

    const handleForceRotation = async (teamId: number) => {
        Alert.alert(
            t('relayTeamBout.forceRotation'),
            t('relayTeamBout.forceRotationConfirm'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.confirm'),
                    onPress: async () => {
                        try {
                            const client = await DrizzleClient.getInstance();
                            const currentFencerId = teamId === 1 
                                ? boutStatus?.currentFencerAId 
                                : boutStatus?.currentFencerBId;
                            
                            if (!currentFencerId) return;
                            
                            const nextFencerId = await relayBoutUtils.getNextRelayFencer(
                                client,
                                teamId,
                                currentFencerId
                            );
                            
                            await relayBoutUtils.forceRelayRotation(
                                client,
                                teamBoutId,
                                teamId,
                                nextFencerId
                            );
                            
                            await loadBoutStatus();
                        } catch (error) {
                            console.error('Error forcing rotation:', error);
                            Alert.alert(t('common.error'), t('relayTeamBout.errorRotation'));
                        }
                    },
                },
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#001f3f" />
                <Text style={styles.loadingText}>{t('common.loading')}</Text>
            </View>
        );
    }

    if (!boutStatus) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{t('relayTeamBout.boutNotFound')}</Text>
            </View>
        );
    }

    const {
        teamAScore,
        teamBScore,
        currentFencerAName,
        currentFencerBName,
        rotationCountA,
        rotationCountB,
        lastRotationScoreA,
        lastRotationScoreB,
        isComplete,
        winnerId,
    } = boutStatus;

    const touchesUntilRotationA = relayBoutUtils.getTouchesUntilRotation(teamAScore);
    const touchesUntilRotationB = relayBoutUtils.getTouchesUntilRotation(teamBScore);
    const rotationTouchesA = relayBoutUtils.getRotationTouches(teamAScore, lastRotationScoreA);
    const rotationTouchesB = relayBoutUtils.getRotationTouches(teamBScore, lastRotationScoreB);

    return (
        <View style={styles.container}>
            <BLEStatusBar compact={true} />
            
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Team Score Header */}
                <View style={styles.teamScoreHeader}>
                    <View style={[styles.teamScore, winnerId && teamAScore === 45 && styles.winningTeam]}>
                        <Text style={styles.teamName}>{teamAName}</Text>
                        <Text style={styles.scoreText}>{teamAScore}</Text>
                        <Text style={styles.targetText}>/45</Text>
                    </View>
                    <Text style={styles.vsText}>vs</Text>
                    <View style={[styles.teamScore, winnerId && teamBScore === 45 && styles.winningTeam]}>
                        <Text style={styles.teamName}>{teamBName}</Text>
                        <Text style={styles.scoreText}>{teamBScore}</Text>
                        <Text style={styles.targetText}>/45</Text>
                    </View>
                </View>

                {isComplete && (
                    <Text style={styles.completeText}>
                        {t('relayTeamBout.matchComplete', { winner: teamAScore === 45 ? teamAName : teamBName })}
                    </Text>
                )}

                {/* Current Fencers */}
                {!isComplete && (
                    <View style={styles.currentFencersContainer}>
                        <Text style={styles.sectionTitle}>{t('relayTeamBout.currentFencers')}</Text>
                        
                        <TouchableOpacity
                            style={styles.refereeButton}
                            onPress={handleOpenRefereeModule}
                            disabled={updating}
                        >
                            <Text style={styles.refereeButtonText}>{t('relayTeamBout.openRefereeModule')}</Text>
                        </TouchableOpacity>

                        <View style={styles.fencersInfo}>
                            <View style={styles.fencerCard}>
                                <Text style={styles.fencerTeamLabel}>{teamAName}</Text>
                                <Text style={styles.currentFencerName}>{currentFencerAName}</Text>
                                <Text style={styles.rotationInfo}>
                                    {t('relayTeamBout.rotation')} {rotationCountA + 1}
                                </Text>
                                <Text style={styles.touchesInfo}>
                                    {t('relayTeamBout.touchesThisRotation', { touches: rotationTouchesA })}
                                </Text>
                                <Text style={styles.nextRotationInfo}>
                                    {t('relayTeamBout.nextRotationIn', { touches: touchesUntilRotationA })}
                                </Text>
                            </View>

                            <View style={styles.fencerCard}>
                                <Text style={styles.fencerTeamLabel}>{teamBName}</Text>
                                <Text style={styles.currentFencerName}>{currentFencerBName}</Text>
                                <Text style={styles.rotationInfo}>
                                    {t('relayTeamBout.rotation')} {rotationCountB + 1}
                                </Text>
                                <Text style={styles.touchesInfo}>
                                    {t('relayTeamBout.touchesThisRotation', { touches: rotationTouchesB })}
                                </Text>
                                <Text style={styles.nextRotationInfo}>
                                    {t('relayTeamBout.nextRotationIn', { touches: touchesUntilRotationB })}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Rotation Progress */}
                <View style={styles.progressContainer}>
                    <Text style={styles.sectionTitle}>{t('relayTeamBout.progress')}</Text>
                    
                    <View style={styles.progressBars}>
                        <View style={styles.progressItem}>
                            <Text style={styles.progressLabel}>{teamAName}</Text>
                            <View style={styles.progressBar}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        { width: `${(teamAScore / 45) * 100}%` },
                                    ]}
                                />
                            </View>
                            <Text style={styles.progressText}>{teamAScore}/45</Text>
                        </View>

                        <View style={styles.progressItem}>
                            <Text style={styles.progressLabel}>{teamBName}</Text>
                            <View style={styles.progressBar}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        { width: `${(teamBScore / 45) * 100}%` },
                                    ]}
                                />
                            </View>
                            <Text style={styles.progressText}>{teamBScore}/45</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
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
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: '#dc3545',
        textAlign: 'center',
    },
    teamScoreHeader: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        paddingVertical: 20,
        backgroundColor: '#fff',
        borderRadius: 12,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    teamScore: {
        flex: 1,
        alignItems: 'center',
        padding: 15,
    },
    winningTeam: {
        backgroundColor: '#d4edda',
        borderRadius: 8,
    },
    teamName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#001f3f',
        marginBottom: 5,
    },
    scoreText: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#001f3f',
    },
    targetText: {
        fontSize: 20,
        color: '#666',
    },
    vsText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#666',
        marginHorizontal: 20,
    },
    completeText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#28a745',
        textAlign: 'center',
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#001f3f',
        marginBottom: 15,
    },
    currentFencersContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    refereeButton: {
        backgroundColor: '#001f3f',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 20,
    },
    refereeButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    fencersInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
    },
    fencerCard: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        padding: 15,
        alignItems: 'center',
    },
    fencerTeamLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 5,
    },
    currentFencerName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#001f3f',
        marginBottom: 10,
    },
    rotationInfo: {
        fontSize: 14,
        color: '#666',
        marginBottom: 5,
    },
    touchesInfo: {
        fontSize: 14,
        color: '#333',
        marginBottom: 5,
    },
    nextRotationInfo: {
        fontSize: 14,
        color: '#dc3545',
        fontWeight: '600',
    },
    progressContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    progressBars: {
        gap: 15,
    },
    progressItem: {
        gap: 5,
    },
    progressLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#001f3f',
    },
    progressBar: {
        height: 20,
        backgroundColor: '#e9ecef',
        borderRadius: 10,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#001f3f',
    },
    progressText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'right',
    },
});

export default RelayTeamBoutPage;
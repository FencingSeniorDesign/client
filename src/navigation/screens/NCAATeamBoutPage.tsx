// src/navigation/screens/NCAATeamBoutPage.tsx
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
import * as teamBoutUtils from '../../db/utils/teamBoutNCAA';
import * as teamUtils from '../../db/utils/team';
import * as schema from '../../db/schema';
import { eq } from 'drizzle-orm';

type NCAATeamBoutPageRouteParams = {
    teamBoutId: number;
    event: Event;
    isRemote?: boolean;
};

const NCAATeamBoutPage: React.FC = () => {
    const route = useRoute<RouteProp<{ params: NCAATeamBoutPageRouteParams }, 'params'>>();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { t } = useTranslation();

    const { teamBoutId, event, isRemote = false } = route.params;
    const [boutStatus, setBoutStatus] = useState<teamBoutUtils.NCAABoutStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [teamAName, setTeamAName] = useState('Team A');
    const [teamBName, setTeamBName] = useState('Team B');

    const loadBoutStatus = useCallback(async () => {
        try {
            setLoading(true);
            const client = await DrizzleClient.getInstance();
            const status = await teamBoutUtils.getNCAABoutStatus(client, teamBoutId);
            
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
            Alert.alert(t('common.error'), t('ncaaTeamBout.errorLoading'));
        } finally {
            setLoading(false);
        }
    }, [teamBoutId, t]);

    useEffect(() => {
        loadBoutStatus();
    }, [loadBoutStatus]);

    const handleOpenIndividualBout = (bout: teamBoutUtils.NCAAIndividualBout) => {
        if (bout.isComplete) {
            Alert.alert(t('ncaaTeamBout.boutComplete'), t('ncaaTeamBout.boutCompleteMessage'));
            return;
        }

        navigation.navigate('RefereeModule', {
            boutIndex: bout.boutNumber,
            fencer1Name: bout.fencerAName,
            fencer2Name: bout.fencerBName,
            currentScore1: bout.fencerAScore,
            currentScore2: bout.fencerBScore,
            isRemote,
            weapon: event.weapon,
            onSaveScores: async (score1: number, score2: number) => {
                try {
                    const client = await DrizzleClient.getInstance();
                    await teamBoutUtils.updateNCAABoutScore(
                        client,
                        teamBoutId,
                        bout.boutNumber,
                        score1,
                        score2
                    );
                    await loadBoutStatus();
                } catch (error) {
                    console.error('Error updating bout score:', error);
                    Alert.alert(t('common.error'), t('ncaaTeamBout.errorUpdating'));
                }
            },
        });
    };

    const getBoutPositionDescription = (boutNumber: number): string => {
        return teamBoutUtils.getNCAABoutOrderDescription(boutNumber);
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
                <Text style={styles.errorText}>{t('ncaaTeamBout.boutNotFound')}</Text>
            </View>
        );
    }

    const { teamAScore, teamBScore, isComplete, winnerId, boutScores } = boutStatus;

    return (
        <View style={styles.container}>
            <BLEStatusBar compact={true} />
            
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Team Score Header */}
                <View style={styles.teamScoreHeader}>
                    <View style={[styles.teamScore, winnerId && teamAScore > teamBScore && styles.winningTeam]}>
                        <Text style={styles.teamName}>{teamAName}</Text>
                        <Text style={styles.scoreText}>{teamAScore}</Text>
                    </View>
                    <Text style={styles.vsText}>vs</Text>
                    <View style={[styles.teamScore, winnerId && teamBScore > teamAScore && styles.winningTeam]}>
                        <Text style={styles.teamName}>{teamBName}</Text>
                        <Text style={styles.scoreText}>{teamBScore}</Text>
                    </View>
                </View>

                {isComplete && (
                    <Text style={styles.completeText}>
                        {t('ncaaTeamBout.matchComplete', { winner: teamAScore > teamBScore ? teamAName : teamBName })}
                    </Text>
                )}

                <Text style={styles.formatInfo}>
                    {t('ncaaTeamBout.formatInfo', { wins: teamAScore + teamBScore, total: 9 })}
                </Text>

                {/* Individual Bouts */}
                <View style={styles.boutsContainer}>
                    {boutScores.map((bout) => (
                        <TouchableOpacity
                            key={bout.boutNumber}
                            style={[
                                styles.boutCard,
                                bout.isComplete && styles.completedBoutCard,
                                bout.boutNumber === boutStatus.currentBoutNumber && styles.currentBoutCard,
                            ]}
                            onPress={() => handleOpenIndividualBout(bout)}
                            disabled={isComplete}
                        >
                            <View style={styles.boutHeader}>
                                <Text style={styles.boutNumber}>
                                    {t('ncaaTeamBout.bout')} {bout.boutNumber}
                                </Text>
                                <Text style={styles.boutPosition}>
                                    {getBoutPositionDescription(bout.boutNumber)}
                                </Text>
                            </View>
                            
                            <View style={styles.boutFencers}>
                                <View style={styles.fencerRow}>
                                    <Text style={[styles.fencerName, bout.winnerId === bout.fencerAId && styles.winnerText]}>
                                        {bout.fencerAName}
                                    </Text>
                                    <Text style={[styles.fencerScore, bout.winnerId === bout.fencerAId && styles.winnerText]}>
                                        {bout.fencerAScore}
                                    </Text>
                                </View>
                                <View style={styles.fencerRow}>
                                    <Text style={[styles.fencerName, bout.winnerId === bout.fencerBId && styles.winnerText]}>
                                        {bout.fencerBName}
                                    </Text>
                                    <Text style={[styles.fencerScore, bout.winnerId === bout.fencerBId && styles.winnerText]}>
                                        {bout.fencerBScore}
                                    </Text>
                                </View>
                            </View>

                            {bout.isComplete && (
                                <Text style={styles.boutCompleteText}>{t('ncaaTeamBout.complete')}</Text>
                            )}
                        </TouchableOpacity>
                    ))}
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
        marginBottom: 10,
    },
    formatInfo: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    boutsContainer: {
        gap: 10,
    },
    boutCard: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    completedBoutCard: {
        opacity: 0.8,
    },
    currentBoutCard: {
        borderWidth: 2,
        borderColor: '#001f3f',
    },
    boutHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    boutNumber: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#001f3f',
    },
    boutPosition: {
        fontSize: 14,
        color: '#666',
    },
    boutFencers: {
        gap: 5,
    },
    fencerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 3,
    },
    fencerName: {
        fontSize: 15,
        color: '#333',
        flex: 1,
    },
    fencerScore: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginLeft: 10,
    },
    winnerText: {
        fontWeight: 'bold',
        color: '#28a745',
    },
    boutCompleteText: {
        fontSize: 12,
        color: '#28a745',
        textAlign: 'center',
        marginTop: 5,
    },
});

export default NCAATeamBoutPage;
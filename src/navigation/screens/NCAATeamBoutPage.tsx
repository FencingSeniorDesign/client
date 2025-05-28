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
import { db } from '../../db/DrizzleClient';
import * as teamBoutUtils from '../../db/utils/teamBoutNCAA';
import * as teamUtils from '../../db/utils/team';
import * as schema from '../../db/schema';
import { eq } from 'drizzle-orm';
import ScoreInputModal from '../../components/ui/ScoreInputModal';

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
    
    // Score input modal state
    const [scoreModalVisible, setScoreModalVisible] = useState(false);
    const [selectedBout, setSelectedBout] = useState<teamBoutUtils.NCAAIndividualBout | null>(null);

    const loadBoutStatus = useCallback(async () => {
        try {
            setLoading(true);
            const client = db;
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
        // Allow opening completed bouts for editing/viewing
        setSelectedBout(bout);
        setScoreModalVisible(true);
    };

    const handleScoreSubmit = async (scoreA: number, scoreB: number, winnerId?: number) => {
        if (!selectedBout) return;

        try {
            const client = db;
            await teamBoutUtils.updateNCAABoutScore(
                client,
                teamBoutId,
                selectedBout.boutNumber,
                scoreA,
                scoreB,
                winnerId // Pass the winnerId for tie-breaking
            );
            await loadBoutStatus();
            setScoreModalVisible(false);
            setSelectedBout(null);
        } catch (error) {
            console.error('Error updating bout score:', error);
            Alert.alert(t('common.error'), t('ncaaTeamBout.errorUpdating'));
        }
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
                    <View style={styles.matchCompleteContainer}>
                        <Text style={styles.completeText}>
                            {t('ncaaTeamBout.matchComplete', { winner: teamAScore > teamBScore ? teamAName : teamBName })}
                        </Text>
                        <Text style={styles.exhibitionText}>
                            {t('ncaaTeamBout.exhibitionNote')}
                        </Text>
                    </View>
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
                                isComplete && bout.boutNumber > (teamAScore + teamBScore) && styles.exhibitionBoutCard,
                            ]}
                            onPress={() => handleOpenIndividualBout(bout)}
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
                                <View style={[styles.fencerRow, styles.teamARow]}>
                                    <View style={styles.fencerInfo}>
                                        <Text style={[styles.fencerName, bout.winnerId === bout.fencerAId && styles.winnerText]}>
                                            {bout.fencerAName}
                                        </Text>
                                        <Text style={styles.teamBadge}>{teamAName}</Text>
                                    </View>
                                    <Text style={[styles.fencerScore, bout.winnerId === bout.fencerAId && styles.winnerText]}>
                                        {bout.fencerAScore}
                                    </Text>
                                </View>
                                <View style={[styles.fencerRow, styles.teamBRow]}>
                                    <View style={styles.fencerInfo}>
                                        <Text style={[styles.fencerName, bout.winnerId === bout.fencerBId && styles.winnerText]}>
                                            {bout.fencerBName}
                                        </Text>
                                        <Text style={styles.teamBadge}>{teamBName}</Text>
                                    </View>
                                    <Text style={[styles.fencerScore, bout.winnerId === bout.fencerBId && styles.winnerText]}>
                                        {bout.fencerBScore}
                                    </Text>
                                </View>
                            </View>

                            {bout.isComplete && (
                                <Text style={styles.boutCompleteText}>
                                    {isComplete && bout.boutNumber > (teamAScore + teamBScore) 
                                        ? t('ncaaTeamBout.exhibition') 
                                        : t('ncaaTeamBout.complete')}
                                </Text>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
            
            {/* Score Input Modal */}
            <ScoreInputModal
                visible={scoreModalVisible}
                onClose={() => {
                    setScoreModalVisible(false);
                    setSelectedBout(null);
                }}
                onSubmit={handleScoreSubmit}
                fencerAName={selectedBout?.fencerAName || ''}
                fencerBName={selectedBout?.fencerBName || ''}
                fencerAId={selectedBout?.fencerAId}
                fencerBId={selectedBout?.fencerBId}
                initialScoreA={selectedBout?.fencerAScore || 0}
                initialScoreB={selectedBout?.fencerBScore || 0}
                title={t('ncaaTeamBout.enterScores')}
                allowTies={false}
                showRefereeButton={true}
                onOpenRefereeModule={() => {
                    setScoreModalVisible(false);
                    navigation.navigate('RefereeModule', {
                        boutIndex: selectedBout?.boutNumber || 0,
                        fencer1Name: selectedBout?.fencerAName || '',
                        fencer2Name: selectedBout?.fencerBName || '',
                        currentScore1: selectedBout?.fencerAScore || 0,
                        currentScore2: selectedBout?.fencerBScore || 0,
                        weapon: event.weapon,
                        isRemote,
                        onSaveScores: (score1: number, score2: number) => {
                            // If scores are tied, we need to show the modal for tie-breaking
                            if (score1 === score2 && selectedBout) {
                                // Update the selectedBout with new scores and show modal
                                setSelectedBout({
                                    ...selectedBout,
                                    fencerAScore: score1,
                                    fencerBScore: score2
                                });
                                setScoreModalVisible(true);
                            } else {
                                // Save the scores directly
                                handleScoreSubmit(score1, score2);
                            }
                        },
                    });
                }}
            />
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
        paddingHorizontal: 8,
        borderRadius: 4,
        marginVertical: 2,
    },
    teamARow: {
        backgroundColor: '#e6f3ff',
    },
    teamBRow: {
        backgroundColor: '#fff0e6',
    },
    fencerInfo: {
        flex: 1,
    },
    fencerName: {
        fontSize: 15,
        color: '#333',
    },
    teamBadge: {
        fontSize: 12,
        color: '#666',
        fontStyle: 'italic',
        marginTop: 2,
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
    matchCompleteContainer: {
        alignItems: 'center',
        marginBottom: 15,
    },
    exhibitionText: {
        fontSize: 14,
        color: '#666',
        fontStyle: 'italic',
        marginTop: 5,
    },
    exhibitionBoutCard: {
        borderWidth: 1,
        borderColor: '#ffc107',
        borderStyle: 'dashed',
        opacity: 0.9,
    },
});

export default NCAATeamBoutPage;
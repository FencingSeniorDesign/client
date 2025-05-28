// src/navigation/screens/TeamBoutOrderPage.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Event, Team } from '../navigation/types';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { db } from '../../db/DrizzleClient';
import * as teamPoolUtils from '../../db/utils/teamPool';
import * as teamBoutUtils from '../../db/utils/teamBoutNCAA';
import * as relayBoutUtils from '../../db/utils/teamBoutRelay';
import * as teamUtils from '../../db/utils/team';
import { BLEStatusBar } from '../../networking/components/BLEStatusBar';

type TeamBoutOrderPageRouteParams = {
    roundId: number;
    poolId: number;
    event: Event;
    isRemote?: boolean;
};

type TeamBout = {
    id: number;
    team_a_id: number;
    team_b_id: number;
    teamA?: Team;
    teamB?: Team;
    ncaaStatus?: any;
    relayStatus?: any;
};

const TeamBoutOrderPage: React.FC = () => {
    const route = useRoute<RouteProp<{ params: TeamBoutOrderPageRouteParams }, 'params'>>();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    const { roundId, poolId, event, isRemote = false } = route.params;
    const [teamBouts, setTeamBouts] = useState<TeamBout[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadBouts = useCallback(async () => {
        try {
            setLoading(true);
            const client = db;
            
            // Get team bouts for this pool
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
            console.error('Error loading team bouts:', error);
            Alert.alert(t('common.error'), t('teamBoutOrderPage.errorLoadingBouts'));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [roundId, poolId, event.team_format, t]);

    useEffect(() => {
        loadBouts();
    }, [loadBouts]);

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

    const getBoutStatus = (bout: TeamBout): string => {
        if (event.team_format === 'NCAA' && bout.ncaaStatus) {
            const { teamAScore, teamBScore, isComplete } = bout.ncaaStatus;
            if (isComplete) {
                return `${t('teamBoutOrderPage.complete')}: ${teamAScore}-${teamBScore}`;
            }
            return `${t('teamBoutOrderPage.inProgress')}: ${teamAScore}-${teamBScore}`;
        } else if (event.team_format === '45-touch' && bout.relayStatus) {
            const { teamAScore, teamBScore, isComplete } = bout.relayStatus;
            if (isComplete) {
                return `${t('teamBoutOrderPage.complete')}: ${teamAScore}-${teamBScore}`;
            }
            return `${t('teamBoutOrderPage.inProgress')}: ${teamAScore}-${teamBScore}`;
        }
        return t('teamBoutOrderPage.notStarted');
    };

    const handleCompletePool = async () => {
        Alert.alert(
            t('teamBoutOrderPage.confirmComplete'),
            t('teamBoutOrderPage.confirmCompleteMessage'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.confirm'),
                    onPress: async () => {
                        try {
                            const client = db;
                            await teamPoolUtils.dbCompleteTeamPool(client, roundId, poolId);
                            navigation.goBack();
                        } catch (error) {
                            console.error('Error completing pool:', error);
                            Alert.alert(t('common.error'), t('teamBoutOrderPage.errorCompletingPool'));
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
                <Text style={styles.loadingText}>{t('teamBoutOrderPage.loadingBouts')}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <BLEStatusBar compact={true} />
            
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.title}>
                    {t('poolsPage.poolPrefix')} {poolId + 1} - {t('teamBoutOrderPage.teamBouts')}
                </Text>
                
                <Text style={styles.formatInfo}>
                    {t('teamBoutOrderPage.format')}: {event.team_format === 'NCAA' ? 'NCAA (9 bouts)' : '45-touch Relay'}
                </Text>

                {teamBouts.length === 0 ? (
                    <Text style={styles.noBoutsText}>{t('teamBoutOrderPage.noBouts')}</Text>
                ) : (
                    teamBouts.map((bout, index) => (
                        <TouchableOpacity
                            key={bout.id}
                            style={styles.boutCard}
                            onPress={() => handleOpenBout(bout)}
                        >
                            <View style={styles.boutHeader}>
                                <Text style={styles.boutNumber}>
                                    {t('teamBoutOrderPage.boutNumber', { number: index + 1 })}
                                </Text>
                                <Text style={styles.boutStatus}>{getBoutStatus(bout)}</Text>
                            </View>
                            <View style={styles.boutTeams}>
                                <Text style={styles.teamName}>{bout.teamA?.name || `Team ${bout.team_a_id}`}</Text>
                                <Text style={styles.vsText}>vs</Text>
                                <Text style={styles.teamName}>{bout.teamB?.name || `Team ${bout.team_b_id}`}</Text>
                            </View>
                        </TouchableOpacity>
                    ))
                )}

                <TouchableOpacity style={styles.completeButton} onPress={handleCompletePool}>
                    <Text style={styles.completeButtonText}>{t('teamBoutOrderPage.completePool')}</Text>
                </TouchableOpacity>
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
        marginBottom: 20,
        color: '#666',
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
    boutStatus: {
        fontSize: 14,
        color: '#666',
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
    completeButton: {
        backgroundColor: '#28a745',
        padding: 15,
        borderRadius: 8,
        marginTop: 20,
        alignItems: 'center',
    },
    completeButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default TeamBoutOrderPage;
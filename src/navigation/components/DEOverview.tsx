// src/navigation/components/DEOverview.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Fencer } from '../navigation/types';
import DEHelpModal from './DEHelpModal';

interface DEOverviewProps {
    eventName: string;
    deFormat: 'single' | 'double' | 'compass';
    totalFencers: number;
    tableSize: number;
    currentRound: number;
    totalRounds: number;
    remainingFencers: number;
    topSeeds?: { seed: number; fencer: Fencer }[];
}

/**
 * Component that shows an overview of the DE bracket status
 */
const DEOverview: React.FC<DEOverviewProps> = ({
    eventName,
    deFormat,
    totalFencers,
    tableSize,
    currentRound,
    totalRounds,
    remainingFencers,
    topSeeds = [],
}) => {
    const [helpModalVisible, setHelpModalVisible] = useState(false);

    // Format name for display
    const formatDisplayName =
        deFormat === 'single' ? 'Single Elimination' : deFormat === 'double' ? 'Double Elimination' : 'Compass Draw';

    // Progress percentage through the tournament
    const progress = totalRounds > 0 ? ((currentRound - 1) / totalRounds) * 100 : 0;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.eventName}>{eventName}</Text>
                <View style={styles.formatContainer}>
                    <Text style={styles.formatText}>{formatDisplayName}</Text>
                    <TouchableOpacity style={styles.helpButton} onPress={() => setHelpModalVisible(true)}>
                        <Text style={styles.helpButtonText}>?</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Fencers</Text>
                    <Text style={styles.infoValue}>{totalFencers}</Text>
                </View>
                <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Bracket Size</Text>
                    <Text style={styles.infoValue}>{tableSize}</Text>
                    <Text style={styles.autoSizeNote}>(Automatic)</Text>
                </View>
                <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Remaining</Text>
                    <Text style={styles.infoValue}>{remainingFencers}</Text>
                </View>
                <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Round</Text>
                    <Text style={styles.infoValue}>
                        {currentRound} of {totalRounds}
                    </Text>
                </View>
            </View>

            {/* Progress bar */}
            <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${progress}%` }]} />
                <Text style={styles.progressText}>{Math.round(progress)}% Complete</Text>
            </View>

            {/* Top Seeds */}
            {topSeeds.length > 0 && (
                <View style={styles.topSeedsContainer}>
                    <Text style={styles.topSeedsTitle}>Top Seeds</Text>
                    <View style={styles.seedsList}>
                        {topSeeds.slice(0, 4).map(seedInfo => (
                            <View key={seedInfo.seed} style={styles.seedItem}>
                                <Text style={styles.seedNumber}>{seedInfo.seed}</Text>
                                <Text style={styles.seedFencer}>
                                    {seedInfo.fencer.lname}, {seedInfo.fencer.fname}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            <DEHelpModal visible={helpModalVisible} onClose={() => setHelpModalVisible(false)} format={deFormat} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 16,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    eventName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#001f3f',
    },
    formatContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    formatText: {
        fontSize: 16,
        color: '#666',
        marginRight: 8,
    },
    helpButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#001f3f',
        alignItems: 'center',
        justifyContent: 'center',
    },
    helpButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 12,
    },
    infoItem: {
        width: '25%',
        marginBottom: 8,
    },
    infoLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    progressContainer: {
        height: 24,
        backgroundColor: '#f0f0f0',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 12,
        position: 'relative',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#4CAF50',
        borderRadius: 12,
    },
    progressText: {
        position: 'absolute',
        width: '100%',
        textAlign: 'center',
        fontSize: 12,
        fontWeight: 'bold',
        color: '#000',
        lineHeight: 24,
    },
    topSeedsContainer: {
        marginTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 12,
    },
    topSeedsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    seedsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    seedItem: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '50%',
        marginBottom: 6,
    },
    seedNumber: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#001f3f',
        color: '#fff',
        textAlign: 'center',
        lineHeight: 24,
        marginRight: 8,
        fontSize: 12,
        fontWeight: 'bold',
    },
    seedFencer: {
        fontSize: 14,
        flex: 1,
    },
    autoSizeNote: {
        fontSize: 10,
        color: '#666',
        fontStyle: 'italic',
    },
});

export default DEOverview;

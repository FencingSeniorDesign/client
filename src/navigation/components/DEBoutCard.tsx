// src/navigation/components/DEBoutCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Fencer } from '../navigation/types';

interface DEBoutCardProps {
    id: number;
    fencerA?: Fencer;
    fencerB?: Fencer;
    scoreA?: number;
    scoreB?: number;
    seedA?: number;
    seedB?: number;
    winner?: number;
    isBye?: boolean;
    bracketType?: 'winners' | 'losers' | 'compass';
    onPress: (id: number) => void;
}

const DEBoutCard: React.FC<DEBoutCardProps> = ({
    id,
    fencerA,
    fencerB,
    scoreA,
    scoreB,
    seedA,
    seedB,
    winner,
    isBye = false,
    bracketType = 'winners',
    onPress,
}) => {
    // Determine bout types:
    // 1. TBD: No fencers assigned yet (waiting for previous rounds)
    // 2. BYE: One fencer present, one absent (automatic advancement)
    const isTBD = !fencerA && !fencerB;
    // Use the isBye prop that's passed in, but also check if one fencer is null and the other is defined
    const isActualBye = isBye || (!fencerA && fencerB) || (fencerA && !fencerB);
    
    // For display, distinguish between TBD and BYE cases
    const fencerAName = fencerA ? `${fencerA.lname}, ${fencerA.fname}` : (isTBD ? 'TBD' : 'BYE');
    const fencerBName = fencerB ? `${fencerB.lname}, ${fencerB.fname}` : (isTBD ? 'TBD' : 'BYE');

    const boutCompleted = winner !== undefined;
    const fencerAWon = winner === fencerA?.id;
    const fencerBWon = winner === fencerB?.id;

    // Color schemes based on bracket type
    const getBracketStyles = () => {
        switch (bracketType) {
            case 'losers':
                return {
                    border: '#FF6B6B',
                    win: '#FF8E8E',
                    bg: '#FFF0F0',
                };
            case 'compass':
                return {
                    border: '#6B9FFF',
                    win: '#8EB8FF',
                    bg: '#F0F5FF',
                };
            case 'winners':
            default:
                return {
                    border: '#4CAF50',
                    win: '#81C784',
                    bg: '#F0FFF0',
                };
        }
    };

    const bracketColors = getBracketStyles();

    // Format rating string for display
    const formatRating = (fencer?: Fencer): string => {
        if (!fencer) return '';

        const bestRating =
            fencer.frating !== 'U'
                ? { rating: fencer.frating, year: fencer.fyear }
                : fencer.erating !== 'U'
                  ? { rating: fencer.erating, year: fencer.eyear }
                  : fencer.srating !== 'U'
                    ? { rating: fencer.srating, year: fencer.syear }
                    : null;

        if (!bestRating) return '';
        return ` (${bestRating.rating}${bestRating.year.toString().slice(2)})`;
    };

    return (
        <TouchableOpacity
            style={[
                styles.container,
                isActualBye && styles.byeBout,
                isTBD && styles.tbdBout,
                boutCompleted && { borderColor: bracketColors.border, borderWidth: 2 },
                { backgroundColor: isActualBye ? '#f9f9f9' : isTBD ? '#f5f5f5' : bracketColors.bg },
            ]}
            onPress={() => onPress(id)}
            disabled={isActualBye || isTBD}
        >
            <View style={styles.fencerRow}>
                <View style={styles.fencerInfo}>
                    <Text style={[styles.seedText, seedA !== undefined && fencerA !== undefined && styles.seedVisible]}>
                        {seedA !== undefined && fencerA !== undefined ? `(${seedA})` : ''}
                    </Text>
                    <Text
                        style={[
                            styles.fencerName,
                            fencerAWon && { fontWeight: 'bold', color: bracketColors.win },
                            !fencerA && (isTBD ? styles.tbdText : styles.byeText),
                        ]}
                    >
                        {fencerAName}
                        {formatRating(fencerA)}
                    </Text>
                </View>
                <Text style={styles.scoreText}>{scoreA !== undefined ? scoreA : '-'}</Text>
            </View>
            <View style={styles.separator} />
            <View style={styles.fencerRow}>
                <View style={styles.fencerInfo}>
                    <Text style={[styles.seedText, seedB !== undefined && fencerB !== undefined && styles.seedVisible]}>
                        {seedB !== undefined && fencerB !== undefined ? `(${seedB})` : ''}
                    </Text>
                    <Text
                        style={[
                            styles.fencerName,
                            fencerBWon && { fontWeight: 'bold', color: bracketColors.win },
                            !fencerB && (isTBD ? styles.tbdText : styles.byeText),
                        ]}
                    >
                        {fencerBName}
                        {formatRating(fencerB)}
                    </Text>
                </View>
                <Text style={styles.scoreText}>{scoreB !== undefined ? scoreB : '-'}</Text>
            </View>
            {boutCompleted && (
                <View style={[styles.completedBadge, { backgroundColor: bracketColors.border }]}>
                    <Text style={styles.completedText}>Completed</Text>
                </View>
            )}
            {isActualBye && !isTBD && (
                <View style={styles.byeBadge}>
                    <Text style={styles.byeText}>Bye</Text>
                </View>
            )}
            {isTBD && (
                <View style={styles.tbdBadge}>
                    <Text style={styles.tbdText}>TBD</Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 12,
        width: '100%',
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
        marginBottom: 8,
    },
    byeBout: {
        opacity: 0.8,
        borderStyle: 'dashed',
        borderColor: '#ccc',
    },
    tbdBout: {
        opacity: 0.7,
        borderStyle: 'dotted',
        borderColor: '#ddd',
    },
    fencerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
    },
    separator: {
        height: 1,
        backgroundColor: '#eee',
        width: '100%',
        marginVertical: 4,
    },
    fencerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    seedText: {
        fontSize: 14,
        marginRight: 6,
        color: '#666',
        opacity: 0,
        minWidth: 36, // Ensure consistent spacing even when seed isn't shown
    },
    seedVisible: {
        opacity: 1,
    },
    fencerName: {
        fontSize: 16,
        flex: 1,
    },
    byeText: {
        fontStyle: 'italic',
        fontWeight: '500',
        color: '#777',  // Darker color for BYEs to distinguish them
    },
    tbdText: {
        fontStyle: 'italic',
        fontWeight: '300',
        color: '#aaa',  // Lighter color for TBDs
    },
    byeBadge: {
        position: 'absolute',
        top: -10,
        left: 10,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        backgroundColor: '#777',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
        elevation: 2,
    },
    tbdBadge: {
        position: 'absolute',
        top: -10,
        left: 10,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        backgroundColor: '#bbb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 1,
    },
    scoreText: {
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 10,
        minWidth: 30,
        textAlign: 'center',
    },
    completedBadge: {
        position: 'absolute',
        top: -10,
        right: 10,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    completedText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    byeBadge: {
        position: 'absolute',
        top: -10,
        left: 10,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        backgroundColor: '#999',
    },
});

export default DEBoutCard;

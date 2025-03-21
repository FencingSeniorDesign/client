import React, { useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    Platform,
} from "react-native";
import { RouteProp, useNavigation } from "@react-navigation/native";
import { Event, Fencer, Round, RoundType, DEFormat, PoolsOption } from "../../../core/types";
import { Picker } from "@react-native-picker/picker";
import { useQueryClient } from "@tanstack/react-query";

// Import repositories and queries
import { useEventQueries } from "../hooks/useEventQueries";
import { useRoundQueries } from "../../rounds/hooks/useRoundQueries";
import { useNetworkStatus } from "../../../infrastructure/networking/client";

// Import components
import { FencerSelector } from "../../fencers";

// ----- Pool Configuration Helper Types and Functions -----
interface PoolConfiguration {
    pools: number;
    baseSize: number;
    extraPools: number; // number of pools that get one extra fencer
}

function calculatePoolConfigurations(totalFencers: number): PoolConfiguration[] {
    const configurations: PoolConfiguration[] = [];
    // For a given number of pools, each must have at least 4 fencers.
    // Loop from 1 pool up to the maximum possible number of pools (totalFencers / 4)
    for (let numPools = 1; numPools <= Math.floor(totalFencers / 4); numPools++) {
        const baseSize = Math.floor(totalFencers / numPools);
        const remainder = totalFencers % numPools;

        // Ensure every pool has between 4 and 9 fencers.
        if (baseSize < 4) continue;
        if (remainder > 0 && baseSize + 1 > 9) continue;
        if (baseSize > 9) continue;

        configurations.push({
            pools: numPools,
            baseSize: baseSize,
            extraPools: remainder, // remainder pools will have baseSize+1 fencers
        });
    }
    return configurations;
}

function formatPoolLabel(config: PoolConfiguration): string {
    const { pools, baseSize, extraPools } = config;
    if (extraPools === 0) {
        return `${pools} ${pools === 1 ? "pool" : "pools"} of ${baseSize} fencers`;
    } else {
        const evenPools = pools - extraPools;
        const extraLabel = `${extraPools} ${extraPools === 1 ? "pool" : "pools"} of ${baseSize + 1} fencers`;
        const evenLabel = `${evenPools} ${evenPools === 1 ? "pool" : "pools"} of ${baseSize} fencers`;
        return `${extraLabel}, ${evenLabel}`;
    }
}

// ----- End Pool Configuration Helpers -----

type EventSettingsRouteProp = RouteProp<
    { params: { event: Event; onSave: (updatedEvent: Event) => void; isRemote?: boolean } },
    "params"
>;

type Props = {
    route: EventSettingsRouteProp;
};

export const EventSettings = ({ route }: Props) => {
    const { event: initialEvent, onSave, isRemote = false } = route.params || {};

    if (!initialEvent) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Error: No event data provided.</Text>
            </View>
        );
    }

    const navigation = useNavigation();
    const queryClient = useQueryClient();
    const { isConnected } = useNetworkStatus();

    // Event state
    const [event] = useState<Event>({ ...initialEvent });
    
    // UI states
    const [showRoundTypeOptions, setShowRoundTypeOptions] = useState<boolean>(false);
    const [expandedConfigIndex, setExpandedConfigIndex] = useState<number | null>(null);
    const [fencingDropdownOpen, setFencingDropdownOpen] = useState<boolean>(false);
    const [roundDropdownOpen, setRoundDropdownOpen] = useState<boolean>(false);

    // Repository queries
    const eventQueries = useEventQueries();
    const roundQueries = useRoundQueries();

    // Data queries
    const { 
        data: rounds = [], 
        isLoading: roundsLoading 
    } = roundQueries.useGetByEventId(event.id);
    
    // Keep track of fencers for the pool configuration
    const [fencers, setFencers] = useState<Fencer[]>([]);

    // Mutations
    const createRoundMutation = roundQueries.useCreate();
    const updateRoundMutation = roundQueries.useUpdate();
    const deleteRoundMutation = roundQueries.useDelete();

    // Pool configurations
    const poolConfigurations = React.useMemo(() =>
        calculatePoolConfigurations(fencers?.length || 0),
        [fencers?.length]
    );

    // Handle fencer list updates (for pool configuration calculations)
    const handleFencersChanged = useCallback((updatedFencers: Fencer[]) => {
        setFencers(updatedFencers);
    }, []);

    // Round management functions
    const toggleRoundConfig = useCallback((index: number) => {
        setExpandedConfigIndex((prev) => (prev === index ? null : index));
    }, []);

    // Handler for selecting a pool configuration
    const handleSelectPoolConfiguration = useCallback((config: PoolConfiguration, roundIndex: number) => {
        const round = rounds[roundIndex];
        if (!round) return;

        // Get pool size based on the configuration
        const expectedPoolSize = config.extraPools > 0 ? config.baseSize + 1 : config.baseSize;

        // Update the round with the new pool configuration
        const updatedRound = {
            ...round,
            poolCount: config.pools,
            poolSize: expectedPoolSize
        };

        updateRoundMutation.mutate({
            id: round.id, 
            data: updatedRound
        });
    }, [rounds, updateRoundMutation]);

    // Handler to add a new round
    const handleAddRound = useCallback((roundType: RoundType) => {
        const newRound = {
            eventId: event.id,
            rorder: rounds.length + 1, // Append at the end
            type: roundType,
            promotionPercent: roundType === 'pool' ? 100 : 0,
            targetBracket: roundType === 'pool' ? 0 : 0,
            useTargetBracket: false,
            deFormat: roundType === 'de' ? 'single' as DEFormat : undefined,
            deTableSize: roundType === 'de' ? 0 : undefined,
            isComplete: false,
            poolCount: roundType === 'pool' ? 0 : undefined,
            poolSize: roundType === 'pool' ? 0 : undefined,
            poolsOption: roundType === 'pool' ? 'promotion' as PoolsOption : undefined,
            isStarted: false
        };

        createRoundMutation.mutate(newRound);
    }, [event.id, rounds.length, createRoundMutation]);

    // Handler to update a round
    const handleUpdateRound = React.useCallback((round: Round, updates: Partial<Round>) => {
        updateRoundMutation.mutate({
            id: round.id,
            data: updates
        });
    }, [updateRoundMutation]);

    // Handler to delete a round
    const handleDeleteRound = React.useCallback((roundId: number) => {
        deleteRoundMutation.mutate(roundId);
    }, [deleteRoundMutation]);

    // Show offline warning if trying to access remote data without connection
    if (isRemote && !isConnected) {
        return (
            <View style={styles.offlineContainer}>
                <Text style={styles.offlineTitle}>Offline Mode</Text>
                <Text style={styles.offlineText}>
                    You're currently offline. Event settings can only be modified when connected to the network.
                </Text>
                <TouchableOpacity
                    style={styles.offlineButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.offlineButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.title}>Edit Event Settings</Text>

            {/* Fencing Management Dropdown */}
            <TouchableOpacity
                style={styles.dropdownHeader}
                onPress={() => setFencingDropdownOpen(!fencingDropdownOpen)}
            >
                <Text style={styles.dropdownHeaderText}>Fencer Management</Text>
            </TouchableOpacity>
            {fencingDropdownOpen && (
                <View style={styles.dropdownContent}>
                    <FencerSelector
                        eventId={event.id}
                        weapon={event.weapon}
                        onFencersChanged={handleFencersChanged}
                        allowAddNew={true}
                        allowRemove={true}
                        allowSearch={true}
                        allowRandomFill={true}
                    />
                </View>
            )}

            {/* Round Management */}
            <TouchableOpacity
                style={styles.dropdownHeader}
                onPress={() => setRoundDropdownOpen(!roundDropdownOpen)}
            >
                <Text style={styles.dropdownHeaderText}>Round Management</Text>
            </TouchableOpacity>
            {roundDropdownOpen && (
                <View style={styles.dropdownContent}>
                    {roundsLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="medium" color="#001f3f" />
                            <Text style={styles.loadingText}>Loading rounds...</Text>
                        </View>
                    ) : rounds.length > 0 ? (
                        <View style={styles.roundsList}>
                            {rounds.map((round, idx) => (
                                <View key={round.id} style={styles.roundItem}>
                                    <View style={styles.roundItemRow}>
                                        <View style={styles.dragHandle}>
                                            <Text style={styles.dragIcon}>☰</Text>
                                            <TouchableOpacity style={styles.moveButton}>
                                                <Text style={styles.moveButtonText}>↑</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.moveButton}>
                                                <Text style={styles.moveButtonText}>↓</Text>
                                            </TouchableOpacity>
                                        </View>
                                        <Text style={styles.roundLabelText}>
                                            {round.type === "pool" ? "Pools Round" : "DE Round"}
                                        </Text>
                                        <View style={styles.roundItemActions}>
                                            <TouchableOpacity
                                                style={styles.removeRoundButton}
                                                onPress={() => handleDeleteRound(round.id)}
                                            >
                                                <Text style={styles.removeRoundButtonText}>✖</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => toggleRoundConfig(idx)}
                                                style={styles.configButton}
                                            >
                                                <Text style={styles.configButtonText}>⚙</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                    {expandedConfigIndex === idx && (
                                        <View style={styles.roundConfig}>
                                            {round.type === "pool" ? (
                                                <View>
                                                    <View style={styles.configToggle}>
                                                        <TouchableOpacity
                                                            style={[
                                                                styles.configOptionButton,
                                                                round.poolsOption === "promotion" && styles.configOptionSelected,
                                                            ]}
                                                            onPress={() => {
                                                                handleUpdateRound(round, { poolsOption: "promotion" });
                                                            }}
                                                        >
                                                            <Text style={styles.configOptionText}>Promotion %</Text>
                                                        </TouchableOpacity>
                                                        <TouchableOpacity
                                                            style={[
                                                                styles.configOptionButton,
                                                                round.poolsOption === "target" && styles.configOptionSelected,
                                                            ]}
                                                            onPress={() => {
                                                                handleUpdateRound(round, { poolsOption: "target" });
                                                            }}
                                                        >
                                                            <Text style={styles.configOptionText}>Target Bracket</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                    {round.poolsOption === "promotion" ? (
                                                        <TextInput
                                                            style={styles.configInput}
                                                            keyboardType="numeric"
                                                            defaultValue={round.promotionPercent?.toString() || ""}
                                                            placeholder="Enter Promotion %"
                                                            onChangeText={(text) => {
                                                                // Store text locally
                                                                round._tempPromotionPercent = parseInt(text) || 0;
                                                            }}
                                                            onEndEditing={() => {
                                                                // When done editing, update the round with the temp value
                                                                handleUpdateRound(round, {
                                                                    promotionPercent: round._tempPromotionPercent || round.promotionPercent || 0
                                                                });
                                                            }}
                                                        />
                                                    ) : (
                                                        <View style={styles.targetSelector}>
                                                            {[8, 16, 32, 64, 128, 256].map((size) => (
                                                                <TouchableOpacity
                                                                    key={size}
                                                                    style={[
                                                                        styles.targetButton,
                                                                        round.targetBracket === size && styles.targetButtonSelected,
                                                                    ]}
                                                                    onPress={() => {
                                                                        handleUpdateRound(round, { targetBracket: size });
                                                                    }}
                                                                >
                                                                    <Text style={styles.targetButtonText}>{size}</Text>
                                                                </TouchableOpacity>
                                                            ))}
                                                        </View>
                                                    )}
                                                    <View style={styles.poolConfigContainer}>
                                                        <Text style={styles.configTitle}>Pool Configurations</Text>
                                                        {poolConfigurations.map((config, index) => {
                                                            // Determine the expected poolsize based on this config.
                                                            const expectedPoolSize = config.extraPools > 0 ? config.baseSize + 1 : config.baseSize;
                                                            // Check if the current round's pool configuration matches this one.
                                                            const isSelected =
                                                                round.poolCount === config.pools && round.poolSize === expectedPoolSize;
                                                            return (
                                                                <TouchableOpacity
                                                                    key={index}
                                                                    style={[
                                                                        styles.poolConfigButton,
                                                                        isSelected && styles.poolConfigButtonSelected,
                                                                    ]}
                                                                    onPress={() => {
                                                                        handleUpdateRound(round, {
                                                                            poolCount: config.pools,
                                                                            poolSize: expectedPoolSize,
                                                                        });
                                                                    }}
                                                                >
                                                                    <Text style={styles.poolConfigButtonText}>{formatPoolLabel(config)}</Text>
                                                                </TouchableOpacity>
                                                            );
                                                        })}
                                                    </View>

                                                </View>
                                            ) : (
                                                <View style={styles.deConfig}>
                                                    <Text style={styles.configLabel}>Elimination Format:</Text>
                                                    <View style={styles.deFormatContainer}>
                                                        {["single", "double", "compass"].map((format) => (
                                                            <TouchableOpacity
                                                                key={format}
                                                                style={[
                                                                    styles.deFormatButton,
                                                                    round.deFormat === format && styles.deFormatButtonSelected,
                                                                ]}
                                                                onPress={() => {
                                                                    handleUpdateRound(round, { deFormat: format as DEFormat });
                                                                }}
                                                            >
                                                                <Text style={[
                                                                    styles.deFormatButtonText,
                                                                    round.deFormat === format && styles.deFormatButtonTextSelected
                                                                ]}>
                                                                    {format.charAt(0).toUpperCase() + format.slice(1)}
                                                                </Text>
                                                            </TouchableOpacity>
                                                        ))}
                                                    </View>

                                                    <Text style={styles.deFormatInfoHeader}>Format Information:</Text>

                                                    <View style={styles.deFormatInfo}>
                                                        {round.deFormat === 'single' && (
                                                            <Text style={styles.deFormatDescription}>
                                                                Single elimination: Fencers are eliminated after one loss. The bracket size will be automatically determined based on the number of registered fencers.
                                                            </Text>
                                                        )}
                                                        {round.deFormat === 'double' && (
                                                            <Text style={styles.deFormatDescription}>
                                                                Double elimination: Fencers continue in a losers bracket after first loss. All fencers get at least two bouts before elimination. The bracket size will be automatically determined.
                                                            </Text>
                                                        )}
                                                        {round.deFormat === 'compass' && (
                                                            <Text style={styles.deFormatDescription}>
                                                                Compass format: All fencers continue in different brackets based on when they lose. This format maximizes the number of bouts per fencer. Bracket size will be calculated automatically.
                                                            </Text>
                                                        )}
                                                    </View>

                                                    <Text style={styles.fencerCountNote}>
                                                        The bracket will be sized as the smallest power of 2 (8, 16, 32, 64, etc.) that can accommodate all registered fencers.
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    )}
                                </View>
                            ))}
                        </View>
                    ) : (
                        <Text style={styles.note}>No rounds configured yet.</Text>
                    )}

                    <TouchableOpacity
                        style={styles.addRoundButton}
                        onPress={() => setShowRoundTypeOptions(!showRoundTypeOptions)}
                    >
                        <Text style={styles.addRoundButtonText}>Add Round</Text>
                    </TouchableOpacity>
                    {showRoundTypeOptions && (
                        <View style={styles.roundTypeMenu}>
                            <TouchableOpacity
                                style={styles.roundTypeChoice}
                                onPress={() => {
                                    handleAddRound("pool");
                                    setShowRoundTypeOptions(false);
                                }}
                            >
                                <Text style={styles.roundTypeChoiceText}>Pools</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.roundTypeChoice}
                                onPress={() => {
                                    handleAddRound("de");
                                    setShowRoundTypeOptions(false);
                                }}
                            >
                                <Text style={styles.roundTypeChoiceText}>DE</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {(createRoundMutation.isPending || updateRoundMutation.isPending || deleteRoundMutation.isPending) && (
                        <View style={styles.pendingActionContainer}>
                            <ActivityIndicator size="small" color="#001f3f" />
                            <Text style={styles.pendingActionText}>
                                {createRoundMutation.isPending ? "Adding round..." :
                                    updateRoundMutation.isPending ? "Updating round..." :
                                        "Deleting round..."}
                            </Text>
                        </View>
                    )}
                </View>
            )}
        </ScrollView>
    );
};

export default EventSettings;

const navyBlue = "#000080";
const white = "#ffffff";
const greyAccent = "#cccccc";
const lightRed = "#ff9999";

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f7f7f7",
    },
    content: {
        padding: 20,
    },
    loadingContainer: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 10,
        color: '#666',
        fontSize: 14,
    },
    pendingActionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
        margin: 8,
        backgroundColor: '#f0f0f0',
        borderRadius: 4,
    },
    pendingActionText: {
        marginLeft: 8,
        color: '#666',
        fontSize: 14,
    },
    buttonLoadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    roundsList: {
        marginBottom: 10,
    },
    title: {
        fontSize: 26,
        fontWeight: "bold",
        marginBottom: 20,
        textAlign: "center",
        color: "#001f3f",
    },
    dropdownHeader: {
        backgroundColor: "#001f3f",
        padding: 15,
        borderRadius: 8,
        marginBottom: 5,
    },
    dropdownHeaderText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "600",
    },
    dropdownContent: {
        backgroundColor: "#fff",
        padding: 15,
        borderRadius: 8,
        marginBottom: 20,
    },
    section: {
        backgroundColor: "#fff",
        padding: 15,
        borderRadius: 8,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 10,
        color: "#001f3f",
    },
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 6,
        padding: 10,
        marginBottom: 10,
        fontSize: 16,
        backgroundColor: "#fff",
    },
    inputLabel: {
        fontSize: 16,
        marginBottom: 5,
        color: "#001f3f",
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    pickerLeft: {
        flex: 1,
        marginRight: 5,
    },
    pickerRight: {
        flex: 1,
        marginLeft: 5,
    },
    roundTypeChoice: {
        borderWidth: 1,
        borderColor: navyBlue,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
    },
    roundTypeChoiceText: {
        fontSize: 16,
        color: navyBlue,
    },
    fencerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 5,
    },
    fencerItem: {
        fontSize: 16,
        color: "#001f3f",
    },
    removeFencerButton: {
        backgroundColor: "#d9534f",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    removeFencerText: {
        color: "#fff",
        fontSize: 14,
    },
    note: {
        fontStyle: "italic",
        color: "#777",
    },
    saveButtonText: {
        color: "green",
        fontSize: 18,
        fontWeight: "bold",
        textAlign: "center",
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    errorText: {
        color: "red",
        fontSize: 18,
    },
    fencerListContainer: {
        marginTop: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 6,
        backgroundColor: "#fafafa",
    },
    fencerListHeader: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 8,
        color: "#001f3f",
    },
    roundItem: {
        borderWidth: 1,
        borderColor: greyAccent,
        borderRadius: 5,
        padding: 8,
        marginBottom: 8,
        backgroundColor: white,
    },
    roundItemRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    dragHandle: {
        flexDirection: "row",
        alignItems: "center",
    },
    dragIcon: {
        fontSize: 20,
        marginRight: 4,
    },
    moveButton: {
        paddingHorizontal: 4,
    },
    moveButtonText: {
        fontSize: 16,
    },
    roundLabelText: {
        flex: 1,
        fontSize: 16,
        fontWeight: "600",
    },
    roundItemActions: {
        flexDirection: "row",
    },
    removeRoundButton: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    removeRoundButtonText: {
        fontSize: 18,
        color: "red",
    },
    configButton: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    configButtonText: {
        fontSize: 18,
        color: navyBlue,
    },
    roundConfig: {
        marginTop: 8,
        padding: 8,
        borderTopWidth: 1,
        borderColor: greyAccent,
    },
    deConfig: {
        marginTop: 8,
        padding: 8,
        borderTopWidth: 1,
        borderColor: greyAccent,
    },
    targetSelector: {
        flexDirection: "row",
        justifyContent: "space-around",
    },
    targetButton: {
        padding: 8,
        borderWidth: 1,
        borderColor: greyAccent,
        borderRadius: 4,
        marginHorizontal: 4,
    },
    targetButtonSelected: {
        backgroundColor: navyBlue,
    },
    targetButtonText: {
        fontSize: 14,
        color: "#000",
    },
    configToggle: {
        flexDirection: "row",
        justifyContent: "space-around",
        marginBottom: 8,
    },
    configOptionButton: {
        flex: 1,
        backgroundColor: greyAccent,
        paddingVertical: 8,
        marginHorizontal: 4,
        borderRadius: 4,
        alignItems: "center",
    },
    configOptionSelected: {
        backgroundColor: navyBlue,
    },
    configOptionText: {
        fontSize: 14,
        color: "#000",
    },
    configInput: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 4,
        padding: 8,
        fontSize: 14,
    },
    addFencerButton: {
        backgroundColor: "#001f3f",
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 6,
        alignItems: "center",
        marginVertical: 5,
    },
    addFencerButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
    uploadCSVText: {
        color: "#001f3f",
        fontSize: 16,
        textAlign: "center",
        textDecorationLine: "underline",
    },
    addRoundButton: {
        width: "100%",
        borderWidth: 2,
        borderColor: navyBlue,
        paddingVertical: 14,
        borderRadius: 5,
        alignItems: "center",
        marginBottom: 15,
        marginTop: 5,
    },
    addRoundButtonText: {
        color: navyBlue,
        fontSize: 16,
        fontWeight: "600",
    },
    poolConfigContainer: {
        marginTop: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: greyAccent,
        borderRadius: 6,
        backgroundColor: "#fafafa",
    },
    poolConfigButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: "#001f3f",
        borderRadius: 4,
        marginVertical: 4,
    },
    poolConfigButtonText: {
        color: "#fff",
        fontSize: 14,
        textAlign: "center",
    },
    configTitle: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 8,
        color: "#001f3f",
    },
    roundTypeMenu: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 15,
    },
    poolConfigButtonSelected: {
        backgroundColor: "#28a745",
    },
    configLabel: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        color: '#001f3f',
    },
    deFormatContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    deFormatButton: {
        flex: 1,
        padding: 12,
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        borderRadius: 6,
        marginHorizontal: 4,
    },
    deFormatButtonSelected: {
        backgroundColor: '#001f3f',
    },
    deFormatButtonText: {
        fontSize: 14,
        color: '#333',
    },
    deFormatButtonTextSelected: {
        color: '#fff',
    },
    deFormatInfoHeader: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 15,
        marginBottom: 8,
        color: '#001f3f',
    },
    deFormatInfo: {
        backgroundColor: '#f0f4f8',
        padding: 12,
        borderRadius: 6,
        marginBottom: 12,
    },
    deFormatDescription: {
        fontSize: 14,
        lineHeight: 20,
        color: '#444',
    },
    fencerCountNote: {
        fontSize: 14,
        fontStyle: 'italic',
        color: '#666',
        marginTop: 10,
    },
    // New styles for the optimized horizontal form layout
    horizontalFormRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 6,
        backgroundColor: '#fff',
        overflow: 'hidden',
    },
    weaponPickerContainer: {
        flex: 1.2,
        paddingVertical: 2,
        paddingHorizontal: 6,
        borderRightWidth: 1,
        borderRightColor: '#ccc',
    },
    ratingPickerContainer: {
        flex: 0.8,
        paddingVertical: 2,
        paddingHorizontal: 6,
        borderRightWidth: 1,
        borderRightColor: '#ccc',
    },
    yearPickerContainer: {
        flex: 1,
        paddingVertical: 2,
        paddingHorizontal: 6,
    },
    compactInputLabel: {
        fontSize: 12,
        color: '#001f3f',
        marginBottom: 0,
        paddingTop: 2,
    },
    compactPicker: {
        height: 36,
        marginBottom: -8, // Reduce extra bottom space in the picker
    },
    // New styles for the Random Fill button
    randomFillButton: {
        backgroundColor: "#28a745",
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 6,
        alignItems: "center",
        marginVertical: 5,
    },
    randomFillButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
    // Styles for the Random Fill dropdown input
    randomFillDropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 6,
        backgroundColor: '#fff',
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    randomFillInput: {
        flex: 1,
        height: 40,
        fontSize: 16,
        paddingHorizontal: 8,
    },
    randomFillGoButton: {
        backgroundColor: "#28a745",
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 6,
        marginLeft: 10,
    },
    randomFillGoButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
    // Styles for offline mode
    offlineContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f7f7f7',
    },
    offlineTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#d9534f',
        marginBottom: 15,
    },
    offlineText: {
        fontSize: 16,
        color: '#333',
        textAlign: 'center',
        marginBottom: 25,
        lineHeight: 24,
    },
    offlineButton: {
        backgroundColor: '#001f3f',
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 8,
    },
    offlineButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
    },
});
import React, { useState, useCallback, useRef, useEffect } from "react";
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
import { Event, Fencer, Round } from "../navigation/types";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
// Import our custom picker component instead of the native one
import CustomPickerComponent from "../../components/ui/CustomPicker";
const { CustomPicker, FencerCreationControls } = CustomPickerComponent;
import { useQueryClient } from "@tanstack/react-query";
import {
    useFencers,
    useRounds,
    useSearchFencers,
    useAddFencer,
    useRemoveFencer,
    useCreateFencer,
    useAddRound,
    useUpdateRound,
    useDeleteRound,
} from "../../data/TournamentDataHooks";

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

    const [event] = useState<Event>({ ...initialEvent });
    const initialWeapon = initialEvent.weapon.toLowerCase();
    const [selectedWeapon, setSelectedWeapon] = useState<string>(initialWeapon);
    const [fencerFirstName, setFencerFirstName] = useState<string>("");
    const [fencerLastName, setFencerLastName] = useState<string>("");

    // TanStack Query hooks
    const {
        data: fencers = [],
        isLoading: fencersLoading
    } = useFencers(event);

    const {
        data: rounds = [],
        isLoading: roundsLoading
    } = useRounds(event.id);

    // Mutations
    const addFencerMutation = useAddFencer();
    const removeFencerMutation = useRemoveFencer();
    const createFencerMutation = useCreateFencer();
    const addRoundMutation = useAddRound();
    const updateRoundMutation = useUpdateRound();
    const deleteRoundMutation = useDeleteRound();

    // --- Round Reordering Logic ---
    const handleMoveRound = useCallback(async (roundId: number, direction: 'up' | 'down') => {
        const currentIndex = rounds.findIndex(r => r.id === roundId);
        if (currentIndex === -1) return; // Round not found

        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

        // Check bounds
        if (targetIndex < 0 || targetIndex >= rounds.length) return;

        // Create a new ordered array for optimistic update (optional but good UX)
        const newOrderedRounds = [...rounds];
        const [movedRound] = newOrderedRounds.splice(currentIndex, 1);
        newOrderedRounds.splice(targetIndex, 0, movedRound);

        // Optimistically update the UI before database calls
        queryClient.setQueryData(['rounds', event.id], newOrderedRounds.map((r, index) => ({ ...r, rorder: index + 1 })));

        // Prepare updates for the database
        const updates: Promise<any>[] = [];
        newOrderedRounds.forEach((round, index) => {
            const newOrder = index + 1;
            // Only update if the order actually changed
            if (round.rorder !== newOrder) {
                updates.push(updateRoundMutation.mutateAsync({ ...round, rorder: newOrder }));
            }
        });

        try {
            await Promise.all(updates);
            // Invalidate to refetch and confirm the order from the source of truth
            queryClient.invalidateQueries({ queryKey: ['rounds', event.id] });
        } catch (error) {
            console.error("Failed to reorder rounds:", error);
            Alert.alert("Error", "Failed to save the new round order.");
            // Revert optimistic update on failure
            queryClient.setQueryData(['rounds', event.id], rounds);
        }

    }, [rounds, updateRoundMutation, queryClient, event.id]);
    // --- End Round Reordering Logic ---


    // States for ratings and years
    const [epeeRating, setEpeeRating] = useState<string>("U");
    const [epeeYear, setEpeeYear] = useState<number>(new Date().getFullYear());
    const [foilRating, setFoilRating] = useState<string>("U");
    const [foilYear, setFoilYear] = useState<number>(new Date().getFullYear());
    const [saberRating, setSaberRating] = useState<string>("U");
    const [saberYear, setSaberYear] = useState<number>(new Date().getFullYear());

    // Search state for fencers
    const [searchQuery, setSearchQuery] = useState<string>("");
    const { data: fencerSuggestions = [], isLoading: searchLoading } = useSearchFencers(searchQuery);

    // Round management states
    const [showRoundTypeOptions, setShowRoundTypeOptions] = useState<boolean>(false);
    const [expandedConfigIndex, setExpandedConfigIndex] = useState<number | null>(null);
    const [promotionInputText, setPromotionInputText] = useState<string>(""); // State for promotion % input

    // Dropdown states
    const [fencingDropdownOpen, setFencingDropdownOpen] = useState<boolean>(false);
    const [roundDropdownOpen, setRoundDropdownOpen] = useState<boolean>(false);

    // Pool configurations - using React.useMemo to avoid unnecessary recalculations
    const poolConfigurations = React.useMemo(() =>
            calculatePoolConfigurations(fencers?.length || 0),
        [fencers?.length]
    );

    const currentRating =
        selectedWeapon === "epee"
            ? epeeRating
            : selectedWeapon === "foil"
                ? foilRating
                : saberRating;
    const currentYear =
        selectedWeapon === "epee"
            ? epeeYear
            : selectedWeapon === "foil"
                ? foilYear
                : saberYear;

    // Fencer functions
    const handleAddFencer = React.useCallback(() => {
        let newFencer: Fencer = {
            fname: fencerFirstName.trim(),
            lname: fencerLastName.trim(),
            erating: epeeRating,
            eyear: epeeYear,
            frating: foilRating,
            fyear: foilYear,
            srating: saberRating,
            syear: saberYear,
        };

        createFencerMutation.mutate({
            fencer: newFencer,
            event,
            addToEvent: true
        });

        setFencerFirstName("");
        setFencerLastName("");
    }, [
        fencerFirstName,
        fencerLastName,
        epeeRating,
        epeeYear,
        foilRating,
        foilYear,
        saberRating,
        saberYear,
        createFencerMutation,
        event
    ]);

    const handleUploadCSV = React.useCallback(async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ type: "text/csv" });
            if ("uri" in result && result.uri) {
                //@ts-ignore
                const csvString = await FileSystem.readAsStringAsync(result.uri);
                const lines = csvString.split("\n");

                // Process CSV data
                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine) continue;

                    const parts = trimmedLine.split(",").map((p) => p.trim());
                    if (parts.length >= 2 && parts[0] && parts[1]) {
                        const newFencer: Fencer = {
                            fname: parts[0],
                            lname: parts[1],
                            erating: "U",
                            eyear: 0,
                            frating: "U",
                            fyear: 0,
                            srating: "U",
                            syear: 0,
                        };

                        // Create fencer sequentially
                        await createFencerMutation.mutateAsync({
                            fencer: newFencer,
                            event,
                            addToEvent: true
                        });
                    }
                }

                Alert.alert("Success", "Fencers imported successfully");
            }
        } catch (error) {
            console.error("Error reading CSV file:", error);
            Alert.alert("Error", "Failed to import fencers from CSV");
        }
    }, [createFencerMutation, event]);

    // Function to add random fencers
    const addRandomFencers = async (count: number) => {
        const firstNames = [
            "Alice", "Bob", "Charlie", "David", "Eve", "Faythe", "Grace",
            "Heidi", "Ivan", "Judy", "Mallory", "Niaj", "Olivia", "Peggy", "Trent"
        ];
        const lastNames = [
            "Anderson", "Brown", "Clark", "Davis", "Evans", "Franklin", "Garcia",
            "Harris", "Iverson", "Johnson", "King", "Lewis", "Martinez", "Nelson", "Olsen"
        ];
        const ratings = ["A", "B", "C", "D", "E", "U"];
        const currentYear = new Date().getFullYear();

        // Create a set of full names from existing fencers (using lowercase for consistency)
        const existingNames = new Set(fencers.map(f => `${f.fname.toLowerCase()} ${f.lname.toLowerCase()}`));
        let addedCount = 0;
        let attempts = 0;
        const maxAttempts = count * 10; // Limit attempts to avoid infinite loops

        while (addedCount < count && attempts < maxAttempts) {
            attempts++;
            const randomFirstName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const randomLastName = lastNames[Math.floor(Math.random() * lastNames.length)];
            const fullName = `${randomFirstName.toLowerCase()} ${randomLastName.toLowerCase()}`;

            // Skip if the name already exists
            if (existingNames.has(fullName)) {
                continue;
            }
            // Mark the new name as used
            existingNames.add(fullName);

            const randomEpeeRating = ratings[Math.floor(Math.random() * ratings.length)];
            const randomFoilRating = ratings[Math.floor(Math.random() * ratings.length)];
            const randomSaberRating = ratings[Math.floor(Math.random() * ratings.length)];

            const newFencer: Fencer = {
                fname: randomFirstName,
                lname: randomLastName,
                erating: randomEpeeRating,
                eyear: randomEpeeRating === "U" ? 0 : currentYear,
                frating: randomFoilRating,
                fyear: randomFoilRating === "U" ? 0 : currentYear,
                srating: randomSaberRating,
                syear: randomSaberRating === "U" ? 0 : currentYear,
            };

            await createFencerMutation.mutateAsync({
                fencer: newFencer,
                event,
                addToEvent: true,
            });
            addedCount++;
        }

        if (addedCount < count) {
            Alert.alert("Warning", "Not enough unique fencer names available to add all requested random fencers.");
        }
    };


    // Handler for Random Fill button
    // Add these state variables near the other state declarations:
    const [showRandomFillInput, setShowRandomFillInput] = useState(false);
    const [randomFillInput, setRandomFillInput] = useState("");

// Replace the previous handleRandomFill with the following:
    const handleRandomFill = () => {
        // Toggle the dropdown input view
        setShowRandomFillInput(!showRandomFillInput);
    };

    const handleRandomFillGo = async () => {
        const count = parseInt(randomFillInput, 10);
        if (isNaN(count) || count <= 0) {
            Alert.alert("Invalid input", "Please enter a valid number greater than 0.");
            return;
        }
        try {
            await addRandomFencers(count);
            Alert.alert("Success", `${count} random fencers added.`);
            setRandomFillInput("");
            setShowRandomFillInput(false);
        } catch (error) {
            Alert.alert("Error", "Failed to add random fencers.");
        }
    };

    // Define formatRatingString first
    const formatRatingString = React.useCallback((fencer: Fencer): string => {
        if (!fencer) return '';

        let rating = "";
        let year = 0;
        switch (event.weapon.toLowerCase()) {
            case "epee":
                rating = fencer.erating || "";
                year = fencer.eyear || 0;
                break;
            case "foil":
                rating = fencer.frating || "";
                year = fencer.fyear || 0;
                break;
            case "saber":
                rating = fencer.srating || "";
                year = fencer.syear || 0;
                break;
            default:
                break;
        }
        const yearStr = rating !== "U" ? year.toString().slice(2) : "";
        return `${rating}${yearStr}`;
    }, [event.weapon]);

    // Then define handleRemoveFencer
    const handleRemoveFencer = React.useCallback((fencer: Fencer, event: Event) => {
        removeFencerMutation.mutate({ fencer, event });
    }, [removeFencerMutation]);

    // Define handleAddFencerFromSearch first
    const handleAddFencerFromSearch = React.useCallback((fencer: Fencer) => {
        addFencerMutation.mutate({ fencer, event });
        setSearchQuery("");
    }, [addFencerMutation, event, setSearchQuery]);

    // Then define renderFencers
    const renderFencers = React.useCallback(() => {
        if (!fencers || !Array.isArray(fencers)) return null;

        return fencers.map((fencer) => (
            <View key={fencer.id} style={styles.fencerRow}>
                <Text style={styles.fencerItem}>
                    {fencer.lname}, {fencer.fname} ({formatRatingString(fencer)})
                </Text>
                <TouchableOpacity
                    onPress={() => handleRemoveFencer(fencer, event)}
                    style={styles.removeFencerButton}
                    disabled={removeFencerMutation.isPending}
                >
                    <Text style={styles.removeFencerText}>x</Text>
                </TouchableOpacity>
            </View>
        ));
    }, [fencers, formatRatingString, handleRemoveFencer, event, removeFencerMutation.isPending]);

    // And finally define renderFencerSuggestions
    const renderFencerSuggestions = React.useCallback(() => {
        if (!fencerSuggestions || !Array.isArray(fencerSuggestions)) return null;

        return fencerSuggestions.map((fencer) => (
            <TouchableOpacity
                key={fencer.id}
                onPress={() => handleAddFencerFromSearch(fencer)}
                style={styles.fencerRow}
                disabled={addFencerMutation.isPending}
            >
                <Text style={styles.fencerItem}>
                    {fencer.lname}, {fencer.fname} ({formatRatingString(fencer)})
                </Text>
            </TouchableOpacity>
        ));
    }, [fencerSuggestions, formatRatingString, handleAddFencerFromSearch, addFencerMutation.isPending]);

    // Add refs array for round items
    const roundItemRefs = useRef<Array<View | null>>([]);
    
    // Effect to scroll to expanded round config
    useEffect(() => {
        if (expandedConfigIndex !== null && roundItemRefs.current[expandedConfigIndex]) {
            requestAnimationFrame(() => {
                roundItemRefs.current[expandedConfigIndex]?.measureLayout(
                    // @ts-ignore - Known React Native issue with measureLayout types
                    scrollViewRef.current?._internalFiberInstanceHandleDEV || scrollViewRef.current,
                    (_, y) => {
                        scrollViewRef.current?.scrollTo({ y: y - 50, animated: true });
                    },
                    () => console.error("Failed to measure layout")
                );
            });
        }
    }, [expandedConfigIndex]);

    const toggleRoundConfig = useCallback((index: number) => {
        const newIndex = expandedConfigIndex === index ? null : index;
        setExpandedConfigIndex(newIndex);
        // Initialize input text when expanding a pool round config
        if (newIndex !== null && rounds[newIndex]?.type === 'pool') {
            setPromotionInputText(rounds[newIndex].promotionpercent?.toString() || "100");
        }
    }, [expandedConfigIndex, rounds]);

    // Handler for selecting a pool configuration for a specific round
    const handleSelectPoolConfiguration = useCallback((config: PoolConfiguration, roundIndex: number) => {
        const round = rounds[roundIndex];
        if (!round) return;

        // Get pool size based on the configuration
        const expectedPoolSize = config.extraPools > 0 ? config.baseSize + 1 : config.baseSize;

        // Update the round with the new pool configuration
        const updatedRound = {
            ...round,
            poolcount: config.pools,
            poolsize: expectedPoolSize
        };

        updateRoundMutation.mutate(updatedRound);
    }, [rounds, updateRoundMutation]);

    // Handler to add a new round. Creates a new round object with default values.
    const handleAddRound = useCallback((roundType: 'pool' | 'de') => {
        const newRound = {
            eventid: event.id,
            rorder: rounds.length + 1, // Append at the end
            type: roundType,
            promotionpercent: roundType === 'pool' ? 100 : 0,
            targetbracket: roundType === 'pool' ? 0 : 0,
            usetargetbracket: 0 as 0 | 1, // Use literal 0 and assert type
            deformat: roundType === 'de' ? 'single' : '',
            detablesize: roundType === 'de' ? 0 : 0,
            iscomplete: 0,
            poolcount: roundType === 'pool' ? 0 : undefined, // Use undefined instead of null
            poolsize: roundType === 'pool' ? 0 : undefined, // Use undefined instead of null
            poolsoption: roundType === 'pool' ? 'promotion' : undefined,
            isstarted: false // Use boolean false for isstarted
        };

        addRoundMutation.mutate(newRound as Partial<Round>); // Assert as Partial<Round>
        
        // Scroll to the new rounds section immediately after mutation
        requestAnimationFrame(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        });
    }, [event.id, rounds.length, addRoundMutation]);

    // Handler to update a round immediately after a change
    const handleUpdateRound = React.useCallback((updatedRound: Round) => {
        updateRoundMutation.mutate(updatedRound);
    }, [updateRoundMutation]);

    // Handler to delete a round
    const handleDeleteRound = React.useCallback((roundId: number) => {
        deleteRoundMutation.mutate({ roundId, eventId: event.id });
    }, [deleteRoundMutation, event.id]);

    // Create refs for scrolling
    const scrollViewRef = useRef<ScrollView>(null);
    const roundsDropdownRef = useRef<View>(null);
    const roundTypeMenuRef = useRef<View>(null);
    
    return (
        <ScrollView 
            ref={scrollViewRef}
            style={styles.container} 
            contentContainerStyle={styles.content}>
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
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Search Fencers</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Search by Name"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchLoading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="small" color="#001f3f" />
                                <Text style={styles.loadingText}>Searching...</Text>
                            </View>
                        ) : fencerSuggestions.length > 0 ? (
                            renderFencerSuggestions()
                        ) : searchQuery.trim().length > 0 ? (
                            <Text style={styles.note}>No matching fencers found</Text>
                        ) : null}
                    </View>
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Add Fencer</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="First Name"
                            value={fencerFirstName}
                            onChangeText={setFencerFirstName}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Last Name"
                            value={fencerLastName}
                            onChangeText={setFencerLastName}
                        />
                        {/* Replace with our custom FencerCreationControls component */}
                        <FencerCreationControls
                            selectedWeapon={selectedWeapon}
                            setSelectedWeapon={setSelectedWeapon}
                            currentRating={currentRating}
                            currentYear={currentYear}
                            handleRatingChange={(itemValue: string) => { // Added type for itemValue
                                if (selectedWeapon === "epee") {
                                    setEpeeRating(itemValue);
                                    setEpeeYear((prevYear) =>
                                        itemValue === "U" ? 0 : prevYear || new Date().getFullYear()
                                    );
                                } else if (selectedWeapon === "foil") {
                                    setFoilRating(itemValue);
                                    setFoilYear((prevYear) =>
                                        itemValue === "U" ? 0 : prevYear || new Date().getFullYear()
                                    );
                                } else if (selectedWeapon === "saber") {
                                    setSaberRating(itemValue);
                                    setSaberYear((prevYear) =>
                                        itemValue === "U" ? 0 : prevYear || new Date().getFullYear()
                                    );
                                }
                            }}
                            handleYearChange={(itemValue: number) => { // Added type for itemValue
                                if (selectedWeapon === "epee") {
                                    setEpeeYear(itemValue);
                                } else if (selectedWeapon === "foil") {
                                    setFoilYear(itemValue);
                                } else if (selectedWeapon === "saber") {
                                    setSaberYear(itemValue);
                                }
                            }}
                        />
                        <TouchableOpacity
                            onPress={handleAddFencer}
                            style={styles.addFencerButton}
                            disabled={createFencerMutation.isPending}
                        >
                            {createFencerMutation.isPending ? (
                                <View style={styles.buttonLoadingContainer}>
                                    <ActivityIndicator size="small" color="#fff" />
                                    <Text style={styles.addFencerButtonText}>Adding...</Text>
                                </View>
                            ) : (
                                <Text style={styles.addFencerButtonText}>Add Fencer</Text>
                            )}
                        </TouchableOpacity>
                        {/* New Random Fill Button */}
                        <TouchableOpacity
                            onPress={handleRandomFill}
                            style={styles.randomFillButton}
                        >
                            <Text style={styles.randomFillButtonText}>Random fill</Text>
                        </TouchableOpacity>
                        {showRandomFillInput && (
                            <View style={styles.randomFillDropdown}>
                                <TextInput
                                    style={styles.randomFillInput}
                                    placeholder="Enter number of fencers"
                                    value={randomFillInput}
                                    onChangeText={setRandomFillInput}
                                    keyboardType="numeric"
                                />
                                <TouchableOpacity
                                    onPress={handleRandomFillGo}
                                    style={styles.randomFillGoButton}
                                >
                                    <Text style={styles.randomFillGoButtonText}>Go</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                    </View>
                    <View style={styles.fencerListContainer}>
                        <Text style={styles.fencerListHeader}>Current Fencers: {fencers.length}</Text>
                        {fencersLoading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="small" color="#001f3f" />
                                <Text style={styles.loadingText}>Loading fencers...</Text>
                            </View>
                        ) : fencers.length === 0 ? (
                            <Text style={styles.note}>No fencers added yet.</Text>
                        ) : (
                            renderFencers()
                        )}
                        {createFencerMutation.isPending && (
                            <View style={styles.pendingActionContainer}>
                                <ActivityIndicator size="small" color="#001f3f" />
                                <Text style={styles.pendingActionText}>Adding fencer...</Text>
                            </View>
                        )}
                    </View>
                </View>
            )}

            {/* Round Management */}
            <TouchableOpacity
                style={styles.dropdownHeader}
                onPress={() => {
                    setRoundDropdownOpen(!roundDropdownOpen);
                    // If opening the dropdown, scroll to it immediately
                    if (!roundDropdownOpen) {
                        requestAnimationFrame(() => {
                            roundsDropdownRef.current?.measureLayout(
                                // @ts-ignore - Known React Native issue with measureLayout types
                                scrollViewRef.current?._internalFiberInstanceHandleDEV || scrollViewRef.current,
                                (_, y) => {
                                    scrollViewRef.current?.scrollTo({ y: y - 20, animated: true });
                                },
                                () => console.error("Failed to measure layout")
                            );
                        });
                    }
                }}
            >
                <Text style={styles.dropdownHeaderText}>Round Management</Text>
            </TouchableOpacity>
            {roundDropdownOpen && (
                <View 
                    ref={roundsDropdownRef}
                    style={styles.dropdownContent}>
                    {roundsLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="small" color="#001f3f" /> {/* Changed size to small */}
                            <Text style={styles.loadingText}>Loading rounds...</Text>
                        </View>
                    ) : rounds.length > 0 ? (
                        <View style={styles.roundsList}>
                            {rounds.map((round, idx) => (
                                <View 
                                    key={round.id} 
                                    ref={el => roundItemRefs.current[idx] = el}
                                    style={styles.roundItem}>
                                    <View style={styles.roundItemRow}>
                                         <View style={styles.dragHandle}>
                                             {/* <Text style={styles.dragIcon}>☰</Text> */}
                                             <TouchableOpacity
                                                 style={styles.moveButton}
                                                 onPress={() => handleMoveRound(round.id, 'up')}
                                                 disabled={idx === 0 || updateRoundMutation.isPending} // Disable up for first item or while updating
                                             >
                                                 <Text style={[styles.moveButtonText, (idx === 0 || updateRoundMutation.isPending) && styles.moveButtonTextDisabled]}>↑</Text>
                                             </TouchableOpacity>
                                             <TouchableOpacity
                                                 style={styles.moveButton}
                                                 onPress={() => handleMoveRound(round.id, 'down')}
                                                 disabled={idx === rounds.length - 1 || updateRoundMutation.isPending} // Disable down for last item or while updating
                                             >
                                                 <Text style={[styles.moveButtonText, (idx === rounds.length - 1 || updateRoundMutation.isPending) && styles.moveButtonTextDisabled]}>↓</Text>
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
                                                                round.poolsoption === "promotion" && styles.configOptionSelected,
                                                            ]}
                                                            onPress={() => {
                                                                const updatedRound: Round = { ...round, poolsoption: "promotion" }; // Explicit type
                                                                handleUpdateRound(updatedRound);
                                                            }}
                                                        >
                                                            <Text style={styles.configOptionText}>Promotion %</Text>
                                                        </TouchableOpacity>
                                                        <TouchableOpacity
                                                            style={[
                                                                styles.configOptionButton,
                                                                round.poolsoption === "target" && styles.configOptionSelected,
                                                            ]}
                                                            onPress={() => {
                                                                const updatedRound: Round = { ...round, poolsoption: "target" }; // Explicit type
                                                                handleUpdateRound(updatedRound);
                                                            }}
                                                        >
                                                            <Text style={styles.configOptionText}>Target Bracket</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                    {round.poolsoption === "promotion" ? (
                                                        <TextInput
                                                            style={styles.configInput}
                                                            keyboardType="numeric"
                                                            value={promotionInputText} // Use state variable
                                                            placeholder="Enter Promotion %"
                                                            onChangeText={setPromotionInputText} // Update state variable
                                                            onEndEditing={() => {
                                                                // Parse the final value from state and update
                                                                const percent = parseInt(promotionInputText) || 0;
                                                                const updatedRound = {
                                                                    ...round,
                                                                    promotionpercent: percent
                                                                };
                                                                handleUpdateRound(updatedRound);
                                                            }}
                                                        />
                                                    ) : (
                                                        <View style={styles.targetSelector}>
                                                            {[8, 16, 32, 64, 128, 256].map((size) => (
                                                                <TouchableOpacity
                                                                    key={size}
                                                                    style={[
                                                                        styles.targetButton,
                                                                        round.targetbracket === size && styles.targetButtonSelected,
                                                                    ]}
                                                                    onPress={() => {
                                                                        const updatedRound = {
                                                                            ...round,
                                                                            poolsoption: round.poolsoption, // Explicitly include poolsoption
                                                                            targetbracket: size
                                                                        };
                                                                        handleUpdateRound(updatedRound);
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
                                                                round.poolcount === config.pools && round.poolsize === expectedPoolSize;
                                                            return (
                                                                <TouchableOpacity
                                                                    key={index}
                                                                    style={[
                                                                        styles.poolConfigButton,
                                                                        isSelected && styles.poolConfigButtonSelected,
                                                                    ]}
                                                                    onPress={() => {
                                                                        const updatedRound = {
                                                                            ...round,
                                                                            poolcount: config.pools,
                                                                            poolsize: expectedPoolSize,
                                                                        };
                                                                        handleUpdateRound(updatedRound);
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
                                                                    round.deformat === format && styles.deFormatButtonSelected,
                                                                ]}
                                                                onPress={() => {
                                                                    // Assert format type for deformat
                                                                    const updatedRound: Round = { ...round, deformat: format as 'single' | 'double' | 'compass' };
                                                                    handleUpdateRound(updatedRound);
                                                                }}
                                                            >
                                                                <Text style={[
                                                                    styles.deFormatButtonText,
                                                                    round.deformat === format && styles.deFormatButtonTextSelected
                                                                ]}>
                                                                    {format.charAt(0).toUpperCase() + format.slice(1)}
                                                                </Text>
                                                            </TouchableOpacity>
                                                        ))}
                                                    </View>

                                                    <Text style={styles.deFormatInfoHeader}>Format Information:</Text>

                                                    <View style={styles.deFormatInfo}>
                                                        {round.deformat === 'single' && (
                                                            <Text style={styles.deFormatDescription}>
                                                                Single elimination: Fencers are eliminated after one loss. The bracket size will be automatically determined based on the number of registered fencers.
                                                            </Text>
                                                        )}
                                                        {round.deformat === 'double' && (
                                                            <Text style={styles.deFormatDescription}>
                                                                Double elimination: Fencers continue in a losers bracket after first loss. All fencers get at least two bouts before elimination. The bracket size will be automatically determined.
                                                            </Text>
                                                        )}
                                                        {round.deformat === 'compass' && (
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
                        onPress={() => {
                            setShowRoundTypeOptions(!showRoundTypeOptions);
                            // If opening the round type options, scroll to them immediately
                            if (!showRoundTypeOptions) {
                                requestAnimationFrame(() => {
                                    roundTypeMenuRef.current?.measureLayout(
                                        // @ts-ignore - Known React Native issue with measureLayout types
                                        scrollViewRef.current?._internalFiberInstanceHandleDEV || scrollViewRef.current,
                                        (_, y) => {
                                            scrollViewRef.current?.scrollTo({ y: y - 20, animated: true });
                                        },
                                        () => console.error("Failed to measure layout")
                                    );
                                });
                            }
                        }}
                    >
                        <Text style={styles.addRoundButtonText}>Add Round</Text>
                    </TouchableOpacity>
                    {showRoundTypeOptions && (
                        <View 
                            ref={roundTypeMenuRef}
                            style={styles.roundTypeMenu}>
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

                    {(addRoundMutation.isPending || updateRoundMutation.isPending || deleteRoundMutation.isPending) && (
                        <View style={styles.pendingActionContainer}>
                            <ActivityIndicator size="small" color="#001f3f" />
                            <Text style={styles.pendingActionText}>
                                {addRoundMutation.isPending ? "Adding round..." :
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
         fontSize: 20, // Increased size for better touch target
         color: navyBlue, // Use theme color
         paddingHorizontal: 5, // Add some horizontal padding
     },
     moveButtonTextDisabled: {
        color: greyAccent, // Grey out when disabled
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
    // Styles for custom picker are now imported from the component
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

});

import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
} from "react-native";
import { RouteProp, useNavigation } from "@react-navigation/native";
import { Event, Fencer, Round } from "../navigation/types";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import {
    dbAddFencerToEventById,
    dbCreateFencerByName,
    dbDeleteFencerFromEventById,
    dbDeleteRound,
    dbGetFencersInEventById,
    dbSearchFencers,
    dbUpdateRound,
    dbGetRoundsForEvent,
    dbAddRound,
} from "../../db/TournamentDatabaseUtils";
import { Picker } from "@react-native-picker/picker";

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
    { params: { event: Event; onSave: (updatedEvent: Event) => void } },
    "params"
>;

type Props = {
    route: EventSettingsRouteProp;
};

export const EventSettings = ({ route }: Props) => {
    const { event: initialEvent, onSave } = route.params || {};

    if (!initialEvent) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Error: No event data provided.</Text>
            </View>
        );
    }

    const navigation = useNavigation();

    const [event, setEvent] = useState<Event>({ ...initialEvent });
    const [fencers, setFencers] = useState<Fencer[]>([]);
    const [rounds, setRounds] = useState<any[]>([]);
    const initialWeapon = initialEvent.weapon.toLowerCase();
    const [selectedWeapon, setSelectedWeapon] = useState<string>(initialWeapon);
    const [fencerFirstName, setFencerFirstName] = useState<string>("");
    const [fencerLastName, setFencerLastName] = useState<string>("");

    // States for ratings and years
    const [epeeRating, setEpeeRating] = useState<string>("U");
    const [epeeYear, setEpeeYear] = useState<number>(new Date().getFullYear());
    const [foilRating, setFoilRating] = useState<string>("U");
    const [foilYear, setFoilYear] = useState<number>(new Date().getFullYear());
    const [saberRating, setSaberRating] = useState<string>("U");
    const [saberYear, setSaberYear] = useState<number>(new Date().getFullYear());

    // Search state for fencers
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [fencerSuggestions, setFencerSuggestions] = useState<Fencer[]>([]);

    // Round management states
    const [showRoundTypeOptions, setShowRoundTypeOptions] = useState<boolean>(false);
    const [expandedConfigIndex, setExpandedConfigIndex] = useState<number | null>(null);

    // Dropdown states
    const [fencingDropdownOpen, setFencingDropdownOpen] = useState<boolean>(false);
    const [roundDropdownOpen, setRoundDropdownOpen] = useState<boolean>(false);

    // Pool configurations state (refreshed when fencers change)
    const [poolConfigurations, setPoolConfigurations] = useState<PoolConfiguration[]>([]);

    useEffect(() => {
        setPoolConfigurations(calculatePoolConfigurations(fencers.length));
    }, [fencers]);

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
    const handleAddFencer = () => {
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

        dbCreateFencerByName(newFencer, event, true).then(fetchFencers);
        setFencerFirstName("");
        setFencerLastName("");
    };

    const handleUploadCSV = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ type: "text/csv" });
            if ("uri" in result && result.uri) {
                //@ts-ignore
                const csvString = await FileSystem.readAsStringAsync(result.uri);
                const lines = csvString.split("\n");
                const newFencers: Fencer[] = [];
                lines.forEach((line) => {
                    const trimmedLine = line.trim();
                    if (!trimmedLine) return;
                    const parts = trimmedLine.split(",").map((p) => p.trim());
                    if (parts.length >= 3 && parts[0] && parts[1] && parts[2]) {
                        newFencers.push({
                            fname: parts[0],
                            lname: parts[1],
                            erating: "U",
                            eyear: 0,
                            frating: "U",
                            fyear: 0,
                            srating: "U",
                            syear: 0,
                        });
                    }
                });
                setFencers([...newFencers, ...fencers]);
            }
        } catch (error) {
            console.error("Error reading CSV file:", error);
        }
    };

    const fetchFencers = async () => {
        const fetchedFencers: Fencer[] = await dbGetFencersInEventById(event);
        setFencers(fetchedFencers);
    };

    useEffect(() => {
        const searchFencers = async () => {
            if (searchQuery.trim()) {
                const results = await dbSearchFencers(searchQuery);
                setFencerSuggestions(results);
            } else {
                setFencerSuggestions([]);
            }
        };
        searchFencers();
    }, [searchQuery]);

    useEffect(() => {
        fetchFencers();
    }, []);

    function handleRemoveFencer(fencer: Fencer, event: Event) {
        dbDeleteFencerFromEventById(fencer, event);
        fetchFencers();
    }

    function formatRatingString(fencer: Fencer): string {
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
    }

    const renderFencers = () => {
        return fencers.map((fencer) => (
            <View key={fencer.id} style={styles.fencerRow}>
                <Text style={styles.fencerItem}>
                    {fencer.lname}, {fencer.fname} ({formatRatingString(fencer)})
                </Text>
                <TouchableOpacity
                    onPress={() => handleRemoveFencer(fencer, event)}
                    style={styles.removeFencerButton}
                >
                    <Text style={styles.removeFencerText}>x</Text>
                </TouchableOpacity>
            </View>
        ));
    };

    const renderFencerSuggestions = () => {
        return fencerSuggestions.map((fencer) => (
            <TouchableOpacity
                key={fencer.id}
                onPress={() => handleAddFencerFromSearch(fencer)}
                style={styles.fencerRow}
            >
                <Text style={styles.fencerItem}>
                    {fencer.lname}, {fencer.fname} ({formatRatingString(fencer)})
                </Text>
            </TouchableOpacity>
        ));
    };

    const handleAddFencerFromSearch = (fencer: Fencer) => {
        dbAddFencerToEventById(fencer, event);
        fetchFencers();
        setSearchQuery("");
        setFencerSuggestions([]);
    };

    const toggleRoundConfig = (index: number) => {
        setExpandedConfigIndex((prev) => (prev === index ? null : index));
    };



    // Handler for selecting a pool configuration for a specific round
    const handleSelectPoolConfiguration = (config: PoolConfiguration, roundIndex: number) => {
        const updatedRounds = [...rounds];
        updatedRounds[roundIndex] = { ...updatedRounds[roundIndex], poolConfiguration: config };
        setRounds(updatedRounds);
        console.log("Selected pool configuration for round", roundIndex, ":", config);
    };

    const fetchRounds = async () => {
        try {
            const roundsData = await dbGetRoundsForEvent(event.id);
            setRounds(roundsData);
        } catch (error) {
            console.error("Failed to fetch rounds", error);
        }
    };

    useEffect(() => {
        fetchRounds();
    }, [event]);

// Inside your EventSettings component, after your state declarations

// Handler to add a new round. Creates a new round object with default values.
    const handleAddRound = async (roundType: 'pool' | 'de') => {
        const newRound = {
            eventid: event.id,
            rorder: rounds.length + 1, // Append at the end
            type: roundType,
            promotionpercent: roundType === 'pool' ? 100 : 0,
            targetbracket: roundType === 'pool' ? 0 : 0,
            usetargetbracket: 0,
            deformat: roundType === 'de' ? 'single' : '',
            detablesize: roundType === 'de' ? 0 : 0,
            iscomplete: 0,
            poolcount: roundType === 'pool' ? 0 : null,
            poolsize: roundType === 'pool' ? 0 : null,
            poolsoption: roundType === 'pool' ? 'promotion' : undefined,
        };
        try {
            await dbAddRound(newRound);
            const updatedRounds = await dbGetRoundsForEvent(event.id);
            setRounds(updatedRounds);
        } catch (error) {
            console.error("Failed to add round", error);
        }
    };


// Handler to update a round immediately after a change
    const handleUpdateRound = async (updatedRound: Round) => {
        try {
            await dbUpdateRound(updatedRound);
            const updatedRounds = await dbGetRoundsForEvent(event.id);
            setRounds(updatedRounds);
        } catch (error) {
            console.error("Failed to update round", error);
        }
    };

// Handler to delete a round
    const handleDeleteRound = async (roundId: number) => {
        try {
            await dbDeleteRound(roundId);
            const updatedRounds = await dbGetRoundsForEvent(event.id);
            setRounds(updatedRounds);
        } catch (error) {
            console.error("Failed to delete round", error);
        }
    };

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
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Search Fencers</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Search by Name"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {fencerSuggestions.length > 0 && renderFencerSuggestions()}
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
                        <View style={styles.input}>
                            <Text style={styles.inputLabel}>Weapon</Text>
                            <Picker
                                selectedValue={selectedWeapon}
                                onValueChange={(itemValue) => setSelectedWeapon(itemValue)}
                            >
                                <Picker.Item label="Epee" value="epee" />
                                <Picker.Item label="Foil" value="foil" />
                                <Picker.Item label="Saber" value="saber" />
                            </Picker>
                        </View>
                        <View style={styles.row}>
                            <View style={[styles.input, styles.pickerLeft]}>
                                <Text style={styles.inputLabel}>
                                    {selectedWeapon.charAt(0).toUpperCase() + selectedWeapon.slice(1)} Rating
                                </Text>
                                <Picker
                                    selectedValue={currentRating}
                                    onValueChange={(itemValue) => {
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
                                >
                                    <Picker.Item label="A" value="A" />
                                    <Picker.Item label="B" value="B" />
                                    <Picker.Item label="C" value="C" />
                                    <Picker.Item label="D" value="D" />
                                    <Picker.Item label="E" value="E" />
                                    <Picker.Item label="U" value="U" />
                                </Picker>
                            </View>
                            {currentRating !== "U" && (
                                <View style={[styles.input, styles.pickerRight]}>
                                    <Text style={styles.inputLabel}>Year</Text>
                                    <Picker
                                        selectedValue={currentYear}
                                        onValueChange={(itemValue) => {
                                            if (selectedWeapon === "epee") {
                                                setEpeeYear(itemValue);
                                            } else if (selectedWeapon === "foil") {
                                                setFoilYear(itemValue);
                                            } else if (selectedWeapon === "saber") {
                                                setSaberYear(itemValue);
                                            }
                                        }}
                                    >
                                        {Array.from({ length: 10 }, (_, i) => {
                                            const year = new Date().getFullYear() - i;
                                            return (
                                                <Picker.Item key={year} label={year.toString()} value={year} />
                                            );
                                        })}
                                    </Picker>
                                </View>
                            )}
                        </View>
                        <TouchableOpacity onPress={handleAddFencer} style={styles.addFencerButton}>
                            <Text style={styles.addFencerButtonText}>Add Fencer</Text>
                        </TouchableOpacity>
                        <View style={{ marginTop: 10 }}>
                            <TouchableOpacity onPress={handleUploadCSV}>
                                <Text style={styles.uploadCSVText}>Upload CSV</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={styles.fencerListContainer}>
                        <Text style={styles.fencerListHeader}>Current Fencers: {fencers.length}</Text>
                        {fencers.length === 0 ? (
                            <Text style={styles.note}>No fencers added yet.</Text>
                        ) : (
                            renderFencers()
                        )}
                    </View>
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
                    {rounds.length > 0 && (
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
                                                                round.poolsption === "promotion" && styles.configOptionSelected,
                                                            ]}
                                                            onPress={() => {
                                                                const updatedRound = { ...round, poolsoption: "promotion" };
                                                                setRounds(prev => {
                                                                    const newRounds = [...prev];
                                                                    newRounds[idx] = updatedRound;
                                                                    return newRounds;
                                                                });
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
                                                                const updatedRound = { ...round, poolsoption: "target" };
                                                                setRounds(prev => {
                                                                    const newRounds = [...prev];
                                                                    newRounds[idx] = updatedRound;
                                                                    return newRounds;
                                                                });
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
                                                            value={round.promotionpercent?.toString() || ""}
                                                            placeholder="Enter Promotion %"
                                                            onChangeText={(text) => {
                                                                const updatedRound = { ...round, promotionpercent: parseInt(text) || 0 };
                                                                setRounds(prev => {
                                                                    const newRounds = [...prev];
                                                                    newRounds[idx] = updatedRound;
                                                                    return newRounds;
                                                                });
                                                            }}
                                                            onEndEditing={() => handleUpdateRound(round)}
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
                                                                        const updatedRound = { ...round, targetbracket: size };
                                                                        setRounds(prev => {
                                                                            const newRounds = [...prev];
                                                                            newRounds[idx] = updatedRound;
                                                                            return newRounds;
                                                                        });
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
                                                                        setRounds((prev) => {
                                                                            const newRounds = [...prev];
                                                                            newRounds[idx] = updatedRound;
                                                                            return newRounds;
                                                                        });
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
                                                                    const updatedRound = { ...round, deformat: format };
                                                                    setRounds(prev => {
                                                                        const newRounds = [...prev];
                                                                        newRounds[idx] = updatedRound;
                                                                        return newRounds;
                                                                    });
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
});

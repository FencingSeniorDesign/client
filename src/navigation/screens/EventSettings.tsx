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
import { Event, Fencer, RoundData } from "../navigation/types";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import {
    dbAddFencerToEventById,
    dbCreateFencerByName,
    dbDeleteFencerFromEventById,
    dbGetFencersInEventById,
    dbSearchFencers,
    dbUpdateEvent,
} from "../../db/TournamentDatabaseUtils";
import { Picker } from "@react-native-picker/picker";

type EventSettingsRouteProp = RouteProp<
    { params: { event: Event; onSave: (updatedEvent: Event) => void } },
    "params"
>;

type Props = {
    route: EventSettingsRouteProp;
};

type ExtendedEvent = Event & {
    poolCount?: number;
    fencersPerPool?: number;
    rounds?: (RoundData & { promotionpercent?: number; roundType?: "Pools" | "DE" })[];
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

    const [event, setEvent] = useState<ExtendedEvent>({ ...initialEvent });
    const [fencers, setFencers] = useState<Fencer[]>([]);
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

    // Dropdown states
    const [fencingDropdownOpen, setFencingDropdownOpen] = useState<boolean>(false);
    const [roundDropdownOpen, setRoundDropdownOpen] = useState<boolean>(false);

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

    function handleRemoveFencer(fencer: Fencer, event: ExtendedEvent) {
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

    // Round management functions.
    const handlePoolCountChange = (text: string) => {
        setEvent((prev) => ({ ...prev, poolCount: parseInt(text) || 0 }));
    };
    const handleFencersPerPoolChange = (text: string) => {
        setEvent((prev) => ({ ...prev, fencersPerPool: parseInt(text) || 0 }));
    };
    const handleRoundPromotionChange = (index: number, text: string) => {
        if (event.rounds) {
            const updatedRounds = event.rounds.map((round, i) =>
                i === index ? { ...round, promotionpercent: parseInt(text) || 0 } : round
            );
            setEvent((prev) => ({ ...prev, rounds: updatedRounds }));
        }
    };

    const handleSaveSettings = async () => {
        const updatedEvent: ExtendedEvent = { ...event };
        try {
            await dbUpdateEvent(updatedEvent.id, updatedEvent);
            onSave(updatedEvent);
            navigation.goBack();
        } catch (error) {
            console.error("Error updating event settings:", error);
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
                <Text style={styles.dropdownHeaderText}>Fencing Management</Text>
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
                        <Text style={styles.fencerListHeader}>Current Fencers:</Text>
                        {fencers.length === 0 ? (
                            <Text style={styles.note}>No fencers added yet.</Text>
                        ) : (
                            renderFencers()
                        )}
                    </View>
                </View>
            )}

            {/* Round Management Dropdown */}
            <TouchableOpacity
                style={styles.dropdownHeader}
                onPress={() => setRoundDropdownOpen(!roundDropdownOpen)}
            >
                <Text style={styles.dropdownHeaderText}>Round Management</Text>
            </TouchableOpacity>
            {roundDropdownOpen && (
                <View style={styles.dropdownContent}>
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Pool Settings</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Pool Count"
                            keyboardType="number-pad"
                            value={event.poolCount ? event.poolCount.toString() : ""}
                            onChangeText={handlePoolCountChange}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Fencers Per Pool"
                            keyboardType="number-pad"
                            value={event.fencersPerPool ? event.fencersPerPool.toString() : ""}
                            onChangeText={handleFencersPerPoolChange}
                        />
                    </View>
                    {event.rounds && event.rounds.length > 0 ? (
                        event.rounds.map((round, index) => (
                            <View key={index} style={styles.roundRow}>
                                <Text style={styles.roundLabel}>
                                    Round {index + 1} ({round.roundType || "Pools"})
                                </Text>
                                <TextInput
                                    style={styles.roundInput}
                                    placeholder="Promotion %"
                                    keyboardType="number-pad"
                                    value={
                                        round.promotionpercent !== undefined
                                            ? round.promotionpercent.toString()
                                            : ""
                                    }
                                    onChangeText={(text) => handleRoundPromotionChange(index, text)}
                                />
                            </View>
                        ))
                    ) : (
                        <Text style={styles.note}>No rounds defined for this event.</Text>
                    )}
                </View>
            )}

            <View style={styles.section}>
                <TouchableOpacity onPress={handleSaveSettings}>
                    <Text style={styles.saveButtonText}>Save Event Settings</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

export default EventSettings;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f7f7f7",
    },
    content: {
        padding: 20,
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
    /* Round Management styles */
    roundRow: {
        marginBottom: 15,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderColor: "#ccc",
    },
    roundLabel: {
        fontSize: 16,
        fontWeight: "500",
        marginBottom: 5,
        color: "#001f3f",
    },
    roundInput: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 6,
        padding: 8,
        fontSize: 16,
        backgroundColor: "#fff",
    },
    /* Additional button styles */
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
});

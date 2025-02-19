import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    Button,
    TextInput,
    TouchableOpacity,
    ScrollView,
} from "react-native";
import { RouteProp, useNavigation } from "@react-navigation/native";
import { Event, Fencer, RoundData } from "../navigation/types";

import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import {
    dbAddFencerToEventById,
    dbCreateFencerByName,
    dbGetFencersInEventById,
    dbSearchFencers,
} from "../../db/TournamentDatabaseUtils";
import { Picker } from "@react-native-picker/picker";

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

    // Make a copy of the event passed in
    const [event, setEvent] = useState<Event>({ ...initialEvent });
    const [fencers, setFencers] = useState<Fencer[]>([]);

    // Normalize the weapon value to lowercase so it matches our Picker options.
    const initialWeapon = initialEvent.weapon.toLowerCase();
    const [selectedWeapon, setSelectedWeapon] = useState<string>(initialWeapon);

    // Fencer input states
    const [fencerFirstName, setFencerFirstName] = useState<string>("");
    const [fencerLastName, setFencerLastName] = useState<string>("");

    // Separate states for rating and year for each weapon
    const [epeeRating, setEpeeRating] = useState<string>("U");
    const [epeeYear, setEpeeYear] = useState<number>(new Date().getFullYear());
    const [foilRating, setFoilRating] = useState<string>("U");
    const [foilYear, setFoilYear] = useState<number>(new Date().getFullYear());
    const [saberRating, setSaberRating] = useState<string>("U");
    const [saberYear, setSaberYear] = useState<number>(new Date().getFullYear());

    // Search states
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [fencerSuggestions, setFencerSuggestions] = useState<Fencer[]>([]);

    // Get the current rating and year based on the selected weapon
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

    // Function to add a new fencer.
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

        console.log(JSON.stringify(newFencer, null, "\t"));

        dbCreateFencerByName(newFencer, event, true).then(
            fetchFencers
        )

        setFencerFirstName("");
        setFencerLastName("");
    };

    // Function to upload and parse CSV
    const handleUploadCSV = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: "text/csv",
            });
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
                            erating: 'U', // TODO - make these actually read to a file and default to U/0 if not included
                            eyear: 0,
                            frating: 'U',
                            fyear: 0,
                            srating: 'U',
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
        console.log("Updated fencer list:");
        console.log(JSON.stringify(fetchedFencers, null, "\t"));
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

    function handleRemoveFencer(fencer: Fencer) {
        console.log("Need to implement fencer deletes :(");
    }

    function formatRatingString(fencer: Fencer): string {
        let rating = "";
        let year = 0

        // Determine the rating to display based on the event's weapon.
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

        let yearstr = ""
        if (rating != 'U') {
            yearstr = year.toString().slice(2)
        }

        return `${rating}${yearstr}`
    }

    const renderFencers = () => {
        return fencers.map((fencer) => {


            return (
                <View key={fencer.id} style={styles.fencerRow}>
                    <Text style={styles.fencerItem}>
                        {fencer.lname}, {fencer.fname} ({formatRatingString(fencer)})
                    </Text>
                    <TouchableOpacity
                        onPress={() => handleRemoveFencer(fencer)}
                        style={styles.removeFencerButton}
                    >
                        <Text style={styles.removeFencerText}>x</Text>
                    </TouchableOpacity>
                </View>
            );
        });
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

    // Function to add fencer from search suggestions.
    const handleAddFencerFromSearch = (fencer: Fencer) => {
        dbAddFencerToEventById(fencer, event);
        fetchFencers()
        setSearchQuery("");
        setFencerSuggestions([]);
    };

    // Save settings and navigate back.
    const handleSaveSettings = () => {
        const updatedEvent: Event = { ...event };
        onSave(updatedEvent);
        navigation.goBack();
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.title}>Edit Event Settings</Text>

            {/* Search Fencers Section */}
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

            {/* Fencers Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Fencers ({fencers.length})</Text>
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
                {/* Weapon Selector */}
                <View style={styles.input}>
                    <Text>Weapon</Text>
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
                        <Text>
                            {selectedWeapon.charAt(0).toUpperCase() +
                                selectedWeapon.slice(1)}{" "}
                            Rating
                        </Text>
                        <Picker
                            selectedValue={currentRating}
                            onValueChange={(itemValue) => {
                                if (selectedWeapon === "epee") {
                                    setEpeeRating(itemValue);
                                    setEpeeYear((prevYear) =>
                                        itemValue === "U" ? 0 : (prevYear === 0 ? new Date().getFullYear() : prevYear)
                                    );
                                } else if (selectedWeapon === "foil") {
                                    setFoilRating(itemValue);
                                    setFoilYear((prevYear) =>
                                        itemValue === "U" ? 0 : (prevYear === 0 ? new Date().getFullYear() : prevYear)
                                    );
                                } else if (selectedWeapon === "saber") {
                                    setSaberRating(itemValue);
                                    setSaberYear((prevYear) =>
                                        itemValue === "U" ? 0 : (prevYear === 0 ? new Date().getFullYear() : prevYear)
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
                    {/* Only show the Year picker if the rating is not "U" */}
                    {currentRating !== "U" && (
                        <View style={[styles.input, styles.pickerRight]}>
                            <Text>Year</Text>
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
                                        <Picker.Item
                                            key={year}
                                            label={year.toString()}
                                            value={year}
                                        />
                                    );
                                })}
                            </Picker>
                        </View>
                    )}
                </View>

                <Button title="Add Fencer" onPress={handleAddFencer} />
                <View style={{ marginTop: 10 }}>
                    <Button title="Upload CSV" onPress={handleUploadCSV} />
                </View>
            </View>

            <View style={styles.section}>
                {fencers.length === 0 ? (
                    <Text style={styles.note}>No fencers added yet.</Text>
                ) : (
                    renderFencers()
                )}
            </View>

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
    },
    roundsSection: {
        backgroundColor: "#fff",
        padding: 10,
        borderRadius: 6,
        marginBottom: 15,
    },
    roundsTitle: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 10,
    },
    roundRow: {
        marginBottom: 8,
    },
    roundLabel: {
        fontSize: 16,
        fontWeight: "500",
        marginBottom: 4,
    },
    promotionInputRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    promLabel: {
        marginRight: 8,
        fontSize: 14,
    },
    promInput: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 4,
        padding: 6,
        width: 80,
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
    fencerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 5,
    },
    fencerItem: {
        fontSize: 16,
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
});

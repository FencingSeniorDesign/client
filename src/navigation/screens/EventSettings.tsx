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

// Import Expo modules for document picking and file system reading
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { dbAddFencerToEventById, dbCreateFencerByName, dbSearchFencers } from "../../db/TournamentDatabaseUtils";
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

    const [event, setEvent] = useState<Event>({ ...initialEvent });
    const [fencers, setFencers] = useState<Fencer[]>(
        initialEvent.fencers ? [...initialEvent.fencers] : []
    );
    const [rounds, setRounds] = useState<RoundData[]>(
        initialEvent.rounds ? [...initialEvent.rounds] : []
    );
    const [poolCount, setPoolCount] = useState<string>(
        initialEvent.poolCount !== undefined ? String(initialEvent.poolCount) : "4"
    );
    const [fencersPerPool, setFencersPerPool] = useState<string>(
        initialEvent.fencersPerPool !== undefined
            ? String(initialEvent.fencersPerPool)
            : "5"
    );

    const [fencerFirstName, setFencerFirstName] = useState<string>("");
    const [fencerLastName, setFencerLastName] = useState<string>("");
    const [fencerRating, setFencerRating] = useState<string>("U");
    const [fencerYear, setFencerYear] = useState<number>(new Date().getFullYear());

    // New state for search query and results
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [fencerSuggestions, setFencerSuggestions] = useState<Fencer[]>([]);

    // Function to add a new fencer.
    const handleAddFencer = () => {
        let newFencer: Fencer = {
            firstName: fencerFirstName.trim(),
            lastName: fencerLastName.trim(),
        };

        switch (event.weapon) {
            case "epee": {
                newFencer.epeeRating = fencerRating;
                newFencer.epeeYear = fencerYear;
                break;
            }
            case "foil": {
                newFencer.foilRating = fencerRating;
                newFencer.foilYear = fencerYear;
                break;
            }
            case "saber": {
                newFencer.saberRating = fencerRating;
                newFencer.saberYear = fencerYear;
                break;
            }
        }

        dbCreateFencerByName(newFencer);
        dbAddFencerToEventById(newFencer, event);

        setFencers([newFencer, ...fencers]);

        setFencerFirstName("");
        setFencerLastName("");
        setFencerRating("U");
        setFencerYear(2024);
    };

    // Function to upload and parse CSV
    const handleUploadCSV = async () => {
        try {
            // Launch the document picker for CSV files
            const result = await DocumentPicker.getDocumentAsync({
                type: "text/csv",
            });

            if ("uri" in result && result.uri) {
                const csvString = await FileSystem.readAsStringAsync(result.uri); // TODO - fix TS2345: Argument of type {} is not assignable to parameter of type string
                const lines = csvString.split("\n");

                const newFencers: Fencer[] = [];
                lines.forEach((line, index) => {
                    const trimmedLine = line.trim();
                    if (!trimmedLine) return;

                    const parts = trimmedLine.split(",").map((p) => p.trim());
                    if (parts.length >= 3 && parts[0] && parts[1] && parts[2]) {
                        newFencers.push({
                            // id: Date.now() + index,
                            firstName: parts[0],
                            lastName: parts[1],
                        });
                    }
                });
                setFencers([...newFencers, ...fencers]);
            }
        } catch (error) {
            console.error("Error reading CSV file:", error);
        }
    };

    // Function to fetch fencers based on search query
    useEffect(() => {
        const searchFencers = async () => {
            if (searchQuery.trim()) {
                const fencers = await dbSearchFencers(searchQuery);
                setFencerSuggestions(fencers);
            } else {
                setFencerSuggestions([]);
            }
        };

        searchFencers();
    }, [searchQuery]);

    function handleRemoveFencer(fencer: Fencer) {
        console.log("Need to implement fencer deletes :(")
    }

    const renderFencers = () => {
        return fencers.map((fencer, index) => (
            <View key={fencer.id} style={styles.fencerRow}>
                <Text style={styles.fencerItem}>
                    {fencer.lastName}, {fencer.firstName}
                </Text>
                <TouchableOpacity
                    onPress={() => handleRemoveFencer(fencer)}
                    style={styles.removeFencerButton}
                >
                    <Text style={styles.removeFencerText}>x</Text>
                </TouchableOpacity>
            </View>
        ));
    };

    const renderFencerSuggestions = () => {
        return fencerSuggestions.map((fencer, index) => (
            <TouchableOpacity
                key={fencer.id}
                onPress={() => handleAddFencerFromSearch(fencer)}
                style={styles.fencerRow}
            >
                <Text style={styles.fencerItem}>
                    {fencer.lastName}, {fencer.firstName}
                </Text>
            </TouchableOpacity>
        ));
    };

    // Function to handle adding fencer from search suggestions
    const handleAddFencerFromSearch = (fencer: Fencer) => {
        dbAddFencerToEventById(fencer, event);
        setFencers([...fencers, fencer]);
        setSearchQuery("");
        setFencerSuggestions([]);
    };

    // Save the event settings and navigate back.
    const handleSaveSettings = () => {
        const updatedEvent: Event = {
            ...event,
            fencers: fencers,
            rounds: rounds,
            poolCount: parseInt(poolCount, 10) || 4,
            fencersPerPool: parseInt(fencersPerPool, 10) || 5,
        };
        onSave(updatedEvent);
        navigation.goBack();
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.title}>Edit Event Settings</Text>

            {/* Search Fencers Section  TODO - this is broken, and is only returning blank strings, although it is returning results */}
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
                <View style={styles.input}>
                    <Text>{event.weapon} Rating</Text>
                    <Picker
                        selectedValue={fencerRating}
                        onValueChange={(itemValue) => setFencerRating(itemValue)}
                    >
                        <Picker.Item label="A" value="A" />
                        <Picker.Item label="B" value="B" />
                        <Picker.Item label="C" value="C" />
                        <Picker.Item label="D" value="D" />
                        <Picker.Item label="E" value="E" />
                        <Picker.Item label="U" value="U" />
                    </Picker>
                </View>

                <View style={styles.input}>
                    <Text>Year</Text>
                    <Picker
                        selectedValue={fencerYear}
                        onValueChange={(itemValue) => setFencerYear(itemValue)}
                    >
                        {Array.from({ length: 10 }, (_, i) => {
                            const year = new Date().getFullYear() - i;
                            return (
                                <Picker.Item key={year} label={year.toString()} value={year.toString()} />
                            );
                        })}
                    </Picker>
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

            {/* Save Button */}
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
});

// EventSettings.tsx

import React, { useState } from "react";
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

type EventSettingsRouteProp = RouteProp<
    { params: { event: Event; onSave: (updatedEvent: Event) => void } },
    "params"
>;

type Props = {
    route: EventSettingsRouteProp;
};

export const EventSettings = ({ route }: Props) => {
    // Extract the event and onSave callback from route parameters.
    // Adding a fallback in case event is missing.
    const { event: initialEvent, onSave } = route.params || {};

    if (!initialEvent) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Error: No event data provided.</Text>
            </View>
        );
    }

    const navigation = useNavigation();

    // Use default values if properties are missing.
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
        initialEvent.fencersPerPool !== undefined ? String(initialEvent.fencersPerPool) : "5"
    );

    const [fencerFirstName, setFencerFirstName] = useState<string>("");
    const [fencerLastName, setFencerLastName] = useState<string>("");
    const [fencerRating, setFencerRating] = useState<string>("");

    // Function to add a new fencer.
    const handleAddFencer = () => {
        const firstNames = [
            "John", "Paul", "George", "Ringo", "Mick",
            "Keith", "David", "Freddie", "Elvis", "Prince",
            "Otis", "Ronnie", "Stevie", "Bruce", "Kurt",
        ];
        const lastNames = [
            "Smith", "Johnson", "Williams", "Brown", "Jones",
            "Miller", "Davis", "Garcia", "Rodriguez", "Wilson",
            "Martinez", "Anderson", "Taylor", "Thomas", "Hernandez",
        ];
        const ratings = ["A", "B", "C", "D", "E", "U"];

        if (!fencerFirstName.trim() && !fencerLastName.trim() && !fencerRating.trim()) {
            // Generate random fencer details if none are provided.
            const randomFirstName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const randomLastName = lastNames[Math.floor(Math.random() * lastNames.length)];
            const randomRating = ratings[Math.floor(Math.random() * ratings.length)];

            const newFencer: Fencer = {
                id: Date.now(),
                firstName: randomFirstName,
                lastName: randomLastName,
                rating: randomRating,
            };
            setFencers([newFencer, ...fencers]);
        } else if (fencerFirstName.trim() && fencerLastName.trim() && fencerRating.trim()) {
            const newFencer: Fencer = {
                id: Date.now(),
                firstName: fencerFirstName.trim(),
                lastName: fencerLastName.trim(),
                rating: fencerRating.trim(),
            };
            setFencers([newFencer, ...fencers]);
        }
        setFencerFirstName("");
        setFencerLastName("");
        setFencerRating("");
    };

    // Remove a fencer by id.
    const handleRemoveFencer = (id: number) => {
        setFencers((prev) => prev.filter((f) => f.id !== id));
    };

    // Update promotion value for a Pools round.
    const handlePromotionChange = (value: string, index: number) => {
        const numVal = parseInt(value, 10) || 0;
        setRounds((prev) => {
            const updated = [...prev];
            if (updated[index].roundType === "Pools") {
                updated[index].promotion = numVal;
            }
            return updated;
        });
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

            {/* Rounds Section */}
            {rounds.length > 0 && (
                <View style={styles.roundsSection}>
                    <Text style={styles.roundsTitle}>Rounds</Text>
                    {rounds.map((rnd, idx) => (
                        <View key={idx} style={styles.roundRow}>
                            <Text style={styles.roundLabel}>
                                Round {idx + 1}: {rnd.roundType}
                            </Text>
                            {rnd.roundType === "Pools" && (
                                <View style={styles.promotionInputRow}>
                                    <Text style={styles.promLabel}>Promotion %:</Text>
                                    <TextInput
                                        style={styles.promInput}
                                        keyboardType="numeric"
                                        value={String(rnd.promotion ?? 100)}
                                        onChangeText={(val) => handlePromotionChange(val, idx)}
                                    />
                                </View>
                            )}
                        </View>
                    ))}
                </View>
            )}

            {/* Pool Configuration */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Pool Configuration</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Number of Pools"
                    keyboardType="numeric"
                    value={poolCount}
                    onChangeText={setPoolCount}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Fencers per Pool"
                    keyboardType="numeric"
                    value={fencersPerPool}
                    onChangeText={setFencersPerPool}
                />
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
                <TextInput
                    style={styles.input}
                    placeholder="Rating"
                    value={fencerRating}
                    onChangeText={setFencerRating}
                />
                <Button title="Add Fencer" onPress={handleAddFencer} />
            </View>

            <View style={styles.section}>
                {fencers.length === 0 ? (
                    <Text style={styles.note}>No fencers added yet.</Text>
                ) : (
                    fencers.map((fencer) => (
                        <View key={fencer.id} style={styles.fencerRow}>
                            <Text style={styles.fencerItem}>
                                {fencer.lastName}, {fencer.firstName}, {fencer.rating}
                            </Text>
                            <TouchableOpacity
                                onPress={() => handleRemoveFencer(fencer.id)}
                                style={styles.removeFencerButton}
                            >
                                <Text style={styles.removeFencerText}>x</Text>
                            </TouchableOpacity>
                        </View>
                    ))
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

const navyBlue = "#000080";

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

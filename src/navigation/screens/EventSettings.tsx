// src/screens/EventSettings.tsx

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
import { Event, Fencer } from "../navigation/types";

type EventSettingsRouteProp = RouteProp<
    { params: { event: Event; onSave: (updatedEvent: Event) => void } },
    "params"
>;

type Props = {
    route: EventSettingsRouteProp;
};

export const EventSettings = ({ route }: Props) => {
    const { event: initialEvent, onSave } = route.params;
    const navigation = useNavigation();

    // Local state for event and fencers
    const [event, setEvent] = useState<Event>({ ...initialEvent });
    const [fencers, setFencers] = useState<Fencer[]>([...initialEvent.fencers]);

    // Fencer form state
    const [fencerFirstName, setFencerFirstName] = useState<string>("");
    const [fencerLastName, setFencerLastName] = useState<string>("");
    const [fencerRating, setFencerRating] = useState<string>("");

    // Promotion and pool customization state
    const [isEditingPromotion, setIsEditingPromotion] = useState<boolean>(false);
    const [promotionPercentage, setPromotionPercentage] = useState<string>("");
    const [showPoolConfig, setShowPoolConfig] = useState<boolean>(false);
    const [numberOfPools, setNumberOfPools] = useState<string>("");
    const [poolSize, setPoolSize] = useState<string>("");

    // Only on mount, set default promotion percentage (if available).
    useEffect(() => {
        const promoMatch = initialEvent.round.match(/\((\d+)%/);
        if (promoMatch) {
            setPromotionPercentage(promoMatch[1]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleAddFencer = () => {
        // Define test data arrays
        const firstNames = [
            "John", "Paul", "George", "Ringo", "Mick",
            "Keith", "David", "Freddie", "Elvis", "Prince",
            "Otis", "Ronnie", "Stevie", "Bruce", "Kurt"
        ];

        const lastNames = [
            "Smith", "Johnson", "Williams", "Brown", "Jones",
            "Miller", "Davis", "Garcia", "Rodriguez", "Wilson",
            "Martinez", "Anderson", "Taylor", "Thomas", "Hernandez"
        ];

        // Ratings: A to E with U as the other option.
        const ratings = ["A", "B", "C", "D", "E", "U"];

        // Check if all fields are empty
        if (
            !fencerFirstName.trim() &&
            !fencerLastName.trim() &&
            !fencerRating.trim()
        ) {
            // Generate random values
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
            // Otherwise, use the provided values
            const newFencer: Fencer = {
                id: Date.now(),
                firstName: fencerFirstName.trim(),
                lastName: fencerLastName.trim(),
                rating: fencerRating.trim(),
            };
            setFencers([newFencer, ...fencers]);
        }

        // Clear the form inputs
        setFencerFirstName("");
        setFencerLastName("");
        setFencerRating("");
    };


    const handleRemoveFencer = (id: number) => {
        setFencers(fencers.filter((fencer) => fencer.id !== id));
    };

    const handleSaveSettings = () => {
        // If promotionPercentage is empty, default to "100"
        const finalPromotion = promotionPercentage === "" ? "100" : promotionPercentage;
        let newRound = `Pools (${finalPromotion}% promotion)`;

        if (numberOfPools && poolSize) {
            const numPools = parseInt(numberOfPools, 10);
            const sizeOfPool = parseInt(poolSize, 10);
            if (!isNaN(numPools) && !isNaN(sizeOfPool)) {
                newRound = `Pools (${finalPromotion}% promotion) - ${numPools} Pools of ${sizeOfPool}`;
            }
        }

        // Determine pool configuration values (default to 4 and 5 if not provided)
        const poolCountValue = numberOfPools ? parseInt(numberOfPools, 10) : 4;
        const fencersPerPoolValue = poolSize ? parseInt(poolSize, 10) : 5;

        // Generate event name; for Male use "Mens", otherwise "Womens"
        const genderLabel = event.gender === "Male" ? "Mens" : "Womens";
        const generatedName = `${genderLabel} ${event.weapon} ${finalPromotion ? `Pools ${finalPromotion}%` : event.round}`;

        const updatedEvent: Event = {
            ...event,
            round: newRound,
            fencers: fencers,
            poolCount: poolCountValue,          // Save the user-specified number of pools
            fencersPerPool: fencersPerPoolValue, // Save the user-specified number of fencers per pool
            // Optionally, you can also update the event name if desired:
            // name: generatedName,
        };

        onSave(updatedEvent);
        navigation.goBack();
    };



    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Title */}
            <Text style={styles.title}>Edit Event Settings</Text>

            {/* Display current Promotion and Pool configuration values */}
            <View style={styles.currentValues}>
                <Text style={styles.displayText}>
                    Promotion Percentage:{" "}
                    {promotionPercentage === "" ? "100%" : `${promotionPercentage}%`}
                </Text>
                <Text style={styles.displayText}>
                    Pool Configuration:{" "}
                    {numberOfPools && poolSize ? `${numberOfPools} Pools of ${poolSize}` : "--"}
                </Text>
            </View>

            {/* Fencer Adding Form */}
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
                <TextInput
                    style={styles.input}
                    placeholder="Rating"
                    value={fencerRating}
                    onChangeText={setFencerRating}
                    keyboardType="numeric"
                />
                <Button title="Add Fencer" onPress={handleAddFencer} />
            </View>

            {/* Fencer List */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Fencers</Text>
                {fencers.length === 0 ? (
                    <Text style={styles.note}>No fencers added yet.</Text>
                ) : (
                    fencers.map((fencer) => (
                        <View key={fencer.id} style={styles.fencerRow}>
                            <Text style={styles.fencerItem}>
                                {`${fencer.lastName}, ${fencer.firstName}, ${fencer.rating}`}
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

            {/* Customization Buttons */}
            <View style={styles.section}>
                <View style={styles.row}>
                    <TouchableOpacity
                        style={styles.customButton}
                        onPress={() => {
                            setIsEditingPromotion(!isEditingPromotion);
                            if (!isEditingPromotion) setShowPoolConfig(false);
                        }}
                    >
                        <Text style={styles.buttonText}>Edit Promotion</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.customButton}
                        onPress={() => {
                            setShowPoolConfig(!showPoolConfig);
                            if (!showPoolConfig) setIsEditingPromotion(false);
                        }}
                    >
                        <Text style={styles.buttonText}>Configure Pools</Text>
                    </TouchableOpacity>
                </View>
                {/* Dropdown for Promotion Editing */}
                {isEditingPromotion && (
                    <View style={styles.promotionContainer}>
                        <TextInput
                            style={styles.promotionInput}
                            placeholder="Promotion Percentage"
                            value={promotionPercentage}
                            onChangeText={setPromotionPercentage}
                            keyboardType="numeric"
                        />
                        <Text style={styles.promotionSuffix}>%</Text>
                    </View>
                )}
                {/* Pool configuration inputs */}
                {showPoolConfig && (
                    <View>
                        <TextInput
                            style={styles.input}
                            placeholder="Number of Pools"
                            value={numberOfPools}
                            onChangeText={setNumberOfPools}
                            keyboardType="numeric"
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Pool Size"
                            value={poolSize}
                            onChangeText={setPoolSize}
                            keyboardType="numeric"
                        />
                    </View>
                )}
            </View>

            {/* Save Event Settings Button (no background box) */}
            <View style={styles.section}>
                <TouchableOpacity onPress={handleSaveSettings}>
                    <Text style={styles.saveButtonText}>Save Event Settings</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

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
    currentValues: {
        marginBottom: 20,
        padding: 10,
        backgroundColor: "#e9e9e9",
        borderRadius: 8,
    },
    displayText: {
        fontSize: 16,
        marginBottom: 4,
        textAlign: "center",
    },
    section: {
        marginBottom: 20,
        backgroundColor: "#fff",
        padding: 15,
        borderRadius: 8,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 2,
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
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 10,
    },
    customButton: {
        flex: 1,
        backgroundColor: "#007AFF",
        padding: 10,
        borderRadius: 6,
        alignItems: "center",
        marginHorizontal: 5,
    },
    buttonText: {
        color: "#fff",
        fontSize: 16,
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
    promotionContainer: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 6,
        paddingHorizontal: 10,
        marginBottom: 10,
        backgroundColor: "#fff",
    },
    promotionInput: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 10,
    },
    promotionSuffix: {
        fontSize: 16,
        marginLeft: 5,
    },
    saveButtonText: {
        color: "green",
        fontSize: 18,
        fontWeight: "bold",
        textAlign: "center",
    },
    note: {
        fontStyle: "italic",
        color: "#777",
    },
});

export default EventSettings;
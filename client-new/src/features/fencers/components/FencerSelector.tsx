import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { Fencer, Event, Weapon } from "../../../core/types";
import { Picker } from "@react-native-picker/picker";
import { useFencerQueries } from "../hooks/useFencerQueries";
import { useFencerEventQueries } from "../hooks/useFencerEventQueries";
import { useNetworkStatus } from "../../../infrastructure/networking/client";

interface FencerSelectorProps {
  eventId: number;
  weapon: Weapon;
  onFencerAdded?: (fencer: Fencer) => void;
  onFencerRemoved?: (fencer: Fencer) => void;
  onFencersChanged?: (fencers: Fencer[]) => void;
  initialSelectedFencers?: Fencer[];
  allowAddNew?: boolean;
  allowRemove?: boolean;
  allowSearch?: boolean;
  allowUpload?: boolean;
  allowRandomFill?: boolean;
  maxHeight?: number;
}

/**
 * A reusable component for selecting fencers for an event
 */
export const FencerSelector: React.FC<FencerSelectorProps> = ({
  eventId,
  weapon,
  onFencerAdded,
  onFencerRemoved,
  onFencersChanged,
  initialSelectedFencers,
  allowAddNew = true,
  allowRemove = true,
  allowSearch = true,
  allowUpload = false,
  allowRandomFill = false,
  maxHeight,
}) => {
  const { isConnected } = useNetworkStatus();
  
  // Fencer state
  const [fencerFirstName, setFencerFirstName] = useState<string>("");
  const [fencerLastName, setFencerLastName] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Rating state
  const initialWeapon = weapon.toLowerCase();
  const [selectedWeapon, setSelectedWeapon] = useState<string>(initialWeapon);
  const [epeeRating, setEpeeRating] = useState<string>("U");
  const [epeeYear, setEpeeYear] = useState<number>(new Date().getFullYear());
  const [foilRating, setFoilRating] = useState<string>("U");
  const [foilYear, setFoilYear] = useState<number>(new Date().getFullYear());
  const [saberRating, setSaberRating] = useState<string>("U");
  const [saberYear, setSaberYear] = useState<number>(new Date().getFullYear());
  
  // Random fill state
  const [showRandomFillInput, setShowRandomFillInput] = useState(false);
  const [randomFillInput, setRandomFillInput] = useState("");

  // Repository queries
  const fencerQueries = useFencerQueries();
  const fencerEventQueries = useFencerEventQueries();

  // Data queries
  const { 
    data: fencers = [], 
    isLoading: fencersLoading 
  } = fencerEventQueries.useGetFencersByEvent(eventId);
  
  const { 
    data: fencerSuggestions = [], 
    isLoading: searchLoading 
  } = fencerQueries.useSearchByName(searchQuery);

  // Mutations
  const addFencerMutation = fencerEventQueries.useAddFencerToEvent();
  const removeFencerMutation = fencerEventQueries.useRemoveFencerFromEvent();
  const createFencerMutation = fencerEventQueries.useCreateFencerAndAddToEvent();

  // Get current rating based on selected weapon
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

  // Event object needed for repository methods
  const event: Event = {
    id: eventId,
    tname: "", // Not needed for the operations we perform
    weapon: weapon,
    gender: "Mixed", // Default value
    age: "Senior", // Default value
    class: "Open", // Default value
  };

  // Update parent component when fencers change
  React.useEffect(() => {
    if (onFencersChanged) {
      onFencersChanged(fencers);
    }
  }, [fencers, onFencersChanged]);

  // Fencer functions
  const handleAddFencer = React.useCallback(() => {
    // Validate input
    if (!fencerFirstName.trim() || !fencerLastName.trim()) {
      Alert.alert("Error", "First and last name are required");
      return;
    }

    let newFencer: Omit<Fencer, 'id'> = {
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
    }, {
      onSuccess: (data) => {
        if (onFencerAdded && data.fencer) {
          onFencerAdded(data.fencer);
        }
      }
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
    event,
    onFencerAdded
  ]);

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

      const newFencer: Omit<Fencer, 'id'> = {
        fname: randomFirstName,
        lname: randomLastName,
        erating: randomEpeeRating,
        eyear: randomEpeeRating === "U" ? 0 : currentYear,
        frating: randomFoilRating,
        fyear: randomFoilRating === "U" ? 0 : currentYear,
        srating: randomSaberRating,
        syear: randomSaberRating === "U" ? 0 : currentYear,
      };

      const result = await createFencerMutation.mutateAsync({
        fencer: newFencer,
        event,
      });
      
      if (result.fencer && onFencerAdded) {
        onFencerAdded(result.fencer);
      }
      
      addedCount++;
    }

    if (addedCount < count) {
      Alert.alert("Warning", "Not enough unique fencer names available to add all requested random fencers.");
    }
  };

  // Handler for Random Fill button
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

  // Helper to format rating string for display
  const formatRatingString = React.useCallback((fencer: Fencer): string => {
    if (!fencer) return '';

    let rating = "";
    let year = 0;
    switch (weapon.toLowerCase()) {
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
  }, [weapon]);

  // Handler to remove a fencer from the event
  const handleRemoveFencer = React.useCallback((fencer: Fencer) => {
    removeFencerMutation.mutate({ fencer, event }, {
      onSuccess: () => {
        if (onFencerRemoved) {
          onFencerRemoved(fencer);
        }
      }
    });
  }, [removeFencerMutation, event, onFencerRemoved]);

  // Handler to add a fencer from search results
  const handleAddFencerFromSearch = React.useCallback((fencer: Fencer) => {
    addFencerMutation.mutate({ fencer, event }, {
      onSuccess: () => {
        if (onFencerAdded) {
          onFencerAdded(fencer);
        }
      }
    });
    setSearchQuery("");
  }, [addFencerMutation, event, setSearchQuery, onFencerAdded]);

  // Render the list of fencers
  const renderFencers = React.useCallback(() => {
    if (!fencers || !Array.isArray(fencers)) return null;

    return fencers.map((fencer) => (
      <View key={fencer.id} style={styles.fencerRow}>
        <Text style={styles.fencerItem}>
          {fencer.lname}, {fencer.fname} ({formatRatingString(fencer)})
        </Text>
        {allowRemove && (
          <TouchableOpacity
            onPress={() => handleRemoveFencer(fencer)}
            style={styles.removeFencerButton}
            disabled={removeFencerMutation.isPending}
          >
            <Text style={styles.removeFencerText}>x</Text>
          </TouchableOpacity>
        )}
      </View>
    ));
  }, [fencers, formatRatingString, handleRemoveFencer, removeFencerMutation.isPending, allowRemove]);

  // Render fencer search suggestions
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

  // Show offline warning if trying to access data without connection
  if (!isConnected) {
    return (
      <View style={styles.offlineContainer}>
        <Text style={styles.offlineTitle}>Offline Mode</Text>
        <Text style={styles.offlineText}>
          You're currently offline. Fencer management requires a network connection.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, maxHeight ? { maxHeight } : {}]}>
      {/* Search Section */}
      {allowSearch && (
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
      )}

      {/* Add New Fencer Section */}
      {allowAddNew && (
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
          {/* Optimized Horizontal Layout for Weapon and Rating */}
          <View style={styles.horizontalFormRow}>
            {/* Weapon Selection */}
            <View style={styles.weaponPickerContainer}>
              <Text style={styles.compactInputLabel}>Weapon</Text>
              <Picker
                selectedValue={selectedWeapon}
                onValueChange={(itemValue) => setSelectedWeapon(itemValue)}
                style={styles.compactPicker}
              >
                <Picker.Item label="Epee" value="epee" />
                <Picker.Item label="Foil" value="foil" />
                <Picker.Item label="Saber" value="saber" />
              </Picker>
            </View>

            {/* Rating Selection */}
            <View style={styles.ratingPickerContainer}>
              <Text style={styles.compactInputLabel}>Rating</Text>
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
                style={styles.compactPicker}
              >
                <Picker.Item label="A" value="A" />
                <Picker.Item label="B" value="B" />
                <Picker.Item label="C" value="C" />
                <Picker.Item label="D" value="D" />
                <Picker.Item label="E" value="E" />
                <Picker.Item label="U" value="U" />
              </Picker>
            </View>

            {/* Year Selection - Only shown when rating isn't "U" */}
            {currentRating !== "U" && (
              <View style={styles.yearPickerContainer}>
                <Text style={styles.compactInputLabel}>Year</Text>
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
                  style={styles.compactPicker}
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
          
          {/* Random Fill Button */}
          {allowRandomFill && (
            <>
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
            </>
          )}
        </View>
      )}

      {/* Fencer List Section */}
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
          <ScrollView style={styles.fencerList}>
            {renderFencers()}
          </ScrollView>
        )}
        {createFencerMutation.isPending && (
          <View style={styles.pendingActionContainer}>
            <ActivityIndicator size="small" color="#001f3f" />
            <Text style={styles.pendingActionText}>Adding fencer...</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default FencerSelector;

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f7f7f7",
    borderRadius: 8,
    overflow: 'hidden',
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
  fencerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#eee',
  },
  fencerItem: {
    fontSize: 16,
    color: "#001f3f",
    flex: 1,
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
    padding: 10,
    textAlign: 'center',
  },
  fencerListContainer: {
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    backgroundColor: "#fafafa",
  },
  fencerList: {
    maxHeight: 200,
  },
  fencerListHeader: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#001f3f",
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
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9534f',
  },
  offlineTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d9534f',
    marginBottom: 10,
  },
  offlineText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 20,
  },
});
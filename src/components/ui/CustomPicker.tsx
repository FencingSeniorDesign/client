import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PickerOption {
    label: string;
    value: string | number;
}

interface CustomPickerProps {
    label: string;
    selectedValue: string | number;
    onValueChange: (value: string | number) => void;
    options: PickerOption[];
    containerStyle?: object;
}

/**
 * A custom picker component that replaces the native picker
 * to provide better control over height and text display
 */
export const CustomPicker = ({ label, selectedValue, onValueChange, options, containerStyle }: CustomPickerProps) => {
    const [modalVisible, setModalVisible] = React.useState(false);

    // Find the selected option to display its label
    const selectedOption = options.find(option => option.value === selectedValue);

    return (
        <View style={[styles.pickerContainer, containerStyle]}>
            <Text style={styles.pickerLabel}>{label}</Text>
            <TouchableOpacity style={styles.pickerButton} onPress={() => setModalVisible(true)}>
                <Text style={styles.pickerButtonText} numberOfLines={1}>
                    {selectedOption?.label || 'Select...'}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#001f3f" />
            </TouchableOpacity>

            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
                    <SafeAreaView style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{`Select ${label}`}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close-circle" size={24} color="#001f3f" />
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={options}
                            keyExtractor={item => item.value.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.optionItem, selectedValue === item.value && styles.selectedOption]}
                                    onPress={() => {
                                        onValueChange(item.value);
                                        setModalVisible(false);
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.optionText,
                                            selectedValue === item.value && styles.selectedOptionText,
                                        ]}
                                    >
                                        {item.label}
                                    </Text>
                                    {selectedValue === item.value && (
                                        <Ionicons name="checkmark" size={20} color="#fff" />
                                    )}
                                </TouchableOpacity>
                            )}
                            style={styles.optionsList}
                        />
                    </SafeAreaView>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

/**
 * A component that wraps the three pickers (weapon, rating, year) for fencer creation
 */
export const FencerCreationControls = ({
    selectedWeapon,
    setSelectedWeapon,
    currentRating,
    currentYear,
    handleRatingChange,
    handleYearChange,
}) => {
    // Define options for each picker
    const weaponOptions = [
        { label: 'Epee', value: 'epee' },
        { label: 'Foil', value: 'foil' },
        { label: 'Saber', value: 'saber' },
    ];

    const ratingOptions = [
        { label: 'A', value: 'A' },
        { label: 'B', value: 'B' },
        { label: 'C', value: 'C' },
        { label: 'D', value: 'D' },
        { label: 'E', value: 'E' },
        { label: 'U', value: 'U' },
    ];

    // Create year options (current year down to 10 years ago)
    const currentYearValue = new Date().getFullYear();
    const yearOptions = Array.from({ length: 10 }, (_, i) => {
        const year = currentYearValue - i;
        return { label: year.toString(), value: year };
    });

    return (
        <View style={styles.horizontalFormRow}>
            {/* Weapon Selection */}
            <CustomPicker
                label="Weapon"
                selectedValue={selectedWeapon}
                onValueChange={setSelectedWeapon}
                options={weaponOptions}
                containerStyle={styles.weaponPickerContainer}
            />

            {/* Rating Selection */}
            <CustomPicker
                label="Rating"
                selectedValue={currentRating}
                onValueChange={handleRatingChange}
                options={ratingOptions}
                containerStyle={styles.ratingPickerContainer}
            />

            {/* Year Selection - Only shown when rating isn't "U" */}
            {currentRating !== 'U' && (
                <CustomPicker
                    label="Year"
                    selectedValue={currentYear}
                    onValueChange={handleYearChange}
                    options={yearOptions}
                    containerStyle={styles.yearPickerContainer}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    // Picker styles
    pickerContainer: {
        paddingVertical: 2,
        paddingHorizontal: 6,
    },
    pickerLabel: {
        fontSize: 12,
        color: '#001f3f',
        marginBottom: 4,
    },
    pickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 4,
        paddingHorizontal: 10,
        paddingVertical: 8,
        backgroundColor: '#f9f9f9',
    },
    pickerButtonText: {
        fontSize: 16,
        color: '#333',
        flex: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#001f3f',
    },
    optionsList: {
        paddingHorizontal: 16,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    selectedOption: {
        backgroundColor: '#001f3f',
        borderRadius: 8,
    },
    optionText: {
        fontSize: 16,
        color: '#333',
    },
    selectedOptionText: {
        color: '#fff',
        fontWeight: '500',
    },

    // Form layout styles
    horizontalFormRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
        backgroundColor: '#fff',
    },
    weaponPickerContainer: {
        flex: 1.2,
        paddingRight: 8,
    },
    ratingPickerContainer: {
        flex: 0.8,
        paddingHorizontal: 4,
    },
    yearPickerContainer: {
        flex: 1,
        paddingLeft: 8,
    },
});

export default {
    CustomPicker,
    FencerCreationControls,
};

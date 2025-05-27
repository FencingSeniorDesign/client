import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { generateClubAbbreviation } from '../../navigation/utils/BoutOrderUtils';
import { useSearchClubs, useCreateClub } from '../../data/TournamentDataHooks';
import { useTranslation } from 'react-i18next';

interface Club {
    id?: number;
    name: string;
    abbreviation?: string;
}

interface ClubAutocompleteProps {
    value: string;
    abbreviation?: string;
    onValueChange: (value: string, clubId?: number, abbreviation?: string) => void;
    containerStyle?: object;
}

export const ClubAutocomplete = ({ value, abbreviation, onValueChange, containerStyle }: ClubAutocompleteProps) => {
    const [query, setQuery] = useState(value);
    const [abbr, setAbbr] = useState(abbreviation || '');
    const [showDropdown, setShowDropdown] = useState(false);
    const [showAbbreviation, setShowAbbreviation] = useState(false);
    const { t } = useTranslation();

    // Use real hooks instead of mocks
    const { data: clubs = [], isLoading } = useSearchClubs(query);
    const createClubMutation = useCreateClub();

    useEffect(() => {
        setQuery(value);
        setAbbr(abbreviation || '');
    }, [value, abbreviation]);

    const handleInputChange = (text: string) => {
        setQuery(text);

        // Auto-generate abbreviation if not set
        if (!abbr && text) {
            const generatedAbbr = generateClubAbbreviation(text);
            setAbbr(generatedAbbr);
            onValueChange(text, undefined, generatedAbbr);
        } else {
            onValueChange(text, undefined, abbr);
        }

        setShowDropdown(text.length > 0);
    };

    const handleAbbrChange = (text: string) => {
        // Limit to 5 characters and uppercase
        const formattedText = text.toUpperCase().substring(0, 5);
        setAbbr(formattedText);
        onValueChange(query, undefined, formattedText);
    };

    const handleSelectClub = (clubName: string, clubId?: number, clubAbbr?: string) => {
        setQuery(clubName);
        setAbbr(clubAbbr || '');
        onValueChange(clubName, clubId, clubAbbr);
        setShowDropdown(false);
        setShowAbbreviation(false); // Hide abbreviation field when selecting an existing club
    };

    const handleCreateClub = async () => {
        try {
            const result = await createClubMutation.mutateAsync({
                name: query,
                abbreviation: abbr.length >= 2 ? abbr : undefined,
            });

            if (result) {
                handleSelectClub(query, result, abbr);
            }
        } catch (error) {
            console.error('Error creating club:', error);
        }
    };

    return (
        <View style={[styles.container, containerStyle]}>
            <Text style={styles.label}>{t('clubAutocomplete.label')}</Text>
            <TextInput
                style={styles.input}
                value={query}
                onChangeText={handleInputChange}
                onFocus={() => setShowDropdown(query.length > 0)}
                placeholder={t('clubAutocomplete.enterName')}
                placeholderTextColor="#999"
            />

            {query.length > 0 && (
                <TouchableOpacity style={styles.abbrToggle} onPress={() => setShowAbbreviation(!showAbbreviation)}>
                    <Text style={styles.abbrToggleText}>
                        {showAbbreviation
                            ? t('clubAutocomplete.hideAbbreviation')
                            : t('clubAutocomplete.showAbbreviation')}
                    </Text>
                </TouchableOpacity>
            )}

            {showAbbreviation && (
                <View style={styles.abbrContainer}>
                    <Text style={styles.abbrLabel}>{t('clubAutocomplete.abbreviationInfo')}</Text>
                    <TextInput
                        style={styles.abbrInput}
                        value={abbr}
                        onChangeText={handleAbbrChange}
                        placeholder={t('clubAutocomplete.abbreviation')}
                        placeholderTextColor="#999"
                        maxLength={5}
                        autoCapitalize="characters"
                    />
                </View>
            )}

            {showDropdown && (
                <View style={styles.dropdown}>
                    {isLoading ? (
                        <ActivityIndicator size="small" color="#001f3f" />
                    ) : (
                        <View>
                            {clubs.length === 0 && query.length > 0 && (
                                <View style={styles.emptyResult}>
                                    <Text style={styles.emptyResultText}>{t('clubAutocomplete.noMatches')}</Text>
                                </View>
                            )}

                            {clubs.map(item => (
                                <TouchableOpacity
                                    key={item.id?.toString() || item.name}
                                    style={styles.dropdownItem}
                                    onPress={() => handleSelectClub(item.name, item.id, item.abbreviation)}
                                >
                                    <Text>{item.name}</Text>
                                    {item.abbreviation && (
                                        <Text style={styles.abbreviation}>({item.abbreviation})</Text>
                                    )}
                                </TouchableOpacity>
                            ))}

                            {query.length > 0 && (
                                <TouchableOpacity
                                    style={[styles.dropdownItem, styles.createItem]}
                                    onPress={handleCreateClub}
                                    disabled={createClubMutation.isPending}
                                >
                                    {createClubMutation.isPending ? (
                                        <View style={styles.buttonLoadingContainer}>
                                            <ActivityIndicator size="small" color="#001f3f" />
                                            <Text style={styles.createItemText}>{t('clubAutocomplete.creating')}</Text>
                                        </View>
                                    ) : (
                                        <>
                                            <Text style={styles.createItemText}>
                                                {t('clubAutocomplete.create', { name: query })}
                                            </Text>
                                            {abbr && <Text style={styles.abbreviation}>({abbr})</Text>}
                                        </>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 10,
        zIndex: 10, // Ensure dropdown appears above other elements
    },
    label: {
        fontSize: 12,
        color: '#001f3f',
        marginBottom: 4,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 4,
        paddingHorizontal: 10,
        paddingVertical: 8,
        backgroundColor: '#f9f9f9',
    },
    abbrToggle: {
        alignSelf: 'flex-end',
        marginTop: 4,
        padding: 4,
    },
    abbrToggleText: {
        fontSize: 12,
        color: '#001f3f',
    },
    abbrContainer: {
        marginTop: 8,
    },
    abbrLabel: {
        fontSize: 12,
        color: '#001f3f',
        marginBottom: 4,
    },
    abbrInput: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 4,
        paddingHorizontal: 10,
        paddingVertical: 8,
        backgroundColor: '#f9f9f9',
    },
    dropdown: {
        position: 'absolute',
        top: 60,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 4,
        maxHeight: 200,
        zIndex: 1000,
        elevation: 5, // For Android
    },
    dropdownItem: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    createItem: {
        backgroundColor: '#f0f8ff',
    },
    createItemText: {
        color: '#001f3f',
    },
    abbreviation: {
        color: '#666',
        fontSize: 12,
    },
    buttonLoadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    emptyResult: {
        padding: 10,
        alignItems: 'center',
    },
    emptyResultText: {
        color: '#666',
        fontStyle: 'italic',
    },
});

export default ClubAutocomplete;

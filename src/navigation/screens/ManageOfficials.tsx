import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Official } from '../navigation/types';
import {
    useOfficials,
    useReferees,
    useAddOfficial,
    useAddReferee,
    useRemoveOfficial,
    useRemoveReferee,
} from '../../data/TournamentDataHooks';
import { getDeviceId } from '../../networking/NetworkUtils';
import { useTranslation } from 'react-i18next';

interface ManageOfficialsProps {
    navigation: NativeStackNavigationProp<RootStackParamList, 'ManageOfficials'>;
    route: RouteProp<RootStackParamList, 'ManageOfficials'>;
}

const ManageOfficials: React.FC<ManageOfficialsProps> = ({ route, navigation }) => {
    const { tournamentName, isRemote } = route.params;
    const { t } = useTranslation();

    // Use TanStack Query hooks for data fetching
    const { data: officials = [], isLoading: officialsLoading } = useOfficials(tournamentName);

    const { data: referees = [], isLoading: refereesLoading } = useReferees(tournamentName);

    // Mutations for adding and removing officials and referees
    const addOfficialMutation = useAddOfficial();
    const addRefereeMutation = useAddReferee();
    const removeOfficialMutation = useRemoveOfficial();
    const removeRefereeMutation = useRemoveReferee();

    // State for add person modal
    const [modalVisible, setModalVisible] = useState(false);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [deviceId, setDeviceId] = useState('');
    const [isAddingReferee, setIsAddingReferee] = useState(true);
    const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);

    // Get current device ID
    React.useEffect(() => {
        const fetchDeviceId = async () => {
            try {
                const deviceId = await getDeviceId();
                setCurrentDeviceId(deviceId);
            } catch (error) {
                console.error('Failed to get device ID:', error);
                setCurrentDeviceId('unknown');
            }
        };

        fetchDeviceId();
    }, []);

    const handleAddPerson = () => {
        if (!firstName.trim()) {
            Alert.alert(t('common.error'), t('manageOfficials.firstNameRequiredError'));
            return;
        }

        // Validate device ID if provided
        if (deviceId && deviceId.length !== 5) {
            Alert.alert(t('common.error'), t('manageOfficials.deviceIdError'));
            return;
        }

        if (isAddingReferee) {
            addReferee();
        } else {
            addOfficial();
        }
    };

    const addReferee = async () => {
        try {
            const newReferee: Official = {
                fname: firstName,
                lname: lastName,
                device_id: deviceId || '',
            };

            // Use the mutation to add referee
            await addRefereeMutation.mutateAsync({
                referee: newReferee,
                tournamentName,
            });

            setModalVisible(false);
            resetFormFields();
        } catch (error) {
            console.error('Error adding referee:', error);
            Alert.alert(t('common.error'), t('manageOfficials.failedToAddReferee'));
        }
    };

    const addOfficial = async () => {
        try {
            const newOfficial: Official = {
                fname: firstName,
                lname: lastName,
                device_id: deviceId || null,
            };

            // Use the mutation to add official
            await addOfficialMutation.mutateAsync({
                official: newOfficial,
                tournamentName,
            });

            setModalVisible(false);
            resetFormFields();
        } catch (error) {
            console.error('Error adding tournament official:', error);
            Alert.alert(t('common.error'), t('manageOfficials.failedToAddOfficial'));
        }
    };

    const resetFormFields = () => {
        setFirstName('');
        setLastName('');
        setDeviceId('');
        setIsAddingReferee(true);
    };

    const copyDeviceId = () => {
        if (currentDeviceId) {
            setDeviceId(currentDeviceId);
        }
    };

    const handleRemoveOfficial = (official: Official) => {
        if (!official.id) {
            Alert.alert(t('common.error'), t('common.error'));
            return;
        }

        Alert.alert(
            t('manageOfficials.confirmRemoval'),
            t('manageOfficials.confirmRemoveOfficial', { firstName: official.fname, lastName: official.lname }),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.remove'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await removeOfficialMutation.mutateAsync({
                                officialId: official.id!,
                                tournamentName,
                            });
                        } catch (error) {
                            console.error('Error removing official:', error);
                            Alert.alert(t('common.error'), t('manageOfficials.failedToRemoveOfficial'));
                        }
                    },
                },
            ]
        );
    };

    const handleRemoveReferee = (referee: Official) => {
        if (!referee.id) {
            Alert.alert(t('common.error'), t('common.error'));
            return;
        }

        Alert.alert(
            t('manageOfficials.confirmRemoval'),
            t('manageOfficials.confirmRemoveReferee', { firstName: referee.fname, lastName: referee.lname }),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.remove'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await removeRefereeMutation.mutateAsync({
                                refereeId: referee.id!,
                                tournamentName,
                            });
                        } catch (error) {
                            console.error('Error removing referee:', error);
                            Alert.alert(t('common.error'), t('manageOfficials.failedToRemoveReferee'));
                        }
                    },
                },
            ]
        );
    };

    const renderRefereeItem = ({ item }: { item: Official }) => (
        <View style={styles.listItem}>
            <View style={styles.personInfo}>
                <Text style={styles.name}>
                    {item.fname} {item.lname}
                </Text>
                <Text style={styles.deviceId}>
                    {t('manageOfficials.deviceId', { id: item.device_id || t('manageOfficials.notSet') })}
                </Text>
            </View>
            {!isRemote && (
                <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveReferee(item)}
                    disabled={removeRefereeMutation.isPending}
                >
                    <Text style={styles.removeButtonText}>✕</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    const renderOfficialItem = ({ item }: { item: Official }) => (
        <View style={styles.listItem}>
            <View style={styles.personInfo}>
                <Text style={styles.name}>
                    {item.fname} {item.lname}
                </Text>
                <Text style={styles.deviceId}>
                    {t('manageOfficials.deviceId', { id: item.device_id || t('manageOfficials.notSet') })}
                </Text>
            </View>
            {!isRemote && (
                <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveOfficial(item)}
                    disabled={removeOfficialMutation.isPending}
                >
                    <Text style={styles.removeButtonText}>✕</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    const isLoading = officialsLoading || refereesLoading;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{t('manageOfficials.title', { tournamentName })}</Text>

            {!isRemote && (
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => {
                            setIsAddingReferee(true);
                            setModalVisible(true);
                        }}
                    >
                        <Text style={styles.buttonText}>{t('manageOfficials.addReferee')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.addButton, { backgroundColor: '#4CAF50' }]}
                        onPress={() => {
                            setIsAddingReferee(false);
                            setModalVisible(true);
                        }}
                    >
                        <Text style={styles.buttonText}>{t('manageOfficials.addOfficial')}</Text>
                    </TouchableOpacity>
                </View>
            )}

            <ScrollView style={styles.scrollView}>
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>{t('manageOfficials.referees')}</Text>
                    {isLoading ? (
                        <Text style={styles.loadingText}>{t('manageOfficials.loadingReferees')}</Text>
                    ) : referees.length > 0 ? (
                        <FlatList
                            data={referees}
                            renderItem={renderRefereeItem}
                            keyExtractor={item => item.id?.toString() || Math.random().toString()}
                            scrollEnabled={false}
                        />
                    ) : (
                        <Text style={styles.emptyText}>{t('manageOfficials.noReferees')}</Text>
                    )}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>{t('manageOfficials.tournamentOfficials')}</Text>
                    {isLoading ? (
                        <Text style={styles.loadingText}>{t('manageOfficials.loadingOfficials')}</Text>
                    ) : officials.length > 0 ? (
                        <FlatList
                            data={officials}
                            renderItem={renderOfficialItem}
                            keyExtractor={item => item.id?.toString() || Math.random().toString()}
                            scrollEnabled={false}
                        />
                    ) : (
                        <Text style={styles.emptyText}>{t('manageOfficials.noOfficials')}</Text>
                    )}
                </View>

                <View style={styles.deviceInfoSection}>
                    <Text style={styles.deviceInfoHeader}>{t('manageOfficials.thisDevice')}</Text>
                    <Text style={styles.deviceInfoText}>
                        {t('manageOfficials.deviceId', { id: currentDeviceId || t('common.loading') })}
                    </Text>
                    <Text style={styles.helpText}>{t('manageOfficials.deviceInfo')}</Text>
                </View>
            </ScrollView>

            {/* Add Person Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {isAddingReferee ? t('manageOfficials.addReferee') : t('manageOfficials.addOfficial')}
                        </Text>

                        <TextInput
                            style={styles.input}
                            placeholder={t('manageOfficials.firstNameRequired')}
                            value={firstName}
                            onChangeText={setFirstName}
                        />

                        <TextInput
                            style={styles.input}
                            placeholder={t('manageOfficials.lastName')}
                            value={lastName}
                            onChangeText={setLastName}
                        />

                        <View style={styles.deviceIdInputContainer}>
                            <TextInput
                                style={[styles.input, styles.deviceIdInput]}
                                placeholder={t('manageOfficials.deviceIdInfo')}
                                value={deviceId}
                                onChangeText={text => setDeviceId(text.slice(0, 5).toUpperCase())}
                                maxLength={5}
                                autoCapitalize="characters"
                            />

                            <TouchableOpacity style={styles.copyButton} onPress={copyDeviceId}>
                                <Text style={styles.copyButtonText}>{t('manageOfficials.useThisDevice')}</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.idExplanationText}>{t('manageOfficials.deviceAssignmentInfo')}</Text>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalActionButton}
                                onPress={handleAddPerson}
                                disabled={addOfficialMutation.isPending || addRefereeMutation.isPending}
                            >
                                <Text style={styles.modalActionText}>
                                    {addOfficialMutation.isPending || addRefereeMutation.isPending
                                        ? t('eventSettings.adding')
                                        : t('common.add')}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalActionButton, styles.cancelButton]}
                                onPress={() => {
                                    setModalVisible(false);
                                    resetFormFields();
                                }}
                                disabled={addOfficialMutation.isPending || addRefereeMutation.isPending}
                            >
                                <Text style={styles.modalActionText}>{t('common.cancel')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const navyBlue = '#001f3f';
const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        color: navyBlue,
    },
    scrollView: {
        flex: 1,
    },
    section: {
        marginBottom: 24,
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        padding: 12,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: navyBlue,
    },
    listItem: {
        flexDirection: 'row',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        alignItems: 'center',
    },
    personInfo: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: '500',
    },
    deviceId: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    emptyText: {
        fontStyle: 'italic',
        color: '#666',
        textAlign: 'center',
        padding: 20,
    },
    loadingText: {
        color: '#666',
        textAlign: 'center',
        padding: 20,
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    addButton: {
        flex: 1,
        backgroundColor: navyBlue,
        padding: 12,
        borderRadius: 6,
        alignItems: 'center',
        marginHorizontal: 4,
    },
    buttonText: {
        color: 'white',
        fontWeight: '500',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 12,
        width: '80%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: navyBlue,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 6,
        padding: 10,
        marginBottom: 16,
    },
    deviceIdInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    deviceIdInput: {
        flex: 1,
        marginBottom: 0,
        marginRight: 8,
    },
    copyButton: {
        backgroundColor: '#4CAF50',
        paddingHorizontal: 8,
        paddingVertical: 10,
        borderRadius: 6,
    },
    copyButtonText: {
        color: 'white',
        fontSize: 12,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    modalActionButton: {
        backgroundColor: navyBlue,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 6,
        width: '40%',
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#ccc',
    },
    modalActionText: {
        color: 'white',
        fontWeight: '500',
    },
    deviceInfoSection: {
        backgroundColor: '#f0f0f0',
        padding: 16,
        borderRadius: 8,
        marginTop: 20,
        marginBottom: 30,
    },
    deviceInfoHeader: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
        color: navyBlue,
    },
    deviceInfoText: {
        fontSize: 14,
        marginBottom: 8,
    },
    helpText: {
        fontSize: 13,
        fontStyle: 'italic',
        color: '#666',
    },
    idExplanationText: {
        fontSize: 12,
        fontStyle: 'italic',
        color: '#666',
        marginBottom: 16,
        textAlign: 'center',
    },
    removeButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#ff3b30',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
    removeButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default ManageOfficials;

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ManageOfficials from '../../../src/navigation/screens/ManageOfficials';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
    useOfficials,
    useReferees,
    useAddOfficial,
    useAddReferee,
    useRemoveOfficial,
    useRemoveReferee,
} from '../../../src/data/TournamentDataHooks';
import { RootStackParamList } from '../../../src/navigation/navigation/types'; // Ensure this file exists or adjust the path
import { getDeviceId } from '../../../src/networking/NetworkUtils';

// Mock all the hooks and utilities
jest.mock('../../../src/data/TournamentDataHooks');
jest.mock('../../../src/networking/NetworkUtils');

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('ManageOfficials', () => {
    const mockRoute: RouteProp<RootStackParamList, 'ManageOfficials'> = {
        params: {
            tournamentName: 'Test Tournament',
            isRemote: false,
        },
        key: 'ManageOfficials',
        name: 'ManageOfficials',
    };

    const mockNavigation: NativeStackNavigationProp<RootStackParamList, 'ManageOfficials'> = {
        navigate: jest.fn(),
        goBack: jest.fn(),
        reset: jest.fn(),
        dispatch: jest.fn(),
        canGoBack: jest.fn(),
        getParent: jest.fn(),
        setOptions: jest.fn(),
        isFocused: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        navigateDeprecated: jest.fn(),
        preload: jest.fn(),
        getId: jest.fn(),
        getState: jest.fn(),
        setStateForNextRouteNamesChange: jest.fn(),
        setParams: jest.fn(),
        replace: jest.fn(), // Add missing methods
        push: jest.fn(),
        pop: jest.fn(),
        popToTop: jest.fn(),
        popTo: jest.fn(),
    };

    const mockOfficials = [
        { id: 1, fname: 'John', lname: 'Doe', device_id: 'ABC12' },
        { id: 2, fname: 'Jane', lname: 'Smith', device_id: 'XYZ34' },
    ];

    const mockReferees = [
        { id: 3, fname: 'Bob', lname: 'Wilson', device_id: 'REF01' },
        { id: 4, fname: 'Alice', lname: 'Brown', device_id: 'REF02' },
    ];

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock hook returns
        (useOfficials as jest.Mock).mockReturnValue({
            data: mockOfficials,
            isLoading: false,
        });

        (useReferees as jest.Mock).mockReturnValue({
            data: mockReferees,
            isLoading: false,
        });

        // Mock mutation hooks
        (useAddOfficial as jest.Mock).mockReturnValue({
            mutateAsync: jest.fn(),
            isPending: false,
        });
        (useAddReferee as jest.Mock).mockReturnValue({
            mutateAsync: jest.fn(),
            isPending: false,
        });
        (useRemoveOfficial as jest.Mock).mockReturnValue({
            mutateAsync: jest.fn(),
            isPending: false,
        });
        (useRemoveReferee as jest.Mock).mockReturnValue({
            mutateAsync: jest.fn(),
            isPending: false,
        });

        // Mock device ID
        (getDeviceId as jest.Mock).mockResolvedValue('TEST1');
    });

    it('renders officials and referees lists', async () => {
        const { getByText } = render(
            <ManageOfficials route={mockRoute} navigation={mockNavigation as unknown as NativeStackNavigationProp<RootStackParamList, 'ManageOfficials'>} />
        );

        expect(getByText('Test Tournament')).toBeTruthy();
        expect(getByText('John Doe')).toBeTruthy();
        expect(getByText('Bob Wilson')).toBeTruthy();
    });

    it('opens add referee modal', async () => {
        const { getByText, getByPlaceholderText } = render(
            <ManageOfficials route={mockRoute} navigation={mockNavigation} />
        );

        fireEvent.press(getByText('Add Referee'));

        expect(getByText('Add Referee')).toBeTruthy();
        expect(getByPlaceholderText('First Name *')).toBeTruthy();
    });

    it('validates referee first name when adding', async () => {
        const { getByText, getByPlaceholderText } = render(
            <ManageOfficials route={mockRoute} navigation={mockNavigation} />
        );

        fireEvent.press(getByText('Add Referee'));
        fireEvent.press(getByText('Add'));

        expect(Alert.alert).toHaveBeenCalledWith('Error', 'First name is required');
    });

    it('adds a new referee successfully', async () => {
        const addRefereeMutation = { mutateAsync: jest.fn() };
        (useAddReferee as jest.Mock).mockReturnValue(addRefereeMutation);

        const { getByText, getByPlaceholderText } = render(
            <ManageOfficials route={mockRoute} navigation={mockNavigation} />
        );

        // Open modal and fill form
        fireEvent.press(getByText('Add Referee'));
        fireEvent.changeText(getByPlaceholderText('First Name *'), 'New');
        fireEvent.changeText(getByPlaceholderText('Last Name'), 'Referee');
        fireEvent.changeText(getByPlaceholderText('Device ID (5 characters)'), 'REF03');

        // Submit form
        await act(async () => {
            fireEvent.press(getByText('Add'));
        });

        expect(addRefereeMutation.mutateAsync).toHaveBeenCalledWith({
            referee: {
                fname: 'New',
                lname: 'Referee',
                device_id: 'REF03',
            },
            tournamentName: 'Test Tournament',
        });
    });

    it('removes a referee with confirmation', async () => {
        const removeRefereeMutation = { mutateAsync: jest.fn() };
        (useRemoveReferee as jest.Mock).mockReturnValue(removeRefereeMutation);

        const { getAllByText } = render(
            <ManageOfficials route={mockRoute} navigation={mockNavigation} />
        );

        // Find and press the first remove button
        const removeButtons = getAllByText('✕');
        fireEvent.press(removeButtons[0]);

        // Simulate confirming the alert
        const alertButtons = (Alert.alert as jest.Mock).mock.calls[0][2];
        const confirmButton = alertButtons.find((button: any) => button.text === 'Remove');
        await act(async () => {
            confirmButton.onPress();
        });

        expect(removeRefereeMutation.mutateAsync).toHaveBeenCalledWith({
            refereeId: mockReferees[0].id,
            tournamentName: 'Test Tournament',
        });
    });

    it('handles remote connection mode', () => {
        const remoteRoute = {
            ...mockRoute,
            params: { ...mockRoute.params, isRemote: true },
        };

        const { queryByText } = render(
            <ManageOfficials route={remoteRoute} navigation={mockNavigation} />
        );

        // Add buttons should not be visible in remote mode
        expect(queryByText('Add Referee')).toBeNull();
        expect(queryByText('Add Official')).toBeNull();
    });

    it('copies device ID when "Use This Device" is pressed', async () => {
        const { getByText, getByPlaceholderText } = render(
            <ManageOfficials route={mockRoute} navigation={mockNavigation} />
        );

        fireEvent.press(getByText('Add Referee'));
        fireEvent.press(getByText('Use This Device'));

        expect(getByPlaceholderText('Device ID (5 characters)').props.value).toBe('TEST1');
    });

    it('validates device ID length', async () => {
        const { getByText, getByPlaceholderText } = render(
            <ManageOfficials route={mockRoute} navigation={mockNavigation} />
        );

        fireEvent.press(getByText('Add Official'));
        fireEvent.changeText(getByPlaceholderText('First Name *'), 'Test');
        fireEvent.changeText(getByPlaceholderText('Device ID (5 characters)'), 'ABC');
        fireEvent.press(getByText('Add'));

        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Device ID must be exactly 5 characters');
    });

    it('displays loading state', () => {
        (useOfficials as jest.Mock).mockReturnValue({
            data: [],
            isLoading: true,
        });
        (useReferees as jest.Mock).mockReturnValue({
            data: [],
            isLoading: true,
        });

        const { getByText } = render(
            <ManageOfficials route={mockRoute} navigation={mockNavigation} />
        );

        expect(getByText('Loading officials...')).toBeTruthy();
        expect(getByText('Loading referees...')).toBeTruthy();
    });
});
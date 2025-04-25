import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { EventSettings } from '../../../src/navigation/screens/EventSettings';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import {
    useFencers,
    useRounds,
    useSearchFencers,
    useAddFencer,
    useRemoveFencer,
    useCreateFencer,
    useAddRound,
    useUpdateRound,
    useDeleteRound,
} from '../../../src/data/TournamentDataHooks';

// Mock all the hooks
jest.mock('../../../src/data/TournamentDataHooks');
jest.mock('expo-document-picker');
jest.mock('expo-file-system');

// Mock navigation
jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({
        navigate: jest.fn(),
        goBack: jest.fn(),
    }),
}));

// Mock custom components
jest.mock('../../../src/components/ui/ClubAutocomplete', () => {
    return function MockClubAutocomplete(props: any) {
        return (
            <input
                data-testid="club-autocomplete"
                value={props.value}
                onChange={(e) => props.onValueChange(e.target.value)}
            />
        );
    };
});

jest.mock('../../../src/components/ui/CustomPicker', () => ({
    CustomPicker: (props: any) => null,
    FencerCreationControls: (props: any) => null,
}));

describe('EventSettings', () => {
    const mockEvent = {
        id: 1,
        weapon: 'foil',
        gender: 'mixed',
        age: 'senior',
        class: 'Open',
        seeding: 'Random',
    };

    const mockFencers = [
        {
            id: 1,
            fname: 'John',
            lname: 'Doe',
            club: 'Club A',
            clubAbbreviation: 'CA',
            frating: 'A',
            fyear: 2023,
        },
    ];

    const mockRounds = [
        {
            id: 1,
            eventid: 1,
            type: 'pool',
            rorder: 1,
            promotionpercent: 100,
            poolcount: 2,
            poolsize: 6,
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock hook returns
        (useFencers as jest.Mock).mockReturnValue({
            data: mockFencers,
            isLoading: false,
        });

        (useRounds as jest.Mock).mockReturnValue({
            data: mockRounds,
            isLoading: false,
        });

        (useSearchFencers as jest.Mock).mockReturnValue({
            data: [],
            isLoading: false,
        });

        // Mock mutation hooks
        (useAddFencer as jest.Mock).mockReturnValue({ mutate: jest.fn() });
        (useRemoveFencer as jest.Mock).mockReturnValue({ mutate: jest.fn() });
        (useCreateFencer as jest.Mock).mockReturnValue({ mutate: jest.fn(), isPending: false });
        (useAddRound as jest.Mock).mockReturnValue({ mutate: jest.fn() });
        (useUpdateRound as jest.Mock).mockReturnValue({ mutate: jest.fn() });
        (useDeleteRound as jest.Mock).mockReturnValue({ mutate: jest.fn() });
    });

    it('renders event settings screen', () => {
        const { getByText } = render(
            <EventSettings
                route={{
                    params: { event: mockEvent, onSave: jest.fn() },
                    key: 'test',
                    name: 'params',
                }}
            />
        );

        expect(getByText('Edit Event Settings')).toBeTruthy();
        expect(getByText('Fencer Management')).toBeTruthy();
        expect(getByText('Round Management')).toBeTruthy();
    });

    it('displays fencer management section when dropdown is opened', async () => {
        const { getByText, queryByPlaceholderText } = render(
            <EventSettings
                route={{
                    params: { event: mockEvent, onSave: jest.fn() },
                    key: 'test',
                    name: 'params',
                }}
            />
        );

        fireEvent.press(getByText('Fencer Management'));

        await waitFor(() => {
            expect(queryByPlaceholderText('First Name')).toBeTruthy();
            expect(queryByPlaceholderText('Last Name')).toBeTruthy();
            expect(getByText('Current Fencers: 1')).toBeTruthy();
        });
    });

    it('allows adding a new fencer', async () => {
        const createFencerMutation = { mutate: jest.fn(), isPending: false };
        (useCreateFencer as jest.Mock).mockReturnValue(createFencerMutation);

        const { getByText, getByPlaceholderText } = render(
            <EventSettings
                route={{
                    params: { event: mockEvent, onSave: jest.fn() },
                    key: 'test',
                    name: 'params',
                }}
            />
        );

        // Open fencer management
        fireEvent.press(getByText('Fencer Management'));

        // Fill in fencer details
        fireEvent.changeText(getByPlaceholderText('First Name'), 'Jane');
        fireEvent.changeText(getByPlaceholderText('Last Name'), 'Smith');

        // Submit the form
        await act(async () => {
            fireEvent.press(getByText('Add Fencer'));
        });

        expect(createFencerMutation.mutate).toHaveBeenCalledWith(
            expect.objectContaining({
                fencer: expect.objectContaining({
                    fname: 'Jane',
                    lname: 'Smith',
                }),
                event: mockEvent,
                addToEvent: true,
            })
        );
    });

    it('handles fencer removal', async () => {
        const removeFencerMutation = { mutate: jest.fn() };
        (useRemoveFencer as jest.Mock).mockReturnValue(removeFencerMutation);

        const { getByText } = render(
            <EventSettings
                route={{
                    params: { event: mockEvent, onSave: jest.fn() },
                    key: 'test',
                    name: 'params',
                }}
            />
        );

        // Open fencer management
        fireEvent.press(getByText('Fencer Management'));

        // Find and press the remove button for the fencer
        const removeButtons = document.querySelectorAll('x');
        fireEvent.press(removeButtons[0]);

        expect(removeFencerMutation.mutate).toHaveBeenCalledWith({
            fencer: mockFencers[0],
            event: mockEvent,
        });
    });

    it('handles adding new rounds', async () => {
        const addRoundMutation = { mutate: jest.fn() };
        (useAddRound as jest.Mock).mockReturnValue(addRoundMutation);

        const { getByText } = render(
            <EventSettings
                route={{
                    params: { event: mockEvent, onSave: jest.fn() },
                    key: 'test',
                    name: 'params',
                }}
            />
        );

        // Open round management
        fireEvent.press(getByText('Round Management'));

        // Add a new pool round
        fireEvent.press(getByText('Add Round'));
        fireEvent.press(getByText('Pools'));

        expect(addRoundMutation.mutate).toHaveBeenCalledWith(
            expect.objectContaining({
                eventid: mockEvent.id,
                type: 'pool',
                rorder: 2, // Second round since we already have one
            })
        );
    });

    it('handles CSV import', async () => {
        const createFencerMutation = { mutateAsync: jest.fn() };
        (useCreateFencer as jest.Mock).mockReturnValue(createFencerMutation);

        // Mock DocumentPicker and FileSystem
        (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
            uri: 'test-uri',
            type: 'success',
        });

        (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(
            'John,Doe\nJane,Smith'
        );

        const { getByText } = render(
            <EventSettings
                route={{
                    params: { event: mockEvent, onSave: jest.fn() },
                    key: 'test',
                    name: 'params',
                }}
            />
        );

        // Open fencer management
        fireEvent.press(getByText('Fencer Management'));

        // Find and press the upload CSV button
        await act(async () => {
            fireEvent.press(getByText('Upload CSV'));
        });

        expect(createFencerMutation.mutateAsync).toHaveBeenCalledTimes(2);
        expect(Alert.alert).toHaveBeenCalledWith('Success', 'Fencers imported successfully');
    });

    it('handles random fencer generation', async () => {
        const createFencerMutation = { mutateAsync: jest.fn() };
        (useCreateFencer as jest.Mock).mockReturnValue(createFencerMutation);

        const { getByText, getByPlaceholderText } = render(
            <EventSettings
                route={{
                    params: { event: mockEvent, onSave: jest.fn() },
                    key: 'test',
                    name: 'params',
                }}
            />
        );

        // Open fencer management
        fireEvent.press(getByText('Fencer Management'));

        // Open random fill input
        fireEvent.press(getByText('Random fill'));

        // Enter number of fencers
        fireEvent.changeText(getByPlaceholderText('Enter number of fencers'), '5');

        // Submit
        await act(async () => {
            fireEvent.press(getByText('Go'));
        });

        expect(createFencerMutation.mutateAsync).toHaveBeenCalledTimes(5);
    });
});
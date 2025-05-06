import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { CreateTournamentButton } from '../../../src/navigation/screens/CreateTournamentModal';
import { dbCreateTournament } from '../../../src/db/DrizzleDatabaseUtils';

// Mock the database utility
jest.mock('../../../src/db/DrizzleDatabaseUtils', () => ({
    dbCreateTournament: jest.fn(),
}));

// Mock expo vector icons
jest.mock('@expo/vector-icons', () => ({
    MaterialIcons: 'MaterialIcons',
}));

// Mock Alert.alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('CreateTournamentButton', () => {
    const mockOnTournamentCreated = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders create tournament button', () => {
        const { getByText } = render(<CreateTournamentButton onTournamentCreated={mockOnTournamentCreated} />);
        expect(getByText('createTournament')).toBeTruthy();
    });

    it('opens modal when create button is pressed', () => {
        const { getByText, getByPlaceholderText } = render(
            <CreateTournamentButton onTournamentCreated={mockOnTournamentCreated} />
        );

        fireEvent.press(getByText('createTournament'));
        expect(getByPlaceholderText('enterName')).toBeTruthy();
    });

    it('shows error when submitting empty tournament name', async () => {
        const { getByText, getByPlaceholderText } = render(
            <CreateTournamentButton onTournamentCreated={mockOnTournamentCreated} />
        );

        // Open modal
        fireEvent.press(getByText('createTournament'));

        // Submit without entering name
        fireEvent.press(getByText('submit'));

        expect(Alert.alert).toHaveBeenCalledWith('error', 'errorEmptyName');
        expect(dbCreateTournament).not.toHaveBeenCalled();
    });

    it('creates tournament successfully', async () => {
        const { getByText, getByPlaceholderText } = render(
            <CreateTournamentButton onTournamentCreated={mockOnTournamentCreated} />
        );

        // Open modal
        fireEvent.press(getByText('createTournament'));

        // Enter tournament name
        const input = getByPlaceholderText('enterName');
        fireEvent.changeText(input, 'Test Tournament');

        // Submit form
        fireEvent.press(getByText('submit'));

        await waitFor(() => {
            expect(dbCreateTournament).toHaveBeenCalledWith('Test Tournament');
            expect(mockOnTournamentCreated).toHaveBeenCalled();
        });
    });

    it('handles tournament creation error', async () => {
        // Mock the database call to fail
        (dbCreateTournament as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

        const { getByText, getByPlaceholderText } = render(
            <CreateTournamentButton onTournamentCreated={mockOnTournamentCreated} />
        );

        // Open modal
        fireEvent.press(getByText('createTournament'));

        // Enter tournament name
        const input = getByPlaceholderText('enterName');
        fireEvent.changeText(input, 'Test Tournament');

        // Submit form
        fireEvent.press(getByText('submit'));

        await waitFor(() => {
            expect(Alert.alert).toHaveBeenCalledWith('error', 'errorCreateFailed');
        });
    });

    it('closes modal and clears input when cancel is pressed', () => {
        const { getByText, getByPlaceholderText } = render(
            <CreateTournamentButton onTournamentCreated={mockOnTournamentCreated} />
        );

        // Open modal
        fireEvent.press(getByText('createTournament'));

        // Enter some text
        const input = getByPlaceholderText('enterName');
        fireEvent.changeText(input, 'Test Tournament');

        // Press cancel
        fireEvent.press(getByText('cancel'));

        // Reopen modal to verify input was cleared
        fireEvent.press(getByText('createTournament'));
        expect(getByPlaceholderText('enterName').props.value).toBe('');
    });
});
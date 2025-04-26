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
        const { getByText } = render(
            <CreateTournamentButton onTournamentCreated={mockOnTournamentCreated} />
        );
        expect(getByText('Create Tournament')).toBeTruthy();
    });

    it('opens modal when create button is pressed', () => {
        const { getByText, getByPlaceholderText } = render(
            <CreateTournamentButton onTournamentCreated={mockOnTournamentCreated} />
        );
        
        fireEvent.press(getByText('Create Tournament'));
        expect(getByPlaceholderText('Enter tournament name')).toBeTruthy();
    });

    it('shows error when submitting empty tournament name', async () => {
        const { getByText, getByPlaceholderText } = render(
            <CreateTournamentButton onTournamentCreated={mockOnTournamentCreated} />
        );
        
        // Open modal
        fireEvent.press(getByText('Create Tournament'));
        
        // Submit without entering name
        fireEvent.press(getByText('Submit'));

        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter a tournament name');
        expect(dbCreateTournament).not.toHaveBeenCalled();
    });

    it('creates tournament successfully', async () => {
        const { getByText, getByPlaceholderText } = render(
            <CreateTournamentButton onTournamentCreated={mockOnTournamentCreated} />
        );
        
        // Open modal
        fireEvent.press(getByText('Create Tournament'));
        
        // Enter tournament name
        const input = getByPlaceholderText('Enter tournament name');
        fireEvent.changeText(input, 'Test Tournament');
        
        // Submit form
        fireEvent.press(getByText('Submit'));

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
        fireEvent.press(getByText('Create Tournament'));
        
        // Enter tournament name
        const input = getByPlaceholderText('Enter tournament name');
        fireEvent.changeText(input, 'Test Tournament');
        
        // Submit form
        fireEvent.press(getByText('Submit'));

        await waitFor(() => {
            expect(Alert.alert).toHaveBeenCalledWith(
                'Error',
                'Failed to create tournament. It might already exist.'
            );
        });
    });

    it('closes modal and clears input when cancel is pressed', () => {
        const { getByText, getByPlaceholderText } = render(
            <CreateTournamentButton onTournamentCreated={mockOnTournamentCreated} />
        );
        
        // Open modal
        fireEvent.press(getByText('Create Tournament'));
        
        // Enter some text
        const input = getByPlaceholderText('Enter tournament name');
        fireEvent.changeText(input, 'Test Tournament');
        
        // Press cancel
        fireEvent.press(getByText('Cancel'));
        
        // Reopen modal to verify input was cleared
        fireEvent.press(getByText('Create Tournament'));
        expect(getByPlaceholderText('Enter tournament name').props.value).toBe('');
    });
});
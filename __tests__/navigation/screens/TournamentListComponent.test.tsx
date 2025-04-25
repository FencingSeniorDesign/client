import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { TournamentList } from '../../../src/navigation/screens/TournamentListComponent';
import { useAbility } from '../../../src/rbac/AbilityContext';
import { dbDeleteTournament } from '../../../src/db/DrizzleDatabaseUtils';

// Mock the dependencies
jest.mock('../../../src/rbac/AbilityContext');
jest.mock('../../../src/db/DrizzleDatabaseUtils');

// Mock navigation
jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({
        navigate: jest.fn(),
    }),
}));

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('TournamentList', () => {
    const mockTournaments = [
        { name: 'Tournament 1', isComplete: false },
        { name: 'Tournament 2', isComplete: true },
    ];

    const mockOnTournamentDeleted = jest.fn();
    const mockSetTournamentContext = jest.fn();
    const mockNavigation = require('@react-navigation/native').useNavigation();

    beforeEach(() => {
        jest.clearAllMocks();
        (useAbility as jest.Mock).mockReturnValue({
            setTournamentContext: mockSetTournamentContext,
        });
    });

    it('renders list of tournaments', () => {
        const { getByText } = render(
            <TournamentList
                tournaments={mockTournaments}
                onTournamentDeleted={mockOnTournamentDeleted}
                isComplete={false}
            />
        );

        expect(getByText('Tournament 1')).toBeTruthy();
        expect(getByText('Tournament 2')).toBeTruthy();
    });

    it('displays empty state message when no tournaments exist', () => {
        const { getByText } = render(
            <TournamentList
                tournaments={[]}
                onTournamentDeleted={mockOnTournamentDeleted}
                isComplete={false}
            />
        );

        expect(getByText('No tournaments created yet.')).toBeTruthy();
    });

    it('navigates to EventManagement when tournament is pressed', () => {
        const { getByText } = render(
            <TournamentList
                tournaments={mockTournaments}
                onTournamentDeleted={mockOnTournamentDeleted}
                isComplete={false}
            />
        );

        fireEvent.press(getByText('Tournament 1'));

        expect(mockSetTournamentContext).toHaveBeenCalledWith('Tournament 1');
        expect(mockNavigation.navigate).toHaveBeenCalledWith('EventManagement', {
            tournamentName: 'Tournament 1',
        });
    });

    it('shows delete confirmation when delete button is pressed', () => {
        const { getAllByText } = render(
            <TournamentList
                tournaments={mockTournaments}
                onTournamentDeleted={mockOnTournamentDeleted}
                isComplete={false}
            />
        );

        const deleteButtons = getAllByText('✖');
        fireEvent.press(deleteButtons[0]);

        expect(Alert.alert).toHaveBeenCalledWith(
            'Delete Tournament',
            'Are you sure you want to delete "Tournament 1"?',
            expect.any(Array)
        );
    });

    it('deletes tournament when confirmed', async () => {
        (dbDeleteTournament as jest.Mock).mockResolvedValue(undefined);

        const { getAllByText } = render(
            <TournamentList
                tournaments={mockTournaments}
                onTournamentDeleted={mockOnTournamentDeleted}
                isComplete={false}
            />
        );

        const deleteButtons = getAllByText('✖');
        fireEvent.press(deleteButtons[0]);

        // Find and press the delete confirmation button
        const alertButtons = (Alert.alert as jest.Mock).mock.calls[0][2];
        const confirmButton = alertButtons.find((button: any) => button.text === 'Delete');
        await confirmButton.onPress();

        expect(dbDeleteTournament).toHaveBeenCalledWith('Tournament 1');
        expect(mockOnTournamentDeleted).toHaveBeenCalled();
    });

    it('handles delete error', async () => {
        (dbDeleteTournament as jest.Mock).mockRejectedValue(new Error('Delete failed'));

        const { getAllByText } = render(
            <TournamentList
                tournaments={mockTournaments}
                onTournamentDeleted={mockOnTournamentDeleted}
                isComplete={false}
            />
        );

        const deleteButtons = getAllByText('✖');
        fireEvent.press(deleteButtons[0]);

        const alertButtons = (Alert.alert as jest.Mock).mock.calls[0][2];
        const confirmButton = alertButtons.find((button: any) => button.text === 'Delete');
        await confirmButton.onPress();

        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to delete the tournament');
    });

    it('applies history style to completed tournaments', () => {
        const { getByText } = render(
            <TournamentList
                tournaments={mockTournaments}
                onTournamentDeleted={mockOnTournamentDeleted}
                isComplete={true}
            />
        );

        const tournamentButton = getByText('Tournament 1').parent;
        expect(tournamentButton.props.style).toContainEqual(
            expect.objectContaining({
                backgroundColor: '#f5f5f5',
                borderLeftWidth: 4,
                borderLeftColor: '#888888',
            })
        );
    });
});
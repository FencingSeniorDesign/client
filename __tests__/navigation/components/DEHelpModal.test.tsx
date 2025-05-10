// __tests__/navigation/components/DEHelpModal.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import DEHelpModal from '../../../src/navigation/components/DEHelpModal';
import { DE_FORMATS } from '../../../src/navigation/utils/BracketFormats';

describe('DEHelpModal Component', () => {
    const mockOnClose = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the single elimination help content when format is single', () => {
        const { getByText } = render(<DEHelpModal visible={true} onClose={mockOnClose} format="single" />);

        // Check if the correct title is displayed
        expect(getByText('Single Elimination Format')).toBeTruthy();

        // Check some of the bullet points specific to single elimination
        expect(getByText(/Each fencer fences until they lose once, at which point they are eliminated./)).toBeTruthy();
        expect(
            getByText(/The bracket is structured to delay matches between top seeds until later rounds./)
        ).toBeTruthy();

        // Check the conclusion text
        expect(getByText('The winner is the fencer who wins all their bouts.')).toBeTruthy();
    });

    it('renders the double elimination help content when format is double', () => {
        const { getByText } = render(<DEHelpModal visible={true} onClose={mockOnClose} format="double" />);

        // Check if the correct title is displayed
        expect(getByText('Double Elimination Format')).toBeTruthy();

        // Check some of the bullet points specific to double elimination
        expect(getByText(/• Fencers start in the Winners Bracket./)).toBeTruthy();
        expect(getByText(/• When a fencer loses for the first time, they move to the Losers Bracket./)).toBeTruthy();

        // Check for content about the "bracket reset" which is unique to double elimination
        expect(
            getByText(/• If the Losers Bracket winner defeats the Winners Bracket winner, a "bracket reset"/)
        ).toBeTruthy();
    });

    it('renders the compass draw help content when format is compass', () => {
        const { getByText } = render(<DEHelpModal visible={true} onClose={mockOnClose} format="compass" />);

        // Check if the correct title is displayed
        expect(getByText('Compass Draw Format')).toBeTruthy();

        // Check the compass-specific content
        expect(getByText(/The compass draw has four brackets, named after compass directions:/)).toBeTruthy();
        expect(getByText(/• East: The main bracket \(original seeding\)/)).toBeTruthy();
        expect(getByText(/• North: For fencers who lose in the first round of East/)).toBeTruthy();

        // Check the conclusion text which is specific to compass format
        expect(getByText(/This format ensures all fencers get to fence multiple bouts/)).toBeTruthy();
    });

    it('displays all available formats in any mode', () => {
        const { getByText } = render(<DEHelpModal visible={true} onClose={mockOnClose} format="single" />);

        // Check that the section title exists
        expect(getByText('All Available Formats')).toBeTruthy();

        // Check that all format names from DE_FORMATS are displayed
        DE_FORMATS.forEach(format => {
            expect(getByText(format.name)).toBeTruthy();
            expect(getByText(format.description)).toBeTruthy();
        });
    });

    it('calls onClose when the close button is pressed', () => {
        const { getByText } = render(<DEHelpModal visible={true} onClose={mockOnClose} format="single" />);

        // Find and press the close button
        const closeButton = getByText('Close');
        fireEvent.press(closeButton);

        // Check if onClose was called
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
});

// __tests__/navigation/components/DEBoutCard.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import DEBoutCard from '../../../src/navigation/components/DEBoutCard';
import { Fencer } from '../../../src/navigation/navigation/types';

// Mock the Fencer data
const mockFencerA: Fencer = {
    id: 1,
    fname: 'John',
    lname: 'Doe',
    erating: 'A',
    eyear: 2023,
    frating: 'U',
    fyear: 2023,
    srating: 'U',
    syear: 2023,
};

const mockFencerB: Fencer = {
    id: 2,
    fname: 'Jane',
    lname: 'Smith',
    erating: 'B',
    eyear: 2022,
    frating: 'U',
    fyear: 2022,
    srating: 'U',
    syear: 2022,
};

describe('DEBoutCard Component', () => {
    const mockOnPress = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders a normal bout with two fencers correctly', () => {
        const { getByText } = render(
            <DEBoutCard
                id={1}
                fencerA={mockFencerA}
                fencerB={mockFencerB}
                scoreA={5}
                scoreB={3}
                seedA={1}
                seedB={8}
                onPress={mockOnPress}
            />
        );

        // Check if seeds are displayed
        expect(getByText('(1)')).toBeTruthy();
        expect(getByText('(8)')).toBeTruthy();

        // Check if scores are displayed
        expect(getByText('5')).toBeTruthy();
        expect(getByText('3')).toBeTruthy();
    });

    it('renders a completed bout with winner highlighted', () => {
        const { getByText } = render(
            <DEBoutCard
                id={1}
                fencerA={mockFencerA}
                fencerB={mockFencerB}
                scoreA={15}
                scoreB={10}
                winner={mockFencerA.id}
                onPress={mockOnPress}
            />
        );

        // Check if the completed badge is displayed
        expect(getByText('Completed')).toBeTruthy();
    });

    it('renders a bye bout correctly', () => {
        const { getByText } = render(
            <DEBoutCard id={1} fencerA={mockFencerA} fencerB={undefined} isBye={true} onPress={mockOnPress} />
        );

        // Check if the bye badge is displayed
        expect(getByText('Bye')).toBeTruthy();

        // Check if BYE text is displayed for the missing fencer
        expect(getByText('BYE')).toBeTruthy();
    });

    it('renders a TBD bout when both fencers are undefined', () => {
        const { getAllByText } = render(<DEBoutCard id={1} onPress={mockOnPress} />);

        // Check if TBD placeholders are displayed (there are multiple TBD elements)
        const tbdElements = getAllByText('TBD');
        expect(tbdElements.length).toBeGreaterThan(0);
    });

    it('handles onPress event when the bout is clickable', () => {
        const { getByTestId } = render(
            <DEBoutCard
                id={1}
                fencerA={mockFencerA}
                fencerB={mockFencerB}
                scoreA={5}
                scoreB={3}
                onPress={mockOnPress}
            />
        );

        // Use test ID to interact with the component
        const touchableElement = getByTestId('bout-card');
        fireEvent.press(touchableElement);

        // Check if onPress was called with the correct ID
        expect(mockOnPress).toHaveBeenCalledWith(1);
    });

    it('disables onPress when the bout is a bye', () => {
        const { getByTestId } = render(
            <DEBoutCard id={1} fencerA={mockFencerA} fencerB={undefined} isBye={true} onPress={mockOnPress} />
        );

        // Press the card
        const touchableElement = getByTestId('bout-card');
        fireEvent.press(touchableElement);

        // onPress should not be called for bye bouts
        expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('handles different bracket types with appropriate styling', () => {
        // Just testing that the component renders with different bracket types
        const { rerender } = render(
            <DEBoutCard
                id={1}
                fencerA={mockFencerA}
                fencerB={mockFencerB}
                bracketType="winners"
                onPress={mockOnPress}
            />
        );

        // Re-render with losers bracket
        rerender(
            <DEBoutCard id={1} fencerA={mockFencerA} fencerB={mockFencerB} bracketType="losers" onPress={mockOnPress} />
        );

        // Re-render with compass bracket
        rerender(
            <DEBoutCard
                id={1}
                fencerA={mockFencerA}
                fencerB={mockFencerB}
                bracketType="compass"
                onPress={mockOnPress}
            />
        );
    });
});

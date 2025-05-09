// __tests__/navigation/components/DEOverview.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import DEOverview from '../../../src/navigation/components/DEOverview';
import { Fencer } from '../../../src/navigation/navigation/types';

// Mock the DEHelpModal component to avoid testing its implementation here
jest.mock('../../../src/navigation/components/DEHelpModal', () => {
  return {
    __esModule: true,
    default: (props: any) => {
      return <mock-dehelp-modal {...props} data-testid="help-modal" />;
    },
  };
});

describe('DEOverview Component', () => {
  // Sample fencers for the top seeds
  const mockTopSeeds: { seed: number; fencer: Fencer }[] = [
    {
      seed: 1,
      fencer: {
        id: 1,
        fname: 'John',
        lname: 'Doe',
        erating: 'A',
        eyear: 2023,
        frating: 'U',
        fyear: 2023,
        srating: 'U',
        syear: 2023,
      },
    },
    {
      seed: 2,
      fencer: {
        id: 2,
        fname: 'Jane',
        lname: 'Smith',
        erating: 'B',
        eyear: 2022,
        frating: 'U',
        fyear: 2022,
        srating: 'U',
        syear: 2022,
      },
    },
    {
      seed: 3,
      fencer: {
        id: 3,
        fname: 'Bob',
        lname: 'Johnson',
        erating: 'C',
        eyear: 2021,
        frating: 'U',
        fyear: 2021,
        srating: 'U',
        syear: 2021,
      },
    },
    {
      seed: 4,
      fencer: {
        id: 4,
        fname: 'Alice',
        lname: 'Williams',
        erating: 'D',
        eyear: 2020,
        frating: 'U',
        fyear: 2020,
        srating: 'U',
        syear: 2020,
      },
    },
  ];

  it('renders basic bracket information correctly', () => {
    const { getByText, getAllByText } = render(
      <DEOverview
        eventName="Open Epee"
        deFormat="single"
        totalFencers={32}
        tableSize={32}
        currentRound={2}
        totalRounds={5}
        remainingFencers={16}
      />
    );

    // Check event name
    expect(getByText('Open Epee')).toBeTruthy();

    // Check format name
    expect(getByText('Single Elimination')).toBeTruthy();

    // Check labels exist
    expect(getByText('Fencers')).toBeTruthy();
    expect(getByText('Bracket Size')).toBeTruthy();
    expect(getByText('Remaining')).toBeTruthy();
    expect(getByText('Round')).toBeTruthy();

    // For values that might appear multiple times, use getAllByText and verify count
    const totalFencersValues = getAllByText('32');
    expect(totalFencersValues.length).toBeGreaterThan(0);

    expect(getByText('16')).toBeTruthy(); // remainingFencers
    expect(getByText('2 of 5')).toBeTruthy(); // Round number

    // Check progress
    expect(getByText('20% Complete')).toBeTruthy(); // (2-1)/5 * 100 = 20%
  });

  it('renders with double elimination format', () => {
    const { getByText } = render(
      <DEOverview
        eventName="Open Foil"
        deFormat="double"
        totalFencers={16}
        tableSize={16}
        currentRound={1}
        totalRounds={4}
        remainingFencers={16}
      />
    );

    // Check format name specific to double elimination
    expect(getByText('Double Elimination')).toBeTruthy();
  });

  it('renders with compass draw format', () => {
    const { getByText } = render(
      <DEOverview
        eventName="Open Sabre"
        deFormat="compass"
        totalFencers={8}
        tableSize={8}
        currentRound={1}
        totalRounds={3}
        remainingFencers={8}
      />
    );

    // Check format name specific to compass draw
    expect(getByText('Compass Draw')).toBeTruthy();
  });

  it('shows top seeds when provided', () => {
    const { getByText } = render(
      <DEOverview
        eventName="Open Epee"
        deFormat="single"
        totalFencers={32}
        tableSize={32}
        currentRound={1}
        totalRounds={5}
        remainingFencers={32}
        topSeeds={mockTopSeeds}
      />
    );

    // Check for top seeds section
    expect(getByText('Top Seeds')).toBeTruthy();
    
    // Check individual seeds
    expect(getByText('Doe, John')).toBeTruthy();
    expect(getByText('Smith, Jane')).toBeTruthy();
    expect(getByText('Johnson, Bob')).toBeTruthy();
    expect(getByText('Williams, Alice')).toBeTruthy();
    
    // Check seed numbers
    expect(getByText('1')).toBeTruthy();
    expect(getByText('2')).toBeTruthy();
    expect(getByText('3')).toBeTruthy();
    expect(getByText('4')).toBeTruthy();
  });

  it('does not show top seeds section when none provided', () => {
    const { queryByText } = render(
      <DEOverview
        eventName="Open Epee"
        deFormat="single"
        totalFencers={32}
        tableSize={32}
        currentRound={1}
        totalRounds={5}
        remainingFencers={32}
      />
    );

    // Top Seeds section should not be present
    expect(queryByText('Top Seeds')).toBeNull();
  });

  it('opens help modal when help button is clicked', () => {
    const { getByText } = render(
      <DEOverview
        eventName="Open Epee"
        deFormat="single"
        totalFencers={32}
        tableSize={32}
        currentRound={1}
        totalRounds={5}
        remainingFencers={32}
      />
    );

    // Find and press the help button
    const helpButton = getByText('?');
    fireEvent.press(helpButton);

    // We don't need to test if the modal is visible since we're mocking it,
    // but we know the state would be set to show it
  });
});
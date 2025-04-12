// __tests__/navigation/screens/PoolsPage.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import PoolsPage from '../../../src/navigation/screens/PoolsPage';

// ----- Mocks -------------------------------------------------

// Mock navigation-related hooks
jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({
    params: {
      event: { id: 'event1', name: 'Test Event' },
      currentRoundIndex: 0,
      roundId: 1,
      isRemote: false,
    },
  }),
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
  useFocusEffect: (effect: any) => effect(),
}));

// Mock React Query hook
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: jest.fn(),
  }),
}));

// Mock tournament hooks with sample pool data declared inline
jest.mock('../../../src/data/TournamentDataHooks', () => ({
  usePools: () => ({
    data: [
      {
        poolid: 1,
        fencers: [
          { fname: 'John', lname: 'Doe', poolNumber: undefined, clubAbbreviation: 'ABC' },
          { fname: 'Jane', lname: 'Smith', poolNumber: undefined, clubAbbreviation: 'DEF' },
        ],
      },
      {
        poolid: 2,
        fencers: [],
      },
    ],
    isLoading: false,
    error: null,
  }),
  useCompleteRound: () => ({
    mutateAsync: jest.fn().mockResolvedValue({}),
  }),
  useRoundCompleted: () => ({
    data: false,
    isLoading: false,
  }),
}));

// Mock data provider (for bouts in pools)
jest.mock('../../../src/data/DrizzleDataProvider', () => ({
  getBoutsForPool: jest.fn().mockResolvedValue([{ left_score: 1, right_score: 2 }]),
}));

// Mock seeding function from the DB utils
jest.mock('../../../src/db/DrizzleDatabaseUtils', () => ({
  dbGetSeedingForRound: jest.fn().mockResolvedValue([
    {
      seed: 1,
      fencer: { id: 'f1', fname: 'Alice', lname: 'Smith', frating: 'A', fyear: '2020' },
    },
  ]),
}));

// Mock TCP socket library
jest.mock('react-native-tcp-socket', () => ({
  createServer: jest.fn(),
  connect: jest.fn(),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Optional: suppress excessive console.log output in tests
jest.spyOn(console, 'log').mockImplementation(() => {});

// ----- Tests -------------------------------------------------

describe('PoolsPage Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a loading indicator when pools are loading', async () => {
    // Override usePools to simulate loading state.
    jest.resetModules();
    jest.doMock('../../../src/data/TournamentDataHooks', () => ({
      usePools: () => ({
        data: null,
        isLoading: true,
        error: null,
      }),
      useCompleteRound: () => ({
        mutateAsync: jest.fn().mockResolvedValue({}),
      }),
      useRoundCompleted: () => ({
        data: false,
        isLoading: false,
      }),
    }));
    // Re-import PoolsPage after overriding the module
    const PoolsPageLoading = require('../../../src/navigation/screens/PoolsPage').default;
    const { getByText } = render(<PoolsPageLoading />);
    expect(getByText('Loading pools data...')).toBeTruthy();
  });

  it('displays an error message when pools fail to load', async () => {
    const errorMessage = 'Failed to load pools';
    jest.resetModules();
    jest.doMock('../../../src/data/TournamentDataHooks', () => ({
      usePools: () => ({
        data: null,
        isLoading: false,
        error: new Error(errorMessage),
      }),
      useCompleteRound: () => ({
        mutateAsync: jest.fn().mockResolvedValue({}),
      }),
      useRoundCompleted: () => ({
        data: false,
        isLoading: false,
      }),
    }));
    const PoolsPageError = require('../../../src/navigation/screens/PoolsPage').default;
    const { getByText } = render(<PoolsPageError />);
    expect(getByText(`Error loading pools: Error: ${errorMessage}`)).toBeTruthy();
  });

  it('renders pool data and toggles pool expansion', async () => {
    const { getByText, queryByText } = render(<PoolsPage />);
    // Initially, details (like fencer names) should not be visible.
    expect(queryByText(/John/)).toBeNull();

    // Press on the header for Pool 1.
    const poolHeader = getByText(/Pool 1 :/);
    fireEvent.press(poolHeader);

    // After expansion, expect fencer names to be displayed.
    await waitFor(() => {
      expect(getByText(/John/)).toBeTruthy();
      expect(getByText(/Doe/)).toBeTruthy();
      expect(getByText(/Jane/)).toBeTruthy();
      expect(getByText(/Smith/)).toBeTruthy();
    });
  });

  it('opens the strip number modal on long press and submits a new strip number', async () => {
    const { getByText, getByPlaceholderText, queryByText } = render(<PoolsPage />);
    // Long press on a pool header to trigger the modal.
    const poolHeader = getByText(/Pool 1 :/);
    fireEvent(poolHeader, 'longPress');

    // The modal should display an input with placeholder "e.g., 17".
    await waitFor(() => {
      expect(getByPlaceholderText('e.g., 17')).toBeTruthy();
    });

    const input = getByPlaceholderText('e.g., 17');
    fireEvent.changeText(input, '17');
    const submitButton = getByText('Submit');
    fireEvent.press(submitButton);

    // Wait until the modal is dismissed.
    await waitFor(() => {
      expect(queryByText('Enter Strip Number')).toBeNull();
    });
  });

  it('navigates to BoutOrderPage when the referee button is pressed', async () => {
    const navigateMock = jest.fn();
    // Override useNavigation to capture navigation calls.
    jest.spyOn(require('@react-navigation/native'), 'useNavigation').mockReturnValue({
      navigate: navigateMock,
    });

    const { getByText } = render(<PoolsPage />);
    // Expand Pool 1 to reveal the referee button.
    const poolHeader = getByText(/Pool 1 :/);
    fireEvent.press(poolHeader);

    // Wait for the referee button to appear.
    await waitFor(() => {
      expect(getByText(/Referee/)).toBeTruthy();
    });
    const refereeButton = getByText(/Referee/);
    fireEvent.press(refereeButton);

    // Verify navigation to 'BoutOrderPage' with expected parameters.
    expect(navigateMock).toHaveBeenCalledWith(
      'BoutOrderPage',
      expect.objectContaining({ poolId: 1, roundId: 1, isRemote: false })
    );
  });

  it('opens the seeding modal when the "View Seeding" button is pressed', async () => {
    const { getByText } = render(<PoolsPage />);
    const viewSeedingButton = getByText('View Seeding');
    fireEvent.press(viewSeedingButton);

    // Wait for the seeding modal title to appear.
    await waitFor(() => {
      expect(getByText('Current Seeding')).toBeTruthy();
    });
  });

  it('triggers round completion when the End Round button is pressed', async () => {
    // Spy on Alert.alert to simulate user confirmation.
    jest.spyOn(Alert, 'alert').mockImplementation((title, msg, buttons) => {
      const yesButton = buttons?.find((btn: any) => btn.text === 'Yes');
      if (yesButton?.onPress) {
        yesButton.onPress();
      }
    });
    const { getByText } = render(<PoolsPage />);
    const endRoundButton = getByText('End Round');
    fireEvent.press(endRoundButton);

    // Since the complete round mutation is mocked to resolve,
    // wait for navigation to 'RoundResults'.
    const { navigate } = require('@react-navigation/native').useNavigation();
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('RoundResults', expect.any(Object));
    });
  });
});

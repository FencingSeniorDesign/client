import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ManageOfficials from '../../../src/navigation/screens/ManageOfficials';

// Mock the required hooks and modules
jest.mock('../../../src/data/TournamentDataHooks', () => ({
    useOfficials: () => ({ data: [], isLoading: false }),
    useReferees: () => ({ data: [], isLoading: false }),
    useAddOfficial: () => ({ mutateAsync: jest.fn(), isPending: false }),
    useAddReferee: () => ({ mutateAsync: jest.fn(), isPending: false }),
    useRemoveOfficial: () => ({ mutateAsync: jest.fn(), isPending: false }),
    useRemoveReferee: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock('../../../src/networking/NetworkUtils', () => ({
    getDeviceId: jest.fn(() => Promise.resolve('12345')),
}));

describe('ManageOfficials', () => {
    const mockNavigation: any = {
        navigate: jest.fn(),
    };

    const mockRoute: any = {
        params: {
            tournamentName: 'Test Tournament',
            isRemote: false,
        },
    };

    it('renders the title', () => {
        const { getByText } = render(<ManageOfficials navigation={mockNavigation} route={mockRoute} />);

        // Instead of looking for the dynamic title, just check that the title element exists
        expect(getByText('title')).toBeTruthy();
    });

    it('shows empty state messages when no officials or referees', () => {
        const { getByText } = render(<ManageOfficials navigation={mockNavigation} route={mockRoute} />);

        expect(getByText('noReferees')).toBeTruthy();
        expect(getByText('noOfficials')).toBeTruthy();
    });

    it('shows add buttons when not in remote mode', () => {
        const { getByText } = render(<ManageOfficials navigation={mockNavigation} route={mockRoute} />);

        expect(getByText('addReferee')).toBeTruthy();
        expect(getByText('addOfficial')).toBeTruthy();
    });

    it('opens add referee modal when Add Referee is clicked', () => {
        const { getByText, getByPlaceholderText } = render(
            <ManageOfficials navigation={mockNavigation} route={mockRoute} />
        );

        // Click the Add Referee button
        fireEvent.press(getByText('addReferee'));

        // Check if modal content is visible by verifying modal-specific elements
        expect(getByPlaceholderText('firstNameRequired')).toBeTruthy();
        expect(getByPlaceholderText('lastName')).toBeTruthy();
        expect(getByPlaceholderText('deviceIdInfo')).toBeTruthy();
        expect(getByText('useThisDevice')).toBeTruthy();
    });
});

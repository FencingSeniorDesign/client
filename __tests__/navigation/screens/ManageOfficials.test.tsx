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
    useRemoveReferee: () => ({ mutateAsync: jest.fn(), isPending: false })
}));

jest.mock('../../../src/networking/NetworkUtils', () => ({
    getDeviceId: jest.fn(() => Promise.resolve('12345'))
}));

describe('ManageOfficials', () => {
    const mockNavigation: any = {
        navigate: jest.fn()
    };

    const mockRoute: any = {
        params: {
            tournamentName: 'Test Tournament',
            isRemote: false
        }
    };

    it('renders the tournament name correctly', () => {
        const { getByText } = render(
            <ManageOfficials 
                navigation={mockNavigation} 
                route={mockRoute}
            />
        );

        expect(getByText('Manage Officials - Test Tournament')).toBeTruthy();
    });

    it('shows empty state messages when no officials or referees', () => {
        const { getByText } = render(
            <ManageOfficials 
                navigation={mockNavigation} 
                route={mockRoute}
            />
        );

        expect(getByText('No referees assigned')).toBeTruthy();
        expect(getByText('No tournament officials assigned')).toBeTruthy();
    });

    it('shows add buttons when not in remote mode', () => {
        const { getByText } = render(
            <ManageOfficials 
                navigation={mockNavigation} 
                route={mockRoute}
            />
        );

        expect(getByText('Add Referee')).toBeTruthy();
        expect(getByText('Add Official')).toBeTruthy();
    });

    it('opens add referee modal when Add Referee is clicked', () => {
        const { getByText, getByPlaceholderText } = render(
            <ManageOfficials 
                navigation={mockNavigation} 
                route={mockRoute}
            />
        );

        // Click the Add Referee button
        fireEvent.press(getByText('Add Referee'));

        // Check if modal content is visible by verifying modal-specific elements
        expect(getByPlaceholderText('First Name *')).toBeTruthy();
        expect(getByPlaceholderText('Last Name')).toBeTruthy();
        expect(getByPlaceholderText('Device ID (5 characters)')).toBeTruthy();
        expect(getByText('Use This Device')).toBeTruthy();
    });
});
import React from 'react';
import { render } from '@testing-library/react-native';
import CompassDrawPage from '../../../src/navigation/screens/CompassDrawPage';

describe('CompassDrawPage', () => {
    it('renders correctly', () => {
        const { getByText } = render(<CompassDrawPage />);
        expect(getByText('tbd')).toBeTruthy();
    });

    it('applies correct styles', () => {
        const { getByText, getByTestId } = render(<CompassDrawPage />);
        const tbdText = getByText('tbd');

        // Use toHaveStyle for style assertions
        expect(tbdText).toHaveStyle({ fontSize: 24 });

        // If container has no testID, modify CompassDrawPage to add one
        const container = getByTestId('compass-container');
        expect(container).toHaveStyle({
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        });
    });
});

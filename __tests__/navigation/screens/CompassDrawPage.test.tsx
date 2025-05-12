import React from 'react';
import { render } from '@testing-library/react-native';
import CompassDrawPage from '../../../src/navigation/screens/CompassDrawPage';

describe('CompassDrawPage', () => {
    it('renders correctly', () => {
        const { getByText } = render(<CompassDrawPage />);
        expect(getByText('tbd')).toBeTruthy();
    });

    it('applies correct styles', () => {
        const { getByText } = render(<CompassDrawPage />);
        const tbdText = getByText('tbd');

        // Get the View container (parent of the Text component)
        const container = tbdText.parent.parent;

        // Verify text styling
        expect(tbdText.props.style).toEqual({
            fontSize: 24,
        });

        // Verify container styling
        expect(container.props.style).toEqual({
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        });
    });
});

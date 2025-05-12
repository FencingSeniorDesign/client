import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CustomTimeModal } from '../../../../src/navigation/screens/RefereeModule/CustomTimeModal';

describe('CustomTimeModal', () => {
    const defaultProps = {
        visible: true,
        onClose: jest.fn(),
        onSetTime: jest.fn(),
        onSetCustomTime: jest.fn(),
        customMinutes: '',
        customSeconds: '',
        setCustomMinutes: jest.fn(),
        setCustomSeconds: jest.fn(),
        onKawaiiMode: jest.fn(),
        onRevertLastPoint: jest.fn(),
        kawaiiMode: false,
        canRevertLastPoint: true,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders correctly with all options', () => {
        const { getByText } = render(<CustomTimeModal {...defaultProps} />);

        // Check if title and preset times are displayed
        expect(getByText('setTimerDuration')).toBeTruthy();
        expect(getByText('oneMinute')).toBeTruthy();
        expect(getByText('threeMinutes')).toBeTruthy();
        expect(getByText('fiveMinutes')).toBeTruthy();

        // Check if custom time option is displayed
        expect(getByText('customTime:')).toBeTruthy();
        expect(getByText('setCustomTime')).toBeTruthy();

        // Check if kawaii mode button is displayed
        expect(getByText('kawaiiMode')).toBeTruthy();

        // Check if revert last point button is displayed
        expect(getByText('revertLastPoint')).toBeTruthy();

        // Check if back button is displayed
        expect(getByText('back')).toBeTruthy();
    });

    it('calls onSetTime with 1 when one minute button is pressed', () => {
        const { getByText } = render(<CustomTimeModal {...defaultProps} />);

        // Press the one minute button
        fireEvent.press(getByText('oneMinute'));

        // Check if onSetTime was called with 1
        expect(defaultProps.onSetTime).toHaveBeenCalledWith(1);
    });

    it('calls onSetTime with 3 when three minutes button is pressed', () => {
        const { getByText } = render(<CustomTimeModal {...defaultProps} />);

        // Press the three minutes button
        fireEvent.press(getByText('threeMinutes'));

        // Check if onSetTime was called with 3
        expect(defaultProps.onSetTime).toHaveBeenCalledWith(3);
    });

    it('calls onSetTime with 5 when five minutes button is pressed', () => {
        const { getByText } = render(<CustomTimeModal {...defaultProps} />);

        // Press the five minutes button
        fireEvent.press(getByText('fiveMinutes'));

        // Check if onSetTime was called with 5
        expect(defaultProps.onSetTime).toHaveBeenCalledWith(5);
    });

    it('calls onSetCustomTime when set custom time button is pressed', () => {
        const customProps = {
            ...defaultProps,
            customMinutes: '2',
            customSeconds: '30',
        };

        const { getByText } = render(<CustomTimeModal {...customProps} />);

        // Press the set custom time button
        fireEvent.press(getByText('setCustomTime'));

        // Check if onSetCustomTime was called with correct values
        expect(defaultProps.onSetCustomTime).toHaveBeenCalledWith(2, 30);
    });

    it('handles empty custom time inputs', () => {
        const { getByText } = render(<CustomTimeModal {...defaultProps} />);

        // Press the set custom time button with empty inputs
        fireEvent.press(getByText('setCustomTime'));

        // Should default to 0, 0
        expect(defaultProps.onSetCustomTime).toHaveBeenCalledWith(0, 0);
    });

    it('calls onKawaiiMode when kawaii mode button is pressed', () => {
        const { getByText } = render(<CustomTimeModal {...defaultProps} />);

        // Press the kawaii mode button
        fireEvent.press(getByText('kawaiiMode'));

        // Check if onKawaiiMode was called
        expect(defaultProps.onKawaiiMode).toHaveBeenCalled();
    });

    it('calls onRevertLastPoint when revert last point button is pressed and points can be reverted', () => {
        const { getByText } = render(<CustomTimeModal {...defaultProps} />);

        // Press the revert last point button
        fireEvent.press(getByText('revertLastPoint'));

        // Check if onRevertLastPoint was called
        expect(defaultProps.onRevertLastPoint).toHaveBeenCalled();
        // Also should close the modal
        expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('does not call onRevertLastPoint when button is pressed but no points can be reverted', () => {
        const disabledProps = {
            ...defaultProps,
            canRevertLastPoint: false,
        };

        const { getByText } = render(<CustomTimeModal {...disabledProps} />);

        // Press the revert last point button
        fireEvent.press(getByText('revertLastPoint'));

        // Check that onRevertLastPoint was not called
        expect(defaultProps.onRevertLastPoint).not.toHaveBeenCalled();
        // Modal should not close
        expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    it('calls onClose when back button is pressed', () => {
        const { getByText } = render(<CustomTimeModal {...defaultProps} />);

        // Press the back button
        fireEvent.press(getByText('back'));

        // Check if onClose was called
        expect(defaultProps.onClose).toHaveBeenCalled();
    });
});

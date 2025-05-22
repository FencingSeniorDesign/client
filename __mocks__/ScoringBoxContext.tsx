import React, { ReactNode } from 'react';
import { ConnectionState, ScoringBoxType } from '../src/networking/ble/types';

const mockScoringBoxContext = {
    connectionState: 'disconnected' as ConnectionState,
    connectedBoxType: null as ScoringBoxType | null,
    connectedDeviceName: null as string | null,
    initialSyncCompleted: false,
    scan: jest.fn().mockResolvedValue([]),
    cancelScan: jest.fn(),
    connect: jest.fn().mockResolvedValue(true),
    disconnect: jest.fn().mockResolvedValue(undefined),
    selectDataSource: jest.fn().mockResolvedValue(undefined),
    sendScoreToBox: jest.fn().mockResolvedValue(undefined),
    sendTimerToBox: jest.fn().mockResolvedValue(undefined),
    startTimer: jest.fn().mockResolvedValue(undefined),
    stopTimer: jest.fn().mockResolvedValue(undefined),
    resetTimer: jest.fn().mockResolvedValue(undefined),
    setCallbacks: jest.fn(),
};

export const useScoringBoxContext = jest.fn(() => mockScoringBoxContext);

export const ScoringBoxProvider = ({ children }: { children: ReactNode }) => {
    return <>{children}</>;
};

export default mockScoringBoxContext;
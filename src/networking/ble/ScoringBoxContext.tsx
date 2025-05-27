import React, { createContext, useContext, useState, useRef, useCallback, ReactNode } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
    ScoringBoxType,
    ConnectionState,
    BoxCallbacks,
    ScoreUpdate,
    TimerUpdate,
    IScoringBoxService,
    BLEDevice,
} from './types';
import { TournaFenceBoxService } from './TournaFenceBoxService';
import { EnPointeBoxService } from './EnPointeBoxService';
import { SkeweredBoxService } from './SkeweredBoxService';

interface ScoringBoxContextType {
    connectionState: ConnectionState;
    connectedBoxType: ScoringBoxType | null;
    connectedDeviceName: string | null;
    connectedDeviceId: string | null;
    initialSyncCompleted: boolean;
    scan: (boxType: ScoringBoxType) => Promise<BLEDevice[]>;
    cancelScan: () => void;
    connect: (boxType: ScoringBoxType, deviceId: string) => Promise<boolean>;
    disconnect: () => Promise<void>;
    selectDataSource: (source: 'app' | 'box') => Promise<void>;
    sendScoreToBox: (leftScore: number, rightScore: number) => Promise<void>;
    sendTimerToBox: (timeMs: number, isRunning: boolean) => Promise<void>;
    startTimer: () => Promise<void>;
    stopTimer: () => Promise<void>;
    resetTimer: (timeMs: number) => Promise<void>;
    setCallbacks: (callbacks: BoxCallbacks) => void;
}

const ScoringBoxContext = createContext<ScoringBoxContextType | null>(null);

export function useScoringBoxContext() {
    const context = useContext(ScoringBoxContext);
    if (!context) {
        throw new Error('useScoringBoxContext must be used within a ScoringBoxProvider');
    }
    return context;
}

interface ScoringBoxProviderProps {
    children: ReactNode;
}

export function ScoringBoxProvider({ children }: ScoringBoxProviderProps) {
    const { t } = useTranslation();
    const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
    const [connectedBoxType, setConnectedBoxType] = useState<ScoringBoxType | null>(null);
    const [connectedDeviceName, setConnectedDeviceName] = useState<string | null>(null);
    const [connectedDeviceId, setConnectedDeviceId] = useState<string | null>(null);
    const [initialSyncCompleted, setInitialSyncCompleted] = useState(false);

    const boxService = useRef<IScoringBoxService | null>(null);
    const callbacks = useRef<BoxCallbacks | null>(null);

    const handleConnectionStateChange = useCallback((state: ConnectionState) => {
        setConnectionState(state);

        if (state === ConnectionState.DISCONNECTED) {
            setConnectedBoxType(null);
            setConnectedDeviceName(null);
            setConnectedDeviceId(null);
            setInitialSyncCompleted(false);
        }
    }, []);

    const handleError = useCallback(
        (error: Error) => {
            console.error('BLE Error:', error);
        },
        [t]
    );

    const createBoxService = (type: ScoringBoxType): IScoringBoxService => {
        switch (type) {
            case ScoringBoxType.TOURNAFENCE:
                return new TournaFenceBoxService();
            case ScoringBoxType.ENPOINTE:
                return new EnPointeBoxService();
            case ScoringBoxType.SKEWERED:
                return new SkeweredBoxService();
            default:
                throw new Error(`Unknown box type: ${type}`);
        }
    };

    const setCallbacks = useCallback(
        (newCallbacks: BoxCallbacks) => {
            callbacks.current = newCallbacks;

            // If we already have a service, update its callbacks
            if (boxService.current) {
                const mergedCallbacks: BoxCallbacks = {
                    ...newCallbacks,
                    onConnectionStateChange: handleConnectionStateChange,
                    onError: handleError,
                };
                boxService.current.setCallbacks(mergedCallbacks);
            }
        },
        [handleConnectionStateChange, handleError]
    );

    const scan = async (boxType: ScoringBoxType) => {
        try {
            // Create new service instance
            const service = createBoxService(boxType);
            boxService.current = service;

            // Set up callbacks
            const mergedCallbacks: BoxCallbacks = {
                ...callbacks.current!,
                onConnectionStateChange: handleConnectionStateChange,
                onError: handleError,
            };

            service.setCallbacks(mergedCallbacks);

            // Scan for devices
            const devices = await service.scan();
            return devices;
        } catch (error) {
            console.error('Scan error:', error);
            throw error;
        }
    };

    const cancelScan = () => {
        if (boxService.current) {
            boxService.current.cancelScan();
        }
    };

    const connect = async (boxType: ScoringBoxType, deviceId: string) => {
        try {
            // Disconnect from current box if connected
            if (boxService.current && connectionState === ConnectionState.CONNECTED) {
                await disconnect();
            }

            // Get the existing service instance or create new one
            if (!boxService.current || boxService.current.type !== boxType) {
                const service = createBoxService(boxType);
                boxService.current = service;

                // Set up callbacks
                const mergedCallbacks: BoxCallbacks = {
                    ...callbacks.current!,
                    onConnectionStateChange: handleConnectionStateChange,
                    onError: handleError,
                };

                service.setCallbacks(mergedCallbacks);
            }

            // Connect to specific device
            await boxService.current.connect(deviceId);

            setConnectedBoxType(boxType);
            setConnectedDeviceName(boxService.current.state.deviceName || 'Unknown Device');
            setConnectedDeviceId(deviceId);

            // Return true to indicate we need to show data source dialog
            return true;
        } catch (error) {
            console.error('Connection error:', error);
            throw error;
        }
    };

    const disconnect = async () => {
        if (boxService.current) {
            await boxService.current.disconnect();
            boxService.current = null;
        }
        setInitialSyncCompleted(false);
    };

    const selectDataSource = async (source: 'app' | 'box') => {
        if (!initialSyncCompleted && boxService.current && connectionState === ConnectionState.CONNECTED) {
            try {
                if (source === 'app') {
                    // App is the source - the component using this context will handle syncing
                    // This is a placeholder for when the component needs to sync its state
                } else {
                    // Box is the source - request current status from the box
                    if (boxService.current.type === ScoringBoxType.TOURNAFENCE) {
                        // TournaFence box supports getStatus command
                        const tournaFenceService = boxService.current as TournaFenceBoxService;
                        await tournaFenceService.getStatus();
                    }
                    // For other box types, we'll receive updates via notifications
                }
                setInitialSyncCompleted(true);
            } catch (error) {
                console.error('Failed to perform initial sync:', error);
                throw error;
            }
        }
    };

    // Send score commands to box
    const sendScoreToBox = useCallback(
        async (leftScore: number, rightScore: number) => {
            if (boxService.current && connectionState === ConnectionState.CONNECTED) {
                try {
                    await boxService.current.sendScore(leftScore, rightScore);
                } catch (error) {
                    console.error('Failed to send score to box:', error);
                }
            }
        },
        [connectionState]
    );

    // Send timer commands to box
    const sendTimerToBox = useCallback(
        async (timeMs: number, isRunning: boolean) => {
            if (boxService.current && connectionState === ConnectionState.CONNECTED) {
                try {
                    await boxService.current.sendTimer(timeMs, isRunning);
                } catch (error) {
                    console.error('Failed to send timer to box:', error);
                }
            }
        },
        [connectionState]
    );

    // Timer control methods
    const startTimer = useCallback(async () => {
        if (boxService.current && connectionState === ConnectionState.CONNECTED) {
            try {
                await boxService.current.startTimer();
            } catch (error) {
                console.error('Failed to start timer:', error);
            }
        }
    }, [connectionState]);

    const stopTimer = useCallback(async () => {
        if (boxService.current && connectionState === ConnectionState.CONNECTED) {
            try {
                await boxService.current.stopTimer();
            } catch (error) {
                console.error('Failed to stop timer:', error);
            }
        }
    }, [connectionState]);

    const resetTimer = useCallback(
        async (timeMs: number) => {
            if (boxService.current && connectionState === ConnectionState.CONNECTED) {
                try {
                    await boxService.current.resetTimer(timeMs);
                } catch (error) {
                    console.error('Failed to reset timer:', error);
                }
            }
        },
        [connectionState]
    );

    const value: ScoringBoxContextType = {
        connectionState,
        connectedBoxType,
        connectedDeviceName,
        connectedDeviceId,
        initialSyncCompleted,
        scan,
        cancelScan,
        connect,
        disconnect,
        selectDataSource,
        sendScoreToBox,
        sendTimerToBox,
        startTimer,
        stopTimer,
        resetTimer,
        setCallbacks,
    };

    return <ScoringBoxContext.Provider value={value}>{children}</ScoringBoxContext.Provider>;
}

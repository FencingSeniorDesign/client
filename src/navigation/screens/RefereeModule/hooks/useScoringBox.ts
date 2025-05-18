import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
    ScoringBoxType,
    ConnectionState,
    BoxCallbacks,
    ScoreUpdate,
    TimerUpdate,
    IScoringBoxService,
} from '../../../../networking/ble/types';
import { TournaFenceBoxService } from '../../../../networking/ble/TournaFenceBoxService';
import { EnPointeBoxService } from '../../../../networking/ble/EnPointeBoxService';
import { SkeweredBoxService } from '../../../../networking/ble/SkeweredBoxService';

interface UseScoringBoxProps {
    onScoreUpdate: (leftScore: number, rightScore: number) => void;
    onTimerUpdate: (timeMs: number, isRunning: boolean) => void;
    onPassivityTimerUpdate?: (timeMs: number, isRunning: boolean) => void;
    currentScore: { left: number; right: number };
    currentTimerMs: number;
    timerRunning: boolean;
}

export function useScoringBox({
    onScoreUpdate,
    onTimerUpdate,
    onPassivityTimerUpdate,
    currentScore,
    currentTimerMs,
    timerRunning,
}: UseScoringBoxProps) {
    const { t } = useTranslation();
    const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
    const [connectedBoxType, setConnectedBoxType] = useState<ScoringBoxType | null>(null);
    const [connectedDeviceName, setConnectedDeviceName] = useState<string | null>(null);
    const [initialSyncCompleted, setInitialSyncCompleted] = useState(false);

    const boxService = useRef<IScoringBoxService | null>(null);
    const scoreRef = useRef(currentScore);
    const timerRef = useRef({ timeMs: currentTimerMs, isRunning: timerRunning });

    // Update refs when props change
    useEffect(() => {
        scoreRef.current = currentScore;
    }, [currentScore]);

    useEffect(() => {
        timerRef.current = { timeMs: currentTimerMs, isRunning: timerRunning };
    }, [currentTimerMs, timerRunning]);

    const handleScoreUpdate = useCallback(
        (update: ScoreUpdate) => {
            // Always update app state from box notifications
            let newLeftScore = scoreRef.current.left;
            let newRightScore = scoreRef.current.right;

            if (update.fencer === 'left') {
                newLeftScore++;
            } else if (update.fencer === 'right') {
                newRightScore++;
            } else if (update.fencer === 'both') {
                newLeftScore++;
                newRightScore++;
            }

            onScoreUpdate(newLeftScore, newRightScore);
        },
        [onScoreUpdate]
    );

    const handleTimerUpdate = useCallback(
        (update: TimerUpdate) => {
            // Always update app state from box notifications
            onTimerUpdate(update.timeMs, update.isRunning);
        },
        [onTimerUpdate]
    );

    const handlePassivityTimerUpdate = useCallback(
        (update: TimerUpdate) => {
            // Always update app state from box notifications
            if (onPassivityTimerUpdate) {
                onPassivityTimerUpdate(update.timeMs, update.isRunning);
            }
        },
        [onPassivityTimerUpdate]
    );

    const handleConnectionStateChange = useCallback((state: ConnectionState) => {
        setConnectionState(state);

        if (state === ConnectionState.DISCONNECTED) {
            setConnectedBoxType(null);
            setConnectedDeviceName(null);
        }
    }, []);

    const handleError = useCallback(
        (error: Error) => {
            console.error('BLE Error:', error);
            Alert.alert(t('ble.error'), error.message);
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

    const scan = async (boxType: ScoringBoxType) => {
        try {
            // Create new service instance
            const service = createBoxService(boxType);
            boxService.current = service;

            // Set up callbacks
            const callbacks: BoxCallbacks = {
                onScoreUpdate: handleScoreUpdate,
                onTimerUpdate: handleTimerUpdate,
                onPassivityTimerUpdate: handlePassivityTimerUpdate,
                onConnectionStateChange: handleConnectionStateChange,
                onError: handleError,
            };

            service.setCallbacks(callbacks);

            // Scan for devices
            const devices = await service.scan();
            return devices; // Return list of found devices
        } catch (error) {
            console.error('Scan error:', error);
            Alert.alert(t('ble.scanFailed'), error.message);
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
                const callbacks: BoxCallbacks = {
                    onScoreUpdate: handleScoreUpdate,
                    onTimerUpdate: handleTimerUpdate,
                    onPassivityTimerUpdate: handlePassivityTimerUpdate,
                    onConnectionStateChange: handleConnectionStateChange,
                    onError: handleError,
                };

                service.setCallbacks(callbacks);
            }

            // Connect to specific device
            await boxService.current.connect(deviceId);

            setConnectedBoxType(boxType);
            setConnectedDeviceName(boxService.current.state.deviceName || 'Unknown Device');

            // Return true to indicate we need to show data source dialog
            return true;
        } catch (error) {
            console.error('Connection error:', error);
            Alert.alert(t('ble.connectionFailed'), error.message);
            throw error; // Re-throw to let the modal handle the error
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
                    // Sync current app state to the box
                    await boxService.current.sendScore(scoreRef.current.left, scoreRef.current.right);

                    // Use resetTimer to actually update the time on the box
                    await boxService.current.resetTimer(timerRef.current.timeMs);

                    // If the timer was running in the app, start it on the box
                    if (timerRef.current.isRunning) {
                        await boxService.current.startTimer();
                    }
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

    // Clean up on unmount
    useEffect(() => {
        return () => {
            disconnect();
        };
    }, []);

    return {
        connectionState,
        connectedBoxType,
        connectedDeviceName,
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
    };
}

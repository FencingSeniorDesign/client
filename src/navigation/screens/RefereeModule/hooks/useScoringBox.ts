import { useEffect, useRef } from 'react';
import { useScoringBoxContext } from '../../../../networking/ble/ScoringBoxContext';
import { BoxCallbacks, ScoreUpdate, TimerUpdate } from '../../../../networking/ble/types';

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
    const context = useScoringBoxContext();
    const scoreRef = useRef(currentScore);
    const timerRef = useRef({ timeMs: currentTimerMs, isRunning: timerRunning });

    // Update refs when props change
    useEffect(() => {
        scoreRef.current = currentScore;
    }, [currentScore]);

    useEffect(() => {
        timerRef.current = { timeMs: currentTimerMs, isRunning: timerRunning };
    }, [currentTimerMs, timerRunning]);

    // Set callbacks for this component
    useEffect(() => {
        const callbacks: BoxCallbacks = {
            onScoreUpdate: (update: ScoreUpdate) => {
                // Always update app state from box notifications
                let newLeftScore = scoreRef.current.left;
                let newRightScore = scoreRef.current.right;

                // Hardware left/right is swapped from UI left/right
                if (update.fencer === 'left') {
                    // Hardware left touch should increment UI right fencer
                    newRightScore++;
                } else if (update.fencer === 'right') {
                    // Hardware right touch should increment UI left fencer  
                    newLeftScore++;
                } else if (update.fencer === 'both') {
                    newLeftScore++;
                    newRightScore++;
                }

                onScoreUpdate(newLeftScore, newRightScore);
            },
            onTimerUpdate: (update: TimerUpdate) => {
                // Always update app state from box notifications
                onTimerUpdate(update.timeMs, update.isRunning);
            },
            onPassivityTimerUpdate: (update: TimerUpdate) => {
                // Always update app state from box notifications
                if (onPassivityTimerUpdate) {
                    onPassivityTimerUpdate(update.timeMs, update.isRunning);
                }
            },
            onConnectionStateChange: () => {
                // Connection state is managed by context
            },
            onError: () => {
                // Error handling is managed by context
            },
        };

        context.setCallbacks(callbacks);
    }, [context, onScoreUpdate, onTimerUpdate, onPassivityTimerUpdate]);

    // Override selectDataSource to handle app source syncing
    const selectDataSource = async (source: 'app' | 'box') => {
        if (source === 'app') {
            // Sync current app state to the box
            // Hardware left/right is swapped from UI left/right, so swap when sending
            await context.sendScoreToBox(scoreRef.current.right, scoreRef.current.left);

            // Use resetTimer to actually update the time on the box
            await context.resetTimer(timerRef.current.timeMs);

            // If the timer was running in the app, start it on the box
            if (timerRef.current.isRunning) {
                await context.startTimer();
            }
        }

        // Call the base selectDataSource from context
        await context.selectDataSource(source);
    };

    // Return the context methods with our overrides
    return {
        connectionState: context.connectionState,
        connectedBoxType: context.connectedBoxType,
        connectedDeviceName: context.connectedDeviceName,
        initialSyncCompleted: context.initialSyncCompleted,
        scan: context.scan,
        cancelScan: context.cancelScan,
        connect: context.connect,
        disconnect: context.disconnect,
        selectDataSource,
        sendScoreToBox: context.sendScoreToBox,
        sendTimerToBox: context.sendTimerToBox,
        startTimer: context.startTimer,
        stopTimer: context.stopTimer,
        resetTimer: context.resetTimer,
    };
}

import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as Sentry from '@sentry/react-native';
import { socketService } from '../services/socket.service';
import { tokenStorage } from '../features/auth/utils/tokenStorage';
import { ACTIVE_RIDE_KEY } from '../services/location/backgroundLocationTask';
import { flushOfflineLocationQueue, resetFlushBackoff } from '../services/location/offlineLocationQueue';

/**
 * Reads the freshest access token from storage and connects. We deliberately
 * do NOT trust a token value handed down from a parent component's state —
 * that value is only set once (e.g. on login/isLoggedIn change) and goes
 * stale the moment a background 401 triggers a refresh elsewhere. Reading
 * SecureStore right before every connect attempt means we always hand the
 * gateway the token that's actually current, avoiding needless
 * unauthorized-connect/disconnect churn around each ~15m token expiry.
 */
async function connectWithLatestToken() {
    const token = await tokenStorage.getAccessToken();
    if (token && !socketService.isConnected()) {
        socketService.connect(token);
    }
}

/**
 * Manages the socket connection lifecycle.
 * - Connects on mount (and whenever `enabled` becomes true)
 * - Reconnects when app comes to foreground
 * - Disconnects when app goes to background
 * Returns isConnected boolean.
 */
export function useSocketConnection(enabled: boolean) {
    const [isConnected, setIsConnected] = useState(socketService.isConnected());
    const appStateRef = useRef<AppStateStatus>(AppState.currentState);

    useEffect(() => {
        if (!enabled) return;

        connectWithLatestToken();

        const onConnect = () => setIsConnected(true);
        const onDisconnect = () => setIsConnected(false);
        socketService.on('connect', onConnect);
        socketService.on('disconnect', onDisconnect);

        const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
            const prev = appStateRef.current;
            appStateRef.current = nextState;

            Sentry.logger.info('[AppState] transition', { from: prev, to: nextState });

            if (nextState === 'active' && prev !== 'active') {
                // Came to foreground — reconnect (with the latest token) if needed
                connectWithLatestToken();
                // Clear any backoff that built up during a background network
                // outage so the queue flushes immediately on foreground.
                resetFlushBackoff();
                flushOfflineLocationQueue().catch(() => null);
            } else if (nextState === 'background') {
                // Keep the socket alive while a ride is in progress so that
                // the background location task can continue emitting via it.
                //
                // ⚠️  Race guard: requesting background location permission causes
                // a brief AppState → 'background' transition before ACTIVE_RIDE_KEY
                // is written. Reading immediately can return null even though a ride
                // is starting. We do a first check then recheck after 1.5 s to close
                // the window before deciding to disconnect.
                AsyncStorage.getItem(ACTIVE_RIDE_KEY).then((activeRideId) => {
                    if (activeRideId) {
                        Sentry.logger.info('[AppState] backgrounded — keeping socket alive', {
                            tripId: activeRideId,
                        });
                        return; // ride already active — keep socket alive
                    }
                    // Not set yet — wait and recheck before disconnecting
                    setTimeout(() => {
                        AsyncStorage.getItem(ACTIVE_RIDE_KEY).then((recheckId) => {
                            if (!recheckId) {
                                Sentry.logger.info('[AppState] backgrounded — no active ride, disconnecting socket');
                                socketService.disconnect();
                                setIsConnected(false);
                            } else {
                                Sentry.logger.info('[AppState] backgrounded — active ride appeared on recheck, keeping socket alive', {
                                    tripId: recheckId,
                                });
                            }
                        });
                    }, 1500);
                });
            }
        });

        return () => {
            socketService.off('connect', onConnect);
            socketService.off('disconnect', onDisconnect);
            subscription.remove();
        };
    }, [enabled]);

    // Reconnect socket when network comes back online
    useEffect(() => {
        if (!enabled) return;
        return NetInfo.addEventListener((state) => {
            if (state.isConnected) {
                Sentry.logger.info('[NetInfo] connectivity restored', { type: state.type });
                connectWithLatestToken();
                flushOfflineLocationQueue().catch(() => null);
            }
        });
    }, [enabled]);

    return { isConnected };
}

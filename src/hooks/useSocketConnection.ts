import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { socketService } from '../services/socket.service';
import { ACTIVE_RIDE_KEY } from '../services/location/backgroundLocationTask';
import { flushOfflineLocationQueue } from '../services/location/offlineLocationQueue';

/**
 * Manages the socket connection lifecycle.
 * - Connects on mount with the provided token
 * - Reconnects when app comes to foreground
 * - Disconnects when app goes to background
 * Returns isConnected boolean.
 */
export function useSocketConnection(token: string | null | undefined) {
    const [isConnected, setIsConnected] = useState(socketService.isConnected());
    const appStateRef = useRef<AppStateStatus>(AppState.currentState);

    useEffect(() => {
        if (!token) return;

        if (!socketService.isConnected()) {
            socketService.connect(token);
        }

        const onConnect = () => setIsConnected(true);
        const onDisconnect = () => setIsConnected(false);
        socketService.on('connect', onConnect);
        socketService.on('disconnect', onDisconnect);

        const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
            const prev = appStateRef.current;
            appStateRef.current = nextState;

            if (nextState === 'active' && prev !== 'active') {
                // Came to foreground — reconnect if needed
                if (token && !socketService.isConnected()) {
                    socketService.connect(token);
                }
                flushOfflineLocationQueue().catch(() => null);
            } else if (nextState === 'background') {
                // Keep the socket alive while a ride is in progress so that
                // the background location task can continue emitting via it.
                AsyncStorage.getItem(ACTIVE_RIDE_KEY).then((activeRideId) => {
                    if (!activeRideId) {
                        socketService.disconnect();
                        setIsConnected(false);
                    }
                });
            }
        });

        return () => {
            socketService.off('connect', onConnect);
            socketService.off('disconnect', onDisconnect);
            subscription.remove();
        };
    }, [token]);

    // Reconnect socket when network comes back online
    useEffect(() => {
        if (!token) return;
        return NetInfo.addEventListener((state) => {
            if (state.isConnected && !socketService.isConnected()) {
                socketService.connect(token);
            }
            if (state.isConnected) {
                flushOfflineLocationQueue().catch(() => null);
            }
        });
    }, [token]);

    return { isConnected };
}

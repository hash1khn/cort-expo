import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Location from 'expo-location';
import { useAppSelector } from '../store/hooks';
import {
  useUpdateMyLocationMutation,
  useMarkMyselfOfflineMutation,
} from '../features/chauffeur/services/chauffeur.api';

const PING_INTERVAL_MS = 3 * 60 * 1000;

/**
 * Presence ping for the chauffeur marketplace. Foreground-only — unlike ride
 * tracking (useRiderLocationTracking), nearby-request eligibility only needs
 * to know where the driver is while they have the app open, so no background
 * task or "Always" permission is requested here.
 *
 * Only active for independent chauffeur drivers (marketplace_eligible) — company
 * pool / vendor drivers never see the marketplace feed and shouldn't be pinging.
 */
export function useDriverPresence(): void {
  const marketplaceEligible = useAppSelector((state) => state.auth.user?.marketplace_eligible ?? false);
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);
  const [updateMyLocation] = useUpdateMyLocationMutation();
  const [markMyselfOffline] = useMarkMyselfOfflineMutation();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isLoggedIn || !marketplaceEligible) return;

    const pingOnce = async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        let granted = status === 'granted';
        if (!granted) {
          const requested = await Location.requestForegroundPermissionsAsync();
          granted = requested.status === 'granted';
        }
        if (!granted) return;

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        await updateMyLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }).unwrap();
      } catch (err) {
        console.warn('[DriverPresence] Failed to update location', err);
      }
    };

    const startForeground = () => {
      pingOnce();
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(pingOnce, PING_INTERVAL_MS);
    };

    const stopForeground = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      markMyselfOffline().catch(() => { /* best-effort */ });
    };

    if (AppState.currentState === 'active') startForeground();

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        startForeground();
      } else if (nextState === 'background' || nextState === 'inactive') {
        stopForeground();
      }
    });

    return () => {
      subscription.remove();
      stopForeground();
    };
  }, [isLoggedIn, marketplaceEligible, updateMyLocation, markMyselfOffline]);
}

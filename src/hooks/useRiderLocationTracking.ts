import { useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import {
  startLocationTracking,
  stopLocationTracking,
} from '../services/location/riderLocationService';

export interface UseRiderLocationTrackingReturn {
  /** True while startLocationUpdatesAsync is active */
  isTracking: boolean;
  /**
   * Call when the ride starts.
   *
   * Pass an optional `onReady` callback — it fires after tracking has
   * actually started (permissions granted, task running).  Use this to open
   * Google Maps so the redirect always happens AFTER location is live.
   *
   * Returns true if tracking started synchronously (permissions already
   * granted), false if permissions still need to be requested (a modal/dialog
   * will appear and `onReady` fires after the user accepts).
   */
  startTracking: (tripId: string | number, onReady?: () => void) => Promise<boolean>;
  /** Call when the ride ends to stop the background task. */
  stopTracking: () => Promise<void>;
  /** Mount <LocationDisclosureModal visible={needsDisclosure} ... /> when true */
  needsDisclosure: boolean;
  /** Pass to LocationDisclosureModal onAccept */
  onDisclosureAccept: () => void;
  /** Pass to LocationDisclosureModal onDecline */
  onDisclosureDecline: () => void;
}

export function useRiderLocationTracking(): UseRiderLocationTrackingReturn {
  const [isTracking, setIsTracking] = useState(false);
  const [needsDisclosure, setNeedsDisclosure] = useState(false);
  const pendingTripIdRef = useRef<string | number | null>(null);
  const pendingOnReadyRef = useRef<(() => void) | null>(null);

  /** Request permissions (if needed) then start the task, then fire onReady. */
  const requestAndStart = useCallback(
    async (tripId: string | number, onReady?: () => void): Promise<boolean> => {
      const { status: fgStatus } =
        await Location.requestForegroundPermissionsAsync();

      if (fgStatus !== 'granted') {
        console.warn('[RiderLocation] Foreground permission denied');
        return false;
      }

      const { status: bgStatus } =
        await Location.requestBackgroundPermissionsAsync();

      if (bgStatus !== 'granted') {
        console.warn('[RiderLocation] Background permission denied');
        return false;
      }

      await startLocationTracking(tripId);
      setIsTracking(true);
      onReady?.();
      return true;
    },
    [],
  );

  const startTracking = useCallback(
    async (tripId: string | number, onReady?: () => void): Promise<boolean> => {
      // Permissions already granted — start immediately and fire onReady.
      const { status: fgStatus } =
        await Location.getForegroundPermissionsAsync();
      const { status: bgStatus } =
        await Location.getBackgroundPermissionsAsync();

      if (fgStatus === 'granted' && bgStatus === 'granted') {
        await startLocationTracking(tripId);
        setIsTracking(true);
        onReady?.();
        return true;
      }

      // Android: show the disclosure modal first (Play Store policy).
      // iOS: go straight to native permission dialog.
      if (Platform.OS === 'android') {
        pendingTripIdRef.current = tripId;
        pendingOnReadyRef.current = onReady ?? null;
        setNeedsDisclosure(true);
        return false;
      }

      return requestAndStart(tripId, onReady);
    },
    [requestAndStart],
  );

  const stopTracking = useCallback(async (): Promise<void> => {
    await stopLocationTracking();
    setIsTracking(false);
  }, []);

  const onDisclosureAccept = useCallback(async () => {
    setNeedsDisclosure(false);
    if (pendingTripIdRef.current != null) {
      const onReady = pendingOnReadyRef.current ?? undefined;
      pendingOnReadyRef.current = null;
      await requestAndStart(pendingTripIdRef.current, onReady);
      pendingTripIdRef.current = null;
    }
  }, [requestAndStart]);

  const onDisclosureDecline = useCallback(() => {
    setNeedsDisclosure(false);
    pendingTripIdRef.current = null;
    pendingOnReadyRef.current = null;
  }, []);

  return {
    isTracking,
    startTracking,
    stopTracking,
    needsDisclosure,
    onDisclosureAccept,
    onDisclosureDecline,
  };
}

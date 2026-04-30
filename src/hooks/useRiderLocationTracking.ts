import { useState, useCallback, useRef, useEffect } from 'react';
import { Platform, Alert, Linking, AppState } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import {
  startLocationTracking,
  stopLocationTracking,
} from '../services/location/riderLocationService';
import { RIDER_LOCATION_TASK } from '../services/location/backgroundLocationTask';

/**
 * iOS only.
 *
 * On iOS 13+, when the user taps "Change to Always Allow" in the system
 * background-location upgrade dialog, iOS immediately opens Settings and
 * `requestBackgroundPermissionsAsync()` resolves with the *old* (denied)
 * status before the user has had a chance to change anything.
 *
 * This helper detects that scenario by checking AppState:
 * - If the app is still active after the call, the user chose "Keep Only
 *   While Using" — we return false immediately so the caller can show an
 *   alert without delay.
 * - If the app is in the background (user is in Settings), we wait for the
 *   app to become active again and then re-read the permission.
 */
async function iosWaitForAlwaysPermission(): Promise<boolean> {
  // Short pause so AppState has time to transition if iOS is opening Settings.
  await new Promise<void>((resolve) => setTimeout(resolve, 200));

  if (AppState.currentState === 'active') {
    // User is still in the app — they chose "Keep Only While Using" (or denied).
    // Do one final read in case the OS callback just landed.
    const fg = await Location.getForegroundPermissionsAsync();
    const bg = await Location.getBackgroundPermissionsAsync();
    const scope = (fg as any)?.ios?.scope as string | undefined;
    return scope === 'always' || bg.status === 'granted';
  }

  // App is backgrounded — user is in Settings.app. Wait for them to return.
  return new Promise<boolean>((resolve) => {
    let settled = false;

    const settle = (granted: boolean) => {
      if (settled) return;
      settled = true;
      sub.remove();
      clearTimeout(giveUpTimer);
      resolve(granted);
    };

    const sub = AppState.addEventListener('change', async (state) => {
      if (state === 'active' && !settled) {
        // Small buffer for CLAuthorizationStatus to propagate after app resume.
        await new Promise<void>((r) => setTimeout(r, 350));
        const fg = await Location.getForegroundPermissionsAsync();
        const bg = await Location.getBackgroundPermissionsAsync();
        const scope = (fg as any)?.ios?.scope as string | undefined;
        settle(scope === 'always' || bg.status === 'granted');
      }
    });

    // Safety valve: user abandoned Settings without changing anything.
    const giveUpTimer = setTimeout(() => settle(false), 60_000);
  });
}

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
  startTracking: (tripId: string | number, onReady?: () => void, tripType?: 'shuttle' | 'chauffeur') => Promise<boolean>;
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

  // Sync isTracking with the real task state on mount — handles the case
  // where the app is reopened mid-ride and the foreground service is
  // already running from a previous session.
  useEffect(() => {
    TaskManager.isTaskRegisteredAsync(RIDER_LOCATION_TASK).then((registered) => {
      if (registered) setIsTracking(true);
    });
  }, []);
  const pendingTripIdRef = useRef<string | number | null>(null);
  const pendingOnReadyRef = useRef<(() => void) | null>(null);
  const pendingTripTypeRef = useRef<'shuttle' | 'chauffeur' | undefined>(undefined);

  /** Request permissions (if needed) then start the task, then fire onReady. */
  const requestAndStart = useCallback(
    async (tripId: string | number, onReady?: () => void, tripType?: 'shuttle' | 'chauffeur'): Promise<boolean> => {
      const { status: fgStatus } =
        await Location.requestForegroundPermissionsAsync();

      if (fgStatus !== 'granted') {
        console.warn('[RiderLocation] Foreground permission denied');
        Alert.alert(
          'Location Permission Required',
          'Please go to Settings → App → Permissions and enable Location to start a ride.',
          [
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
            { text: 'Cancel', style: 'cancel' },
          ],
        );
        return false;
      }

      const { status: bgStatus } =
        await Location.requestBackgroundPermissionsAsync();

      if (bgStatus !== 'granted') {
        if (Platform.OS === 'ios') {
          // On iOS, tapping "Change to Always Allow" opens Settings and resolves
          // the call with the OLD (denied) status before the user has changed
          // anything. Wait for the user to return from Settings and re-check.
          const nowGranted = await iosWaitForAlwaysPermission();
          if (!nowGranted) {
            console.warn('[RiderLocation] iOS Always permission not satisfied');
            Alert.alert(
              'Always Allow Required',
              "Open Settings and set location access to 'Always' so your location is tracked during rides.",
              [
                { text: 'Open Settings', onPress: () => Linking.openSettings() },
                { text: 'Cancel', style: 'cancel' },
              ],
            );
            return false;
          }
          // User returned from Settings with Always granted — fall through.
        } else {
          // Android: the read after requestBackgroundPermissionsAsync() is reliable.
          console.warn('[RiderLocation] Background permission denied');
          Alert.alert(
            'Always Allow Required',
            "Set location access to 'Allow all the time' in Settings so your location is tracked during rides.",
            [
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
              { text: 'Cancel', style: 'cancel' },
            ],
          );
          return false;
        }
      }

      await startLocationTracking(tripId, tripType);
      setIsTracking(true);
      await Promise.resolve(onReady?.());
      return true;
    },
    [],
  );

  const startTracking = useCallback(
    async (tripId: string | number, onReady?: () => void, tripType?: 'shuttle' | 'chauffeur'): Promise<boolean> => {
      // Permissions already granted — start immediately and fire onReady.
      const fg = await Location.getForegroundPermissionsAsync();
      const bg = await Location.getBackgroundPermissionsAsync();
      const fgStatus = fg.status;
      const bgStatus = bg.status;

      // On iOS, "Always" is surfaced as ios.scope === 'always' on the foreground
      // object. Use it as a parallel signal so a stale bgStatus doesn't block us.
      const iosScope = Platform.OS === 'ios'
        ? ((fg as any)?.ios?.scope as string | undefined)
        : undefined;
      const alreadyFullyGranted =
        (fgStatus === 'granted' && bgStatus === 'granted') ||
        (Platform.OS === 'ios' && fgStatus === 'granted' && iosScope === 'always');

      if (alreadyFullyGranted) {
        await startLocationTracking(tripId, tripType);
        setIsTracking(true);
        await Promise.resolve(onReady?.());
        return true;
      }

      // Android: show the disclosure modal first (Play Store policy).
      // iOS: go straight to native permission dialog.
      if (Platform.OS === 'android') {
        pendingTripIdRef.current = tripId;
        pendingOnReadyRef.current = onReady ?? null;
        pendingTripTypeRef.current = tripType;
        setNeedsDisclosure(true);
        return false;
      }

      return requestAndStart(tripId, onReady, tripType);
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
      const tripType = pendingTripTypeRef.current;
      pendingOnReadyRef.current = null;
      pendingTripTypeRef.current = undefined;
      await requestAndStart(pendingTripIdRef.current, onReady, tripType);
      pendingTripIdRef.current = null;
    }
  }, [requestAndStart]);

  const onDisclosureDecline = useCallback(() => {
    setNeedsDisclosure(false);
    pendingTripIdRef.current = null;
    pendingOnReadyRef.current = null;
    pendingTripTypeRef.current = undefined;
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

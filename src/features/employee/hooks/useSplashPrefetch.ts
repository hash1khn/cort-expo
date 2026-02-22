import { useEffect, useRef } from 'react';
import * as SplashScreen from 'expo-splash-screen';

/**
 * Hides the splash screen once fonts and store hydration are ready.
 * Chauffeur bookings are now fetched on the employee home screen (ShuttleEmployee) instead.
 */
export function useSplashPrefetch(
  fontsLoaded: boolean,
  hasHydrated: boolean,
) {
  const hasHiddenRef = useRef(false);

  useEffect(() => {
    if (!fontsLoaded || !hasHydrated || hasHiddenRef.current) return;

    SplashScreen.hideAsync().catch(() => {});
    hasHiddenRef.current = true;
  }, [fontsLoaded, hasHydrated]);
}

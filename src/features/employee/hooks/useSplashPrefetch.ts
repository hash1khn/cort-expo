import { useEffect, useRef } from 'react';
import * as SplashScreen from 'expo-splash-screen';

/**
 * Hides the splash screen once fonts, store hydration, and the first app-config
 * check are ready. The extraReady flag keeps splash up so home does not flash
 * before a maintenance / force-update screen.
 */
export function useSplashPrefetch(
  fontsLoaded: boolean,
  hasHydrated: boolean,
  extraReady = true,
) {
  const hasHiddenRef = useRef(false);

  useEffect(() => {
    if (!fontsLoaded || !hasHydrated || !extraReady || hasHiddenRef.current) return;

    SplashScreen.hideAsync().catch(() => {});
    hasHiddenRef.current = true;
  }, [fontsLoaded, hasHydrated, extraReady]);
}

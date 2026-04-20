import { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';

/**
 * Calls the provided refetch functions when the network transitions
 * from offline → online. Safe to call in any screen that has live data.
 *
 * Uses a closure-local prev flag so there's no stale-ref issue and no
 * re-subscription when the parent re-renders.
 */
export function useRefetchOnReconnect(...refetchFns: Array<() => void>) {
  const fnRef = useRef(refetchFns);
  fnRef.current = refetchFns; // always latest, never stale

  useEffect(() => {
    let prevConnected = true; // assume online at mount
    return NetInfo.addEventListener((state) => {
      const connected = state.isConnected ?? true;
      if (!prevConnected && connected) {
        fnRef.current.forEach((fn) => {
          try { fn(); } catch { /* query not started yet (skip:true) — ignore */ }
        });
      }
      prevConnected = connected;
    });
  }, []); // intentionally empty — listener is stable, fns accessed via ref
}

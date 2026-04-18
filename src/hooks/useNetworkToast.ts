import { useEffect, useRef } from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { Toast } from '@/shared/ui/molecules/Toast';

/**
 * Listens for network transitions and fires a global toast.
 * - Going offline: persistent red toast until reconnected
 * - Coming back online: dismiss offline toast + brief green toast
 *
 * Uses prev-state comparison so the initial emission (connected) produces no toast.
 * Call once inside RootLayoutContent (after ToastProviderWithViewport mounts).
 */
export function useNetworkToast() {
  const offlineToastId = useRef<string | null>(null);
  const prevConnected = useRef<boolean>(true); // assume connected on first render

  useEffect(() => {
    const handleChange = (state: NetInfoState) => {
      const connected = state.isConnected ?? true;
      const prev = prevConnected.current;
      prevConnected.current = connected;

      if (prev === connected) return; // no real transition

      if (!connected) {
        offlineToastId.current = Toast.show('No Internet Connection', {
          duration: 999999,
          position: 'top',
          type: 'error',
          backgroundColor: '#EF4444',
        });
      } else {
        if (offlineToastId.current) {
          Toast.dismiss(offlineToastId.current);
          offlineToastId.current = null;
        }
        Toast.show('Back Online', {
          duration: 3000,
          position: 'top',
          type: 'success',
          backgroundColor: '#10B981',
        });
      }
    };

    return NetInfo.addEventListener(handleChange);
  }, []);
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import Constants from 'expo-constants';
import { fetchMobileAppConfig } from './api';
import { isVersionBelow } from './compareVersion';
import type { AppConfigGate, MobileAppConfig } from './types';

/** Skip a foreground refetch if a successful fetch landed within this window. */
const CLIENT_TTL_MS = 60_000;
const FIRST_FETCH_TIMEOUT_MS = 4_000;

function installedVersion(): string {
  return Constants.expoConfig?.version ?? '0.0.0';
}

function decideGate(config: MobileAppConfig): AppConfigGate | null {
  if (config.maintenanceEnabled) {
    return { kind: 'maintenance', message: config.maintenanceMessage };
  }

  const platform = Platform.OS;
  if (platform !== 'ios' && platform !== 'android') {
    return null;
  }

  const min = platform === 'ios' ? config.iosMinVersion : config.androidMinVersion;
  if (!isVersionBelow(installedVersion(), min)) {
    return null;
  }

  return {
    kind: 'force-update',
    message: config.forceUpdateMessage,
    storeUrl: platform === 'ios' ? config.iosStoreUrl : config.androidStoreUrl,
  };
}

export function useAppConfigGate() {
  const [ready, setReady] = useState(false);
  const [gate, setGate] = useState<AppConfigGate | null>(null);
  const inFlight = useRef(false);
  const lastSuccessBlocked = useRef(false);
  const lastSuccessAt = useRef(0);

  const refresh = useCallback(async (opts?: { timeoutMs?: number; force?: boolean }) => {
    if (inFlight.current) return;
    if (!opts?.force && Date.now() - lastSuccessAt.current < CLIENT_TTL_MS) {
      return;
    }

    inFlight.current = true;
    const controller = new AbortController();
    const timer =
      opts?.timeoutMs != null
        ? setTimeout(() => controller.abort(), opts.timeoutMs)
        : undefined;

    try {
      const config = await fetchMobileAppConfig(controller.signal);
      const next = decideGate(config);
      lastSuccessBlocked.current = next != null;
      lastSuccessAt.current = Date.now();
      setGate(next);
    } catch {
      if (!lastSuccessBlocked.current) {
        setGate(null);
      }
    } finally {
      if (timer) clearTimeout(timer);
      const aborted = controller.signal.aborted;
      inFlight.current = false;
      setReady(true);
      if (aborted) {
        void refresh({ force: true });
      }
    }
  }, []);

  useEffect(() => {
    void refresh({ timeoutMs: FIRST_FETCH_TIMEOUT_MS, force: true });
  }, [refresh]);

  useEffect(() => {
    const onAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        void refresh();
      }
    };
    const sub = AppState.addEventListener('change', onAppState);
    return () => {
      sub.remove();
    };
  }, [refresh]);

  return { ready, gate };
}

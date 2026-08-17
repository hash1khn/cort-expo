import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import Constants from 'expo-constants';
import { fetchMobileAppConfig } from './api';
import { isVersionBelow } from './compareVersion';
import type { AppConfigGate, MobileAppConfig } from './types';

const POLL_MS = 60_000;
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

  const refresh = useCallback(async (timeoutMs?: number) => {
    if (inFlight.current) return;
    inFlight.current = true;
    const controller = new AbortController();
    const timer =
      timeoutMs != null
        ? setTimeout(() => controller.abort(), timeoutMs)
        : undefined;

    try {
      const config = await fetchMobileAppConfig(controller.signal);
      const next = decideGate(config);
      lastSuccessBlocked.current = next != null;
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
        void refresh();
      }
    }
  }, []);

  useEffect(() => {
    void refresh(FIRST_FETCH_TIMEOUT_MS);
  }, [refresh]);

  useEffect(() => {
    const onAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        void refresh();
      }
    };
    const sub = AppState.addEventListener('change', onAppState);
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') {
        void refresh();
      }
    }, POLL_MS);
    return () => {
      sub.remove();
      clearInterval(interval);
    };
  }, [refresh]);

  return { ready, gate };
}

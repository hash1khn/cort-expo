import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { env } from '../../../core/config/env';

const KEYS = {
  ACCESS_TOKEN: 'cort_access_token',
  REFRESH_TOKEN: 'cort_refresh_token',
  PUSH_TOKEN: 'cort_push_token',
} as const;

/** SecureStore allows only alphanumeric, ".", "-", "_" */
const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, '_');

const isWeb = Platform.OS === 'web';

const webStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(sanitize(key));
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    localStorage.setItem(sanitize(key), value);
  },
  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(sanitize(key));
  },
};

/**
 * Result of a refresh attempt.
 *  - `reason: 'invalid'`  → the refresh token itself was rejected by the
 *    server (expired / revoked / never existed). The session is genuinely
 *    over — callers should log the user out.
 *  - `reason: 'network'`  → we couldn't get a definitive answer (offline,
 *    timeout, 5xx, malformed response). The session might still be fine;
 *    callers should NOT log the user out, just fail the current request and
 *    let the next attempt retry.
 */
export type RefreshResult =
  | { ok: true; accessToken: string }
  | { ok: false; reason: 'invalid' | 'network' };

/** In-flight refresh promise — prevents concurrent refresh races that revoke each other. */
let refreshInFlight: Promise<RefreshResult> | null = null;

export const tokenStorage = {
  async getAccessToken(): Promise<string | null> {
    if (isWeb) return webStorage.getItem(KEYS.ACCESS_TOKEN);
    return SecureStore.getItemAsync(sanitize(KEYS.ACCESS_TOKEN));
  },

  async getRefreshToken(): Promise<string | null> {
    if (isWeb) return webStorage.getItem(KEYS.REFRESH_TOKEN);
    return SecureStore.getItemAsync(sanitize(KEYS.REFRESH_TOKEN));
  },

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    if (isWeb) {
      await webStorage.setItem(KEYS.ACCESS_TOKEN, accessToken);
      await webStorage.setItem(KEYS.REFRESH_TOKEN, refreshToken);
      return;
    }
    await SecureStore.setItemAsync(sanitize(KEYS.ACCESS_TOKEN), accessToken);
    await SecureStore.setItemAsync(sanitize(KEYS.REFRESH_TOKEN), refreshToken);
  },

  async clearTokens(): Promise<void> {
    if (isWeb) {
      await webStorage.removeItem(KEYS.ACCESS_TOKEN);
      await webStorage.removeItem(KEYS.REFRESH_TOKEN);
      return;
    }
    await SecureStore.deleteItemAsync(sanitize(KEYS.ACCESS_TOKEN));
    await SecureStore.deleteItemAsync(sanitize(KEYS.REFRESH_TOKEN));
  },

  async hasTokens(): Promise<boolean> {
    const access = await this.getAccessToken();
    return access != null && access.length > 0;
  },

  async getPushToken(): Promise<string | null> {
    if (isWeb) return webStorage.getItem(KEYS.PUSH_TOKEN);
    return SecureStore.getItemAsync(sanitize(KEYS.PUSH_TOKEN));
  },

  async setPushToken(token: string): Promise<void> {
    if (isWeb) {
      await webStorage.setItem(KEYS.PUSH_TOKEN, token);
      return;
    }
    await SecureStore.setItemAsync(sanitize(KEYS.PUSH_TOKEN), token);
  },

  async clearPushToken(): Promise<void> {
    if (isWeb) {
      await webStorage.removeItem(KEYS.PUSH_TOKEN);
      return;
    }
    await SecureStore.deleteItemAsync(sanitize(KEYS.PUSH_TOKEN));
  },

  /**
   * Uses the stored refresh token to obtain a new access token from the
   * backend, persists both new tokens, and returns the new access token (or
   * null on any failure). Kept for callers that don't need to distinguish
   * failure reasons (socket, offline location queue) — they already treat
   * `null` as "couldn't refresh right now" without logging the user out.
   */
  async refreshAccessToken(): Promise<string | null> {
    const result = await this.refreshAccessTokenDetailed();
    return result.ok ? result.accessToken : null;
  },

  /**
   * Same as `refreshAccessToken()` but returns a discriminated result (see
   * `RefreshResult`) so callers that DO decide whether to log the user out
   * (RTK Query's reauth wrapper, `apiFetch`) can tell a real "you're logged
   * out" apart from a transient failure that shouldn't wipe the session.
   *
   * Single-flight *within this JS instance*: concurrent callers here share
   * one refresh request. Note this does NOT protect against a background
   * task running in a separate JS instance (e.g. Android headless location
   * task) refreshing at the same time — that race is instead tolerated by
   * the backend's short reuse-grace-window, and mitigated here by checking
   * whether another instance already rotated the token out from under us
   * before giving up.
   */
  async refreshAccessTokenDetailed(): Promise<RefreshResult> {
    if (refreshInFlight) return refreshInFlight;

    const inFlight = (async (): Promise<RefreshResult> => {
      const refreshTokenAtStart = await this.getRefreshToken();
      if (!refreshTokenAtStart) return { ok: false, reason: 'invalid' };

      try {
        const base = env.API_URL.replace(/\/$/, '');
        const res = await fetch(`${base}/auth/refresh-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: refreshTokenAtStart }),
        });

        if (res.status === 401 || res.status === 403) {
          // Another JS instance (e.g. the background location task, which
          // can run in its own headless runtime) may have already rotated
          // this exact refresh token a moment ago. If storage now holds a
          // *different* refresh token than the one we sent, that rotation
          // already happened and our session is fine — just use the token
          // that's already there instead of forcing a logout.
          const currentRefreshToken = await this.getRefreshToken();
          const currentAccessToken = await this.getAccessToken();
          if (
            currentAccessToken &&
            currentRefreshToken &&
            currentRefreshToken !== refreshTokenAtStart
          ) {
            return { ok: true, accessToken: currentAccessToken };
          }
          return { ok: false, reason: 'invalid' };
        }

        if (!res.ok) {
          // 5xx / 429 / etc — server or network trouble, not a rejected
          // token. Don't touch stored tokens; let the caller retry later.
          return { ok: false, reason: 'network' };
        }

        const json = await res.json();
        const accessToken: string | undefined = json?.data?.session?.access_token;
        const newRefreshToken: string | undefined = json?.data?.session?.refresh_token;

        if (!accessToken) return { ok: false, reason: 'network' };

        await this.setTokens(accessToken, newRefreshToken ?? refreshTokenAtStart);
        return { ok: true, accessToken };
      } catch {
        // Offline / timeout / parse error — ambiguous, not a confirmed
        // rejection. Treat as transient.
        return { ok: false, reason: 'network' };
      }
    })().finally(() => {
      refreshInFlight = null;
    });

    refreshInFlight = inFlight;
    return inFlight;
  },
};

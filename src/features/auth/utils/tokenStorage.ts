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
   * backend, persists both new tokens, and returns the new access token.
   * Returns null if the refresh token is missing or the request fails.
   */
  async refreshAccessToken(): Promise<string | null> {
    const refreshToken = await this.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const base = env.API_URL.replace(/\/$/, '');
      const res = await fetch(`${base}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) return null;

      const json = await res.json();
      const accessToken: string | undefined = json?.data?.session?.access_token;
      const newRefreshToken: string | undefined = json?.data?.session?.refresh_token;

      if (!accessToken) return null;

      await this.setTokens(accessToken, newRefreshToken ?? refreshToken);
      return accessToken;
    } catch {
      return null;
    }
  },
};

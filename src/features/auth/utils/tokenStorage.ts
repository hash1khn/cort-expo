import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEYS = {
  ACCESS_TOKEN: 'cort_access_token',
  REFRESH_TOKEN: 'cort_refresh_token',
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
};

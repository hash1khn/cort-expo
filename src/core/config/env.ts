/**
 * Environment configuration.
 * Use EXPO_PUBLIC_ prefix for values exposed to the app.
 */
const getEnv = (key: string, fallback: string): string => {
  const value = typeof process !== 'undefined' && process.env?.[key];
  const s = typeof value === 'string' ? value : fallback;
  return s.trim();
};

export const env = {
  /** Backend API base URL (no trailing slash) */
  API_URL: getEnv('EXPO_PUBLIC_API_URL', 'http://localhost:3000'),
} as const;

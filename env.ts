export const env = {
  /** Backend API base URL (no trailing slash) */
  API_URL: (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').trim(),
} as const;

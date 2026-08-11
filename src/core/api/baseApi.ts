import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { env } from '../config/env';
import { tokenStorage } from '../../features/auth/utils/tokenStorage';
import { triggerOnUnauthorized } from './client';

const baseUrl = env.API_URL.replace(/\/$/, '');

// Without this, a dropped/stalled connection leaves `fetch` hanging forever —
// RTK Query's isLoading never resolves, so screens like Return.tsx (complete
// trip) can appear "stuck" indefinitely with no error surfaced to the driver.
// Individual queries can still override this via `timeout` in their `query()`
// return value (e.g. photo uploads need more than 20s on a slow connection).
const DEFAULT_REQUEST_TIMEOUT_MS = 20000;

const baseQuery = fetchBaseQuery({
  baseUrl,
  timeout: DEFAULT_REQUEST_TIMEOUT_MS,
  prepareHeaders: async (headers) => {
    const token = await tokenStorage.getAccessToken();
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    // Do NOT force content-type here — RTK Query sets 'application/json' for
    // plain-object bodies automatically, and FormData uploads need the browser
    // to set 'multipart/form-data; boundary=...' themselves.
    return headers;
  },
});

const baseQueryWithReauth = async (args: any, api: any, extraOptions: any) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    // Single-flight refresh — shared with apiFetch + socket so concurrent
    // 401s don't revoke each other's refresh tokens and force logout.
    const newAccessToken = await tokenStorage.refreshAccessToken();

    if (newAccessToken) {
      result = await baseQuery(args, api, extraOptions);
    } else {
      await tokenStorage.clearTokens();
      triggerOnUnauthorized();
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Auth', 'Booking', 'ChauffeurBooking', 'ShuttleTrip', 'Attendance', 'ShuttlePolyline', 'ChauffeurPolyline'],
  endpoints: () => ({}),
});

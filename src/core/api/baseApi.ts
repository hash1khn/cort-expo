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

// Endpoints that are hit while the user has no valid session yet (or is in
// the middle of establishing one). A 401 here means "wrong credentials" /
// "bad ticket", not "your session expired" — it must never trigger a token
// refresh + forced logout, which would be confusing (and could wipe tokens
// left over from a previous session while the user is just mistyping a
// password on the login screen).
const NO_REAUTH_PATHS = ['/auth/login', '/auth/signup', '/auth/impersonate/exchange'];

const baseQueryWithReauth = async (args: any, api: any, extraOptions: any) => {
  let result = await baseQuery(args, api, extraOptions);

  const url: string = typeof args === 'string' ? args : args?.url ?? '';
  const skipReauth = NO_REAUTH_PATHS.some((path) => url.includes(path));

  if (!skipReauth && result.error && result.error.status === 401) {
    // Single-flight refresh — shared with apiFetch + socket so concurrent
    // 401s don't revoke each other's refresh tokens and force logout.
    const refreshResult = await tokenStorage.refreshAccessTokenDetailed();

    if (refreshResult.ok) {
      result = await baseQuery(args, api, extraOptions);
    } else if (refreshResult.reason === 'invalid') {
      // Only a confirmed-invalid refresh token means the session is really
      // over. A network/server hiccup while refreshing should not log the
      // user out — just surface this request's error and retry next time.
      await tokenStorage.clearTokens();
      triggerOnUnauthorized();
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Auth', 'Booking', 'ChauffeurBooking', 'ShuttleTrip', 'Attendance', 'ShuttlePolyline', 'ChauffeurPolyline', 'BroadcastRequests'],
  endpoints: () => ({}),
});

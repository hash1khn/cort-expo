import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { env } from '../config/env';
import { tokenStorage } from '../../features/auth/utils/tokenStorage';
import { triggerOnUnauthorized } from './client';

const baseUrl = env.API_URL.replace(/\/$/, '');

const baseQuery = fetchBaseQuery({
  baseUrl,
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
    const refreshToken = await tokenStorage.getRefreshToken();

    if (refreshToken) {
      const refreshResult = await baseQuery(
        {
          url: '/auth/refresh-token',
          method: 'POST',
          body: { refreshToken },
        },
        api,
        extraOptions,
      );

      if (refreshResult.data) {
        const payload = refreshResult.data as { data: { session: { access_token: string; refresh_token: string } } };
        const session = payload.data.session;
        await tokenStorage.setTokens(session.access_token, session.refresh_token);
        result = await baseQuery(args, api, extraOptions);
      } else {
        await tokenStorage.clearTokens();
        triggerOnUnauthorized();
      }
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


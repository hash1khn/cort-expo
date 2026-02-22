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
    if (!headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }
    return headers;
  },
});

const baseQueryWithReauth = async (args: any, api: any, extraOptions: any) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    await tokenStorage.clearTokens();
    triggerOnUnauthorized();
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Auth', 'Booking', 'ChauffeurBooking', 'ShuttleTrip', 'Attendance'],
  endpoints: () => ({}),
});


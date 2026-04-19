import { baseApi } from '../../../core/api/baseApi';
import { tokenStorage } from '../utils/tokenStorage';
import type { UserRole } from '../../../core/types/navigation';

type BackendRole = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'EMPLOYEE' | 'DRIVER';
type BackendDriverType = 'SHUTTLE' | 'CHAUFFEUR';

function mapRole(backend: BackendRole, driverType?: BackendDriverType): UserRole {
  if (backend === 'DRIVER') {
    return driverType === 'SHUTTLE' ? 'SHUTTLE_DRIVER' : 'CHAUFFEUR';
  }
  if (backend === 'EMPLOYEE') return 'EMPLOYEE';
  return 'EMPLOYEE';
}

type LoginRequest = {
  email: string;
  password: string;
};

type LoginResponse = {
  data?: {
    user?: {
      id: string;
      email?: string;
      full_name?: string;
      phone?: string;
      role?: BackendRole;
      company_id?: number | null;
      account_status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
      driver_type?: BackendDriverType;
      profile_picture_url?: string | null;
      enabled_services?: {
        shuttle: boolean;
        chauffeur: boolean;
      } | null;
    };
    session?: { access_token?: string; refresh_token?: string };
  };
  message?: string;
};

export type LoginResult = {
  user: {
    id: string;
    email: string;
    full_name: string;
    phone: string;
    company_id: number | null;
    account_status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
    profile_picture_url: string | null;
    enabled_services: {
      shuttle: boolean;
      chauffeur: boolean;
    } | null;
  };
  role: UserRole;
};

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<LoginResult, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: {
          email: credentials.email.trim(),
          password: credentials.password,
        },
      }),
      transformResponse: async (response: LoginResponse): Promise<LoginResult> => {
        const user = response?.data?.user;
        const session = response?.data?.session;

        if (
          !user?.role ||
          !user?.id ||
          !user?.email ||
          !user?.full_name ||
          !user?.phone ||
          !user?.account_status ||
          !session?.access_token ||
          !session?.refresh_token
        ) {
          throw new Error('Invalid login response');
        }

        // Store tokens
        await tokenStorage.setTokens(session.access_token, session.refresh_token);

        return {
          user: {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            phone: user.phone,
            company_id: user.company_id ?? null,
            account_status: user.account_status,
            profile_picture_url: user.profile_picture_url ?? null,
            enabled_services: user.enabled_services ?? null,
          },
          role: mapRole(user.role as BackendRole, user.driver_type),
        };
      },
    }),
    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
        } catch {
          // Ignore errors, clear tokens anyway
        } finally {
          await tokenStorage.clearTokens();
        }
      },
    }),
    getProfile: builder.query<LoginResult['user'], void>({
      query: () => '/auth/profile',
      transformResponse: (response: { data: any }) => {
        const d = response.data;
        return {
          id: d.id,
          email: d.email,
          full_name: d.full_name,
          phone: d.phone,
          company_id: d.company_id ?? null,
          account_status: d.account_status,
          profile_picture_url: d.profile_picture_url ?? null,
          enabled_services: d.enabled_services ?? null,
        };
      },
    }),
  }),
});

export const { useLoginMutation, useLogoutMutation, useGetProfileQuery } = authApi;

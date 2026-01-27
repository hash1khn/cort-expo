import { baseApi } from '../../../core/api/baseApi';
import { tokenStorage } from '../utils/tokenStorage';
import type { UserRole } from '../../../core/types/navigation';

type BackendRole = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'EMPLOYEE' | 'DRIVER';

function mapRole(backend: BackendRole): UserRole {
  if (backend === 'DRIVER') return 'CHAUFFEUR';
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
      company_id?: number;
      account_status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
      enabled_services?: {
        shuttle: boolean;
        chauffeur: boolean;
      };
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
    company_id: number;
    account_status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
    enabled_services: {
      shuttle: boolean;
      chauffeur: boolean;
    };
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
          user?.company_id === undefined ||
          !user?.account_status ||
          !user?.enabled_services ||
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
            company_id: user.company_id,
            account_status: user.account_status,
            enabled_services: user.enabled_services,
          },
          role: mapRole(user.role as BackendRole),
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
  }),
});

export const { useLoginMutation, useLogoutMutation } = authApi;

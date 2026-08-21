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

export type ApplyChauffeurPayload = {
  full_name: string;
  email?: string;
  phone: string;
  cnic_number: string;
  license_number: string;
  car_make: string;
  car_model: string;
  car_year: number;
  profile_picture_uri: string;
  license_front_uri: string;
  license_back_uri: string;
  cnic_front_uri: string;
  cnic_back_uri: string;
  car_photo_uri: string;
  car_registration_doc_uri: string;
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
      marketplace_eligible?: boolean;
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
    marketplace_eligible?: boolean;
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
            marketplace_eligible: user.marketplace_eligible ?? false,
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
    applyAsChauffeur: builder.mutation<void, ApplyChauffeurPayload>({
      query: (payload) => {
        const formData = new FormData();
        formData.append('full_name', payload.full_name.trim());
        const emailTrim = payload.email?.trim();
        if (emailTrim) {
          formData.append('email', emailTrim);
        }
        formData.append('phone', payload.phone.trim());
        formData.append('cnic_number', payload.cnic_number.trim());
        formData.append('license_number', payload.license_number.trim());
        formData.append('car_make', payload.car_make.trim());
        formData.append('car_model', payload.car_model.trim());
        formData.append('car_year', String(payload.car_year));

        const appendImage = (field: string, uri: string) => {
          formData.append(field, {
            uri,
            type: 'image/jpeg',
            name: `${field}.jpg`,
          } as any);
        };

        appendImage('profile_picture', payload.profile_picture_uri);
        appendImage('license_front', payload.license_front_uri);
        appendImage('license_back', payload.license_back_uri);
        appendImage('cnic_front', payload.cnic_front_uri);
        appendImage('cnic_back', payload.cnic_back_uri);
        appendImage('car_photo', payload.car_photo_uri);
        appendImage('car_registration_doc', payload.car_registration_doc_uri);

        return {
          url: '/drivers/apply-chauffeur',
          method: 'POST',
          body: formData,
          // Uploads 6 photos at once — the 20s app-wide default can be too tight
          // on a slow connection.
          timeout: 90000,
        };
      },
    }),
  }),
});

export const {
  useLoginMutation,
  useLogoutMutation,
  useGetProfileQuery,
  useApplyAsChauffeurMutation,
} = authApi;

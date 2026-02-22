import { env } from '../../../core/config/env';
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
    enabled_services: {
      shuttle: boolean;
      chauffeur: boolean;
    } | null;
  };
  role: UserRole;
};

export async function login(email: string, password: string): Promise<LoginResult> {
  const base = env.API_URL.replace(/\/$/, '');
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), password }),
  });

  const json = (await res.json().catch(() => ({}))) as LoginResponse;

  if (!res.ok) {
    const msg =
      json?.message ?? (res.status === 401 ? 'Invalid email or password' : 'Login failed');
    throw new Error(msg);
  }

  const user = json?.data?.user;
  const session = json?.data?.session;

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

  await tokenStorage.setTokens(session.access_token, session.refresh_token);

  return {
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
      company_id: user.company_id ?? null,
      account_status: user.account_status,
      enabled_services: user.enabled_services ?? null,
    },
    role: mapRole(user.role as BackendRole, user.driver_type),
  };
}

export async function logout(): Promise<void> {
  const access = await tokenStorage.getAccessToken();
  const base = env.API_URL.replace(/\/$/, '');

  if (access) {
    try {
      await fetch(`${base}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${access}` },
      });
    } catch {
      // ignore network errors; clear tokens anyway
    }
  }

  await tokenStorage.clearTokens();
}

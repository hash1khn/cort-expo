import { env } from '../../../core/config/env';
import { tokenStorage } from '../utils/tokenStorage';
import type { UserRole } from '../../../core/types/navigation';

type BackendRole = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'EMPLOYEE' | 'DRIVER';

function mapRole(backend: BackendRole): UserRole {
  if (backend === 'DRIVER') return 'CHAUFFEUR';
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
    user?.company_id === undefined ||
    !user?.account_status ||
    !user?.enabled_services ||
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
      company_id: user.company_id,
      account_status: user.account_status,
      enabled_services: user.enabled_services,
    },
    role: mapRole(user.role as BackendRole),
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

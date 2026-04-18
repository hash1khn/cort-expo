import { env } from '../config/env';
import { tokenStorage } from '../../features/auth/utils/tokenStorage';

type OnUnauthorized = () => void;

let onUnauthorized: OnUnauthorized | null = null;

export function setOnUnauthorized(fn: OnUnauthorized | null): void {
  onUnauthorized = fn;
}

export function triggerOnUnauthorized(): void {
  onUnauthorized?.();
}

const baseUrl = () => env.API_URL.replace(/\/$/, '');

export type ApiRequestInit = RequestInit & { skipAuth?: boolean };

export async function apiFetch(path: string, init: ApiRequestInit = {}): Promise<Response> {
  const { skipAuth, ...rest } = init;
  const url = path.startsWith('http') ? path : `${baseUrl()}${path.startsWith('/') ? path : `/${path}`}`;

  const headers = new Headers(rest.headers);

  if (!skipAuth && !headers.has('Authorization')) {
    const token = await tokenStorage.getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  if (!headers.has('Content-Type') && (rest.method === 'POST' || rest.method === 'PUT' || rest.method === 'PATCH')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, { ...rest, headers });

  if (res.status === 401) {
    const refreshToken = await tokenStorage.getRefreshToken();

    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${baseUrl()}/auth/refresh-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshRes.ok) {
          const json = (await refreshRes.json()) as {
            data: { session: { access_token: string; refresh_token: string } };
          };
          const session = json.data.session;
          await tokenStorage.setTokens(session.access_token, session.refresh_token);

          // Retry original request with new access token
          const retryHeaders = new Headers(rest.headers);
          retryHeaders.set('Authorization', `Bearer ${session.access_token}`);
          if (!retryHeaders.has('Content-Type') && (rest.method === 'POST' || rest.method === 'PUT' || rest.method === 'PATCH')) {
            retryHeaders.set('Content-Type', 'application/json');
          }
          return fetch(url, { ...rest, headers: retryHeaders });
        }
      } catch {
        // refresh request failed — fall through to logout
      }
    }

    await tokenStorage.clearTokens();
    onUnauthorized?.();
  }

  return res;
}

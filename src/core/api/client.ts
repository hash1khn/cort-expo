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
    // Single-flight refresh shared across the app (RTK, fetch, socket).
    const newAccessToken = await tokenStorage.refreshAccessToken();

    if (newAccessToken) {
      const retryHeaders = new Headers(rest.headers);
      retryHeaders.set('Authorization', `Bearer ${newAccessToken}`);
      if (!retryHeaders.has('Content-Type') && (rest.method === 'POST' || rest.method === 'PUT' || rest.method === 'PATCH')) {
        retryHeaders.set('Content-Type', 'application/json');
      }
      return fetch(url, { ...rest, headers: retryHeaders });
    }

    await tokenStorage.clearTokens();
    onUnauthorized?.();
  }

  return res;
}

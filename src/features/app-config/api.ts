import { apiFetch } from '@/core/api/client';
import type { MobileAppConfig } from './types';

export async function fetchMobileAppConfig(signal?: AbortSignal): Promise<MobileAppConfig> {
  const res = await apiFetch('/app-config', { skipAuth: true, signal });
  if (!res.ok) {
    throw new Error(`App config request failed (${res.status})`);
  }
  const json = (await res.json()) as { data?: MobileAppConfig };
  if (!json?.data) {
    throw new Error('App config response was empty');
  }
  return json.data;
}

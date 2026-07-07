import { apiFetch } from '../api';

const REGION_FETCH_TIMEOUT_MS = 5000;

export interface RegionResult {
  countryCode: string | null;
  country: string | null;
}

/**
 * Resolves the device's approximate region from its IP, via the backend's
 * /region endpoint — no location permission, works before login. Returns
 * null on any failure (offline, timeout, server error) so callers can fall
 * back to showing every language.
 */
export async function getRegion(): Promise<RegionResult | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REGION_FETCH_TIMEOUT_MS);

  try {
    const res = await apiFetch('/region', { skipAuth: true, signal: controller.signal });
    if (!res.ok) return null;

    const json = (await res.json()) as { data: RegionResult };
    return json.data;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

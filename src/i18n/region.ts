import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRegion } from '../services/region';
import { getLanguagesForRegion } from './regionLanguages';
import { i18n } from './index';
import { LANGUAGES, type Language } from './types';

const AVAILABLE_LANGUAGES_STORAGE_KEY = '@cort/availableLanguages';
const AVAILABLE_LANGUAGES_CHANGED_EVENT = 'availableLanguagesChanged';

let currentAvailableLanguages: Language[] = LANGUAGES;
let hydrated = false;

function isLanguageArray(value: unknown): value is Language[] {
  return Array.isArray(value) && value.length > 0 && value.every((v) => LANGUAGES.includes(v));
}

function publish(languages: Language[]): void {
  currentAvailableLanguages = languages;
  i18n.emit(AVAILABLE_LANGUAGES_CHANGED_EVENT, languages);
}

/** Synchronous snapshot for initial render — all 3 until a cached/fresh value is published. */
export function getAvailableLanguagesSnapshot(): Language[] {
  return currentAvailableLanguages;
}

export function subscribeAvailableLanguages(callback: (languages: Language[]) => void): () => void {
  i18n.on(AVAILABLE_LANGUAGES_CHANGED_EVENT, callback);
  return () => i18n.off(AVAILABLE_LANGUAGES_CHANGED_EVENT, callback);
}

/**
 * Loads the last-cached available-languages list (if any) so a returning,
 * offline user doesn't flash all 3 options before the network call resolves.
 */
export async function hydrateAvailableLanguagesFromCache(): Promise<void> {
  if (hydrated) return;
  hydrated = true;

  try {
    const raw = await AsyncStorage.getItem(AVAILABLE_LANGUAGES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (isLanguageArray(parsed)) {
      publish(parsed);
    }
  } catch {
    // keep default (all languages)
  }
}

/**
 * Resolves region via the backend and republishes the available-languages
 * list. Fire-and-forget from cold start — never throws, no-ops on failure
 * (leaves whatever was already published: cache or the all-languages default).
 */
export async function refreshAvailableLanguages(): Promise<void> {
  const region = await getRegion();
  if (!region) return;

  const languages = getLanguagesForRegion(region.countryCode);
  publish(languages);

  try {
    await AsyncStorage.setItem(AVAILABLE_LANGUAGES_STORAGE_KEY, JSON.stringify(languages));
  } catch {
    // best-effort cache; not fatal
  }
}

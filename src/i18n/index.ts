// UI strings belong in src/i18n/locales — use t('namespace:key'), not inline literals.
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './locales/en/index';
import { ur } from './locales/ur/index';
import { ar } from './locales/ar/index';
import { LANGUAGE_STORAGE_KEY, type Language } from './types';

export const APP_NAMESPACES = [
  'common',
  'auth',
  'shuttle',
  'chauffeur',
  'employee',
] as const;

const INIT_OPTIONS = {
  resources: {
    en,
    ur,
    ar,
  },
  fallbackLng: 'en',
  compatibilityJSON: 'v4' as const,
  ns: [...APP_NAMESPACES],
  defaultNS: 'common',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
    bindI18n: 'languageChanged',
    bindI18nStore: 'added removed',
  },
};

let initPromise: Promise<typeof i18n> | null = null;

function bindI18nPlugins(): void {
  if (!i18n.isInitialized) {
    i18n.use(initReactI18next);
  }
}

export function initI18n(): Promise<typeof i18n> {
  if (i18n.isInitialized) {
    return Promise.resolve(i18n);
  }

  if (initPromise) {
    return initPromise;
  }

  bindI18nPlugins();

  initPromise = (async () => {
    let lng: Language = 'en';
    try {
      const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved === 'en' || saved === 'ur' || saved === 'ar') {
        lng = saved;
      }
    } catch {
      // default to English
    }

    await i18n.init({
      ...INIT_OPTIONS,
      lng,
    });

    return i18n;
  })();

  return initPromise;
}

export async function changeAppLanguage(lang: Language): Promise<void> {
  if (!i18n.isInitialized) {
    await initI18n();
  }
  await i18n.changeLanguage(lang);
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // no-op
  }
}

export { i18n };
export type { Language };

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { APP_NAMESPACES, changeAppLanguage } from './index';
import {
  buildRtlRowStyle,
  buildRtlTextStyle,
  buildRtlDrawerTextStyle,
  type Language,
  isRTLLanguage,
  localeCode,
  rtlFontFamily,
} from './types';
import {
  getAvailableLanguagesSnapshot,
  hydrateAvailableLanguagesFromCache,
  subscribeAvailableLanguages,
} from './region';

export type { Language };

export function useLanguage() {
  const { t, i18n, ready } = useTranslation('common');
  const language = (i18n.resolvedLanguage ?? i18n.language ?? 'en') as Language;
  const isRTL = isRTLLanguage(language);

  const setLanguage = useCallback(async (lang: Language) => {
    await changeAppLanguage(lang);
  }, []);

  const rtlTextStyle = useMemo(
    () => buildRtlTextStyle(language),
    [language],
  );

  const rtlRowStyle = useMemo(
    () => buildRtlRowStyle(language),
    [language],
  );

  const rtlFont = useMemo(() => rtlFontFamily(language), [language]);

  const drawerNavTextStyle = useMemo(
    () => buildRtlDrawerTextStyle(language, 'nav'),
    [language],
  );

  const drawerSubTextStyle = useMemo(
    () => buildRtlDrawerTextStyle(language, 'sub'),
    [language],
  );

  const [availableLanguages, setAvailableLanguages] = useState<Language[]>(
    getAvailableLanguagesSnapshot(),
  );

  useEffect(() => {
    hydrateAvailableLanguagesFromCache();
    return subscribeAvailableLanguages(setAvailableLanguages);
  }, []);

  const tAuth = useCallback(
    (key: string, options?: Record<string, unknown>) =>
      t(key, { ns: 'auth', ...options }),
    [t],
  );

  return {
    language,
    setLanguage,
    availableLanguages,
    isRTL,
    ready,
    t,
    tAuth,
    rtlTextStyle,
    rtlRowStyle,
    rtlFont,
    drawerNavTextStyle,
    drawerSubTextStyle,
    localeCode: localeCode(language),
    i18n,
  };
}

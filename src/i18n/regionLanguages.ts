import { LANGUAGES, type Language } from './types';

/** Which languages are offered per resolved country. Anything not listed falls back to all of them. */
const REGION_LANGUAGES: Record<string, Language[]> = {
  PK: ['en', 'ur'],
  SA: ['en', 'ar'],
};

export function getLanguagesForRegion(countryCode: string | null | undefined): Language[] {
  if (!countryCode) return LANGUAGES;
  return REGION_LANGUAGES[countryCode] ?? LANGUAGES;
}

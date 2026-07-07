import type { TextStyle, ViewStyle } from 'react-native';

export type Language = 'en' | 'ur' | 'ar';

export const LANGUAGES: Language[] = ['en', 'ur', 'ar'];

export const RTL_LANGUAGES: Language[] = ['ur', 'ar'];

export const LANGUAGE_STORAGE_KEY = '@cort/language';

export function isRTLLanguage(lang: Language): boolean {
  return RTL_LANGUAGES.includes(lang);
}

export function localeCode(lang: Language): string {
  switch (lang) {
    case 'ur':
      return 'ur-PK';
    case 'ar':
      return 'ar';
    default:
      return 'en-US';
  }
}

export function rtlFontFamily(lang: Language): string | undefined {
  switch (lang) {
    case 'ur':
      return 'NotoNastaliqUrdu';
    case 'ar':
      return 'NotoSansArabic_400Regular';
    default:
      return undefined;
  }
}

export function rtlBoldFontFamily(lang: Language): string | undefined {
  switch (lang) {
    case 'ur':
      return 'NotoNastaliqUrdu';
    case 'ar':
      return 'NotoSansArabic_700Bold';
    default:
      return undefined;
  }
}

export function buildRtlTextStyle(
  lang: Language,
  extra?: TextStyle,
): TextStyle | Record<string, never> {
  if (!isRTLLanguage(lang)) return {};
  const fontFamily = rtlFontFamily(lang);
  return {
    textAlign: 'right',
    writingDirection: 'rtl',
    ...(fontFamily ? { fontFamily } : {}),
    ...extra,
  };
}

export function buildRtlRowStyle(lang: Language): ViewStyle | Record<string, never> {
  return isRTLLanguage(lang) ? { flexDirection: 'row-reverse' } : {};
}

export function buildRtlBadgeContainerStyle(
  lang: Language,
): ViewStyle | Record<string, never> {
  if (!isRTLLanguage(lang)) return {};
  return {
    paddingVertical: lang === 'ur' ? 5 : 4,
    paddingHorizontal: 12,
  };
}

export function buildRtlBadgeTextStyle(
  lang: Language,
): TextStyle | Record<string, never> {
  if (!isRTLLanguage(lang)) return {};

  const fontFamily = rtlBoldFontFamily(lang);
  const metrics =
    lang === 'ur'
      ? { lineHeight: 32, paddingTop: 1, paddingBottom: 2 }
      : { lineHeight: 26, paddingTop: 1, paddingBottom: 2 };

  return {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    writingDirection: 'rtl',
    ...(fontFamily ? { fontFamily } : {}),
    ...metrics,
  };
}

export function buildRtlTabContainerStyle(
  lang: Language,
): ViewStyle | Record<string, never> {
  if (!isRTLLanguage(lang)) return {};
  return {
    paddingVertical: lang === 'ur' ? 9 : 8,
    minHeight: lang === 'ur' ? 42 : 38,
    justifyContent: 'center',
  };
}

export function buildRtlTabTextStyle(
  lang: Language,
): TextStyle | Record<string, never> {
  if (!isRTLLanguage(lang)) return {};

  const fontFamily = rtlBoldFontFamily(lang);
  const metrics =
    lang === 'ur'
      ? { lineHeight: 32, paddingTop: 0, paddingBottom: 2 }
      : { lineHeight: 24, paddingTop: 0, paddingBottom: 1 };

  return {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    writingDirection: 'rtl',
    ...(fontFamily ? { fontFamily } : {}),
    ...metrics,
  };
}

export function buildRtlHeaderTitleStyle(
  lang: Language,
): TextStyle | Record<string, never> {
  if (!isRTLLanguage(lang)) return {};

  const fontFamily = rtlBoldFontFamily(lang);
  const metrics =
    lang === 'ur'
      ? { lineHeight: 40, paddingTop: 3, paddingBottom: 1 }
      : { lineHeight: 32, paddingTop: 2, paddingBottom: 1 };

  return {
    textAlign: 'center',
    writingDirection: 'rtl',
    ...(fontFamily ? { fontFamily } : {}),
    ...metrics,
  };
}

export function buildRtlBackButtonTextStyle(
  lang: Language,
): TextStyle | Record<string, never> {
  if (!isRTLLanguage(lang)) return {};

  const fontFamily = rtlFontFamily(lang);
  const metrics =
    lang === 'ur'
      ? { lineHeight: 30, paddingTop: 0, paddingBottom: 2 }
      : { lineHeight: 24, paddingTop: 0, paddingBottom: 1 };

  return {
    writingDirection: 'rtl',
    ...(fontFamily ? { fontFamily } : {}),
    ...metrics,
  };
}

/** Small action links (e.g. "View all") — text-sm / 14px. */
export function buildRtlLinkTextStyle(
  lang: Language,
): TextStyle | Record<string, never> {
  if (!isRTLLanguage(lang)) return {};

  const fontFamily = rtlBoldFontFamily(lang);
  const metrics =
    lang === 'ur'
      ? { lineHeight: 32, paddingTop: 2, paddingBottom: 5 }
      : { lineHeight: 26, paddingTop: 1, paddingBottom: 4 };

  return {
    fontSize: 14,
    fontWeight: '700',
    writingDirection: 'rtl',
    ...(fontFamily ? { fontFamily } : {}),
    ...metrics,
  };
}

/** Secondary labels (dates, gray subtitles) — text-base / 16px. */
export function buildRtlSubtitleTextStyle(
  lang: Language,
): TextStyle | Record<string, never> {
  if (!isRTLLanguage(lang)) return {};

  const fontFamily = rtlFontFamily(lang);
  const metrics =
    lang === 'ur'
      ? { lineHeight: 34, paddingTop: 2, paddingBottom: 5 }
      : { lineHeight: 28, paddingTop: 1, paddingBottom: 4 };

  return {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'right',
    writingDirection: 'rtl',
    ...(fontFamily ? { fontFamily } : {}),
    ...metrics,
  };
}

/** Small gray subtitles — text-sm / 14px. */
export function buildRtlSmallSubtitleTextStyle(
  lang: Language,
): TextStyle | Record<string, never> {
  if (!isRTLLanguage(lang)) return {};

  const fontFamily = rtlFontFamily(lang);
  const metrics =
    lang === 'ur'
      ? { lineHeight: 34, paddingTop: 2, paddingBottom: 7 }
      : { lineHeight: 26, paddingTop: 1, paddingBottom: 5 };

  return {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'right',
    writingDirection: 'rtl',
    ...(fontFamily ? { fontFamily } : {}),
    ...metrics,
  };
}

/** Section headings — text-xl / 20px bold. */
export function buildRtlSectionTitleStyle(
  lang: Language,
): TextStyle | Record<string, never> {
  if (!isRTLLanguage(lang)) return {};

  const fontFamily = rtlBoldFontFamily(lang);
  const metrics =
    lang === 'ur'
      ? { lineHeight: 44, paddingTop: 3, paddingBottom: 4 }
      : { lineHeight: 38, paddingTop: 2, paddingBottom: 5 };

  return {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
    ...(fontFamily ? { fontFamily } : {}),
    ...metrics,
  };
}

/** Large screen headings (e.g. shuttle "Today") — ~34px. */
export function buildRtlScreenTitleStyle(
  lang: Language,
): TextStyle | Record<string, never> {
  if (!isRTLLanguage(lang)) return {};

  const fontFamily = rtlBoldFontFamily(lang);
  const metrics =
    lang === 'ur'
      ? { lineHeight: 62, paddingTop: 10, paddingBottom: 4 }
      : { lineHeight: 44, paddingTop: 4, paddingBottom: 5 };

  return {
    fontSize: 34,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
    ...(fontFamily ? { fontFamily } : {}),
    ...metrics,
  };
}

/** Hero / status titles — ~30px bold centered. */
export function buildRtlHeroTitleStyle(
  lang: Language,
): TextStyle | Record<string, never> {
  if (!isRTLLanguage(lang)) return {};

  const fontFamily = rtlBoldFontFamily(lang);
  const metrics =
    lang === 'ur'
      ? { lineHeight: 54, paddingTop: 6, paddingBottom: 6 }
      : { lineHeight: 42, paddingTop: 4, paddingBottom: 5 };

  return {
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    writingDirection: 'rtl',
    ...(fontFamily ? { fontFamily } : {}),
    ...metrics,
  };
}

/** Hero body copy — ~18px medium centered. */
export function buildRtlHeroSubtitleStyle(
  lang: Language,
): TextStyle | Record<string, never> {
  if (!isRTLLanguage(lang)) return {};

  const fontFamily = rtlFontFamily(lang);
  const metrics =
    lang === 'ur'
      ? { lineHeight: 36, paddingTop: 2, paddingBottom: 7 }
      : { lineHeight: 30, paddingTop: 2, paddingBottom: 5 };

  return {
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    writingDirection: 'rtl',
    ...(fontFamily ? { fontFamily } : {}),
    ...metrics,
  };
}

/** Primary CTA button label — ~18px bold. */
export function buildRtlPrimaryButtonTextStyle(
  lang: Language,
): TextStyle | Record<string, never> {
  if (!isRTLLanguage(lang)) return {};

  const fontFamily = rtlBoldFontFamily(lang);
  const metrics =
    lang === 'ur'
      ? { lineHeight: 34, paddingTop: 2, paddingBottom: 5 }
      : { lineHeight: 28, paddingTop: 2, paddingBottom: 4 };

  return {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    writingDirection: 'rtl',
    ...(fontFamily ? { fontFamily } : {}),
    ...metrics,
  };
}

export function buildRtlPrimaryButtonContainerStyle(
  lang: Language,
): ViewStyle | Record<string, never> {
  if (!isRTLLanguage(lang)) return {};
  return {
    paddingVertical: lang === 'ur' ? 18 : 16,
  };
}

/** Form field labels — text-sm / 14px bold. */
export function buildRtlFormLabelStyle(
  lang: Language,
): TextStyle | Record<string, never> {
  if (!isRTLLanguage(lang)) return {};

  const fontFamily = rtlBoldFontFamily(lang);
  const metrics =
    lang === 'ur'
      ? { lineHeight: 28, paddingTop: 1, paddingBottom: 4 }
      : { lineHeight: 22, paddingTop: 1, paddingBottom: 3 };

  return {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
    ...(fontFamily ? { fontFamily } : {}),
    ...metrics,
  };
}

/** Step indicator labels — text-xs / 12px. */
export function buildRtlStepLabelStyle(
  lang: Language,
): TextStyle | Record<string, never> {
  if (!isRTLLanguage(lang)) return {};

  const fontFamily = rtlFontFamily(lang);
  const metrics =
    lang === 'ur'
      ? { lineHeight: 26, paddingTop: 1, paddingBottom: 5 }
      : { lineHeight: 20, paddingTop: 1, paddingBottom: 4 };

  return {
    fontSize: 12,
    textAlign: 'center',
    writingDirection: 'rtl',
    ...(fontFamily ? { fontFamily } : {}),
    ...metrics,
  };
}

/** Text inputs with RTL fonts and room for Nastaliq descenders. */
export function buildRtlTextInputStyle(
  lang: Language,
): TextStyle | Record<string, never> {
  if (!isRTLLanguage(lang)) return {};

  const fontFamily = rtlFontFamily(lang);
  const metrics =
    lang === 'ur'
      ? { lineHeight: 28, paddingVertical: 14, textAlign: 'right' as const }
      : { lineHeight: 24, paddingVertical: 12, textAlign: 'right' as const };

  return {
    writingDirection: 'rtl',
    ...(fontFamily ? { fontFamily } : {}),
    ...metrics,
  };
}

type RtlPromoTextSize = 'tag' | 'title' | 'caption';

export function buildRtlPromoTextStyle(
  lang: Language,
  size: RtlPromoTextSize,
): TextStyle | Record<string, never> {
  if (!isRTLLanguage(lang)) return {};

  const fontFamily = rtlBoldFontFamily(lang);
  const metricsBySize = {
    tag: {
      ur: { lineHeight: 22, paddingTop: 1, paddingBottom: 2 },
      ar: { lineHeight: 18, paddingTop: 1, paddingBottom: 1 },
    },
    title: {
      ur: { lineHeight: 44, paddingTop: 3, paddingBottom: 4 },
      ar: { lineHeight: 36, paddingTop: 2, paddingBottom: 2 },
    },
    caption: {
      ur: { lineHeight: 30, paddingTop: 2, paddingBottom: 3 },
      ar: { lineHeight: 26, paddingTop: 1, paddingBottom: 2 },
    },
  };
  const metrics = metricsBySize[size][lang as 'ur' | 'ar'];

  return {
    textAlign: 'right',
    writingDirection: 'rtl',
    ...(fontFamily ? { fontFamily } : {}),
    ...metrics,
  };
}

export function buildRtlDetailTextStyle(
  lang: Language,
): TextStyle | Record<string, never> {
  if (!isRTLLanguage(lang)) return {};

  const fontFamily = rtlFontFamily(lang);
  const metrics =
    lang === 'ur'
      ? { lineHeight: 36, paddingTop: 2, paddingBottom: 1 }
      : { lineHeight: 26, paddingTop: 1, paddingBottom: 1 };

  return {
    ...(fontFamily ? { fontFamily } : {}),
    ...metrics,
  };
}

type RtlDrawerTextSize = 'nav' | 'sub';

export function buildRtlDrawerTextStyle(
  lang: Language,
  size: RtlDrawerTextSize = 'nav',
): TextStyle | Record<string, never> {
  if (!isRTLLanguage(lang)) return {};

  const fontFamily = size === 'nav' ? rtlBoldFontFamily(lang) : rtlFontFamily(lang);
  const metrics =
    size === 'nav'
      ? { ur: { lineHeight: 38, paddingTop: 1 }, ar: { lineHeight: 36, paddingTop: 3 } }
      : { ur: { lineHeight: 34, paddingTop: 1 }, ar: { lineHeight: 32, paddingTop: 2 } };

  const { lineHeight, paddingTop } = metrics[lang as 'ur' | 'ar'];

  return {
    textAlign: 'right',
    writingDirection: 'rtl',
    ...(fontFamily ? { fontFamily } : {}),
    lineHeight,
    paddingTop,
    paddingBottom: 1,
  };
}

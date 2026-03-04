/**
 * Typography config — change `fontFamily` here to swap the app font globally.
 *
 * Current font: Geist (variable font — weights handled by `fontWeight`).
 *
 * Previous options (uncomment to switch):
 *   regular: 'Inter_400Regular'   medium: 'Inter_500Medium'   semibold: 'Inter_600SemiBold'
 *   regular: 'Montserrat_400Regular'   medium: 'Montserrat_500Regular'
 */

/** The active font family. All weight variants point here because Geist is a variable font. */
export const fontFamily = 'Geist';

export const typography = {
  family: {
    regular: fontFamily,
    medium: fontFamily,
    semibold: fontFamily,
    bold: fontFamily,
  },
  size: {
    xs: 11,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 22,
    display: 34,
  },
} as const;




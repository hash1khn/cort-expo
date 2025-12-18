import type { ViewStyle } from 'react-native';

export const shadows = {
  // Subtle lift (CortCard baseline)
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  } satisfies ViewStyle,

  // Floating UI (nav pill, sheets)
  floating: {
    shadowColor: 'rgba(12, 34, 94, 0.20)',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  } satisfies ViewStyle,
} as const;



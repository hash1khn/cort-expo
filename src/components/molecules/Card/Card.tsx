import React from 'react';
import { StyleProp, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';

import { colors, radii, shadows, spacing } from '../../../core/theme';

type Props = ViewProps & {
  style?: StyleProp<ViewStyle>;
};

export function CortCard({ style, children, ...rest }: Props) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.card,
    ...shadows.card,
  },
});



import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';

import { colors, radii, typography } from '../../../core/theme';

type Variant = 'primary' | 'navy' | 'outline';

type Props = {
  title: string;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function CortButton({
  title,
  variant = 'primary',
  disabled = false,
  loading = false,
  onPress,
  style,
  testID,
}: Props) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variantStyles.container[variant],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyles.activity[variant]} />
      ) : (
        <Text style={[styles.textBase, variantStyles.text[variant]]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 50,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  textBase: {
    fontFamily: typography.family.semibold,
    fontSize: 15,
    letterSpacing: 0.2,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.55,
  },
});

const variantStyles = {
  container: StyleSheet.create({
    primary: { backgroundColor: colors.orange },
    navy: { backgroundColor: colors.navy },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.red,
    },
  }) as Record<Variant, ViewStyle>,
  text: StyleSheet.create({
    primary: { color: colors.white },
    navy: { color: colors.white },
    outline: { color: colors.red },
  }),
  activity: {
    primary: colors.white,
    navy: colors.white,
    outline: colors.red,
  } as Record<Variant, string>,
} as const;



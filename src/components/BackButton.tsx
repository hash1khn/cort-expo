import React from 'react';
import { Pressable, Text, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/i18n/useLanguage';
import { buildRtlBackButtonTextStyle } from '@/i18n/types';

type Props = {
  label?: string;
  onPress: () => void;
  /** Pin to the leading screen edge (left in LTR, right in RTL). */
  anchored?: boolean;
  className?: string;
  style?: StyleProp<ViewStyle>;
  iconSize?: number;
  iconColor?: string;
  hitSlop?: number;
};

export function BackButton({
  label,
  onPress,
  anchored = true,
  className = '',
  style,
  iconSize = 26,
  iconColor = 'black',
  hitSlop,
}: Props) {
  const { isRTL, language } = useLanguage();
  const iconName = isRTL ? 'chevron-forward' : 'chevron-back';
  const rtlLabelStyle = label ? buildRtlBackButtonTextStyle(language) : undefined;

  const anchorClass = anchored ? (isRTL ? 'absolute right-4' : 'absolute left-4') : '';

  const leadingIcon = !isRTL ? (
    <Ionicons name={iconName} size={iconSize} color={iconColor} />
  ) : null;

  const trailingIcon = isRTL ? (
    <Ionicons name={iconName} size={iconSize} color={iconColor} />
  ) : null;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={hitSlop}
      className={`flex-row items-center ${anchorClass} ${className}`.trim()}
      style={style}
    >
      {leadingIcon}
      {label ? (
        <Text className="text-black text-lg font-medium" style={rtlLabelStyle}>
          {label}
        </Text>
      ) : null}
      {trailingIcon}
    </Pressable>
  );
}

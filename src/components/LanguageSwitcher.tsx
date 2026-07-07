import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useLanguage, type Language } from '@/i18n/useLanguage';
import { colors } from '../core/theme';

const OPTIONS: { label: string; value: Language; fontFamily?: string }[] = [
  { label: 'EN', value: 'en' },
  { label: 'اردو', value: 'ur' },
  { label: 'العربية', value: 'ar', fontFamily: 'NotoSansArabic_700Bold' },
];

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <View style={styles.container}>
      {OPTIONS.map((opt, idx) => {
        const isActive = language === opt.value;
        const isFirst = idx === 0;
        const isLast = idx === OPTIONS.length - 1;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => setLanguage(opt.value)}
            activeOpacity={0.75}
            style={[
              styles.pill,
              isFirst && styles.pillFirst,
              isLast && styles.pillLast,
              isActive && styles.pillActive,
            ]}
          >
            <Text
              style={[
                styles.label,
                isActive && styles.labelActive,
                opt.value === 'ur' && styles.labelUrdu,
                opt.fontFamily ? { fontFamily: opt.fontFamily, fontSize: 11 } : undefined,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 2,
    alignSelf: 'center',
  },
  pill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillFirst: {
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  pillLast: {
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  pillActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 0.3,
  },
  labelActive: {
    color: colors.orange ?? '#FF5A00',
  },
  labelUrdu: {
    fontSize: 13,
    fontWeight: '700',
  },
});

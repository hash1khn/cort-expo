import React, { useState } from 'react';
import { Pressable, Text as RNText, View } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import Animated, { Easing, FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useLanguage, type Language } from '@/i18n/useLanguage';
import { buildRtlDrawerTextStyle } from '@/i18n/types';
import { fontFamily } from '@/core/theme';

const Text = (props: React.ComponentProps<typeof RNText>) => (
  <RNText {...props} style={[{ fontFamily }, props.style]} />
);

const OPTIONS: { value: Language; labelKey: 'english' | 'urduLabel' | 'arabicLabel' }[] = [
  { value: 'en', labelKey: 'english' },
  { value: 'ur', labelKey: 'urduLabel' },
  { value: 'ar', labelKey: 'arabicLabel' },
];

const STAGGER_MS = 80;
const ENTER_DURATION_MS = 320;
const EXIT_DURATION_MS = 200;

export function DrawerLanguagePicker() {
  const { language, setLanguage, availableLanguages, t, isRTL, rtlRowStyle, drawerNavTextStyle } = useLanguage();
  const options = OPTIONS.filter((opt) => availableLanguages.includes(opt.value));
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (value: Language) => {
    setLanguage(value);
    setIsOpen(false);
  };

  return (
    <View>
      <Pressable
        onPress={() => setIsOpen((prev) => !prev)}
        style={rtlRowStyle}
        className="mb-2 flex-row items-center py-3"
      >
        <MaterialIcons name="language" size={20} color="white" />
        <Text className="text-white text-xl font-bold ms-4 flex-1" style={drawerNavTextStyle}>
          {t('common:language')}
        </Text>
        <MaterialCommunityIcons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="white"
        />
      </Pressable>

      {isOpen && (
        <View className={`mb-2 ${isRTL ? 'mr-9' : 'ml-9'}`}>
          {options.map((opt, index) => (
            <Animated.View
              key={opt.value}
              entering={FadeInDown.duration(ENTER_DURATION_MS)
                .delay(index * STAGGER_MS)
                .easing(Easing.out(Easing.cubic))}
              exiting={FadeOutUp.duration(EXIT_DURATION_MS).easing(Easing.in(Easing.cubic))}
            >
              <Pressable
                onPress={() => handleSelect(opt.value)}
                className="flex-row items-center justify-between pe-1 py-2.5"
              >
                <Text
                  className="text-white text-lg font-semibold"
                  style={buildRtlDrawerTextStyle(opt.value, 'sub')}
                >
                  {t(`common:${opt.labelKey}`)}
                </Text>
                {language === opt.value && (
                  <MaterialCommunityIcons name="check" size={22} color="#FF5A00" />
                )}
              </Pressable>
            </Animated.View>
          ))}
        </View>
      )}
    </View>
  );
}

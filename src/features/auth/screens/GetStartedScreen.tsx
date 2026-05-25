import React from 'react';
import {
  StyleSheet,
  Text as RNText,
  View,
  Platform,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
  interpolateColor,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontFamily } from '../../../core/theme';
import { CortButton } from '@/components';
import { LegalBottomSheet, LegalDocumentType } from '../components/LegalBottomSheet';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { LanguageSwitcher } from '../../../components/LanguageSwitcher';
import { useLanguage } from '../../../context/LanguageContext';

const { width, height } = Dimensions.get('window');

// Custom Text Component to ensure Font Consistency
const Text = (props: React.ComponentProps<typeof RNText>) => {
  return <RNText {...props} style={[{ fontFamily }, props.style]} />;
};

const CAROUSEL_DATA = [
  {
    id: '1',
    image: require('../../../../assets/user_onboard.svg'),
    title: 'Your Commute,\nSimplified', // Added new line for better balance
    subtitle: 'Safe • On-Time • Tracked',
  },
  {
    id: '2',
    image: require('../../../../assets/car_pool.svg'),
    title: 'Safe & Secure',
    subtitle: 'Professional chauffeurs you can trust.',
  },
  {
    id: '3',
    image: require('../../../../assets/bus_stop.svg'),
    title: 'Destinations,On Time',
    subtitle: 'Reliable shuttles for every route.',
  },
];

// ---------------------------------------------------------------------------
// Carousel Item
// ---------------------------------------------------------------------------
type CarouselItemProps = {
  item: (typeof CAROUSEL_DATA)[0];
  index: number;
  scrollX: SharedValue<number>;
};

function CarouselItem({ item, index, scrollX }: CarouselItemProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollX.value,
      [(index - 1) * width, index * width, (index + 1) * width],
      [0.9, 1, 0.9],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      scrollX.value,
      [(index - 1) * width, index * width, (index + 1) * width],
      [0, 1, 0],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <View style={styles.slide}>
      <Animated.View style={[styles.illustrationWrapper, animatedStyle]}>
        <Image
          source={item.image}
          style={styles.illustration}
          contentFit="contain"
        />
      </Animated.View>
      <View style={styles.textContainer}>
        <Text style={styles.heading}>{item.title}</Text>
        <Text style={styles.body}>{item.subtitle}</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Expanding Dot Indicator
// ---------------------------------------------------------------------------
function DotIndicator({ index, scrollX }: { index: number; scrollX: SharedValue<number> }) {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    
    // Expand from a dot (8px) to a pill (24px)
    const dotWidth = interpolate(
      scrollX.value,
      inputRange,
      [8, 24, 8],
      Extrapolation.CLAMP
    );

    const backgroundColor = interpolateColor(
      scrollX.value,
      inputRange,
      ['#E0E0E0', colors.orange, '#E0E0E0']
    );

    return {
      width: dotWidth,
      backgroundColor,
    };
  });

  return <Animated.View style={[styles.indicator, animatedStyle]} />;
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------
export function GetStartedScreen({ onGetStarted }: { onGetStarted?: () => void }) {
  const scrollX = useSharedValue(0);
  const bottomSheetRef = React.useRef<BottomSheetModal>(null);
  const [docType, setDocType] = React.useState<LegalDocumentType>('terms');
  const { t, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();

  const openLegalModal = (type: LegalDocumentType) => {
    setDocType(type);
    bottomSheetRef.current?.present();
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  // RTL text alignment helper
  const rtlText = isRTL ? { textAlign: 'right' as const, writingDirection: 'rtl' as const } : {};
  const rtlRow = isRTL ? { flexDirection: 'row-reverse' as const } : {};

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        {/* Language switcher — absolute top-right, respects safe area */}
        <View style={[styles.switcherWrap, { top: insets.top + 8 }]}>
          <LanguageSwitcher />
        </View>

        {/* Header: centered logo */}
        <View style={styles.header}>
          <Image
            source={require('../../../../assets/traflinq_logo_with_tagline.svg')}
            style={styles.logoImage}
            contentFit="contain"
          />
        </View>

        {/* Carousel */}
        <Animated.FlatList
          data={CAROUSEL_DATA}
          renderItem={({ item, index }) => (
            <CarouselItem item={item} index={index} scrollX={scrollX} />
          )}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.flatListContent}
        />

        {/* Pagination */}
        <View style={styles.indicatorContainer}>
          {CAROUSEL_DATA.map((_, i) => (
            <DotIndicator key={i} index={i} scrollX={scrollX} />
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <CortButton
            title={t('getStarted')}
            onPress={() => onGetStarted?.()}
            variant="primary"
          />
          <Text style={styles.footerLegalText}>
            {t('byClickingGetStarted')}{' '}
            <Text suppressHighlighting={true} style={styles.legalLink} onPress={() => openLegalModal('terms')}>
              {t('termsOfUse')}
            </Text>
            {' '}{t('and')}{' '}
            <Text suppressHighlighting={true} style={styles.legalLink} onPress={() => openLegalModal('privacy')}>
              {t('privacyPolicy')}
            </Text>
          </Text>
        </View>
      </SafeAreaView>
      <LegalBottomSheet ref={bottomSheetRef} type={docType} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    marginRight: 18,
  },
  logoImage: {
    width: 240,
    height: 280,
  },
  switcherWrap: {
    position: 'absolute',
    top: 12,
    right: 18,
    zIndex: 10,
  },
  flatListContent: {
    alignItems: 'center',
  },
  slide: {
    width: width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  illustrationWrapper: {
    width: width  * 0.8,
    height: height * 0.32,
    marginBottom: 10, 
    marginTop:5,// Tighter spacing to connect image/text
  },
  illustration: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    alignItems: 'center',
    width: '100%',
    minHeight: 80, // Prevents layout jump if text wraps
  },
  heading: {
    fontSize: 30,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -1,
    lineHeight: 36,
  },
  body: {
    fontSize: 17,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
    opacity: 0.6,
    letterSpacing: 0.2,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 40,
    marginBottom: 20,
  },
  indicator: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 20 : 30,
  },
  footerLegalText: {
    fontSize: 13,
    marginHorizontal: 2,
    color: colors.text,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 24,
    paddingVertical: 4,
    opacity: 0.5,
  },
  legalLink: {
    color: colors.orange,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
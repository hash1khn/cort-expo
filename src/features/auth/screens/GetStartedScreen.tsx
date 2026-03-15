import React from 'react';
import {
  Pressable,
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
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated'; // ✅ correct type import
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, fontFamily } from '../../../core/theme';
import { CortButton } from '@/components';

const Text = (props: React.ComponentProps<typeof RNText>) => {
  return <RNText {...props} style={[{ fontFamily }, props.style]} />;
};

const { width, height } = Dimensions.get('window');

type Props = {
  onGetStarted?: () => void;
  onApplyAsChauffeur?: () => void;
};

const CAROUSEL_DATA = [
  {
    id: '1',
    image: require('../../../../assets/user_onboard.svg'),
    title: 'Your Commute, Simplified',
    subtitle: 'Safe • On-Time • Tracked',
  },
  {
    id: '2',
    image: require('../../../../assets/car_pool.svg'),
    title: 'Safe & Secure',
    subtitle: 'Chauffeurs you can trust.',
  },
  {
    id: '3',
    image: require('../../../../assets/bus_stop.svg'),
    title: 'Destinations on time',
    subtitle: 'Shuttles for every route.',
  },
];

// ---------------------------------------------------------------------------
// Carousel Item
// ---------------------------------------------------------------------------
type CarouselItemProps = {
  item: (typeof CAROUSEL_DATA)[0];
  index: number;
  scrollX: SharedValue<number>; // ✅ use SharedValue<number> directly
};

function CarouselItem({ item, index, scrollX }: CarouselItemProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollX.value,
      [(index - 1) * width, index * width, (index + 1) * width],
      [0.8, 1, 0.8],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      scrollX.value,
      [(index - 1) * width, index * width, (index + 1) * width],
      [0.4, 1, 0.4],
      Extrapolation.CLAMP
    );
    return { transform: [{ scale }], opacity };
  });

  return (
    <View style={styles.slide}>
      {/*
        expo-image doesn't need createAnimatedComponent — we apply the
        animated style to a wrapping Animated.View instead, which is simpler
        and avoids any compatibility issues.
      */}
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
// Dot Indicator
// ---------------------------------------------------------------------------
type DotIndicatorProps = {
  index: number;
  scrollX: SharedValue<number>; // ✅
};

function DotIndicator({ index, scrollX }: DotIndicatorProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const dotWidth = interpolate(
      scrollX.value,
      [(index - 1) * width, index * width, (index + 1) * width],
      [8, 20, 8],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      scrollX.value,
      [(index - 1) * width, index * width, (index + 1) * width],
      [0.2, 1, 0.2],
      Extrapolation.CLAMP
    );
    return {
      width: dotWidth,
      opacity,
      backgroundColor: colors.orange,
    };
  });

  return <Animated.View style={[styles.indicator, animatedStyle]} />;
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------
export function GetStartedScreen({ onGetStarted, onApplyAsChauffeur }: Props) {
  const scrollX = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header: Logo */}
        <View style={styles.header}>
          <Image
            source={require('../../../../assets/cort-without-at-your.png')}
            style={styles.logoImage}
            contentFit="contain"
          />
        </View>

        {/* Middle: Carousel */}
        <View style={styles.carouselContainer}>
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
          />
        </View>

        {/* Pagination Dots */}
        <View style={styles.indicatorContainer}>
          {CAROUSEL_DATA.map((_, i) => (
            <DotIndicator key={i} index={i} scrollX={scrollX} />
          ))}
        </View>

        {/* Footer: Buttons */}
        <View style={styles.footer}>
          <CortButton
            title="Get Started"
            onPress={onGetStarted}
            variant="primary"
          />
          <Pressable onPress={onApplyAsChauffeur} style={styles.linkContainer}>
            <Text style={styles.linkText}>Apply as a chauffeur</Text>
          </Pressable>
        </View>
      </SafeAreaView>
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
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  logoImage: {
    width: 150,
    height: 50,
  },
  carouselContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  slide: {
    width: width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  illustrationWrapper: {
    width: width * 0.8,
    height: height * 0.35,
    marginBottom: 40,
  },
  illustration: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    alignItems: 'center',
    width: '100%',
  },
  heading: {
    fontSize: 26,
    fontWeight: '600',
    width: '100%',
    color: '#141414',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  body: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.7,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 32,
  },
  indicator: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 20 : 40,
  },
  linkContainer: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.navy,
    textDecorationLine: 'underline',
  },
});
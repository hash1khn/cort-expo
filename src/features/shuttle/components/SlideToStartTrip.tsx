import React, { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,

  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnUI } from 'react-native-worklets';
import { colors } from '@/core/theme';
import { scheduleOnRN } from 'react-native-worklets';
import { useLanguage } from '@/i18n/useLanguage';

const THUMB_SIZE = 65;
const TRACK_HEIGHT = 65;
const SPRING_CONFIG = {
  damping: 20,
  stiffness: 300,
};

type Props = {
  label?: string;
  onComplete: () => void;
};

export function SlideToStartTrip({ label, onComplete }: Props) {
  const { t } = useLanguage();
  const displayLabel = label ?? t('shuttle:slide.slideToStartTrip');
  const translateX = useSharedValue(0);
  const progressWidth = useSharedValue(0);
  const isComplete = useSharedValue(false);
  const trackWidth = useSharedValue(0);
  const maxTranslate = useSharedValue(0);

  const triggerComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (isComplete.value) return;
      const max = maxTranslate.value;
      const x = Math.max(0, Math.min(e.translationX, max));
      translateX.value = x;
      progressWidth.value = x + THUMB_SIZE / 2;
    })
    .onEnd((e) => {
      if (isComplete.value) return;
      const max = maxTranslate.value;
      const threshold = max * 0.85;
      if (e.translationX >= threshold) {
        isComplete.value = true;
        translateX.value = withSpring(max, SPRING_CONFIG);
        progressWidth.value = withTiming(trackWidth.value, { duration: 200 });
        scheduleOnRN(triggerComplete);
      } else {
        translateX.value = withTiming(0, {
          duration: 500,
          easing: Easing.out(Easing.cubic),
        });
        progressWidth.value = withTiming(0, {
          duration: 500,
          easing: Easing.out(Easing.cubic),
        });
      }
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: progressWidth.value,
  }));

  const onLayout = useCallback(
    (e: { nativeEvent: { layout: { width: number } } }) => {
      const w = e.nativeEvent.layout.width;
      trackWidth.value = w;
      maxTranslate.value = Math.max(0, w - THUMB_SIZE - 8);
    },
    [trackWidth, maxTranslate]
  );

  return (
    <View style={styles.wrapper} onLayout={onLayout}>
      <GestureDetector gesture={panGesture}>
        <View style={styles.track} className='bg-surface-light'>
          <Animated.View style={[styles.progressFill, progressStyle]} />
          <Text style={styles.label} pointerEvents="none">
            {displayLabel}
          </Text>
          <Animated.View style={[styles.thumb, thumbStyle]}>
            <Ionicons name="chevron-forward" size={26} color={colors.navy} />
          </Animated.View>
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
   
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(133, 111, 246, 0.35)',
    borderRadius: TRACK_HEIGHT / 2,
  },
  label: {
    position: 'absolute',
    alignSelf: 'center',
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
  },
  thumb: {
    position: 'absolute',
    left: 4,
    top: 4,
    width: THUMB_SIZE - 8,
    height: THUMB_SIZE - 8,
    borderRadius: (THUMB_SIZE - 8) / 2,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
});

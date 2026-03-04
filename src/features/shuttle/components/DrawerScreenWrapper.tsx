import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import { useDrawerProgress } from '@react-navigation/drawer';

export function DrawerScreenWrapper({ children }: { children: React.ReactNode }) {
  const progress = useDrawerProgress();
  const { width } = useWindowDimensions();

  const animatedStyle = useAnimatedStyle(() => {
    // scale from 1 down to 0.82
    const scale = interpolate(progress.value, [0, 1], [1, 0.82]);

    // add border radius when open
    const borderRadius = interpolate(progress.value, [0, 1], [0, 30]);

    // When scaling from the center, the right edge pulls away by: (totalWidth * (1 - scale)) / 2
    // We add a translateX to push it BACK to the right to close that gap.
    const gapToClose = (width * (1 - 0.82)) / 2;
    const translateX = interpolate(progress.value, [0, 1], [0, gapToClose]);

    return {
      transform: [{ scale }, { translateX }],
      borderRadius,
      overflow: 'hidden',
    };
  });

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff', // to avoid see-through if screen has transparent areas
  },
});

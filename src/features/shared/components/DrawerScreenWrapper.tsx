import React from 'react';
import { StyleSheet, useWindowDimensions, ViewStyle } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import { useDrawerProgress } from '@react-navigation/drawer';

interface DrawerScreenWrapperProps {
    children: React.ReactNode;
    style?: ViewStyle;
}

export function DrawerScreenWrapper({ children, style }: DrawerScreenWrapperProps) {
    const progress = useDrawerProgress();
    const { width } = useWindowDimensions();

    const animatedStyle = useAnimatedStyle(() => {
        // scale from 1 down to 0.82
        const scale = interpolate(progress.value, [0, 1], [1, 0.82]);

        // add border radius when open
        const borderRadius = interpolate(progress.value, [0, 1], [0, 30]);

        // When scaling from the center, the edge pulls away by: (totalWidth * (1 - scale)) / 2
        // We add a negative translateX to push it BACK to the left to close that gap (for left-sided drawer).
        const gapToClose = (width * (1 - 0.82)) / 2;
        const translateX = interpolate(progress.value, [0, 1], [0, -gapToClose]);

        return {
            transform: [{ scale }, { translateX }],
            borderRadius,
            overflow: 'hidden',
        };
    });

    return (
        <Animated.View style={[styles.container, animatedStyle, style]}>
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

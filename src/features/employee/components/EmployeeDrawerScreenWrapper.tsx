// import React from 'react';
// import { StyleSheet, useWindowDimensions } from 'react-native';
// import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
// import { useDrawerProgress } from '@react-navigation/drawer';

// export function EmployeeDrawerScreenWrapper({ children }: { children: React.ReactNode }) {
//     const progress = useDrawerProgress();
//     const { width } = useWindowDimensions();

//     const animatedStyle = useAnimatedStyle(() => {
//         // scale from 1 down to 0.82
//         const scale = interpolate(progress.value, [0, 1], [1, 0.75]);

//         // add border radius when open
//         const borderRadius = interpolate(progress.value, [0, 1], [0, 30]);

//         // When scaling from the center, the left edge pulls away by: (totalWidth * (1 - scale)) / 2
//         // We add a negative translateX to push it BACK to the left to close that gap.
//         const gapToClose = (width * (1 - 0.82)) / 1.3;
//         const translateX = interpolate(progress.value, [0, 1], [0, -gapToClose]);

//         return {
//             transform: [{ scale }, { translateX }],
//             borderRadius,
//             overflow: 'hidden',
//         };
//     });

//     const overlayStyle = useAnimatedStyle(() => {
//         const opacity = interpolate(progress.value, [0, 1], [0, 0.2]);
//         return { opacity };
//     });

//     return (
//         <Animated.View style={[styles.container, animatedStyle]}>
//             {children}
//             <Animated.View
//                 pointerEvents="none"
//                 style={[
//                     StyleSheet.absoluteFill,
//                     { backgroundColor: '#000' },
//                     overlayStyle,
//                 ]}
//             />
//         </Animated.View>
//     );
// }

// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//         backgroundColor: '#fff',
//     },
// });


import React from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import { useDrawerProgress } from '@react-navigation/drawer';

export function EmployeeDrawerScreenWrapper({ children }: { children: React.ReactNode }) {
    const progress = useDrawerProgress();
    const { width } = useWindowDimensions();

    const animatedStyle = useAnimatedStyle(() => {
        // scale from 1 down to 0.82
        const scale = interpolate(progress.value, [0, 1], [1, 0.75]);

        // add border radius when open
        const borderRadius = interpolate(progress.value, [0, 1], [0, 30]);

        // When scaling from the center, the left edge pulls away by: (totalWidth * (1 - scale)) / 2
        // We add a negative translateX to push it BACK to the left to close that gap.
        const gapToClose = (width * (1 - 0.82)) / 2;
        const translateX = interpolate(progress.value, [0, 1], [0, -gapToClose]);

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
        backgroundColor: '#fff',
    },
});

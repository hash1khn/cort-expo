import React, {
  createContext,
  memo,
  useContext,
  useState,
} from "react";
import {
  View,
  Pressable,
  StyleSheet,
  Platform,
  ViewStyle,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolation,
  useAnimatedProps,
  Easing,
  withSpring,
} from "react-native-reanimated";
import { BlurView, type BlurViewProps } from "expo-blur";
import * as Haptics from "expo-haptics";
import type {
  FlipCardBackProps,
  FlipCardFrontProps,
  FlipCardContextValue,
  FlipCardProps,
  FlipCardTriggerProps,
} from "./types";

const AnimatedBlurView =
  Animated.createAnimatedComponent<BlurViewProps>(BlurView);

const FlipCardContext = createContext<FlipCardContextValue | null>(null);

const useFlipCard = (): FlipCardContextValue => {
  const context = useContext(FlipCardContext);
  if (!context) {
    throw new Error(
      "FlipCard compound components must be used within FlipCard",
    );
  }
  return context;
};

export const FlipCard: React.FC<FlipCardProps> & {
  Front: React.FC<FlipCardFrontProps>;
  Back: React.FC<FlipCardBackProps>;
  Trigger: React.FC<FlipCardTriggerProps>;
} = ({
  children,
  width = 340,
  height = 480,
  borderRadius = 24,
  blurIntensity = 10,
  containerStyle,
  animationDuration = 600,
  enableHaptics = true,
  onFlip,
  blurTint = "light",
  scaleOnPress = true,
}) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const rotation = useSharedValue(0);
    const scale = useSharedValue(1);

    const flip = () => {
      if (enableHaptics) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const next = !isFlipped;
      setIsFlipped(next);

      rotation.value = withTiming(next ? 180 : 0, {
        duration: animationDuration,
        easing: Easing.inOut(Easing.cubic),
      });

      onFlip?.(next);
    };

    return (
      <FlipCardContext.Provider
        value={{
          isFlipped,
          flip,
          width,
          height,
          borderRadius,
          blurIntensity: Math.min(100, Math.max(0, blurIntensity)),
          animationDuration,
          rotation,
          scale,
          tint: blurTint,
          scaleEnabled: scaleOnPress,
        }}
      >
        <View style={[styles.container, containerStyle, { width, height }]}>
          {children}
        </View>
      </FlipCardContext.Provider>
    );
  };

/* ================= FRONT ================= */

const Front = memo<FlipCardFrontProps>(({ children, style }) => {
  const {
    rotation,
    scale,
    width,
    height,
    borderRadius,
    blurIntensity,
    tint,
  } = useFlipCard();

  const animatedStyle = useAnimatedStyle<
    Pick<ViewStyle, "transform" | "opacity">
  >(() => {
    const rotateY = interpolate(
      rotation.value,
      [0, 180],
      [0, 180],
      Extrapolation.CLAMP,
    );

    const opacity = interpolate(
      rotation.value,
      [0, 90, 90.01, 180],
      [1, 1, 0, 0],
      Extrapolation.CLAMP,
    );

    return {
      transform: [
        { perspective: 1000 },
        { rotateY: `${rotateY}deg` },
        { scale: scale.value },
      ],
      opacity,
    };
  });

  const blurProps = useAnimatedProps<Pick<BlurViewProps, "intensity">>(
    () => {
      const intensity =
        rotation.value <= 20
          ? withSpring(
            interpolate(
              rotation.value,
              [0, 20],
              [0, blurIntensity],
              Extrapolation.CLAMP,
            ),
          )
          : rotation.value >= 160
            ? withSpring(
              interpolate(
                rotation.value,
                [160, 180],
                [blurIntensity, 0],
                Extrapolation.CLAMP,
              ),
            )
            : blurIntensity;

      return { intensity };
    },
  );

  return (
    <Animated.View
      style={[
        styles.card,
        { width, height, borderRadius },
        animatedStyle,
        style,
      ]}
    >
      {children}

      {Platform.OS === "ios" && (
        <AnimatedBlurView
          tint={tint}
          animatedProps={blurProps}
          style={[
            StyleSheet.absoluteFill,
            { borderRadius, overflow: "hidden" },
          ]}
        />
      )}
    </Animated.View>
  );
});

/* ================= BACK ================= */

const Back = memo<FlipCardBackProps>(({ children, style }) => {
  const {
    rotation,
    scale,
    width,
    height,
    borderRadius,
    blurIntensity,
    tint,
  } = useFlipCard();

  const animatedStyle = useAnimatedStyle<
    Pick<ViewStyle, "transform" | "opacity">
  >(() => {
    const rotateY = interpolate(
      rotation.value,
      [0, 180],
      [180, 360],
      Extrapolation.CLAMP,
    );

    const opacity = interpolate(
      rotation.value,
      [0, 89.99, 90, 180],
      [0, 0, 1, 1],
      Extrapolation.CLAMP,
    );

    return {
      transform: [
        { perspective: 1000 },
        { rotateY: `${rotateY}deg` },
        { scale: scale.value },
      ],
      opacity,
    };
  });

  const blurProps = useAnimatedProps<Pick<BlurViewProps, "intensity">>(
    () => {
      const intensity =
        rotation.value >= 160
          ? withSpring(
            interpolate(
              rotation.value,
              [180, 160],
              [0, blurIntensity],
              Extrapolation.CLAMP,
            ),
          )
          : rotation.value <= 20
            ? withSpring(
              interpolate(
                rotation.value,
                [20, 0],
                [blurIntensity, 0],
                Extrapolation.CLAMP,
              ),
            )
            : blurIntensity;

      return { intensity };
    },
  );

  return (
    <Animated.View
      style={[
        styles.card,
        { width, height, borderRadius },
        animatedStyle,
        style,
      ]}
    >
      {children}

      {Platform.OS === "ios" && (
        <AnimatedBlurView
          tint={tint}
          animatedProps={blurProps}
          style={[
            StyleSheet.absoluteFill,
            { borderRadius, overflow: "hidden" },
          ]}
        />
      )}
    </Animated.View>
  );
});

/* ================= TRIGGER ================= */

import type { GestureResponderEvent } from "react-native";

const Trigger = memo<FlipCardTriggerProps>(
  ({ children, asChild, ...props }) => {
    const { flip, scale, scaleEnabled } = useFlipCard();

    const handlePressIn = (_e: GestureResponderEvent) => {
      if (scaleEnabled) {
        scale.value = withTiming(0.95, { duration: 100 });
      }
    };

    const handlePressOut = (_e: GestureResponderEvent) => {
      if (scaleEnabled) {
        scale.value = withTiming(1, { duration: 200 });
      }
    };

    const handlePress = (_e: GestureResponderEvent) => {
      flip();
    };

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{
        onPress?: ((e: GestureResponderEvent) => void) | null;
        onPressIn?: ((e: GestureResponderEvent) => void) | null;
        onPressOut?: ((e: GestureResponderEvent) => void) | null;
      }>;

      return React.cloneElement(child, {
        onPress: (e: GestureResponderEvent) => {
          child.props.onPress?.(e);
          handlePress(e);
        },
        onPressIn: (e: GestureResponderEvent) => {
          child.props.onPressIn?.(e);
          handlePressIn(e);
        },
        onPressOut: (e: GestureResponderEvent) => {
          child.props.onPressOut?.(e);
          handlePressOut(e);
        },
        ...props,
      });
    }

    return (
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={StyleSheet.absoluteFill}
        {...props}
      >
        {children}
      </Pressable>
    );
  },
);
FlipCard.Front = Front;
FlipCard.Back = Back;
FlipCard.Trigger = Trigger;

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  card:
    Platform.OS === "android"
      ? {
        position: "absolute",
        backgroundColor: "#1a1a1a",
        overflow: "hidden",
        backfaceVisibility: "hidden",
      }
      : {
        position: "absolute",
        backgroundColor: "#1a1a1a",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 12,
        overflow: "hidden",
        backfaceVisibility: "hidden",
      },
});
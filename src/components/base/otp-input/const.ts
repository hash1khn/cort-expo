import {
  FadeInDown,
  FadeOutDown,
  FadeInUp,
  FadeOutUp,
  ZoomIn,
  ZoomOut,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';

export type AnimationVariant = 'fadeSlideDown' | 'fadeSlideUp' | 'scale' | 'fade';

export const ANIMATION_VARIATIONS: Record<
  AnimationVariant,
  { entering: any; exiting: any }
> = {
  fadeSlideDown: {
    entering: FadeInDown,
    exiting: FadeOutDown,
  },
  fadeSlideUp: {
    entering: FadeInUp,
    exiting: FadeOutUp,
  },
  scale: {
    entering: ZoomIn,
    exiting: ZoomOut,
  },
  fade: {
    entering: FadeIn,
    exiting: FadeOut,
  },
};

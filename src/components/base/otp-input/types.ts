import type { ViewStyle, TextStyle } from 'react-native';
import type { MutableRefObject } from 'react';
import type { AnimationVariant } from './const';

export interface IOtpInput {
  otpCount?: number;
  containerStyle?: ViewStyle;
  otpInputStyle?: ViewStyle;
  textStyle?: TextStyle;
  focusedColor?: string;
  inputWidth?: number;
  inputHeight?: number;
  inputBorderRadius?: number;
  autoFocus?: boolean;
  enableAutoFocus?: boolean;
  editable?: boolean;
  onInputFinished?: (value: string) => void;
  onInputChange?: (value: string) => void;
  enteringAnimated?: any;
  exitingAnimated?: any;
  error?: boolean;
  errorMessage?: string;
  animationVariant?: AnimationVariant;
  focusedBackgroundColor?: string;
  unfocusedBackgroundColor?: string;
  focusedBorderColor?: string;
  unfocusedBorderColor?: string;
  errorBackgroundColor?: string;
  errorBorderColor?: string;
  [key: string]: any;
}

export interface IOtpContext {
  inputRef: MutableRefObject<any[]>;
  otpValue: string[];
  onPress: () => void;
  onFocusNext: (value: string, index: number) => void;
  onFocusPrevious: (key: string, index: number) => void;
  setFocus: (focus: number) => void;
  setOtpValue: (value: string[]) => void;
  focus: number;
  containerStyle?: ViewStyle;
  otpInputStyle?: ViewStyle;
  textStyle?: TextStyle;
  focusedColor?: string;
  otpCount: number;
  editable?: boolean;
  autoFocus?: boolean;
  error?: boolean;
  inputBorderRadius?: number;
  inputWidth?: number;
  inputHeight?: number;
  animationVariant?: AnimationVariant;
  focusedBackgroundColor?: string;
  unfocusedBackgroundColor?: string;
  focusedBorderColor?: string;
  unfocusedBorderColor?: string;
  errorBackgroundColor?: string;
  errorBorderColor?: string;
  enteringAnimated?: any;
  exitingAnimated?: any;
  [key: string]: any;
}

export interface IOtpItem {
  index: number;
}

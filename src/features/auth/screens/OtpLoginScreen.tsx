import React, { useState, useRef, useCallback } from 'react';
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { CortButton } from '../../../components';
import { colors, typography } from '../../../core/theme';
import { OtpInput } from '../../../components/base/otp-input';

type Step = 'phone' | 'otp';

// Mock country codes
const COUNTRY_CODE = '+92';

export function OtpLoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [focusedPhone, setFocusedPhone] = useState(false);
  const [otpError, setOtpError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const phoneRef = useRef<TextInput>(null);

  useFocusEffect(
    useCallback(() => {
      // Wait for screen transition to finish before opening keyboard
      const t = setTimeout(() => phoneRef.current?.focus(), 400);
      return () => clearTimeout(t);
    }, [])
  );

  const formattedPhone = phone.trim().length > 0 ? `${COUNTRY_CODE} ${phone.trim()}` : '';

  const handleContinue = () => {
    if (phone.trim().length < 6) return;
    setStep('otp');
  };

  const handleOtpFinished = async (code: string) => {
    setIsVerifying(true);
    // Mock: any 6-digit code is accepted
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setIsVerifying(false);
    // Navigate to login – mock auth flow ends here
    router.replace('/(auth)/login');
  };

  const handleResend = async () => {
    setIsResending(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsResending(false);
  };

  const handleBack = () => {
    if (step === 'otp') {
      setStep('phone');
      setOtpError(false);
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: 'padding', android: 'height' })}
        keyboardVerticalOffset={Platform.select({ ios: 0, android: 8 })}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            style={styles.container}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets
            showsVerticalScrollIndicator={false}
          >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../../../assets/cort-with-at-your.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          {step === 'phone' ? (
            <Animated.View entering={FadeInUp.duration(300)} style={styles.stepContainer}>
              {/* Header */}
              
              <Text style={styles.title}>Enter your number</Text>
              <Text style={styles.subtitle}>
                We'll send a one-time code to verify your identity.
              </Text>

              {/* Phone Input */}
              <View style={styles.field}>
                <Text style={styles.label}>Phone number</Text>
                <View
                  style={[
                    styles.phoneInputContainer,
                    focusedPhone && styles.inputFocused,
                  ]}
                >
                  {/* Country Code Badge */}
                  <View style={styles.countryCode}>
                    <Text style={styles.countryCodeText}>{COUNTRY_CODE}</Text>
                  </View>
                  <View style={styles.divider} />
                  <TextInput
                    ref={phoneRef}
                    value={phone}
                    onChangeText={setPhone}
                    onFocus={() => setFocusedPhone(true)}
                    onBlur={() => setFocusedPhone(false)}
                    keyboardType="phone-pad"
                    placeholder="(555) 000-0000"
                    placeholderTextColor={colors.muted}
                    style={styles.phoneInput}
                    cursorColor={colors.orange}
                    
                    onSubmitEditing={handleContinue}
                  />
                  {phone.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setPhone('')}
                      style={styles.iconButton}
                    >
                      <Ionicons name="close-circle" size={20} color={colors.muted} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={styles.actionRow}>
                <CortButton
                  title="Continue"
                  variant="primary"
                  disabled={phone.trim().length < 6}
                  onPress={handleContinue}
                />
              </View>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInDown.duration(300)} style={styles.stepContainer}>
              {/* Header */}
              
              <Text style={styles.title}>Verify your number</Text>
              <Text style={styles.subtitle}>
                Enter the 6-digit code sent to your phone
              </Text>

              {/* OTP Input */}
              <View style={styles.otpWrapper}>
                <OtpInput
                  otpCount={4}
                  enableAutoFocus
                  animationVariant="fadeSlideDown"
                  inputBorderRadius={14}
                  inputWidth={60}
                  inputHeight={56}
                  error={otpError}
                  errorMessage="Incorrect code. Please try again."
                  // Light theme colour overrides
                  focusedBackgroundColor="#FFF5F0"
                  unfocusedBackgroundColor="#FFFF"
                  focusedBorderColor={colors.orange}
                  unfocusedBorderColor="#eaeaea"
                  errorBackgroundColor="rgba(211, 47, 47, 0.05)"
                  errorBorderColor={colors.red}
                  textStyle={styles.otpText}
                  onInputFinished={handleOtpFinished}
                />
              </View>

              {isVerifying && (
                <Animated.Text entering={FadeInDown.duration(200)} style={styles.verifyingText}>
                  Verifying...
                </Animated.Text>
              )}

              {/* Resend */}
              <Pressable
                onPress={handleResend}
                disabled={isResending}
                style={({ pressed }) => [styles.resendBtn, pressed && { opacity: 0.6 }]}
              >
                <Text style={styles.resendText}>
                  {isResending ? 'Sending...' : "Didn't receive a code? "}
                  {!isResending && (
                    <Text style={styles.resendLink}>Resend</Text>
                  )}
                </Text>
              </Pressable>
            </Animated.View>
          )}
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  scrollContent: {
    flexGrow: 1,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoImage: {
    width: 180,
    height: 180,
  },
  stepContainer: {},
  headerIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 90, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: typography.family.regular,
    fontWeight: '700',
    fontSize: 22,
    color: '#1A1A1A',
    marginBottom: 8,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: typography.family.regular,
    fontWeight: '400',
    fontSize: 14,
    color: colors.muted,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 28,
  },
  phoneHighlight: {
    fontWeight: '600',
    color: '#1A1A1A',
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontFamily: typography.family.regular,
    fontWeight: '600',
    fontSize: 14,
    color: '#1A1A1A',
    marginBottom: 8,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#eaeaea',
    paddingRight: 12,
  },
  inputFocused: {
    borderColor: colors.orange,
  },
  countryCode: {
    paddingHorizontal: 14,
    height: '100%',
    justifyContent: 'center',
  },
  countryCodeText: {
    fontFamily: typography.family.regular,
    fontWeight: '600',
    fontSize: 16,
    color: '#1A1A1A',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#EAEAEA',
    marginRight: 12,
  },
  phoneInput: {
    flex: 1,
    height: '100%',
    fontFamily: typography.family.regular,
    fontWeight: '500',
    fontSize: 16,
    color: '#1A1A1A',
  },
  iconButton: {
    padding: 4,
    marginLeft: 8,
  },
  actionRow: {
    marginTop: 8,
  },
  otpWrapper: {
    alignItems: 'center',
    marginBottom: 8,
    marginLeft: -24,
    marginRight: -24,
  },
  otpText: {
    fontFamily: typography.family.regular,
    fontWeight: '700',
    fontSize: 20,
    color: '#1A1A1A',
  },
  verifyingText: {
    fontFamily: typography.family.regular,
    fontWeight: '500',
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  resendBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
    marginTop: 8,
  },
  resendText: {
    fontFamily: typography.family.regular,
    fontWeight: '400',
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
  },
  resendLink: {
    fontWeight: '600',
    color: colors.orange,
    textDecorationLine: 'underline',
  },
});

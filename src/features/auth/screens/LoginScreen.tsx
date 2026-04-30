import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { CortButton } from '../../../components';
import { colors, radii, typography } from '../../../core/theme';
import { useRouter } from 'expo-router';
import { useAppDispatch } from '../../../store/hooks';
import { logIn } from '../store';
import { useLoginMutation } from '../services/authApi';
import { getHomePathForRole } from '../utils/getHomePathForRole';
import { credentialStorage, BiometricType } from '../utils/credentialStorage';
import { ChauffeurSignupBottomSheet } from '../components/ChauffeurSignupBottomSheet';
import { BottomSheetModal } from '@gorhom/bottom-sheet';

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Biometric state
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType>(null);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);

  const dispatch = useAppDispatch();
  const router = useRouter();
  const [login, { isLoading: isSubmitting }] = useLoginMutation();
  const forgotPasswordSheetRef = useRef<BottomSheet>(null);
  const chauffeurSheetRef = useRef<BottomSheetModal>(null);

  // On mount: check if biometric login is available and credentials are saved
  useEffect(() => {
    (async () => {
      const [available, hasCreds, type] = await Promise.all([
        credentialStorage.isBiometricAvailable(),
        credentialStorage.hasSavedCredentials(),
        credentialStorage.getBiometricType(),
      ]);
      setBiometricAvailable(available && hasCreds);
      setBiometricType(type);
    })();
  }, []);

  const openForgotPassword = useCallback(() => {
    forgotPasswordSheetRef.current?.expand();
  }, []);

  const closeForgotPassword = useCallback(() => {
    forgotPasswordSheetRef.current?.close();
  }, []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.4} />
    ),
    []
  );

  const canLogin = useMemo(() => email.trim().length > 0 && password.length > 0, [email, password]);

  /**
   * After a successful password login, optionally prompt the user to enable
   * biometric login for future sessions. Only shown once, or if they haven't
   * saved credentials yet.
   */
  const promptBiometricEnrollment = useCallback(
    async (savedEmail: string, savedPassword: string) => {
      const [hwAvailable, alreadyPrompted, hasCreds] = await Promise.all([
        credentialStorage.isBiometricAvailable(),
        credentialStorage.hasBeenPrompted(),
        credentialStorage.hasSavedCredentials(),
      ]);

      if (!hwAvailable || (alreadyPrompted && hasCreds)) return;

      const type = await credentialStorage.getBiometricType();
      const label =
        type === 'faceid'
          ? 'Face ID'
          : type === 'iris'
          ? 'Iris Recognition'
          : 'Fingerprint';

      await credentialStorage.markAsPrompted();

      Alert.alert(
        `Enable ${label}`,
        `Would you like to use ${label} to sign in faster next time?`,
        [
          {
            text: 'Not Now',
            style: 'cancel',
          },
          {
            text: 'Enable',
            onPress: async () => {
              await credentialStorage.saveCredentials(savedEmail, savedPassword);
              setBiometricAvailable(true);
              setBiometricType(type);
            },
          },
        ],
        { cancelable: false }
      );
    },
    []
  );

  const runLogin = async (candidateEmail: string, candidatePassword: string) => {
    const normalizedEmail = candidateEmail.trim();
    try {
      setError(null);
      const result = await login({ email: normalizedEmail, password: candidatePassword }).unwrap();
      dispatch(logIn({ role: result.role, user: result.user }));
      // Keep saved biometric credentials in sync when password changes.
      const hasSavedBiometricCredentials = await credentialStorage.hasSavedCredentials();
      if (hasSavedBiometricCredentials) {
        await credentialStorage.saveCredentials(normalizedEmail, candidatePassword);
      } else {
        // Prompt to enable biometrics for first-time enrollment.
        promptBiometricEnrollment(normalizedEmail, candidatePassword);
      }
      router.replace(getHomePathForRole(result.role) as Parameters<typeof router.replace>[0]);
    } catch (e: any) {
      const msg = e?.data?.message || e?.message || 'Login failed';
      setError(msg);
    }
  };

  const handleLogin = async () => {
    await runLogin(email, password);
  };

  const isFaceIdBiometric = biometricType === 'faceid';

  const biometricLabel = useMemo(() => {
    if (biometricType === 'faceid') return 'Sign in with Face ID';
    if (biometricType === 'iris') return 'Sign in with Iris';
    return 'Sign in with Fingerprint';
  }, [biometricType]);

  const handleBiometricLogin = async () => {
    try {
      setIsBiometricLoading(true);
      setError(null);

      const storedCredentials = await credentialStorage.getCredentialsWithBiometricPrompt();

      if (!storedCredentials) {
        setError('No saved login found. Please sign in with your email and password first.');
        return;
      }

      // Populate fields visually so the user sees what's happening
      setEmail(storedCredentials.email);
      setPassword(storedCredentials.password);
      await runLogin(storedCredentials.email, storedCredentials.password);
    } catch (e) {
      const rawMessage =
        typeof e === 'string'
          ? e
          : e instanceof Error
          ? e.message
          : 'Biometric authentication failed';
      if (rawMessage === 'cancelled') return; // silent cancel
      setError(rawMessage);
    } finally {
      setIsBiometricLoading(false);
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
            contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top , paddingBottom: insets.bottom + 24 }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            {/* Centered Logo */}
            <View style={styles.logoContainer}>
              <Image
                source={require('../../../../assets/traflinq-logo-big.svg')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>

            {/* Heading */}
            <Text style={styles.title}>Login to your account</Text>

            {/* Email Input */}
            <View style={styles.field}>
              <Text style={styles.label}>Email address</Text>
              <View style={[
                styles.inputContainer,
                focusedField === 'email' && styles.inputFocused,
                error && styles.inputError
              ]}>
                <TextInput
                  value={email}
                  onChangeText={(t) => { setEmail(t); setError(null); }}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  placeholder="employee@cort.com"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  cursorColor="#FF5A00"
                  returnKeyType="next"
                />
                {email.length > 0 && (
                  <TouchableOpacity onPress={() => setEmail('')} style={styles.iconButton}>
                    <Ionicons name="close-circle" size={20} color={colors.muted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <View style={[
                styles.inputContainer,
                focusedField === 'password' && styles.inputFocused,
                error && styles.inputError
              ]}>
                <TextInput
                  value={password}
                  onChangeText={(t) => { setPassword(t); setError(null); }}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="none"
                  secureTextEntry={!showPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  cursorColor="#FF5A00"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity 
                  onPress={() => setShowPassword(!showPassword)} 
                  style={styles.iconButton}
                >
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.muted} />
                </TouchableOpacity>
              </View>
              
              {/* Forgot Password Link - Right Aligned below input */}
              <Pressable onPress={openForgotPassword}>
                <Text style={styles.forgotPass}>Forgot password?</Text>
              </Pressable>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Primary Action Button */}
            <View style={styles.actionRow}>
              <CortButton
                title="Log in"
                variant="primary"
                disabled={isSubmitting}
                loading={isSubmitting}
                onPress={handleLogin}
              />
            </View>

            <View style={styles.chauffeurApplyRow}>
              <Text style={styles.chauffeurApplyText}>
                Want to join our fleet?{' '}
                <Text
                  style={styles.chauffeurApplyLink}
                  onPress={() => chauffeurSheetRef.current?.present()}
                >
                  Apply as Chauffeur
                </Text>
              </Text>
            </View>

            
            {/* Biometric Option – only rendered when hardware + credentials are ready */}
            {biometricAvailable && (
              <View style={styles.footer}>
                <Pressable
                  onPress={handleBiometricLogin}
                  disabled={isBiometricLoading || isSubmitting}
                  style={({ pressed }) => [
                    styles.biometricBtn,
                    (isBiometricLoading || isSubmitting) && styles.biometricBtnDisabled,
                    pressed && styles.biometricBtnPressed,
                  ]}
                >
                  <View style={styles.biometricIconWrap}>
                    {isBiometricLoading ? (
                      <Ionicons name="ellipsis-horizontal" size={30} color="#141414" />
                    ) : isFaceIdBiometric ? (
                      <Image
                        source={require('../../../../assets/faceid.svg')}
                        style={styles.faceIdIcon}
                        contentFit="contain"
                      />
                    ) : (
                      <Ionicons name="finger-print-outline" size={30} color="#141414" />
                    )}
                  </View>
                  <Text style={styles.biometricText}>
                    {isBiometricLoading ? 'Verifying…' : biometricLabel}
                  </Text>
                </Pressable>
              </View>
            )}

          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
      {/* Forgot Password Bottom Sheet */}
      <BottomSheet
        ref={forgotPasswordSheetRef}
        index={-1}
        snapPoints={['35%']}
        enableDynamicSizing={false}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        detached
        bottomInset={40}
        style={styles.sheetContainer}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetIndicator}
      >
        <BottomSheetView style={styles.sheetContent}>
          <View style={styles.sheetIconWrap}>
            <Ionicons name="lock-closed-outline" size={28} color="#FF5A00" />
          </View>
          <Text style={styles.sheetTitle}>Forgot Password?</Text>
          <Text style={styles.sheetBody}>
            Please contact your company admin for password reissuance.
          </Text>
          <Pressable style={styles.sheetCloseBtn} onPress={closeForgotPassword}>
            <Text style={styles.sheetCloseBtnText}>Close</Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheet>
      <ChauffeurSignupBottomSheet ref={chauffeurSheetRef as any} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Clean white background
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
    marginRight:15
  },

  logoImage: {
    width: 280,
    height: 250,
    marginBottom:-20,
  },
  title: {
    fontFamily: typography.family.regular,
    fontWeight: '700',
    fontSize: 20,
    color: '#1A1A1A',
    marginBottom: 32, // Generous spacing before inputs
    letterSpacing: -0.5,
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#eaeaea', // The requested gray color
    paddingHorizontal: 16,
  },
  inputFocused: {
    borderColor: '#FF5A00', // Brand primary color on focus
  },
  inputError: {
    borderColor: colors.red,
  },
  input: {
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
  forgotPass: {
    alignSelf: 'flex-end',
    marginTop: 12,
    fontFamily: typography.family.regular,
    fontWeight: '600',
    fontSize: 13,
    color: '#6B7280', // Subdued gray text
  },
  errorContainer: {
    backgroundColor: 'rgba(211, 47, 47, 0.05)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: colors.red,
  },
  errorText: {
    fontFamily: typography.family.regular,
    fontWeight: '500',
    fontSize: 13,
    color: colors.red,
  },
  actionRow: {
    marginTop: 16,
  },
  chauffeurApplyRow: {
    marginTop: 16,
    alignItems: 'center',
  },
  chauffeurApplyText: {
    fontFamily: typography.family.regular,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  chauffeurApplyLink: {
    fontWeight: '700',
    color: '#FF5A00',
    textDecorationLine: 'underline',
  },
  debugText: {
    marginTop: 8,
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    fontFamily: typography.family.regular,
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  biometricBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 10,
    width: '100%',
  },
  biometricBtnPressed: {
    opacity: 0.55,
  },
  biometricBtnDisabled: {
    opacity: 0.4,
  },
  biometricIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 90, 0, 0.08)',
    alignItems: 'center',
    marginHorizontal:'auto',
    justifyContent: 'center',
  },
  faceIdIcon: {
    width: 30,
    height: 30,
  },
  biometricText: {
    fontFamily: typography.family.regular,
    fontWeight: '600',
    fontSize: 14,
    color: '#1A1A1A',
    marginTop:8,
    textAlign: 'center',
    alignSelf: 'center',
  },
  sheetContainer: {
    marginHorizontal: 10,
  },
  sheetBackground: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#eaeaea',
  },
  sheetIndicator: {
    backgroundColor: '#D1D5DB',
    width: 40,
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
    alignItems: 'center',
  },
  sheetIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 90, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  sheetTitle: {
    fontFamily: typography.family.regular,
    fontWeight: '700',
    fontSize: 18,
    color: '#1A1A1A',
    marginBottom: 8,
    marginTop: 8,
    letterSpacing: -0.3,
  },
  sheetBody: {
    fontFamily: typography.family.regular,
    fontWeight: '400',
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  sheetCloseBtn: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    marginTop: 0,
    backgroundColor: '#FF5A00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCloseBtnText: {
    fontFamily: typography.family.regular,
    fontWeight: '600',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
import React, { useMemo, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
  StatusBar,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Assuming these are your core components
import { CortButton } from '../../../components';
import { colors, radii, typography } from '../../../core/theme';
import { useRouter } from 'expo-router';
import { useAppDispatch } from '../../../store/hooks';
import { logIn } from '../store';
import { useLoginMutation } from '../services/authApi';
import { mockApi } from '../../../services/mockApi';
import { getHomePathForRole } from '../utils/getHomePathForRole';

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // UI States
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const dispatch = useAppDispatch();
  const router = useRouter();
  const [login, { isLoading: isSubmitting }] = useLoginMutation();
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);

  const canLogin = useMemo(() => email.trim().length > 0 && password.length > 0, [email, password]);

  const handleLogin = async () => {
    try {
      setError(null);
      const result = await login({ email: email.trim(), password }).unwrap();
      dispatch(logIn({ role: result.role, user: result.user }));
      router.replace(getHomePathForRole(result.role) as Parameters<typeof router.replace>[0]);
    } catch (e: any) {
      const msg = e?.data?.message || e?.message || 'Login failed';
      setError(msg);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      setIsBiometricLoading(true);
      setError(null);

      // Simulate face/fingerprint scan delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Use mock employee credentials from mockData.ts
      const { role, user } = await mockApi.login('employee@cort.com', '123456');
      dispatch(logIn({ role, user }));
      router.replace(getHomePathForRole(role) as Parameters<typeof router.replace>[0]);
    } catch (e) {
      const msg = typeof e === 'string' ? e : e instanceof Error ? e.message : 'Biometric authentication failed';
      setError(msg);
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
      >
        <ScrollView
            style={styles.container}
            contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            {/* Centered Logo */}
            <View style={styles.logoContainer}>
              <Image
                source={require('../../../../assets/cort-with-at-your.png')}
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
              <Pressable onPress={() => navigation.navigate('ForgotPassword')}>
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

            {/* Biometric Option */}
            <View style={styles.footer}>
              <Pressable
                onPress={handleBiometricLogin}
                disabled={isBiometricLoading || isSubmitting}
                style={({ pressed }) => [
                  styles.biometricBtn,
                  pressed && styles.biometricBtnPressed
                ]}
              >
                <Ionicons
                  name="finger-print-outline"
                  size={32}
                  color="#1A1A1A"
                  className='text-center'
                />
                <Text style={styles.biometricText}>
                  {isBiometricLoading ? 'Verifying...' : 'Unlock with Face ID'}
                </Text>
              </Pressable>
            </View>

          </ScrollView>
      </KeyboardAvoidingView>
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
  
  },
  logoImage: {
    
    width: 200, // Adjusted size to be an elegant top-center accent
    height: 200,
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
  footer: {
    marginTop: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  biometricBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  biometricBtnPressed: {
    opacity: 0.5,
  },
  biometricText: {
    fontFamily: typography.family.regular,
    fontWeight: '600',
    fontSize: 14,
    color: '#1A1A1A',
    marginTop: 8,
  },
});
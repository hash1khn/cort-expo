import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Assuming these are your core components
import { CortButton, CortCard } from '../../../components';
import { colors, radii, typography } from '../../../core/theme';
import { useAppDispatch } from '../../../store/hooks';
import { logIn } from '../store';
import { login as authLogin } from '../services';
import { mockApi } from '../../../services/mockApi';

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Focused state for inputs to add polish
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);

  const dispatch = useAppDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);

  const canLogin = useMemo(() => email.trim().length > 0 && password.length > 0, [email, password]);

  const handleLogin = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      const { role } = await authLogin(email.trim(), password);
      dispatch(logIn(role));
    } catch (e) {
      const msg = typeof e === 'string' ? e : e instanceof Error ? e.message : 'Login failed';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      setIsBiometricLoading(true);
      setError(null);

      // Simulate face/fingerprint scan delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Use mock employee credentials from mockData.ts
      const user = await mockApi.login('employee@cort.com', '123456');
      dispatch(logIn(user.role));
    } catch (e) {
      const msg = typeof e === 'string' ? e : e instanceof Error ? e.message : 'Biometric authentication failed';
      setError(msg);
    } finally {
      setIsBiometricLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['left', 'right', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.navy} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        {/* Header Section - Deep Navy */}
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <View style={styles.logoRow}>
            <Image
              source={require('../../../../assets/Asset-1@2x (1).png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            {/* <View>
              <Text style={styles.logoText}>CORT</Text>
              <Text style={styles.logoSubText}>At Your Service</Text>
            </View> */}
          </View>
        </View>

        {/* Floating Card */}
        <View style={styles.contentContainer}>
          <CortCard style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to access your dashboard</Text>
            </View>

            {/* Email Input */}
            <View style={styles.field}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                value={email}
                onChangeText={(t) => { setEmail(t); setError(null); }}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder="name@company.com"
                placeholderTextColor={colors.muted}
                style={[
                  styles.input,
                  focusedField === 'email' && styles.inputFocused,
                  error && styles.inputError
                ]}
                cursorColor={colors.orange}
              />
            </View>

            {/* Password Input */}
            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Password</Text>
                {/* Forgot Password Link */}
                <Pressable onPress={() => navigation.navigate('ForgotPassword')}>
                  <Text style={styles.forgotPass}>Forgot Password?</Text>
                </Pressable>
              </View>
              <TextInput
                value={password}
                onChangeText={(t) => { setPassword(t); setError(null); }}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                autoCapitalize="none"
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor={colors.muted}
                style={[
                  styles.input,
                  focusedField === 'password' && styles.inputFocused,
                  error && styles.inputError
                ]}
                cursorColor={colors.orange}
              />
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Primary Action - Cort Orange */}
            <View style={styles.actionRow}>
              <CortButton
                title="Sign In"
                variant="primary"

                disabled={!canLogin || isSubmitting}
                loading={isSubmitting}
                onPress={handleLogin}
              />
            </View>
          </CortCard>


          {/* Public Signup Link for Chauffeurs */}
          <View style={styles.footer}>

            {/* Biometric Option */}
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
                color={colors.navy}
                className="text-center"
              />
              <Text style={styles.biometricText} className="text-center">
                {isBiometricLoading ? 'Verifying...' : 'Unlock with Face ID'}
              </Text>
            </Pressable>

            {/* <View style={styles.divider} /> */}

            {/* <Text style={styles.footerText}>Want to drive with us?</Text>
            <Pressable
              onPress={() => navigation.navigate('ChauffeurSignup')}
              style={({ pressed }) => [styles.linkBtn, pressed && styles.linkBtnPressed]}
            >
              <Text style={styles.linkText}>Apply as Chauffeur</Text>
            </Pressable> */}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView >
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgGrey,
  },
  header: {
    height: '32%', // Slightly taller to balance the card
    backgroundColor: colors.navy,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: 24,
    // paddingTop: Platform.OS === 'android' ? 40 : 0, // Handled by insets now
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40, // Push logo up so it clears the card
  },
  logoImage: {
    width: 200,
    height: 200,
    marginRight: 8,
  },
  logoText: {
    fontFamily: typography.family.regular,
    fontWeight: '400',
    fontSize: 28,
    letterSpacing: 2,
    color: colors.white,
    lineHeight: 32,
  },
  logoSubText: {
    fontFamily: typography.family.regular,
    fontWeight: '400',
    fontSize: 12,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
  },
  contentContainer: {
    flex: 1,
    marginTop: -60, // Pull card up into the header
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 0, // Clean card, rely on shadow
  },
  cardHeader: {
    marginBottom: 24,
  },
  title: {
    fontFamily: typography.family.regular,
    fontWeight: '700',
    fontSize: 24,
    color: colors.navy,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: typography.family.regular,
    fontWeight: '400',
    fontSize: 14,
    color: colors.muted,
  },
  field: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontFamily: typography.family.regular,
    fontWeight: '500',
    fontSize: 13,
    color: colors.text,
  },
  forgotPass: {
    fontFamily: typography.family.regular,
    fontWeight: '500',
    fontSize: 12,
    color: colors.orange, // Interactive element
  },
  input: {
    height: 52,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    backgroundColor: '#FAFAFA',
    borderWidth: 1.5,
    borderColor: colors.border,
    fontFamily: typography.family.regular,
    fontWeight: '400',
    fontSize: 15,
    color: colors.text,
  },
  inputFocused: {
    borderColor: colors.navy, // Corporate Anchor focus
    backgroundColor: colors.white,
  },
  inputError: {
    borderColor: colors.red,
  },
  errorContainer: {
    backgroundColor: 'rgba(211, 47, 47, 0.05)',
    padding: 10,
    borderRadius: 8,
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
    marginTop: 8,
  },
  loginBtn: {
    height: 50,
    borderRadius: radii.md,
    borderWidth: 0,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  biometricBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    padding: 8,
  },
  biometricBtnPressed: {
    opacity: 0.6,
  },
  biometricText: {
    fontFamily: typography.family.regular,
    fontWeight: '500',
    fontSize: 14,
    color: colors.navy,
    marginTop: 8,
  },
  divider: {
    width: '40%',
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginBottom: 24,
  },
  footerText: {
    fontFamily: typography.family.regular,
    fontWeight: '400',
    fontSize: 14,
    color: colors.muted,
    marginBottom: 4,
  },
  linkBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  linkBtnPressed: {
    opacity: 0.7,
  },
  linkText: {
    fontFamily: typography.family.regular,
    fontWeight: '700',
    fontSize: 15,
    color: colors.navy// Use Navy for secondary link to distinguish from CTA
  },
});
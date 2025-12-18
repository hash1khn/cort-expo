import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { CortButton, CortCard } from '../../../components';
import { colors, radii, typography } from '../../../core/theme';
import { useAuthStore } from '../../../core/stores/useAuthStore';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const login = useAuthStore((s) => s.login);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canLogin = useMemo(() => email.trim().length > 0 && password.length > 0, [email, password]);

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        {/* Curved header (30% height) */}
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            {/* Replace this with an <Image /> when you have the real CORT logo asset */}
            <Text style={styles.logoText}>CORT</Text>
            <Text style={styles.logoSubText}>Corporate Transport</Text>
          </View>
        </View>

        {/* Floating card */}
        <CortCard style={styles.card}>
          <Text style={styles.title}>Sign in</Text>
          <Text style={styles.subtitle}>Secure access to your CORT account</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (error) setError(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="name@company.com"
              placeholderTextColor={colors.muted}
              style={styles.input}
              selectionColor={colors.navy}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (error) setError(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={colors.muted}
              style={styles.input}
              selectionColor={colors.navy}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <CortButton
            title="Login"
            variant="navy"
            disabled={!canLogin || isSubmitting}
            loading={isSubmitting}
            style={styles.button}
            onPress={async () => {
              try {
                setIsSubmitting(true);
                setError(null);
                await login(email.trim(), password);
                // RootNavigator will switch stacks based on persisted role
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Login failed');
              } finally {
                setIsSubmitting(false);
              }
            }}
          />

          <Text style={styles.footerText}>
            By continuing you agree to CORT security policies.
          </Text>
        </CortCard>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    height: '30%',
    backgroundColor: colors.navy,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontFamily: typography.family.semibold,
    fontSize: 34,
    letterSpacing: 1.8,
    color: colors.white,
  },
  logoSubText: {
    marginTop: 6,
    fontFamily: typography.family.regular,
    fontSize: 13,
    letterSpacing: 0.3,
    color: 'rgba(255,255,255,0.85)',
  },
  card: {
    marginTop: -46,
    marginHorizontal: 18,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: colors.shadowNavy,
  },
  title: {
    fontFamily: typography.family.semibold,
    fontSize: 22,
    color: colors.text,
  },
  subtitle: {
    marginTop: 6,
    fontFamily: typography.family.regular,
    fontSize: 13,
    color: colors.muted,
  },
  field: {
    marginTop: 14,
  },
  label: {
    marginBottom: 8,
    fontFamily: typography.family.medium,
    fontSize: 12,
    color: colors.text,
  },
  input: {
    height: 48,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(12, 34, 94, 0.18)',
    fontFamily: typography.family.regular,
    fontSize: 14,
    color: colors.text,
  },
  button: { marginTop: 18 },
  errorText: {
    marginTop: 12,
    fontFamily: typography.family.medium,
    fontSize: 12,
    color: colors.red,
  },
  footerText: {
    marginTop: 12,
    textAlign: 'center',
    fontFamily: typography.family.regular,
    fontSize: 11,
    color: colors.muted,
  },
});



import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { CortButton, CortCard } from '../../../components';
import { colors, radii, typography } from '../../../core/theme';
import { mockApi } from '../../../services/mockApi';

export function ChauffeurSignupScreen() {
  const navigation = useNavigation<any>();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cnic, setCnic] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(
    () => name.trim().length > 0 && email.trim().length > 0 && password.length >= 4,
    [name, email, password]
  );

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backText}>Back</Text>
            </Pressable>
            <Text style={styles.headerTitle}>Chauffeur Application</Text>
            <Text style={styles.headerSub}>Submit your details for admin approval.</Text>
          </View>

          <CortCard style={styles.card}>
            <Text style={styles.title}>Sign up to drive</Text>
            <Text style={styles.subtitle}>Applications require admin approval before you can log in.</Text>

            <Field label="Full Name">
              <TextInput
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  if (error) setError(null);
                }}
                placeholder="Ali Khan"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
            </Field>

            <Field label="Email">
              <TextInput
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (error) setError(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder="driver@company.com"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
            </Field>

            <Field label="Phone (optional)">
              <TextInput
                value={phone}
                onChangeText={(t) => {
                  setPhone(t);
                  if (error) setError(null);
                }}
                keyboardType="phone-pad"
                placeholder="+92 300 1234567"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
            </Field>

            <Field label="CNIC (optional)">
              <TextInput
                value={cnic}
                onChangeText={(t) => {
                  setCnic(t);
                  if (error) setError(null);
                }}
                keyboardType="number-pad"
                placeholder="35202-1234567-1"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
            </Field>

            <Field label="License Number (optional)">
              <TextInput
                value={licenseNumber}
                onChangeText={(t) => {
                  setLicenseNumber(t);
                  if (error) setError(null);
                }}
                placeholder="DL-123456"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
            </Field>

            <Field label="Password">
              <TextInput
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (error) setError(null);
                }}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
            </Field>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <CortButton
              title="Submit Application"
              variant="navy"
              disabled={!canSubmit || submitting}
              loading={submitting}
              style={{ marginTop: 16 }}
              onPress={async () => {
                try {
                  setSubmitting(true);
                  setError(null);
                  await mockApi.submitChauffeurApplication({
                    name,
                    email,
                    password,
                    phone,
                    cnic,
                    licenseNumber,
                  });
                  navigation.navigate('ChauffeurPending', { email: email.trim() });
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Signup failed');
                } finally {
                  setSubmitting(false);
                }
              }}
            />
          </CortCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  scrollContent: { paddingBottom: 26 },
  header: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 10 },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 10, borderRadius: radii.pill, backgroundColor: colors.bgGrey },
  backText: { fontFamily: typography.family.semibold, fontSize: 12, color: colors.navy },
  headerTitle: { marginTop: 10, fontFamily: typography.family.semibold, fontSize: 18, color: colors.text },
  headerSub: { marginTop: 6, fontFamily: typography.family.regular, fontSize: 12, color: colors.muted },
  card: {
    marginTop: 10,
    marginHorizontal: 18,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: colors.shadowNavy,
  },
  title: { fontFamily: typography.family.semibold, fontSize: 20, color: colors.text },
  subtitle: { marginTop: 6, fontFamily: typography.family.regular, fontSize: 13, color: colors.muted },
  label: { marginBottom: 8, fontFamily: typography.family.medium, fontSize: 12, color: colors.text },
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
  errorText: { marginTop: 12, fontFamily: typography.family.medium, fontSize: 12, color: colors.red },
});



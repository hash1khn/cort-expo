import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

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
      <StatusBar barStyle="light-content" backgroundColor={colors.navy} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        {/* Header Section - Deep Navy */}
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.white} />
          </Pressable>

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
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <CortCard style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.title}>Chauffeur Application</Text>
                <Text style={styles.subtitle}>Submit your details for admin approval</Text>
              </View>

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
                variant="primary"
                disabled={!canSubmit || submitting}
                loading={submitting}
               
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
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgGrey,
  },
  header: {
    height: '32%',
    backgroundColor: colors.navy,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 40 : 0,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 50 : 20,
    left: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  backBtnPressed: {
    opacity: 0.7,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
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
    marginTop: -60,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 26,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 0,
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
  label: {
    marginBottom: 8,
    fontFamily: typography.family.regular,
    fontWeight: '500',
    fontSize: 13,
    color: colors.text,
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
  field: {
    marginBottom: 20,
  },
  errorText: {
    marginTop: 12,
    fontFamily: typography.family.regular,
    fontWeight: '500',
    fontSize: 13,
    color: colors.red,
  },
});



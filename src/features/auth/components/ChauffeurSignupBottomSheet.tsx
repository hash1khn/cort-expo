import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, radii } from '../../../core/theme';
import { CortButton } from '../../../components';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApplyAsChauffeurMutation } from '../services/authApi';

export const ChauffeurSignupBottomSheet = React.forwardRef<BottomSheetModal, {}>(
  (_props, ref) => {
    const snapPoints = useMemo(() => ['55%', '92%'], []);
    const insets = useSafeAreaInsets();

    // Form state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [cnic, setCnic] = useState('');
    const [licenseNumber, setLicenseNumber] = useState('');
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [applyAsChauffeur] = useApplyAsChauffeurMutation();

    const canSubmit = useMemo(
      () =>
        name.trim().length > 0 &&
        email.trim().length > 0 &&
        phone.trim().length > 0 &&
        cnic.trim().length > 0 &&
        licenseNumber.trim().length > 0,
      [name, email, phone, cnic, licenseNumber]
    );

    const resetForm = useCallback(() => {
      setName('');
      setEmail('');
      setPhone('');
      setCnic('');
      setLicenseNumber('');
      setFocusedField(null);
      setError(null);
      setSubmitting(false);
      setSubmitted(false);
    }, []);

    const handleClose = useCallback(() => {
      if (ref && typeof ref !== 'function' && ref.current) {
        ref.current.dismiss();
      }
      // Reset after animation
      setTimeout(resetForm, 400);
    }, [ref, resetForm]);

    const handleSubmit = useCallback(async () => {
      try {
        setSubmitting(true);
        setError(null);
        await applyAsChauffeur({
          full_name: name,
          email,
          phone,
          cnic_number: cnic,
          license_number: licenseNumber,
        }).unwrap();
        setSubmitted(true);
      } catch (e) {
        const err = e as
          | { data?: { message?: string | string[] } }
          | Error
          | undefined;
        const backendMessage = Array.isArray(err && 'data' in err ? err.data?.message : undefined)
          ? (err as { data?: { message?: string[] } }).data?.message?.[0]
          : (err && 'data' in err ? (err as { data?: { message?: string } }).data?.message : undefined);
        setError(backendMessage || (e instanceof Error ? e.message : 'Submission failed. Please try again.'));
      } finally {
        setSubmitting(false);
      }
    }, [applyAsChauffeur, name, email, phone, cnic, licenseNumber]);

    // Snap sheet down to confirmation height once submitted
    useEffect(() => {
      if (submitted && ref && typeof ref !== 'function' && ref.current) {
        ref.current.snapToIndex(0);
      }
    }, [submitted, ref]);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
        />
      ),
      []
    );

    return (
      <BottomSheetModal
        ref={ref}
        index={1}
        snapPoints={snapPoints}
        topInset={insets.top}
        detached={submitted}
        bottomInset={submitted ? 40 : 0}
        backdropComponent={renderBackdrop}
        enablePanDownToClose={!submitting}
        handleIndicatorStyle={styles.handle}
        backgroundStyle={styles.sheetBg}
        enableDynamicSizing={false}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        onDismiss={resetForm}
      >
        {submitted ? (
          // ── Confirmation State ──────────────────────────────────────────
          <BottomSheetView style={styles.confirmationContainer}>
            <View style={styles.confirmIconWrap}>
              <Ionicons name="checkmark-circle" size={56} color="#FF5A00" />
            </View>
            <Text style={styles.confirmTitle}>Application Submitted!</Text>
            <Text style={styles.confirmBody}>
              Our team will review your application and contact you shortly.
            </Text>

            <View style={styles.confirmContactCard}>
              <Ionicons name="mail-outline" size={18} color="#FF5A00" style={styles.confirmContactIcon} />
              <Text style={styles.confirmContactText}>
                For any queries, contact{' '}
                <Text style={styles.confirmContactEmail}>contact@cort.com.pk</Text>
              </Text>
            </View>

            <CortButton title="Done" variant="primary" onPress={handleClose} />
          </BottomSheetView>
        ) : (
          // ── Form State ──────────────────────────────────────────────────
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>Chauffeur Application</Text>
                <Text style={styles.subtitle}>Submit your details for admin approval</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <BottomSheetScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Full Name */}
              <Field label="Full Name">
                <View style={[styles.inputContainer, focusedField === 'name' && styles.inputFocused]}>
                  <BottomSheetTextInput
                    value={name}
                    onChangeText={(t) => { setName(t); setError(null); }}
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Ali Khan"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                    cursorColor="#FF5A00"
                  />
                </View>
              </Field>

              {/* Email */}
              <Field label="Email">
                <View style={[styles.inputContainer, focusedField === 'email' && styles.inputFocused]}>
                  <BottomSheetTextInput
                    value={email}
                    onChangeText={(t) => { setEmail(t); setError(null); }}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    placeholder="driver@company.com"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                    cursorColor="#FF5A00"
                  />
                </View>
              </Field>

              {/* Phone */}
              <Field label="Phone">
                <View style={[styles.inputContainer, focusedField === 'phone' && styles.inputFocused]}>
                  <BottomSheetTextInput
                    value={phone}
                    onChangeText={setPhone}
                    onFocus={() => setFocusedField('phone')}
                    onBlur={() => setFocusedField(null)}
                    keyboardType="phone-pad"
                    placeholder="+92 300 1234567"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                    cursorColor="#FF5A00"
                  />
                </View>
              </Field>

              {/* CNIC */}
              <Field label="CNIC">
                <View style={[styles.inputContainer, focusedField === 'cnic' && styles.inputFocused]}>
                  <BottomSheetTextInput
                    value={cnic}
                    onChangeText={setCnic}
                    onFocus={() => setFocusedField('cnic')}
                    onBlur={() => setFocusedField(null)}
                    keyboardType="number-pad"
                    placeholder="35202-1234567-1"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                    cursorColor="#FF5A00"
                  />
                </View>
              </Field>

              {/* License Number */}
              <Field label="License Number">
                <View style={[styles.inputContainer, focusedField === 'license' && styles.inputFocused]}>
                  <BottomSheetTextInput
                    value={licenseNumber}
                    onChangeText={setLicenseNumber}
                    onFocus={() => setFocusedField('license')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="DL-123456"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                    cursorColor="#FF5A00"
                  />
                </View>
              </Field>

              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.primaryBtn, (!canSubmit || submitting) && styles.primaryBtnDisabled]}
                onPress={handleSubmit}
                disabled={!canSubmit || submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>Confirm Application</Text>
                )}
              </TouchableOpacity>

              <View style={{ height: 20 }} />
            </BottomSheetScrollView>
          </View>
        )}
      </BottomSheetModal>
    );
  }
);

// ── Helper ──────────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handle: {
    backgroundColor: '#D1D5DB',
    width: 40,
    height: 4,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontFamily: typography.family.regular,
    fontWeight: '700',
    fontSize: 20,
    color: '#1A1A1A',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: typography.family.regular,
    fontWeight: '400',
    fontSize: 13,
    color: '#6B7280',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
  },
  field: {
    marginBottom: 18,
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
    borderColor: '#eaeaea',
    paddingHorizontal: 16,
  },
  inputFocused: {
    borderColor: '#FF5A00',
  },
  input: {
    flex: 1,
    height: '100%',
    fontFamily: typography.family.regular,
    fontWeight: '500',
    fontSize: 15,
    color: '#1A1A1A',
  },
  iconButton: {
    padding: 4,
    marginLeft: 8,
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
  primaryBtn: {
    height: 56,
    borderRadius: 14,
    backgroundColor: '#FF5A00',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryBtnDisabled: {
    opacity: 0.45,
  },
  primaryBtnText: {
    fontFamily: typography.family.regular,
    fontWeight: '600',
    fontSize: 16,
    color: '#FFFFFF',
  },
  // ── Confirmation ──────────────────────────────────────────────────────────
  confirmationContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 48,
  },
  confirmIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 90, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  confirmTitle: {
    fontFamily: typography.family.regular,
    fontWeight: '700',
    fontSize: 22,
    color: '#1A1A1A',
    marginBottom: 12,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  confirmBody: {
    fontFamily: typography.family.regular,
    fontWeight: '400',
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },
  confirmContactCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF9F6',
    borderWidth: 1,
    borderColor: '#FFD5C2',
    borderRadius: 14,
    padding: 16,
    marginBottom: 36,
    width: '100%',
  },
  confirmContactIcon: {
    marginRight: 10,
    marginTop: 1,
  },
  confirmContactText: {
    flex: 1,
    fontFamily: typography.family.regular,
    fontWeight: '400',
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  confirmContactEmail: {
    fontWeight: '600',
    color: '#FF5A00',
  },
});

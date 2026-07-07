import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
  Image,
  Alert,
} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import Ionicons from "@react-native-vector-icons/ionicons/static";
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors, typography } from '../../../core/theme';
import { CortButton } from '../../../components';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApplyAsChauffeurMutation } from '../services/authApi';
import { useLanguage } from '@/i18n/useLanguage';
import {
  getPhoneValidationError,
  PHONE_MAX_LENGTH,
  sanitizePhoneInput,
} from '../../../utils/phone';

const MIN_CAR_YEAR = 2018;

const EMPTY_PHOTOS = {
  profile_picture: null as string | null,
  license_front: null as string | null,
  license_back: null as string | null,
  cnic_front: null as string | null,
  cnic_back: null as string | null,
  car_photo: null as string | null,
  car_registration_doc: null as string | null,
};

type ChauffeurPhotoKey = keyof typeof EMPTY_PHOTOS;

const PHOTO_LABEL_KEYS: Record<ChauffeurPhotoKey, string> = {
  profile_picture: 'profilePicture',
  license_front: 'drivingLicenseFront',
  license_back: 'drivingLicenseBack',
  cnic_front: 'cnicFront',
  cnic_back: 'cnicBack',
  car_photo: 'carPhoto',
  car_registration_doc: 'carRegistrationDoc',
};

export const ChauffeurSignupBottomSheet = React.forwardRef<BottomSheetModal, {}>(
  (_props, ref) => {
    const snapPoints = useMemo(() => ['55%', '92%'], []);
    const insets = useSafeAreaInsets();
    const maxCarYear = useMemo(() => new Date().getFullYear() + 1, []);
    const { tAuth: t, isRTL, rtlTextStyle, rtlFont } = useLanguage();
    const rtlText = isRTL
      ? ({ ...rtlTextStyle, fontSize: 18 } as const)
      : {};
    const rtlTitle = isRTL
      ? ({ ...rtlTextStyle, fontSize: 24 } as const)
      : {};
    const rtlSubtitle = isRTL
      ? ({ ...rtlTextStyle, fontSize: 16 } as const)
      : {};

    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView>(null);
    const [activePhotoCapture, setActivePhotoCapture] = useState<ChauffeurPhotoKey | null>(null);
    const [isCapturing, setIsCapturing] = useState(false);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [cnic, setCnic] = useState('');
    const [licenseNumber, setLicenseNumber] = useState('');
    const [carMake, setCarMake] = useState('');
    const [carModel, setCarModel] = useState('');
    const [carYearText, setCarYearText] = useState('');
    const [photos, setPhotos] = useState({ ...EMPTY_PHOTOS });

    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [applyAsChauffeur] = useApplyAsChauffeurMutation();

    const parsedCarYear = useMemo(() => {
      const n = parseInt(carYearText.trim(), 10);
      return Number.isFinite(n) ? n : NaN;
    }, [carYearText]);

    const canSubmit = useMemo(() => {
      const photosOk = (Object.keys(EMPTY_PHOTOS) as ChauffeurPhotoKey[]).every((k) => !!photos[k]);
      return (name.trim().length > 0 &&
      phone.replace(/\D/g, '').length === 11 &&
      cnic.trim().length > 0 &&
      licenseNumber.trim().length > 0 &&
      carMake.trim().length > 0 &&
      carModel.trim().length > 0 &&
      parsedCarYear >= MIN_CAR_YEAR &&
      parsedCarYear <= maxCarYear && photosOk);
    }, [name, phone, cnic, licenseNumber, carMake, carModel, parsedCarYear, maxCarYear, photos]);

    const resetForm = useCallback(() => {
      setName('');
      setEmail('');
      setPhone('');
      setCnic('');
      setLicenseNumber('');
      setCarMake('');
      setCarModel('');
      setCarYearText('');
      setPhotos({ ...EMPTY_PHOTOS });
      setFocusedField(null);
      setError(null);
      setSubmitting(false);
      setSubmitted(false);
      setActivePhotoCapture(null);
    }, []);

    const handleClose = useCallback(() => {
      setActivePhotoCapture(null);
      if (ref && typeof ref !== 'function' && ref.current) {
        ref.current.dismiss();
      }
      setTimeout(resetForm, 400);
    }, [ref, resetForm]);

    const handleOpenCamera = useCallback(
      async (key: ChauffeurPhotoKey) => {
        if (!permission?.granted) {
          const { granted } = await requestPermission();
          if (!granted) {
            Alert.alert('Camera required', 'Please allow camera access to capture this photo.');
            return;
          }
        }
        setActivePhotoCapture(key);
      },
      [permission?.granted, requestPermission]
    );

    const handleCapture = useCallback(async () => {
      if (!cameraRef.current || isCapturing || !activePhotoCapture) return;
      setIsCapturing(true);
      try {
        const result = await cameraRef.current.takePictureAsync({ quality: 0.8 });
        if (result?.uri) {
          setPhotos((prev) => ({ ...prev, [activePhotoCapture]: result.uri }));
          setActivePhotoCapture(null);
        }
      } catch (e) {
        console.warn('Chauffeur apply capture error', e);
      } finally {
        setIsCapturing(false);
      }
    }, [activePhotoCapture, isCapturing]);

    const handleSubmit = useCallback(async () => {
      if (!canSubmit) return;
      const phoneError = getPhoneValidationError(phone, { required: true });
      if (phoneError) {
        setError(phoneError);
        return;
      }
      const pk = photos;
      try {
        setSubmitting(true);
        setError(null);
        await applyAsChauffeur({
          full_name: name,
          email: email.trim() || undefined,
          phone: phone.replace(/\D/g, ''),
          cnic_number: cnic,
          license_number: licenseNumber,
          car_make: carMake,
          car_model: carModel,
          car_year: parsedCarYear,
          profile_picture_uri: pk.profile_picture!,
          license_front_uri: pk.license_front!,
          license_back_uri: pk.license_back!,
          cnic_front_uri: pk.cnic_front!,
          cnic_back_uri: pk.cnic_back!,
          car_photo_uri: pk.car_photo!,
          car_registration_doc_uri: pk.car_registration_doc!,
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
    }, [
      applyAsChauffeur,
      canSubmit,
      name,
      email,
      phone,
      cnic,
      licenseNumber,
      carMake,
      carModel,
      parsedCarYear,
      photos,
    ]);

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
      <>
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
            <BottomSheetView style={styles.confirmationContainer}>
              <View style={styles.confirmIconWrap}>
                <Ionicons name="checkmark-circle" size={56} color="#FF5A00" />
              </View>
              <Text style={[styles.confirmTitle, rtlText, isRTL && { textAlign: 'center' }]}>{t('applicationSubmitted')}</Text>
              <Text style={[styles.confirmBody, rtlText, isRTL && { textAlign: 'center' }]}>
                {t('ourTeamWillReview')}
              </Text>

              <View style={[styles.confirmContactCard, isRTL && { flexDirection: 'row-reverse' }]}>
                <Ionicons name="mail-outline" size={18} color="#FF5A00" style={[styles.confirmContactIcon, isRTL && { marginRight: 0, marginLeft: 10 }]} />
                <Text style={[styles.confirmContactText, rtlText, isRTL && { textAlign: 'right' }]}>
                  {t('forAnyQueries')}
                  <Text style={styles.confirmContactEmail}>contact@cort.com.pk</Text>
                </Text>
              </View>

              <CortButton title={t('done')} variant="primary" onPress={handleClose} />
            </BottomSheetView>
          ) : (
            <View style={styles.container}>
              <View style={[styles.header, isRTL && { flexDirection: 'row-reverse' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, rtlTitle]}>{t('chauffeurApplication')}</Text>
                  <Text style={[styles.subtitle, rtlSubtitle]}>{t('submitDetails')}</Text>
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
                <Field label={t('fullName')} required isRTL={isRTL}>
                  <View style={[styles.inputContainer, focusedField === 'name' && styles.inputFocused]}>
                    <BottomSheetTextInput
                      value={name}
                      onChangeText={(t) => {
                        setName(t);
                        setError(null);
                      }}
                      onFocus={() => setFocusedField('name')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Ali Khan"
                      placeholderTextColor={colors.muted}
                      style={[styles.input, rtlText]}
                      cursorColor="#FF5A00"
                    />
                  </View>
                </Field>

                <Field label={t('emailOptional')} required={false} isRTL={isRTL}>
                  <View style={[styles.inputContainer, focusedField === 'email' && styles.inputFocused]}>
                    <BottomSheetTextInput
                      value={email}
                      onChangeText={(t) => {
                        setEmail(t);
                        setError(null);
                      }}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      placeholder={t('optional')}
                      placeholderTextColor={colors.muted}
                      style={[styles.input, rtlText]}
                      cursorColor="#FF5A00"
                    />
                  </View>
                </Field>

                <Field label={t('phone')} required isRTL={isRTL}>
                  <View style={[styles.inputContainer, focusedField === 'phone' && styles.inputFocused]}>
                    <BottomSheetTextInput
                      value={phone}
                      onChangeText={(t) => {
                        setPhone(sanitizePhoneInput(t));
                        setError(null);
                      }}
                      onFocus={() => setFocusedField('phone')}
                      onBlur={() => setFocusedField(null)}
                      keyboardType="phone-pad"
                      maxLength={PHONE_MAX_LENGTH}
                      placeholder="03001234567"
                      placeholderTextColor={colors.muted}
                      style={[styles.input, rtlText]}
                      cursorColor="#FF5A00"
                    />
                  </View>
                </Field>

                <Field label={t('cnic')} required isRTL={isRTL}>
                  <View style={[styles.inputContainer, focusedField === 'cnic' && styles.inputFocused]}>
                    <BottomSheetTextInput
                      value={cnic}
                      onChangeText={(t) => {
                        setCnic(t);
                        setError(null);
                      }}
                      onFocus={() => setFocusedField('cnic')}
                      onBlur={() => setFocusedField(null)}
                      keyboardType="number-pad"
                      placeholder="35202-1234567-1"
                      placeholderTextColor={colors.muted}
                      style={[styles.input, rtlText]}
                      cursorColor="#FF5A00"
                    />
                  </View>
                </Field>

                <Field label={t('licenseNumber')} required isRTL={isRTL}>
                  <View style={[styles.inputContainer, focusedField === 'license' && styles.inputFocused]}>
                    <BottomSheetTextInput
                      value={licenseNumber}
                      onChangeText={(t) => {
                        setLicenseNumber(t);
                        setError(null);
                      }}
                      onFocus={() => setFocusedField('license')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="DL-123456"
                      placeholderTextColor={colors.muted}
                      style={[styles.input, rtlText]}
                      cursorColor="#FF5A00"
                    />
                  </View>
                </Field>

                {(Object.keys(EMPTY_PHOTOS) as ChauffeurPhotoKey[]).map((key) => {
                  const labelKey = key === 'profile_picture' ? 'profilePicture' :
                                   key === 'license_front' ? 'drivingLicenseFront' :
                                   key === 'license_back' ? 'drivingLicenseBack' :
                                   key === 'cnic_front' ? 'cnicFront' :
                                   key === 'cnic_back' ? 'cnicBack' :
                                   key === 'car_photo' ? 'carPhoto' : 'carRegistrationDoc';
                  return (
                    <PhotoField
                      key={key}
                      label={t(labelKey)}
                      required
                      uri={photos[key]}
                      onPress={() => handleOpenCamera(key)}
                      isRTL={isRTL}
                      t={t}
                    />
                  );
                })}

                <Field label={t('carMake')} required isRTL={isRTL}>
                  <View style={[styles.inputContainer, focusedField === 'car_make' && styles.inputFocused]}>
                    <BottomSheetTextInput
                      value={carMake}
                      onChangeText={(t) => {
                        setCarMake(t);
                        setError(null);
                      }}
                      onFocus={() => setFocusedField('car_make')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="e.g. Toyota"
                      placeholderTextColor={colors.muted}
                      style={[styles.input, rtlText]}
                      cursorColor="#FF5A00"
                    />
                  </View>
                </Field>

                <Field label={t('carModel')} required isRTL={isRTL}>
                  <View style={[styles.inputContainer, focusedField === 'car_model' && styles.inputFocused]}>
                    <BottomSheetTextInput
                      value={carModel}
                      onChangeText={(t) => {
                        setCarModel(t);
                        setError(null);
                      }}
                      onFocus={() => setFocusedField('car_model')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="e.g. Corolla"
                      placeholderTextColor={colors.muted}
                      style={[styles.input, rtlText]}
                      cursorColor="#FF5A00"
                    />
                  </View>
                </Field>

                <Field label={`${t('modelYear')} (${MIN_CAR_YEAR}–${maxCarYear})`} required isRTL={isRTL}>
                  <View style={[styles.inputContainer, focusedField === 'car_year' && styles.inputFocused]}>
                    <BottomSheetTextInput
                      value={carYearText}
                      onChangeText={(t) => {
                        setCarYearText(t.replace(/\D/g, '').slice(0, 4));
                        setError(null);
                      }}
                      onFocus={() => setFocusedField('car_year')}
                      onBlur={() => setFocusedField(null)}
                      keyboardType="number-pad"
                      placeholder={String(MIN_CAR_YEAR)}
                      placeholderTextColor={colors.muted}
                      style={[styles.input, rtlText]}
                      cursorColor="#FF5A00"
                      maxLength={4}
                    />
                  </View>
                </Field>

                {error && (
                  <View style={styles.errorContainer}>
                    <Text style={[styles.errorText, rtlText]}>{error}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.primaryBtn, (!canSubmit || submitting) && styles.primaryBtnDisabled]}
                  onPress={handleSubmit}
                  disabled={!canSubmit || submitting}
                  activeOpacity={0.85}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.primaryBtnText}>{t('confirmApplication')}</Text>
                  )}
                </TouchableOpacity>

                <View style={{ height: 20 }} />
              </BottomSheetScrollView>
            </View>
          )}
        </BottomSheetModal>
        <Modal visible={activePhotoCapture !== null} animationType="slide">
          <View style={styles.cameraRoot}>
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} />
            <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
              <Pressable
                onPress={() => setActivePhotoCapture(null)}
                style={[styles.cameraClose, { top: Math.max(insets.top, 12) + 8 }]}
              >
                <Ionicons name="close" size={28} color="#fff" />
              </Pressable>
              <View style={[styles.cameraBottom, { paddingBottom: Math.max(insets.bottom, 24) }]}>
                <Pressable
                  onPress={handleCapture}
                  disabled={isCapturing}
                  style={styles.captureBtnOuter}
                >
                  {isCapturing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <View style={styles.captureBtnInner} />
                  )}
                </Pressable>
                <Text style={styles.captureHint}>
                  {isCapturing ? t('saving') : activePhotoCapture ? (
                    activePhotoCapture === 'profile_picture' ? t('profilePicture') :
                    activePhotoCapture === 'license_front' ? t('drivingLicenseFront') :
                    activePhotoCapture === 'license_back' ? t('drivingLicenseBack') :
                    activePhotoCapture === 'cnic_front' ? t('cnicFront') :
                    activePhotoCapture === 'cnic_back' ? t('cnicBack') :
                    activePhotoCapture === 'car_photo' ? t('carPhoto') : t('carRegistrationDoc')
                  ) : ''}
                </Text>
              </View>
            </View>
          </View>
        </Modal>
      </>
    );
  }
);

function Field({
  label,
  required,
  children,
  isRTL,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  isRTL?: boolean;
}) {
  const { rtlTextStyle } = useLanguage();
  const rtlLabelStyle = isRTL ? { ...rtlTextStyle, fontSize: 18 } : {};
  return (
    <View style={styles.field}>
      <Text style={[styles.label, rtlLabelStyle]}>
        {label}
        {required ? <Text style={styles.requiredStar}> *</Text> : null}
      </Text>
      {children}
    </View>
  );
}

function PhotoField({
  label,
  required,
  uri,
  onPress,
  isRTL,
  t,
}: {
  label: string;
  required?: boolean;
  uri: string | null;
  onPress: () => void;
  isRTL?: boolean;
  t: (key: any) => string;
}) {
  const { rtlTextStyle } = useLanguage();
  const rtlLabelStyle = isRTL ? { ...rtlTextStyle, fontSize: 18 } : {};
  return (
    <View style={styles.field}>
      <Text style={[styles.label, rtlLabelStyle]}>
        {label}
        {required ? <Text style={styles.requiredStar}> *</Text> : null}
      </Text>
      {uri ? (
        <Pressable onPress={onPress} style={styles.photoPreviewWrap}>
          <Image source={{ uri }} style={styles.photoPreview} resizeMode="cover" />
          <View style={styles.retakeBadge}>
            <Ionicons name="camera-outline" size={14} color="#fff" />
            <Text style={styles.retakeText}>{t('tapToRetake')}</Text>
          </View>
        </Pressable>
      ) : (
        <Pressable onPress={onPress} style={styles.photoPlaceholder}>
          <Ionicons name="camera-outline" size={32} color="#9CA3AF" />
          <Text style={styles.photoPlaceholderText}>{t('tapToCapture')}</Text>
        </Pressable>
      )}
    </View>
  );
}

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
    marginBottom: 4,
    paddingTop: 4,
    paddingBottom: 10,
  },
  requiredStar: {
    color: colors.red,
    fontWeight: '700',
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
  photoPlaceholder: {
    height: 120,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#FF5A00',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 8,
    fontWeight: '500',
    fontFamily: typography.family.regular,
  },
  photoPreviewWrap: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: 120,
    borderRadius: 12,
  },
  retakeBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  retakeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: typography.family.regular,
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
  cameraRoot: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraClose: {
    position: 'absolute',
    left: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBottom: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureBtnOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  captureBtnInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
  captureHint: {
    color: '#fff',
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: typography.family.regular,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});

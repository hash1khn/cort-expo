import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text as RNText,
  Pressable,
  StyleSheet,
  Keyboard,
  TextInput,
  TouchableWithoutFeedback,
} from 'react-native';
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { fontFamily } from '@/core/theme';
import { useToast } from '@/shared/ui/molecules/Toast';
import { useSubmitChauffeurReviewMutation } from '../services/bookingsApi';

// ─── Typed Text wrapper ───────────────────────────────────────────────────────
// React.memo prevents re-renders when parent state changes (e.g. star rating)
const Text = React.memo((props: React.ComponentProps<typeof RNText>) => (
  <RNText {...props} style={[{ fontFamily }, props.style]} />
));

// ─── Toast content ────────────────────────────────────────────────────────────
const ReviewToast = ({ title, message }: { title: string; message: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Ionicons name="alert-circle" size={16} color="#fff" />
    </View>
    <View style={{ flex: 1, gap: 2 }}>
      <RNText style={{ fontSize: 14, fontWeight: '600', color: '#fff', fontFamily }}>
        {title}
      </RNText>
      <RNText style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily }}>
        {message}
      </RNText>
    </View>
  </View>
);

// ─── Constants ────────────────────────────────────────────────────────────────
// Single tall snap point — sheet is always tall enough that keyboard won't
// cover the input; no second snap needed since we're not animating with keyboard.
const SNAP_POINTS = ['75%'];
const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

// Defined outside the component — no closure over state, so it never needs
// to be recreated and the Reanimated worklet it produces is truly stable.
const renderBackdrop = (props: any) => (
  <BottomSheetBackdrop
    {...props}
    disappearsOnIndex={-1}
    appearsOnIndex={0}
    opacity={0.55}
    pressBehavior="none"
  />
);

// ─── Props ────────────────────────────────────────────────────────────────────
export interface RideReviewSheetProps {
  sheetRef: React.RefObject<BottomSheet | null>;
  bookingId: number;
  companyId: number;
  driverName?: string;
  vehicleDisplay?: string;
  vehiclePlate?: string;
  onSuccess: () => void;
  /** Controls whether the sheet is mounted at all. Set to false when not
   *  needed to eliminate all Reanimated worklet / gesture-handler overhead. */
  visible?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function RideReviewSheet({
  sheetRef,
  bookingId,
  companyId,
  driverName = 'Your Captain',
  vehicleDisplay = '—',
  vehiclePlate = '—',
  onSuccess,
  visible = true,
}: RideReviewSheetProps) {
  // Guard: when not visible, return null — no BottomSheet, no Reanimated nodes,
  // no gesture handlers, no backdrop worklets → zero frame-budget cost.
  if (!visible) return null;

  return (
    <RideReviewSheetContent
      sheetRef={sheetRef}
      bookingId={bookingId}
      companyId={companyId}
      driverName={driverName}
      vehicleDisplay={vehicleDisplay}
      vehiclePlate={vehiclePlate}
      onSuccess={onSuccess}
    />
  );
}

// ─── Inner content — only ever rendered when visible=true ─────────────────────
// Separated so hooks are only called when the sheet is actually shown.
function RideReviewSheetContent({
  sheetRef,
  bookingId,
  companyId,
  driverName,
  vehicleDisplay,
  vehiclePlate,
  onSuccess,
}: Required<Omit<RideReviewSheetProps, 'visible'>>) {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitReview, { isLoading: isSubmitting }] = useSubmitChauffeurReviewMutation();
  const canSubmit = rating > 0 && !isSubmitting;
  const toast = useToast();

  // useMemo so string ops don't run on every render triggered by star taps
  const driverInitials = useMemo(
    () =>
      driverName
        .split(' ')
        .map((n) => n[0] ?? '')
        .join('')
        .slice(0, 2)
        .toUpperCase(),
    [driverName],
  );

  const handleSubmit = useCallback(async () => {
    if (rating <= 3 && !reviewText.trim()) {
      toast.show(
        <ReviewToast
          title="Review required"
          message="Please enter a full review for low ratings."
        />,
        { duration: 3500, position: 'top', type: 'default', backgroundColor: '#1c1c1c' },
      );
      return;
    }
    try {
      await submitReview({ companyId, bookingId, rating, review_text: reviewText.trim() || undefined }).unwrap();
      onSuccess();
    } catch {
      toast.show(
        <ReviewToast title="Submission failed" message="Please try again." />,
        { duration: 3500, position: 'top', type: 'default', backgroundColor: '#c0392b' },
      );
    }
  }, [rating, reviewText, toast, submitReview, companyId, bookingId, onSuccess]);

  // Stable style arrays — useMemo so no new array is allocated on every render
  const submitBtnStyle = useMemo(
    () => [styles.submitBtn, !canSubmit && styles.submitBtnDisabled],
    [canSubmit],
  );
  const submitBtnTextStyle = useMemo(
    () => [styles.submitBtnText, !canSubmit && styles.submitBtnTextDisabled],
    [canSubmit],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      index={0}
      snapPoints={SNAP_POINTS}
      // No keyboardBehavior prop: sheet stays perfectly still when keyboard
      // appears. Zero Reanimated worklets fire during keyboard animation → no
      // frame drop. The scroll view handles inset adjustment natively instead.
      enablePanDownToClose={false}
      enableDynamicSizing={false}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={styles.handle}
      backgroundStyle={styles.background}
    >
      <BottomSheetScrollView
        keyboardShouldPersistTaps="handled"
        // automaticallyAdjustKeyboardInsets: native iOS inset adjustment.
        // The OS shifts the scroll view's bottom inset to match the keyboard
        // height entirely on the UI thread — no JS, no Reanimated, no frame drop.
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View>
            {/* ── Header ──────────────────────────────────────────────── */}
            <Text style={styles.title}>How was your ride?</Text>
            <Text style={styles.subtitle}>Your feedback helps improve the service</Text>
            <View style={styles.headerDivider} />

            {/* ── Driver section ───────────────────────────────────────── */}
            <View style={styles.captainCenterSection}>
              <Text style={styles.captainRoleLabel}>YOUR CAPTAIN</Text>
              <View style={styles.avatarCircleBig}>
                <Text style={styles.avatarInitialsBig}>{driverInitials}</Text>
              </View>
              <Text style={styles.captainNameBig}>{driverName}</Text>
              <View style={styles.vehicleInfoRow}>
                <Text style={styles.vehicleText}>{vehicleDisplay}</Text>
                {vehicleDisplay !== '—' && vehiclePlate !== '—' && (
                  <View style={styles.dotSeparator} />
                )}
                {vehiclePlate !== '—' && (
                  <View style={styles.plateContainerSmall}>
                    <Text style={styles.plateTextSmall}>{vehiclePlate}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.divider} />

            {/* ── Star rating ───────────────────────────────────────────── */}
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable
                  key={star}
                  onPress={() => setRating(star)}
                  hitSlop={8}
                  style={styles.starBtn}
                >
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={38}
                    color={star <= rating ? '#FF5A00' : '#D1D5DB'}
                  />
                </Pressable>
              ))}
            </View>

            {rating > 0 && (
              <Text style={styles.ratingLabel}>{RATING_LABELS[rating]}</Text>
            )}

            {/* ── Text input ────────────────────────────────────────────── */}
            <TextInput
              placeholder="Share your experience (optional)..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              value={reviewText}
              onChangeText={setReviewText}
              style={styles.textInput}
              textAlignVertical="top"
            />

            {/* ── Continue ──────────────────────────────────────────────── */}
            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={submitBtnStyle}
            >
              <Text style={submitBtnTextStyle}>{isSubmitting ? 'Submitting…' : 'Continue'}</Text>
            </Pressable>
          </View>
        </TouchableWithoutFeedback>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  handle: {
    backgroundColor: '#D1D5DB',
    width: 48,
    height: 5,
    borderRadius: 3,
  },
  background: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0B1220',
    letterSpacing: -0.4,
    textAlign: 'center',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  // Thin line directly below the subtitle — same weight as the driver divider
  headerDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 20,
  },
  captainCenterSection: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  captainRoleLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  avatarCircleBig: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FF5A00',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarInitialsBig: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  captainNameBig: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000',
    letterSpacing: -0.3,
  },
  vehicleInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  vehicleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  dotSeparator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#9CA3AF',
  },
  plateContainerSmall: {
    backgroundColor: '#EAEAEA',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  plateTextSmall: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 20,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  starBtn: {
    padding: 4,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF5A00',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: '#0B1220',
    minHeight: 100,
    fontFamily,
    marginBottom: 16,
  },
  submitBtn: {
    backgroundColor: '#FF5A00',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: '#E5E7EB',
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  submitBtnTextDisabled: {
    color: '#9CA3AF',
  },
});

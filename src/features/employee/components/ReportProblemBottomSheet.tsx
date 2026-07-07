import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text as RNText, StyleSheet, Pressable, Platform, Alert, ActivityIndicator, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from "@react-native-vector-icons/ionicons/static";
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { fontFamily, colors } from '@/core/theme';
import { useSubmitProblemReportMutation } from '../services/problemReportsApi';
import { Toast } from '@/shared/ui/molecules/Toast';
import { useLanguage } from '@/i18n/useLanguage';
import { buildRtlLinkTextStyle } from '@/i18n/types';

const Text = (props: React.ComponentProps<typeof RNText>) => (
  <RNText {...props} style={[{ fontFamily }, props.style]} />
);

type IssueType = 'app_issue' | 'ride_issue' | 'other';

const ISSUE_TYPE_KEYS: IssueType[] = ['app_issue', 'ride_issue', 'other'];

export const ReportProblemBottomSheet = forwardRef<BottomSheetModal>(
  (_, ref) => {
    const insets = useSafeAreaInsets();
    const { t, language } = useLanguage();
    const te = (key: string, options?: Record<string, unknown>) =>
      t(`employee:${key}`, options);

    // Uncontrolled: ref holds the live text, no re-render on every keystroke
    const problemTextRef = useRef('');
    // Only used for the character counter UI — cheap integer re-render
    const [problemLength, setProblemLength] = useState(0);

    const [issueType, setIssueType] = useState<IssueType | null>(null);
    const [submitProblemReport, { isLoading }] = useSubmitProblemReportMutation();
    const snapPoints = useMemo(() => ['66%'], []);

    const getSheetRef = useCallback(() => {
      if (!ref || typeof ref === 'function') return null;
      return ref.current;
    }, [ref]);

    const handleClose = useCallback(() => {
      getSheetRef()?.dismiss();
    }, [getSheetRef]);

    useEffect(() => {
      const restoreSheetPosition = () => {
        const sheet = getSheetRef();
        if (!sheet) return;
        sheet.snapToIndex(0);
      };

      const hideSub = Keyboard.addListener('keyboardDidHide', restoreSheetPosition);
      const willHideSub = Keyboard.addListener('keyboardWillHide', restoreSheetPosition);

      return () => {
        hideSub.remove();
        willHideSub.remove();
      };
    }, [getSheetRef]);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.55}
          pressBehavior="close"
        />
      ),
      [],
    );

    const handleSubmit = useCallback(async () => {
      const trimmed = problemTextRef.current.trim();

      if (!issueType) {
        Toast.show(te('issueTypeMandatory'), {
          type: 'error',
          duration: 2200,
          position: 'top',
          backgroundColor: colors.red,
        });
        return;
      }
      if (trimmed.length < 5) {
        Alert.alert(te('reportProblemTitle'), te('reportMinChars'));
        return;
      }

      try {
        await submitProblemReport({ message: trimmed, issue_type: issueType }).unwrap();
        problemTextRef.current = '';
        setProblemLength(0);
        setIssueType(null);
        Alert.alert(te('thanksReporting'), te('reportSubmitted'));
        handleClose();
      } catch (error) {
        const message = error && typeof error === 'object' && 'data' in error
          ? ((error as { data?: { message?: string } }).data?.message || 'Failed to submit your report. Please try again.')
          : 'Failed to submit your report. Please try again.';
        Alert.alert(te('unableToSubmit'), message);
      }
    }, [issueType, submitProblemReport, handleClose]);

    return (
      <BottomSheetModal
        ref={ref}
        index={0}
        snapPoints={snapPoints}
        topInset={Platform.OS === 'android' ? insets.top + 80 : insets.top}
        backdropComponent={renderBackdrop}
        enablePanDownToClose
        enableDismissOnClose
        handleIndicatorStyle={styles.handle}
        backgroundStyle={styles.background}
        bottomInset={0}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="none"
        android_keyboardInputMode="adjustPan"
      >
        <BottomSheetScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <Text style={styles.title}>{te('reportProblemTitle')}</Text>
            <Pressable onPress={handleClose} hitSlop={10}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </Pressable>
          </View>

          <Text style={[styles.subtitle, buildRtlLinkTextStyle(language)]}>{te('reportSubtitle')}</Text>

          <View style={styles.badgesRow}>
            {ISSUE_TYPE_KEYS.map((key) => {
              const selected = issueType === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setIssueType(key)}
                  style={[styles.badge, selected && styles.badgeSelected]}
                >
                  <Text style={[styles.badgeText, selected && styles.badgeTextSelected]}>
                    {te(`issueTypes.${key}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <BottomSheetTextInput
            defaultValue=""
            onChangeText={(text) => {
              problemTextRef.current = text;
              setProblemLength(text.trim().length);
            }}
            placeholder={te('describeProblem')}
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={6}
            maxLength={2000}
            textAlignVertical="top"
            style={styles.input}
          />

          <Text style={styles.counterText}>{`${problemLength}/2000`}</Text>

          <Pressable
            onPress={handleSubmit}
            disabled={isLoading}
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>{isLoading ? te('submitting') : te('submitReport')}</Text>
            )}
          </Pressable>
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);

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
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 28,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    marginTop: 0,
    fontSize: 22,
    fontWeight: '800',
    color: '#0B1220',
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 14,
    fontSize: 13,
    lineHeight: 20,
    color: '#6B7280',
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgGrey,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badgeSelected: {
    borderColor: colors.orange,
    backgroundColor: '#FFF2EB',
  },
  badgeText: {
    fontSize: 13,
    color: colors.navy,
    fontWeight: '600',
  },
  badgeTextSelected: {
    color: colors.orange,
  },
  input: {
    minHeight: 140,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    fontFamily,
  },
  counterText: {
    marginTop: 8,
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
  },
  submitButton: {
    marginTop: 16,
    backgroundColor: '#111827',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
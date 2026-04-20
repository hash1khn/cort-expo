import React, { forwardRef, useCallback, useMemo, useState } from 'react';
import { View, Text as RNText, StyleSheet, Pressable, Platform, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { fontFamily } from '@/core/theme';
import { useSubmitProblemReportMutation } from '../services/problemReportsApi';

const Text = (props: React.ComponentProps<typeof RNText>) => (
  <RNText {...props} style={[{ fontFamily }, props.style]} />
);

export const ReportProblemBottomSheet = forwardRef<BottomSheetModal>(
  (_, ref) => {
    const insets = useSafeAreaInsets();
    const [problemText, setProblemText] = useState('');
    const [submitProblemReport, { isLoading }] = useSubmitProblemReportMutation();
    const snapPoints = useMemo(() => ['58%'], []);

    const handleClose = useCallback(() => {
      if (ref && typeof ref !== 'function' && ref.current) {
        ref.current.dismiss();
      }
    }, [ref]);

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
      const trimmed = problemText.trim();
      if (trimmed.length < 5) {
        Alert.alert('Report a problem', 'Please provide at least 5 characters.');
        return;
      }

      try {
        await submitProblemReport({ message: trimmed }).unwrap();
        setProblemText('');
        Alert.alert('Thanks for reporting', 'Your issue has been submitted to our team.');
        handleClose();
      } catch (error) {
        const message = error && typeof error === 'object' && 'data' in error
          ? ((error as { data?: { message?: string } }).data?.message || 'Failed to submit your report. Please try again.')
          : 'Failed to submit your report. Please try again.';
        Alert.alert('Unable to submit', message);
      }
    }, [problemText, submitProblemReport, handleClose]);

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
        keyboardBehavior={Platform.OS === 'android' ? 'fillParent' : 'interactive'}
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
      >
        <BottomSheetScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <Text style={styles.title}>Report a problem</Text>
            <Pressable onPress={handleClose} hitSlop={10}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </Pressable>
          </View>

          
          <Text style={styles.subtitle}>
            Tell us what went wrong?. Your report helps us investigate and improve your experience.
          </Text>

          <BottomSheetTextInput
            value={problemText}
            onChangeText={setProblemText}
            placeholder="Write your issue here..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={6}
            maxLength={2000}
            textAlignVertical="top"
            style={styles.input}
          />

          <Text style={styles.counterText}>{`${problemText.trim().length}/2000`}</Text>

          <Pressable
            onPress={handleSubmit}
            disabled={isLoading}
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Report</Text>
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
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF2EB',
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
    marginBottom: 18,
    fontSize: 13,
    lineHeight: 20,
    color: '#6B7280',
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

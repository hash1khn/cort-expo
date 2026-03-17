import React, { useCallback, useMemo, forwardRef } from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { colors } from '../../../core/theme';

export type LegalDocumentType = 'terms' | 'privacy';

type Props = {
  type: LegalDocumentType;
};

export const LegalBottomSheet = forwardRef<BottomSheetModal, Props>(({ type }, ref) => {
  const snapPoints = useMemo(() => ['50%', '90%'], []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    []
  );

  const title = type === 'terms' ? 'Terms of Use' : 'Privacy Policy';
  
  // Placeholder content - In a real app, this might come from a CMS or local constant
  const content = type === 'terms' 
    ? "1.Welcome to Cort. By using our services, you agree to these terms..." 
    : "Your privacy is important to us. This policy explains how we collect and use your data...";

  return (
    <BottomSheetModal
      ref={ref}
      index={1}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
    >
      <BottomSheetView style={styles.contentContainer}>
        <Text style={styles.title}>{title}</Text>
        <ScrollView style={styles.scroll}>
          <Text style={styles.contentText}>
            {/* Repeat content for scroll demonstration */}
            {Array(10).fill(content).join('\n\n')}
          </Text>
        </ScrollView>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: colors.text,
  },
  scroll: {
    flex: 1,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
    opacity: 0.8,
  },
});

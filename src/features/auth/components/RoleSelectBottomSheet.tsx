import React, { useCallback, useMemo, forwardRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { fontFamily } from '../../../core/theme';

type Props = {
  onSelectRole: () => void;
};

const ROLES = [
  {
    key: 'employee',
    label: 'Login as Employee',
    sub: 'Book rides & track commute',
    bg: '#F4593B',
    textColor: '#FFFFFF',
    subColor: 'rgba(255,255,255,0.75)',
    image: require('../../../../assets/undraw_at-the-airport_z3b9-2.svg'),
  },
  {
    key: 'driver',
    label: 'Login as Driver',
    sub: 'Manage trips & navigate routes',
    bg: '#F1F443',
    textColor: '#1A1A1A',
    subColor: 'rgba(26,26,26,0.6)',
    image: require('../../../../assets/undraw_city-driver_kgk7.svg'),
  },
  {
    key: 'chauffeur',
    label: 'Apply as Chauffeur',
    sub: 'Join our professional fleet',
    bg: '#0c225e',
    textColor: '#FFFFFF',
    subColor: 'rgba(255,255,255,0.65)',
    image: require('../../../../assets/undraw_resume_jrgi.svg'),
  },
] as const;

export const RoleSelectBottomSheet = forwardRef<BottomSheetModal, Props>(
  ({ onSelectRole }, ref) => {
    const snapPoints = useMemo(() => ['50%'], []);

    const handleSelect = useCallback(() => {
      if (ref && typeof ref !== 'function' && ref.current) {
        ref.current.dismiss();
      }
      onSelectRole();
    }, [onSelectRole, ref]);

    const handleClose = useCallback(() => {
      if (ref && typeof ref !== 'function' && ref.current) {
        ref.current.dismiss();
      }
    }, [ref]);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.45}
        />
      ),
      []
    );

    return (
      <BottomSheetModal
        ref={ref}
        index={0}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        enablePanDownToClose
        enableDynamicSizing={false}
        handleIndicatorStyle={styles.handle}
        backgroundStyle={styles.sheetBg}
      >
        <BottomSheetView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Select Role</Text>
              {/* <Text style={styles.subtitle}>Pick your role to get started</Text> */}
            </View>
            {/* <Pressable style={styles.closeBtn} onPress={handleClose} hitSlop={10}>
              <Ionicons name="close" size={16} color="#FFFFFF" />
            </Pressable> */}
          </View>

          {/* Role Cards */}
          <View style={styles.cardsContainer}>
            {ROLES.map((role) => (
              <Pressable
                key={role.key}
                style={[styles.card, { backgroundColor: role.bg }]}
                onPress={handleSelect}
                android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              >
                {/* SVG illustration — right-side decorative element */}
                <Image
                  source={role.image}
                  style={styles.illustration}
                  contentFit="contain"
                />

                {/* Text on the left */}
                <View style={styles.cardText}>
                  <View className='flex-row items-center gap-1'>
                      <Text style={[styles.cardLabel, { color: role.textColor }]}>
                        {role.label}
                      </Text>
                        {/* <Ionicons name="chevron-forward" size={16} color={role.textColor} className='mb-1'/> */}
                  </View>
                  {/* <Text style={[styles.cardSub, { color: role.subColor }]}>
                    {role.sub}
                  </Text> */}
                </View>

              
              </Pressable>
            ))}
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

const styles = StyleSheet.create({
  handle: {
    backgroundColor: '#D1D5DB',
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  sheetBg: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    fontFamily,
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    fontFamily,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#BEBEBE',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  cardsContainer: {
    flex: 1,
    gap: 10,
  },
  card: {
    flex: 1,
    minHeight: 100,
    borderRadius: 15,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
   
    paddingLeft: 20,
    paddingRight: 14,
    paddingVertical: 20,
  },
  illustration: {
    position: 'absolute',
    right: -14,
    bottom: -8,
    width: 165,
    height: '160%',
    opacity: 0.92,
  },
  cardText: {
    flex: 1,
    paddingRight: 140,
  },
  cardLabel: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily,
    marginBottom: 5,
    letterSpacing: -0.2,
  },
  cardSub: {
    fontSize: 13,
    fontFamily,
    lineHeight: 18,
        fontWeight: '500',
  },
  arrowPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    right: 14,
    top: 14,
  },
});
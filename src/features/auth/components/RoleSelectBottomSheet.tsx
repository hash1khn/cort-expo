import React, { useCallback, useMemo, forwardRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { CortButton } from '@/components';

type RoleKey = 'employee' | 'driver' | 'chauffeur';

type Props = {
  onSelectRole: (role: RoleKey) => void;
};

const ROLES = [
  {
    key: 'employee' as RoleKey,
    label: 'Employee',
    sub: 'Book rides for your daily commute',
    icon: 'person-outline',
  },
  {
    key: 'driver' as RoleKey,
    label: 'Driver',
    sub: 'Manage and complete assigned trips',
    icon: 'car-outline',
  },
  {
    key: 'chauffeur' as RoleKey,
    label: 'Apply as Chauffeur',
    sub: 'Join our fleet of professional drivers',
    icon: 'document-attach-outline',
  },
];

export const RoleSelectBottomSheet = forwardRef<BottomSheetModal, Props>(
  ({ onSelectRole }, ref) => {
    const [selectedRole, setSelectedRole] = useState<RoleKey>('employee');
    
    // Slightly reduced snap point for a more compact feel
    const snapPoints = useMemo(() => ['51%'], []);

    const handleContinue = useCallback(() => {
      onSelectRole(selectedRole);
      if (ref && typeof ref !== 'function' && ref.current) {
        ref.current.dismiss();
      }
    }, [onSelectRole, selectedRole, ref]);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.4}
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
        handleIndicatorStyle={styles.handle}
        backgroundStyle={styles.sheetBg}
        enableDynamicSizing={false}
      >
        <BottomSheetView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Select your role</Text>
            <Text style={styles.subtitle}>
              Choose your path to customize your experience.
            </Text>
          </View>

          {/* Role Cards */}
          <View style={styles.cardsContainer}>
            {ROLES.map((role) => {
              const isSelected = selectedRole === role.key;
              return (
                <Pressable
                  key={role.key}
                  onPress={() => setSelectedRole(role.key)}
                  style={[
                    styles.card,
                    isSelected && styles.cardSelected
                  ]}
                >
                  {/* Left Icon - Slightly smaller container */}
                  <View style={[styles.iconContainer, isSelected && styles.iconContainerSelected]}>
                    <Ionicons 
                      name={role.icon as any} 
                      size={20} 
                      color={isSelected ? "#FF5A00" : "#475569"} 
                    />
                  </View>

                  {/* Text Content */}
                  <View style={styles.textContainer}>
                    <Text style={styles.cardLabel}>{role.label}</Text>
                    <Text style={styles.cardSub}>{role.sub}</Text>
                  </View>

                  {/* Radio Indicator - Tighter sizing */}
                  <View style={[styles.radio, isSelected && styles.radioSelected]}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Action Button */}
          <View style={styles.footer}>
            <CortButton
              title="Continue"
              variant="primary"
              onPress={handleContinue}
            />
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24, // Slightly less aggressive rounding for a "pro" look
    borderTopRightRadius: 24,
  },
  handle: {
    backgroundColor: '#E2E8F0',
    width: 36,
    height: 4,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 30,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22, // Reduced from 26
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  cardsContainer: {
    gap: 10, // Tighter gap
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12, // Reduced padding
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1, // Thinner border
    borderColor: '#eaeaea',
    backgroundColor: '#FFFFFF',
  },
  cardSelected: {
    borderColor: '#FF5A00',
    backgroundColor: '#FFF9F6',
  },
  iconContainer: {
    width: 40, // Reduced from 48
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  iconContainerSelected: {
    backgroundColor: '#FFEDE5',
  },
  textContainer: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 15, // Reduced from 17
    fontWeight: '600',
    color: '#1E293B',
  },
  cardSub: {
    fontSize: 12, // Reduced from 13
    color: '#64748B',
    marginTop: 1,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  radioSelected: {
    borderColor: '#FF5A00',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF5A00',
  },
  footer: {
    marginTop: 'auto', // Pushes button to bottom
    paddingTop: 25,
  },
});
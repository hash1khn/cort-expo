import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radii, shadows, typography } from '../../../core/theme';

type Props = {
  visible: boolean;
  stopName: string;
  passengerNames: readonly string[];
  onClose: () => void;
  onConfirm: () => void;
};

export function DropOffModal({ visible, stopName, passengerNames, onClose, onConfirm }: Props) {
  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    bounce.setValue(0);
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: 1, duration: 520, useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 520, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [bounce, visible]);

  const translateY = bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });

  const listText = useMemo(() => passengerNames.join(', '), [passengerNames]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          <Text style={styles.header}>Arrived at: {stopName}</Text>

          <Animated.View style={[styles.pinWrap, { transform: [{ translateY }] }]}>
            <View style={styles.pinCircle}>
              <Ionicons name="location" size={20} color={colors.navy} />
            </View>
          </Animated.View>

          <Text style={styles.subtitle}>Please confirm drop-off for:</Text>
          <View style={styles.namesBox}>
            <Text style={styles.namesText}>{listText || 'No boarded passengers for this stop.'}</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              onConfirm();
              onClose();
            }}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          >
            <Text style={styles.primaryText}>Confirm Drop-Off</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.50)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
    ...shadows.floating,
  },
  header: {
    fontFamily: typography.family.semibold,
    fontSize: 16,
    color: colors.text,
  },
  pinWrap: {
    marginTop: 14,
    alignItems: 'center',
  },
  pinCircle: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(12, 34, 94, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    marginTop: 14,
    fontFamily: typography.family.regular,
    fontSize: 13,
    color: colors.muted,
  },
  namesBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.bgGrey,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  namesText: {
    fontFamily: typography.family.medium,
    fontSize: 14,
    color: colors.navy,
  },
  primaryBtn: {
    marginTop: 14,
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    fontFamily: typography.family.semibold,
    fontSize: 15,
    color: colors.white,
  },
  pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
});



import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { CortButton, CortCard } from '../../../components';
import { colors, radii, typography } from '../../../core/theme';

type Props = {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
};

export function IncomingRequestModal({ visible, onAccept, onDecline }: Props) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.03, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.0, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [visible, pulse]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDecline} />

        <View style={styles.sheetWrap}>
          <CortCard style={styles.card}>
            <Text style={styles.title}>Incoming Request</Text>

            <View style={styles.row}>
              <Text style={styles.primaryLine}>Pickup at 12:45 PM</Text>
              <Text style={styles.meta}>Distance: 1.2 mi</Text>
            </View>

            <View style={styles.passengerRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>S</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.passengerName}>Sarah J.</Text>
                <Text style={styles.passengerSub}>Corporate Account</Text>
              </View>
            </View>

            <View style={styles.buttonsRow}>
              <CortButton
                title="Decline"
                variant="outline"
                onPress={onDecline}
                style={styles.btnHalf}
              />

              <Animated.View style={[styles.btnHalf, { transform: [{ scale: pulse }] }]}>
                <CortButton
                  title="Tap to Accept"
                  variant="primary"
                  onPress={onAccept}
                  style={styles.acceptBtn}
                />
              </Animated.View>
            </View>
          </CortCard>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetWrap: {
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: colors.shadowNavy,
    borderRadius: radii.xl,
  },
  title: {
    fontFamily: typography.family.semibold,
    fontSize: 14,
    color: colors.text,
  },
  row: { marginTop: 10 },
  primaryLine: {
    fontFamily: typography.family.semibold,
    fontSize: 18,
    color: colors.text,
  },
  meta: {
    marginTop: 6,
    fontFamily: typography.family.regular,
    fontSize: 13,
    color: colors.muted,
  },
  passengerRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(12, 34, 94, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: typography.family.semibold, fontSize: 16, color: colors.navy },
  passengerName: { fontFamily: typography.family.semibold, fontSize: 15, color: colors.text },
  passengerSub: { marginTop: 4, fontFamily: typography.family.regular, fontSize: 12, color: colors.muted },
  buttonsRow: { flexDirection: 'row', gap: 12, marginTop: 18 },
  btnHalf: { flex: 1 },
  acceptBtn: { backgroundColor: colors.orange },
});



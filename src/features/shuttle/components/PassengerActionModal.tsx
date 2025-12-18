import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadows, typography } from '../../../core/theme';
import type { AbsentReason, ManifestPassenger } from '../types';

type Props = {
  visible: boolean;
  passenger: ManifestPassenger | null;
  onClose: () => void;
  onMarkBoarded: () => void;
  onConfirmAbsent: (reason: AbsentReason) => void;
};

const reasonOptions: readonly { label: string; value: AbsentReason }[] = [
  { label: 'Left Early', value: 'LEFT_EARLY' },
  { label: 'Sick Leave', value: 'SICK_LEAVE' },
  { label: 'No Show', value: 'NO_SHOW' },
] as const;

export function PassengerActionModal({
  visible,
  passenger,
  onClose,
  onMarkBoarded,
  onConfirmAbsent,
}: Props) {
  const [absentMode, setAbsentMode] = useState(false);
  const [selectedReason, setSelectedReason] = useState<AbsentReason | null>(null);

  const title = useMemo(() => {
    const name = passenger?.name ?? '';
    return name ? `Update Status: ${name}` : 'Update Status';
  }, [passenger?.name]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheetWrap} pointerEvents="box-none">
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Text style={styles.title}>{title}</Text>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setAbsentMode(false);
                setSelectedReason(null);
                onMarkBoarded();
              }}
              style={({ pressed }) => [styles.actionBtn, styles.actionGreen, pressed && styles.pressed]}
            >
              <Text style={[styles.actionText, styles.actionGreenText]}>Mark as Boarded</Text>
              <Text style={styles.actionHint}>Use this if QR scan fails.</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => setAbsentMode((v) => !v)}
              style={({ pressed }) => [styles.actionBtn, styles.actionRed, pressed && styles.pressed]}
            >
              <Text style={[styles.actionText, styles.actionRedText]}>Mark as Absent</Text>
            </Pressable>
          </View>

          {absentMode ? (
            <View style={styles.absentArea}>
              <Text style={styles.reasonLabel}>Reason Tags</Text>
              <View style={styles.reasonRow}>
                {reasonOptions.map((r) => {
                  const active = selectedReason === r.value;
                  return (
                    <Pressable
                      key={r.value}
                      accessibilityRole="button"
                      onPress={() => setSelectedReason(r.value)}
                      style={({ pressed }) => [
                        styles.reasonPill,
                        active && styles.reasonPillActive,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={[styles.reasonText, active && styles.reasonTextActive]}>{r.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                accessibilityRole="button"
                disabled={!selectedReason}
                onPress={() => {
                  if (!selectedReason) return;
                  onConfirmAbsent(selectedReason);
                  setAbsentMode(false);
                  setSelectedReason(null);
                }}
                style={({ pressed }) => [
                  styles.confirmBtn,
                  !selectedReason && styles.disabled,
                  pressed && selectedReason && styles.pressed,
                ]}
              >
                <Text style={styles.confirmText}>Confirm Absence</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingBottom: 18,
    paddingTop: 10,
    ...shadows.floating,
  },
  grabber: {
    width: 44,
    height: 5,
    borderRadius: radii.pill,
    alignSelf: 'center',
    backgroundColor: 'rgba(12, 34, 94, 0.18)',
    marginBottom: 10,
  },
  title: {
    fontFamily: typography.family.semibold,
    fontSize: 16,
    color: colors.text,
    marginBottom: 14,
  },
  actions: {
    gap: 12,
  },
  actionBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1.6,
    backgroundColor: colors.white,
  },
  actionGreen: {
    borderColor: '#16A34A',
  },
  actionRed: {
    borderColor: colors.red,
  },
  actionText: {
    fontFamily: typography.family.semibold,
    fontSize: 15,
  },
  actionGreenText: { color: '#16A34A' },
  actionRedText: { color: colors.red },
  actionHint: {
    marginTop: 6,
    fontFamily: typography.family.regular,
    fontSize: 12,
    color: colors.muted,
  },
  absentArea: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  reasonLabel: {
    fontFamily: typography.family.semibold,
    fontSize: 12,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  reasonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  reasonPill: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.bgGrey,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  reasonPillActive: {
    borderColor: colors.orange,
    backgroundColor: 'rgba(244, 127, 0, 0.12)',
  },
  reasonText: {
    fontFamily: typography.family.medium,
    fontSize: 13,
    color: colors.navy,
  },
  reasonTextActive: {
    fontFamily: typography.family.semibold,
    color: colors.orange,
  },
  confirmBtn: {
    marginTop: 14,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: colors.navy,
  },
  confirmText: {
    fontFamily: typography.family.semibold,
    fontSize: 15,
    color: colors.white,
  },
  pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.5 },
});



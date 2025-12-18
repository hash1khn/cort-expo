import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radii, shadows, typography } from '../../../core/theme';

type Props = {
  onDone?: () => void;
  userName?: string;
};

function formatTime(d: Date) {
  const h = d.getHours();
  const m = d.getMinutes();
  const hour12 = ((h + 11) % 12) + 1;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const mm = String(m).padStart(2, '0');
  return `${hour12}:${mm} ${ampm}`;
}

export function BoardingSuccessScreen({ onDone, userName = 'Sarah' }: Props) {
  const now = useMemo(() => new Date(), []);
  const [showCheck, setShowCheck] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShowCheck(true), 180);
    const t2 = setTimeout(() => onDone?.(), 5000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.center}>
        <View style={styles.circle}>
          {showCheck ? <Ionicons name="checkmark" size={80} color={colors.white} /> : null}
        </View>

        <Text style={styles.title}>Boarding Successful</Text>
        <Text style={styles.sub}>Welcome aboard, {userName}.</Text>

        <View style={styles.ticket}>
          <View style={styles.row}>
            <Text style={styles.k}>Route</Text>
            <Text style={styles.vBold}>Clifton Loop</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.k}>Vehicle</Text>
            <Text style={styles.v}>Toyota Coaster (BUS-999)</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.k}>Time</Text>
            <Text style={styles.v}>{formatTime(now)}</Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={onDone}
          style={({ pressed }) => [styles.doneBtn, pressed && styles.donePressed]}
        >
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.navy },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22 },
  circle: {
    width: 128,
    height: 128,
    borderRadius: radii.pill,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    ...shadows.floating,
  },
  title: { fontFamily: typography.family.semibold, fontSize: 22, color: colors.white, marginTop: 6 },
  sub: {
    marginTop: 10,
    fontFamily: typography.family.regular,
    fontSize: 14,
    color: 'rgba(209, 213, 219, 0.95)',
  },
  ticket: {
    marginTop: 22,
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: 16,
    ...shadows.card,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  k: { fontFamily: typography.family.regular, fontSize: 12, color: colors.muted },
  v: { fontFamily: typography.family.medium, fontSize: 13, color: colors.text },
  vBold: { fontFamily: typography.family.semibold, fontSize: 13, color: colors.text },
  doneBtn: {
    marginTop: 22,
    width: '100%',
    height: 50,
    borderRadius: radii.md,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donePressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  doneText: { fontFamily: typography.family.semibold, fontSize: 15, color: colors.white },
});



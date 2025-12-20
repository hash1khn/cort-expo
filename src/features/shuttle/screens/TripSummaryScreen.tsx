import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { colors, radii, typography } from '../../../core/theme';
import { useShuttleStore } from '../store';

export function TripSummaryScreen() {
  const navigation = useNavigation<any>();
  const resetRide = useShuttleStore((s) => s.resetRide);
  const passengers = useShuttleStore((s) => s.passengers);

  const total = passengers.length;
  const completed = passengers.filter((p) => p.status === 'COMPLETED' || p.status === 'ABSENT').length;

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={42} color={colors.white} />
          </View>

          <Text style={styles.title}>Route Completed</Text>

          <View style={styles.receipt}>
            <Row label="Trip ID" value="#TRIP-8821" />
            <Row label="Passengers" value={`${completed}/${total}`} />
            <Row label="Invoice" value="Logged to #1150" valueStyle={styles.invoiceValue} />
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            resetRide();
            navigation.navigate('ShuttleRoute');
          }}
          style={({ pressed }) => [styles.footerBtn, pressed && styles.pressed]}
        >
          <Text style={styles.footerBtnText}>Return to Home</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

function Row({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: string;
  valueStyle?: any;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, valueStyle]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.purple,
  },
  safe: { flex: 1, paddingHorizontal: 16, paddingBottom: 18 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    width: 84,
    height: 84,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  title: {
    marginTop: 14,
    fontFamily: typography.family.semibold,
    fontSize: 22,
    color: colors.white,
  },
  receipt: {
    marginTop: 18,
    width: '100%',
    borderRadius: 18,
    backgroundColor: colors.white,
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(12, 34, 94, 0.08)',
  },
  rowLabel: {
    fontFamily: typography.family.medium,
    fontSize: 13,
    color: colors.muted,
  },
  rowValue: {
    fontFamily: typography.family.semibold,
    fontSize: 13,
    color: colors.navy,
  },
  invoiceValue: {
    color: colors.orange,
    fontFamily: typography.family.semibold,
  },
  footerBtn: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.6,
    borderColor: 'rgba(255,255,255,0.80)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBtnText: {
    fontFamily: typography.family.semibold,
    fontSize: 15,
    color: colors.white,
  },
  pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
});



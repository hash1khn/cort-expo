import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { CortCard } from '../../../components';
import { colors, typography } from '../../../core/theme';

export function EarningsScreen() {
  const today = 245.75;
  const week = 1182.5;

  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.title}>Earnings</Text>
      <Text style={styles.sub}>Demo numbers for now.</Text>

      <View style={styles.grid}>
        <CortCard style={styles.card}>
          <Text style={styles.cardLabel}>Today</Text>
          <Text style={styles.cardValue}>${today.toFixed(2)}</Text>
        </CortCard>
        <CortCard style={styles.card}>
          <Text style={styles.cardLabel}>This Week</Text>
          <Text style={styles.cardValue}>${week.toFixed(2)}</Text>
        </CortCard>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white, paddingHorizontal: 16, paddingTop: 12 },
  title: { fontFamily: typography.family.semibold, fontSize: 18, color: colors.text },
  sub: { marginTop: 6, fontFamily: typography.family.regular, fontSize: 12, color: colors.muted },
  grid: { marginTop: 14, gap: 12 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, shadowColor: colors.shadowNavy },
  cardLabel: { fontFamily: typography.family.semibold, fontSize: 12, color: colors.muted },
  cardValue: { marginTop: 8, fontFamily: typography.family.semibold, fontSize: 22, color: colors.navy },
});



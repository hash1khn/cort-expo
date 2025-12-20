import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CortCard } from '../../../components';
import { colors, typography } from '../../../core/theme';

export function TripRequestsScreen() {
  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.title}>Trip Requests</Text>
      <Text style={styles.sub}>Demo placeholder — incoming jobs appear on the Dashboard.</Text>

      <View style={styles.list}>
        <CortCard style={styles.card}>
          <Text style={styles.cardTitle}>No pending requests</Text>
          <Text style={styles.cardSub}>Go online on the Dashboard to simulate a request.</Text>
        </CortCard>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white, paddingHorizontal: 16, paddingTop: 12 },
  title: { fontFamily: typography.family.semibold, fontSize: 18, color: colors.text },
  sub: { marginTop: 6, fontFamily: typography.family.regular, fontSize: 12, color: colors.muted },
  list: { marginTop: 14, gap: 12 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, shadowColor: colors.shadowNavy },
  cardTitle: { fontFamily: typography.family.semibold, fontSize: 14, color: colors.text },
  cardSub: { marginTop: 6, fontFamily: typography.family.regular, fontSize: 12, color: colors.muted },
});



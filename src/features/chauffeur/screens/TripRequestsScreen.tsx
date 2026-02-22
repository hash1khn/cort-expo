import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CortCard } from '../../../components';
import { colors, typography } from '../../../core/theme';

type Ride = {
  id: string;
  pickupTime: string;
  passenger: string;
  pickup: string;
  dropoff: string;
};

// Mock data for assigned rides (approved by admin)
const MOCK_RIDES: Ride[] = [
  {
    id: '1',
    pickupTime: 'Today, 2:30 PM',
    passenger: 'Sarah Jenkins',
    pickup: 'Jinnah Terminal ',
    dropoff: 'MCB Tower',
  },
  {
    id: '2',
    pickupTime: 'Today, 5:15 PM',
    passenger: 'Abdul Rafi',
    pickup: 'Marriot Hotel',
    dropoff: 'Pier 39',
  },
  {
    id: '3',
    pickupTime: 'Tomorrow, 9:00 AM',
    passenger: 'Salima Khatun',
    pickup: 'PC',
    dropoff: 'Jinnah',
  },
];

export function TripRequestsScreen() {
  const [rides] = useState<Ride[]>(MOCK_RIDES);

  const renderItem = ({ item }: { item: Ride }) => (
    <CortCard style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.time}>{item.pickupTime}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>Assigned</Text>
        </View>
      </View>

      <Text style={styles.passenger}>{item.passenger}</Text>

      <View style={styles.routeContainer}>
        <View style={styles.routeRow}>
          <View style={[styles.dot, styles.greenDot]} />
          <Text style={styles.address}>{item.pickup}</Text>
        </View>
        <View style={styles.lineLink} />
        <View style={styles.routeRow}>
          <View style={[styles.dot, styles.redDot]} />
          <Text style={styles.address}>{item.dropoff}</Text>
        </View>
      </View>
    </CortCard>
  );

  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.title}>Assigned Rides</Text>
      <Text style={styles.sub}>Upcoming trips approved by dispatch.</Text>

      <FlatList
        data={rides}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <CortCard style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No assigned rides</Text>
            <Text style={styles.emptySub}>You will be notified when dispatch assigns a new trip.</Text>
          </CortCard>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white, paddingHorizontal: 16, paddingTop: 12 },
  title: { fontFamily: typography.family.semibold, fontSize: 22, color: colors.text },
  sub: { marginTop: 4, fontFamily: typography.family.regular, fontSize: 13, color: colors.muted },
  list: { marginTop: 16, paddingBottom: 20, gap: 12 },

  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: colors.shadowNavy,
    padding: 16,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  time: { fontFamily: typography.family.semibold, fontSize: 14, color: colors.text },
  statusBadge: { backgroundColor: '#E0F2FE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontFamily: typography.family.medium, fontSize: 11, color: '#0369A1' },

  passenger: { fontFamily: typography.family.semibold, fontSize: 16, color: colors.navy, marginBottom: 12 },

  routeContainer: { gap: 0 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 24 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  greenDot: { backgroundColor: '#10B981' }, // green
  redDot: { backgroundColor: colors.orange },
  lineLink: { width: 2, height: 14, backgroundColor: colors.border, marginLeft: 3, marginVertical: 2 },
  address: { fontFamily: typography.family.regular, fontSize: 14, color: colors.text },

  emptyCard: { alignItems: 'center', paddingVertical: 32 },
  emptyTitle: { fontFamily: typography.family.semibold, fontSize: 16, color: colors.text },
  emptySub: { marginTop: 6, fontFamily: typography.family.regular, fontSize: 13, color: colors.muted, textAlign: 'center' },
});




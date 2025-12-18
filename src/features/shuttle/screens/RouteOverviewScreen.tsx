import React, { useMemo } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { colors, radii, shadows, typography } from '../../../core/theme';
import { CortButton } from '../../../components';
import { useShuttleStore } from '../store';

type StopState = 'START' | 'MID' | 'END';
type UiStop = { id: string; name: string; state: StopState };

export function RouteOverviewScreen() {
  const navigation = useNavigation<any>();

  const routeLabel = useShuttleStore((s) => s.routeLabel);
  const vehicleLabel = useShuttleStore((s) => s.vehicleLabel);
  const routePathLabel = useShuttleStore((s) => s.routePathLabel);
  const stops = useShuttleStore((s) => s.stops);

  const uiStops = useMemo<readonly UiStop[]>(() => {
    if (!stops.length) return [];
    return stops.map((s, idx) => ({
      id: s.id,
      name: s.name,
      state: idx === 0 ? 'START' : idx === stops.length - 1 ? 'END' : 'MID',
    }));
  }, [stops]);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={18} color={colors.navy} />
          </Pressable>

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Route Overview
            </Text>
            <Text style={styles.headerSub} numberOfLines={1}>
              {routeLabel} · {vehicleLabel}
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.summaryCard}>
            <Text style={styles.label}>Route</Text>
            <Text style={styles.routePath} numberOfLines={2}>
              {routePathLabel}
            </Text>

            <View style={styles.summaryMetaRow}>
              <View style={styles.metaPill}>
                <Ionicons name="map-outline" size={14} color={colors.navy} />
                <Text style={styles.metaText}>{stops.length} Stops</Text>
              </View>
              <View style={[styles.metaPill, { backgroundColor: 'rgba(244, 127, 0, 0.12)' }]}>
                <Ionicons name="time-outline" size={14} color={colors.orange} />
                <Text style={[styles.metaText, { color: colors.orange }]}>Demo Timing</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Stops</Text>

          {uiStops.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No Stops</Text>
              <Text style={styles.emptySub}>This route doesn’t have any stops yet.</Text>
            </View>
          ) : (
            <View style={styles.timelineCard}>
              {uiStops.map((s, idx) => {
                const showTop = idx !== 0;
                const showBottom = idx !== uiStops.length - 1;
                const isStart = s.state === 'START';
                const isEnd = s.state === 'END';
                return (
                  <View key={s.id} style={styles.stopRow}>
                    <View style={styles.railCol}>
                      {showTop ? <View style={styles.line} /> : <View style={styles.lineSpacer} />}
                      <View style={[styles.dot, isStart && styles.dotStart, isEnd && styles.dotEnd]} />
                      {showBottom ? <View style={styles.line} /> : <View style={styles.lineSpacer} />}
                    </View>
                    <View style={styles.stopCol}>
                      <Text style={styles.stopName}>{s.name}</Text>
                      <Text style={styles.stopHint}>
                        {isStart ? 'Start' : isEnd ? 'Final Stop' : 'Stop'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <View style={{ height: 18 }} />
          <CortButton title="Go to Dashboard" variant="navy" onPress={() => navigation.navigate('ShuttleRoute')} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgGrey,
  },
  headerTitle: { fontFamily: typography.family.semibold, fontSize: 16, color: colors.text },
  headerSub: { marginTop: 2, fontFamily: typography.family.regular, fontSize: 12, color: colors.muted },
  content: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 22 },

  summaryCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.card,
  },
  label: {
    fontFamily: typography.family.semibold,
    fontSize: 12,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  routePath: { marginTop: 6, fontFamily: typography.family.semibold, fontSize: 16, color: colors.navy },
  summaryMetaRow: { marginTop: 12, flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(12, 34, 94, 0.10)',
  },
  metaText: { fontFamily: typography.family.semibold, fontSize: 12, color: colors.navy },

  sectionTitle: {
    marginTop: 16,
    marginBottom: 10,
    fontFamily: typography.family.semibold,
    fontSize: 14,
    color: colors.text,
  },

  timelineCard: {
    borderRadius: 18,
    paddingVertical: 6,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.card,
  },
  stopRow: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10 },
  railCol: { width: 26, alignItems: 'center' },
  line: { flex: 1, width: 2, backgroundColor: 'rgba(12, 34, 94, 0.12)' },
  lineSpacer: { flex: 1, width: 2, backgroundColor: 'transparent' },
  dot: {
    width: 12,
    height: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.navy,
    marginVertical: 6,
  },
  dotStart: { backgroundColor: colors.orange },
  dotEnd: { backgroundColor: colors.purple },
  stopCol: { flex: 1, paddingLeft: 10 },
  stopName: { fontFamily: typography.family.semibold, fontSize: 14, color: colors.text },
  stopHint: { marginTop: 4, fontFamily: typography.family.regular, fontSize: 12, color: colors.muted },

  empty: { alignItems: 'center', paddingVertical: 24, backgroundColor: colors.bgGrey, borderRadius: 18 },
  emptyTitle: { fontFamily: typography.family.semibold, fontSize: 14, color: colors.text },
  emptySub: { marginTop: 6, fontFamily: typography.family.regular, fontSize: 12, color: colors.muted },

  pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
});



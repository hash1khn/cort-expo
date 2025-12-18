import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { CortButton } from '../../../components';
import { colors, radii, shadows, typography } from '../../../core/theme';
import { useShuttleStore } from '../store';
import { DropOffModal, PassengerActionModal } from '../components';
import type { AbsentReason } from '../types';

type Segment = { label: string; value: 'PICKUP' | 'DROPOFF' };

const segments: readonly Segment[] = [
  { label: 'Pickup Mode', value: 'PICKUP' },
  { label: 'Drop-off Mode', value: 'DROPOFF' },
] as const;

export function ShuttleRouteScreen() {
  const navigation = useNavigation<any>();

  const routeLabel = useShuttleStore((s) => s.routeLabel);
  const vehicleLabel = useShuttleStore((s) => s.vehicleLabel);
  const routePathLabel = useShuttleStore((s) => s.routePathLabel);
  const mode = useShuttleStore((s) => s.mode);
  const setMode = useShuttleStore((s) => s.setMode);
  const rideStarted = useShuttleStore((s) => s.rideStarted);
  const startRide = useShuttleStore((s) => s.startRide);
  const passengers = useShuttleStore((s) => s.passengers);
  const markBoarded = useShuttleStore((s) => s.markBoarded);
  const markAbsent = useShuttleStore((s) => s.markAbsent);
  const confirmDropOffForStop = useShuttleStore((s) => s.confirmDropOffForStop);

  const [selectedPassengerId, setSelectedPassengerId] = useState<string | null>(null);
  const [dropOffVisible, setDropOffVisible] = useState(false);

  const selectedPassenger = useMemo(
    () => passengers.find((p) => p.id === selectedPassengerId) ?? null,
    [passengers, selectedPassengerId]
  );

  const pendingCount = useMemo(
    () => passengers.filter((p) => p.status === 'PENDING').length,
    [passengers]
  );
  const interlockLocked = pendingCount > 0;
  const canCompleteRoute = useMemo(
    () => passengers.length > 0 && passengers.every((p) => p.status === 'COMPLETED' || p.status === 'ABSENT'),
    [passengers]
  );

  const stopId = 'stop_tower';
  const stopName = 'Tower Station';
  const dropoffNames = useMemo(
    () =>
      passengers
        .filter((p) => p.stopId === stopId && p.status === 'BOARDED')
        .map((p) => p.name),
    [passengers]
  );

  const footerTitle = rideStarted
    ? 'Ride Started'
    : interlockLocked
      ? `Waiting for ${pendingCount} Passengers...`
      : 'Start Ride';

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <FlatList
          data={passengers}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.listContent}
          stickyHeaderIndices={[0]}
          ListHeaderComponent={
            <View style={styles.stickyHeaderWrap}>
              <View style={styles.headerCard}>
                {/* Top Row */}
                <View style={styles.headerTopRow}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                      {routeLabel}
                    </Text>
                  </View>

                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{vehicleLabel}</Text>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Open route overview"
                    onPress={() => navigation.navigate('RouteOverview')}
                    style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
                  >
                    <Ionicons name="map-outline" size={18} color={colors.navy} />
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Open QR scanner"
                    onPress={() => navigation.navigate('ShuttleQrScanner')}
                    style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
                  >
                    <Ionicons name="qr-code-outline" size={18} color={colors.navy} />
                  </Pressable>
                </View>

                {/* Sub-header */}
                <Text style={styles.subHeader} numberOfLines={2}>
                  Route: {routePathLabel}
                </Text>

                {/* Segmented Control */}
                <View style={styles.segmentWrap}>
                  {segments.map((seg) => {
                    const active = mode === seg.value;
                    return (
                      <Pressable
                        key={seg.value}
                        accessibilityRole="button"
                        onPress={() => setMode(seg.value)}
                        style={({ pressed }) => [
                          styles.segment,
                          active && styles.segmentActive,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                          {seg.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No Assignments</Text>
              <Text style={styles.emptySub}>There are no passengers on this manifest.</Text>
            </View>
          }
          renderItem={({ item }) => {
            return (
              <Pressable
                accessibilityRole="button"
                onPress={() => setSelectedPassengerId(item.id)}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.passengerName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.destination} numberOfLines={1}>
                    {item.destinationLabel}
                  </Text>
                </View>

                <View style={styles.statusWrap}>
                  {item.status === 'PENDING' ? (
                    <View style={[styles.statusDot, styles.pendingDot]} />
                  ) : null}
                  {item.status === 'BOARDED' ? (
                    <View style={[styles.statusDot, styles.boardedDot]}>
                      <Ionicons name="checkmark" size={14} color={colors.white} />
                    </View>
                  ) : null}
                  {item.status === 'ABSENT' ? (
                    <View style={[styles.statusDot, styles.absentDot]}>
                      <Ionicons name="close" size={14} color={colors.white} />
                    </View>
                  ) : null}
                  {item.status === 'COMPLETED' ? (
                    <View style={[styles.statusDot, styles.completedDot]}>
                      <Ionicons name="checkmark-done" size={14} color={colors.white} />
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          }}
        />

        {/* Dev Button: simulate geofence stop arrival */}
        {__DEV__ ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setDropOffVisible(true)}
            style={({ pressed }) => [styles.devBtn, pressed && styles.pressed]}
          >
            <Text style={styles.devBtnText}>Simulate Stop Arrival</Text>
          </Pressable>
        ) : null}

        {/* Interlock Footer */}
        <View style={styles.footerBar}>
          {!rideStarted ? (
            <CortButton
              title={footerTitle}
              disabled={interlockLocked}
              onPress={() => {
                if (interlockLocked) return;
                startRide();
              }}
              style={[styles.footerBtn, interlockLocked && { backgroundColor: colors.bgGrey }]}
            />
          ) : (
            <CortButton
              title={canCompleteRoute ? 'Complete Route' : 'Route In Progress'}
              variant="navy"
              disabled={!canCompleteRoute}
              onPress={() => {
                if (!canCompleteRoute) return;
                navigation.navigate('TripSummary');
              }}
              style={[styles.footerBtn, !canCompleteRoute && { backgroundColor: colors.bgGrey }]}
            />
          )}
        </View>

        <PassengerActionModal
          visible={!!selectedPassenger}
          passenger={selectedPassenger}
          onClose={() => setSelectedPassengerId(null)}
          onMarkBoarded={() => {
            if (!selectedPassenger) return;
            markBoarded(selectedPassenger.id);
            setSelectedPassengerId(null);
          }}
          onConfirmAbsent={(reason: AbsentReason) => {
            if (!selectedPassenger) return;
            markAbsent(selectedPassenger.id, reason);
            setSelectedPassengerId(null);
          }}
        />

        <DropOffModal
          visible={dropOffVisible}
          stopName={stopName}
          passengerNames={dropoffNames}
          onClose={() => setDropOffVisible(false)}
          onConfirm={() => confirmDropOffForStop(stopId, new Date())}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  safe: { flex: 1 },
  listContent: { paddingBottom: 140 },

  stickyHeaderWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: colors.white,
  },
  headerCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: colors.shadowNavy,
    ...shadows.card,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontFamily: typography.family.semibold,
    fontSize: 18,
    color: colors.text,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(12, 34, 94, 0.10)',
  },
  badgeText: {
    fontFamily: typography.family.semibold,
    fontSize: 12,
    color: colors.navy,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgGrey,
  },
  subHeader: {
    marginTop: 10,
    fontFamily: typography.family.regular,
    fontSize: 13,
    color: colors.muted,
  },
  segmentWrap: {
    marginTop: 12,
    flexDirection: 'row',
    backgroundColor: colors.bgGrey,
    borderRadius: radii.pill,
    padding: 4,
    gap: 6,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: radii.pill,
  },
  segmentActive: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentText: {
    fontFamily: typography.family.medium,
    fontSize: 12,
    color: colors.muted,
  },
  segmentTextActive: {
    fontFamily: typography.family.semibold,
    color: colors.navy,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(12, 34, 94, 0.08)',
    backgroundColor: colors.white,
  },
  rowPressed: { backgroundColor: 'rgba(244, 127, 0, 0.06)' },
  passengerName: {
    fontFamily: typography.family.semibold,
    fontSize: 15,
    color: colors.text,
  },
  destination: {
    marginTop: 4,
    fontFamily: typography.family.regular,
    fontSize: 12,
    color: colors.muted,
  },
  statusWrap: {
    marginLeft: 12,
    width: 34,
    alignItems: 'flex-end',
  },
  statusDot: {
    width: 24,
    height: 24,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingDot: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'rgba(107, 114, 128, 0.55)',
  },
  boardedDot: { backgroundColor: '#16A34A' },
  absentDot: { backgroundColor: colors.red },
  completedDot: { backgroundColor: colors.navy },

  footerBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(12, 34, 94, 0.10)',
    ...shadows.floating,
  },
  footerBtn: {
    height: 54,
    borderRadius: 14,
  },

  devBtn: {
    position: 'absolute',
    right: 16,
    bottom: 92,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(12, 34, 94, 0.10)',
  },
  devBtnText: {
    fontFamily: typography.family.semibold,
    fontSize: 12,
    color: colors.navy,
  },

  emptyState: { paddingHorizontal: 16, paddingTop: 30, alignItems: 'center' },
  emptyTitle: { fontFamily: typography.family.semibold, fontSize: 16, color: colors.text },
  emptySub: { marginTop: 8, fontFamily: typography.family.regular, fontSize: 12, color: colors.muted },

  pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
});



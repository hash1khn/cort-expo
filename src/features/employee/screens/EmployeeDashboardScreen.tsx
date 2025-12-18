import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, radii, shadows, typography } from '../../../core/theme';
import { useAuthStore } from '../../../core/stores/useAuthStore';
import { activeRide, mockShuttlePolyline, shuttleCoordinates } from '../../../data/mockData';

type Props = {
  onScanPress?: () => void;
  onPreviewSuccessPress?: () => void;
};

export function EmployeeDashboardScreen({ onScanPress, onPreviewSuccessPress }: Props) {
  const user = useAuthStore((s) => s.user);
  const hasPrivateRide = Boolean(user?.hasPrivateRide);

  // Demo: Chauffeur context if user.hasPrivateRide is true
  const activeChauffeurRide = hasPrivateRide ? activeRide : null;

  const routePoints = useMemo(
    () => mockShuttlePolyline.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
    []
  );

  const [busIndex, setBusIndex] = useState(0);
  const busTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    busTimer.current = setInterval(() => {
      setBusIndex((i) => (i + 1) % routePoints.length);
    }, 1200);

    return () => {
      if (busTimer.current) clearInterval(busTimer.current);
      busTimer.current = null;
    };
  }, [routePoints.length]);

  const busCoord = routePoints[Math.min(busIndex, routePoints.length - 1)];

  return (
    <View style={styles.root}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: shuttleCoordinates.latitude,
          longitude: shuttleCoordinates.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        toolbarEnabled={false}
        showsMyLocationButton={false}
        showsUserLocation
      >
        <Polyline coordinates={routePoints} strokeWidth={4} strokeColor="rgba(12, 34, 94, 0.65)" />

        {busCoord ? (
          <Marker coordinate={busCoord} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.busMarker}>
              <MaterialCommunityIcons name="bus" size={18} color={colors.white} />
            </View>
          </Marker>
        ) : null}

        {activeChauffeurRide ? (
          <Marker
            coordinate={{
              latitude: shuttleCoordinates.latitude + 0.0012,
              longitude: shuttleCoordinates.longitude - 0.001,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.carMarker}>
              <MaterialCommunityIcons name="car" size={18} color={colors.white} />
            </View>
          </Marker>
        ) : null}
      </MapView>

      <View pointerEvents="none" style={styles.mapOverlay} />

      <SafeAreaView pointerEvents="box-none" style={styles.safe}>
        <View style={styles.topCard}>
          <Text style={styles.topLabel}>MY SHUTTLE ROUTE</Text>
          <Text style={styles.routeName} numberOfLines={1}>
            Clifton ⇄ Tower Loop
          </Text>
          <Text style={styles.status}>Arriving in 5 min</Text>
        </View>

        {activeChauffeurRide ? (
          <View pointerEvents="box-none" style={styles.sheetWrap}>
            <View style={styles.sheet}>
              <View style={styles.sheetStrip} />
              <View style={styles.sheetBody}>
                <View style={styles.driverAvatar}>
                  <Text style={styles.driverAvatarText}>
                    {(activeChauffeurRide.driver.name ?? 'D').slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.carModel} numberOfLines={1}>
                    {activeChauffeurRide.car.model}
                  </Text>
                  <Text style={styles.plate}>{activeChauffeurRide.car.plate}</Text>
                  <Text style={styles.sheetStatus}>Your Chauffeur is waiting</Text>
                </View>
              </View>
            </View>
          </View>
        ) : null}

        <View pointerEvents="box-none" style={styles.fabWrap}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Scan to board"
            onPress={onScanPress}
            style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          >
            <Ionicons name="camera" size={24} color={colors.white} />
          </Pressable>
          <Text style={styles.fabLabel}>Scan to Board</Text>

          {__DEV__ ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Preview boarding success screen"
              onPress={onPreviewSuccessPress}
              style={({ pressed }) => [styles.previewBtn, pressed && styles.previewBtnPressed]}
            >
              <Text style={styles.previewBtnText}>Preview success</Text>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  map: { ...StyleSheet.absoluteFillObject },
  mapOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.08)' },
  safe: { flex: 1 },

  topCard: {
    position: 'absolute',
    top: 62,
    left: 16,
    right: 16,
    backgroundColor: colors.white,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...shadows.floating,
  },
  topLabel: {
    fontFamily: typography.family.medium,
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.grey,
  },
  routeName: {
    marginTop: 6,
    fontFamily: typography.family.semibold,
    fontSize: 18,
    color: colors.navy,
  },
  status: {
    marginTop: 6,
    fontFamily: typography.family.semibold,
    fontSize: 13,
    color: colors.orange,
  },

  busMarker: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
    ...shadows.floating,
  },
  carMarker: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
    ...shadows.floating,
  },

  sheetWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 12,
    paddingBottom: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    shadowColor: 'rgba(12, 34, 94, 0.22)',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -8 },
    elevation: 10,
  },
  sheetStrip: { width: 4, borderRadius: 10, backgroundColor: colors.purple, marginRight: 12 },
  sheetBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingRight: 6 },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(12, 34, 94, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverAvatarText: { fontFamily: typography.family.semibold, fontSize: 16, color: colors.navy },
  carModel: { fontFamily: typography.family.semibold, fontSize: 14, color: colors.text },
  plate: { marginTop: 2, fontFamily: typography.family.medium, fontSize: 12, color: colors.muted },
  sheetStatus: { marginTop: 6, fontFamily: typography.family.regular, fontSize: 12, color: colors.muted },

  fabWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 18,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 10,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.floating,
  },
  fabPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  fabLabel: { marginTop: 8, fontFamily: typography.family.semibold, fontSize: 12, color: colors.white },

  previewBtn: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(12, 34, 94, 0.18)',
    ...shadows.floating,
  },
  previewBtnPressed: { transform: [{ scale: 0.99 }], opacity: 0.95 },
  previewBtnText: { fontFamily: typography.family.semibold, fontSize: 12, color: colors.navy },
});



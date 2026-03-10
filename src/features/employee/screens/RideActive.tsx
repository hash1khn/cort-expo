import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text as RNText, View, ActivityIndicator, Image } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons, MaterialCommunityIcons, Octicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import Animated, { useSharedValue, useAnimatedStyle, interpolate } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { setIsOutstationDev } from '../store';
import { useRideSocket } from '../../../hooks/useRideSocket';
import { useGetShuttlePolylineQuery, useGetShuttleTripsForEmployeeQuery } from '../services/employeeShuttleApi';
import { fontFamily } from '@/core/theme';
import { useScanBoardingMutation } from '../services/boardingApi';
import { useToast } from '@/shared/ui/molecules/Toast';
import { CustomToast } from '@/features/shared/components/CustomToast';

const Text = (props: React.ComponentProps<typeof RNText>) => {
  return <RNText {...props} style={[{ fontFamily }, props.style]} />;
};

// ── Geometry helpers (from EmployeeHomeMap) ───────────────────────────────────
type LatLng = { latitude: number; longitude: number };

function distanceSq(a: LatLng, b: LatLng): number {
  const dLat = a.latitude - b.latitude;
  const dLng = a.longitude - b.longitude;
  return dLat * dLat + dLng * dLng;
}

/**
 * Returns the index of the point in `points` that is geometrically closest
 * to `target`. Used to snap a stop coordinate onto the polyline.
 */
function findClosestIndex(points: LatLng[], target: LatLng): number {
  if (!points.length) return 0;
  let bestIdx = 0;
  let bestDist = distanceSq(points[0], target);
  for (let i = 1; i < points.length; i += 1) {
    const d = distanceSq(points[i], target);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function calculateHeading(current: LatLng, next: LatLng) {
  const PI = Math.PI;
  const lat1 = (current.latitude * PI) / 180;
  const long1 = (current.longitude * PI) / 180;
  const lat2 = (next.latitude * PI) / 180;
  const long2 = (next.longitude * PI) / 180;

  const dLon = long2 - long1;

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  let brng = Math.atan2(y, x);
  brng = (brng * 180) / PI;
  brng = (brng + 360) % 360;
  return brng;
}

export default function RideActive() {
  const dispatch = useAppDispatch();
  const isWaitingForDriverResponse = useAppSelector(
    (state) => state.employeeRide.isWaitingForDriverResponse,
  );
  const userId = useAppSelector((state) => state.auth.user?.id ?? '');
  const user = useAppSelector((state) => state.auth.user);
  const toast = useToast();

  /**
   * Route params:
   *  - tripId           : the active shuttle trip ID
   *  - myPickupStopId   : the employee's assigned pickup stop ID (from the for-employee API)
   *  - driverName       : driver's full name
   *  - driverPhone      : driver's phone number
   *  - vehicleDisplay   : e.g. "Suzuki Bolan"
   *  - vehiclePlate     : e.g. "ADD-1234"
   */
  const {
    tripId: tripIdParam,
    myPickupStopId: myPickupStopIdParam,
    driverName: driverNameParam,
    driverPhone: driverPhoneParam,
    vehicleDisplay: vehicleDisplayParam,
    vehiclePlate: vehiclePlateParam,
    direction: directionParam,
  } = useLocalSearchParams<{
    tripId?: string;
    myPickupStopId?: string;
    driverName?: string;
    driverPhone?: string;
    vehicleDisplay?: string;
    vehiclePlate?: string;
    direction?: string;
  }>();

  const activeTripId = tripIdParam ? Number(tripIdParam) : 0;
  // Note: myPickupStopId is derived below from the API (crash-resilient) with this as fallback

  // ── Fetch trip data to get route stops ───────────────────────────────────
  const companyId = (user?.company_id ?? 0) as number;
  const employeeId = (user?.id ?? '') as string;
  const { data: shuttleTrips = [], isLoading: isTripsLoading } = useGetShuttleTripsForEmployeeQuery(
    { companyId, employeeId },
    { skip: !companyId || !employeeId },
  );
  const activeTrip = useMemo(
    () => shuttleTrips.find((t) => t.id === activeTripId),
    [shuttleTrips, activeTripId],
  );

  // ── Derive display data from API (source of truth), with route params as fast-path fallback ──
  const apiDriverName = activeTrip?.users?.full_name ?? null;
  const apiDriverPhone = activeTrip?.users?.phone ?? null;
  const apiVehicle = activeTrip?.routes?.vehicles;
  const apiVehicleDisplay = apiVehicle ? `${apiVehicle.make} ${apiVehicle.model}`.trim() : null;
  const apiVehiclePlate = apiVehicle?.plate_number ?? null;

  const driverName = apiDriverName ?? driverNameParam ?? 'Driver';
  const driverPhone = apiDriverPhone ?? driverPhoneParam ?? '';
  const vehicleDisplay = apiVehicleDisplay ?? vehicleDisplayParam ?? '—';
  const vehiclePlate = apiVehiclePlate ?? vehiclePlateParam ?? '—';
  const driverInitials = driverName
    .split(' ')
    .map((n) => n[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // ── myPickupStopId: prefer API (crash resilient) over route param ──────────
  const apiPickupStopId = activeTrip?.my_pickup_stop_id ?? null;
  const myPickupStopId = apiPickupStopId ?? (myPickupStopIdParam ? Number(myPickupStopIdParam) : null);

  /** Route stops for this trip, in sequence order, with valid coordinates */
  const routeStops = useMemo(
    () =>
      (activeTrip?.routes?.route_stops ?? [])
        .filter((s) => s.lat != null && s.lng != null)
        .sort((a, b) => a.sequence_order - b.sequence_order),
    [activeTrip],
  );

  // ── Real-time state ──────────────────────────────────────────────────────
  const [driverCoord, setDriverCoord] = useState<LatLng | null>(null);

  /**
   * socketStopId: the stop ID most recently delivered by the socket.
   * Null until the driver emits a STOP_ARRIVED event after this screen mounts.
   * currentStopId derives from this first, then falls back to the API snapshot.
   */
  const [socketStopId, setSocketStopId] = useState<number | null>(null);
  const currentStopId = socketStopId ?? activeTrip?.current_stop_id ?? null;

  /** True once the driver has arrived at THIS employee's pickup stop */
  const captainIsHere =
    currentStopId !== null && myPickupStopId !== null && currentStopId === myPickupStopId;

  // ── Boarding mutation ─────────────────────────────────────────────────────
  const [scanBoarding, { isLoading: isBoardingLoading, isSuccess: isBoardingSuccess }] =
    useScanBoardingMutation();

  // ── Polyline query (fetched once) ──────────────────
  const { data: polylineData } = useGetShuttlePolylineQuery(
    { tripId: activeTripId },
    { skip: activeTripId === 0 },
  );

  // ── Socket callbacks ──────────────────────────────────────────────────────
  const handleLocationUpdate = useCallback(
    (data: { lat: number; lng: number }) => {
      setDriverCoord({ latitude: data.lat, longitude: data.lng });
    },
    [],
  );

  const handleStopArrived = useCallback(
    (data: { stopId: number; stopName: string; arrivedAt: string }) => {
      setSocketStopId(data.stopId);
    },
    [],
  );

  const handleRideEnded = useCallback(() => {
    const timer = setTimeout(() => router.replace('/employee'), 3000);
    return () => clearTimeout(timer);
  }, []);

  useRideSocket({
    tripId: activeTripId,
    userId,
    role: 'employee',
    onLocationUpdate: handleLocationUpdate,
    onStopArrived: handleStopArrived,
    onRideEnded: handleRideEnded,
  });

  // ── Bottom Sheet refs & animation ─────────────────────────────────────────
  const bottomSheetRef = useRef<BottomSheet>(null);
  const mapRef = useRef<MapView>(null);
  const snapPoints = useMemo(() => ['40%', '55%'], []);
  const animatedIndex = useSharedValue(0);

  // Animate map to the driver's position as soon as the first coordinate arrives.
  // This fixes the stuck-at-Karachi issue with initialRegion being a one-time prop.
  const hasAnimatedToDriver = useRef(false);
  useEffect(() => {
    if (hasAnimatedToDriver.current || !driverCoord) return;
    hasAnimatedToDriver.current = true;
    mapRef.current?.animateToRegion(
      {
        latitude: driverCoord.latitude,
        longitude: driverCoord.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      },
      600,
    );
  }, [driverCoord]);

  // ── Bottom Sheet Snap Logic ───────────────────────────────────────────────
  // Only snap once RTK Query data has resolved — prevents blank/premature sheet states.
  // Snap to index 1 when the driver arrives at THIS employee's stop, back to 0 otherwise.
  useEffect(() => {
    if (isTripsLoading) return; // wait for data before triggering any snap
    if (captainIsHere) {
      bottomSheetRef.current?.snapToIndex(1);
    } else {
      bottomSheetRef.current?.snapToIndex(0);
    }
  }, [captainIsHere, isTripsLoading]);

  // ── Animated profile styles ───────────────────────────────────────────────
  const smallProfileStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(animatedIndex.value, [0, 1], [1, 0], 'clamp'),
      position: 'absolute',
      top: interpolate(animatedIndex.value, [0, 1], [20, 0], 'clamp'),
      left: 0,
      right: 0,
      zIndex: 1,
      pointerEvents: animatedIndex.value < 0.5 ? 'auto' : 'none',
    };
  });

  const bigProfileStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(animatedIndex.value, [0, 1], [0, 1], 'clamp'),
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 2,
      pointerEvents: animatedIndex.value >= 0.5 ? 'auto' : 'none',
    };
  });

  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      height: interpolate(animatedIndex.value, [0, 1], [65, 195], 'clamp'),
    };
  });

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleContactDriver = useCallback(() => {
    if (!driverPhone) return;
    Linking.openURL(`tel:${driverPhone}`).catch((err) =>
      console.warn('Could not open dialer:', err),
    );
  }, [driverPhone]);

  /** Scan QR = POST attendance to the backend. Only active when captain is at my stop. */
  const handleScanQR = useCallback(async () => {
    if (!captainIsHere) {
      router.push('/employee/qr-scanner');
      return;
    }
    if (!activeTripId || !userId) return;

    try {
      await scanBoarding({
        shuttle_trip_id: activeTripId,
        employee_id: userId,
      }).unwrap();
      toast.show(
        <CustomToast
          type="success"
          message="Successfully boarded"
        />,
        { duration: 4000, position: 'top', backgroundColor: '#1ad41d' },
      );
    } catch (err: any) {
      const isTripNotFound: boolean =
        err?.data?.message?.toLowerCase().includes('not found') ||
        err?.status === 404;
      toast.show(
        <CustomToast
          type="error"
          message={isTripNotFound ? 'Trip not found' : 'Failed to board'}
          subMessage={
            isTripNotFound
              ? "We couldn't find an active trip. Please try again."
              : (err?.data?.message ?? 'Could not mark attendance. Please try again.')
          }
        />,
        { duration: 4000, position: 'top', backgroundColor: '#ff4545' },
      );
    }
  }, [captainIsHere, activeTripId, userId, scanBoarding, toast]);

  const handleDevMarkOutstation = useCallback(() => {
    dispatch(setIsOutstationDev(true));
  }, [dispatch]);

  // ── Polyline split: completed (grey) vs remaining (blue) ─────────────────
  /**
   * Full polyline points from the backend, mapped to LatLng.
   */
  const allRoutePoints = useMemo(
    () => polylineData?.points.map((p) => ({ latitude: p.lat, longitude: p.lng })) ?? [],
    [polylineData],
  );

  /**
   * For each route stop, find the index of the closest point on the polyline.
   * This lets us know where on the line each stop sits.
   */
  const stopPolylineIndices = useMemo(() => {
    if (!allRoutePoints.length || !routeStops.length) return [];
    return routeStops.map((stop) =>
      findClosestIndex(allRoutePoints, { latitude: stop.lat!, longitude: stop.lng! }),
    );
  }, [allRoutePoints, routeStops]);

  /**
   * The index of the most-recently-arrived stop on the polyline.
   * `null` means the driver hasn't reached any stop yet.
   */
  const arrivedPolylineIndex = useMemo(() => {
    if (currentStopId === null) return null;
    const arrivedStopIdx = routeStops.findIndex((s) => s.id === currentStopId);
    if (arrivedStopIdx === -1) return null;
    return stopPolylineIndices[arrivedStopIdx] ?? null;
  }, [currentStopId, routeStops, stopPolylineIndices]);

  const currentDriverPolylineIndex = useMemo(() => {
    if (!driverCoord || !allRoutePoints.length) return null;
    return findClosestIndex(allRoutePoints, driverCoord);
  }, [driverCoord, allRoutePoints]);

  const lastHeadingRef = useRef(0);

  const busHeading = useMemo(() => {
    if (!allRoutePoints.length || currentDriverPolylineIndex === null) {
      return lastHeadingRef.current;
    }
    const currentIdx = currentDriverPolylineIndex;
    const current = allRoutePoints[currentIdx];
    // Look ahead a few points for a smoother trajectory
    const lookAheadIndex = Math.min(currentIdx + 3, allRoutePoints.length - 1);
    const next = allRoutePoints[lookAheadIndex];

    if (!current || !next || (current.latitude === next.latitude && current.longitude === next.longitude)) {
      return lastHeadingRef.current;
    }

    const heading = calculateHeading(current, next);

    // Calculate the shortest difference between the new heading and last heading
    let diff = heading - lastHeadingRef.current;
    diff = ((diff + 540) % 360) - 180;

    // Only update heading if the turn is significant
    if (Math.abs(diff) > 2) {
      lastHeadingRef.current = heading;
      return heading;
    }

    return lastHeadingRef.current;
  }, [allRoutePoints, currentDriverPolylineIndex]);

  /**
   * Completed route = polyline from start up to the driver's current position.
   */
  const completedRoute = useMemo(() => {
    if (currentDriverPolylineIndex === null || !allRoutePoints.length) return [];
    return allRoutePoints.slice(0, currentDriverPolylineIndex + 1);
  }, [allRoutePoints, currentDriverPolylineIndex]);

  /**
   * Remaining route = polyline from the current driver position (or start) onwards.
   */
  const remainingRoute = useMemo(() => {
    if (!allRoutePoints.length) return [];
    const fromIdx = currentDriverPolylineIndex !== null ? currentDriverPolylineIndex : 0;
    return allRoutePoints.slice(fromIdx);
  }, [allRoutePoints, currentDriverPolylineIndex]);

  // ── Status text logic ─────────────────────────────────────────────────────
  const statusText =
    directionParam === 'EVENING'
      ? 'Ride in progress'
      : isBoardingSuccess
        ? "Sit tight, you're on the way"
        : captainIsHere
          ? 'Captain is here, please board the shuttle'
          : isWaitingForDriverResponse
            ? 'Waiting for driver...'
            : 'Arriving in 15 min';

  const statusColor = captainIsHere ? '#000' : '#000';

  // ── Scan QR button state ──────────────────────────────────────────────────
  const qrButtonLabel = isBoardingLoading ? 'Scanning...' : 'Scan QR';

  return (
    <View style={styles.root}>
      {/* Map View — uses mapRef to animate to driver position when first coord arrives */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: 24.8607,
          longitude: 67.0104,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        toolbarEnabled={false}
        showsMyLocationButton={false}
        showsUserLocation
      >
        {/* Remaining route Polyline */}
        {remainingRoute.length > 1 && (
          <Polyline
            coordinates={remainingRoute}
            strokeWidth={4}
            strokeColor="#4B5563"
            lineCap="round"
            lineJoin="round"
          />
        )}

        {/* Completed route Polyline (hidden as requested) */}

        {/* Fallback: show full route if no split has happened yet and no completed portion */}
        {completedRoute.length <= 1 && remainingRoute.length <= 1 && allRoutePoints.length > 1 && (
          <Polyline
            coordinates={allRoutePoints}
            strokeWidth={4}
            strokeColor="#4B5563"
            lineCap="round"
            lineJoin="round"
          />
        )}

        {/* Route stop markers */}
        {routeStops.map((stop, index) => {
          const stopPolyIdx = stopPolylineIndices[index];
          const isPassed =
            arrivedPolylineIndex !== null &&
            stopPolyIdx !== undefined &&
            stopPolyIdx <= arrivedPolylineIndex;
          const isMyStop = stop.id === myPickupStopId;
          const isCurrentStop = stop.id === currentStopId;

          return (
            <Marker
              key={`stop-${stop.id}`}
              coordinate={{ latitude: stop.lat!, longitude: stop.lng! }}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View
                style={[
                  styles.stopMarker,
                  isPassed && styles.stopMarkerPassed,
                  isMyStop && styles.stopMarkerMine,
                  isCurrentStop && styles.stopMarkerCurrent,
                ]}
              >
                <MaterialCommunityIcons
                  name="map-marker"
                  size={16}
                  color={isPassed ? '#9CA3AF' : isCurrentStop ? '#FFFFFF' : isMyStop ? '#F1F443' : '#FFFFFF'}
                />
              </View>
            </Marker>
          );
        })}

        {/* Shuttle marker — flat with rotation on the Marker itself (no inner View transform) */}
        <Marker
          coordinate={driverCoord ?? { latitude: 24.8607, longitude: 67.0104 }}
          anchor={{ x: 0.5, y: 0.5 }}
          flat={true}
          rotation={busHeading}
          style={{ zIndex: 100 }}
        >
          <Image
            source={require('../../../../assets/car_birdeye.png')}
            style={{ width: 60, height: 60, resizeMode: 'contain' }}
          />
        </Marker>
      </MapView>

      {/* Floating back button */}
      <View style={styles.floatingButtons}>
        <Pressable style={styles.floatingBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </Pressable>
      </View>

      {/* Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        animatedIndex={animatedIndex}
        snapPoints={snapPoints}
        enablePanDownToClose={false}
        handleIndicatorStyle={styles.sheetHandle}
        backgroundStyle={styles.sheetBackground}
      >
        <BottomSheetView style={styles.sheetContent}>
          {/* Status / ETA header */}
          <View style={styles.statusContainer}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusText}
            </Text>
          </View>
          <View style={styles.divider} />

          {/* Crossfade profile section */}
          <Animated.View style={animatedContainerStyle}>
            {/* 1) Small/Horizontal Layout (visible at 40%) */}
            <Animated.View style={smallProfileStyle}>
              <View style={styles.driverRow}>
                <View style={styles.captainSection}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarInitials}>{driverInitials}</Text>
                  </View>
                  <View style={styles.captainInfoBox}>
                    <Text style={styles.captainRole}>{vehicleDisplay}</Text>
                    <Text style={styles.captainName}>{driverName}</Text>
                  </View>
                </View>

                <View style={styles.plateContainer}>
                  <Text style={styles.plateText}>{vehiclePlate}</Text>
                </View>
              </View>
            </Animated.View>

            {/* 2) Big/Centered Layout (visible at 55%) */}
            <Animated.View style={bigProfileStyle}>
              <View style={styles.captainCenterSection}>
                <Text style={styles.captainRoleLabel}>YOUR CAPTAIN</Text>

                <View style={styles.avatarCircleBig}>
                  <Text style={styles.avatarInitialsBig}>{driverInitials}</Text>
                </View>

                <Text style={styles.captainNameBig}>{driverName}</Text>

                <View style={styles.vehicleInfoRow}>
                  <Text style={styles.vehicleText}>{vehicleDisplay}</Text>
                  <View style={styles.dotSeparator} />
                  <View style={styles.plateContainerSmall}>
                    <Text style={styles.plateTextSmall}>{vehiclePlate}</Text>
                  </View>
                </View>
              </View>
            </Animated.View>
          </Animated.View>

          <View style={[styles.divider, { marginTop: 30, marginBottom: 4 }]} />

          {/* Action buttons row */}
          <View style={styles.threeActionsRow}>
            <Pressable style={styles.iconActionBtn} onPress={handleContactDriver}>
              <Ionicons name="call-outline" size={20} color="#141414" />
              <Text style={styles.iconActionText}>Call driver</Text>
            </Pressable>

            <Pressable style={styles.iconActionBtn}>
              <Octicons name="share" size={20} color="black" />
              <Text style={styles.iconActionText}>Share ride</Text>
            </Pressable>

            {/* Scan QR — visible only while not yet boarded (and NOT on return trips) */}
            {!isBoardingSuccess && captainIsHere && directionParam !== 'EVENING' && (
              <Pressable
                style={styles.iconActionBtn}
                onPress={handleScanQR}
                disabled={isBoardingLoading}
              >
                {isBoardingLoading ? (
                  <ActivityIndicator size="small" color="#141414" />
                ) : (
                  <Ionicons name="qr-code-outline" size={20} color="#141414" />
                )}
                <Text style={styles.iconActionText}>{qrButtonLabel}</Text>
              </Pressable>
            )}
          </View>

          <View style={{ height: 40 }} />
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F1F1E9',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  vehicleMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0C225E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  // Stop markers — base style + modifiers
  stopMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#0C225E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  /** Stop the bus already passed — greyed out */
  stopMarkerPassed: {
    backgroundColor: '#D1D5DB',
    borderColor: '#9CA3AF',
  },
  /** The logged-in employee's pickup stop — highlighted yellow */
  stopMarkerMine: {
    backgroundColor: '#0C225E',
    borderColor: '#F1F443',
    borderWidth: 3,
  },
  /** The stop the driver is currently at — bright green pulse ring */
  stopMarkerCurrent: {
    backgroundColor: '#16a34a',
    borderColor: '#FFFFFF',
    borderWidth: 3,
  },
  floatingButtons: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
  },
  floatingBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sheetBackground: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  sheetHandle: {
    backgroundColor: '#D1D5DB',
    width: 48,
    height: 5,
    borderRadius: 3,
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  statusContainer: {
    marginTop: 4,
    marginBottom: 16,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 16,
  },
  // SMALL LAYOUT
  driverRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  captainSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  captainInfoBox: {
    justifyContent: 'center',
    gap: 2,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F1F443',
  },
  captainRole: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  captainName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
    letterSpacing: -0.2,
  },
  plateContainer: {
    backgroundColor: '#EAEAEA',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  plateText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000',
  },
  // BIG LAYOUT
  captainCenterSection: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  captainRoleLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  avatarCircleBig: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarInitialsBig: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F1F443',
  },
  captainNameBig: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000',
    letterSpacing: -0.3,
  },
  vehicleInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  vehicleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  dotSeparator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#9CA3AF',
  },
  plateContainerSmall: {
    backgroundColor: '#EAEAEA',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  plateTextSmall: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000',
  },
  threeActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: 8,
  },
  iconActionBtn: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
  },
  iconActionBtnActive: {
    backgroundColor: '#0C225E',
  },
  iconActionBtnSuccess: {
    backgroundColor: '#16a34a',
  },
  iconActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#141414',
  },
});
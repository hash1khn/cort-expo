import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text as RNText, View, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons, MaterialCommunityIcons, Octicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import Animated, { useSharedValue, useAnimatedStyle, interpolate } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { setIsOutstationDev } from '../store';
import { useRideSocket } from '../../../hooks/useRideSocket';
import { useGetShuttlePolylineQuery } from '../services/employeeShuttleApi';
import { fontFamily } from '@/core/theme';
import { useScanBoardingMutation } from '../services/boardingApi';
import { useToast } from '@/shared/ui/molecules/Toast';
import { CustomToast } from '@/features/shared/components/CustomToast';

const Text = (props: React.ComponentProps<typeof RNText>) => {
  return <RNText {...props} style={[{ fontFamily }, props.style]} />;
};


export default function RideActive() {
  const dispatch = useAppDispatch();
  const isWaitingForDriverResponse = useAppSelector(
    (state) => state.employeeRide.isWaitingForDriverResponse,
  );
  const userId = useAppSelector((state) => state.auth.user?.id ?? '');
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
  const myPickupStopId = myPickupStopIdParam ? Number(myPickupStopIdParam) : null;

  // Derive initials from driverName param
  const driverName = driverNameParam ?? 'Driver';
  const driverPhone = driverPhoneParam ?? '';
  const vehicleDisplay = vehicleDisplayParam ?? '—';
  const vehiclePlate = vehiclePlateParam ?? '—';
  const driverInitials = driverName
    .split(' ')
    .map((n) => n[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // ── Real-time state ──────────────────────────────────────────────────────
  const [driverCoord, setDriverCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const [polylineOrigin, setPolylineOrigin] = useState<{ lat: number; lng: number } | undefined>(undefined);

  /**
   * currentStopId: the stop ID the driver has most recently arrived at.
   * Set by the `stop:arrived` WebSocket event.
   */
  const [currentStopId, setCurrentStopId] = useState<number | null>(null);

  /** True once the driver has arrived at THIS employee's pickup stop */
  const captainIsHere = currentStopId !== null && myPickupStopId !== null && currentStopId === myPickupStopId;

  // ── Boarding mutation ─────────────────────────────────────────────────────
  const [scanBoarding, { isLoading: isBoardingLoading, isSuccess: isBoardingSuccess }] =
    useScanBoardingMutation();

  // ── Polyline query (re-fetches when driver moves ~50m) ──────────────────
  const { data: polylineData } = useGetShuttlePolylineQuery(
    { tripId: activeTripId, driverLat: polylineOrigin?.lat, driverLng: polylineOrigin?.lng },
    { skip: activeTripId === 0 },
  );

  // ── Socket callbacks ──────────────────────────────────────────────────────
  const handleLocationUpdate = useCallback(
    (data: { lat: number; lng: number }) => {
      setDriverCoord({ latitude: data.lat, longitude: data.lng });
      // Re-fetch polyline with updated driver position; throttled by ~50m threshold
      setPolylineOrigin((prev) => {
        if (!prev) return { lat: data.lat, lng: data.lng };
        const deltaLat = Math.abs(data.lat - prev.lat);
        const deltaLng = Math.abs(data.lng - prev.lng);
        // ~50m threshold (0.00045 degrees ≈ 50m)
        if (deltaLat > 0.00045 || deltaLng > 0.00045) {
          return { lat: data.lat, lng: data.lng };
        }
        return prev;
      });
    },
    [],
  );

  const handleStopArrived = useCallback(
    (data: { stopId: number; stopName: string; arrivedAt: string }) => {
      setCurrentStopId(data.stopId);
    },
    [],
  );

  const handleRideEnded = useCallback(() => {
    // Alert.alert('Ride Completed', 'Your ride has ended.', [
    //   { text: 'OK', onPress: () => router.replace('/employee') },
    // ]);

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

  // ── Bottom Sheet Snap Logic ───────────────────────────────────────────
  useEffect(() => {
    if (captainIsHere) {
      bottomSheetRef.current?.snapToIndex(1);
    } else {
      bottomSheetRef.current?.snapToIndex(0);
    }
  }, [captainIsHere]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['40%', '55%'], []);
  const animatedIndex = useSharedValue(0);

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

  const handleContactDriver = useCallback(() => {
    if (!driverPhone) return;
    Linking.openURL(`tel:${driverPhone}`).catch((err) =>
      console.warn('Could not open dialer:', err),
    );
  }, [driverPhone]);

  /** Scan QR = POST attendance to the backend. Only active when captain is at my stop. */
  const handleScanQR = useCallback(async () => {
    if (!captainIsHere) {
      // Driver not at this stop yet — navigate to QR scanner as fallback
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
        // subMessage="Your attendance has been marked. Have a safe trip!"
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

  const routePoints = useMemo(
    () => polylineData?.points.map((p) => ({ latitude: p.lat, longitude: p.lng })) ?? [],
    [polylineData],
  );

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
      {/* Map View */}
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: driverCoord?.latitude ?? 24.8607,
          longitude: driverCoord?.longitude ?? 67.0104,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        toolbarEnabled={false}
        showsMyLocationButton={false}
        showsUserLocation
      >
        {/* Route Polyline */}
        <Polyline
          coordinates={routePoints}
          strokeWidth={4}
          strokeColor="#0C225E"
          lineCap="round"
          lineJoin="round"
        />

        {/* Live Driver to First Route Point Polyline */}
        {driverCoord && routePoints.length > 0 && (
          <Polyline
            coordinates={[driverCoord, routePoints[0]]}
            strokeWidth={4}
            strokeColor="#16a34a"
            lineCap="round"
          />
        )}

        {/* Shuttle Marker — real-time position from WebSocket */}
        <Marker
          coordinate={driverCoord ?? { latitude: 24.8607, longitude: 67.0104 }}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View style={styles.vehicleMarker}>
            <MaterialCommunityIcons name="bus-side" size={22} color="white" />
          </View>
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

            {/* 2) Big/Centered Layout (visible at 48%) */}
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
    elevation: 10
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
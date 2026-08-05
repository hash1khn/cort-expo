import React, { useCallback, useEffect, useMemo, useRef, useState, } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text as RNText, View, ActivityIndicator, Image, Dimensions, Share } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import MapView, { Marker, MarkerAnimated, AnimatedRegion, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Ionicons from "@react-native-vector-icons/ionicons/static";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import Octicons from "@react-native-vector-icons/octicons/static";
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import Animated, { useSharedValue, useAnimatedStyle, interpolate, useDerivedValue } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { setIsOutstationDev } from '../store';
import { useRideSocket, EtaUpdatePayload } from '../../../hooks/useRideSocket';
import { useChauffeurSocket } from '../../../hooks/useChauffeurSocket';
import { useEtaCountdown } from '../../../hooks/useEtaCountdown';
import { employeeShuttleApi, useGetShuttlePolylineQuery, useGetShuttleTripsForEmployeeQuery } from '../services/employeeShuttleApi';
import { bookingsApi, useGetEmployeeActiveChauffeurBookingQuery, useGetChauffeurRoutePolylineQuery } from '../services/bookingsApi';
import { fontFamily } from '@/core/theme';
import { useScanBoardingMutation } from '../services/boardingApi';
import { useToast } from '@/shared/ui/molecules/Toast';
import { CustomToast } from '@/features/shared/components/CustomToast';
import { useRefetchOnReconnect } from '@/hooks/useRefetchOnReconnect';
import { useLanguage } from '@/i18n/useLanguage';
import { buildRtlPromoTextStyle } from '@/i18n/types';

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

// Flat-earth distance in metres between two lat/lng points (accurate under ~5 km).
function flatEarthMeters(a: LatLng, b: LatLng): number {
  const dLat = (a.latitude - b.latitude) * 111_320;
  const dLng = (a.longitude - b.longitude) * 111_320 * Math.cos((a.latitude * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

// Minimum distance in metres from `driver` to the closest point on any segment of `polyline`.
function getDistanceToPolylineMeters(driver: LatLng, polyline: LatLng[]): number {
  if (polyline.length === 0) return Infinity;
  if (polyline.length === 1) return flatEarthMeters(driver, polyline[0]!);

  let minDist = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const a = polyline[i]!;
    const b = polyline[i + 1]!;
    // Project driver onto segment ab, clamped to [0,1].
    const abLat = b.latitude - a.latitude;
    const abLng = b.longitude - a.longitude;
    const abLenSq = abLat * abLat + abLng * abLng;
    let t = 0;
    if (abLenSq > 0) {
      t = ((driver.latitude - a.latitude) * abLat + (driver.longitude - a.longitude) * abLng) / abLenSq;
      t = Math.max(0, Math.min(1, t));
    }
    const closest: LatLng = { latitude: a.latitude + t * abLat, longitude: a.longitude + t * abLng };
    minDist = Math.min(minDist, flatEarthMeters(driver, closest));
  }
  return minDist;
}

const OFF_ROUTE_THRESHOLD_M = 200;
const CLIENT_COOLDOWN_MS = 65_000;

// ── Screen height for animatedPosition thresholds ────────────────────────────
const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function RideActive() {
  const dispatch = useAppDispatch();
  const isWaitingForDriverResponse = useAppSelector(
    (state) => state.employeeRide.isWaitingForDriverResponse,
  );
  const userId = useAppSelector((state) => state.auth.user?.id ?? '');
  const user = useAppSelector((state) => state.auth.user);
  const toast = useToast();
  const { t, isRTL, language } = useLanguage();
  const te = (key: string, options?: Record<string, unknown>) =>
    t(`employee:${key}`, options);

  const {
    tripId: tripIdParam,
    myPickupStopId: myPickupStopIdParam,
    driverName: driverNameParam,
    driverPhone: driverPhoneParam,
    vehicleDisplay: vehicleDisplayParam,
    vehiclePlate: vehiclePlateParam,
    direction: directionParam,
    mode: modeParam,
    bookingId: bookingIdParam,
    bookingStatus: bookingStatusParam,
  } = useLocalSearchParams<{
    tripId?: string;
    myPickupStopId?: string;
    driverName?: string;
    driverPhone?: string;
    vehicleDisplay?: string;
    vehiclePlate?: string;
    direction?: string;
    mode?: 'shuttle' | 'chauffeur';
    bookingId?: string;
    bookingStatus?: string;
  }>();

  const mode = modeParam ?? 'shuttle';
  const isChauffeurMode = mode === 'chauffeur';
  const activeChauffeurBookingId = bookingIdParam ? Number(bookingIdParam) : 0;

  const activeTripId = tripIdParam ? Number(tripIdParam) : 0;

  // ── Fetch trip data — Shuttle or Chauffeur ───────────────────────────────
  const companyId = (user?.company_id ?? 0) as number;
  const employeeId = (user?.id ?? '') as string;

  const { data: shuttleTrips = [], isLoading: isTripsLoading, refetch: refetchShuttleTrips } = useGetShuttleTripsForEmployeeQuery(
    { companyId, employeeId },
    { skip: !companyId || !employeeId || isChauffeurMode },
  );
  const activeTrip = useMemo(
    () => shuttleTrips.find((t) => t.id === activeTripId),
    [shuttleTrips, activeTripId],
  );

  const { data: activeChauffeurBooking, isLoading: isChauffeurLoading, refetch: refetchActiveChauffeurBooking } =
    useGetEmployeeActiveChauffeurBookingQuery(
      { companyId },
      { skip: !companyId || !isChauffeurMode },
    );

  useRefetchOnReconnect(refetchShuttleTrips, refetchActiveChauffeurBooking);

  const isDataLoading = isChauffeurMode ? isChauffeurLoading : isTripsLoading;

  // ── Derive display data ───────────────────────────────────────────────────
  const apiDriverName = isChauffeurMode
    ? (activeChauffeurBooking?.users_chauffeur_bookings_driver_idTousers?.full_name ?? null)
    : (activeTrip?.users?.full_name ?? null);
  const apiDriverPhone = isChauffeurMode
    ? (activeChauffeurBooking?.users_chauffeur_bookings_driver_idTousers?.phone ?? null)
    : (activeTrip?.users?.phone ?? null);
  const driverPictureUrl = isChauffeurMode
    ? (activeChauffeurBooking?.users_chauffeur_bookings_driver_idTousers?.profile_picture_url ?? null)
    : (activeTrip?.users?.profile_picture_url ?? null);
  const apiVehicle = isChauffeurMode ? activeChauffeurBooking?.vehicles : activeTrip?.routes?.vehicles;
  const apiVehicleDisplay = apiVehicle ? `${(apiVehicle as any).make ?? ''} ${(apiVehicle as any).model ?? ''}`.trim() : null;
  const apiVehiclePlate = isChauffeurMode
    ? (activeChauffeurBooking?.vehicles?.plate_number ?? null)
    : (activeTrip?.routes?.vehicles?.plate_number ?? null);

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

  // ── myPickupStopId ────────────────────────────────────────────────────────
  const apiPickupStopId = activeTrip?.my_pickup_stop_id ?? null;
  const myPickupStopId = apiPickupStopId ?? (myPickupStopIdParam ? Number(myPickupStopIdParam) : null);

  const routeStops = useMemo(
    () =>
      (activeTrip?.routes?.route_stops ?? [])
        .filter((s) => s.lat != null && s.lng != null)
        .sort((a, b) => a.sequence_order - b.sequence_order),
    [activeTrip],
  );

  // ── Chauffeur live status ─────────────────────────────────────────────────
  const [chauffeurStatus, setChauffeurStatus] = useState<string>(
    bookingStatusParam ?? activeChauffeurBooking?.status ?? 'OTW',
  );
  const STATUS_ORDER = ['ASSIGNED', 'OTW', 'ARRIVED', 'IN_PROGRESS', 'DROPPED_OFF', 'ENDED', 'COMPLETED'];
  const chauffeurStatusRef = React.useRef(chauffeurStatus);
  useEffect(() => { chauffeurStatusRef.current = chauffeurStatus; }, [chauffeurStatus]);
  useEffect(() => {
    if (!activeChauffeurBooking?.status) return;
    const apiStatus = activeChauffeurBooking.status;
    const currentIdx = STATUS_ORDER.indexOf(chauffeurStatusRef.current);
    const apiIdx = STATUS_ORDER.indexOf(apiStatus);
    if (apiIdx > currentIdx) {
      setChauffeurStatus(apiStatus);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChauffeurBooking?.status]);

  // ── Real-time state ───────────────────────────────────────────────────────
  const [driverCoord, setDriverCoord] = useState<LatLng | null>(null);
  const [socketStopId, setSocketStopId] = useState<number | null>(null);
  const [socketStopStatus, setSocketStopStatus] = useState<'AT_STOP' | 'EN_ROUTE' | null>(null);
  const [isCallingDriver, setIsCallingDriver] = useState(false);
  const [isSharingRide, setIsSharingRide] = useState(false);

  // ── ETA state ─────────────────────────────────────────────────────────────
  const [etaSnapshot, setEtaSnapshot] = useState<{ etaMinutes: number; calculatedAt: string } | null>(null);
  const displayEtaMinutes = useEtaCountdown(etaSnapshot);

  // ── Off-route / recalculation state ──────────────────────────────────────
  const [recalcParams, setRecalcParams] = useState<{ driverLat: number; driverLng: number } | undefined>(undefined);
  const lastRecalcTimeRef = useRef<number>(0);
  // True when the driver manually marked this employee as present from the attendance sheet
  const [isDriverMarkedPresent, setIsDriverMarkedPresent] = useState(false);
  const currentStopId = socketStopId ?? activeTrip?.current_stop_id ?? null;
  const currentStopStatus = socketStopStatus ?? activeTrip?.current_stop_status ?? 'EN_ROUTE';

  // Refs so stale socket callbacks can read the latest values without being
  // re-created (which would cause useRideSocket to re-subscribe).
  const myPickupStopIdRef = useRef(myPickupStopId);
  useEffect(() => { myPickupStopIdRef.current = myPickupStopId; }, [myPickupStopId]);
  const socketStopIdRef = useRef<number | null>(null);
  // Tracks boarded state for use inside memoized socket callbacks
  const isBoardedRef = useRef(false);

  const captainIsHere =
    currentStopId !== null &&
    myPickupStopId !== null &&
    currentStopId === myPickupStopId &&
    currentStopStatus === 'AT_STOP';

  // ── Boarding mutation ─────────────────────────────────────────────────────
  const [scanBoarding, { isLoading: isBoardingLoading, isSuccess: isBoardingSuccess }] =
    useScanBoardingMutation();

  // ── Polyline query ────────────────────────────────────────────────────────
  const { data: polylineData } = useGetShuttlePolylineQuery(
    { tripId: activeTripId, ...recalcParams },
    { skip: activeTripId === 0 || isChauffeurMode },
  );

  const { data: chauffeurPolylineData } = useGetChauffeurRoutePolylineQuery(
    { companyId: companyId as number, bookingId: activeChauffeurBookingId, ...recalcParams },
    { skip: !isChauffeurMode || !activeChauffeurBookingId || !companyId || chauffeurStatus !== 'OTW' },
  );

  // ── Polyline invalidation callbacks (triggered by socket events) ─────────
  const handleShuttlePolylineUpdated = useCallback(() => {
    dispatch(employeeShuttleApi.util.invalidateTags([{ type: 'ShuttlePolyline', id: activeTripId }]));
  }, [dispatch, activeTripId]);

  const handleChauffeurPolylineUpdated = useCallback(() => {
    dispatch(bookingsApi.util.invalidateTags([{ type: 'ChauffeurPolyline', id: activeChauffeurBookingId }]));
  }, [dispatch, activeChauffeurBookingId]);

  // ── Socket callbacks ──────────────────────────────────────────────────────
  const handleLocationUpdate = useCallback(
    (data: { lat: number; lng: number }) => {
      setDriverCoord({ latitude: data.lat, longitude: data.lng });
    },
    [],
  );

  const handleStopArrived = useCallback(
    (data: { stopId: number; stopName: string; arrivedAt: string }) => {
      socketStopIdRef.current = data.stopId;
      setSocketStopId(data.stopId);
      setSocketStopStatus('AT_STOP');
    },
    [],
  );

  const handleRideProceeding = useCallback(
    (_data: { nextStopId: number | null; nextStopName: string | null; departedAt: string }) => {
      // If the employee is already boarded (self-scanned QR or driver marked present),
      // allow the sheet to collapse immediately when the driver proceeds.
      if (isBoardedRef.current) {
        setSocketStopStatus('EN_ROUTE');
        return;
      }
      // The backend emits ride:proceeding immediately after stop:arrived (to
      // announce the next stop). If the driver just arrived at THIS employee's
      // pickup stop and the employee hasn't boarded yet, do NOT reset to
      // EN_ROUTE — the employee still needs to board and scan the QR code.
      if (
        myPickupStopIdRef.current !== null &&
        socketStopIdRef.current === myPickupStopIdRef.current
      ) {
        return;
      }
      setSocketStopStatus('EN_ROUTE');
    },
    [],
  );

  // Bug A fix: listen for driver-initiated attendance marks so the QR button
  // hides immediately on the employee's screen when the driver ticks present.
  const handleAttendanceMarked = useCallback(
    (data: { employeeId: string; markedBy: 'self' | 'driver' }) => {
      if (data.employeeId === userId && data.markedBy === 'driver') {
        isBoardedRef.current = true;
        setIsDriverMarkedPresent(true);
      }
    },
    [userId],
  );

  const handleRideEnded = useCallback(() => {
    const timer = setTimeout(
      () =>
        router.replace({
          pathname: '/employee',
          params: { refreshToken: String(Date.now()) },
        }),
      3000,
    );
    return () => clearTimeout(timer);
  }, []);

  const handleEtaUpdate = useCallback((data: EtaUpdatePayload) => {
    setEtaSnapshot({ etaMinutes: data.etaMinutes, calculatedAt: data.calculatedAt });
  }, []);

  useRideSocket({
    tripId: activeTripId,
    userId,
    role: 'employee',
    tripType: 'shuttle',
    onLocationUpdate: isChauffeurMode ? undefined : handleLocationUpdate,
    onStopArrived: isChauffeurMode ? undefined : handleStopArrived,
    onRideProceeding: isChauffeurMode ? undefined : handleRideProceeding,
    onAttendanceMarked: isChauffeurMode ? undefined : handleAttendanceMarked,
    onRideEnded: isChauffeurMode ? undefined : handleRideEnded,
    onPolylineUpdated: isChauffeurMode ? undefined : handleShuttlePolylineUpdated,
    onEtaUpdate: isChauffeurMode ? undefined : handleEtaUpdate,
  });

  useChauffeurSocket({
    bookingId: isChauffeurMode ? activeChauffeurBookingId : 0,
    userId,
    onLocationUpdate: isChauffeurMode ? handleLocationUpdate : undefined,
    onStatusChange: isChauffeurMode
      ? (data) => {
          setChauffeurStatus(data.status);
          if (data.status === 'DROPPED_OFF' || data.status === 'ENDED') {
            handleRideEnded();
          }
        }
      : undefined,
    onRideEnded: isChauffeurMode ? handleRideEnded : undefined,
    onPolylineUpdated: isChauffeurMode ? handleChauffeurPolylineUpdated : undefined,
    onEtaUpdate: isChauffeurMode ? handleEtaUpdate : undefined,
  });

  // ── Bottom Sheet refs ─────────────────────────────────────────────────────
  const bottomSheetRef = useRef<BottomSheet>(null);
  const mapRef = useRef<MapView>(null);
  // Android: driven imperatively via ref (confirmed working — animateMarkerToCoordinate
  // is dispatched as a native command, bypassing the Fabric prop-diffing bug).
  const carMarkerRef = useRef<React.ElementRef<typeof Marker>>(null);
  // iOS: react-native-maps' own docs only show animateMarkerToCoordinate for Android;
  // on iOS it throws "No command found with name animateMarkerToCoordinate" under the
  // Fabric Interop Layer (github.com/react-native-maps/react-native-maps/issues/5284).
  // iOS instead needs MarkerAnimated + AnimatedRegion.timing(), the pattern react-native-maps'
  // README documents for iOS specifically.
  //
  // Created lazily (via useState, not useRef) so it never exists with a wrong
  // placeholder coordinate — it's only constructed once displayDriverCoord has
  // a real value, already positioned correctly on the very first render that
  // mounts <MarkerAnimated>. Mutated in place afterward for subsequent updates.
  const [animatedDriverRegion, setAnimatedDriverRegion] = useState<AnimatedRegion | null>(null);
  const snapPoints = useMemo(() => ['35%', '55%'], []);

  // ── ANIMATION FIX ─────────────────────────────────────────────────────────
  // Use animatedPosition (continuous pixel value) instead of animatedIndex (snappy integer).
  // This gives us a smooth, gesture-driven value we can interpolate against every frame.
  const animatedPosition = useSharedValue(0);

  // Derive a normalized 0→1 progress from the sheet's pixel position.
  //   - animatedPosition = distance in px from the top of the screen to the sheet's top edge.
  //   - At snap 0 (40% sheet height): sheet top ≈ SCREEN_HEIGHT * 0.60  → progress = 0
  //   - At snap 1 (55% sheet height): sheet top ≈ SCREEN_HEIGHT * 0.45  → progress = 1
  // 'clamp' ensures values outside the range don't bleed.
  const sheetProgress = useDerivedValue(() => {
    const closedY = SCREEN_HEIGHT * 0.60;
    const openY   = SCREEN_HEIGHT * 0.45;
    return interpolate(animatedPosition.value, [openY, closedY], [1, 0], 'clamp');
  });

  // Small/horizontal layout — fades out in the first 45% of the drag.
  // translateY adds a subtle lift so the exit feels physical.
  // zIndex ensures this layer sits on top only when it's the active one.
  const smallProfileStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sheetProgress.value, [0, 0.45], [1, 0], 'clamp'),
    transform: [{ translateY: interpolate(sheetProgress.value, [0, 1], [0, -8], 'clamp') }],
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    zIndex: sheetProgress.value < 0.5 ? 2 : 0,
  }));

  // Big/centered layout — fades in after the small one has already faded out (0.45→1).
  // Staggering the ranges means there's never a moment where both are fully visible.
  // translateY adds a subtle settle-in from slightly below.
  const bigProfileStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sheetProgress.value, [0.45, 1], [0, 1], 'clamp'),
    transform: [{ translateY: interpolate(sheetProgress.value, [0, 1], [10, 0], 'clamp') }],
    position: 'absolute',
    top: 14,
    left: 0,
    right: 0,
    zIndex: sheetProgress.value >= 0.5 ? 2 : 0,
  }));

  // Container height interpolates smoothly alongside the crossfade.
  const animatedContainerStyle = useAnimatedStyle(() => ({
    height: interpolate(sheetProgress.value, [0, 1], [65, 195], 'clamp'),
  }));
  // ── END ANIMATION FIX ─────────────────────────────────────────────────────

  // ── Polyline split ────────────────────────────────────────────────────────
  // Declared before the map-fit effects so allRoutePoints is in scope.
  const allRoutePoints = useMemo(() => {
    if (isChauffeurMode) {
      if (!chauffeurPolylineData?.points) return [];
      return chauffeurPolylineData.points.map((p) => ({
        latitude: p.lat,
        longitude: p.lng,
      }));
    }
    return polylineData?.points.map((p) => ({ latitude: p.lat, longitude: p.lng })) ?? [];
  }, [polylineData, chauffeurPolylineData, isChauffeurMode]);

  const stopPolylineIndices = useMemo(() => {
    if (!allRoutePoints.length || !routeStops.length) return [];
    return routeStops.map((stop) =>
      findClosestIndex(allRoutePoints, { latitude: stop.lat!, longitude: stop.lng! }),
    );
  }, [allRoutePoints, routeStops]);

  const arrivedPolylineIndex = useMemo(() => {
    if (currentStopId === null) return null;
    const arrivedStopIdx = routeStops.findIndex((s) => s.id === currentStopId);
    if (arrivedStopIdx === -1) return null;
    return stopPolylineIndices[arrivedStopIdx] ?? null;
  }, [currentStopId, routeStops, stopPolylineIndices]);

  // Use the live socket coord when available; fall back to allRoutePoints[0] which is
  // the driver's GPS position at the moment they tapped "Start Trip". This gives a
  // reasonable car position on a cold launch before the first socket emission arrives.
  const displayDriverCoord: LatLng | null =
    driverCoord ?? (allRoutePoints.length > 0 ? allRoutePoints[0]! : null);

  const currentDriverPolylineIndex = useMemo(() => {
    if (!displayDriverCoord || !allRoutePoints.length) return null;
    return findClosestIndex(allRoutePoints, displayDriverCoord);
  }, [displayDriverCoord, allRoutePoints]);

  const lastHeadingRef = useRef(0);

  const busHeading = useMemo(() => {
    if (!allRoutePoints.length || currentDriverPolylineIndex === null) {
      return lastHeadingRef.current;
    }
    const currentIdx = currentDriverPolylineIndex;
    const current = allRoutePoints[currentIdx];
    const lookAheadIndex = Math.min(currentIdx + 3, allRoutePoints.length - 1);
    const next = allRoutePoints[lookAheadIndex];

    if (!current || !next || (current.latitude === next.latitude && current.longitude === next.longitude)) {
      return lastHeadingRef.current;
    }

    const heading = calculateHeading(current, next);
    let diff = heading - lastHeadingRef.current;
    diff = ((diff + 540) % 360) - 180;

    if (Math.abs(diff) > 2) {
      lastHeadingRef.current = heading;
      return heading;
    }

    return lastHeadingRef.current;
  }, [allRoutePoints, currentDriverPolylineIndex]);

  // react-native-maps' declarative `coordinate` prop on <Marker> can silently
  // fail to move the marker on real devices (works fine in the Simulator) — a
  // known Fabric Interop Layer limitation for markers with custom child views
  // (github.com/react-native-maps/react-native-maps/discussions/5355). The fix
  // is platform-specific, matching react-native-maps' own README example:
  //  - Android: imperative animateMarkerToCoordinate via ref.
  //  - iOS: MarkerAnimated + AnimatedRegion.timing() (animateMarkerToCoordinate
  //    throws "No command found" on iOS under Fabric — issue #5284).
  useEffect(() => {
    if (!displayDriverCoord) return;

    // First value we ever get (cold-launch fallback or first socket emission):
    // construct the AnimatedRegion already at the correct coordinate — it never
    // exists at a wrong placeholder, so <MarkerAnimated> is correctly positioned
    // the instant it first mounts, same frame as the polyline.
    if (!animatedDriverRegion) {
      setAnimatedDriverRegion(
        new AnimatedRegion({
          latitude: displayDriverCoord.latitude,
          longitude: displayDriverCoord.longitude,
          latitudeDelta: 0,
          longitudeDelta: 0,
        }),
      );
      return;
    }

    // Subsequent real updates only — animate smoothly to the new position.
    if (!driverCoord) return;
    if (Platform.OS === 'android') {
      carMarkerRef.current?.animateMarkerToCoordinate(driverCoord, 500);
    } else {
      animatedDriverRegion
        .timing({
          latitude: driverCoord.latitude,
          longitude: driverCoord.longitude,
          duration: 500,
          useNativeDriver: false,
        } as Parameters<typeof animatedDriverRegion.timing>[0])
        .start();
    }
  }, [displayDriverCoord, driverCoord, animatedDriverRegion]);

  const completedRoute = useMemo(() => {
    if (currentDriverPolylineIndex === null || !allRoutePoints.length) return [];
    return allRoutePoints.slice(0, currentDriverPolylineIndex + 1);
  }, [allRoutePoints, currentDriverPolylineIndex]);

  const remainingRoute = useMemo(() => {
    if (!allRoutePoints.length) return [];
    const fromIdx = currentDriverPolylineIndex !== null ? currentDriverPolylineIndex : 0;
    return allRoutePoints.slice(fromIdx);
  }, [allRoutePoints, currentDriverPolylineIndex]);

  // ── Phase 1: fit full polyline into view as soon as route data loads ─────
  // Fires on mount once polyline is available, giving context before any socket emission.
  const hasInitialFitRef = useRef(false);
  useEffect(() => {
    if (hasInitialFitRef.current || allRoutePoints.length < 2) return;
    hasInitialFitRef.current = true;
    mapRef.current?.fitToCoordinates(allRoutePoints, {
      edgePadding: { top: 80, right: 40, bottom: SCREEN_HEIGHT * 0.38, left: 40 },
      animated: true,
    });
  }, [allRoutePoints]);

  // ── Phase 2: zoom to the driver on first LIVE socket coord ────────────────
  // The fallback (allRoutePoints[0]) already positions the car; once the real
  // live coord arrives we do a single animated zoom-in to the accurate position.
  const hasFollowedDriverRef = useRef(false);
  useEffect(() => {
    if (hasFollowedDriverRef.current || !driverCoord) return;
    hasFollowedDriverRef.current = true;
    mapRef.current?.animateToRegion(
      {
        latitude: driverCoord.latitude,
        longitude: driverCoord.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      },
      600,
    );
  }, [driverCoord]);

  // Keep isBoardedRef in sync with isBoardingSuccess for use inside memoized callbacks.
  useEffect(() => {
    if (isBoardingSuccess || isDriverMarkedPresent) {
      isBoardedRef.current = true;
    }
  }, [isBoardingSuccess, isDriverMarkedPresent]);

  // Clear ETA once the passenger has been picked up — no more "arriving" needed.
  useEffect(() => {
    const shuttlePickedUp = !isChauffeurMode && (isBoardingSuccess || isDriverMarkedPresent);
    const chauffeurPickedUp = isChauffeurMode && chauffeurStatus === 'IN_PROGRESS';
    if (shuttlePickedUp || chauffeurPickedUp) {
      setEtaSnapshot(null);
    }
  }, [isChauffeurMode, isBoardingSuccess, isDriverMarkedPresent, chauffeurStatus]);

  // ── Off-route detection ───────────────────────────────────────────────────
  useEffect(() => {
    if (!driverCoord || allRoutePoints.length < 2) return;
    const dist = getDistanceToPolylineMeters(driverCoord, allRoutePoints);
    const now = Date.now();
    if (dist > OFF_ROUTE_THRESHOLD_M && now - lastRecalcTimeRef.current > CLIENT_COOLDOWN_MS) {
      lastRecalcTimeRef.current = now;
      setRecalcParams({ driverLat: driverCoord.latitude, driverLng: driverCoord.longitude });
    } else if (dist <= OFF_ROUTE_THRESHOLD_M / 2) {
      setRecalcParams(undefined);
    }
  }, [driverCoord, allRoutePoints]);

  // ── Bottom Sheet snap logic ───────────────────────────────────────────────
  useEffect(() => {
    if (isDataLoading) return;
    const shouldExpand = isChauffeurMode
      ? chauffeurStatus === 'ARRIVED'
      : captainIsHere;
    if (shouldExpand) {
      bottomSheetRef.current?.snapToIndex(1);
    } else {
      bottomSheetRef.current?.snapToIndex(0);
    }
  }, [captainIsHere, isDataLoading, isChauffeurMode, chauffeurStatus]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleContactDriver = useCallback(async () => {
    if (!driverPhone) return;
    setIsCallingDriver(true);
    try {
      await Linking.openURL(`tel:${driverPhone}`);
    } catch (err) {
      console.warn('Could not open dialer:', err);
    } finally {
      setIsCallingDriver(false);
    }
  }, [driverPhone]);

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
          message={t('employee:boardingSuccess')}
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
          message={isTripNotFound ? t('employee:tripNotFound') : t('employee:failedToBoard')}
          subMessage={
            isTripNotFound
              ? t('employee:couldNotFindTrip')
              : (err?.data?.message ?? t('employee:couldNotMarkAttendance'))
          }
        />,
        { duration: 4000, position: 'top', backgroundColor: '#ff4545' },
      );
    }
  }, [captainIsHere, activeTripId, userId, scanBoarding, toast]);

  const handleShareRide = useCallback(async () => {
    setIsSharingRide(true);
    try {
      await Share.share({
        message: `I'm on my way! My ride details - Driver: ${driverName}, Vehicle: ${vehicleDisplay} (${vehiclePlate})`,
      });
    } finally {
      setIsSharingRide(false);
    }
  }, [driverName, vehicleDisplay, vehiclePlate]);

  const handleDevMarkOutstation = useCallback(() => {
    dispatch(setIsOutstationDev(true));
  }, [dispatch]);

  // ── Status text ───────────────────────────────────────────────────────────
  const chauffeurStatusText = (() => {
    switch (chauffeurStatus) {
      case 'OTW':         return te('chauffeurOnTheWay');
      case 'ARRIVED':     return te('chauffeurArrivedPickup');
      case 'IN_PROGRESS': return te('sitTightOnTheWay');
      case 'DROPPED_OFF': return te('chauffeurDroppedOff');
      case 'ENDED':       return te('tripComplete');
      default:            return te('chauffeurRide');
    }
  })();

  // Employee is considered boarded if they self-scanned or the driver marked them present
  const isBoarded = isBoardingSuccess || isDriverMarkedPresent;

  const etaText = (() => {
    if (displayEtaMinutes === null) return null;
    if (displayEtaMinutes <= 1) return te('arrivingShortly');
    return te('arrivingInMinutes', { count: displayEtaMinutes });
  })();

  const statusText = isChauffeurMode
    ? (chauffeurStatus === 'OTW' && etaText ? etaText : chauffeurStatusText)
    : directionParam === 'EVENING'
      ? te('rideInProgressLabel')
      : isBoarded
        ? te('sitTightOnTheWay')
        : captainIsHere
          ? te('captainBoardShuttle')
          : isWaitingForDriverResponse
            ? te('waitingForDriver')
            : (etaText ?? te('rideOnTheWay'));

  const statusColor = captainIsHere ? '#000' : '#000';
  const qrButtonLabel = isBoardingLoading ? te('boarding') : te('board');

  return (
    <View style={styles.root}>
      <MapView
        provider={PROVIDER_GOOGLE}
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
        {remainingRoute.length > 1 && (
          <Polyline
            coordinates={remainingRoute}
            strokeWidth={4}
            strokeColor="#4B5563"
            lineCap="round"
            lineJoin="round"
          />
        )}

        {completedRoute.length <= 1 && remainingRoute.length <= 1 && allRoutePoints.length > 1 && (
          <Polyline
            coordinates={allRoutePoints}
            strokeWidth={4}
            strokeColor="#4B5563"
            lineCap="round"
            lineJoin="round"
          />
        )}

        {!isChauffeurMode && routeStops.map((stop, index) => {
          const stopPolyIdx = stopPolylineIndices[index];
          const isPassed =
            arrivedPolylineIndex !== null &&
            stopPolyIdx !== undefined &&
            stopPolyIdx <= arrivedPolylineIndex;

          return (
            <Marker
              key={`stop-${stop.id}`}
              coordinate={{ latitude: stop.lat!, longitude: stop.lng! }}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <ExpoImage
                source={require('../../../../assets/stop.svg')}
                style={{ width: 25, height: 25, opacity: isPassed ? 0.35 : 1 }}
                contentFit="contain"
              />
            </Marker>
          );
        })}

        {/* Chauffeur pickup marker */}
        {isChauffeurMode && allRoutePoints.length > 0 && (
          <Marker
            coordinate={allRoutePoints[allRoutePoints.length - 1]!}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <ExpoImage
              source={require('../../../../assets/stop.svg')}
              style={{ width: 25, height: 25 }}
              contentFit="contain"
            />
          </Marker>
        )}

        {/* Car marker: shown immediately using polyline[0] as fallback; snaps to
            live socket coord once the first emission arrives. Position updates are
            driven imperatively (see effect above) — Android via ref command,
            iOS via AnimatedRegion — rather than relying on the coordinate prop
            alone, which silently fails to move on real devices under Fabric. */}
        {displayDriverCoord && Platform.OS === 'android' && (
          <Marker
            ref={carMarkerRef}
            coordinate={displayDriverCoord}
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
        )}
        {displayDriverCoord && animatedDriverRegion && Platform.OS !== 'android' && (
          <MarkerAnimated
            // react-native-maps' types don't model AnimatedRegion as a valid
            // `coordinate` value even though it's the documented API for it.
            coordinate={animatedDriverRegion as unknown as LatLng}
            anchor={{ x: 0.5, y: 0.5 }}
            flat={true}
            rotation={busHeading}
            style={{ zIndex: 100 }}
          >
            <Image
              source={require('../../../../assets/car_birdeye.png')}
              style={{ width: 60, height: 60, resizeMode: 'contain' }}
            />
          </MarkerAnimated>
        )}
      </MapView>

      {/* Floating back button — return to employee home (drawer / logout) */}
      <View style={[styles.floatingButtons, isRTL && styles.floatingButtonsRtl]}>
        <Pressable
          style={styles.floatingBtn}
          onPress={() => router.replace('/employee')}
          accessibilityRole="button"
          accessibilityLabel={t('common:back')}
        >
          <Ionicons
            name={isRTL ? 'arrow-forward' : 'arrow-back'}
            size={24}
            color="#000000"
          />
        </Pressable>
      </View>

      {/* BottomSheet: animatedPosition replaces animatedIndex */}
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        animatedPosition={animatedPosition}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose={false}
        
        handleIndicatorStyle={styles.sheetHandle}
        backgroundStyle={styles.sheetBackground}
      >
        <BottomSheetView style={styles.sheetContent}>
          <View style={styles.statusContainer}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusText}
            </Text>
          </View>
          <View style={styles.divider} />

          {/* Crossfade profile section — driven by sheetProgress, not animatedIndex */}
          <Animated.View style={animatedContainerStyle}>
            {/* Small/Horizontal Layout */}
            <Animated.View style={smallProfileStyle}>
              <View style={styles.driverRow}>
                <View style={styles.captainSection}>
                  <View style={styles.avatarCircle}>
                    {driverPictureUrl ? (
                      <ExpoImage
                        source={{ uri: driverPictureUrl }}
                        style={{ width: 60, height: 60, borderRadius: 30 }}
                        contentFit="cover"
                      />
                    ) : (
                      <Text style={styles.avatarInitials}>{driverInitials}</Text>
                    )}
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

            {/* Big/Centered Layout */}
            <Animated.View style={bigProfileStyle}>
              <View style={styles.captainCenterSection}>
                <Text
                  style={[
                    styles.captainRoleLabel,
                    isRTL ? { textTransform: 'none', letterSpacing: 0 } : undefined,
                    buildRtlPromoTextStyle(language, 'tag'),
                  ]}
                >
                  {isChauffeurMode ? te('yourChauffeur') : te('yourCaptain')}
                </Text>

                <View style={styles.avatarCircleBig}>
                  {driverPictureUrl ? (
                    <ExpoImage
                      source={{ uri: driverPictureUrl }}
                      style={{ width: 72, height: 72, borderRadius: 36 }}
                      contentFit="cover"
                    />
                  ) : (
                    <Text style={styles.avatarInitialsBig}>{driverInitials}</Text>
                  )}
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

          <View style={[styles.divider, { marginTop: 40, marginBottom: 4 }]} />

          <View style={styles.threeActionsRow}>
            <Pressable style={styles.iconActionBtn} onPress={handleContactDriver} disabled={isCallingDriver}>
              <Ionicons name="call-outline" size={20} color="#141414" />
              <Text style={styles.iconActionText}>{isCallingDriver ? te('calling') : te('callDriver')}</Text>
            </Pressable>

            <Pressable style={styles.iconActionBtn} onPress={handleShareRide} disabled={isSharingRide}>
              <Octicons name="share" size={20} color="black" />
              <Text style={styles.iconActionText}>{isSharingRide ? te('sharing') : te('shareRide')}</Text>
            </Pressable>

            {!isChauffeurMode && !isBoarded && captainIsHere && directionParam !== 'EVENING' && (
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
  stopMarkerPassed: {
    backgroundColor: '#D1D5DB',
    borderColor: '#9CA3AF',
  },
  stopMarkerMine: {
    backgroundColor: '#0C225E',
    borderColor: '#F1F443',
    borderWidth: 3,
  },
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
  floatingButtonsRtl: {
    left: undefined,
    right: 20,
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
    shadowOffset: { width: -4, height: 0 },
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
    overflow: 'hidden',
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
    overflow: 'hidden',
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
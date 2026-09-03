import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  AppState,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import Feather from "@react-native-vector-icons/feather/static";
import Ionicons from "@react-native-vector-icons/ionicons/static";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import { colors, fontFamily } from '@/core/theme';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { useLanguage } from '@/i18n/useLanguage';
import { buildRtlSectionTitleStyle, buildRtlSmallSubtitleTextStyle } from '@/i18n/types';
import { useToast } from '@/shared/ui/molecules/Toast';
import { CustomToast } from '@/features/shared/components/CustomToast';
import {
  useGetTripEmployeesQuery,
  useGetTripAttendanceQuery,
  useScanPassengerMutation,
  useMarkPassengerAbsentMutation,
  useStartTripMutation,
  useArriveAtStopMutation,
  useProceedFromStopMutation,
  useCompleteTripMutation,
  TripEmployee,
  shuttleApi,
  formatShuttleVehicleLabel,
  formatShuttleVehiclePlate,
} from '../services/shuttleApi';
import { useActiveTrip } from '../hooks/useActiveTrip';
import { openInMaps } from '../utils/openInMaps';
import { useRideSocket } from '@/hooks/useRideSocket';
import { useAppSelector } from '@/store/hooks';
import { store } from '@/store';
import { useRiderLocationTracking } from '@/hooks/useRiderLocationTracking';
import { LocationDisclosureModal } from '@/components/LocationDisclosureModal';
import { BackButton } from '@/components/BackButton';

type EmployeeStatus = 'present' | 'absent';

type StopEmployee = {
  id: string;
  name: string;
  number: string;
  status: EmployeeStatus;
  /** True once a real attendance record exists for this trip (self-reported or driver-marked) —
   * distinct from `status`, which defaults to 'absent' purely for display before anyone acts. */
  hasRecord: boolean;
  /** Who last set this status — 'EMPLOYEE' when self-reported (e.g. morning "not coming"). */
  source: 'EMPLOYEE' | 'DRIVER' | null;
};

// Per-employee loading state: which action is in flight
type EmployeeLoadingAction = 'scanning' | 'marking_absent' | null;

function getApiErrorMessage(error: unknown): string | null {
  const maybe = error as { data?: { message?: string }; message?: string; error?: string; status?: string | number } | undefined;
  // Server returned a structured error (4xx / 5xx)
  if (maybe?.data?.message) return maybe.data.message;
  // RTK Query FETCH_ERROR (timeout, network drop, DNS failure)
  if (maybe?.status === 'FETCH_ERROR') return 'Network request failed — please check your connection and retry.';
  if (maybe?.status === 'TIMEOUT_ERROR') return 'The request timed out — the trip may have completed on the server. Please pull to refresh.';
  return maybe?.message || maybe?.error || null;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** Simple pulsing placeholder — shown while the pre-start screen is refetching trip/stop
 * data (e.g. after resuming from background) so the driver sees "this is loading," not a
 * stale or blank Route Overview while the refresh is in flight. */
function SkeletonBar({ width, height = 14, radius = 6 }: { width: number | `${number}%`; height?: number; radius?: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View style={{ width, height, borderRadius: radius, backgroundColor: '#E5E7EB', opacity }} />
  );
}

export default function RideInProgress() {
  const { tripId: tripIdParam } = useLocalSearchParams<{ tripId?: string }>();
  const preferredTripId = tripIdParam ? Number.parseInt(tripIdParam, 10) : null;
  const safePreferredTripId = Number.isNaN(preferredTripId ?? NaN) ? null : preferredTripId;
  const { t, isRTL, rtlFont, language } = useLanguage();
  const tr = (key: string) => t(`shuttle:rideInProgress.${key}`);
  const toast = useToast();

  const {
    activeTrip,
    tripId,
    stops,
    displayStops,
    currentStop,
    nextStopAfterCurrent,
    nextStopIndex,
    isLastStop,
    rideStarted,
    isAtStop,
    isLoading: isTripsLoading,
    isFetching: isTripsFetching,
    refetch: refetchActiveTrip,
  } = useActiveTrip(safePreferredTripId);

  const vehicle = activeTrip?.routes?.vehicles ?? null;
  const vehicleLabel = formatShuttleVehicleLabel(vehicle);
  const vehiclePlate = formatShuttleVehiclePlate(vehicle);
  const vehicleModel = vehicle?.model?.trim() || vehicle?.make?.trim() || '—';

  const userId = useAppSelector((s) => s.auth.user?.id ?? '');

  // Patch attendance cache in real time when server broadcasts an update
  // Track employees who self-scanned via WebSocket — these are the only ones whose buttons lock
  const [selfScannedIds, setSelfScannedIds] = useState<Set<string>>(new Set());

  const handleAttendanceMarked = useCallback(
    (data: { employeeId: string; employeeName: string; markedBy: string; status?: string; timestamp: string }) => {
      if (!tripId) return;
      // This event also fires for the morning "mark myself absent" self-service flow now —
      // don't assume markedBy === 'self' always means a physical boarding scan.
      const status = data.status === 'ABSENT' ? 'ABSENT' : 'PRESENT';
      // Only lock buttons for a genuine physical self-scan (boarded), not a pre-trip
      // self-reported absence — the driver must still be able to override the latter.
      if (data.markedBy === 'self' && status === 'PRESENT') {
        setSelfScannedIds((prev) => new Set(prev).add(data.employeeId));
      }
      store.dispatch(
        shuttleApi.util.updateQueryData('getTripAttendance', tripId as number, (draft) => {
          const i = draft.findIndex((e) => e.employeeId === data.employeeId);
          if (i !== -1) {
            draft[i].status = status;
            if (data.markedBy === 'self') draft[i].source = 'EMPLOYEE';
          } else {
            draft.push({
              employeeId: data.employeeId,
              fullName: data.employeeName,
              phone: null,
              department: null,
              status,
              scannedAt: data.timestamp,
              source: data.markedBy === 'self' ? 'EMPLOYEE' : 'DRIVER',
            });
          }
        }),
      );
      // Clear any loading spinner for this employee
      setEmployeeLoadingMap((prev) => ({ ...prev, [data.employeeId]: null }));
    },
    [tripId],
  );

  useRideSocket({
    tripId: tripId ?? 0,
    userId,
    role: 'driver',
    tripType: 'shuttle',
    onAttendanceMarked: handleAttendanceMarked,
  });

  // Background-safe location tracking via expo-task-manager
  const {
    startTracking,
    stopTracking,
    needsDisclosure,
    onDisclosureAccept,
    onDisclosureDecline,
  } = useRiderLocationTracking();

  const [locationPermissionWarning, setLocationPermissionWarning] = useState<
    'foreground' | 'background' | null
  >(null);

  const checkLocationPermission = useCallback(async (isStale: () => boolean) => {
    // iOS: CLAuthorizationStatus can lag a frame after returning from
    // Settings, so we wait briefly before reading to avoid a false banner.
    if (Platform.OS === 'ios') {
      await new Promise<void>((r) => setTimeout(r, 300));
    }
    if (isStale()) return;
    const fg = await Location.getForegroundPermissionsAsync();
    const bg = await Location.getBackgroundPermissionsAsync();
    if (isStale()) return;
    const iosScope = Platform.OS === 'ios'
      ? ((fg as any)?.ios?.scope as string | undefined)
      : undefined;
    const fullyGranted =
      (fg.status === 'granted' && bg.status === 'granted') ||
      (Platform.OS === 'ios' && fg.status === 'granted' && iosScope === 'always');
    // Only lock the button / show the Settings banner when the OS will no
    // longer show its own dialog. A 'denied' status with canAskAgain still
    // true (e.g. a silent OS/OEM revoke of a previously-granted permission)
    // should be treated like a fresh ask, not a permanent block.
    if (fullyGranted) {
      setLocationPermissionWarning(null);
    } else if (fg.status === 'denied' && !fg.canAskAgain) {
      setLocationPermissionWarning('foreground');
    } else if (bg.status === 'denied' && !bg.canAskAgain) {
      setLocationPermissionWarning('background');
    } else {
      setLocationPermissionWarning(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      checkLocationPermission(() => cancelled);
      return () => {
        cancelled = true;
      };
    }, [checkLocationPermission]),
  );

  const { data: realEmployees = [], isLoading: isEmployeesLoading, isFetching: isEmployeesFetching, refetch: refetchTripEmployees } = useGetTripEmployeesQuery(
    tripId as number,
    { skip: !tripId },
  );

  const tripEmployeesRaw = realEmployees;

  const { data: tripAttendance = [], isFetching: isAttendanceFetching, refetch: refetchTripAttendance } = useGetTripAttendanceQuery(
    tripId as number,
    { skip: !tripId },
  );

  // True while any of the three pre-start queries are (re)fetching — covers both the initial
  // mount and the AppState-triggered background→active refetch below. Only meaningful pre-start:
  // once the ride is STARTED, self-mark-absent is locked and nothing here changes underneath the
  // driver, so we never want to show a loading state or lock the button post-start for this reason.
  const isPreStartRefreshing = !rideStarted && (isTripsFetching || isEmployeesFetching || isAttendanceFetching);

  // Catch permission changes that happen while the app is merely backgrounded
  // (OS/OEM auto-revoke, user editing Settings and switching back) rather than
  // only re-checking on React Navigation focus events. Also: if the driver backgrounded
  // the app before starting the trip (e.g. opened it at 6am, someone self-marks absent
  // later, driver resumes at 7:05 and taps Begin Ride), the pre-start screen could be
  // showing a stale Route Overview for a real stretch of time — unlike the post-start
  // "just came back from Google Maps" case, where nothing can have changed (self-mark-absent
  // is locked the instant the trip starts) and refetching would be pure waste. Gating on
  // `!rideStarted` targets exactly the case that can actually go stale.
  const rideStartedRef = useRef(rideStarted);
  rideStartedRef.current = rideStarted;

  const refreshPreStartData = useCallback(() => {
    if (rideStartedRef.current) return;
    // getTodayTrip takes no args — it's the exact same cache entry ShuttleDriver.tsx (the
    // home screen) already uses. If that screen was open before an employee's absence
    // changed, this cache is already warm, and simply mounting here would just serve the
    // stale value — RTK Query doesn't refetch an already-cached query on its own. Explicitly
    // forcing it here (not just on AppState resume below) covers the much more common path:
    // driver taps into this screen straight from Home.
    refetchActiveTrip();
    if (tripId) {
      refetchTripEmployees();
      refetchTripAttendance();
    }
  }, [refetchActiveTrip, refetchTripEmployees, refetchTripAttendance, tripId]);

  // Force a fresh read every time this screen is focused — not just once on mount. This
  // screen almost certainly never actually unmounts when the driver navigates back to Home
  // (Drawer/Tab navigators keep screens alive for fast switching), so a mount-only effect
  // would only ever fire once per app session and miss every subsequent "left, then came
  // back" cycle (e.g. Home → RideInProgress → Home → RideInProgress). useFocusEffect fires on
  // every such re-focus, including the initial one, so it fully replaces a separate mount
  // effect. This is a distinct trigger from the AppState listener below — that one covers the
  // OS backgrounding the whole app (e.g. Google Maps and back); this one covers in-app
  // navigation away and back without ever leaving the app. Both are safe post-start for the
  // same reason: refreshPreStartData no-ops instantly via rideStartedRef once the ride starts.
  useFocusEffect(
    useCallback(() => {
      refreshPreStartData();
    }, [refreshPreStartData]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        let cancelled = false;
        checkLocationPermission(() => cancelled);
        refreshPreStartData();
      }
    });
    return () => subscription.remove();
  }, [checkLocationPermission, refreshPreStartData]);

  const [scanPassenger, { isLoading: isScanning }] = useScanPassengerMutation();
  const [markPassengerAbsent, { isLoading: isMarkingAbsent }] =
    useMarkPassengerAbsentMutation();
  const [startTrip, { isLoading: isStartingTrip }] = useStartTripMutation();
  const [arriveAtStop, { isLoading: isArrivingAtStop }] = useArriveAtStopMutation();
  const [proceedFromStop, { isLoading: isProceeding }] = useProceedFromStopMutation();
  const [completeTrip, { isLoading: isCompletingTrip }] = useCompleteTripMutation();

  const isActionLoading = isStartingTrip || isArrivingAtStop || isCompletingTrip;

  // Single source of truth: derive present/absent from server manifest only. Presence of an
  // entry in this map (not just its status) distinguishes a genuine attendance record from
  // the 'absent' default shown for employees nobody has acted on yet.
  const attendanceStatusByEmployeeId = useMemo(() => {
    const map: Record<string, { status: EmployeeStatus; source: 'EMPLOYEE' | 'DRIVER' | null }> = {};
    tripAttendance.forEach((log) => {
      const normalized = log.status?.toUpperCase();
      map[log.employeeId] = {
        status: normalized === 'PRESENT' || normalized === 'BOARDED' ? 'present' : 'absent',
        source: log.source ?? null,
      };
    });
    return map;
  }, [tripAttendance]);

  const [attendanceStopId, setAttendanceStopId] = useState<number | null>(null);

  const arrivedStopSheetRef = useRef<BottomSheet>(null);
  const arrivedStopSnapPoints = useMemo(() => ['60%'], []);

  // CRASH RECOVERY: If app is relaunched while driver was at a stop (AT_STOP),
  // automatically restore the attendance bottom sheet so they can continue.
  // OFFICE stops (morning = destination, no attendance) never got a sheet in the first
  // place — the interrupted transaction there is just "finish the arrive→proceed pair,"
  // so recover by completing that instead of opening a sheet that was never shown.
  const hasAutoOpenedRef = useRef(false);
  useEffect(() => {
    if (
      isAtStop &&
      activeTrip?.current_stop_id != null &&
      !hasAutoOpenedRef.current &&
      !isTripsLoading
    ) {
      hasAutoOpenedRef.current = true;
      if (currentStop?.stopType === 'OFFICE') {
        proceedFromStop({ tripId: activeTrip.id }).catch(() => {
          // Swallow — driver can retry via the main slide button if this fails.
        });
        return;
      }
      setAttendanceStopId(activeTrip.current_stop_id);
      // Small delay to let the BottomSheet mount before snapping
      const timer = setTimeout(() => {
        arrivedStopSheetRef.current?.snapToIndex(0);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isAtStop, activeTrip?.current_stop_id, isTripsLoading, currentStop, proceedFromStop, activeTrip?.id]);

  // Per-employee loading state for inline tick/cross actions
  const [employeeLoadingMap, setEmployeeLoadingMap] = useState<Record<string, EmployeeLoadingAction>>({});

  const setEmployeeLoading = useCallback((empId: string, action: EmployeeLoadingAction) => {
    setEmployeeLoadingMap((prev) => ({ ...prev, [empId]: action }));
  }, []);

  const handleCall = useCallback((phone?: string) => {
    if (phone) {
      const url = Platform.OS === 'ios' ? `telprompt:${phone}` : `tel:${phone}`;
      Linking.openURL(url).catch(() => { });
    }
  }, []);

  const stopForAttendance = useMemo(
    () => stops.find((s) => s.id === attendanceStopId) ?? currentStop,
    [stops, attendanceStopId, currentStop]
  );

  const employeesAtCurrentStop: StopEmployee[] = useMemo(() => {
    if (!stopForAttendance) return [];
    const list = tripEmployeesRaw.filter((emp: TripEmployee) => emp.pickupStopId === stopForAttendance.id);
    return list.map((emp) => {
      const record = attendanceStatusByEmployeeId[emp.id];
      return {
        id: emp.id,
        name: emp.fullName,
        number: emp.phone ?? '',
        status: record?.status ?? 'absent',
        hasRecord: record !== undefined,
        source: record?.source ?? null,
      };
    });
  }, [stopForAttendance, tripEmployeesRaw, attendanceStatusByEmployeeId]);

  const handleSlideComplete = useCallback(async () => {
    if (!currentStop || !stops.length) {
      return;
    }

    if (!rideStarted) {
      // Last-resort: only when permanently denied (OS will no longer show its own
      // dialog) do we send the driver to Settings — otherwise let the normal
      // disclosure / native-dialog flow run so the OS can re-prompt.
      const fgGuard = await Location.getForegroundPermissionsAsync();
      const bgGuard = await Location.getBackgroundPermissionsAsync();
      const fgPermanentlyDenied = fgGuard.status === 'denied' && !fgGuard.canAskAgain;
      const bgPermanentlyDenied = bgGuard.status === 'denied' && !bgGuard.canAskAgain;
      if (fgPermanentlyDenied || bgPermanentlyDenied) {
        Alert.alert(
          'Location required',
          'Location permission was denied. Open Settings to allow location access so you can start this ride.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }

      // First slide: read current GPS position, then call start trip API, then open maps
      const routeId = activeTrip?.route_id;
      const direction = activeTrip?.direction;
      if (routeId != null && direction) {
        try {
          // Start background tracking and OS/disclosure flow first; only then hit
          // the server (startTrip) so denying the permission modal cannot leave a started ride.
          const afterTrackingReady = async () => {
            let driverLat: number | undefined;
            let driverLng: number | undefined;
            try {
              const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
              });
              driverLat = loc.coords.latitude;
              driverLng = loc.coords.longitude;
            } catch (e) {
              console.warn('Could not read GPS for trip start', e);
            }
            // Capture what the driver was actually just looking at (Route Overview's skipped
            // stops) before calling startTrip — needed below to detect a stop flipping back
            // from skipped to visited, which is just as worth a heads-up as a new skip: the
            // driver already built a mental model from what was on screen a moment ago.
            const previouslyExcludedStops = activeTrip?.routes?.excluded_stops ?? [];
            const result = await startTrip({ route_id: routeId, direction, lat: driverLat, lng: driverLng }).unwrap();
            // Fire-and-forget: bring Route Overview's route_stops/excluded_stops fully up to
            // date (e.g. an earlier absence that got undone before start, which a partial patch
            // can't correct — see the comment on startTrip's onQueryStarted). Not awaited: the
            // driver's Maps handoff below already has everything it needs from `result` and
            // must not wait on this: Route Overview is something the driver checks back in the
            // app later, not during the handoff itself, so an eventually-consistent refresh
            // here costs nothing.
            refetchActiveTrip();
            // Use the trip-start response's own resolved first stop — computed synchronously,
            // server-side, from the same absence data that decides stop exclusion — instead of
            // `currentStop` (a value from before the trip started). Relying on `currentStop`
            // here would race a fully-absent stop just getting excluded: cache invalidation
            // alone can't win against this very next line running synchronously. `first_stop`
            // is only null when every stop on the route is fully absent — in that rare case
            // there's genuinely nowhere to navigate to, so we deliberately don't fall back to
            // the stale `currentStop` (which could be exactly the excluded stop).
            const goToFirstStop = () => {
              if (result.first_stop) {
                openInMaps(result.first_stop);
              }
            };
            // A driver who isn't told about a route change will either see Maps head straight
            // to "stop 2" with no explanation (a new skip), or — just as confusing — see it
            // head to a stop they just watched get struck through on Route Overview a moment
            // ago (a restored stop, e.g. the rider undid their absence right before Begin Ride).
            // Neither is legible from inside Maps itself, so we interrupt here, before handing
            // off — but only when the route actually differs from what the driver was just
            // shown on Route Overview. A stop that was *already* correctly displayed as
            // skipped isn't news; re-alerting about it every single time Begin Ride is tapped
            // would just be redundant friction for something the driver already knows.
            const previouslyExcludedIds = new Set(previouslyExcludedStops.map((s) => s.id));
            const stillExcludedIds = new Set(result.excluded_stops.map((s) => s.id));
            const newlySkippedStops = result.excluded_stops.filter((s) => !previouslyExcludedIds.has(s.id));
            const restoredStops = previouslyExcludedStops.filter((s) => !stillExcludedIds.has(s.id));
            const hasNewSkip = newlySkippedStops.length > 0;
            const hasRestored = restoredStops.length > 0;

            if (hasNewSkip || hasRestored) {
              const skippedNames = newlySkippedStops.map((s) => s.name).join(', ');
              const restoredNames = restoredStops.map((s) => s.name).join(', ');
              let title: string;
              let body: string;

              if (hasNewSkip && hasRestored) {
                title = 'Route updated';
                body = `Skipping ${skippedNames}. ${restoredNames} is no longer skipped.`
                  + (result.first_stop ? ` Next: ${result.first_stop.name}.` : '');
              } else if (hasNewSkip) {
                title = newlySkippedStops.length > 1
                  ? `Skipping ${newlySkippedStops.length} stops`
                  : `Skipping ${skippedNames}`;
                body = result.first_stop
                  ? (newlySkippedStops.length > 1
                      ? `${skippedNames} — no passengers today. Next: ${result.first_stop.name}.`
                      : `No passengers today — next stop is ${result.first_stop.name}.`)
                  : 'Everyone on this route is absent.';
              } else {
                title = restoredStops.length > 1
                  ? `${restoredStops.length} stops no longer skipped`
                  : `${restoredNames} no longer skipped`;
                body = `A rider marked themselves present — ${restoredNames} is back on the route.`;
              }

              Alert.alert(title, body, [{ text: 'OK', onPress: goToFirstStop }]);
            } else {
              goToFirstStop();
            }
          };
          const trackingStarted = await startTracking(tripId ?? 0, afterTrackingReady, 'shuttle');
          // false = Android disclosure shown, or iOS permission flow did not complete — do not treat as error.
          if (!trackingStarted) {
            return;
          }
        } catch {
          Alert.alert(
            'Error',
            'Could not start ride. Please try again.',
            [{ text: 'OK' }],
          );
        }
      }
      return;
    }

    if (!activeTrip) return;

    if (!isLastStop) {
      // OFFICE stops are a morning destination (drop-off), never a boarding origin — no
      // attendance UI, and unlike PICKUP stops the driver doesn't need to review anyone
      // before moving on, so arrive + proceed run back-to-back with just a confirmation.
      if (currentStop.stopType === 'OFFICE') {
        try {
          await arriveAtStop({
            tripId: activeTrip.id,
            current_stop_id: currentStop.id,
          }).unwrap();
          const nextDrivingStop = nextStopAfterCurrent;
          await proceedFromStop({ tripId: activeTrip.id }).unwrap();
          toast.show(
            <CustomToast
              type="success"
              message={tr('arrivedAtOffice').replace('{{name}}', currentStop.name)}
            />,
            { duration: 3000, position: 'top', backgroundColor: '#1ad41d' },
          );
          if (nextDrivingStop) {
            openInMaps(nextDrivingStop);
          }
        } catch {
          Alert.alert(
            'Error',
            'Failed to mark as arrived. Please try again.',
            [{ text: 'OK' }],
          );
        }
        return;
      }

      try {
        await arriveAtStop({
          tripId: activeTrip.id,
          current_stop_id: currentStop.id,
        }).unwrap();
        // Only after a successful 200: open attendance sheet (no optimistic UI).
        setAttendanceStopId(currentStop.id);
        arrivedStopSheetRef.current?.snapToIndex(0);
      } catch {
        Alert.alert(
          'Error',
          'Failed to mark as arrived. Please try again.',
          [{ text: 'OK' }],
        );
      }
      return;
    }

    try {
      let lat: number | undefined;
      let lng: number | undefined;
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
      } catch (e) {
        console.warn('Could not read GPS for trip complete', e);
      }
      await completeTrip({
        tripId: activeTrip.id,
        total_distance: 0,
        ...(lat != null && lng != null ? { lat, lng } : {}),
      }).unwrap();
      await stopTracking().catch(console.warn);
      router.push('/shuttle');
    } catch (error) {
      Alert.alert(
        tr('failedCompleteTitle'),
        getApiErrorMessage(error) || tr('failedComplete'),
        [{ text: 'OK' }],
      );
    }
  }, [
    rideStarted,
    isLastStop,
    currentStop,
    activeTrip,
    nextStopAfterCurrent,
    openInMaps,
    startTrip,
    startTracking,
    tripId,
    arriveAtStop,
    proceedFromStop,
    completeTrip,
    stops.length,
    refetchActiveTrip,
    toast,
    tr,
  ]);

  return (
    <SafeAreaView style={styles.root}>
      <LocationDisclosureModal
        visible={needsDisclosure}
        onAccept={onDisclosureAccept}
        onDecline={onDisclosureDecline}
      />
      <BackButton
        onPress={() => router.back()}
        anchored={false}
        iconSize={24}
        className={isRTL ? 'self-end px-6 mb-3 mt-3' : 'ml-[-4px] px-6 mb-3 mt-3'}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.titleText}>
            {rideStarted ? tr('tripInProgress') : tr('readyToGo')}
          </Text>
          <Text style={styles.subtitleText}>
            {vehicleLabel === '—' && vehiclePlate === '—'
              ? '—'
              : `${vehicleLabel} • ${vehiclePlate}`}
          </Text>
        </View>

        {/* Info Grid */}
        <View className="flex-row items-start mb-6 mt-8">
          {/* Vehicle */}
          <View className="flex-1 items-center gap-[3px]">
            <View className="w-8 h-8 rounded-lg bg-black/10 items-center justify-center mb-0.5">
              <MaterialCommunityIcons name="bus" size={16} color="#000" />
            </View>
            <Text className="text-[10px] font-semibold text-black/50 uppercase tracking-[0.8px]">{vehicleModel}</Text>
            <Text className="text-[13px] font-extrabold text-[#000] tracking-[-0.2px]">{vehiclePlate}</Text>
          </View>

          <View className="w-[1px] h-[80%] self-center bg-black/10" />

          {/* Stops */}
          <View className="flex-1 items-center gap-[3px]">
            <View className="w-8 h-8 rounded-lg bg-black/10 items-center justify-center mb-0.5">
              <Ionicons name="location-outline" size={16} color="#000" />
            </View>
            <Text className="text-[10px] font-semibold text-black/50 uppercase tracking-[0.8px]">{tr('stops')}</Text>
            {isPreStartRefreshing ? (
              <SkeletonBar width={20} height={16} />
            ) : (
              <Text className="text-[13px] font-extrabold text-[#000] tracking-[-0.2px]">{stops.length}</Text>
            )}
          </View>

          <View className="w-[1px] h-[80%] self-center bg-black/10" />

          {/* Employees */}
          <View className="flex-1 items-center gap-[3px]">
            <View className="w-8 h-8 rounded-lg bg-black/10 items-center justify-center mb-0.5">
              <Ionicons name="people-outline" size={16} color="#000" />
            </View>
            <Text className="text-[10px] font-semibold text-black/50 uppercase tracking-[0.8px]">{tr('employees')}</Text>
            {isPreStartRefreshing ? (
              <SkeletonBar width={20} height={16} />
            ) : (
              <Text className="text-[13px] font-extrabold text-[#000] tracking-[-0.2px]">{tripEmployeesRaw.length}</Text>
            )}
          </View>
        </View>

        {/* Route Overview */}
        <View className="mb-6 mt-4">
          <Text className="text-xl font-bold mb-6 text-black">
            {tr('routeOverview')}
          </Text>
          <View className="ml-2">
            {isPreStartRefreshing ? (
              [0, 1, 2].map((i) => (
                <View key={i} className="flex-row items-start">
                  <View className="items-center mr-4">
                    <View className="w-4 h-4 rounded-full bg-[#E5E7EB]" style={{ borderWidth: 3, borderColor: '#FFF' }} />
                    {i < 2 && <View className="w-[2px] h-12 my-1 bg-[#E5E5E5]" />}
                  </View>
                  <View className="flex-1 mt-[-2px] gap-2">
                    <SkeletonBar width="60%" height={17} />
                    <SkeletonBar width="30%" height={13} />
                  </View>
                </View>
              ))
            ) : (
              displayStops.map((stop, index) => {
                const isLast = index === displayStops.length - 1;
                // A skipped stop (everyone assigned there is absent) can never be "current" —
                // it's excluded from `stops`/navigation entirely, this is display-only.
                const isCurrent = !stop.skipped && currentStop?.id === stop.id;

                return (
                  <View key={stop.id || index} className="flex-row items-start">
                    <View className="items-center mr-4">
                      {/* Dot */}
                      <View
                        className={`rounded-full shadow-sm items-center justify-center ${
                          stop.skipped ? 'w-4 h-4 bg-[#D32F2F]' : isCurrent ? 'w-5 h-5 bg-[#FF5A00]' : 'w-4 h-4 bg-[#A3A3A3]'
                        }`}
                        style={{ borderWidth: isCurrent ? 4 : 3, borderColor: '#FFF' }}
                      />
                      {/* Line */}
                      {!isLast && (
                        <View className={`w-[2px] h-12 my-1 ${isCurrent ? 'bg-[#FF5A00]' : 'bg-[#E5E5E5]'}`} />
                      )}
                    </View>
                    <View className={`flex-1 ${isCurrent ? 'mt-[-4px]' : 'mt-[-2px]'}`}>
                      {stop.skipped ? (
                        <Text className="text-[17px] font-medium text-[#9CA3AF]">
                          <Text style={{ textDecorationLine: 'line-through' }}>{stop.name}</Text>
                          {'  '}
                          <Text className="font-extrabold" style={{ color: colors.red }}>Skipped</Text>
                        </Text>
                      ) : (
                        <>
                          <Text className={`text-[17px] ${isCurrent ? 'font-bold text-black' : 'font-medium text-[#6B7280]'}`}>
                            {stop.name}
                          </Text>
                          {(stop.eta || stop.isOffice) && (
                            <Text className="text-[13px] font-medium text-[#9CA3AF] mt-0.5">
                              {stop.eta}
                              {stop.isOffice ? `${stop.eta ? '  ' : ''}${tr('officeLabel')}` : ''}
                            </Text>
                          )}
                        </>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* Next stop card */}
        {/* <View style={styles.cardOuter}>
          <View style={styles.cardInner}>
            {currentStop && (
              <>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={styles.iconPill}>
                      <Ionicons name="location" size={20} color="#000000" />
                    </View>
                    <View>
                      <Text style={styles.cardLabel}>Next stop</Text>
                      <Text style={styles.cardTitle}>{currentStop.name}</Text>
                    </View>
                  </View>
                  <View style={styles.etaPill}>
                    <Text style={styles.etaText}>{currentStop.eta}</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View> */}

        {/* Employees list */}
        {/* <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderLabel}>
            Employees at this stop
          </Text>
        </View>

        <View style={styles.employeesCard}>
          {isEmployeesLoading ? (
            <>
              {[1, 2, 3, 4, 5].map((i) => (
                <View
                  // eslint-disable-next-line react/no-array-index-key
                  key={i}
                  style={[
                    styles.employeeRow,
                    i < 5 && styles.employeeRowDivider,
                  ]}
                >
                  <View
                    style={[
                      styles.employeeAvatar,
                      { backgroundColor: '#E5E7EB' },
                    ]}
                  />
                  <View style={styles.employeeInfo}>
                    <View
                      style={{
                        height: 14,
                        width: 140,
                        borderRadius: 999,
                        backgroundColor: '#E5E7EB',
                        marginBottom: 6,
                      }}
                    />
                    <View
                      style={{
                        height: 10,
                        width: 90,
                        borderRadius: 999,
                        backgroundColor: '#E5E7EB',
                      }}
                    />
                  </View>
                  <View
                    style={[
                      styles.employeeAction,
                      {
                        backgroundColor: '#E5E7EB',
                        borderRadius: 999,
                      },
                    ]}
                  />
                </View>
              ))}
            </>
          ) : (
            employeesAtCurrentStop.map((emp, index) => (
              <View
                key={emp.id}
                style={[
                  styles.employeeRow,
                  index < employeesAtCurrentStop.length - 1 && styles.employeeRowDivider,
                ]}
              >
                <View style={styles.employeeAvatar}>
                  <Text style={styles.employeeAvatarText}>
                    {getInitials(emp.name)}
                  </Text>
                </View>
                <View style={styles.employeeInfo}>
                  <Text style={styles.employeeName} numberOfLines={1}>
                    {emp.name}
                  </Text>
                  {rideStarted && (
                    <Text style={styles.employeeStatus} numberOfLines={1}>
                      {emp.status === 'present' ? 'Present' : 'Absent'}
                    </Text>
                  )}
                </View>
                {rideStarted && (
                  <Pressable
                    hitSlop={8}
                    onPress={() => setSelectedEmployee(emp)}
                    style={styles.employeeAction}
                  >
                    <Entypo name="dots-three-horizontal" size={20} color="black" />
                  </Pressable>
                )}
              </View>
            ))
          )}
        </View> */}


      </ScrollView>

      <View className="absolute bottom-20 left-5 right-5 pointer-events-auto gap-2">
        {locationPermissionWarning && (
          <View className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
            <Text className="text-[13px] text-amber-900 leading-[18px]" style={{ fontFamily }}>
              {locationPermissionWarning === 'background'
                ? t('common:locationBackgroundHint')
                : t('common:locationForegroundHint')}
            </Text>
            <Pressable onPress={() => Linking.openSettings()} className="mt-2 self-start">
              <Text className="text-[13px] font-semibold text-amber-950" style={{ fontFamily }}>
                {t('common:openSettings')}
              </Text>
            </Pressable>
          </View>
        )}
        <Pressable
          onPress={handleSlideComplete}
          disabled={isActionLoading || isPreStartRefreshing || (!rideStarted && locationPermissionWarning !== null)}
          className="bg-[#FF5A00] flex-row items-center justify-center py-6 rounded-xl active:opacity-90"
          style={{
            opacity: (isActionLoading || isPreStartRefreshing) ? 0.7 : (!rideStarted && locationPermissionWarning !== null) ? 0.5 : 1,
          }}
        >
          {(isActionLoading || isPreStartRefreshing) && (
            <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
          )}
          <Text className="text-white text-[17px] font-bold mr-1">
            {isPreStartRefreshing
              ? tr('refreshing')
              : isActionLoading
                ? tr('processing')
                : (rideStarted
                  ? (isLastStop ? tr('completeTrip') : tr('markAsArrived'))
                  : tr('beginRide'))}
          </Text>
        </Pressable>
      </View>

      {/* Arrived Stop bottom sheet showing employees */}
      {attendanceStopId != null && (
        <BottomSheet
          ref={arrivedStopSheetRef}
          index={0}
          snapPoints={arrivedStopSnapPoints}
          enableDynamicSizing={false}
          backgroundStyle={{ backgroundColor: '#FFFFFF' }}
          enablePanDownToClose={false}
          handleIndicatorStyle={{ opacity: 0 }}
          backdropComponent={(props) => (
            <BottomSheetBackdrop
              {...props}
              disappearsOnIndex={-1}
              appearsOnIndex={0}
              pressBehavior="none"
            />
          )}
        >
          <View className="px-5 pb-4 pt-2 flex-row justify-between items-center">
            <View>
              <Text
                className={isRTL ? 'mb-1 text-black font-bold' : 'text-xl font-bold mb-1 text-black'}
                style={buildRtlSectionTitleStyle(language)}
              >
                {stopForAttendance?.name || tr('currentStop')}
              </Text>
              <Text
                className={isRTL ? 'text-[#6B7280]' : 'text-sm text-[#6B7280]'}
                style={buildRtlSmallSubtitleTextStyle(language)}
              >
                {tr('markAttendanceSubtitle')}
              </Text>
            </View>
          </View>

          <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}>
            <View className="overflow-hidden mb-6">
              {employeesAtCurrentStop.map((emp, index) => {
                const loadingAction = employeeLoadingMap[emp.id] ?? null;
                // Buttons only lock when employee self-scanned via WebSocket
                const selfScanned = selfScannedIds.has(emp.id);
                // Filled state reflects the real attendance record (self-reported or driver-marked),
                // not just "did the driver press this button in the current session" — otherwise an
                // employee who self-marked absent before the driver ever opened this sheet shows
                // with an unfilled, ambiguous-looking button despite already having a resolved status.
                const isAbsentBtn = emp.status === 'absent' && emp.hasRecord;
                const isPresentBtn = emp.status === 'present' && emp.hasRecord;
                const isSelfReportedAbsent = emp.status === 'absent' && emp.hasRecord && emp.source === 'EMPLOYEE';

                return (
                  <View
                    key={emp.id}
                    className="flex-row items-center py-4"
                    style={
                      index < employeesAtCurrentStop.length - 1
                        ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(156,163,175,0.35)' }
                        : undefined
                    }
                  >
                    <View
                      className="w-14 h-14 rounded-full items-center justify-center mr-3 bg-gray-200"
                      style={{ borderWidth: 2, borderColor: '#FF5A00' }}
                    >
                      <Text className="text-black font-semibold text-lg">
                        {getInitials(emp.name)}
                      </Text>
                    </View>
                    <View className="flex-1 min-w-0 mr-2">
                      <Text className="text-black font-bold text-[17px]" numberOfLines={1}>
                        {emp.name}
                      </Text>
                      <View className="flex-row items-center mt-1">
                        <Text
                          className="text-[15px] mr-2"
                          style={{ color: isSelfReportedAbsent ? colors.red : '#8E8E93' }}
                          numberOfLines={1}
                        >
                          {emp.status === 'present'
                            ? tr('present')
                            : emp.status === 'absent'
                              ? (isSelfReportedAbsent ? tr('notComing') : tr('absent'))
                              : (emp.number || t('common:noNumber'))}
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      onPress={() => handleCall(emp.number)}
                      disabled={!emp.number}
                      className="w-[42px] h-[42px] rounded-full items-center justify-center border mr-3"
                      style={{
                        borderColor: emp.number ? '#9CA3AF' : '#D1D5DB',
                        backgroundColor: emp.number ? '#F9FAFB' : '#F3F4F6',
                        opacity: emp.number ? 1 : 0.6,
                      }}
                    >
                      <Feather name="phone-call" size={18} color={emp.number ? '#111827' : '#9CA3AF'} />
                    </Pressable>

                    {/* Tick / Cross buttons — only lock on self-scan */}
                    <View className="flex-row gap-3">
                      {/* Cross = Absent */}
                      <Pressable
                        disabled={selfScanned || loadingAction !== null}
                        onPress={async () => {
                          if (!activeTrip) return;
                          setEmployeeLoading(emp.id, 'marking_absent');
                          try {
                            await markPassengerAbsent({
                              shuttleTripId: activeTrip.id,
                              employeeId: emp.id,
                            }).unwrap();
                          } catch {
                            Alert.alert('Error', tr('couldNotMarkAbsent'));
                          } finally {
                            setEmployeeLoading(emp.id, null);
                          }
                        }}
                        className="w-[42px] h-[42px] rounded-full items-center justify-center border"
                        style={{
                          backgroundColor: isAbsentBtn ? '#D27360' : 'transparent',
                          borderColor: isAbsentBtn ? '#D27360' : isPresentBtn ? '#C0C0C0' : '#D27360',
                          opacity: (selfScanned || (loadingAction !== null && loadingAction !== 'marking_absent')) ? 0.5 : 1,
                        }}
                      >
                        {loadingAction === 'marking_absent' ? (
                          <ActivityIndicator size="small" color={isAbsentBtn ? '#FFF' : '#D27360'} />
                        ) : (
                          <Ionicons
                            name="close"
                            size={24}
                            color={isAbsentBtn ? '#FFF' : isPresentBtn ? '#C0C0C0' : '#D27360'}
                          />
                        )}
                      </Pressable>

                      {/* Tick = Present */}
                      <Pressable
                        disabled={selfScanned || loadingAction !== null}
                        onPress={async () => {
                          if (!activeTrip) return;
                          setEmployeeLoading(emp.id, 'scanning');
                          try {
                            await scanPassenger({
                              shuttleTripId: activeTrip.id,
                              employeeId: emp.id,
                              status: 'PRESENT',
                            }).unwrap();
                          } catch {
                            Alert.alert('Error', tr('couldNotMarkPresent'));
                          } finally {
                            setEmployeeLoading(emp.id, null);
                          }
                        }}
                        className="w-[42px] h-[42px] rounded-full items-center justify-center border"
                        style={{
                          backgroundColor: isPresentBtn ? '#4AA388' : 'transparent',
                          borderColor: isPresentBtn ? '#4AA388' : isAbsentBtn ? '#C0C0C0' : '#4AA388',
                          opacity: (selfScanned || (loadingAction !== null && loadingAction !== 'scanning')) ? 0.5 : 1,
                        }}
                      >
                        {loadingAction === 'scanning' ? (
                          <ActivityIndicator size="small" color={isPresentBtn ? '#FFF' : '#4AA388'} />
                        ) : (
                          <Ionicons
                            name="checkmark"
                            size={24}
                            color={isPresentBtn ? '#FFF' : isAbsentBtn ? '#C0C0C0' : '#4AA388'}
                          />
                        )}
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
            <Pressable
              onPress={async () => {
                if (isProceeding) return;
                // Validate all employees at this stop have a resolved attendance record —
                // includes ones already self-marked absent before the driver even arrived,
                // not just ones acted on in this session (driverMarkedIds/selfScannedIds).
                const unmarked = employeesAtCurrentStop.filter((e) => !e.hasRecord);
                if (unmarked.length > 0) {
                  toast.show(
                    <CustomToast
                      type="error"
                      message={tr('markAllAttendance')}
                    />,
                    { duration: 3500, position: 'top', backgroundColor: '#ff4545' },
                  );
                  return;
                }

                if (!activeTrip) return;

                // Capture next stop before the API call so cache updates can't change it.
                const nextDrivingStop = nextStopAfterCurrent;

                try {
                  await proceedFromStop({ tripId: activeTrip.id }).unwrap();
                } catch {
                  Alert.alert('Error', tr('failedProceed'));
                  return;
                }

                // Only after a successful 200: close sheet and open Google Maps.
                arrivedStopSheetRef.current?.close();
                setAttendanceStopId(null);

                if (nextDrivingStop) {
                  openInMaps(nextDrivingStop);
                }
              }}
              disabled={isProceeding}
              className="bg-[#FF5A00] flex-row items-center justify-center py-6 rounded-xl active:opacity-90 disabled:opacity-70"
            >
              {isProceeding && (
                <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
              )}
              <Text className="text-white text-[17px] font-bold mr-1">
                {isProceeding ? tr('proceeding') : tr('proceedNextStop')}
              </Text>
            </Pressable>
          </BottomSheetScrollView>
        </BottomSheet>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 16,
  },
  titleText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
  },
  subtitleText: {
    marginTop: 4,
    fontSize: 14,
    color: '#6B7280',
  },
  cardOuter: {
    marginBottom: 20,
  },
  cardInner: {
    borderRadius: 24,
    backgroundColor: '#EDEDEB',
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconPill: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  cardLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: '#6B7280',
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginTop: 2,
  },
  etaPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#000000',
  },
  etaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addressText: {
    marginTop: 4,
    fontSize: 13,
    color: '#4B5563',
  },
  sectionHeader: {
    marginBottom: 8,
  },
  sectionHeaderLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  employeesCard: {
    borderRadius: 20,
    backgroundColor: '#F5F5F2',
    marginBottom: 24,
    overflow: 'hidden',
  },
  employeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  employeeRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(156, 163, 175, 0.4)',
  },
  employeeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  employeeAvatarSecond: {
    width: 55,
    height: 55,
    borderRadius: 12,
    backgroundColor: "#a3a3a3",
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  employeeAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  employeeInfo: {
    flex: 1,
    minWidth: 0,
  },
  employeeName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  employeeStatus: {
    marginTop: 2,
    fontSize: 12,
    color: '#6B7280',
  },
  employeeAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideWrapper: {
    marginTop: 4,
  },
});

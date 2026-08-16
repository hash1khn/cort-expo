import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, AppState, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from "@react-native-vector-icons/feather/static";
import Ionicons from "@react-native-vector-icons/ionicons/static";
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import {
  useGetTripEmployeesQuery,
  useGetTripAttendanceQuery,
  useSubmitReturnAttendanceMutation,
  useCompleteTripMutation,
  useStartTripMutation,
  useArriveAtStopMutation,
  useProceedFromStopMutation,
  getCurrentStopId,
  TripEmployee,
} from '../services/shuttleApi';
import { useActiveTrip } from '../hooks/useActiveTrip';
import { openInMaps } from '../utils/openInMaps';
import { colors, fontFamily } from '@/core/theme';
import { useToast } from '@/shared/ui/molecules/Toast';
import { CustomToast } from '@/features/shared/components/CustomToast';
import { useLanguage } from '@/i18n/useLanguage';
import { buildRtlSectionTitleStyle, buildRtlSmallSubtitleTextStyle } from '@/i18n/types';
import * as Location from 'expo-location';
import { useRiderLocationTracking } from '@/hooks/useRiderLocationTracking';
import { LocationDisclosureModal } from '@/components/LocationDisclosureModal';
import { BackButton } from '@/components/BackButton';
import { useAppSelector } from '@/store/hooks';
import { socketService } from '@/services/socket.service';

const AppText = ({ style, ...props }: any) => (
  <Text style={[{ fontFamily }, style]} {...props} />
);

type EmployeeStatus = 'present' | 'absent' | null;

type ReturnEmployee = {
  id: string;
  name: string;
  number: string;
  status: EmployeeStatus;
  stopId: number | null;
};

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function Return() {
  const { tripId: tripIdParam } = useLocalSearchParams<{ tripId?: string }>();
  const preferredTripId = tripIdParam ? Number.parseInt(tripIdParam, 10) : null;
  const safePreferredTripId = Number.isNaN(preferredTripId ?? NaN) ? null : preferredTripId;
  const { t, isRTL, language } = useLanguage();
  const tr = (key: string) => t(`shuttle:return.${key}`);
  const toast = useToast();
  const {
    activeTrip,
    tripId,
    stops,
    displayStops,
    officeStop,
    currentStop,
    nextStopAfterCurrent,
    isLastStop,
    rideStarted,
    isLoading: isTripsLoading,
    refetch: refetchActiveTrip,
  } = useActiveTrip(safePreferredTripId);
  const userId = useAppSelector((s) => s.auth.user?.id ?? '');

  // The last stop still needs its own "Mark as Arrived" confirmation like any
  // other stop — the trip's current stop only catches up to equal the last
  // stop's own id (with status EN_ROUTE) once arriveAtStop + proceedFromStop
  // have actually run for it. Only then does the button switch to "Complete
  // Trip". Must resolve via getCurrentStopId, not the raw current_stop_id
  // field — a daily-override stop is tracked in current_override_stop_id
  // instead (current_stop_id is FK'd to real route_stops and stays null for
  // one), so comparing the raw field never matched and this flag got stuck
  // false forever whenever the last stop was an override.
  const lastStopDropConfirmed =
    isLastStop
    && getCurrentStopId(activeTrip) === currentStop?.id
    && activeTrip?.current_stop_status === 'EN_ROUTE';

  // Join the ride socket room as driver so the background location task's
  // socketService.sendLocationUpdate() is broadcast to employees in real time.
  // Without this, socket.role is never set to 'driver' and the gateway silently
  // drops every location:update, falling back to batch HTTP uploads only.
  useEffect(() => {
    if (!tripId || !userId) return;
    socketService.joinRide(tripId, userId, 'driver', 'shuttle');
    return () => {
      socketService.leaveRide();
    };
  }, [tripId, userId]);

  const { data: realTripEmployeesRaw = [], isLoading: isEmployeesLoading } = useGetTripEmployeesQuery(
    tripId as number,
    { skip: !tripId },
  );
  const { data: tripAttendance = [], isLoading: isAttendanceLoading } = useGetTripAttendanceQuery(
    tripId as number,
    { skip: !tripId },
  );

  const tripEmployeesRaw = realTripEmployeesRaw;
  const [submitReturnAttendance, { isLoading: isSubmitting }] = useSubmitReturnAttendanceMutation();
  const [completeTrip, { isLoading: isCompletingTrip }] = useCompleteTripMutation();
  const [startTrip, { isLoading: isStartingTrip }] = useStartTripMutation();
  const [arriveAtStop, { isLoading: isArrivingAtStop }] = useArriveAtStopMutation();
  const [proceedFromStop, { isLoading: isProceeding }] = useProceedFromStopMutation();

  const isActionLoading = isSubmitting || isStartingTrip || isArrivingAtStop || isProceeding || isCompletingTrip;

  const {
    startTracking,
    stopTracking,
    needsDisclosure,
    onDisclosureAccept,
    onDisclosureDecline,
  } = useRiderLocationTracking();

  // Track present/absent per employee for the return trip.
  const [employees, setEmployees] = useState<ReturnEmployee[]>([]);
  const [sliderKey, setSliderKey] = useState(0);
  const [locationPermissionWarning, setLocationPermissionWarning] = useState<
    'foreground' | 'background' | null
  >(null);

  // rideStarted (from useActiveTrip, derived off activeTrip.started_at) is the single
  // source of truth for crash recovery — no local mirror state needed, same as morning's
  // RideInProgress.tsx.
  useEffect(() => {
    if (!tripEmployeesRaw.length) return;
    // Wait for attendance logs if the trip is already started
    if (rideStarted && isAttendanceLoading) return;

    setEmployees((prev) => {
      // Initialize only once when we get data for this trip
      if (prev.length > 0) return prev;

      const attendanceMap = new Map();
      if (rideStarted) {
        tripAttendance.forEach((log) => {
          attendanceMap.set(log.employeeId, log);
        });
      }

      return tripEmployeesRaw.map((emp: TripEmployee) => {
        let status: EmployeeStatus = null;

        if (rideStarted) {
          const log = attendanceMap.get(emp.id);
          if (log) {
            const normalized = log.status?.toUpperCase();
            if (normalized === 'PRESENT' || normalized === 'BOARDED') {
              status = 'present';
            } else if (normalized === 'ABSENT') {
              status = 'absent';
            }
          } else {
            // If a trip started but an employee has no log, they are absent by default
            status = 'absent';
          }
        }

        return {
          id: emp.id,
          name: emp.fullName,
          number: emp.phone ?? '',
          status,
          stopId: emp.pickupStopId,
        };
      });
    });
  }, [tripEmployeesRaw, rideStarted, tripAttendance, isAttendanceLoading]);

  // Live preview of which stops would be skipped, computed purely from the driver's
  // in-progress tick/cross taps — before "Begin Ride", nothing has been submitted to
  // the server yet, so the real `displayStops` (server-truth `excluded_stops`) can't
  // reflect this. A stop shows as skipped once every employee assigned to it has been
  // explicitly marked absent; unmarked employees never cause a false "skipped" preview.
  const previewDisplayStops = useMemo(() => {
    const navigableEntries = stops.map((stop) => {
      const stopEmployees = employees.filter((e) => e.stopId === stop.id);
      const skipped = stopEmployees.length > 0 && stopEmployees.every((e) => e.status === 'absent');
      return { id: stop.id, name: stop.name, eta: stop.eta, skipped, isOffice: false };
    });
    return officeStop ? [officeStop, ...navigableEntries] : navigableEntries;
  }, [stops, employees, officeStop]);

  // Once the ride has started, switch to the real server-computed list (same as
  // morning's RideInProgress.tsx) so the current-stop highlight advances as the
  // driver marks arrived/proceeds through the route.
  const routeOverviewStops = rideStarted ? displayStops : previewDisplayStops;

  const handleSlideReturnTrip = useCallback(async () => {
    if (!tripId) {
      router.push('/shuttle');
      return;
    }

    // First tap: submit bulk return attendance, start the trip, and open Maps for
    // the first stop only — subsequent stops are handled one at a time below, the
    // same way morning's RideInProgress.tsx walks through its route.
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
          t('common:locationRequired'),
          t('common:locationDeniedMessage'),
          [
            { text: t('common:cancel'), style: 'cancel' },
            { text: t('common:openSettings'), onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }

      if (!employees.length) {
        router.push('/shuttle');
        return;
      }

      // Validate that all employees have been marked
      const unmarked = employees.filter((e) => e.status === null);
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

      try {
        // Location / disclosure flow first; server writes only after tracking is live
        // so denying OS permission or the disclosure sheet cannot leave a started ride.
        const afterTrackingReady = async () => {
          await submitReturnAttendance({
            shuttleTripId: tripId,
            entries: employees.map((emp) => ({
              employee_id: emp.id,
              status: emp.status === 'present' ? 'PRESENT' : 'ABSENT',
            })),
          }).unwrap();

          if (activeTrip?.route_id) {
            let driverLat: number | undefined;
            let driverLng: number | undefined;
            try {
              const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
              });
              driverLat = loc.coords.latitude;
              driverLng = loc.coords.longitude;
            } catch (error) {
              console.warn('Could not fetch location:', error);
            }

            const result = await startTrip({
              route_id: activeTrip.route_id,
              direction: 'EVENING',
              lat: driverLat,
              lng: driverLng,
            }).unwrap();

            // Fire-and-forget: bring route_stops/excluded_stops fully up to date for the
            // Route Overview list — startTrip's own onQueryStarted deliberately only patches
            // started_at/status/route_id/direction (see its comment), not the stop lists, so
            // without this refetch the UI would keep showing the pre-submission stop state
            // (every stop non-skipped) even though the bulk attendance just submitted above
            // already changed which stops are excluded server-side. Not awaited: the Maps
            // handoff below already has everything it needs from `result`.
            refetchActiveTrip();

            // Stops where every assigned employee is absent are excluded server-side;
            // first_stop is the resolved first navigable stop (null only if the whole
            // route is absent today) — same as morning's goToFirstStop.
            if (result.first_stop) {
              openInMaps(result.first_stop);
            }
          }

          setSliderKey((k) => k + 1);
        };

        const trackingStarted = await startTracking(tripId, afterTrackingReady, 'shuttle');
        if (!trackingStarted) {
          // Disclosure still open, or permission flow incomplete — let user retry.
          setSliderKey((k) => k + 1);
          return;
        }
      } catch (err: unknown) {
        // Prefer server message (e.g. office-end lock) when present.
        const apiMessage =
          err && typeof err === 'object' && 'data' in err
            ? (err as { data?: { message?: string | string[] } }).data?.message
            : undefined;
        const message = Array.isArray(apiMessage)
          ? apiMessage[0]
          : typeof apiMessage === 'string'
            ? apiMessage
            : tr('couldNotStartRide');
        toast.show(
          <CustomToast type="error" message={message} />,
          { duration: 4000, position: 'top', backgroundColor: '#ff4545' }
        );
        setSliderKey((k) => k + 1);
      }
      return;
    }

    if (!currentStop || !stops.length) {
      return;
    }

    // Last stop: "Mark as Arrived" first, same as any other stop — this
    // confirms its drop-off with a real timestamp instead of relying on the
    // straggler sweep. Only once that's done does the button become
    // "Complete Trip", tapped later once the driver is actually home.
    if (isLastStop) {
      if (!lastStopDropConfirmed) {
        // Same confirmation as any other stop — no Maps hand-off, there's no next stop.
        try {
          await arriveAtStop({ tripId, current_stop_id: currentStop.id }).unwrap();
          await proceedFromStop({ tripId }).unwrap();
        } catch {
          toast.show(
            <CustomToast type="error" message={tr('failedArrive')} />,
            { duration: 4000, position: 'top', backgroundColor: '#ff4545' }
          );
        }
        return;
      }

      // Driver has reached home and is ending the trip for real.
      try {
        await completeTrip({
          tripId,
          total_distance: 0,
        }).unwrap();
        await stopTracking().catch(console.warn);
        router.push('/shuttle');
      } catch {
        // A toast alone is too easy to miss (e.g. driver already looked away,
        // or the app was backgrounded while the request was in flight) — that's
        // how a failed "complete trip" can go unnoticed and look like it silently
        // worked. A blocking alert forces acknowledgment before the driver can
        // move on, same as the morning trip screen already does for this case.
        Alert.alert(tr('failedCompleteTitle'), tr('failedComplete'), [{ text: 'OK' }]);
        // Stay on screen and let the user retry; remount slider so it resets.
        setSliderKey((k) => k + 1);
      }
      return;
    }

    // Middle stop: mark arrived (flips this stop's present employees to
    // DROPPED_OFF server-side — the manual replacement for the old GPS geofence),
    // then hand off to Maps for the next stop. No attendance sheet here — everyone
    // was already marked present/absent before the ride began.
    try {
      await arriveAtStop({ tripId, current_stop_id: currentStop.id }).unwrap();
      await proceedFromStop({ tripId }).unwrap();
      if (nextStopAfterCurrent) {
        openInMaps(nextStopAfterCurrent);
      }
    } catch {
      toast.show(
        <CustomToast type="error" message={tr('failedArrive')} />,
        { duration: 4000, position: 'top', backgroundColor: '#ff4545' }
      );
    }
  }, [
    tripId,
    activeTrip?.route_id,
    activeTrip?.current_stop_id,
    activeTrip?.current_stop_status,
    employees,
    rideStarted,
    isLastStop,
    currentStop,
    nextStopAfterCurrent,
    stops.length,
    submitReturnAttendance,
    startTrip,
    refetchActiveTrip,
    startTracking,
    stopTracking,
    completeTrip,
    arriveAtStop,
    proceedFromStop,
    toast,
    t,
  ]);

  const handleMarkPresent = useCallback((employeeId: string) => {
    setEmployees((prev) =>
      prev.map((e) =>
        e.id === employeeId ? { ...e, status: 'present' as const } : e
      )
    );
  }, []);

  const handleMarkAbsent = useCallback((employeeId: string) => {
    setEmployees((prev) =>
      prev.map((e) =>
        e.id === employeeId ? { ...e, status: 'absent' as const } : e
      )
    );
  }, []);

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

  // Catch permission changes that happen while the app is merely backgrounded
  // (OS/OEM auto-revoke, user editing Settings and switching back) rather than
  // only re-checking on React Navigation focus events.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        let cancelled = false;
        checkLocationPermission(() => cancelled);
      }
    });
    return () => subscription.remove();
  }, [checkLocationPermission]);

  // We should also suspend the screen UI while attendance is loading on crash recovery
  if (isTripsLoading || isEmployeesLoading || (rideStarted && isAttendanceLoading)) {
    return (
      <SafeAreaView className="flex-1 bg-[#FFFFFF]" edges={['top']}>
        <LocationDisclosureModal
          visible={needsDisclosure}
          onAccept={onDisclosureAccept}
          onDecline={onDisclosureDecline}
        />
        <View className="flex-row items-center gap-2 ml-[-4px] px-6 mb-3">
          <View className="w-6 h-6 rounded-full bg-[#EDEDEB]" />
        </View>

        <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
          {/* Title skeleton */}
          <View className="mb-6 mt-2">
            <View className="h-10 w-48 rounded-2xl bg-[#EDEDEB] mb-2" />
          </View>

          {/* Section header skeleton */}
          <View className="mb-6">
            <View className="h-6 w-32 rounded-xl bg-[#EDEDEB] mb-2" />
            <View className="h-4 w-64 rounded-xl bg-[#EDEDEB] mb-6" />

            {/* Employee rows skeleton */}
            {[1, 2, 3, 4, 5].map((i) => (
              <View key={i} className="flex-row items-center py-4 border-b border-black/5">
                <View className="w-14 h-14 rounded-full bg-[#EDEDEB] mr-3" />
                <View className="flex-1 gap-2">
                  <View className="h-4 w-32 rounded-lg bg-[#EDEDEB]" />
                  <View className="h-3 w-24 rounded-lg bg-[#EDEDEB]" />
                </View>
                <View className="flex-row gap-3">
                  <View className="w-[42px] h-[42px] rounded-full bg-[#EDEDEB]" />
                  <View className="w-[42px] h-[42px] rounded-full bg-[#EDEDEB]" />
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Bottom button skeleton */}
        <View className="absolute bottom-16 left-5 right-5 gap-2">
          {locationPermissionWarning && (
            <View className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
              <AppText className="text-[13px] text-amber-900 leading-[18px]">
                {locationPermissionWarning === 'background'
                  ? t('common:locationBackgroundHint')
                  : t('common:locationForegroundHint')}
              </AppText>
              <Pressable onPress={() => Linking.openSettings()} className="mt-2 self-start">
                <AppText className="text-[13px] font-semibold text-amber-950">
                  {t('common:openSettings')}
                </AppText>
              </Pressable>
            </View>
          )}
          <View className="h-[60px] w-full rounded-xl bg-[#EDEDEB]" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#FFFFFF]" edges={['top']}>
      <LocationDisclosureModal
        visible={needsDisclosure}
        onAccept={onDisclosureAccept}
        onDecline={onDisclosureDecline}
      />
      {!rideStarted && (
        <BackButton
          onPress={() => router.back()}
          anchored={false}
          className={`mb-3 mt-3 px-6 ${isRTL ? 'self-end' : 'self-start ml-[-4px]'}`}
        />
      )}
      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Title */}

        <View className="mb-3">
          <AppText className={`text-[34px] font-bold text-black ${isRTL ? 'ml-auto' : ''}`}>
            {tr('title')}
          </AppText>
        </View>

        {/* Attendance section */}
        <View
          className={`mb-6 ${isRTL ? 'items-end' : ''}`}
          style={isRTL ? { overflow: 'visible' } : undefined}
        >
          <AppText
            className={`mb-1 text-black ${isRTL ? 'font-bold' : 'text-xl font-bold'}`}
            style={buildRtlSectionTitleStyle(language)}
          >
            {tr('markAttendance')}
          </AppText>
          <AppText
            className={`mb-4 text-[#6B7280] ${isRTL ? '' : 'text-sm'}`}
            style={buildRtlSmallSubtitleTextStyle(language)}
          >
            {tr('markAttendanceSubtitle')}
          </AppText>

          <View className="overflow-hidden">
            {employees.map((emp, index) => (
              <View
                key={emp.id}
                className="flex-row items-center py-4 p"
                style={
                  index < employees.length - 1
                    ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(156,163,175,0.35)' }
                    : undefined
                }
              >
                <View
                  className="w-14 h-14 rounded-full items-center justify-center mr-3 bg-gray-200"
                  style={{
                    borderWidth: 2,
                    borderColor: '#FF5A00'
                  }}
                >
                  <AppText className="text-black font-semibold text-lg">
                    {getInitials(emp.name)}
                  </AppText>
                </View>
                <View className="flex-1 min-w-0 mr-2">
                  <AppText className="text-black font-bold text-[17px]" numberOfLines={1}>
                    {emp.name}
                  </AppText>
                  <View className="flex-row items-center mt-1">
                    <AppText className="text-[#8E8E93] text-[15px] mr-2" numberOfLines={1}>
                      {emp.number || 'No number'}
                    </AppText>
                  </View>
                </View>
                <View className="flex-row gap-3">
                  <Pressable
                    disabled={rideStarted}
                    onPress={() => handleMarkAbsent(emp.id)}
                    className="w-[42px] h-[42px] rounded-full items-center justify-center border "
                    style={{
                      backgroundColor: emp.status === 'absent' ? '#D27360' : 'transparent',
                      borderColor: emp.status === 'absent' ? '#D27360' : emp.status === 'present' ? '#C0C0C0' : '#D27360',
                      opacity: rideStarted ? 0.5 : 1,
                    }}
                  >
                    <Ionicons
                      name="close"
                      size={24}
                      color={emp.status === 'absent' ? '#FFF' : emp.status === 'present' ? '#C0C0C0' : '#D27360'}
                    />
                  </Pressable>
                  <Pressable
                    disabled={rideStarted}
                    onPress={() => handleMarkPresent(emp.id)}
                    className="w-[42px] h-[42px] rounded-full items-center justify-center border"
                    style={{
                      backgroundColor: emp.status === 'present' ? '#4AA388' : 'transparent',
                      borderColor: emp.status === 'present' ? '#4AA388' : emp.status === 'absent' ? '#C0C0C0' : '#4AA388',
                      opacity: rideStarted ? 0.5 : 1,
                    }}
                  >
                    <Ionicons
                      name="checkmark"
                      size={24}
                      color={emp.status === 'present' ? '#FFF' : emp.status === 'absent' ? '#C0C0C0' : '#4AA388'}
                    />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Route Overview */}
        <View className="mb-6">
          <AppText
            className={`mb-6 text-black ${isRTL ? 'font-bold' : 'text-xl font-bold'}`}
            style={buildRtlSectionTitleStyle(language)}
          >
            {tr('routeOverview')}
          </AppText>
          <View className="ml-2">
            {routeOverviewStops.map((stop, index) => {
              // Office is where the driver actually is pre-ride, so it's "current" until
              // Begin Ride is tapped — then the highlight hands off to whichever real stop
              // the driver is heading to/at, same mechanism morning already uses. Once the
              // last stop's drop-off is confirmed, the highlight hands off again to the
              // Home step below rather than staying stuck on the last stop.
              const isCurrent = stop.isOffice
                ? !rideStarted
                : rideStarted && !stop.skipped && currentStop?.id === stop.id && !lastStopDropConfirmed;

              return (
                <View key={stop.id || index} className="flex-row items-start">
                  <View className="items-center mr-4">
                    <View
                      className={`rounded-full shadow-sm items-center justify-center ${
                        stop.skipped ? 'w-4 h-4 bg-[#D32F2F]' : isCurrent ? 'w-5 h-5 bg-[#FF5A00]' : 'w-4 h-4 bg-[#A3A3A3]'
                      }`}
                      style={{ borderWidth: isCurrent ? 4 : 3, borderColor: '#FFF' }}
                    />
                    {/* Always connects onward — the Home step below is appended after every stop. */}
                    <View className={`w-[2px] h-12 my-1 ${isCurrent ? 'bg-[#FF5A00]' : 'bg-[#E5E5E5]'}`} />
                  </View>
                  <View className={`flex-1 ${isCurrent ? 'mt-[-4px]' : 'mt-[-2px]'}`}>
                    {stop.skipped ? (
                      <AppText className="text-[17px] font-medium text-[#9CA3AF]">
                        <AppText style={{ textDecorationLine: 'line-through' }}>{stop.name}</AppText>
                        {'  '}
                        <AppText className="font-extrabold" style={{ color: colors.red }}>Skipped</AppText>
                      </AppText>
                    ) : (
                      <>
                        <AppText className={`text-[17px] ${isCurrent ? 'font-bold text-black' : 'font-medium text-[#6B7280]'}`}>
                          {stop.name}
                          {stop.isOffice && (
                            <AppText className="text-[13px] font-semibold text-[#9CA3AF]">
                              {'  '}({tr('officeStart')})
                            </AppText>
                          )}
                        </AppText>
                        {stop.eta && (
                          <AppText className="text-[13px] font-medium text-[#9CA3AF] mt-0.5">{stop.eta}</AppText>
                        )}
                      </>
                    )}
                  </View>
                </View>
              );
            })}
            {/* Final step, symbolic rather than a real route_stop — the driver drives home
                after the last stop and taps Complete Trip there, not at the last stop itself. */}
            <View className="flex-row items-start">
              <View className="items-center mr-4">
                <View
                  className={`rounded-full shadow-sm items-center justify-center ${
                    lastStopDropConfirmed ? 'w-5 h-5 bg-[#FF5A00]' : 'w-4 h-4 bg-[#A3A3A3]'
                  }`}
                  style={{ borderWidth: lastStopDropConfirmed ? 4 : 3, borderColor: '#FFF' }}
                >
                  <Ionicons name="home" size={lastStopDropConfirmed ? 11 : 9} color="#FFF" />
                </View>
              </View>
              <View className={`flex-1 ${lastStopDropConfirmed ? 'mt-[-4px]' : 'mt-[-2px]'}`}>
                <AppText className={`text-[17px] ${lastStopDropConfirmed ? 'font-bold text-black' : 'font-medium text-[#6B7280]'}`}>
                  {tr('homeAfterStop')}
                </AppText>
              </View>
            </View>
          </View>
        </View>

        {/* Slide to complete */}
        {/* <View className="mb-8">
          <SlideToStartTrip
            key={sliderKey}
            label={rideStarted ? 'Slide to complete trip' : 'Slide to begin trip'}
            onComplete={handleSlideReturnTrip}
          />
        </View> */}
      </ScrollView>

      <View className="absolute bottom-16 left-5 right-5 pointer-events-auto gap-2">
        {locationPermissionWarning && (
          <View className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
            <AppText className="text-[13px] text-amber-900 leading-[18px]">
              {locationPermissionWarning === 'background'
                ? t('common:locationBackgroundHint')
                : t('common:locationForegroundHint')}
            </AppText>
            <Pressable onPress={() => Linking.openSettings()} className="mt-2 self-start">
              <AppText className="text-[13px] font-semibold text-amber-950">
                {t('common:openSettings')}
              </AppText>
            </Pressable>
          </View>
        )}
        <Pressable
          onPress={handleSlideReturnTrip}
          disabled={
            isActionLoading
            || (!rideStarted && locationPermissionWarning !== null)
          }
          className="bg-[#FF5A00] flex-row items-center justify-center py-4 rounded-xl active:opacity-90"
          style={{
            opacity:
              isActionLoading
              || (!rideStarted && locationPermissionWarning !== null)
                ? 0.5
                : 1,
          }}
        >
          {isActionLoading && (
            <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
          )}
          <AppText className="text-white text-[17px] font-bold mr-1">
            {rideStarted
              ? (lastStopDropConfirmed
                ? (isActionLoading ? tr('completing') : tr('completeTrip'))
                : (isActionLoading ? tr('markingArrived') : tr('markAsArrived')))
              : (isActionLoading ? tr('beginning') : tr('beginRide'))}
          </AppText>
          {/* <Ionicons name="chevron-forward" size={22} color="#FFF" /> */}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

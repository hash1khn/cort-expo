import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  useScanPassengerMutation,
  useMarkPassengerAbsentMutation,
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

// One row shape, used to render whichever office's attendance is currently nested
// under its own row in Route Overview — the pre-trip start office before Begin Ride,
// or whichever office the driver has just arrived at mid-route. Local-only: tapping
// never hits an API, the whole roster is submitted as one bulk call elsewhere.
function AttendanceRow({
  emp,
  isLast,
  onMarkAbsent,
  onMarkPresent,
  disabled = false,
}: {
  emp: ReturnEmployee;
  isLast: boolean;
  onMarkAbsent: (id: string) => void;
  onMarkPresent: (id: string) => void;
  /** Read-only historical view — this office's attendance was already submitted
   *  (pre-trip, or a prior mid-route arrival) and just stays visible for reference. */
  disabled?: boolean;
}) {
  return (
    <View
      className="flex-row items-center py-4"
      style={
        !isLast
          ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(156,163,175,0.35)' }
          : undefined
      }
    >
      <View
        className="w-14 h-14 rounded-full items-center justify-center mr-3 bg-gray-200"
        style={{ borderWidth: 2, borderColor: '#FF5A00' }}
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
          disabled={disabled}
          onPress={() => onMarkAbsent(emp.id)}
          className="w-[42px] h-[42px] rounded-full items-center justify-center border"
          style={{
            backgroundColor: emp.status === 'absent' ? '#D27360' : 'transparent',
            borderColor: emp.status === 'absent' ? '#D27360' : emp.status === 'present' ? '#C0C0C0' : '#D27360',
            opacity: disabled ? 0.6 : 1,
          }}
        >
          <Ionicons
            name="close"
            size={24}
            color={emp.status === 'absent' ? '#FFF' : emp.status === 'present' ? '#C0C0C0' : '#D27360'}
          />
        </Pressable>
        <Pressable
          disabled={disabled}
          onPress={() => onMarkPresent(emp.id)}
          className="w-[42px] h-[42px] rounded-full items-center justify-center border"
          style={{
            backgroundColor: emp.status === 'present' ? '#4AA388' : 'transparent',
            borderColor: emp.status === 'present' ? '#4AA388' : emp.status === 'absent' ? '#C0C0C0' : '#4AA388',
            opacity: disabled ? 0.6 : 1,
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
  );
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
  // Shared by the office-roster init effect below and the historical (read-only,
  // post-Proceed) roster render — hoisted so it's built once per tripAttendance
  // change instead of once per office row on every render.
  const attendanceByEmployeeId = useMemo(
    () => new Map(tripAttendance.map((log) => [log.employeeId, log])),
    [tripAttendance],
  );
  const [submitReturnAttendance, { isLoading: isSubmitting }] = useSubmitReturnAttendanceMutation();
  const [completeTrip, { isLoading: isCompletingTrip }] = useCompleteTripMutation();
  const [startTrip, { isLoading: isStartingTrip }] = useStartTripMutation();
  const [arriveAtStop, { isLoading: isArrivingAtStop }] = useArriveAtStopMutation();
  const [proceedFromStop, { isLoading: isProceeding }] = useProceedFromStopMutation();

  // The office-confirm tap runs submitReturnAttendance THEN proceedFromStop, sequentially
  // awaited — two independent RTK Query mutations, each with its own isLoading flag. Right
  // between them (first one's isLoading has already dropped to false, second one's hasn't
  // flipped true yet) there's a real gap where isActionLoading itself is false, even though
  // the driver's tap is still very much in flight — during that gap the button falls back to
  // its plain, non-loading label for a beat. This flag spans the whole sequence as one
  // atomic operation from the UI's perspective, closing that gap.
  const [isConfirmingOffice, setIsConfirmingOffice] = useState(false);

  const isActionLoading =
    isSubmitting || isStartingTrip || isArrivingAtStop || isProceeding || isCompletingTrip || isConfirmingOffice;

  // ── Mid-route OFFICE stop attendance (evening equivalent of RideInProgress.tsx's
  // morning PICKUP attendance sheet) — an additional office stop (2nd, 3rd...) on a
  // multi-office route requires attendance just like a home stop does in the morning,
  // scoped to whichever employees board from that specific office (office_stop_id).
  //
  // No modal here — the roster renders inline, nested under this stop's own row in
  // Route Overview below, exactly like the first office's roster nests under its row.
  // And no per-tap API call: tick/cross only update local state; the actual
  // submitReturnAttendance (bulk) call fires once, from handleSlideReturnTrip, when the
  // driver taps the main action button — same "accumulate locally, commit as one batch"
  // shape the pre-trip office already uses, instead of the morning pickup sheet's
  // per-tap immediacy (which exists there for a reason that doesn't apply here:
  // self-scan boarding, the thing that needs instant server-truth, is disabled for the
  // whole evening direction).
  //
  // Derived straight from server state (current_stop_status/currentStop), not a local
  // "sheet open" flag — so on app relaunch mid-attendance this is simply true again on
  // its own, no explicit crash-recovery re-open step needed.
  const isAtOfficeAwaitingAttendance =
    rideStarted
    && currentStop?.stopType === 'OFFICE'
    && getCurrentStopId(activeTrip) === currentStop?.id
    && activeTrip?.current_stop_status === 'AT_STOP';

  // Clears isConfirmingOffice only once a render actually observes that
  // isAtOfficeAwaitingAttendance has flipped false — NOT the instant our own
  // `.unwrap()` promise resolves. Those are two independent things racing off the same
  // proceedFromStop request (our await, vs. its onQueryStarted patching current_stop_status
  // into the cache), with no guaranteed order between them; clearing the flag from the
  // handler itself can win that race and reopen the exact gap this flag exists to close.
  useEffect(() => {
    if (isConfirmingOffice && !isAtOfficeAwaitingAttendance) {
      setIsConfirmingOffice(false);
    }
  }, [isConfirmingOffice, isAtOfficeAwaitingAttendance]);

  // Snapshot of every office's roster+status, taken the instant it's actually confirmed
  // (Begin Ride's bulk submit for the first office, or a mid-route Confirm & Proceed for
  // any later office) — keyed by office stop id. Historical rows read from here first,
  // never from tripAttendance directly: we already know the exact values we just
  // submitted, so there's no reason to wait for that submission's own invalidation to
  // round-trip back through a refetch before displaying it. That round trip is a real,
  // observable gap (submitReturnAttendance's tag invalidation kicks off a background
  // refetch that isn't awaited anywhere in this flow) during which attendanceByEmployeeId
  // can still be missing some or all of the records we just wrote, which is what was
  // rendering as tick/cross going blank right after a confirm. Falls back to
  // attendanceByEmployeeId only for a stop with no local snapshot at all (e.g. the driver
  // force-quit and reopened mid-trip, so this state is gone and server truth is all
  // that's left) — see isHistoricalOfficeRow below.
  const [confirmedOfficeRosters, setConfirmedOfficeRosters] = useState<Record<number, ReturnEmployee[]>>({});

  const [officeSheetEmployees, setOfficeSheetEmployees] = useState<ReturnEmployee[]>([]);
  // Which stop officeSheetEmployees was last (re)built for — guards the init effect
  // below so it only runs once per arrival, not on every tripAttendance refetch while
  // attendance is pending (which would otherwise clobber in-progress local taps).
  const initializedOfficeStopIdRef = useRef<number | null>(null);

  // Set the instant an office-confirm tap determines (via computeNextNavigableStopAfter,
  // using the same live-preview data already driving the "Skipped" labels) that nothing
  // navigable is left. The real, server-truth `lastStopDropConfirmed` below needs
  // route_stops/excluded_stops to actually refetch and reflect this stop's just-submitted
  // absences before it agrees — a real network round trip, not instant. Without this
  // override the button falls through to "Mark as Arrived" for that whole gap (current
  // AT_STOP has already cleared, but isLastStop hasn't caught up yet) before correcting
  // itself to "Complete Trip". This skips straight there instead of visibly flickering.
  const [confirmedLastStopOverride, setConfirmedLastStopOverride] = useState(false);
  // Drives every DISPLAY use of "have we reached the point of showing Complete Trip"
  // (button label, stepper highlight, Home step styling) — the one CONTROL-FLOW use
  // (deciding whether a tap should call completeTrip vs arriveAtStop) deliberately keeps
  // using the plain server-truth value below, unaffected by this override.
  const effectiveLastStopDropConfirmed = lastStopDropConfirmed || confirmedLastStopOverride;

  // Initialize this office's roster once per arrival — pre-filling status from any
  // existing attendance record (crash-recovery: the driver reopened the app after a
  // Proceed tap that had already committed server-side) and leaving everyone else
  // unmarked, same as the pre-trip office's own initialization below.
  useEffect(() => {
    if (!isAtOfficeAwaitingAttendance || !currentStop) {
      initializedOfficeStopIdRef.current = null;
      return;
    }
    if (initializedOfficeStopIdRef.current === currentStop.id) return;
    if (isAttendanceLoading) return;

    const stopId = currentStop.id;
    initializedOfficeStopIdRef.current = stopId;
    const roster = tripEmployeesRaw.filter((emp: TripEmployee) => emp.officeStopId === stopId);
    setOfficeSheetEmployees(
      roster.map((emp) => {
        const log = attendanceByEmployeeId.get(emp.id);
        let status: EmployeeStatus = null;
        if (log) {
          const normalized = log.status?.toUpperCase();
          status = normalized === 'PRESENT' || normalized === 'BOARDED' ? 'present' : normalized === 'ABSENT' ? 'absent' : null;
        }
        return {
          id: emp.id,
          name: emp.fullName,
          number: emp.phone ?? '',
          status,
          stopId,
        };
      }),
    );
  }, [isAtOfficeAwaitingAttendance, currentStop, tripEmployeesRaw, attendanceByEmployeeId, isAttendanceLoading]);

  const handleMarkOfficeSheetPresent = useCallback((employeeId: string) => {
    setOfficeSheetEmployees((prev) =>
      prev.map((e) => (e.id === employeeId ? { ...e, status: 'present' as const } : e)),
    );
  }, []);

  const handleMarkOfficeSheetAbsent = useCallback((employeeId: string) => {
    setOfficeSheetEmployees((prev) =>
      prev.map((e) => (e.id === employeeId ? { ...e, status: 'absent' as const } : e)),
    );
  }, []);

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
  //
  // Scoped to the FIRST office stop's roster only (by evening_sequence — the one the
  // backend excludes from route_stops and surfaces via routes.office_stop / officeStop
  // here) — that's the only office whose attendance is handled upfront, before startTrip.
  // Any additional office stop on a multi-office route is a normal mid-route stop the
  // driver arrives at later; its riders get their attendance sheet then (see the office
  // attendance sheet below), not here. Employees with a null officeStopId (legacy/
  // pre-backfill assignments) fall back to belonging to this first office, matching the
  // backend's own fallback — this keeps single-office routes behaving exactly as before.
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

      const firstOfficeId = officeStop?.id ?? null;
      const firstOfficeRoster = firstOfficeId == null
        ? tripEmployeesRaw
        : tripEmployeesRaw.filter(
          (emp: TripEmployee) => emp.officeStopId == null || emp.officeStopId === firstOfficeId,
        );

      return firstOfficeRoster.map((emp: TripEmployee) => {
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
  }, [tripEmployeesRaw, rideStarted, tripAttendance, isAttendanceLoading, officeStop?.id]);

  // Live preview of which stops would be skipped, computed purely from the driver's
  // in-progress tick/cross taps — before "Begin Ride", nothing has been submitted to
  // the server yet, so the real `displayStops` (server-truth `excluded_stops`) can't
  // reflect this. A stop shows as skipped once every employee assigned to it has been
  // explicitly marked absent; unmarked employees never cause a false "skipped" preview.
  const previewDisplayStops = useMemo(() => {
    const navigableEntries = stops.map((stop) => {
      const stopEmployees = employees.filter((e) => e.stopId === stop.id);
      const skipped = stopEmployees.length > 0 && stopEmployees.every((e) => e.status === 'absent');
      return { id: stop.id, name: stop.name, eta: stop.eta, skipped, isOffice: stop.stopType === 'OFFICE' };
    });
    return officeStop ? [officeStop, ...navigableEntries] : navigableEntries;
  }, [stops, employees, officeStop]);

  // Same live-preview idea as previewDisplayStops above, but for mid-route: the
  // currently-open office's tick/cross taps (officeSheetEmployees) haven't been
  // submitted yet, so the server-truth `displayStops.skipped` can't reflect them
  // either — a home stop whose only rider was just marked absent here should show
  // as skipped immediately, not only after "Confirm attendance & proceed" round-trips
  // to the server. Server-confirmed skips (already-submitted offices) still come
  // through untouched via stop.skipped; this only ever adds a preview, never removes one.
  const effectiveStatusByEmployeeId = useMemo(() => {
    const map = new Map<string, EmployeeStatus>();
    tripAttendance.forEach((log) => {
      const normalized = log.status?.toUpperCase();
      map.set(
        log.employeeId,
        normalized === 'PRESENT' || normalized === 'BOARDED' ? 'present' : normalized === 'ABSENT' ? 'absent' : null,
      );
    });
    // Pending local edits for the office currently being marked win over server
    // truth — they haven't hit the server yet, so this is the freshest info we have.
    officeSheetEmployees.forEach((emp) => {
      map.set(emp.id, emp.status);
    });
    return map;
  }, [tripAttendance, officeSheetEmployees]);

  const displayStopsWithLivePreview = useMemo(() => {
    if (!isAtOfficeAwaitingAttendance) return displayStops;
    return displayStops.map((stop) => {
      if (stop.skipped || stop.isOffice) return stop;
      const occupants = tripEmployeesRaw.filter((emp: TripEmployee) => emp.pickupStopId === stop.id);
      const livePreviewSkipped =
        occupants.length > 0 && occupants.every((emp) => effectiveStatusByEmployeeId.get(emp.id) === 'absent');
      return livePreviewSkipped ? { ...stop, skipped: true } : stop;
    });
  }, [displayStops, isAtOfficeAwaitingAttendance, tripEmployeesRaw, effectiveStatusByEmployeeId]);

  // Once the ride has started, switch to the real server-computed list (same as
  // morning's RideInProgress.tsx) so the current-stop highlight advances as the
  // driver marks arrived/proceeds through the route.
  const routeOverviewStops = rideStarted ? displayStopsWithLivePreview : previewDisplayStops;

  // `stops`/`isLastStop`/`nextStopAfterCurrent` (from useActiveTrip) only reflect
  // exclusions the server already knows about — they can't see an office's pending,
  // not-yet-submitted attendance taps. Confirming that office is exactly the moment
  // those taps are about to change what "next stop" even means (e.g. the only stop
  // left turns out to be one every occupant was just marked absent for), so the Maps
  // hand-off has to be decided from the same live-preview data already on screen,
  // not the stale hook values — otherwise the driver gets sent to a stop that was
  // already showing "Skipped" right in front of them.
  const computeNextNavigableStopAfter = useCallback(
    (afterStopId: number): { nextStop: typeof stops[number] | null; isLast: boolean } => {
      const idx = stops.findIndex((s) => s.id === afterStopId);
      if (idx === -1) return { nextStop: null, isLast: true };
      for (let i = idx + 1; i < stops.length; i++) {
        const candidate = stops[i];
        if (candidate.stopType === 'OFFICE') {
          return { nextStop: candidate, isLast: false };
        }
        const occupants = tripEmployeesRaw.filter((emp: TripEmployee) => emp.pickupStopId === candidate.id);
        const wouldBeSkipped =
          occupants.length > 0 && occupants.every((emp) => effectiveStatusByEmployeeId.get(emp.id) === 'absent');
        if (!wouldBeSkipped) {
          return { nextStop: candidate, isLast: false };
        }
        // Every remaining occupant of this stop is (about to be) absent — keep
        // looking past it instead of navigating there.
      }
      return { nextStop: null, isLast: true };
    },
    [stops, tripEmployeesRaw, effectiveStatusByEmployeeId],
  );

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

      // Bail out only when the trip genuinely has no one on it — not just an empty first
      // office roster, which can legitimately happen on a multi-office route where every
      // rider assigned to the first office is absent/unassigned but others board further
      // down the route. `employees` here is already scoped to the first office only.
      if (!tripEmployeesRaw.length) {
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

          if (officeStop) {
            setConfirmedOfficeRosters((prev) => ({ ...prev, [officeStop.id]: employees }));
          }

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

    // Already arrived at an OFFICE stop and its roster is showing inline in Route
    // Overview (see isAtOfficeAwaitingAttendance) — this tap submits that office's
    // bulk attendance and proceeds, replacing what used to be a separate sheet's own
    // "Proceed" button. Mirrors the pre-trip office's submit-then-move-on shape exactly.
    if (isAtOfficeAwaitingAttendance) {
      const unmarked = officeSheetEmployees.filter((e) => e.status === null);
      if (unmarked.length > 0) {
        toast.show(
          <CustomToast type="error" message={tr('markAllStopAttendance')} />,
          { duration: 3500, position: 'top', backgroundColor: '#ff4545' },
        );
        return;
      }

      const { nextStop: nextDrivingStop, isLast: wasLastStop } = computeNextNavigableStopAfter(currentStop.id);
      setConfirmedLastStopOverride(wasLastStop);
      setIsConfirmingOffice(true);

      try {
        await submitReturnAttendance({
          shuttleTripId: tripId,
          entries: officeSheetEmployees.map((emp) => ({
            employee_id: emp.id,
            status: emp.status === 'present' ? 'PRESENT' : 'ABSENT',
          })),
        }).unwrap();
        setConfirmedOfficeRosters((prev) => ({ ...prev, [currentStop.id]: officeSheetEmployees }));
        await proceedFromStop({ tripId }).unwrap();
      } catch {
        setIsConfirmingOffice(false);
        toast.show(
          <CustomToast type="error" message={tr('failedProceed')} />,
          { duration: 4000, position: 'top', backgroundColor: '#ff4545' },
        );
        return;
      }

      // isConfirmingOffice is deliberately NOT cleared here — see the useEffect above
      // for why, and refetchActiveTrip below still needs to run regardless.

      // Fire-and-forget, called only now that both writes are done — see
      // submitReturnAttendance's own comment for why an auto-invalidated refetch
      // triggered right after the first write alone would race proceedFromStop's
      // optimistic patch and can revert current_stop_status back to stale AT_STOP,
      // leaving the button stuck showing "Confirm attendance & proceed" forever.
      refetchActiveTrip();

      // Deliberately NOT clearing officeSheetEmployees here — the render below keeps
      // showing it (disabled) for this exact stop until the historical, server-truth
      // view is ready to take over, so the roster stays visibly continuous through this
      // submit-and-refetch window instead of gapping out to nothing for a beat. It gets
      // naturally replaced the next time a different office's roster is initialized, or
      // just persists harmlessly if this was the last office of the trip.
      // Last stop: no Maps hand-off — lastStopDropConfirmed takes over once the
      // refetch above lands, flipping the main button to "Complete Trip".
      if (!wasLastStop && nextDrivingStop) {
        openInMaps(nextDrivingStop);
      }
      return;
    }

    // Last stop: "Mark as Arrived" first, same as any other stop — this
    // confirms its drop-off with a real timestamp instead of relying on the
    // straggler sweep. Only once that's done does the button become
    // "Complete Trip", tapped later once the driver is actually home.
    if (isLastStop) {
      if (!lastStopDropConfirmed) {
        try {
          await arriveAtStop({ tripId, current_stop_id: currentStop.id }).unwrap();
          // OFFICE (last stop, e.g. a second/only office at the very end of a multi-office
          // route) is a boarding origin in the evening — attendance is required before
          // moving on, same as any other OFFICE stop. Its roster now shows inline in Route
          // Overview (isAtOfficeAwaitingAttendance flips true once this response lands);
          // the branch above handles the driver's next tap. Nothing more to do here.
          if (currentStop.stopType === 'OFFICE') {
            return;
          }
          // PICKUP (home): no attendance UI — server already handled the drop-off.
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

    // Middle stop. OFFICE = a normal boarding-origin stop on this leg (2nd/3rd office on
    // a multi-office route) — attendance is required, scoped to whoever boards there
    // (office_stop_id). Its roster now shows inline in Route Overview once this arrive
    // call lands; the isAtOfficeAwaitingAttendance branch above handles the next tap.
    // PICKUP (home) = unchanged from today: mark arrived (flips this stop's present
    // employees to DROPPED_OFF server-side), then hand off to Maps. No attendance UI —
    // everyone was already marked present/absent before the ride began.
    try {
      await arriveAtStop({ tripId, current_stop_id: currentStop.id }).unwrap();
      if (currentStop.stopType === 'OFFICE') {
        return;
      }
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
    officeStop,
    officeSheetEmployees,
    isAtOfficeAwaitingAttendance,
    computeNextNavigableStopAfter,
    tripEmployeesRaw,
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

        {/* Route Overview — attendance for whichever office is currently actionable (the
            pre-trip start office before Begin Ride, or the office the driver has just
            arrived at mid-route) nests directly under that office's own row below,
            instead of a separate section up here or a modal sheet. */}
        <View className="mb-6">
          <AppText
            className={`mb-6 text-black ${isRTL ? 'font-bold' : 'text-xl font-bold'}`}
            style={buildRtlSectionTitleStyle(language)}
          >
            {tr('routeOverview')}
          </AppText>
          <View className="ml-2">
            {routeOverviewStops.map((stop, index) => {
              // Pre-ride: only the starting office (the one whose attendance is taken
              // before Begin Ride) is "current". Other OFFICE stops on a multi-office
              // route are later destinations and must stay unfilled until the driver
              // actually heads there. After Begin Ride, highlight follows currentStop
              // the same way morning already does. Once the last stop's drop-off is
              // confirmed, the highlight hands off again to the Home step below.
              const isCurrent = rideStarted
                ? !stop.skipped && currentStop?.id === stop.id && !effectiveLastStopDropConfirmed
                : officeStop?.id === stop.id;

              // Exactly one office is ever "open" for attendance at a time: the pre-trip
              // start office before Begin Ride, or whichever office officeSheetEmployees
              // currently holds. That second case covers BOTH the driver actively marking
              // it right now AND the submit-and-refetch window right after they confirm —
              // officeSheetEmployees isn't cleared until a *different* office's roster
              // replaces it, so the row stays visibly continuous instead of gapping out
              // for a beat while the historical (server-truth) view catches up. Only the
              // tick/cross buttons themselves get gated by whether it's still genuinely
              // editable (isEditableNow) — the roster itself keeps showing regardless.
              const isPreTripOfficeRow = !rideStarted && officeStop?.id === stop.id;
              const isLiveOfficeAttendanceRow =
                stop.isOffice && officeSheetEmployees.length > 0 && officeSheetEmployees[0]?.stopId === stop.id;
              const isEditableNow =
                isAtOfficeAwaitingAttendance && currentStop?.id === stop.id && !isSubmitting && !isProceeding;
              const officeRoster = stop.isOffice
                ? tripEmployeesRaw.filter((emp: TripEmployee) => emp.officeStopId === stop.id)
                : [];
              // A locally-confirmed snapshot (see confirmedOfficeRosters above) means we
              // already know this office's exact roster+status — no need to wait on
              // attendanceByEmployeeId (server refetch) to decide whether this row has
              // something to show.
              const confirmedRosterForStop = stop.isOffice ? confirmedOfficeRosters[stop.id] : undefined;
              // Any OTHER office that's already been through this (attendance records
              // already exist for its roster, and it's not the one officeSheetEmployees
              // is currently holding) keeps showing read-only — kept for reference for
              // the rest of the trip instead of vanishing once the driver proceeds past it.
              const isHistoricalOfficeRow =
                !isPreTripOfficeRow
                && !isLiveOfficeAttendanceRow
                && rideStarted
                && stop.isOffice
                && (confirmedRosterForStop !== undefined || officeRoster.some((emp) => attendanceByEmployeeId.has(emp.id)));

              // No-ops by default (the historical branch below is read-only, and this
              // covers it defensively even if `disabled` on the row ever stops being
              // honored — a tap here must never be able to reach a live mutation).
              let attendanceRoster: ReturnEmployee[] | null = null;
              let onMarkAbsent: (id: string) => void = () => {};
              let onMarkPresent: (id: string) => void = () => {};
              let rowDisabled = true;
              if (isPreTripOfficeRow) {
                attendanceRoster = employees;
                onMarkAbsent = handleMarkAbsent;
                onMarkPresent = handleMarkPresent;
                rowDisabled = false;
              } else if (isLiveOfficeAttendanceRow) {
                attendanceRoster = officeSheetEmployees;
                onMarkAbsent = handleMarkOfficeSheetAbsent;
                onMarkPresent = handleMarkOfficeSheetPresent;
                rowDisabled = !isEditableNow;
              } else if (isHistoricalOfficeRow) {
                attendanceRoster = confirmedRosterForStop ?? officeRoster.map((emp) => {
                  const log = attendanceByEmployeeId.get(emp.id);
                  const normalized = log?.status?.toUpperCase();
                  const status: EmployeeStatus =
                    normalized === 'PRESENT' || normalized === 'BOARDED' ? 'present' : normalized === 'ABSENT' ? 'absent' : null;
                  return { id: emp.id, name: emp.fullName, number: emp.phone ?? '', status, stopId: stop.id };
                });
              }

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
                    <View className={`w-[2px] my-1 ${attendanceRoster?.length ? 'flex-1' : 'h-12'} ${isCurrent ? 'bg-[#FF5A00]' : 'bg-[#E5E5E5]'}`} />
                  </View>
                  <View className={`flex-1 ${isCurrent ? 'mt-[-4px]' : 'mt-[-2px]'} ${attendanceRoster?.length ? 'pb-4' : ''}`}>
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
                        </AppText>
                        {(stop.eta || stop.isOffice) && (
                          <AppText className="text-[13px] font-medium text-[#9CA3AF] mt-0.5">
                            {stop.eta}
                            {stop.isOffice
                              ? `${stop.eta ? '  ' : ''}${tr('officeLabel')}${officeStop?.id === stop.id ? ` (${tr('officeStart')})` : ''}`
                              : ''}
                          </AppText>
                        )}
                      </>
                    )}

                    {!!attendanceRoster?.length && (
                      <View className="mt-3 rounded-xl border border-[#EEE] px-3">
                        {attendanceRoster.map((emp, i) => (
                          <AttendanceRow
                            key={emp.id}
                            emp={emp}
                            isLast={i === attendanceRoster.length - 1}
                            onMarkAbsent={onMarkAbsent}
                            onMarkPresent={onMarkPresent}
                            disabled={rowDisabled}
                          />
                        ))}
                      </View>
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
                    effectiveLastStopDropConfirmed ? 'w-5 h-5 bg-[#FF5A00]' : 'w-4 h-4 bg-[#A3A3A3]'
                  }`}
                  style={{ borderWidth: effectiveLastStopDropConfirmed ? 4 : 3, borderColor: '#FFF' }}
                >
                  <Ionicons name="home" size={effectiveLastStopDropConfirmed ? 11 : 9} color="#FFF" />
                </View>
              </View>
              <View className={`flex-1 ${effectiveLastStopDropConfirmed ? 'mt-[-4px]' : 'mt-[-2px]'}`}>
                <AppText className={`text-[17px] ${effectiveLastStopDropConfirmed ? 'font-bold text-black' : 'font-medium text-[#6B7280]'}`}>
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
              ? (isAtOfficeAwaitingAttendance
                ? (isActionLoading ? tr('proceeding') : tr('confirmAttendanceProceed'))
                : effectiveLastStopDropConfirmed
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


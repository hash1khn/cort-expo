import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { SlideToStartTrip } from '../components';
import {
  useGetTripEmployeesQuery,
  useGetTripAttendanceQuery,
  useSubmitReturnAttendanceMutation,
  useCompleteTripMutation,
  useStartTripMutation,
  TripEmployee,
} from '../services/shuttleApi';
import { useActiveTrip, type Stop } from '../hooks/useActiveTrip';
import { fontFamily } from '@/core/theme';
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
type AbsentReason = 'SELF_COMMUTE' | 'LATE' | 'SICK';

type ReturnEmployee = {
  id: string;
  name: string;
  number: string;
  status: EmployeeStatus;
  absentReason?: AbsentReason;
};

const ABSENT_REASON_VALUES: AbsentReason[] = ['SELF_COMMUTE', 'LATE', 'SICK'];

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function getAbsentReasonLabel(reason: AbsentReason, translate: (key: string) => string): string {
  return translate(`shuttle:return.absentReasons.${reason}`);
}

export default function Return() {
  const { tripId: tripIdParam } = useLocalSearchParams<{ tripId?: string }>();
  const preferredTripId = tripIdParam ? Number.parseInt(tripIdParam, 10) : null;
  const safePreferredTripId = Number.isNaN(preferredTripId ?? NaN) ? null : preferredTripId;
  const { t, isRTL, language } = useLanguage();
  const tr = (key: string) => t(`shuttle:return.${key}`);
  const toast = useToast();
  const absentSheetRef = useRef<BottomSheetModal>(null);
  const absentSnapPoints = useMemo(() => ['40%'], []);
  const { activeTrip, tripId, stops, isLoading: isTripsLoading } = useActiveTrip(safePreferredTripId);
  const userId = useAppSelector((s) => s.auth.user?.id ?? '');

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

  const isActionLoading = isSubmitting || isStartingTrip || isCompletingTrip;

  const {
    startTracking,
    stopTracking,
    needsDisclosure,
    onDisclosureAccept,
    onDisclosureDecline,
  } = useRiderLocationTracking();

  // Track present/absent per employee for the return trip; default is absent.
  const [employees, setEmployees] = useState<ReturnEmployee[]>([]);
  const [employeeForAbsent, setEmployeeForAbsent] = useState<ReturnEmployee | null>(null);
  const [sliderKey, setSliderKey] = useState(0);
  const [locationPermissionWarning, setLocationPermissionWarning] = useState<
    'foreground' | 'background' | null
  >(null);

  // Derive returnTripStarted from the persisted trip status so that on crash
  // recovery the screen immediately shows "Complete Trip" (not "Begin ride").
  const tripAlreadyStarted =
    activeTrip?.status === 'STARTED' || activeTrip?.status === 'IN_PROGRESS';
  const [returnTripStarted, setReturnTripStarted] = useState(false);

  // Sync once the trip data arrives (covers the crash-recovery path where the
  // component mounts before the RTK Query result is available).
  useEffect(() => {
    if (tripAlreadyStarted) {
      setReturnTripStarted(true);
    }
  }, [tripAlreadyStarted]);

  useEffect(() => {
    if (!tripEmployeesRaw.length) return;
    // Wait for attendance logs if the trip is already started
    if (tripAlreadyStarted && isAttendanceLoading) return;

    setEmployees((prev) => {
      // Initialize only once when we get data for this trip
      if (prev.length > 0) return prev;

      const attendanceMap = new Map();
      if (tripAlreadyStarted) {
        tripAttendance.forEach((log) => {
          attendanceMap.set(log.employeeId, log);
        });
      }

      return tripEmployeesRaw.map((emp: TripEmployee) => {
        let status: EmployeeStatus = null;

        if (tripAlreadyStarted) {
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
        };
      });
    });
  }, [tripEmployeesRaw, tripAlreadyStarted, tripAttendance, isAttendanceLoading]);

  const openStopsInMaps = useCallback((tripStops: Stop[]) => {
    if (!tripStops.length) return;

    const validStops = tripStops.filter(
      (stop) =>
        typeof stop.lat === 'number' &&
        typeof stop.lng === 'number' &&
        !(stop.lat === 0 && stop.lng === 0),
    );
    if (!validStops.length) return;

    const coords = validStops.map((s) => `${s.lat},${s.lng}`);
    const origin = coords[0];
    const destination = coords[coords.length - 1];
    const waypoints = coords.length > 2 ? coords.slice(1, coords.length - 1) : [];

    const iosUrl = destination
      ? `maps://?${origin ? `saddr=${encodeURIComponent(origin)}&` : ''}daddr=${encodeURIComponent(destination)}&dirflg=d`
      : null;

    let androidUrl = 'https://www.google.com/maps/dir/?api=1&travelmode=driving';
    if (origin) androidUrl += `&origin=${encodeURIComponent(origin)}`;
    if (destination) androidUrl += `&destination=${encodeURIComponent(destination)}`;
    if (waypoints.length > 0) androidUrl += `&waypoints=${encodeURIComponent(waypoints.join('|'))}`;

    const url = Platform.OS === 'ios' ? iosUrl : androidUrl;
    if (!url) return;

    Linking.openURL(url).catch(() => {
      // Swallow error; we don't want to block the UI if maps isn't available
    });
  }, []);

  const handleSlideReturnTrip = useCallback(async () => {
    if (!tripId) {
      router.push('/shuttle');
      return;
    }

    // First slide: submit bulk return attendance and open maps with all stops
    if (!returnTripStarted) {
      // Last-resort: only when permanently denied — do not skip disclosure / OS dialogs for undetermined.
      const { status: fgGuard } = await Location.getForegroundPermissionsAsync();
      const { status: bgGuard } = await Location.getBackgroundPermissionsAsync();
      if (fgGuard === 'denied' || bgGuard === 'denied') {
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
              ...(emp.status === 'absent' &&
                emp.absentReason && { absent_reason: emp.absentReason }),
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

            await startTrip({
              route_id: activeTrip.route_id,
              direction: 'EVENING',
              lat: driverLat,
              lng: driverLng,
            }).unwrap();
          }

          setReturnTripStarted(true);
          openStopsInMaps(stops);
          setSliderKey((k) => k + 1);
        };

        const trackingStarted = await startTracking(tripId, afterTrackingReady, 'shuttle');
        if (!trackingStarted) {
          // Disclosure still open, or permission flow incomplete — let user retry.
          setSliderKey((k) => k + 1);
          return;
        }
      } catch {
        // On error, remount slider so user can retry; stay on screen
        toast.show(
          <CustomToast type="error" message={tr('couldNotStartRide')} />,
          { duration: 4000, position: 'top', backgroundColor: '#ff4545' }
        );
        setSliderKey((k) => k + 1);
      }
      return;
    }

    // Second slide: complete the trip, invalidate caches via RTKQ tags, and go home
    try {
      await completeTrip({
        tripId,
        total_distance: 0,
      }).unwrap();
      await stopTracking().catch(console.warn);
      setSliderKey((k) => k + 1);
    } catch {
      // On error, remount slider so user can retry; stay on screen
      // Optionally show error
    }
    router.push('/shuttle');
  }, [
    tripId,
    activeTrip?.route_id,
    employees,
    returnTripStarted,
    submitReturnAttendance,
    startTrip,
    startTracking,
    stopTracking,
    completeTrip,
    openStopsInMaps,
    stops,
    toast,
    t,
  ]);

  React.useEffect(() => {
    if (employeeForAbsent) {
      absentSheetRef.current?.present();
    }
  }, [employeeForAbsent]);

  const handleMarkPresent = useCallback((employeeId: string) => {
    setEmployees((prev) =>
      prev.map((e) =>
        e.id === employeeId ? { ...e, status: 'present' as const, absentReason: undefined } : e
      )
    );
  }, []);

  const handleMarkAbsent = useCallback((employee: ReturnEmployee) => {
    setEmployeeForAbsent(employee);
  }, []);

  const handleSelectAbsentReason = useCallback((reason: AbsentReason) => {
    if (!employeeForAbsent) return;
    setEmployees((prev) =>
      prev.map((e) =>
        e.id === employeeForAbsent.id
          ? { ...e, status: 'absent' as const, absentReason: reason }
          : e
      )
    );
    absentSheetRef.current?.dismiss();
    setEmployeeForAbsent(null);
  }, [employeeForAbsent]);

  const handleDismissAbsentSheet = useCallback(() => {
    setEmployeeForAbsent(null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        // iOS: CLAuthorizationStatus can lag a frame after returning from
        // Settings, so we wait briefly before reading to avoid a false banner.
        if (Platform.OS === 'ios') {
          await new Promise<void>((r) => setTimeout(r, 300));
        }
        if (cancelled) return;
        const fg = await Location.getForegroundPermissionsAsync();
        const bg = await Location.getBackgroundPermissionsAsync();
        if (cancelled) return;
        const iosScope = Platform.OS === 'ios'
          ? ((fg as any)?.ios?.scope as string | undefined)
          : undefined;
        const fullyGranted =
          (fg.status === 'granted' && bg.status === 'granted') ||
          (Platform.OS === 'ios' && fg.status === 'granted' && iosScope === 'always');
        if (fullyGranted) {
          setLocationPermissionWarning(null);
        } else if (fg.status === 'denied') {
          setLocationPermissionWarning('foreground');
        } else if (bg.status === 'denied') {
          setLocationPermissionWarning('background');
        } else {
          setLocationPermissionWarning(null);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  // We should also suspend the screen UI while attendance is loading on crash recovery
  if (isTripsLoading || isEmployeesLoading || (tripAlreadyStarted && isAttendanceLoading)) {
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
      {!returnTripStarted && (
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
                      {emp.status === 'absent' && emp.absentReason
                        ? getAbsentReasonLabel(emp.absentReason, t)
                        : (emp.number || 'No number')}
                    </AppText>
                  </View>
                </View>
                <View className="flex-row gap-3">
                  <Pressable
                    disabled={returnTripStarted}
                    onPress={() => handleMarkAbsent(emp)}
                    className="w-[42px] h-[42px] rounded-full items-center justify-center border "
                    style={{
                      backgroundColor: emp.status === 'absent' ? '#D27360' : 'transparent',
                      borderColor: emp.status === 'absent' ? '#D27360' : emp.status === 'present' ? '#C0C0C0' : '#D27360',
                      opacity: returnTripStarted ? 0.5 : 1,
                    }}
                  >
                    <Ionicons
                      name="close"
                      size={24}
                      color={emp.status === 'absent' ? '#FFF' : emp.status === 'present' ? '#C0C0C0' : '#D27360'}
                    />
                  </Pressable>
                  <Pressable
                    disabled={returnTripStarted}
                    onPress={() => handleMarkPresent(emp.id)}
                    className="w-[42px] h-[42px] rounded-full items-center justify-center border"
                    style={{
                      backgroundColor: emp.status === 'present' ? '#4AA388' : 'transparent',
                      borderColor: emp.status === 'present' ? '#4AA388' : emp.status === 'absent' ? '#C0C0C0' : '#4AA388',
                      opacity: returnTripStarted ? 0.5 : 1,
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

        {/* Slide to complete */}
        {/* <View className="mb-8">
          <SlideToStartTrip
            key={sliderKey}
            label={returnTripStarted ? 'Slide to complete trip' : 'Slide to begin trip'}
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
          disabled={isActionLoading || (!returnTripStarted && locationPermissionWarning !== null)}
          className="bg-[#FF5A00] flex-row items-center justify-center py-4 rounded-xl active:opacity-90"
          style={{
            opacity: isActionLoading ? 0.7 : (!returnTripStarted && locationPermissionWarning !== null) ? 0.5 : 1,
          }}
        >
          {isActionLoading && (
            <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
          )}
          <AppText className="text-white text-[17px] font-bold mr-1">
            {isActionLoading
              ? (returnTripStarted ? tr('completing') : tr('beginning'))
              : (returnTripStarted ? tr('completeTrip') : tr('beginRide'))}
          </AppText>
          {/* <Ionicons name="chevron-forward" size={22} color="#FFF" /> */}
        </Pressable>
      </View>

      {/* Absent reason bottom sheet */}
      <BottomSheetModal
        ref={absentSheetRef}
        snapPoints={absentSnapPoints}
        enablePanDownToClose
        onDismiss={handleDismissAbsentSheet}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
        )}
        backgroundStyle={{ backgroundColor: '#FFFFFF' }}
        handleIndicatorStyle={{ backgroundColor: 'rgba(55,65,81,0.25)' }}
      >
        <BottomSheetView style={styles.absentSheetContent}>
          <View className="px-5 pb-8 ">
            <AppText
              className="text-lg font-bold mb-4 text-black"
              style={isRTL ? { paddingVertical: 6 } : undefined}
            >
              {tr('whyAbsent')}
            </AppText>


            {ABSENT_REASON_VALUES.map((reason) => (
              <Pressable
                key={reason}
                onPress={() => handleSelectAbsentReason(reason)}
                className="py-3 rounded-xl items-center justify-center active:opacity-90 mb-3"
                style={{
                  backgroundColor: '#F5F5F2',
                  borderWidth: 1,
                  borderColor: 'rgba(209,213,219,1)',
                }}
              >
                <AppText
                  className="text-base font-semibold text-black"
                  style={isRTL ? { paddingVertical: 6 } : undefined}
                >
                  {getAbsentReasonLabel(reason, t)}
                </AppText>
              </Pressable>
            ))}
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  absentSheetContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});

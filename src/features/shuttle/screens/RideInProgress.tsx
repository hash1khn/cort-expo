import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
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
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fontFamily } from '@/core/theme';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { useLanguage } from '@/features/shared/context/LanguageContext';
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
} from '../services/shuttleApi';
import { useActiveTrip, type Stop } from '../hooks/useActiveTrip';
import { useRideSocket } from '@/hooks/useRideSocket';
import { useAppSelector } from '@/store/hooks';
import { store } from '@/store';
import { useRiderLocationTracking } from '@/hooks/useRiderLocationTracking';
import { LocationDisclosureModal } from '@/components/LocationDisclosureModal';

const LABELS = {
  en: {
    tripInProgress: 'Trip In Progress',
    readyToGo: 'Ready to go',
    hiace: 'Hiace',
    stops: 'Stops',
    employees: 'Employees',
    routeOverview: 'Route Overview',
    processing: 'Processing...',
    completeTrip: 'Complete Trip',
    markAsArrived: 'Mark as Arrived',
    beginRide: 'Begin ride',
    markAllAttendance: 'Mark all attendance before proceeding',
    failedProceed: 'Failed to proceed to next stop. Please try again.',
    failedComplete: 'Failed to complete trip. Please try again.',
    couldNotMarkAbsent: "Couldn't mark as absent.",
    couldNotMarkPresent: "Couldn't mark as present.",
    markAttendanceSubtitle: 'Mark employees as present or absent',
    currentStop: 'Current Stop',
    proceeding: 'Proceeding...',
    proceedNextStop: 'Proceed to next stop',
    present: 'Present',
    absent: 'Absent',
    noNumber: 'No number',
  },
  ur: {
    tripInProgress: 'سفر جاری ہے',
    readyToGo: 'شروع کرنے کے لیے تیار',
    hiace: 'ہائس',
    stops: 'اسٹاپ',
    employees: 'افراد',
    routeOverview: 'راستے کا جائزہ',
    processing: 'جاری ہے...',
    completeTrip: 'سفر مکمل کریں',
    markAsArrived: 'اسٹاپ پر پہنچ گئے',
    beginRide: 'شروع کریں',
    markAllAttendance: 'شروع کرنے سے پہلے تمام حاضری درج کریں',
    failedProceed: 'اگلے اسٹاپ پر نہیں جا سکے۔ دوبارہ کوشش کریں۔',
    failedComplete: 'سفر مکمل نہ ہو سکا۔ دوبارہ کوشش کریں۔',
    couldNotMarkAbsent: 'غیر حاضر درج نہ ہو سکا۔',
    couldNotMarkPresent: 'حاضر درج نہ ہو سکا۔',
    markAttendanceSubtitle: 'افراد کی حاضری یا غیر حاضری مقرر کریں',
    currentStop: 'موجودہ اسٹاپ',
    proceeding: 'جا رہے ہیں...',
    proceedNextStop: 'اگلے اسٹاپ پر جائیں',
    present: 'حاضر',
    absent: 'غیر حاضر',
    noNumber: 'نمبر نہیں',
  },
} as const;

type EmployeeStatus = 'present' | 'absent';

type StopEmployee = { id: string; name: string; number: string; status: EmployeeStatus };

// Per-employee loading state: which action is in flight
type EmployeeLoadingAction = 'scanning' | 'marking_absent' | null;

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function RideInProgress() {
  const { language } = useLanguage();
  const isUrdu = language === 'ur';
  const t = LABELS[language];
  const toast = useToast();

  const {
    activeTrip,
    tripId,
    stops,
    currentStop,
    nextStopAfterCurrent,
    nextStopIndex,
    isLastStop,
    rideStarted,
    isAtStop,
    isLoading: isTripsLoading,
  } = useActiveTrip();

  const userId = useAppSelector((s) => s.auth.user?.id ?? '');

  // Patch attendance cache in real time when server broadcasts an update
  // Track employees who self-scanned via WebSocket — these are the only ones whose buttons lock
  const [selfScannedIds, setSelfScannedIds] = useState<Set<string>>(new Set());
  // Track employees the driver has manually marked (present or absent) — used for proceed validation
  const [driverMarkedIds, setDriverMarkedIds] = useState<Set<string>>(new Set());

  const handleAttendanceMarked = useCallback(
    (data: { employeeId: string; employeeName: string; markedBy: string; timestamp: string }) => {
      if (!tripId) return;
      // Only lock buttons when the employee boarded themselves (self-scan)
      if (data.markedBy === 'self') {
        setSelfScannedIds((prev) => new Set(prev).add(data.employeeId));
        // Also count as driver-marked for proceed validation purposes
        setDriverMarkedIds((prev) => new Set(prev).add(data.employeeId));
      }
      store.dispatch(
        shuttleApi.util.updateQueryData('getTripAttendance', tripId as number, (draft) => {
          const i = draft.findIndex((e) => e.employeeId === data.employeeId);
          const status = 'PRESENT';
          if (i !== -1) {
            draft[i].status = status;
          } else {
            draft.push({
              employeeId: data.employeeId,
              fullName: data.employeeName,
              phone: null,
              department: null,
              status,
              scannedAt: data.timestamp,
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

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const fg = await Location.getForegroundPermissionsAsync();
        const bg = await Location.getBackgroundPermissionsAsync();
        if (cancelled) return;
        if (bg.status === 'denied') {
          setLocationPermissionWarning('background');
        } else if (fg.status === 'denied') {
          setLocationPermissionWarning('foreground');
        } else {
          setLocationPermissionWarning(null);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const { data: realEmployees = [], isLoading: isEmployeesLoading } = useGetTripEmployeesQuery(
    tripId as number,
    { skip: !tripId },
  );

  const tripEmployeesRaw = realEmployees;

  const { data: tripAttendance = [], isFetching: isAttendanceFetching } = useGetTripAttendanceQuery(
    tripId as number,
    { skip: !tripId },
  );

  const [scanPassenger, { isLoading: isScanning }] = useScanPassengerMutation();
  const [markPassengerAbsent, { isLoading: isMarkingAbsent }] =
    useMarkPassengerAbsentMutation();
  const [startTrip, { isLoading: isStartingTrip }] = useStartTripMutation();
  const [arriveAtStop, { isLoading: isArrivingAtStop }] = useArriveAtStopMutation();
  const [proceedFromStop, { isLoading: isProceeding }] = useProceedFromStopMutation();
  const [completeTrip, { isLoading: isCompletingTrip }] = useCompleteTripMutation();

  const isActionLoading = isStartingTrip || isArrivingAtStop || isCompletingTrip;

  // Single source of truth: derive present/absent from server manifest only.
  const attendanceStatusByEmployeeId = useMemo(() => {
    const map: Record<string, EmployeeStatus> = {};
    tripAttendance.forEach((log) => {
      const normalized = log.status?.toUpperCase();
      map[log.employeeId] =
        normalized === 'PRESENT' || normalized === 'BOARDED' ? 'present' : 'absent';
    });
    return map;
  }, [tripAttendance]);

  const [attendanceStopId, setAttendanceStopId] = useState<number | null>(null);

  // Reset per-stop tracking when the sheet opens at a new stop
  const prevAttendanceStopIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (attendanceStopId !== null && attendanceStopId !== prevAttendanceStopIdRef.current) {
      prevAttendanceStopIdRef.current = attendanceStopId;
      setDriverMarkedIds(new Set());
    }
  }, [attendanceStopId]);

  const arrivedStopSheetRef = useRef<BottomSheet>(null);
  const arrivedStopSnapPoints = useMemo(() => ['60%'], []);

  // CRASH RECOVERY: If app is relaunched while driver was at a stop (AT_STOP),
  // automatically restore the attendance bottom sheet so they can continue.
  const hasAutoOpenedRef = useRef(false);
  useEffect(() => {
    if (
      isAtStop &&
      activeTrip?.current_stop_id != null &&
      !hasAutoOpenedRef.current &&
      !isTripsLoading
    ) {
      hasAutoOpenedRef.current = true;
      setAttendanceStopId(activeTrip.current_stop_id);
      // Small delay to let the BottomSheet mount before snapping
      const timer = setTimeout(() => {
        arrivedStopSheetRef.current?.snapToIndex(0);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isAtStop, activeTrip?.current_stop_id, isTripsLoading]);

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

  const openInMaps = useCallback((stop: Stop) => {
    const appleUrl = `http://maps.google.com/?daddr=${stop.lat},${stop.lng}&dirflg=d`;
    const androidUrl = `geo:0,0?q=${stop.lat},${stop.lng}(${encodeURIComponent(stop.name)})`;
    const url = Platform.OS === 'ios' ? appleUrl : androidUrl;

    Linking.openURL(url).catch(() => {
      // swallow error; we don't want to block the UI if maps isn't available
    });
  }, []);

  const stopForAttendance = useMemo(
    () => stops.find((s) => s.id === attendanceStopId) ?? currentStop,
    [stops, attendanceStopId, currentStop]
  );

  const employeesAtCurrentStop: StopEmployee[] = useMemo(() => {
    if (!stopForAttendance) return [];
    const list = tripEmployeesRaw.filter((emp: TripEmployee) => emp.pickupStopId === stopForAttendance.id);
    return list.map((emp) => ({
      id: emp.id,
      name: emp.fullName,
      number: emp.phone ?? '',
      status: attendanceStatusByEmployeeId[emp.id] ?? 'absent',
    }));
  }, [stopForAttendance, tripEmployeesRaw, attendanceStatusByEmployeeId]);

  const handleSlideComplete = useCallback(async () => {
    if (!currentStop || !stops.length) {
      return;
    }

    if (!rideStarted) {
      // Last-resort: only when permanently denied — do not skip disclosure / OS dialogs for undetermined.
      const { status: fgGuard } = await Location.getForegroundPermissionsAsync();
      const { status: bgGuard } = await Location.getBackgroundPermissionsAsync();
      if (fgGuard === 'denied' || bgGuard === 'denied') {
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
            await startTrip({ route_id: routeId, direction, lat: driverLat, lng: driverLng }).unwrap();
            openInMaps(currentStop);
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
      } else {
        openInMaps(currentStop);
      }
      return;
    }

    if (!activeTrip) return;

    if (!isLastStop) {
      try {
        await arriveAtStop({
          tripId: activeTrip.id,
          current_stop_id: currentStop.id,
        }).unwrap();
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
      await completeTrip({
        tripId: activeTrip.id,
        total_distance: 0,
      }).unwrap();
      await stopTracking().catch(console.warn);
      router.push('/shuttle');
    } catch {
      Alert.alert('Error', t.failedComplete);
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
    completeTrip,
    stops.length,
  ]);

  return (
    <SafeAreaView style={styles.root}>
      <LocationDisclosureModal
        visible={needsDisclosure}
        onAccept={onDisclosureAccept}
        onDecline={onDisclosureDecline}
      />
      <Pressable onPress={() => router.back()}>
        <View className="flex-row items-center gap-2 ml-[-4px] px-6 mb-3">
          <Feather name="chevron-left" size={24} color="black" />
          {/* <Text className="text-black font-bold">Home</Text> */}
        </View>
      </Pressable>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.titleText}>
            {rideStarted ? t.tripInProgress : t.readyToGo}
          </Text>
          <Text style={styles.subtitleText}>Black Hiace • ABR 986</Text>
        </View>

        {/* Info Grid */}
        <View className="flex-row items-start mb-6 mt-8">
          {/* Vehicle */}
          <View className="flex-1 items-center gap-[3px]">
            <View className="w-8 h-8 rounded-lg bg-black/10 items-center justify-center mb-0.5">
              <MaterialCommunityIcons name="bus" size={16} color="#000" />
            </View>
            <Text className="text-[10px] font-semibold text-black/50 uppercase tracking-[0.8px]">{t.hiace}</Text>
            <Text className="text-[13px] font-extrabold text-[#000] tracking-[-0.2px]">ABR 986</Text>
          </View>

          <View className="w-[1px] h-[80%] self-center bg-black/10" />

          {/* Stops */}
          <View className="flex-1 items-center gap-[3px]">
            <View className="w-8 h-8 rounded-lg bg-black/10 items-center justify-center mb-0.5">
              <Ionicons name="location-outline" size={16} color="#000" />
            </View>
            <Text className="text-[10px] font-semibold text-black/50 uppercase tracking-[0.8px]">{t.stops}</Text>
            <Text className="text-[13px] font-extrabold text-[#000] tracking-[-0.2px]">{stops.length}</Text>
          </View>

          <View className="w-[1px] h-[80%] self-center bg-black/10" />

          {/* Employees */}
          <View className="flex-1 items-center gap-[3px]">
            <View className="w-8 h-8 rounded-lg bg-black/10 items-center justify-center mb-0.5">
              <Ionicons name="people-outline" size={16} color="#000" />
            </View>
            <Text className="text-[10px] font-semibold text-black/50 uppercase tracking-[0.8px]">{t.employees}</Text>
            <Text className="text-[13px] font-extrabold text-[#000] tracking-[-0.2px]">{tripEmployeesRaw.length}</Text>
          </View>
        </View>

        {/* Route Overview */}
        <View className="mb-6 mt-4">
          <Text className="text-xl font-bold mb-6 text-black">
            {t.routeOverview}
          </Text>
          <View className="ml-2">
            {stops.map((stop, index) => {
              const isLast = index === stops.length - 1;
              const isCurrent = currentStop?.id === stop.id;

              return (
                <View key={stop.id || index} className="flex-row items-start">
                  <View className="items-center mr-4">
                    {/* Dot */}
                    <View
                      className={`rounded-full shadow-sm items-center justify-center ${isCurrent ? 'w-5 h-5 bg-[#FF5A00]' : 'w-4 h-4 bg-[#A3A3A3]'}`}
                      style={{ borderWidth: isCurrent ? 4 : 3, borderColor: '#FFF' }}
                    />
                    {/* Line */}
                    {!isLast && (
                      <View className={`w-[2px] h-12 my-1 ${isCurrent ? 'bg-[#FF5A00]' : 'bg-[#E5E5E5]'}`} />
                    )}
                  </View>
                  <View className={`flex-1 ${isCurrent ? 'mt-[-4px]' : 'mt-[-2px]'}`}>
                    <Text className={`text-[17px] ${isCurrent ? 'font-bold text-black' : 'font-medium text-[#6B7280]'}`}>
                      {stop.name}
                    </Text>
                    {stop.eta && (
                      <Text className="text-[13px] font-medium text-[#9CA3AF] mt-0.5">{stop.eta}</Text>
                    )}
                  </View>
                </View>
              );
            })}
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
                ? isUrdu
                  ? 'ترتیبات میں لوکیشن کو "ہمیشہ اجازت" پر سیٹ کریں تاکہ سفر کے دوران ٹریکنگ ہو سکے۔'
                  : 'Set location access to "Allow all the time" in Settings so rides can be tracked.'
                : isUrdu
                  ? 'ترتیبات میں ایپ کی اجازتوں سے لوکیشن چالو کریں، پھر سفر شروع کریں۔'
                  : 'Enable Location in Settings (App → Permissions) before starting a ride.'}
            </Text>
            <Pressable onPress={() => Linking.openSettings()} className="mt-2 self-start">
              <Text className="text-[13px] font-semibold text-amber-950" style={{ fontFamily }}>
                {isUrdu ? 'ترتیبات کھولیں' : 'Open Settings'}
              </Text>
            </Pressable>
          </View>
        )}
        <Pressable
          onPress={handleSlideComplete}
          disabled={isActionLoading || (!rideStarted && locationPermissionWarning !== null)}
          className="bg-[#FF5A00] flex-row items-center justify-center py-6 rounded-xl active:opacity-90"
          style={{
            opacity: isActionLoading ? 0.7 : (!rideStarted && locationPermissionWarning !== null) ? 0.5 : 1,
          }}
        >
          {isActionLoading && (
            <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
          )}
          <Text className="text-white text-[17px] font-bold mr-1">
            {isActionLoading
              ? t.processing
              : (rideStarted
                ? (isLastStop ? t.completeTrip : t.markAsArrived)
                : t.beginRide)}
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
              <Text className="text-xl font-bold mb-1 text-black">
                {stopForAttendance?.name || t.currentStop}
              </Text>
              <Text className="text-sm text-[#6B7280]">
                {t.markAttendanceSubtitle}
              </Text>
            </View>
          </View>

          <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}>
            <View className="overflow-hidden mb-6">
              {employeesAtCurrentStop.map((emp, index) => {
                const loadingAction = employeeLoadingMap[emp.id] ?? null;
                // Buttons only lock when employee self-scanned via WebSocket
                const selfScanned = selfScannedIds.has(emp.id);
                const isAbsentBtn = emp.status === 'absent' && driverMarkedIds.has(emp.id);
                const isPresentBtn = emp.status === 'present' && (driverMarkedIds.has(emp.id) || selfScanned);

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
                        <Text className="text-[#8E8E93] text-[15px] mr-2" numberOfLines={1}>
                          {emp.status === 'present' ? t.present : emp.status === 'absent' ? t.absent : (emp.number || t.noNumber)}
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
                            setDriverMarkedIds((prev) => new Set(prev).add(emp.id));
                          } catch {
                            Alert.alert('Error', t.couldNotMarkAbsent);
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
                            setDriverMarkedIds((prev) => new Set(prev).add(emp.id));
                          } catch {
                            Alert.alert('Error', t.couldNotMarkPresent);
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
                // Validate all employees at this stop have been marked
                const unmarked = employeesAtCurrentStop.filter(
                  (e) => !driverMarkedIds.has(e.id) && !selfScannedIds.has(e.id),
                );
                if (unmarked.length > 0) {
                  toast.show(
                    <CustomToast
                      type="error"
                      message={t.markAllAttendance}
                    />,
                    { duration: 3500, position: 'top', backgroundColor: '#ff4545' },
                  );
                  return;
                }

                // Persist EN_ROUTE on backend BEFORE closing the sheet.
                // This ensures crash recovery won't re-show this stop's sheet.
                if (activeTrip) {
                  try {
                    await proceedFromStop({ tripId: activeTrip.id }).unwrap();
                  } catch {
                    Alert.alert('Error', t.failedProceed);
                    return;
                  }
                }

                arrivedStopSheetRef.current?.close();
                // Reset frozen stop so when it opens later it uses the new one
                setAttendanceStopId(null);

                // Find the next stop AFTER the one we just attended.
                // When isAtStop is true, nextStopAfterCurrent holds the correct next one.
                const nextDrivingStop = nextStopAfterCurrent;
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
                {isProceeding ? t.proceeding : t.proceedNextStop}
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

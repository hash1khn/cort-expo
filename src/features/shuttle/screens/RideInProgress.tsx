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
import { Entypo, Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '@/core/theme';
import { SlideToStartTrip } from '../components';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { useLanguage } from '@/features/shared/context/LanguageContext';
import {
  useGetTripEmployeesQuery,
  useGetTripAttendanceQuery,
  useScanPassengerMutation,
  useMarkPassengerAbsentMutation,
  useStartTripMutation,
  useArriveAtStopMutation,
  useCompleteTripMutation,
  TripEmployee,
  shuttleApi,
} from '../services/shuttleApi';
import { useActiveTrip, type Stop } from '../hooks/useActiveTrip';
import { useRideSocket } from '@/hooks/useRideSocket';
import { useAppSelector } from '@/store/hooks';
import * as Location from 'expo-location';
import { store } from '@/store';

type EmployeeStatus = 'present' | 'absent';

type StopEmployee = { id: string; name: string; number: string; status: EmployeeStatus };

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

  const {
    activeTrip,
    tripId,
    stops,
    currentStop,
    nextStopAfterCurrent,
    nextStopIndex,
    isLastStop,
    rideStarted,
    isLoading: isTripsLoading,
  } = useActiveTrip();

  const userId = useAppSelector((s) => s.auth.user?.id ?? '');

  // Patch attendance cache in real time when server broadcasts an update
  const handleAttendanceMarked = useCallback(
    (data: { employeeId: string; employeeName: string; markedBy: string; timestamp: string }) => {
      if (!tripId) return;
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
    },
    [tripId],
  );

  const { sendLocation } = useRideSocket({
    tripId: tripId ?? 0,
    userId,
    role: 'driver',
    onAttendanceMarked: handleAttendanceMarked,
  });

  // Stream GPS location while ride is active
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  useEffect(() => {
    if (!rideStarted || !tripId) return;

    let active = true;
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status !== 'granted' || !active) return;
      Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 4000, distanceInterval: 5 },
        (loc) => {
          sendLocation({
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            heading: loc.coords.heading ?? 0,
            speed: loc.coords.speed ?? 0,
          });
        },
      ).then((sub) => {
        if (active) {
          locationSubscriptionRef.current = sub;
        } else {
          sub.remove();
        }
      });
    });

    return () => {
      active = false;
      locationSubscriptionRef.current?.remove();
      locationSubscriptionRef.current = null;
    };
  }, [rideStarted, tripId, sendLocation]);

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
  const [completeTrip, { isLoading: isCompletingTrip }] = useCompleteTripMutation();

  const isActionLoading = isStartingTrip || isArrivingAtStop || isCompletingTrip;

  // Increment after successful API so the slider remounts and does not get stuck
  const [slideKeyVersion, setSlideKeyVersion] = React.useState(0);

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

  // Bottom sheet for actions on a specific employee
  const [selectedEmployee, setSelectedEmployee] = useState<StopEmployee | null>(null);
  const actionSheetRef = useRef<BottomSheetModal>(null);
  const actionSheetSnapPoints = useMemo(() => ['30%'], []);

  const arrivedStopSheetRef = useRef<BottomSheet>(null);
  const arrivedStopSnapPoints = useMemo(() => ['60%'], []);

  useEffect(() => {
    if (selectedEmployee) {
      actionSheetRef.current?.present();
    } else {
      actionSheetRef.current?.dismiss();
    }
  }, [selectedEmployee]);

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

  const slideLabel = rideStarted
    ? isLastStop
      ? 'Slide to complete trip'
      : 'Slide to mark as arrived'
    : 'Slide to start trip';

  const slideKey = rideStarted
    ? isLastStop
      ? `complete-${currentStop?.id ?? 'none'}`
      : `arrived-${currentStop?.id ?? 'none'}`
    : `start-${currentStop?.id ?? 'none'}`;

  const handleSlideComplete = useCallback(async () => {
    if (!currentStop || !stops.length) {
      return;
    }

    if (!rideStarted) {
      // First slide: call start trip API, then open maps
      const routeId = activeTrip?.route_id;
      const direction = activeTrip?.direction;
      if (routeId != null && direction) {
        try {
          await startTrip({ route_id: routeId, direction }).unwrap();
          setSlideKeyVersion((v) => v + 1);
          openInMaps(currentStop);
        } catch {
          // Optionally show error; slider stays
          setSlideKeyVersion((v) => v + 1);
        }
      } else {
        openInMaps(currentStop);
      }
      return;
    }

    if (!activeTrip) return;

    if (!isLastStop) {
      try {
        setAttendanceStopId(currentStop.id);
        await arriveAtStop({
          tripId: activeTrip.id,
          current_stop_id: currentStop.id,
        }).unwrap();
        setSlideKeyVersion((v) => v + 1);
        arrivedStopSheetRef.current?.snapToIndex(0);
      } catch {
        setSlideKeyVersion((v) => v + 1);
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
      setSlideKeyVersion((v) => v + 1);
    } catch {
      // Optionally show error
    }
    router.push('/shuttle');
  }, [
    rideStarted,
    isLastStop,
    currentStop,
    activeTrip,
    nextStopAfterCurrent,
    openInMaps,
    startTrip,
    arriveAtStop,
    completeTrip,
    stops.length,
  ]);

  return (
    <SafeAreaView style={styles.root}>
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
            {rideStarted ? 'Trip In Progress' : 'Ready to go'}
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
            <Text className="text-[10px] font-semibold text-black/50 uppercase tracking-[0.8px]">Hiace</Text>
            <Text className="text-[13px] font-extrabold text-[#000] tracking-[-0.2px]">ABR 986</Text>
          </View>

          <View className="w-[1px] h-[80%] self-center bg-black/10" />

          {/* Stops */}
          <View className="flex-1 items-center gap-[3px]">
            <View className="w-8 h-8 rounded-lg bg-black/10 items-center justify-center mb-0.5">
              <Ionicons name="location-outline" size={16} color="#000" />
            </View>
            <Text className="text-[10px] font-semibold text-black/50 uppercase tracking-[0.8px]">Stops</Text>
            <Text className="text-[13px] font-extrabold text-[#000] tracking-[-0.2px]">{stops.length}</Text>
          </View>

          <View className="w-[1px] h-[80%] self-center bg-black/10" />

          {/* Employees */}
          <View className="flex-1 items-center gap-[3px]">
            <View className="w-8 h-8 rounded-lg bg-black/10 items-center justify-center mb-0.5">
              <Ionicons name="people-outline" size={16} color="#000" />
            </View>
            <Text className="text-[10px] font-semibold text-black/50 uppercase tracking-[0.8px]">Employees</Text>
            <Text className="text-[13px] font-extrabold text-[#000] tracking-[-0.2px]">{tripEmployeesRaw.length}</Text>
          </View>
        </View>

        {/* Route Overview */}
        <View className="mb-6 mt-4">
          <Text className="text-xl font-bold mb-6 text-black">
            Route Overview
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

        {/* Slide control */}
        {/* <View style={styles.slideWrapper}>
          <SlideToStartTrip
            key={`${slideKey}-${slideKeyVersion}`}
            label={slideLabel}
            onComplete={handleSlideComplete}
          />
        </View> */}
      </ScrollView>

      <View className="absolute bottom-20 left-5 right-5 pointer-events-auto">
        <Pressable
          onPress={handleSlideComplete}
          disabled={isActionLoading}
          className="bg-[#FF5A00] flex-row items-center justify-center py-6 rounded-xl active:opacity-90 disabled:opacity-70"
        >
          {isActionLoading && (
            <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
          )}
          <Text className="text-white text-[17px] font-bold mr-1">
            {isActionLoading
              ? 'Processing...'
              : (rideStarted
                ? (isLastStop ? 'Complete Trip' : 'Mark as Arrived')
                : 'Begin ride')}
          </Text>
        </Pressable>
      </View>

      {/* Action bottom sheet for selected employee */}
      <BottomSheetModal
        ref={actionSheetRef}
        snapPoints={actionSheetSnapPoints}
        enablePanDownToClose
        onDismiss={() => setSelectedEmployee(null)}
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            disappearsOnIndex={-1}
            appearsOnIndex={0}
          />
        )}
        backgroundStyle={{ backgroundColor: '#FFFFFF' }}
        handleIndicatorStyle={{ backgroundColor: 'rgba(55,65,81,0.25)' }}
      >
        <BottomSheetView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          <View className="px-5 pb-8 pt-2">
            <Text className="text-lg font-bold mb-4 text-black">
              {isUrdu ? 'حاضری کی حیثیت منتخب کریں' : 'Mark attendance status'}
            </Text>

            <Pressable
              disabled={isScanning || isMarkingAbsent || isAttendanceFetching}
              onPress={() => {
                const isBusy = isScanning || isMarkingAbsent || isAttendanceFetching;
                if (!selectedEmployee || isBusy || !activeTrip) return;

                scanPassenger({
                  shuttleTripId: activeTrip.id,
                  employeeId: selectedEmployee.id,
                  status: 'PRESENT',
                })
                  .unwrap()
                  .then(() => setSelectedEmployee(null))
                  .catch(() => {
                    Alert.alert('Error', "Couldn't mark as present.");
                    setSelectedEmployee(null);
                  });
              }}
              className="py-3 rounded-xl items-center justify-center flex-row active:opacity-90 mb-3"
              style={{
                backgroundColor: '#F5F5F2',
                borderWidth: 1,
                borderColor: 'rgba(209,213,219,1)',
                opacity: (isScanning || isMarkingAbsent || isAttendanceFetching) ? 0.6 : 1,
              }}
            >
              {isScanning && (
                <ActivityIndicator size="small" color="#000000" style={{ marginRight: 8 }} />
              )}
              <Text className="text-base font-semibold text-black">
                {isUrdu ? 'حاضری لگائیں' : 'Present'}
              </Text>
            </Pressable>

            <Pressable
              disabled={isScanning || isMarkingAbsent || isAttendanceFetching}
              onPress={() => {
                const isBusy = isScanning || isMarkingAbsent || isAttendanceFetching;
                if (!selectedEmployee || isBusy || !activeTrip) return;

                markPassengerAbsent({
                  shuttleTripId: activeTrip.id,
                  employeeId: selectedEmployee.id,
                })
                  .unwrap()
                  .then(() => setSelectedEmployee(null))
                  .catch(() => {
                    Alert.alert('Error', "Couldn't mark as absent.");
                    setSelectedEmployee(null);
                  });
              }}
              className="py-3 rounded-xl items-center flex-row justify-center active:opacity-90 mb-3"
              style={{
                backgroundColor: '#F5F5F2',
                borderWidth: 1,
                borderColor: 'rgba(209,213,219,1)',
                opacity: (isScanning || isMarkingAbsent || isAttendanceFetching) ? 0.6 : 1,
              }}
            >
              {isMarkingAbsent && (
                <ActivityIndicator size="small" color="#000000" style={{ marginRight: 8 }} />
              )}
              <Text className="text-base font-semibold text-black">
                {isUrdu ? 'غیر حاضر نشان زد کریں' : 'Absent'}
              </Text>
            </Pressable>
          </View>
        </BottomSheetView>
      </BottomSheetModal>

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
            <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
          )}
        >
          <View className="px-5 pb-4 pt-2 flex-row justify-between items-center">
            <View>
              <Text className="text-xl font-bold mb-1 text-black">
                {stopForAttendance?.name || 'Current Stop'}
              </Text>
              <Text className="text-sm text-[#6B7280]">
                Mark employees as present or absent
              </Text>
            </View>
          </View>

          <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}>
            <View className="overflow-hidden mb-6">
              {employeesAtCurrentStop.map((emp, index) => (
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
                    style={{
                      borderWidth: 2,
                      borderColor: '#FF5A00'
                    }}
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
                        {emp.status === 'present' ? 'Present' : (emp.status === 'absent' ? 'Absent' : (emp.number || 'No number'))}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row gap-3">
                    <Pressable
                      onPress={() => handleCall(emp.number)}
                      className="w-[42px] h-[42px] rounded-full items-center justify-center border border-gray-300"
                    >
                      <Ionicons name="call-outline" size={20} color="black" />
                    </Pressable>
                    <Pressable
                      hitSlop={8}
                      onPress={() => setSelectedEmployee(emp)}
                      className="w-[42px] h-[42px] rounded-full items-center justify-center border border-gray-300"
                    >
                      <Entypo name="dots-three-horizontal" size={20} color="black" />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
            <Pressable
              onPress={() => {
                arrivedStopSheetRef.current?.close();
                // Reset frozen stop so when it opens later it uses the new one
                setAttendanceStopId(null);

                if (nextStopIndex !== null && stops.length > nextStopIndex) {
                  // Open map for the next actual traveling stop 
                  openInMaps(stops[nextStopIndex]);
                }
              }}
              className="bg-[#FF5A00] flex-row items-center justify-center py-6  rounded-xl active:opacity-90 disabled:opacity-70"
            >
              <Text className="text-white text-[17px] font-bold mr-1">
                Proceed to next stop
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

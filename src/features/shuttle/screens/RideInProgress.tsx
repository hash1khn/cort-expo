import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View, ScrollView } from 'react-native';
import { Entypo, Ionicons } from '@expo/vector-icons';
import { colors } from '@/core/theme';
import { SlideToStartTrip } from '../components';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { useLanguage } from '@/features/shared/context/LanguageContext';
import {
  useGetTodayTripQuery,
  useGetTripEmployeesQuery,
  useGetTripAttendanceQuery,
  useScanPassengerMutation,
  useMarkPassengerAbsentMutation,
  ShuttleTrip,
  TripEmployee,
} from '../services/shuttleApi';

type EmployeeStatus = 'present' | 'absent';

type StopEmployee = { id: string; name: string; number: string; status: EmployeeStatus };

type Stop = {
  id: number;
  name: string;
  eta: string;
  lat: number;
  lng: number;
};

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

  const { data: todayTrips = [], isLoading: isTripsLoading } = useGetTodayTripQuery();
  const activeTrip: ShuttleTrip | null = todayTrips.length > 0 ? todayTrips[0] : null;
  const tripId = activeTrip?.id;
  const { data: tripEmployeesRaw = [], isLoading: isEmployeesLoading } = useGetTripEmployeesQuery(
    tripId as number,
    { skip: !tripId },
  );

  const { data: tripAttendance = [], isFetching: isAttendanceFetching } = useGetTripAttendanceQuery(
    tripId as number,
    { skip: !tripId },
  );

  const [scanPassenger, { isLoading: isScanning }] = useScanPassengerMutation();
  const [markPassengerAbsent, { isLoading: isMarkingAbsent }] =
    useMarkPassengerAbsentMutation();

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

  const stops: Stop[] = useMemo(() => {
    if (!activeTrip?.routes) return [];
    const routeStops = [...activeTrip.routes.route_stops].sort(
      (a, b) => a.sequence_order - b.sequence_order,
    );

    const formatEta = (stop: any): string => {
      const raw =
        activeTrip.direction === 'MORNING' ? stop.morning_eta ?? null : stop.evening_eta ?? null;
      if (!raw) return '—';
      if (raw.includes('T')) {
        const d = new Date(raw);
        if (Number.isNaN(d.getTime())) return '—';
        return d.toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
      }
      const [hStr, mStr = '00'] = raw.split(':');
      const hour24 = Number.parseInt(hStr, 10);
      if (Number.isNaN(hour24)) return raw;
      const minutes = mStr.padStart(2, '0');
      const suffix = hour24 >= 12 ? 'PM' : 'AM';
      const hour12 = ((hour24 + 11) % 12) + 1;
      return `${hour12}:${minutes} ${suffix}`;
    };

    return routeStops.map((stop) => ({
      id: stop.id,
      name: stop.name,
      eta: formatEta(stop),
      lat: stop.lat ?? 0,
      lng: stop.lng ?? 0,
    }));
  }, [activeTrip]);

  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [rideStarted, setRideStarted] = useState(false);

  // Bottom sheet for actions on a specific employee
  const [selectedEmployee, setSelectedEmployee] = useState<StopEmployee | null>(null);
  const actionSheetRef = useRef<BottomSheetModal>(null);
  const actionSheetSnapPoints = useMemo(() => ['35%'], []);

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
      Linking.openURL(url).catch(() => {});
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

  const currentStop = useMemo(
    () => (stops.length > 0 ? stops[Math.min(currentStopIndex, stops.length - 1)] : null),
    [stops, currentStopIndex],
  );
  const isLastStop = stops.length > 0 && currentStopIndex === stops.length - 1;

  const employeesAtCurrentStop: StopEmployee[] = useMemo(() => {
    if (!currentStop) return [];
    const list = tripEmployeesRaw.filter((emp: TripEmployee) => emp.pickupStopId === currentStop.id);
    return list.map((emp) => ({
      id: emp.id,
      name: emp.fullName,
      number: emp.phone ?? '',
      status: attendanceStatusByEmployeeId[emp.id] ?? 'absent',
    }));
  }, [currentStop, tripEmployeesRaw, attendanceStatusByEmployeeId]);

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

  const handleSlideComplete = useCallback(() => {
    if (!currentStop || !stops.length) {
      return;
    }

    if (!rideStarted) {
      // First slide: start trip and navigate to first stop
      setRideStarted(true);
      openInMaps(currentStop);
      return;
    }

    if (!isLastStop) {
      // Mark current stop as arrived and navigate to next stop
      const nextIndex = currentStopIndex + 1;
      const nextStop = stops[nextIndex];
      setCurrentStopIndex(nextIndex);
      openInMaps(nextStop);
    } else {
      // Final stop: complete trip and return home
      router.push('/shuttle');
    }
  }, [rideStarted, isLastStop, currentStop, currentStopIndex, openInMaps]);

  return (
    <SafeAreaView style={styles.root}>
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

        {/* Next stop card */}
        <View style={styles.cardOuter}>
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
        </View>

        {/* Employees list */}
        <View style={styles.sectionHeader}>
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
        </View>

        {/* Slide control */}
        <View style={styles.slideWrapper}>
          <SlideToStartTrip
            key={slideKey}
            label={slideLabel}
            onComplete={handleSlideComplete}
          />
        </View>
      </ScrollView>

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
        <BottomSheetView style={{ flex: 1 }}>
          {/* Header */}
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: 8,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flex: 1 }} >
             
              {!!selectedEmployee && (
               <View className='flex flex-row items-center'>
               <View style={styles.employeeAvatarSecond}>
                <Text style={styles.employeeAvatarText}>
                  {getInitials(selectedEmployee.name)}
                </Text>
              </View>
              <View style={styles.employeeInfo}>
                <Text className='text-2xl font-semibold' numberOfLines={1}>
                  {selectedEmployee.name}
                </Text>
                <Text className='text-base text-gray-600 ' numberOfLines={1}>
                  {selectedEmployee.status === 'present' ? 'Present' : 'Absent'}
                </Text>
              </View>
               </View>
              )}
            </View>
            <Pressable
              onPress={() => setSelectedEmployee(null)}
              hitSlop={10}
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="close" size={18} color="#6B7280" />
            </Pressable>
          </View>

          {/* Divider */}
          <View
            style={{
              height: StyleSheet.hairlineWidth,
              backgroundColor: 'rgba(229,231,235,1)',
              marginHorizontal: 20,
              marginBottom: 4,
            }}
          />

          {/* Mark as present / absent (localized); present triggers API, refetch updates UI */}
          {(() => {
            const currentStatus =
              selectedEmployee != null
                ? attendanceStatusByEmployeeId[selectedEmployee.id] ?? 'absent'
                : 'absent';
            const isPresent = currentStatus === 'present';
            const primaryLabel = isUrdu
              ? isPresent
                ? 'غیر حاضر نشان زد کریں'
                : 'حاضری لگائیں'
              : isPresent
                ? 'Mark as absent'
                : 'Mark as present';
            const isBusy = isScanning || isMarkingAbsent || isAttendanceFetching;

            return (
              <Pressable
                onPress={() => {
                  if (!selectedEmployee) {
                    setSelectedEmployee(null);
                    return;
                  }
                  if (isPresent && activeTrip) {
                    markPassengerAbsent({
                      shuttleTripId: activeTrip.id,
                      employeeId: selectedEmployee.id,
                    })
                      .unwrap()
                      .then(() => setSelectedEmployee(null))
                      .catch(() => {});
                  } else if (!isPresent && activeTrip) {
                    scanPassenger({
                      shuttleTripId: activeTrip.id,
                      employeeId: selectedEmployee.id,
                      status: 'PRESENT',
                    })
                      .unwrap()
                      .then(() => setSelectedEmployee(null))
                      .catch(() => {});
                  }
                }}
                disabled={isBusy}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  opacity: isBusy ? 0.6 : 1,
                }}
              >
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  <Ionicons name="checkmark-circle-outline" size={24} color="black" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>
                    {isBusy ? (isUrdu ? 'لوڈ ہو رہا ہے…' : 'Loading…') : primaryLabel}
                  </Text>
                </View>
              </Pressable>
            );
          })()}

          {/* Call passenger / فون کریں */}
          <Pressable
            onPress={() => {
              if (selectedEmployee) {
                handleCall(selectedEmployee.number);
              }
              setSelectedEmployee(null);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingVertical: 10,
            }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: '#F3F4F6',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              <Ionicons name="call-outline" size={18} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }} >
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>
                {isUrdu ? 'فون کریں' : 'Call passenger'}
              </Text>
            </View>
          </Pressable>

          {/* Divider before destructive action */}
          <View
            style={{
              height: StyleSheet.hairlineWidth,
              backgroundColor: 'rgba(229,231,235,1)',
              marginHorizontal: 20,
              marginVertical: 8,
            }}
          />

          {/* Cancel / پیچھے جائیں (red row) */}
          <Pressable
            onPress={() => setSelectedEmployee(null)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingVertical: 10,
            }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              <Ionicons name="close-circle-outline" size={18} color="#DC2626" />
            </View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#DC2626' }}>
              {isUrdu ? 'پیچھے جائیں' : 'Cancel'}
            </Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>
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

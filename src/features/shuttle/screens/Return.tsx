import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { SlideToStartTrip } from '../components';
import {
  useGetTripEmployeesQuery,
  useSubmitReturnAttendanceMutation,
  useCompleteTripMutation,
  TripEmployee,
} from '../services/shuttleApi';
import { useActiveTrip, type Stop } from '../hooks/useActiveTrip';

type EmployeeStatus = 'present' | 'absent';
type AbsentReason = 'SELF_COMMUTE' | 'LATE' | 'SICK';

type ReturnEmployee = {
  id: string;
  name: string;
  number: string;
  status: EmployeeStatus;
  absentReason?: AbsentReason;
};

const ABSENT_REASONS: { value: AbsentReason; label: string }[] = [
  { value: 'SELF_COMMUTE', label: 'Self commute' },
  { value: 'LATE', label: 'Late' },
  { value: 'SICK', label: 'Sick' },
];

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function getAbsentReasonLabel(reason: AbsentReason): string {
  return ABSENT_REASONS.find((r) => r.value === reason)?.label ?? reason;
}

export default function Return() {
  const absentSheetRef = useRef<BottomSheetModal>(null);
  const absentSnapPoints = useMemo(() => ['40%'], []);
  const { activeTrip, tripId, stops, isLoading: isTripsLoading } = useActiveTrip();
  const { data: tripEmployeesRaw = [], isLoading: isEmployeesLoading } = useGetTripEmployeesQuery(
    tripId as number,
    { skip: !tripId },
  );
  const [submitReturnAttendance, { isLoading: isSubmitting }] = useSubmitReturnAttendanceMutation();
  const [completeTrip, { isLoading: isCompletingTrip }] = useCompleteTripMutation();

  // Track present/absent per employee for the return trip; default is absent.
  const [employees, setEmployees] = useState<ReturnEmployee[]>([]);
  const [employeeForAbsent, setEmployeeForAbsent] = useState<ReturnEmployee | null>(null);
  const [sliderKey, setSliderKey] = useState(0);
  const [returnTripStarted, setReturnTripStarted] = useState(false);

  useEffect(() => {
    if (!tripEmployeesRaw.length) return;
    setEmployees((prev) => {
      // Initialize only once when we get data for this trip
      if (prev.length > 0) return prev;
      return tripEmployeesRaw.map((emp: TripEmployee) => ({
        id: emp.id,
        name: emp.fullName,
        number: emp.phone ?? '',
        status: 'absent' as const,
      }));
    });
  }, [tripEmployeesRaw]);

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
    const waypoints =
      coords.length > 2 ? coords.slice(1, coords.length - 1).join('|') : '';

    let url = 'https://www.google.com/maps/dir/?api=1&travelmode=driving';
    if (origin) url += `&origin=${encodeURIComponent(origin)}`;
    if (destination) url += `&destination=${encodeURIComponent(destination)}`;
    if (waypoints) url += `&waypoints=${encodeURIComponent(waypoints)}`;

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
      if (!employees.length) {
        router.push('/shuttle');
        return;
      }
      try {
        await submitReturnAttendance({
          shuttleTripId: tripId,
          entries: employees.map((emp) => ({
            employee_id: emp.id,
            status: emp.status === 'present' ? 'PRESENT' : 'ABSENT',
            ...(emp.status === 'absent' &&
              emp.absentReason && { absent_reason: emp.absentReason }),
          })),
        }).unwrap();
        setReturnTripStarted(true);
        setSliderKey((k) => k + 1);
        openStopsInMaps(stops);
      } catch {
        // On error, remount slider so user can retry; stay on screen
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
      setSliderKey((k) => k + 1);
      router.push('/shuttle');
    } catch {
      // On error, remount slider so user can retry; stay on screen
      setSliderKey((k) => k + 1);
    }
  }, [
    tripId,
    employees,
    returnTripStarted,
    submitReturnAttendance,
    completeTrip,
    openStopsInMaps,
    stops,
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

  return (
    <SafeAreaView className="flex-1 bg-[#FFFFFF]" edges={['top']}>
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        {/* Title */}
        <View className="mb-6">
          <Text className="text-[34px] font-bold text-black">Return trip</Text>
          <Text className="text-base font-medium text-[#6B7280] mt-1">
            Tower → Clifton
          </Text>
        </View>

        {/* Attendance section */}
        <View className="mb-6">
          <Text className="text-xl px-2 font-bold mb-1 text-black">
            Mark attendance
          </Text>
          <Text className="text-sm px-2 mb-4 text-[#6B7280]">
            Mark employees as present or absent for the return trip
          </Text>

          <View className="rounded-2xl bg-[#F5F5F2] overflow-hidden">
            {employees.map((emp, index) => (
              <View
                key={emp.id}
                className="flex-row items-center py-4 px-4"
                style={
                  index < employees.length - 1
                    ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(156,163,175,0.35)' }
                    : undefined
                }
              >
                <View className="w-12 h-12 rounded-xl items-center justify-center mr-3 bg-white">
                  <Text className="text-black font-semibold text-sm">
                    {getInitials(emp.name)}
                  </Text>
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-black font-bold text-base" numberOfLines={1}>
                    {emp.name}
                  </Text>
                  <Text className="text-[#6B7280] text-sm mt-0.5" numberOfLines={1}>
                    {emp.status === 'absent' && emp.absentReason
                      ? getAbsentReasonLabel(emp.absentReason)
                      : emp.number}
                  </Text>
                </View>
                <View className="flex-row gap-2">
                  <Pressable
                    onPress={() => handleMarkPresent(emp.id)}
                    className="px-3 py-2 rounded-lg active:opacity-80"
                    style={{
                      backgroundColor:
                        emp.status === 'present' ? 'rgba(34, 197, 94, 0.12)' : '#FFFFFF',
                      borderWidth: 1,
                      borderColor:
                        emp.status === 'present'
                          ? 'rgba(34, 197, 94, 0.7)'
                          : 'rgba(209, 213, 219, 1)',
                    }}
                  >
                    <Text
                      className="text-sm font-semibold"
                      style={{
                        color: emp.status === 'present' ? '#16a34a' : '#4B5563',
                      }}
                    >
                      Present
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleMarkAbsent(emp)}
                    className="px-3 py-2 rounded-lg active:opacity-80"
                    style={{
                      backgroundColor:
                        emp.status === 'absent' ? 'rgba(239, 68, 68, 0.10)' : '#FFFFFF',
                      borderWidth: 1,
                      borderColor:
                        emp.status === 'absent'
                          ? 'rgba(239, 68, 68, 0.7)'
                          : 'rgba(209, 213, 219, 1)',
                    }}
                  >
                    <Text
                      className="text-sm font-semibold"
                      style={{
                        color: emp.status === 'absent' ? '#b91c1c' : '#4B5563',
                      }}
                    >
                      Absent
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Slide to complete */}
        <View className="mb-8">
          <SlideToStartTrip
            key={sliderKey}
            label={returnTripStarted ? 'Slide to complete trip' : 'Slide to begin trip'}
            onComplete={handleSlideReturnTrip}
          />
        </View>
      </ScrollView>

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
          <View className="px-5 pb-8">
            <Text className="text-lg font-bold mb-1 text-black">
              Why is this person absent?
            </Text>
            <Text className="text-sm mb-6 text-[#6B7280]">
              {employeeForAbsent?.name}
            </Text>

            {ABSENT_REASONS.map((reason) => (
              <Pressable
                key={reason.value}
                onPress={() => handleSelectAbsentReason(reason.value)}
                className="py-3 rounded-xl items-center justify-center active:opacity-90 mb-3"
                style={{
                  backgroundColor: '#F5F5F2',
                  borderWidth: 1,
                  borderColor: 'rgba(209,213,219,1)',
                }}
              >
                <Text className="text-base font-semibold text-black">
                  {reason.label}
                </Text>
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

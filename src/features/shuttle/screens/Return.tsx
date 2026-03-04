import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { SlideToStartTrip } from '../components';
import {
  useGetTripEmployeesQuery,
  useSubmitReturnAttendanceMutation,
  useCompleteTripMutation,
  useStartTripMutation,
  TripEmployee,
} from '../services/shuttleApi';
import { useActiveTrip, type Stop } from '../hooks/useActiveTrip';
import { fontFamily } from '@/core/theme';
import { useToast } from '@/shared/ui/molecules/Toast';
import { CustomToast } from '@/features/shared/components/CustomToast';
import { useLanguage } from '@/features/shared/context/LanguageContext';

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
  const { language } = useLanguage();
  const isUrdu = language === 'ur';
  const toast = useToast();
  const absentSheetRef = useRef<BottomSheetModal>(null);
  const absentSnapPoints = useMemo(() => ['40%'], []);
  const { activeTrip, tripId, stops, isLoading: isTripsLoading } = useActiveTrip();
  const { data: realTripEmployeesRaw = [], isLoading: isEmployeesLoading } = useGetTripEmployeesQuery(
    tripId as number,
    { skip: !tripId },
  );

  const tripEmployeesRaw = realTripEmployeesRaw;
  const [submitReturnAttendance, { isLoading: isSubmitting }] = useSubmitReturnAttendanceMutation();
  const [completeTrip, { isLoading: isCompletingTrip }] = useCompleteTripMutation();
  const [startTrip, { isLoading: isStartingTrip }] = useStartTripMutation();

  const isActionLoading = isSubmitting || isStartingTrip || isCompletingTrip;

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
        status: null,
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

      // Validate that all employees have been marked
      const unmarked = employees.filter((e) => e.status === null);
      if (unmarked.length > 0) {
        toast.show(
          <CustomToast
            type="error"
            message={isUrdu ? 'شروع کرنے سے پہلے تمام حاضری درج کریں' : 'Mark all attendance to start ride'}
          />,
          { duration: 3500, position: 'top', backgroundColor: '#ff4545' },
        );
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

        if (activeTrip?.route_id) {
          await startTrip({
            route_id: activeTrip.route_id,
            direction: 'EVENING',
          }).unwrap();
        }

        setReturnTripStarted(true);
        setSliderKey((k) => k + 1);
        openStopsInMaps(stops);
      } catch {
        // On error, remount slider so user can retry; stay on screen
        toast.show(
          <CustomToast type="error" message={isUrdu ? 'شروع نہ ہو سکی' : 'Could not start ride'} />,
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
    completeTrip,
    openStopsInMaps,
    stops,
    toast,
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
      {!returnTripStarted && (
        <Pressable onPress={() => router.back()}>
          <View className="flex-row items-center gap-2 ml-[-4px] px-6 mb-3">
            <Feather name="chevron-left" size={24} color="black" />
            {/* <Text className="text-black font-bold">Home</Text> */}
          </View>
        </Pressable>
      )}
      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Title */}

        <View className="mb-3">
          <AppText className={`text-[34px] font-bold text-black ${isUrdu ? 'ml-auto' : ''}`}>
            {isUrdu ? 'واپسی کا سفر' : 'Return trip'}
          </AppText>
        </View>

        {/* Attendance section */}
        <View className="mb-6">
          <AppText className={`text-xl font-bold mb-1 text-black ${isUrdu ? 'ml-auto' : ''}`}>
            {isUrdu ? 'حاضری' : 'Mark attendance'}
          </AppText>
          <AppText className={`text-sm mb-4 text-[#6B7280] ${isUrdu ? 'ml-auto' : ''}`}>
            {isUrdu ? 'افراد کی حاضری یا غیر حاضری مقرر کریں' : 'Mark employees as present or absent for the return trip'}
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
                        ? getAbsentReasonLabel(emp.absentReason)
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

      <View className="absolute bottom-16 left-5 right-5 pointer-events-auto">
        <Pressable
          onPress={handleSlideReturnTrip}
          disabled={isActionLoading}
          className="bg-[#FF5A00] flex-row items-center justify-center py-4 rounded-xl active:opacity-90 disabled:opacity-70"
        >
          {isActionLoading && (
            <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
          )}
          <AppText className="text-white text-[17px] font-bold mr-1">
            {isActionLoading
              ? (returnTripStarted ? 'Completing...' : (isUrdu ? 'شروع ہو رہی' : 'Beginning...'))
              : (returnTripStarted ? 'Complete Trip' : (isUrdu ? 'شروع کریں' : 'Begin ride'))}
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
            <AppText className="text-lg font-bold mb-4 text-black">
              Why is this person absent?
            </AppText>


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
                <AppText className="text-base font-semibold text-black">
                  {reason.label}
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

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { SlideToStartTrip } from '../components';
import { useShuttleStore } from '../store';

type EmployeeStatus = 'present' | 'absent';
type AbsentReason = 'SELF_COMMUTE' | 'LATE' | 'SICK';

type ReturnEmployee = {
  id: string;
  name: string;
  number: string;
  status: EmployeeStatus;
  absentReason?: AbsentReason;
};

const RETURN_EMPLOYEES: ReturnEmployee[] = [
  { id: '1', name: 'Saleem Ali', number: '+92 300 1234567', status: 'present' },
  { id: '2', name: 'Sajid Ahmed', number: '+92 300 9876543', status: 'absent' },
  { id: '3', name: 'Haroon Ali', number: '+92 300 5551234', status: 'present' },
  { id: '4', name: 'Fatima Khan', number: '+92 300 7771234', status: 'absent' },
];

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
  const [employees, setEmployees] = useState<ReturnEmployee[]>(RETURN_EMPLOYEES);
  const [employeeForAbsent, setEmployeeForAbsent] = useState<ReturnEmployee | null>(null);
  const setOutboundRideCompleted = useShuttleStore((s) => s.setOutboundRideCompleted);

  const handleCompleteReturnTrip = useCallback(() => {
    setOutboundRideCompleted(false);
    router.push('/shuttle/(home)');
  }, [setOutboundRideCompleted]);

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
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        {/* Header */}
       

        {/* Title */}
        <View className="mb-6">
          <Text className="text-[34px] font-bold text-white">Return trip</Text>
          <Text className="text-white/50 text-xl font-medium mt-1">Tower → Clifton</Text>
        </View>

        {/* Attendance section */}
        <View className="mb-6">
          <Text className="text-white text-xl px-2 font-bold mb-4">Mark attendance</Text>
          <Text className="text-white/50 text-sm px-2 mb-4">
            Mark employees as present or absent for the return trip
          </Text>

          <View className="rounded-xl bg-surface-background overflow-hidden">
            {employees.map((emp) => (
              <View
                key={emp.id}
                className="flex-row items-center py-4 px-4 border-b border-white/5 last:border-b-0"
              >
                <View className="w-12 h-12 rounded-xl items-center justify-center mr-3 bg-sheet">
                  <Text className="text-white font-semibold text-sm">
                    {getInitials(emp.name)}
                  </Text>
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-white font-bold text-base" numberOfLines={1}>
                    {emp.name}
                  </Text>
                  <Text className="text-white/50 text-sm mt-0.5" numberOfLines={1}>
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
                        emp.status === 'present' ? 'rgba(34, 197, 94, 0.25)' : 'rgba(255,255,255,0.08)',
                      borderWidth: 1,
                      borderColor:
                        emp.status === 'present'
                          ? 'rgba(34, 197, 94, 0.6)'
                          : 'rgba(255,255,255,0.15)',
                    }}
                  >
                    <Text
                      className="text-sm font-semibold"
                      style={{
                        color: emp.status === 'present' ? '#22c55e' : 'rgba(255,255,255,0.6)',
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
                        emp.status === 'absent' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255,255,255,0.08)',
                      borderWidth: 1,
                      borderColor:
                        emp.status === 'absent'
                          ? 'rgba(239, 68, 68, 0.6)'
                          : 'rgba(255,255,255,0.15)',
                    }}
                  >
                    <Text
                      className="text-sm font-semibold"
                      style={{
                        color: emp.status === 'absent' ? '#ef4444' : 'rgba(255,255,255,0.6)',
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
            label="Slide to complete return trip"
            onComplete={handleCompleteReturnTrip}
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
        backgroundStyle={{ backgroundColor: '#1F1F1D' }}
        handleIndicatorStyle={{ backgroundColor: 'rgba(255,255,255,0.4)' }}
      >
        <BottomSheetView style={styles.absentSheetContent}>
          <View className="px-5 pb-8">
            <Text className="text-white text-lg font-bold mb-1">Why is this person absent?</Text>
            <Text className="text-white/50 text-sm mb-6">{employeeForAbsent?.name}</Text>

            {ABSENT_REASONS.map((reason) => (
              <Pressable
                key={reason.value}
                onPress={() => handleSelectAbsentReason(reason.value)}
                className="py-3 rounded-xl items-center justify-center active:opacity-90 mb-3"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.15)',
                }}
              >
                <Text className="text-base font-semibold text-white">{reason.label}</Text>
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
    backgroundColor: '#1F1F1D',
  },
});

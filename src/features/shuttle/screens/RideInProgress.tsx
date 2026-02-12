import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import {
  shuttleCoordinates,
  mockShuttlePolyline,
} from '@/services/mockData';
import { colors, radii, shadows } from '@/core/theme';
import { SlideToStartTrip } from '../components';
import { useShuttleStore } from '../store';
import { router } from 'expo-router';

const FIRST_STOP = { name: 'Office', address: 'Clifton Campus, Building A' };

type EmployeeStatus = 'present' | 'absent';

type StopEmployee = { id: string; name: string; number: string; status: EmployeeStatus };

const STOP_EMPLOYEES: StopEmployee[] = [
  { id: '1', name: 'Saleem Ali', number: '+92 300 1234567', status: 'present' },
  { id: '2', name: 'Sajid Ahmed', number: '+92 300 9876543', status: 'absent' },
  { id: '3', name: 'Haroon Ali', number: '+92 300 5551234', status: 'present' },
];

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function RideInProgress() {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const actionSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['50%', '65%', '75%'], []);
  const actionSnapPoints = useMemo(() => ['35%'], []);
  const [rideStarted, setRideStarted] = useState(false);
  const [stopArrived, setStopArrived] = useState(false);
  const [employees, setEmployees] = useState<StopEmployee[]>(STOP_EMPLOYEES);
  const [selectedEmployee, setSelectedEmployee] = useState<StopEmployee | null>(null);

  React.useEffect(() => {
    if (selectedEmployee) {
      actionSheetRef.current?.present();
    }
  }, [selectedEmployee]);

  const handleToggleStatus = useCallback((employeeId: string, status: EmployeeStatus) => {
    setEmployees((prev) =>
      prev.map((e) => (e.id === employeeId ? { ...e, status } : e))
    );
    actionSheetRef.current?.dismiss();
    setSelectedEmployee(null);
  }, []);

  const handleCall = useCallback((phone?: string) => {
    if (phone) {
      const url = Platform.OS === 'ios' ? `telprompt:${phone}` : `tel:${phone}`;
      Linking.openURL(url).catch(() => {});
    }
  }, []);

  const handleMarkAsArrived = useCallback(() => {
    setStopArrived(true);
    bottomSheetRef.current?.snapToIndex(1);
  }, []);

  const setOutboundRideCompleted = useShuttleStore((s) => s.setOutboundRideCompleted);

  const handleProceedToNextStop = useCallback(() => {
    setOutboundRideCompleted(true);
    router.push('/shuttle/(home)');
  }, [setOutboundRideCompleted]);

  const routePoints = useMemo(
    () =>
      mockShuttlePolyline.map((p) => ({
        latitude: p.latitude,
        longitude: p.longitude,
      })),
    []
  );

  const [busIndex, setBusIndex] = useState(0);
  React.useEffect(() => {
    const t = setInterval(() => {
      setBusIndex((i) => (i + 1) % routePoints.length);
    }, 1500);
    return () => clearInterval(t);
  }, [routePoints.length]);

  const busCoord = routePoints[Math.min(busIndex, routePoints.length - 1)];

  const handleSheetChanges = useCallback((index: number) => {}, []);

  return (
    <View style={styles.root}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: shuttleCoordinates.latitude,
          longitude: shuttleCoordinates.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        toolbarEnabled={false}
        showsMyLocationButton={false}
        showsUserLocation
        userInterfaceStyle='dark'
      >
        <Polyline
          coordinates={routePoints}
          strokeWidth={4}
          strokeColor="rgba(12, 34, 94, 0.65)"
        />
        {busCoord ? (
          <Marker coordinate={busCoord} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.busMarker}>
              <MaterialCommunityIcons name="bus" size={18} color={colors.white} />
            </View>
          </Marker>
        ) : null}
      </MapView>

      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose={false}
        onChange={handleSheetChanges}
       
        backgroundStyle={{ backgroundColor: '#1F1F1D'}}
        handleIndicatorStyle={{ backgroundColor: 'rgba(255,255,255,0.4)' }}
      >
        <BottomSheetView style={styles.sheetContent}>
          <View className="px-5 pb-8">
            {!rideStarted ? (
              <>
                <Text className="text-text-primary text-2xl font-bold mb-1">
                  Ready to go
                </Text>
                <Text className="text-text-muted text-sm mb-5">
                  HIACE - ABR 986 
                </Text>

                <View
                  className="rounded-2xl p-4 mb-5 flex-row"
                  style={{ backgroundColor: '#28282a' }}
                >
                  <View
                    className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                    style={{ backgroundColor: '#3a3a3d' }}
                  >
                    <Ionicons name="location" size={22} color="#856ff6" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white text-base font-semibold mb-0.5">
                      First stop
                    </Text>
                   
                    <Text className="text-text-muted text-sm mt-0.5">
                      {FIRST_STOP.address}
                    </Text>
                  </View>
                </View>

                <SlideToStartTrip onComplete={() => setRideStarted(true)} />
              </>
            ) : stopArrived ? (
              <View className="flex-1">
                <Text className="text-text-primary text-2xl font-bold mb-1">
                  Stop arrived
                </Text>
                <Text className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-2 mt-4 ml-3">
                  Employees
                </Text>

                <View className="mb-6 rounded-xl bg-[#2c2c2e] overflow-hidden">
                  {employees.map((emp) => (
                    <View
                      key={emp.id}
                      className="flex-row items-center py-4 px-3 border-b-white/10 border-b-[1px]"
                    >
                      <View
                        className="w-12 h-12 rounded-xl items-center justify-center mr-3 bg-sheet"
                      >
                        <Text className="text-white font-semibold text-sm">
                          {getInitials(emp.name)}
                        </Text>
                      </View>
                      <View className="flex-1 min-w-0">
                        <Text className="text-white font-bold text-base" numberOfLines={1}>
                          {emp.name}
                        </Text>
                        <Text className="text-text-muted text-sm mt-0.5" numberOfLines={1}>
                          {emp.status === 'present' ? 'Present' : 'Absent'}
                        </Text>
                      </View>
                      <Pressable
                        hitSlop={8}
                        onPress={() => setSelectedEmployee(emp)}
                        className="w-8 h-8 items-center justify-center active:opacity-70"
                      >
                        <Ionicons
                          name="ellipsis-horizontal"
                          size={20}
                          color="rgba(255,255,255,0.7)"
                        />
                      </Pressable>
                    </View>
                  ))}
                </View>

                <Pressable
                  onPress={handleProceedToNextStop}
                  className="py-3 rounded-xl bg-white items-center justify-center active:opacity-90"
                >
                  <Text className="text-black font-semibold text-base">Proceed to next stop</Text>
                </Pressable>
              </View>
            ) : (
              <View>
                <Text className="text-text-muted text-lg ">Next Stop</Text>

                <Text className="text-text-primary text-2xl font-bold mb-1">
                  National Incubation Centre
                </Text>
                <Text className="text-text-muted font-bold text-xl  mb-4">5:45PM ETA</Text>
                <Pressable
                  onPress={handleMarkAsArrived}
                  className="py-3 rounded-xl bg-white items-center justify-center active:opacity-90 mb-4"
                >
                  <Text className="text-black font-semibold text-base">Mark as arrived</Text>
                </Pressable>
              </View>
            )}
          </View>
        </BottomSheetView>
      </BottomSheet>

      <BottomSheetModal
        ref={actionSheetRef}
        snapPoints={actionSnapPoints}
        enablePanDownToClose
        onDismiss={() => setSelectedEmployee(null)}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
        )}
        backgroundStyle={{ backgroundColor: '#1F1F1D' }}
        handleIndicatorStyle={{ backgroundColor: 'rgba(255,255,255,0.4)' }}
      >
        <BottomSheetView style={styles.actionSheetContent}>
          <View className="px-5 pb-8">
            <Text className="text-text-primary text-lg font-bold mb-1">
              Update status
            </Text>
            <Text className="text-text-muted text-sm mb-5">
              {selectedEmployee?.name}
            </Text>

            <Pressable
              onPress={() => selectedEmployee && handleToggleStatus(selectedEmployee.id, 'present')}
              className="py-3 rounded-xl items-center justify-center active:opacity-90 mb-3"
              style={{
                backgroundColor: 'rgba(34, 197, 94, 0.2)',
                borderWidth: 1,
                borderColor: 'rgba(34, 197, 94, 0.5)',
              }}
            >
              <Text className="text-base font-semibold" style={{ color: '#22c55e' }}>
                Mark as Present
              </Text>
            </Pressable>

            <Pressable
              onPress={() => selectedEmployee && handleToggleStatus(selectedEmployee.id, 'absent')}
              className="py-3 rounded-xl items-center justify-center active:opacity-90"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                borderWidth: 1,
                borderColor: 'rgba(239, 68, 68, 0.5)',
              }}
            >
              <Text className="text-base font-semibold" style={{ color: '#ef4444' }}>
                Mark as Absent
              </Text>
            </Pressable>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  map: { ...StyleSheet.absoluteFillObject },
  busMarker: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
    ...shadows.floating,
  },
  sheetContent: {
    flex: 1,
    backgroundColor: '#1F1F1D',
  },
  actionSheetContent: {
    flex: 1,
    backgroundColor: '#1F1F1D',
  },
});

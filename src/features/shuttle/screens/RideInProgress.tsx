import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import {
  shuttleCoordinates,
  mockShuttlePolyline,
} from '@/services/mockData';
import { colors, radii, shadows } from '@/core/theme';
import { SlideToStartTrip } from '../components';

const FIRST_STOP = { name: 'Office', address: 'Clifton Campus, Building A' };

export default function RideInProgress() {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['40%', '65%'], []);
  const [rideStarted, setRideStarted] = useState(false);

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
        backgroundStyle={{ backgroundColor: '#1F1F1D' }}
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
                  Bus #Van-88 · Mirpur Campus
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
                    <Text className="text-white font-bold text-lg">
                      {FIRST_STOP.name}
                    </Text>
                    <Text className="text-text-muted text-sm mt-0.5">
                      {FIRST_STOP.address}
                    </Text>
                  </View>
                </View>

                <SlideToStartTrip onComplete={() => setRideStarted(true)} />
              </>
            ) : (
              <>
                <Text className="text-text-primary text-xl font-bold mb-1">
                  Trip in Progress
                </Text>
                <Text className="text-text-muted text-sm mb-4">
                  Bus #Van-88 · Mirpur Campus
                </Text>

                <View
                  className="rounded-2xl p-4 bg-surface-light flex-row items-center justify-between mb-3"
                >
                  <View className="flex-row items-center gap-3">
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center"
                      style={{ backgroundColor: '#3a3a3d' }}
                    >
                      <Ionicons name="location" size={20} color="#856ff6" />
                    </View>
                    <View>
                      <Text className="text-text-muted text-xs">Next stop</Text>
                      <Text className="text-white text-base font-semibold">
                        Tower Station
                      </Text>
                    </View>
                  </View>
                  <Text className="text-text-muted text-sm">~5 min</Text>
                </View>

                <View
                  className="rounded-2xl p-4 flex-row bg-surface-light items-center justify-between"
                >
                  <View className="flex-row items-center gap-3">
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center"
                      style={{ backgroundColor: '#3a3a3d' }}
                    >
                      <MaterialCommunityIcons
                        name="account-group"
                        size={20}
                        color="#856ff6"
                      />
                    </View>
                    <View>
                      <Text className="text-text-muted text-xs">Passengers</Text>
                      <Text className="text-white text-base font-semibold">
                        3 boarded · 1 pending
                      </Text>
                    </View>
                  </View>
                </View>
              </>
            )}
          </View>
        </BottomSheetView>
      </BottomSheet>
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
});

import React, { useMemo, useRef } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import {
  shuttleCoordinates,
  mockShuttlePolyline,
} from '@/services/mockData';
import { colors, radii, shadows } from '@/core/theme';

export default function NewHome() {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['40%', '65%'], []);

  const routePoints = useMemo(
    () =>
      mockShuttlePolyline.map((p) => ({
        latitude: p.latitude,
        longitude: p.longitude,
      })),
    []
  );

  return (
    <View style={styles.root}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: shuttleCoordinates.latitude,
          longitude: shuttleCoordinates.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        toolbarEnabled={false}
        showsMyLocationButton={false}
        showsUserLocation
        userInterfaceStyle="light"
      >
        <Polyline
          coordinates={routePoints}
          strokeWidth={4}
          strokeColor="rgba(12, 34, 94, 0.65)"
        />
        <Marker
          coordinate={shuttleCoordinates}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View style={styles.busMarker}>
            <MaterialCommunityIcons name="bus" size={18} color={colors.white} />
          </View>
        </Marker>
      </MapView>

      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose={false}
        backgroundStyle={{ backgroundColor: '#FFFF' ,borderRadius:30}}
        handleIndicatorStyle={{ backgroundColor: 'rgba(255,255,255,0.4)' }}
      >
        <BottomSheetView style={styles.sheetContent}>
          <View style={styles.sheetInner}>
            <Text style={styles.headerText}>Ride is on the way ~ 6 min</Text>
            <Text style={styles.routeText}>Clifton ⇄ Tower Loop</Text>

            {/* Driver info */}
            <View style={styles.driverRow}>
              <View style={styles.driverAvatar}>
                <Text style={styles.driverInitial}>S</Text>
              </View>
              <View style={styles.driverDetails}>
                <Text style={styles.driverName}>Sajjad</Text>
                <View>
                  <Text style={styles.vehicleInfo}>White Toyota Hiace</Text>
                  <View style={styles.numberPlate}>
                    <Image
                      source={require('@/../assets/ajrak.jpeg')}
                      style={styles.numberPlateDesign}
                      resizeMode="cover"
                    />
                    <View style={styles.numberPlateNumber}>
                      <Text style={styles.numberPlateText}>ABR 986</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
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
    backgroundColor: '#fff',
  },
  sheetInner: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  headerText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
    marginBottom: 2,
  },
  routeText: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 16,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  driverAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f47f00',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  driverInitial: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111',
    marginBottom: 2,
  },
  vehicleInfo: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 6,
  },
  numberPlate: {
    width: 100,
    height: 30,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    alignSelf: 'flex-start',
  },
  numberPlateDesign: {
    width: '100%',
    height: 6,
  },
  numberPlateNumber: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberPlateText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: 1,
  },
});

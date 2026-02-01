import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { DrawerActions } from '@react-navigation/native';
import { colors, radii, shadows, typography } from '../../../core/theme';
import { useAppSelector } from '../../../store/hooks';
import { activeRide, mockShuttlePolyline, shuttleCoordinates } from '../../../services/mockData';
import { useNavigation } from 'expo-router';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

type Props = {
  onScanPress?: () => void;
  onPreviewSuccessPress?: () => void;
  onChauffeurPress?: () => void;
  chauffeurRideLoading?: boolean;
};

export function EmployeeDashboardScreen({
  onScanPress,
  onPreviewSuccessPress,
  onChauffeurPress,
  chauffeurRideLoading,
}: Props) {
  const navigation=useNavigation();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['30%','75%'], []);

  // callbacks
  const handleSheetChanges = useCallback((index: number) => {
    console.log('handleSheetChanges', index);
  }, []);
  // TODO: User data needs to be handled separately (e.g., from API or separate store)
  // The simplified auth state only tracks login status, not user details
  const user = useAppSelector(state => state.auth.user);
  const chauffeurRide = useAppSelector(state => state.employeeRide.chauffeurRide);
  const activeChauffeurRide = chauffeurRide;
  const activeShuttleService = user?.enabled_services.shuttle;
  const routePoints = useMemo(
    () => mockShuttlePolyline.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
    []
  );

  const [busIndex, setBusIndex] = useState(0);
  const busTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    busTimer.current = setInterval(() => {
      setBusIndex((i) => (i + 1) % routePoints.length);
    }, 1200);

    return () => {
      if (busTimer.current) clearInterval(busTimer.current);
      busTimer.current = null;
    };
  }, [routePoints.length]);

  const busCoord = routePoints[Math.min(busIndex, routePoints.length - 1)];

  return (
    <SafeAreaView style={styles.root}>
      
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
      >
        <Polyline coordinates={routePoints} strokeWidth={4} strokeColor="rgba(12, 34, 94, 0.65)" />

        {busCoord ? (
          <Marker coordinate={busCoord} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.busMarker}>
              <MaterialCommunityIcons name="bus" size={18} color={colors.white} />
            </View>
          </Marker>
        ) : null}

        {activeChauffeurRide ? (
          <Marker
            coordinate={{
              latitude: shuttleCoordinates.latitude + 0.0012,
              longitude: shuttleCoordinates.longitude - 0.001,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.carMarker}>
              <MaterialCommunityIcons name="car" size={18} color={colors.white} />
            </View>
          </Marker>
        ) : null}
      </MapView>

      <View pointerEvents="none" style={styles.mapOverlay} />

        {/* <Pressable className='absolute top-0 left-4 bg-white rounded-full p-2' onPress={()=>navigation.dispatch(DrawerActions.openDrawer())}>
        <Ionicons name="menu" size={24} color="black" />
        </Pressable>
        {activeShuttleService && <View style={styles.topCard}>
        <Text style={styles.topLabel}>MY SHUTTLE ROUTE</Text>
        <Text className="text-2xl" numberOfLines={1}>
        Clifton ⇄ Tower Loop
        </Text>
        <Text style={styles.status}>Arriving in 5 min</Text>
        </View>} */}
        <BottomSheet
        ref={bottomSheetRef}
        index={1}
        snapPoints={snapPoints}
        enablePanDownToClose={false}
        onChange={handleSheetChanges}
      >
        <BottomSheetView className='flex-1 rounded-lg'>
        <SafeAreaView className='w-full h-full '>
  {chauffeurRideLoading || activeChauffeurRide ? (
    <View pointerEvents="box-none" >
      
        {/* Header Section */}
        <View className="px-5 pb-4 -mt-8">
          <Text className="text-3xl font-bold text-gray-900 mb-1">
            Get ready, your chauffeur is on the way
          </Text>
        </View>

        {/* Driver Info Section */}
        <View className="px-5 pb-4 flex-row items-center">
          {/* Driver Avatar */}
          {chauffeurRideLoading ? (
            <View className="w-14 h-14 rounded-full bg-gray-200 mr-4" />
          ) : (
            <View className="w-14 h-14 rounded-full bg-orange-500 items-center justify-center mr-4">
              <Text className="font-bold text-xl text-white">
                {chauffeurRide?.driver?.full_name?.charAt(0) ?? 'C'}
              </Text>
            </View>
          )}

          {/* Driver Details */}
          <View className="flex-1">
            {chauffeurRideLoading ? (
              <>
                <View className="h-4 w-32 bg-gray-200 rounded-full mb-2" />
                <View className="h-3 w-48 bg-gray-200 rounded-full" />
              </>
            ) : (
              <>
                {/* Driver Name & Rating */}
                <View className="flex-row items-center mb-1">
                  <Text className="text-base font-semibold text-gray-900 mr-2">
                    {chauffeurRide?.driver?.full_name ?? 'Your Captain'}
                  </Text>
                  {/* <Text className="text-sm font-medium text-gray-900 mr-1">4.6</Text>
                  <Text className="text-yellow-500">★</Text> */}
                </View>

                {/* Vehicle Info */}
                <View className="flex-row items-center flex-wrap">
                  <Text className="text-sm text-gray-600 mr-2">
                    {chauffeurRide?.vehicle?.color ?? 'White'}
                  </Text>
                  <Text className="text-sm text-gray-600 mr-2">
                    {chauffeurRide?.vehicle
                      ? `${chauffeurRide.vehicle.make} ${chauffeurRide.vehicle.model}`
                      : 'Lexus ES350'}
                  </Text>
                  <Text className="text-sm text-gray-600">
                    {chauffeurRide?.vehicle?.plate_number ?? 'L21758'}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Safety Message */}
        {!chauffeurRideLoading && (
          <View className="px-5 pb-4">
            <Text className="text-sm text-gray-600 leading-5">
              Please ensure you verify the car's number plate before proceeding with the journey 
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        {!chauffeurRideLoading && (
          <View className="px-5 pb-5 flex-row gap-3">
            <Pressable
              // onPress={}
              className="flex-1 flex-row items-center justify-center bg-gray-100 rounded-xl py-3.5 active:bg-gray-200"
            >
              <Text className="text-sm font-semibold text-gray-900 mr-2">📞</Text>
              <Text className="text-sm font-semibold text-gray-900">CALL CAPTAIN</Text>
            </Pressable>

            <Pressable
              // onPress={}
              className="flex-1 flex-row items-center justify-center bg-gray-100 rounded-xl py-3.5 active:bg-gray-200"
            >
              <Text className="text-sm font-semibold text-gray-900 mr-2">💬</Text>
              <Text className="text-sm font-semibold text-gray-900">CHAT</Text>
            </Pressable>
          </View>
        )}

        {/* Trip Details Section */}
        {!chauffeurRideLoading && (
          <View className="border-t-8 border-gray-200 px-5 py-4">
            <Text className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
              Trip details
            </Text>

            {/* Pickup Location */}
            <View className="flex-row mb-3">
              <View className="items-center mr-3 pt-1">
                <View className="w-3 h-3 rounded-full border-2 border-orange-500 bg-white" />
                <View className="w-0.5 h-6 bg-gray-300 my-1" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900 mb-0.5">
                  {chauffeurRide?.pickupAddress?.split(',')[0] ?? 'Careem HQ'}
                </Text>
                <Text className="text-sm text-gray-500">
                  {chauffeurRide?.pickupAddress?.split(',').slice(1).join(',').trim() ?? 
                   'Shatha Tower, Media City - Dubai'}
                </Text>
              </View>
            </View>

            {/* Destination Location */}
            <View className="flex-row">
              <View className="items-center mr-3 pt-1">
                <View className="w-3 h-3 rounded-full bg-orange-500" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900">
                 Nipa
                </Text>
              </View>
            </View>
          </View>
        )}
     
    </View>
  ) : null}
</SafeAreaView>
        
        </BottomSheetView>
      </BottomSheet>



        <View pointerEvents="box-none" style={styles.fabWrap}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Scan to board"
            onPress={onScanPress}
            style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          >
            <Ionicons name="camera" size={24} color={colors.white} />
          </Pressable>
          <Text style={styles.fabLabel}>Scan to Board</Text>

        </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  map: { ...StyleSheet.absoluteFillObject },
  mapOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.08)' },
  safe: { flex: 1 },

  topCard: {
    position: 'absolute',
    top: 62,
    left: 16,
    right: 16,
    backgroundColor: colors.white,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...shadows.floating,
  },
  topLabel: {
    fontFamily: typography.family.medium,
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.grey,
  },
  routeName: {
    marginTop: 6,
    fontFamily: typography.family.semibold,
    fontSize: 18,
    color: colors.navy,
  },
  status: {
    marginTop: 6,
    fontFamily: typography.family.semibold,
    fontSize: 13,
    color: colors.orange,
  },

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
  carMarker: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
    ...shadows.floating,
  },

  sheetWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 12,
    paddingBottom: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    shadowColor: 'rgba(12, 34, 94, 0.22)',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -8 },
    elevation: 10,
  },
  sheetStrip: { width: 4, borderRadius: 10, backgroundColor: colors.purple, marginRight: 12 },
  sheetBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingRight: 6 },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(12, 34, 94, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverAvatarText: { fontFamily: typography.family.semibold, fontSize: 16, color: colors.navy },
  carModel: { fontFamily: typography.family.semibold, fontSize: 14, color: colors.text },
  plate: { marginTop: 2, fontFamily: typography.family.medium, fontSize: 12, color: colors.muted },
  sheetStatus: { marginTop: 6, fontFamily: typography.family.regular, fontSize: 12, color: colors.muted },

  fabWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 18,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 10,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.floating,
  },
  fabPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  fabLabel: { marginTop: 8, fontFamily: typography.family.semibold, fontSize: 12, color: colors.white },

  previewBtn: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(12, 34, 94, 0.18)',
    ...shadows.floating,
  },
  previewBtnPressed: { transform: [{ scale: 0.99 }], opacity: 0.95 },
  previewBtnText: { fontFamily: typography.family.semibold, fontSize: 12, color: colors.navy },
});



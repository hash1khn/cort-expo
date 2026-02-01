import React, { useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { mockShuttlePolyline } from '../../../services/mockData';

type RideType = 'chauffeur' | 'shuttle';

const RIDE_DETAILS: Record<
  string,
  {
    bookingDate: string;
    driverName: string;
    driverRating?: number;
    vehicleModel: string;
    vehicleColor: string;
    vehiclePlate: string;
    pickupTime: string;
    dropoffTime: string;
    pickupAddress: string;
    destinationAddress: string;
    rideType: RideType;
  }
> = {
  PO123RT: {
    bookingDate: 'Today, Jan 24',
    driverName: 'Sajjad',
    driverRating: 4.6,
    vehicleModel: 'Toyota Hiace',
    vehicleColor: 'White',
    vehiclePlate: 'ABC-1234',
    pickupTime: '08:15 AM',
    dropoffTime: '08:45 AM',
    pickupAddress: 'Clifton Block 2, Karachi',
    destinationAddress: 'Ocean Tower, Clifton, Karachi',
    rideType: 'shuttle',
  },
  RO213KS: {
    bookingDate: 'Yesterday, Jan 23',
    driverName: 'Ali',
    driverRating: 4.8,
    vehicleModel: 'Toyota Hiace',
    vehicleColor: 'Silver',
    vehiclePlate: 'XYZ-5678',
    pickupTime: '04:30 PM',
    dropoffTime: '05:00 PM',
    pickupAddress: 'Ocean Tower, Clifton',
    destinationAddress: 'DHA Phase 5, Karachi',
    rideType: 'shuttle',
  },
  CH456AB: {
    bookingDate: 'Jan 22, 2025',
    driverName: 'Nadir',
    driverRating: 4.9,
    vehicleModel: 'Toyota Camry',
    vehicleColor: 'Black',
    vehiclePlate: 'DEF-9012',
    pickupTime: '05:00 PM',
    dropoffTime: '05:35 PM',
    pickupAddress: 'DHA Phase 5, Karachi',
    destinationAddress: 'Clifton Block 2, Karachi',
    rideType: 'chauffeur',
  },
  SH789CD: {
    bookingDate: 'Jan 21, 2025',
    driverName: 'Bilal',
    driverRating: 4.5,
    vehicleModel: 'Toyota Hiace',
    vehicleColor: 'White',
    vehiclePlate: 'GHI-3456',
    pickupTime: '09:00 AM',
    dropoffTime: '09:30 AM',
    pickupAddress: 'Clifton Block 2, Karachi',
    destinationAddress: 'Ocean Tower, Clifton',
    rideType: 'shuttle',
  },
};

const DEFAULT_RIDE = {
  bookingDate: '—',
  driverName: 'Driver',
  driverRating: undefined,
  vehicleModel: 'Vehicle',
  vehicleColor: 'N/A',
  vehiclePlate: 'N/A',
  pickupTime: '--:--',
  dropoffTime: '--:--',
  pickupAddress: 'Pickup',
  destinationAddress: 'Destination',
  rideType: 'shuttle' as RideType,
};

const MAP_HEIGHT = Dimensions.get('window').height * 0.3;

export default function RideDetails() {
  const router = useRouter();
  const params = useLocalSearchParams<{ rideId?: string }>();
  const rideId = params.rideId ?? 'PO123RT';
  const details = RIDE_DETAILS[rideId] ?? DEFAULT_RIDE;

  const routePoints = useMemo(
    () =>
      mockShuttlePolyline.map((p) => ({
        latitude: p.latitude,
        longitude: p.longitude,
      })),
    []
  );

  const mapRegion = useMemo(
    () => ({
      latitude: 24.8615,
      longitude: 67.0015,
      latitudeDelta: 0.008,
      longitudeDelta: 0.008,
    }),
    []
  );

  const initials = details.driverName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const rideTypeLabel = details.rideType === 'chauffeur' ? 'Chauffeur' : 'Shuttle';

  return (
    <SafeAreaView className="flex-1 bg-[#171717]" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-[#171717]">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-white/10 items-center justify-center mr-2"
        >
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <Text className="flex-1 text-white text-xl font-bold text-center">
          {details.bookingDate}
        </Text>
        <View className="w-10" />
      </View>

      {/* Map */}
      <View className="px-4 mb-4">
        <View
          style={{ height: MAP_HEIGHT, overflow: 'hidden', borderRadius: 16 }}
          className="bg-[#252525]"
        >
          <MapView
            style={StyleSheet.absoluteFill}
          initialRegion={mapRegion}
          scrollEnabled={false}
          zoomEnabled={false}
          pitchEnabled={false}
          rotateEnabled={false}
          userInterfaceStyle='dark'
        >
          <Polyline
            coordinates={routePoints}
            strokeWidth={4}
            strokeColor="#faaf02"
          />
          <Marker coordinate={routePoints[0]} anchor={{ x: 0.5, y: 0.5 }}>
            <View className="w-4 h-4 rounded-full bg-[#22c55e] border-2 border-white" />
          </Marker>
          <Marker
            coordinate={routePoints[routePoints.length - 1]}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View className="w-4 h-4 rounded-full bg-[#ef4444] border-2 border-white" />
          </Marker>
        </MapView>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1 bg-[#171717]"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
      >
        {/* Driver & vehicle container */}
        <View className="flex-row items-center py-4 px-4 rounded-2xl bg-[#252525] mb-4">
          <View className="w-14 h-14 rounded-full bg-[#1a1a1a] items-center justify-center mr-4">
            <Text className="text-white text-xl font-bold">{initials}</Text>
          </View>
          <View className="flex-1">
            <View className="flex-row items-center mb-1">
              <Text className="text-white text-base font-semibold mr-2">
                {details.driverName}
              </Text>
              {details.driverRating != null && (
                <>
                  <Text className="text-gray-400 text-sm">
                    {details.driverRating}
                  </Text>
                  <Ionicons
                    name="star"
                    size={14}
                    color="#fbbf24"
                    style={{ marginLeft: 2 }}
                  />
                </>
              )}
            </View>
            <View className="flex-row items-center flex-wrap">
              <View className="flex-row items-center flex-shrink-0 mr-2">
                <View
                  className="h-4 w-4 rounded-full mr-2"
                  style={{
                    backgroundColor:
                      details.vehicleColor?.toLowerCase() === 'white'
                        ? '#e5e7eb'
                        : details.vehicleColor?.toLowerCase() === 'black'
                          ? '#374151'
                          : details.vehicleColor?.toLowerCase() === 'silver'
                            ? '#9ca3af'
                            : '#6b7280',
                  }}
                />
                <Text className="text-gray-400 text-sm">
                  {details.vehicleColor} {details.vehicleModel}
                </Text>
              </View>
              <View className="px-2.5 py-1 rounded-lg bg-white/10">
                <Text className="text-white text-xs font-semibold">
                  {details.vehiclePlate}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Ride timings & ride type card */}
        <View className="rounded-2xl bg-[#252525] p-4 mb-4">
            <View className="flex-row">
              <View className="flex-1 items-center">
                <Ionicons name="time-outline" size={22} color="#fff" />
                <Text className="text-white text-base font-bold mt-2">
                  {details.pickupTime}
                </Text>
                <Text className="text-gray-500 text-xs mt-0.5">Pickup time</Text>
              </View>
              <View className="flex-1 items-center border-l border-r border-white/10">
                <Ionicons name="time" size={22} color="#fff" />
                <Text className="text-white text-base font-bold mt-2">
                  {details.dropoffTime}
                </Text>
                <Text className="text-gray-500 text-xs mt-0.5">Dropoff time</Text>
              </View>
              <View className="flex-1 items-center">
                <Ionicons
                  name={details.rideType === 'chauffeur' ? 'car-sport' : 'bus'}
                  size={22}
                  color="#fff"
                />
                <Text className="text-white text-base font-bold mt-2">
                  {rideTypeLabel}
                </Text>
                <Text className="text-gray-500 text-xs mt-0.5">Ride type</Text>
              </View>
            </View>
          </View>

        {/* Pickup & Destination */}
        <View className="rounded-2xl bg-[#252525] p-4 mb-6">
            <View className="flex-row">
              <View className="items-center mr-4">
                <View className="w-3 h-3 rounded-full bg-[#22c55e]" />
                <View
                  style={{
                    width: 0,
                    flex: 1,
                    borderLeftWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: 'rgba(255,255,255,0.3)',
                    marginVertical: 4,
                    minHeight: 24,
                  }}
                />
                <View className="w-3 h-3 rounded-full bg-[#ef4444]" />
              </View>
              <View className="flex-1">
                <View className="mb-5">
                  <Text className="text-white text-sm font-bold">Pickup</Text>
                  <Text className="text-gray-400 text-sm mt-0.5">
                    {details.pickupAddress}
                  </Text>
                </View>
                <View>
                  <Text className="text-white text-sm font-bold">Destination</Text>
                  <Text className="text-gray-400 text-sm mt-0.5">
                    {details.destinationAddress}
                  </Text>
                </View>
              </View>
            </View>
          </View>

        {/* Report a problem */}
        <Pressable className="py-4 rounded-2xl bg-[#252525] items-center active:opacity-90">
          <Text className="text-white text-base font-semibold">
            Report a problem
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

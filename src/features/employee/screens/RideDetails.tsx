import React, { useMemo } from 'react';
import {
  View,
  Text as RNText,
  Image,
  ScrollView,
  StyleSheet,
  Dimensions,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { fontFamily } from '@/core/theme';

const Text = (props: React.ComponentProps<typeof RNText>) => {
  return <RNText {...props} style={[{ fontFamily }, props.style]} />;
};

const MAP_HEIGHT = Dimensions.get('window').height * 0.22;

const MANHATTAN_COORDS = {
  latitude: 40.759,
  longitude: -73.985,
};

const mapRegion = {
  latitude: MANHATTAN_COORDS.latitude,
  longitude: MANHATTAN_COORDS.longitude,
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};

function formatCurrentTime() {
  const d = new Date();
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

const RideDetails = () => {
  const currentTime = useMemo(() => formatCurrentTime(), []);

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-center px-4 py-3 relative">
        <Pressable
          onPress={() => router.back()}
          className="rounded-full flex-row items-center justify-center absolute left-4"
        >
          <Ionicons name="chevron-back" size={26} color="black" />
          <Text className="text-black text-lg font-medium">Back</Text>
        </Pressable>
        <Text className="text-black text-xl font-bold text-center">20 Jan, 2025</Text>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Map card */}
        <View className="overflow-hidden rounded-2xl mx-4 mt-6 mb-4 border border-gray-300 bg-white">
          <View>
            <View style={{ height: MAP_HEIGHT, overflow: 'hidden' }}>
              <MapView
                style={StyleSheet.absoluteFill}
                initialRegion={mapRegion}
                scrollEnabled={false}
                zoomEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
                userInterfaceStyle="light"
              >
                <Marker
                  coordinate={MANHATTAN_COORDS}
                  anchor={{ x: 0.5, y: 0.5 }}
                >
                  <View className="w-4 h-4 rounded-full bg-[#3B82F6] border-2 border-white" />
                </Marker>
              </MapView>
            </View>
            <View className="flex-row justify-between items-center px-4 py-4 border-b border-gray-200">
              <Text className="text-[15px] font-semibold text-gray-500">Pickup</Text>
              <Text className="text-[16px] font-semibold text-black">Clifton Zone 7</Text>
            </View>
            <View className="flex-row justify-between items-center px-4 py-4">
              <Text className="text-[15px] font-semibold text-gray-500">Destination</Text>
              <Text className="text-[16px] font-semibold text-black">Disco Bakery, Block 4A</Text>
            </View>
          </View>
        </View>

        {/* Driver Information Section */}
        <View className="overflow-hidden rounded-2xl mx-4 border border-gray-300 bg-white">
          <View className="bg-gray-50 px-4 py-3 border-b border-gray-300">
            <Text className="text-[14px] font-semibold text-gray-600">
              Driver information
            </Text>
          </View>
          <View className="bg-white">
            <View className="flex-row justify-between items-center px-4 py-4 border-b border-gray-200">
              <Text className="text-[15px] font-semibold text-gray-500">Name</Text>
              <Text className="text-[16px] font-semibold text-black">Mushtaq Ahmed</Text>
            </View>
            <View className="flex-row justify-between items-center px-4 py-4 border-b border-gray-200">
              <Text className="text-[15px] font-semibold text-gray-500">Vehicle</Text>
              <Text className="text-[16px] font-semibold text-black">Black Toyota Vitz</Text>
            </View>
            <View className="flex-row justify-between items-center px-4 py-4">
              <Text className="text-[15px] font-semibold text-gray-500">Number Plate</Text>
              <Text className="text-[16px] font-semibold text-black">ABR 986</Text>
            </View>
          </View>
        </View>

        {/* Support - Report a problem */}
        <View className="mx-4 mt-6">
          <Pressable
            className="flex-row items-center rounded-2xl bg-white border border-gray-300 px-4 py-4 active:opacity-70"
          >
            <View className="w-10 h-10 rounded-xl bg-[#f47f00] items-center justify-center mr-3">
              <MaterialIcons name="report" size={22} color="white" />
            </View>
            <Text className="flex-1 text-[15px] font-semibold text-black">Report a problem</Text>
            <Feather name="arrow-up-right" size={22} color="black" />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default RideDetails;
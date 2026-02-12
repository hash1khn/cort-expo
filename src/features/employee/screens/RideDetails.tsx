import React, { useMemo } from 'react';
import {
  View,
  Text,
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
    <SafeAreaView className="flex-1 bg-[#0A0A0A]">
      {/* Header */}
      <View className="flex-row items-center justify-center px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          className="rounded-full flex-row items-center justify-center mr-2 absolute left-2"
        >
          <Ionicons name="chevron-back" size={26} color={'#FFFFFF'} />
          <Text className='text-white text-lg font-medium'>Back</Text>
        </Pressable>
        <Text className="text-white text-xl font-bold text-center">20 Jan, 2025</Text>
      </View>

      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        

        {/* Map card */}
        <View className="overflow-hidden rounded-2xl mx-4 mt-4 mb-4 border border-[#1F1F1F]">
          <View className="bg-[#141414]">
            <View style={{ height: MAP_HEIGHT, overflow: 'hidden' }}>
              <MapView
                style={StyleSheet.absoluteFill}
                initialRegion={mapRegion}
                scrollEnabled={false}
                zoomEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
                userInterfaceStyle="dark"
              >
                <Marker
                  coordinate={MANHATTAN_COORDS}
                  anchor={{ x: 0.5, y: 0.5 }}
                >
                  <View className="w-4 h-4 rounded-full bg-[#3B82F6] border-2 border-white" />
                </Marker>
              </MapView>
            </View>
            <View className="flex-row justify-between items-center px-4 py-3.5 border-b border-[#1F1F1F]">
              <Text className="text-[15px] font-semibold text-[#9CA3AF]">Pickup</Text>
              <Text className="text-[16px] font-semibold text-white">Clifton Zone 7</Text>
            </View>
            <View className="flex-row justify-between items-center px-4 py-3.5">
              <Text className="text-[15px] font-semibold text-[#9CA3AF]">Destination</Text>
              <Text className="text-[16px] font-semibold text-white">Disco Bakery, Block 4A</Text>
            </View>
          </View>
        </View>

        {/* Driver Information Section */}
        <View className="overflow-hidden rounded-2xl mx-4 border border-[#1F1F1F]">
          <View className="bg-[#1A1A1A] px-4 py-3">
            <Text className="text-[14px] font-semibold text-white">
              Driver information
            </Text>
          </View>
          <View className="bg-[#141414]">
            <View className="flex-row justify-between items-center px-4 py-3.5 border-b border-[#1F1F1F]">
              <Text className="text-[15px] font-semibold text-[#9CA3AF]">Name</Text>
              <Text className="text-[16px] font-semibold text-white">Mushtaq Ahmed</Text>
            </View>
            <View className="flex-row justify-between items-center px-4 py-3.5 border-b border-[#1F1F1F]">
              <Text className="text-[15px] font-semibold text-[#9CA3AF]">Vehicle</Text>
              <Text className="text-[16px] font-semibold text-white">Black Toyota Vitz</Text>
            </View>
            <View className="flex-row justify-between items-center px-4 py-3.5">
              <Text className="text-[15px] font-semibold text-[#9CA3AF]">Number Plate</Text>
              <Text className="text-[16px] font-semibold text-white">ABR 986</Text>
            </View>
          </View>
        </View>

        {/* Support - Report a problem */}
        <View className="mx-4 mt-6">
          <Pressable
            className="flex-row items-center rounded-2xl bg-[#141414] border border-[#1F1F1F] px-4 py-4 active:opacity-70"
          >
            <View className="w-10 h-10 rounded-xl bg-[#f47f00] items-center justify-center mr-3">
              <MaterialIcons name="report" size={22} color="white" />
            </View>
            <Text className="flex-1 text-[15px] font-semibold text-white">Report a problem</Text>
            <Feather name="arrow-up-right" size={22} color="#6B7280" />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default RideDetails;
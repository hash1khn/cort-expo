import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { RideHistoryCard, type RideStatus } from '../components/RideHistoryCard';

type FilterType = 'all' | 'shuttle' | 'chauffeur';

const MOCK_RIDES = [
  {
    rideId: 'PO123RT',
    driverName: 'Sajjad',
    pickup: 'Clifton',
    destination: 'Tower',
    status: 'completed' as RideStatus,
    dateTime: 'Yesterday, 08:30 AM',
    type: 'shuttle' as const,
  },
  {
    rideId: 'RO213KS',
    driverName: 'Ali',
    pickup: 'Tower',
    destination: 'DHA',
    status: 'completed' as RideStatus,
    dateTime: 'Tuesday, Jan 27, 16:45',
    type: 'shuttle' as const,
  },
  {
    rideId: 'CH456AB',
    driverName: 'Nadir',
    pickup: 'DHA',
    destination: 'Clifton',
    status: 'cancelled' as RideStatus,
    dateTime: 'Monday, Jan 26, 17:00',
    type: 'chauffeur' as const,
  },
  {
    rideId: 'SH789CD',
    driverName: 'Bilal',
    pickup: 'Clifton',
    destination: 'Tower',
    status: 'missed' as RideStatus,
    dateTime: 'Sunday, Jan 25, 09:15 AM',
    type: 'shuttle' as const,
  },
];

export default function EmployeeRides() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const filteredRides = MOCK_RIDES.filter((ride) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'shuttle') return ride.type === 'shuttle';
    if (activeFilter === 'chauffeur') return ride.type === 'chauffeur';
    return true;
  });

  return (
    <SafeAreaView className="flex-1 bg-[#171717]" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 ">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-white/10 items-center justify-center mr-2"
        >
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <Text className="flex-1 text-white text-xl font-bold text-center">Ride History</Text>
        <View className="w-10" />
      </View>

      {/* Filter - segmented control */}
      <View className="px-4 pb-6">
        <View className="flex-row bg-[#2c2b30] rounded-xl p-1 py-0">
          <Pressable
            onPress={() => setActiveFilter('all')}
            className={`flex-1 rounded-lg items-center justify-center ${
              activeFilter === 'all' ? 'bg-[#4d4d4f]' : ''
            }`}
          >
            <Text
              className={`text-base font-semibold ${
                activeFilter === 'all' ? 'text-[#faaf02]' : 'text-white'
              }`}
            >
              All
            </Text>
          </Pressable>
          <View className="w-px bg-white/20 self-stretch" />
          <Pressable
            onPress={() => setActiveFilter('shuttle')}
            className={`flex-1 rounded-lg items-center justify-center ${
              activeFilter === 'shuttle' ? 'bg-[#4d4d4f]' : ''
            }`}
          >
            <Text
              className={`text-base font-semibold ${
                activeFilter === 'shuttle' ? 'text-[#faaf02]' : 'text-white'
              }`}
            >
              Shuttle
            </Text>
          </Pressable>
          <View className="w-px bg-white/20 self-stretch" />
          <Pressable
            onPress={() => setActiveFilter('chauffeur')}
            className={`flex-1 py-2 prounded-lg items-center justify-center ${
              activeFilter === 'chauffeur' ? 'bg-[#4d4d4f]' : ''
            }`}
          >
            <Text
              className={`text-base font-semibold ${
                activeFilter === 'chauffeur' ? 'text-[#faaf02]' : 'text-white'
              }`}
            >
              Chauffeur
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Ride list */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-4">
          {filteredRides.map((ride) => (
            <RideHistoryCard
              key={ride.rideId}
              rideId={ride.rideId}
              driverName={ride.driverName}
              pickup={ride.pickup}
              destination={ride.destination}
              status={ride.status}
              dateTime={ride.dateTime}
              onPress={() =>
                router.push({
                  pathname: '/employee/(home)/ride-details',
                  params: { rideId: ride.rideId },
                })
              }
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

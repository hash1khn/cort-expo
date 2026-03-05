import React, { useState } from 'react';
import { View, Text as RNText, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CompactRideHistoryCard } from '../components/CompactRideHistoryCard';
import { colors, fontFamily } from '@/core/theme';

const Text = (props: React.ComponentProps<typeof RNText>) => {
  return <RNText {...props} style={[{ fontFamily }, props.style]} />;
};

type FilterType = 'all' | 'shuttle' | 'chauffeur';

const MOCK_RIDES = [
  {
    rideId: 'PO123RT',
    driverName: 'Sajjad',
    pickup: 'Clifton',
    destination: 'Tower',
    status: 'completed',
    date: 'Yesterday',
    time: '08:30 AM',
    type: 'shuttle' as const,
  },
  {
    rideId: 'RO213KS',
    driverName: 'Ali',
    pickup: 'Tower',
    destination: 'DHA',
    status: 'completed',
    date: 'Tuesday, Jan 27',
    time: '16:45',
    type: 'shuttle' as const,
  },
  {
    rideId: 'CH456AB',
    driverName: 'Nadir',
    pickup: 'DHA',
    destination: 'Clifton',
    status: 'cancelled',
    date: 'Monday, Jan 26',
    time: '17:00',
    type: 'chauffeur' as const,
  },
  {
    rideId: 'SH789CD',
    driverName: 'Bilal',
    pickup: 'Clifton',
    destination: 'Tower',
    status: 'missed',
    date: 'Sunday, Jan 25',
    time: '09:15 AM',
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
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-center px-4 py-3 relative">
        <Pressable
          onPress={() => router.back()}
          className="rounded-full flex-row items-center justify-center absolute left-4"
        >
          <Ionicons name="chevron-back" size={26} color="black" />
          <Text className="text-black text-lg font-medium">Home</Text>
        </Pressable>
        <Text className="text-black text-xl font-bold text-center">Ride History</Text>
      </View>

      {/* Filter - segmented control */}
      <View className="px-6 pb-6 mt-5">
        <View className="flex-row bg-gray-100 p-1 rounded-xl">
          <Pressable
            onPress={() => setActiveFilter('all')}
            hitSlop={20}
            className={`flex-1 py-2 rounded-lg items-center justify-center ${activeFilter === 'all' ? 'bg-white' : ''
              }`}
          >
            <Text
              className={`text-base font-semibold ${activeFilter === 'all' ? 'text-black' : 'text-gray-500'
                }`}
            >
              All
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveFilter('shuttle')}
            hitSlop={20}
            className={`flex-1 py-2 rounded-lg items-center justify-center ${activeFilter === 'shuttle' ? 'bg-white' : ''
              }`}
          >
            <Text
              className={`text-base font-semibold ${activeFilter === 'shuttle' ? 'text-black' : 'text-gray-500'
                }`}
            >
              Shuttle
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveFilter('chauffeur')}
            hitSlop={20}
            className={`flex-1 py-2 rounded-lg items-center justify-center ${activeFilter === 'chauffeur' ? 'bg-white' : ''
              }`}
          >
            <Text
              className={`text-base font-semibold ${activeFilter === 'chauffeur' ? 'text-black' : 'text-gray-500'
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
            <CompactRideHistoryCard
              key={ride.rideId}
              destination={ride.destination}
              date={ride.date}
              timeOfDropoff={ride.time}
              rideType={ride.type === 'shuttle' ? 'Shuttle' : 'Chauffeur'}
              onPress={() =>
                router.push({
                  pathname: '/employee/ride-details',
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

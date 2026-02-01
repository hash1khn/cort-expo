import React, { useEffect, useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRouter } from 'expo-router';

import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { useGetChauffeurBookingsQuery } from '../services/bookingsApi';
import { setChauffeurRide } from '../store';
import { DrawerActions } from '@react-navigation/native';

// Mock shuttle for the Shuttle card
const MOCK_SHUTTLE = {
  status: 'On Time',
  route: 'Route 101',
  nextArrival: '8:15 AM',
};

function formatCommuteDate(isoString: string) {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatRecentCommuteSubtitle(booking: {
  users_chauffeur_bookings_driver_idTousers?: { full_name: string };
  pickup_address?: string;
  destination_cities?: string[];
}) {
  const driver = booking.users_chauffeur_bookings_driver_idTousers?.full_name;
  const from = booking.pickup_address || 'Pickup';
  const to =
    booking.destination_cities?.join(', ') || 'Destination';
  if (driver) {
    return `Driver: ${driver}, ${from} to ${to}`;
  }
  return `${from} to ${to}`;
}

export default function NewHome() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAppSelector((state) => state.auth.user);
  const chauffeurRide = useAppSelector((state) => state.employeeRide.chauffeurRide);
  const navigation=useNavigation();
  const firstName = user?.full_name?.split(' ')?.[0] ?? 'there';

  const dispatch = useAppDispatch();
  const { data: bookingsData } = useGetChauffeurBookingsQuery(
    {
      companyId: user?.company_id!,
      employeeId: user?.id!,
    },
    { skip: !user?.company_id || !user?.id }
  );

  // Sync ride slice from first active booking (same as EmployeeHomeScreen)
  useEffect(() => {
    if (!bookingsData?.data?.length) {
      dispatch(setChauffeurRide(null));
      return;
    }
    const first = bookingsData.data[0];
    dispatch(
      setChauffeurRide({
        id: first.id,
        driver: first.users_chauffeur_bookings_driver_idTousers
          ? {
              id: first.users_chauffeur_bookings_driver_idTousers.id,
              full_name: first.users_chauffeur_bookings_driver_idTousers.full_name,
              phone: first.users_chauffeur_bookings_driver_idTousers.phone,
            }
          : undefined,
        vehicle: first.vehicles
          ? {
              plate_number: first.vehicles.plate_number,
              make: first.vehicles.make,
              model: first.vehicles.model,
              year: first.vehicles.year,
              color: first.vehicles.color,
            }
          : undefined,
        pickupAddress: first.pickup_address ?? null,
        destinationCities: first.destination_cities ?? null,
      })
    );
  }, [bookingsData, dispatch]);

  const recentBookings = useMemo(
    () => (bookingsData?.data ? [...bookingsData.data].slice(0, 10) : []),
    [bookingsData?.data]
  );

  return (
    <View className="flex-1 bg-[#0c225e]">
      {/* Header - dark blue */}
      <View
        className="px-4 pb-4 flex flex-col gap-4"
        style={{ paddingTop: insets.top, backgroundColor: '#0c225e' }}
      >
        <View className="flex-row items-center justify-between mb-2 w-full">
        <Pressable className='' hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}  onPress={()=>navigation.dispatch(DrawerActions.openDrawer())}>
        <Ionicons name="menu" size={24} color="white" />
        </Pressable>
          <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center">
            <Text className="text-white text-base font-semibold">
              {firstName.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>
        <Text className="text-white text-3xl font-bold">Welcome Back, {firstName}</Text>
        <Text className="text-white/90 text-xl mt-1">Your Commute Today</Text>

      
        
      </View>

      <View
        className="flex-1 bg-white w-full rounded-t-3xl"
        // contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        // showsVerticalScrollIndicator={false}
      >
        {/* Shuttle & Chauffeur cards */}
        <View className="flex-row gap-3 px-4 mt-4">
          {/* Shuttle card - mock */}
          <View className="flex-1 bg-white rounded-2xl p-4 shadow-sm">
            <View className='flex flex-row items-center'>
                <MaterialCommunityIcons name="bus" size={30} color="#0c225e" />
                <Text className="text-[#0c225e] font-bold ml-2 text-2xl ">Shuttle</Text>
            </View>
            <Text className="text-gray-600 text-base mt-1">Status: {MOCK_SHUTTLE.status}</Text>
            <Text className="text-gray-600 text-sm">{MOCK_SHUTTLE.route}</Text>
            <Text className="text-gray-600 text-sm">Next Arrival: {MOCK_SHUTTLE.nextArrival}</Text>
            <Pressable className="mt-3 bg-[#f47f00] rounded-xl py-2.5 items-center active:opacity-90">
              <Text className="text-white font-semibold text-sm">View Schedule</Text>
            </Pressable>
          </View>

          {/* Chauffeur card - ride slice */}
          <View className="flex-1 bg-white rounded-2xl p-4 shadow-sm">
          <View className='flex flex-row items-center'>
                <MaterialCommunityIcons name="car" size={30} color="#0c225e" />
                <Text className="text-[#0c225e] font-bold ml-2 text-2xl ">Chauffeur</Text>
            </View>
            {chauffeurRide ? (
              <>
                <Text className="text-gray-600 text-sm mt-1">
                  Status: Driver Assigned
                </Text>
                <Text className="text-gray-600 text-sm">
                  Driver: {chauffeurRide.driver?.full_name ?? '—'}
                </Text>
                <Text className="text-gray-600 text-sm">ETA: {chauffeurRide.scheduled_for}</Text>
                <Pressable
                  onPress={() => router.push('/employee/(home)/chauffeur-details')}
                  className="mt-3 bg-[#f47f00] rounded-xl py-2.5 items-center active:opacity-90"
                >
                  <Text className="text-white font-semibold text-sm">Track Driver</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text className="text-gray-600 text-sm mt-1">Status: No active ride</Text>
                <Text className="text-gray-600 text-sm">—</Text>
                <Text className="text-gray-600 text-sm">—</Text>
                <Pressable className="mt-3 bg-[#f47f00] rounded-xl py-2.5 items-center active:opacity-90">
                  <Text className="text-white font-semibold text-sm">Book Ride</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>

        {/* Recent Commutes */}
        <View className="px-4 mt-6">
          <Text className="text-[#0c225e] font-bold text-xl">Recent Commutes</Text>
          <View className="mt-3 bg-white rounded-2xl overflow-hidden shadow-sm">
            {recentBookings.length === 0 ? (
              <View className="py-8 px-4 items-center">
                <Text className="text-gray-500 text-sm">No recent commutes</Text>
              </View>
            ) : (
              recentBookings.map((booking, index) => (
                <Pressable
                  key={booking.id}
                  onPress={() => router.push('/employee/(home)/chauffeur-details')}
                  className={`flex-row items-center  py-4 px-0 ${
                    index < recentBookings.length - 1 ? 'border-b border-gray-200' : ''
                  }`}
                >
                   <MaterialCommunityIcons name="car" size={30} color="#0c225e" className='mr-2'/>
              
                  <View className="flex-1">
                    <Text className="text-gray-900 font-semibold text-sm">
                      {formatCommuteDate(booking.created_at)} - Chauffeur
                    </Text>
                    <Text className="text-gray-600 text-sm mt-0.5" numberOfLines={1}>
                      {formatRecentCommuteSubtitle(booking)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </Pressable>
              ))
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

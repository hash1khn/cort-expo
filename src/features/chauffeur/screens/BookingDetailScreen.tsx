import { Pressable, Text, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useChauffeurStore } from '../store';

export function BookingDetailScreen() {
  const { bookings, selectedBookingId } = useChauffeurStore();
  const booking = bookings.find((b) => b.id === selectedBookingId);

  if (!booking) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <Pressable onPress={() => router.back()} className="p-4">
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-white/60 text-center">Booking not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center px-4 py-3 border-b border-white/10">
        <Pressable onPress={() => router.back()} hitSlop={12} className="p-2 -ml-2">
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text className="text-white text-lg font-semibold ml-2">Booking</Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
        <View className="rounded-3xl p-6 bg-[#8B5CF6] mb-6 shadow-xl">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-3">
              <View className="p-2 bg-white/20 rounded-xl">
                <Ionicons name="car-sport" size={20} color="#fff" />
              </View>
              <Text className="text-white text-xl font-bold">{booking.passengerName}</Text>
            </View>
            <View className="px-3 py-1.5 rounded-full bg-white/20">
              <Text className="text-sm font-bold text-white">{booking.pickupTime}</Text>
            </View>
          </View>

          <View className="flex-row items-center gap-3 mb-2">
            <View className="w-3 h-3 rounded-full bg-green-400" />
            <Text className="text-white text-base font-medium">{booking.pickup}</Text>
          </View>
          <View className="flex-row items-center gap-3 mb-2 pl-1">
            <Feather name="arrow-down" size={16} color="rgba(255,255,255,0.6)" />
          </View>
          <View className="flex-row items-center gap-3">
            <View className="w-3 h-3 rounded-full bg-orange-400" />
            <Text className="text-white text-base font-medium">{booking.dropoff}</Text>
          </View>

          <Pressable
            onPress={() => {
              // Outstation rides go through meter photo flow,
              // in-city rides jump straight into the active trip screen.
              if (booking.isOutstation) {
                router.push('/chauffeur/start-ride');
              } else {
                router.push('/chauffeur/active-trip');
              }
            }}
            className="flex-row items-center justify-center gap-2 py-4 rounded-2xl bg-white mt-6 active:scale-[0.98]"
          >
            <Ionicons name="play-sharp" size={20} color="#8B5CF6" />
            <Text className="text-2xl font-bold text-[#8B5CF6]">Start trip</Text>
          </Pressable>
        </View>

        <View className="rounded-xl bg-surface-background py-1 mb-8">
          <View className="flex-row justify-between items-center py-3 px-4 border-b border-white/5">
            <Text className="text-white text-lg font-medium">Date</Text>
            <Text className="text-white/50 text-lg font-semibold">{booking.dateLabel}</Text>
          </View>
          <View className="flex-row justify-between items-center py-3 px-4">
            <Text className="text-white text-lg font-medium">Pickup time</Text>
            <Text className="text-white/50 text-lg font-semibold">{booking.pickupTime}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

import React, { useCallback, useState } from 'react';
import { Linking, Modal, Pressable, Text as RNText, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useChauffeurStore, type ChauffeurBooking } from '../store';
import { fontFamily } from '@/core/theme';
import { AppHeader } from '../../shared/components/AppHeader';

const Text = (props: React.ComponentProps<typeof RNText>) => {
  return <RNText {...props} style={[{ fontFamily }, props.style]} />;
};

function BookingCard({
  booking,
  onPress,
  showButton = false,
  onButtonPress,
}: {
  booking: ChauffeurBooking;
  onPress: () => void;
  showButton?: boolean;
  onButtonPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-3xl p-5 bg-[#EDEDEB] mb-4 active:opacity-90 shadow-sm"
    >
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <View className="p-2 bg-white rounded-xl">
            <Ionicons name="car-sport" size={20} color="#000000" />
          </View>
          <Text className="text-black font-bold text-lg">{booking.passengerName}</Text>
        </View>
        <View className="px-3 py-1.5 rounded-xl bg-black">
          <Text className="text-sm font-bold text-white">{booking.pickupTime}</Text>
        </View>
      </View>
      <View className="flex-row items-center gap-3">
        <Text className="text-black text-xl font-bold">{booking.pickup}</Text>
        <Feather name="arrow-right" size={20} color="#6B7280" />
        <Text className="text-black text-xl font-bold flex-1" numberOfLines={1}>
          {booking.dropoff}
        </Text>
      </View>
      <Text className="text-[#6B7280] text-sm mt-1 font-medium">{booking.dateLabel}</Text>

      {showButton && (
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onButtonPress?.();
          }}
          className="flex-row items-center justify-center gap-2 py-1 rounded-xl mt-4 bg-[#FF5A00] active:scale-[0.98]"
        >
          <Ionicons name="play-sharp" size={18} color="#FFFFFF" />
          <Text className="text-white text-lg font-bold py-2">Start</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

export function ChauffeurHomeScreen() {
  const { bookings, setSelectedBooking } = useChauffeurStore();
  const [showRequestModal, setShowRequestModal] = useState(false);

  // Merge them for indexed rendering or just map through bookings directly
  // if you want to follow the "first, second, third" logic precisely.
  const displayBookings = bookings;

  const devBooking: ChauffeurBooking | undefined = bookings[0];

  const handleBookingPress = (booking: ChauffeurBooking) => {
    setSelectedBooking(booking.id);
    router.push('/chauffeur/booking-detail');
  };

  const handleStartTrip = (booking: ChauffeurBooking) => {
    setSelectedBooking(booking.id);
    if (booking.isOutstation) {
      router.push('/chauffeur/start-ride');
    } else {
      router.push('/chauffeur/active-trip');
    }
  };

  const handleDevOpenRequest = () => {
    if (devBooking) {
      setSelectedBooking(devBooking.id);
      setShowRequestModal(true);
    }
  };

  const handleDevProceedToTrip = useCallback(() => {
    setShowRequestModal(false);
    router.push('/chauffeur/active-trip');
  }, []);

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <SafeAreaView className="flex-1 bg-[#FFFFFF]" edges={['top']}>
      <AppHeader />
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>

        <View className="mb-6">
          <Text className="text-[34px] font-bold text-black">My Bookings</Text>
          <Text className="text-[#6B7280] text-base font-medium">{dateStr}</Text>
        </View>

        <View className="mt-2">
          {displayBookings.map((booking, index) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onPress={() => handleBookingPress(booking)}
              showButton={index === 0 || index === 2}
              onButtonPress={() => handleStartTrip(booking)}
            />
          ))}
        </View>

        {displayBookings.length === 0 && (
          <View className="rounded-3xl bg-[#EDEDEB] py-8 px-4 items-center">
            <Ionicons name="calendar-outline" size={48} color="#6B7280" />
            <Text className="text-[#6B7280] text-lg font-medium mt-3 text-center">
              No assigned bookings
            </Text>
            <Text className="text-[#6B7280]/60 text-sm mt-1 text-center">
              You will see pre-assigned trips here.
            </Text>
          </View>
        )}

        <View className="mb-8" />
      </ScrollView>

      {__DEV__ && devBooking && (
        <View className="px-5 pb-6">
          <Pressable
            onPress={handleDevOpenRequest}
            className="py-3 rounded-2xl bg-[#EDEDEB] items-center justify-center"
          >
            <Text className="text-black text-xs font-medium">
              DEV: Open passenger request modal
            </Text>
          </Pressable>
        </View>
      )}

      <Modal
        visible={showRequestModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRequestModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.45)',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 24,
          }}
        >
          <View
            style={{
              width: '100%',
              borderRadius: 10,
              backgroundColor: '#ffffff',
              paddingHorizontal: 20,
              paddingVertical: 24,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: '600',
                color: '#111827',
                textAlign: 'center',
                marginBottom: 16,
              }}
            >
              {(devBooking?.passengerName ?? 'Abdul Rasheed')} has requested your arrival
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontWeight: '500',
                color: '#6B7280',
                textAlign: 'center',
              }}
            >
              Next destination
            </Text>
            <Text
              style={{
                fontSize: 24,
                fontWeight: '700',
                color: '#111827',
                textAlign: 'center',
                marginTop: 4,
                marginBottom: 20,
              }}
            >
              {devBooking?.dropoff ?? 'Destination'}
            </Text>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                columnGap: 12,
              }}
            >
              <Pressable
                onPress={handleDevProceedToTrip}
                style={{
                  flex: 1,
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#FF5A00',
                }}
              >
                <Text
                  style={{
                    color: '#ffffff',
                    fontSize: 16,
                    fontWeight: '700',
                  }}
                >
                  Proceed to trip
                </Text>
              </Pressable>

            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

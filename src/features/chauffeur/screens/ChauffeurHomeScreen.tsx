import React, { useCallback, useState } from 'react';
import { Linking, Modal, Pressable, Text, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useChauffeurStore, type ChauffeurBooking } from '../store';

function BookingCard({
  booking,
  onPress,
}: {
  booking: ChauffeurBooking;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-2xl p-5 bg-surface-background border border-white/10 mb-4 active:opacity-90"
    >
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <View className="p-2 bg-white/10 rounded-xl">
            <Ionicons name="car-sport" size={20} color="rgba(255,255,255,0.9)" />
          </View>
          <Text className="text-white font-bold text-lg">{booking.passengerName}</Text>
        </View>
        <View className="px-3 py-1.5 rounded-full bg-white/20">
          <Text className="text-sm font-bold text-white">{booking.pickupTime}</Text>
        </View>
      </View>
      <View className="flex-row items-center gap-2">
        <Text className="text-white text-base font-semibold">{booking.pickup}</Text>
        <Feather name="arrow-right" size={16} color="rgba(255,255,255,0.6)" />
        <Text className="text-white text-base font-semibold flex-1" numberOfLines={1}>
          {booking.dropoff}
        </Text>
      </View>
      <Text className="text-white/50 text-sm mt-1">{booking.dateLabel}</Text>
    </Pressable>
  );
}

export function ChauffeurHomeScreen() {
  const { bookings, setSelectedBooking } = useChauffeurStore();
  const [showRequestModal, setShowRequestModal] = useState(false);

  const assignedBooking: ChauffeurBooking | undefined = bookings.find(
    (b) => b.isOutstation
  );
  const inCityTodayBookings = bookings.filter(
    (b) => !b.isOutstation && b.dateLabel === 'Today'
  );

  const devBooking: ChauffeurBooking | undefined = assignedBooking ?? bookings[0];

  const handleBookingPress = (booking: ChauffeurBooking) => {
    setSelectedBooking(booking.id);
    router.push('/chauffeur/(home)/booking-detail');
  };

  const handleDevOpenRequest = () => {
    if (devBooking) {
      setSelectedBooking(devBooking.id);
      setShowRequestModal(true);
    }
  };

  const handleDevProceedToTrip = useCallback(() => {
    setShowRequestModal(false);
    router.push('/chauffeur/(home)/active-trip');
  }, []);

  const handleDevCall = useCallback(() => {
    setShowRequestModal(false);
    // Simple dev call action – in real flow you would use booking phone
    Linking.openURL('tel:+923001234567').catch(() => {});
  }, []);

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center justify-end py-0">
          <Pressable
            hitSlop={12}
            onPress={() => router.push('/chauffeur/(home)/profile')}
            className="p-2 -mr-2 rounded-full bg-white/5"
          >
            <Ionicons name="person-circle-outline" size={32} color="#FFF" />
          </Pressable>
        </View>

        <View className="mb-6">
          <Text className="text-[34px] font-bold text-white">My Bookings</Text>
          <Text className="text-white/50 text-xl font-medium">{dateStr}</Text>
        </View>

        {assignedBooking && (
          <View className="mb-5">
            <Text className="text-white text-xl px-2 font-bold mb-4">Assigned</Text>

            <Pressable
              onPress={() => handleBookingPress(assignedBooking)}
              className="rounded-3xl p-5 bg-surface-background border border-white/10 mb-2 active:opacity-90"
            >
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center gap-2">
                  <View className="p-2 bg-white/10 rounded-xl">
                    <Ionicons name="car-sport" size={20} color="rgba(255,255,255,0.9)" />
                  </View>
                  <View>
                    <Text className="text-white font-bold text-lg">
                      {assignedBooking.passengerName}
                    </Text>
                    <Text className="text-white/60 text-xs mt-0.5">Outstation</Text>
                  </View>
                </View>
                <View className="px-3 py-1.5 rounded-full bg-white/20">
                  <Text className="text-sm font-bold text-white">
                    {assignedBooking.pickupTime}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center gap-2">
                <Text className="text-white text-base font-semibold">
                  {assignedBooking.pickup}
                </Text>
                <Feather name="arrow-right" size={16} color="rgba(255,255,255,0.6)" />
                <Text className="text-white text-base font-semibold flex-1" numberOfLines={1}>
                  {assignedBooking.dropoff}
                </Text>
              </View>
            </Pressable>
          </View>
        )}

        {inCityTodayBookings.length > 0 && (
          <View className="mb-5">
            <Text className="text-white text-xl px-2 font-bold mb-4">
              In-city rides today
            </Text>
            {inCityTodayBookings.map((b) => (
              <BookingCard key={b.id} booking={b} onPress={() => handleBookingPress(b)} />
            ))}
          </View>
        )}

        {bookings.length === 0 && (
          <View className="rounded-xl bg-surface-background py-8 px-4 items-center">
            <Ionicons name="calendar-outline" size={48} color="rgba(255,255,255,0.4)" />
            <Text className="text-white/60 text-lg font-medium mt-3 text-center">
              No assigned bookings
            </Text>
            <Text className="text-white/40 text-sm mt-1 text-center">
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
            className="py-3 rounded-2xl bg-white/10 items-center justify-center"
          >
            <Text className="text-white text-xs font-medium">
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
              borderRadius: 24,
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
                fontSize: 16,
                fontWeight: '600',
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
                  borderRadius: 20,
                  paddingVertical: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#000000',
                }}
              >
                <Text
                  style={{
                    color: '#ffffff',
                    fontSize: 15,
                    fontWeight: '600',
                  }}
                >
                  Proceed to trip
                </Text>
              </Pressable>
              <Pressable
                onPress={handleDevCall}
                style={{
                  flex: 1,
                  borderRadius: 20,
                  paddingVertical: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#F3F4F6',
                }}
              >
                <Text
                  style={{
                    color: '#111827',
                    fontSize: 15,
                    fontWeight: '500',
                  }}
                >
                  Call
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

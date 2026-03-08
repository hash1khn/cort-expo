import React, { useCallback, useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { router } from 'expo-router';
import { SlideToStartTrip } from '@/features/shuttle/components';
import { useChauffeurStore } from '../store';

type TripPhase = 'to_pickup' | 'waiting' | 'to_destination';

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function ChauffeurActiveTripScreen() {
  const [phase, setPhase] = useState<TripPhase>('to_pickup');
  const { bookings, selectedBookingId, clearTrip } = useChauffeurStore();
  const booking = bookings.find((b) => b.id === selectedBookingId);
  const snapPoints = useMemo(() => ['50%', '65%'], []);

  const handleCall = useCallback(() => {
    // In real app, use booking passenger phone
    Linking.openURL('tel:+923001234567').catch(() => { });
  }, []);

  const handleCompleteTrip = useCallback(() => {
    clearTrip();
    router.replace('/chauffeur');
  }, [clearTrip]);

  const statusLabel =
    phase === 'to_pickup'
      ? 'ON THE WAY TO PICKUP'
      : phase === 'waiting'
        ? 'WAITING FOR PASSENGER'
        : 'ON THE WAY TO DESTINATION';

  const slideLabel =
    phase === 'to_pickup'
      ? 'Slide to mark as arrived'
      : phase === 'waiting'
        ? 'Slide to start trip'
        : 'Slide to complete';

  const handleSlideComplete = useCallback(() => {
    if (phase === 'to_pickup') {
      setPhase('waiting');
    } else if (phase === 'waiting') {
      setPhase('to_destination');
    } else {
      handleCompleteTrip();
    }
  }, [phase, handleCompleteTrip]);

  if (!booking) {
    return (
      <View style={styles.center}>
        <Text className="text-white">No active trip.</Text>
        <Pressable onPress={() => router.back()} className="mt-4 px-4 py-2 bg-white/20 rounded-xl">
          <Text className="text-white">Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <MapView
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude: 37.78825,
          longitude: -122.4324,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        }}
        toolbarEnabled={false}
        showsUserLocation
        userInterfaceStyle="dark"
      />

      <BottomSheet
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose={false}
        backgroundStyle={{ backgroundColor: '#1F1F1D' }}
        handleIndicatorStyle={{ backgroundColor: 'rgba(255,255,255,0.4)' }}
      >
        <BottomSheetView style={styles.sheetContent}>
          <View className="px-5 pb-8">
            <View className="flex-row justify-between items-center mb-4">
              <Text style={styles.status}>{statusLabel}</Text>
              <Text className="text-white font-semibold">{booking.pickupTime}</Text>
            </View>

            <View
              className="rounded-2xl p-4 mb-5 flex-row"
              style={{ backgroundColor: '#28282a' }}
            >
              <View className="w-12 h-12 rounded-xl items-center justify-center mr-3 bg-[#3a3a3d]">
                <Text className="text-white font-semibold text-sm">
                  {getInitials(booking.passengerName)}
                </Text>
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-white font-bold text-base">{booking.passengerName}</Text>
                <Text className="text-text-muted text-sm mt-0.5">
                  {phase === 'to_destination' ? booking.dropoff : booking.pickup}
                </Text>
              </View>
              <Pressable
                onPress={handleCall}
                className="w-10 h-10 rounded-full bg-white/15 items-center justify-center"
              >
                <Ionicons name="call" size={20} color="#fff" />
              </Pressable>
            </View>

            <SlideToStartTrip
              key={phase}
              label={slideLabel}
              onComplete={handleSlideComplete}
            />
          </View>
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0d0c12' },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0d0c12',
  },
  sheetContent: { flex: 1, backgroundColor: '#1F1F1D' },
  status: {
    fontSize: 11,
    color: '#0EA5E9',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
});


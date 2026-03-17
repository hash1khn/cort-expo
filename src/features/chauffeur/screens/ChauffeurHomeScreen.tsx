import React, { useState, useEffect, useCallback } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, Text as RNText, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { fontFamily } from '@/core/theme';
import { AppHeader } from '../../shared/components/AppHeader';
import { RequestedModal } from '../components/RequestedModal';
import {
  useGetDriverActiveBookingQuery,
  type ActiveBooking,
  getActiveLog,
  isFirstDayNotStarted,
  isBetweenDays,
} from '../services/chauffeur.api';

const Text = (props: React.ComponentProps<typeof RNText>) => (
  <RNText {...props} style={[{ fontFamily }, props.style]} />
);

// ─── Status helpers ───────────────────────────────────────────────────────────

function statusLabel(status: ActiveBooking['status']): string {
  const map: Record<string, string> = {
    PENDING: 'Pending',
    ASSIGNED: 'Assigned',
    OTW: 'On The Way',
    ARRIVED: 'Arrived',
    IN_PROGRESS: 'In Progress',
    DROPPED_OFF: 'Dropped Off',
    ENDED: 'Ended',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  };
  return map[status] ?? status;
}

function statusColor(status: ActiveBooking['status']): string {
  const map: Record<string, string> = {
    PENDING: '#6B7280',
    ASSIGNED: '#F59E0B',
    OTW: '#3B82F6',
    ARRIVED: '#8B5CF6',
    IN_PROGRESS: '#10B981',
    DROPPED_OFF: '#F97316',
    ENDED: '#6B7280',
    COMPLETED: '#6B7280',
    CANCELLED: '#EF4444',
  };
  return map[status] ?? '#6B7280';
}

// ─── Active Booking Card ──────────────────────────────────────────────────────

function ActiveBookingCard({
  booking,
  onStartTrip,
  onViewDetails,
}: {
  booking: ActiveBooking;
  onStartTrip: () => void;
  onViewDetails: () => void;
}) {
  const passenger = booking.users_chauffeur_bookings_passenger_idTousers;
  const vehicle = booking.vehicles;
  const todayLog = getActiveLog(booking.chauffeur_trip_daily_logs);
  const tripNotYetStarted = isFirstDayNotStarted(booking);
  const betweenDays = isBetweenDays(booking);

  const completedDays = booking.chauffeur_trip_daily_logs.filter(
    (l) => l.status === 'COMPLETED',
  ).length;
  const totalDays = booking.no_of_days ?? 1;
  const isMultiDay = totalDays > 1;
  const currentDay = completedDays + (todayLog ? 1 : 0);

  // Show "Start Trip" ONLY when we are genuinely ready to start the day:
  // Day 1: Trip not yet started and booking is purely ASSIGNED.
  // Day 2+: todayLog exists AND it was requested AND hasn't actually started (has no start_time).
  const isDay2ReadyToStart = !!(todayLog && todayLog.is_requested && !todayLog.start_time);
  const showStartButton = (tripNotYetStarted && booking.status === 'ASSIGNED') || isDay2ReadyToStart;

  // "Continue Trip" is shown if it's not a start condition, not between days, and the trip is active today
  const isTripActiveToday = !showStartButton && !betweenDays && todayLog && todayLog.start_time;

  // If betweenDays, card should not be pushable
  const isCardPressable = !betweenDays;
  return (
    <Pressable
      onPress={isCardPressable ? onViewDetails : undefined}
      disabled={!isCardPressable}
      className="rounded-3xl bg-[#EDEDEB] mb-4 overflow-hidden active:opacity-90"
      style={isCardPressable ? undefined : { opacity: 0.7 }}
    >
      {/* Header row */}
      <View className="flex-row items-center justify-between px-5 pt-5 pb-4">
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-xl bg-white items-center justify-center">
            <Ionicons name="car-sport" size={20} color="#000000" />
          </View>
          <View>
            <Text
              className="text-black font-bold text-[17px]"
              numberOfLines={1}
            >
              {passenger?.full_name ?? 'Passenger'}
            </Text>
            {passenger?.phone && (
              <Text className="text-[#6B7280] text-[13px] font-medium">
                {passenger.phone}
              </Text>
            )}
          </View>
        </View>

        {/* Status badge */}
        <View
          className="px-3 py-1.5 rounded-xl"
          style={{ backgroundColor: statusColor(booking.status) + '20' }}
        >
          <Text
            className="text-xs font-bold"
            style={{ color: statusColor(booking.status) }}
          >
            {statusLabel(booking.status)}
          </Text>
        </View>
      </View>

      {/* Trip info */}
      <View className="px-5 pb-4 gap-2">
        {/* Pickup */}
        {booking.pickup_address ? (
          <View className="flex-row items-start gap-2">
            <Ionicons name="location" size={16} color="#FF5A00" style={{ marginTop: 2 }} />
            <Text className="text-black text-[14px] font-semibold flex-1" numberOfLines={2}>
              {booking.pickup_address}
            </Text>
          </View>
        ) : null}

        {/* Destination cities */}
        {booking.destination_cities?.length > 0 ? (
          <View className="flex-row items-start gap-2">
            <Ionicons name="flag" size={16} color="#6B7280" style={{ marginTop: 2 }} />
            <Text className="text-[#6B7280] text-[14px] font-medium flex-1" numberOfLines={1}>
              {booking.destination_cities.join(', ')}
            </Text>
          </View>
        ) : null}

        {/* Trip type / days */}
        <View className="flex-row items-center gap-4 mt-1">
          <View className="flex-row items-center gap-1.5">
            <MaterialCommunityIcons
              name={booking.trip_type === 'OUT_STATION' ? 'map-marker-distance' : 'city'}
              size={14}
              color="#6B7280"
            />
            <Text className="text-[#6B7280] text-[13px] font-medium">
              {booking.trip_type === 'OUT_STATION' ? 'Outstation' : 'In-City'}
            </Text>
          </View>

          {isMultiDay && (
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="calendar-outline" size={14} color="#6B7280" />
              <Text className="text-[#6B7280] text-[13px] font-medium">
                {betweenDays
                  ? `Day ${completedDays} of ${totalDays} done`
                  : todayLog
                    ? `Day ${currentDay} of ${totalDays}`
                    : `${totalDays} days`}
              </Text>
            </View>
          )}

          {vehicle?.plate_number && (
            <View className="flex-row items-center gap-1.5">
              <MaterialCommunityIcons name="car" size={14} color="#6B7280" />
              <Text className="text-[#6B7280] text-[13px] font-medium">
                {vehicle.plate_number}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Between-days info banner */}
      {betweenDays && (
        <View className="mx-4 mb-4 rounded-xl bg-[#FFF7ED] px-4 py-3 flex-row items-center gap-2">
          <Ionicons name="time-outline" size={16} color="#F97316" />
          <Text className="text-[#F97316] text-[13px] font-semibold flex-1">
            Waiting for passenger to request next pickup
          </Text>
        </View>
      )}

      {/* Start button — only on first day before trip has begun */}
      {showStartButton && (
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onStartTrip();
          }}
          className="mx-4 mb-5 flex-row items-center justify-center gap-2 py-4 rounded-xl bg-[#FF5A00] active:opacity-90"
        >
          <Ionicons name="play-sharp" size={18} color="#FFFFFF" />
          <Text className="text-white text-[16px] font-bold">Start Trip</Text>
        </Pressable>
      )}

      {/* "Continue" label for in-progress trips (no re-start needed) */}
      {isTripActiveToday && (
        <View className="px-5 pb-4">
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onViewDetails();
            }}
            className="flex-row items-center justify-center gap-2 py-3 rounded-xl bg-black active:opacity-80"
          >
            <Text className="text-white text-[15px] font-bold">Continue Trip</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <View className="rounded-3xl bg-[#EDEDEB] py-10 px-4 items-center">
      <Ionicons name="calendar-outline" size={48} color="#6B7280" />
      <Text className="text-[#6B7280] text-lg font-medium mt-3 text-center">
        No active booking
      </Text>
      <Text className="text-[#6B7280]/60 text-sm mt-1 text-center">
        You'll see your assigned trip here when ready.
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function ChauffeurHomeScreen() {
  const { data: activeBooking, isLoading, isError, refetch } = useGetDriverActiveBookingQuery();
  const [isRequestModalVisible, setIsRequestModalVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const today = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Check if we should show the day 2+ request modal
  useEffect(() => {
    if (activeBooking) {
      const todayLog = getActiveLog(activeBooking.chauffeur_trip_daily_logs ?? []);
      const isDay2ReadyToStart = !!(todayLog && todayLog.is_requested && !todayLog.start_time);
      if (isDay2ReadyToStart) {
        setIsRequestModalVisible(true);
      }
    }
  }, [activeBooking]);

  const handleStartTrip = () => {
    if (!activeBooking) return;
    if (activeBooking.trip_type === 'OUT_STATION') {
      router.push('/chauffeur/active-trip');
    } else {
      router.push('/chauffeur/active-trip');
    }
  };

  const handleViewDetails = () => {
    router.push('/chauffeur/active-trip');
  };

  const handleStartFromModal = () => {
    setIsRequestModalVisible(false);
    handleStartTrip();
  };

  // Get employee name and pickup location for modal
  const employeeName = activeBooking?.users_chauffeur_bookings_passenger_idTousers?.full_name ?? 'Employee';
  const todayLog = getActiveLog(activeBooking?.chauffeur_trip_daily_logs ?? []);
  const pickupLocation = todayLog?.pickup_location || activeBooking?.pickup_address || 'Pickup location';

  return (
    <SafeAreaView className="flex-1 bg-[#FFFFFF]" edges={['top']}>
      <AppHeader />
      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#FF5A00"
            colors={['#FF5A00']}
          />
        }
      >
        <View className="mb-6">
          <Text className="text-[34px] font-bold text-black">My Booking</Text>
          <Text className="text-[#6B7280] text-base font-medium">{today}</Text>
        </View>

        {isLoading && (
          <View className="items-center py-12">
            <ActivityIndicator size="large" color="#FF5A00" />
            <Text className="text-[#6B7280] mt-3 font-medium">Loading your booking…</Text>
          </View>
        )}

        {isError && !isLoading && (
          <View className="rounded-3xl bg-[#FFF1F0] px-5 py-6 items-center">
            <Ionicons name="alert-circle-outline" size={36} color="#EF4444" />
            <Text className="text-[#EF4444] font-semibold mt-2 text-center">
              Could not load booking
            </Text>
            <Pressable
              onPress={refetch}
              className="mt-4 px-6 py-2.5 rounded-xl bg-[#EF4444] active:opacity-80"
            >
              <Text className="text-white font-bold">Retry</Text>
            </Pressable>
          </View>
        )}

        {!isLoading && !isError && (
          <View className="mt-2">
            {activeBooking ? (
              <ActiveBookingCard
                booking={activeBooking}
                onStartTrip={handleStartTrip}
                onViewDetails={handleViewDetails}
              />
            ) : (
              <EmptyState />
            )}
          </View>
        )}
      </ScrollView>

      {/* Day 2+ Request Modal */}
      <RequestedModal
        visible={isRequestModalVisible}
        employeeName={employeeName}
        pickupLocation={pickupLocation}
        onStart={handleStartFromModal}
        onClose={() => setIsRequestModalVisible(false)}
      />
    </SafeAreaView>
  );
}


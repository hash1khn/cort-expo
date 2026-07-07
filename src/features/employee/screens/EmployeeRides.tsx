import React, { useMemo, useState } from 'react';
import { View, Text as RNText, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CompactRideHistoryCard } from '../components/CompactRideHistoryCard';
import { CompactRideHistoryCardSkeleton } from '../components/CompactRideHistoryCardSkeleton';
import { BackButton } from '@/components/BackButton';
import { colors, fontFamily } from '@/core/theme';
import { useLanguage } from '@/i18n/useLanguage';
import {
  buildRtlHeaderTitleStyle,
  buildRtlTabContainerStyle,
  buildRtlTabTextStyle,
} from '@/i18n/types';
import { useAppSelector } from '../../../store/hooks';
import { useGetChauffeurBookingsQuery } from '../services/bookingsApi';
import { useGetShuttleTripsForEmployeeQuery } from '../services/employeeShuttleApi';

const Text = (props: React.ComponentProps<typeof RNText>) => {
  return <RNText {...props} style={[{ fontFamily }, props.style]} />;
};

type FilterType = 'all' | 'shuttle' | 'chauffeur';

type RideCard = {
  id: string;
  destination: string;
  date: string;
  time: string;
  rideType: 'shuttle' | 'chauffeur';
  bookingId?: number;
  tripId?: number;
  sortKey: number; // unix ms for sorting
};

export default function EmployeeRides() {
  const router = useRouter();
  const { t, isRTL, rtlRowStyle, language } = useLanguage();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const user = useAppSelector((state) => state.auth.user);
  const companyId = (user?.company_id ?? 0) as number;
  const employeeId = (user?.id ?? '') as string;
  const hasChauffeur = user?.enabled_services?.chauffeur ?? false;
  const hasShuttle = user?.enabled_services?.shuttle ?? false;

  const { data: chauffeurBookingsData, isLoading: isChauffeurLoading } =
    useGetChauffeurBookingsQuery(
      { companyId, employeeId },
      { skip: !companyId || !employeeId || !hasChauffeur },
    );

  const { data: shuttleTrips = [], isLoading: isShuttleLoading } =
    useGetShuttleTripsForEmployeeQuery(
      { companyId, employeeId },
      { skip: !companyId || !employeeId || !hasShuttle },
    );

  const isLoading =
    (hasChauffeur && isChauffeurLoading) || (hasShuttle && isShuttleLoading);

  const chauffeurCards = useMemo((): RideCard[] => {
    const completed = (chauffeurBookingsData?.data ?? []).filter(
      (b) => b.status === 'COMPLETED',
    );
    return completed.map((booking) => {
      const rawDate = booking.scheduled_for ? new Date(booking.scheduled_for) : null;
      return {
        id: `chauffeur-${booking.id}`,
        destination:
          booking.destination_cities?.[0] ||
          booking.pickup_address?.split(',')[0] ||
          '—',
        date: rawDate
          ? rawDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : '—',
        time: rawDate
          ? rawDate.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })
          : '—',
        rideType: 'chauffeur',
        bookingId: booking.id,
        sortKey: rawDate?.getTime() ?? 0,
      };
    });
  }, [chauffeurBookingsData]);

  const shuttleCards = useMemo((): RideCard[] => {
    const completed = shuttleTrips.filter((t) => t.status === 'COMPLETED');
    return completed.map((trip) => {
      const rawDate = trip.trip_date ? new Date(trip.trip_date) : null;
      // completed_at / started_at may be null for older trips — fall back to trip_date
      const rawTime = trip.completed_at
        ? new Date(trip.completed_at)
        : trip.started_at
          ? new Date(trip.started_at)
          : rawDate;
      return {
        id: `shuttle-${trip.id}`,
        destination: trip.routes?.name ?? 'Shuttle Route',
        date: rawDate
          ? rawDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : '—',
        time: rawTime
          ? rawTime.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })
          : '—',
        rideType: 'shuttle',
        tripId: trip.id,
        sortKey: rawDate?.getTime() ?? 0,
      };
    });
  }, [shuttleTrips]);

  const filteredCards = useMemo((): RideCard[] => {
    let cards: RideCard[];
    if (activeFilter === 'chauffeur') cards = chauffeurCards;
    else if (activeFilter === 'shuttle') cards = shuttleCards;
    else cards = [...chauffeurCards, ...shuttleCards];
    return [...cards].sort((a, b) => b.sortKey - a.sortKey);
  }, [activeFilter, chauffeurCards, shuttleCards]);

  const filterLabels: Record<FilterType, string> = {
    all: t('employee:filterAll'),
    shuttle: t('employee:filterShuttle'),
    chauffeur: t('employee:filterChauffeur'),
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-center px-4 py-3 relative">
        <BackButton
          label={t('employee:home')}
          onPress={() => router.back()}
        />
        <Text
          className="text-black text-xl font-bold text-center"
          style={buildRtlHeaderTitleStyle(language)}
        >
          {t('employee:ridesHistory')}
        </Text>
      </View>

      {/* Filter - segmented control */}
      <View className="px-6 pb-6 mt-5">
        <View className="bg-gray-100 p-1 rounded-xl" style={[{ flexDirection: 'row' }, rtlRowStyle]}>
          {(['all', 'shuttle', 'chauffeur'] as FilterType[]).map((filter) => (
            <Pressable
              key={filter}
              onPress={() => setActiveFilter(filter)}
              hitSlop={20}
              className={`flex-1 rounded-lg items-center justify-center ${
                activeFilter === filter ? 'bg-white' : ''
              }`}
              style={isRTL ? buildRtlTabContainerStyle(language) : { paddingVertical: 8 }}
            >
              <Text
                className={`text-base font-semibold ${
                  activeFilter === filter ? 'text-black' : 'text-gray-500'
                }`}
                style={buildRtlTabTextStyle(language)}
              >
                {filterLabels[filter]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Ride list */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-4">
          {isLoading ? (
            <>
              <CompactRideHistoryCardSkeleton />
              <CompactRideHistoryCardSkeleton />
              <CompactRideHistoryCardSkeleton />
            </>
          ) : filteredCards.length === 0 ? (
            <View className="items-center justify-center mt-20 gap-3">
              <Ionicons name="time-outline" size={48} color="#d1d5db" />
              <Text className={`text-gray-400 text-base ${isRTL ? 'text-right' : 'text-center'}`}>
                {t('employee:noRideHistory')}
              </Text>
            </View>
          ) : (
            filteredCards.map((card) => (
              <CompactRideHistoryCard
                key={card.id}
                destination={card.destination}
                date={card.date}
                timeOfDropoff={card.time}
                vehicleType={card.rideType}
                rideType={card.rideType === 'shuttle' ? t('employee:filterShuttle') : t('employee:filterChauffeur')}
                onPress={() =>
                  router.push({
                    pathname: '/employee/ride-details',
                    params: {
                      from: 'history',
                      rideDate: card.date,
                      ...(card.bookingId != null
                        ? { rideId: String(card.bookingId), rideType: 'chauffeur' }
                        : { rideId: String(card.tripId), rideType: 'shuttle' }),
                    },
                  })
                }
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text as RNText, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from "@react-native-vector-icons/ionicons/static";
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
import { useLazyGetChauffeurBookingsQuery } from '../services/bookingsApi';
import { useLazyGetShuttleTripsForEmployeePaginatedQuery } from '../services/employeeShuttleApi';

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
  sortKey: number;
};

const PAGE_SIZE = 15;

export default function EmployeeRides() {
  const router = useRouter();
  const { t, isRTL, rtlRowStyle, language } = useLanguage();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const user = useAppSelector((state) => state.auth.user);
  const companyId = (user?.company_id ?? 0) as number;
  const employeeId = (user?.id ?? '') as string;
  const hasChauffeur = user?.enabled_services?.chauffeur ?? false;
  const hasShuttle = user?.enabled_services?.shuttle ?? false;

  const [triggerChauffeur] = useLazyGetChauffeurBookingsQuery();
  const [triggerShuttle] = useLazyGetShuttleTripsForEmployeePaginatedQuery();

  const [chauffeurCards, setChauffeurCards] = useState<RideCard[]>([]);
  const [shuttleCards, setShuttleCards] = useState<RideCard[]>([]);
  const [chauffeurHasNext, setChauffeurHasNext] = useState(true);
  const [shuttleHasNext, setShuttleHasNext] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const chauffeurPage = useRef(1);
  const shuttlePage = useRef(1);
  const initialFetched = useRef(false);

  const mapChauffeurToCards = useCallback((bookings: any[]): RideCard[] => {
    return bookings
      .filter((b) => b.status === 'COMPLETED')
      .map((booking) => {
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
          rideType: 'chauffeur' as const,
          bookingId: booking.id,
          sortKey: rawDate?.getTime() ?? 0,
        };
      });
  }, []);

  const mapShuttleToCards = useCallback((trips: any[]): RideCard[] => {
    return trips
      .filter((t) => t.status === 'COMPLETED')
      .map((trip) => {
        const rawDate = trip.trip_date ? new Date(trip.trip_date) : null;
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
          rideType: 'shuttle' as const,
          tripId: trip.id,
          sortKey: rawDate?.getTime() ?? 0,
        };
      });
  }, []);

  const fetchInitial = useCallback(async () => {
    if (!companyId || !employeeId) return;
    setIsInitialLoading(true);

    const promises: Promise<void>[] = [];

    if (hasChauffeur) {
      promises.push(
        triggerChauffeur({ companyId, employeeId, page: 1, limit: PAGE_SIZE, status: 'COMPLETED' })
          .unwrap()
          .then((res) => {
            setChauffeurCards(mapChauffeurToCards(res.data));
            setChauffeurHasNext(res.pagination.hasNext);
            chauffeurPage.current = 1;
          })
          .catch(() => {
            setChauffeurHasNext(false);
          }),
      );
    } else {
      setChauffeurHasNext(false);
    }

    if (hasShuttle) {
      promises.push(
        triggerShuttle({ companyId, employeeId, page: 1, limit: PAGE_SIZE })
          .unwrap()
          .then((res) => {
            setShuttleCards(mapShuttleToCards(res.data));
            setShuttleHasNext(res.pagination.hasNext);
            shuttlePage.current = 1;
          })
          .catch(() => {
            setShuttleHasNext(false);
          }),
      );
    } else {
      setShuttleHasNext(false);
    }

    await Promise.all(promises);
    setIsInitialLoading(false);
  }, [companyId, employeeId, hasChauffeur, hasShuttle, triggerChauffeur, triggerShuttle, mapChauffeurToCards, mapShuttleToCards]);

  useEffect(() => {
    if (!initialFetched.current && companyId && employeeId) {
      initialFetched.current = true;
      fetchInitial();
    }
  }, [fetchInitial, companyId, employeeId]);

  const canLoadMore = useMemo(() => {
    if (activeFilter === 'chauffeur') return chauffeurHasNext;
    if (activeFilter === 'shuttle') return shuttleHasNext;
    return chauffeurHasNext || shuttleHasNext;
  }, [activeFilter, chauffeurHasNext, shuttleHasNext]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !canLoadMore) return;
    setIsLoadingMore(true);

    const promises: Promise<void>[] = [];

    if ((activeFilter === 'all' || activeFilter === 'chauffeur') && chauffeurHasNext) {
      const nextPage = chauffeurPage.current + 1;
      promises.push(
        triggerChauffeur({ companyId, employeeId, page: nextPage, limit: PAGE_SIZE, status: 'COMPLETED' })
          .unwrap()
          .then((res) => {
            setChauffeurCards((prev) => [...prev, ...mapChauffeurToCards(res.data)]);
            setChauffeurHasNext(res.pagination.hasNext);
            chauffeurPage.current = nextPage;
          })
          .catch(() => {}),
      );
    }

    if ((activeFilter === 'all' || activeFilter === 'shuttle') && shuttleHasNext) {
      const nextPage = shuttlePage.current + 1;
      promises.push(
        triggerShuttle({ companyId, employeeId, page: nextPage, limit: PAGE_SIZE })
          .unwrap()
          .then((res) => {
            setShuttleCards((prev) => [...prev, ...mapShuttleToCards(res.data)]);
            setShuttleHasNext(res.pagination.hasNext);
            shuttlePage.current = nextPage;
          })
          .catch(() => {}),
      );
    }

    await Promise.all(promises);
    setIsLoadingMore(false);
  }, [isLoadingMore, canLoadMore, activeFilter, chauffeurHasNext, shuttleHasNext, companyId, employeeId, triggerChauffeur, triggerShuttle, mapChauffeurToCards, mapShuttleToCards]);

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

  const renderItem = useCallback(({ item: card }: { item: RideCard }) => (
    <CompactRideHistoryCard
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
  ), [t, router]);

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <View className="py-4 items-center">
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }, [isLoadingMore]);

  const renderEmpty = useCallback(() => {
    if (isInitialLoading) return null;
    return (
      <View className="items-center justify-center mt-20 gap-3">
        <Ionicons name="time-outline" size={48} color="#d1d5db" />
        <Text className={`text-gray-400 text-base ${isRTL ? 'text-right' : 'text-center'}`}>
          {t('employee:noRideHistory')}
        </Text>
      </View>
    );
  }, [isInitialLoading, isRTL, t]);

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
      {isInitialLoading ? (
        <View className="flex-1 px-4 gap-4">
          <CompactRideHistoryCardSkeleton />
          <CompactRideHistoryCardSkeleton />
          <CompactRideHistoryCardSkeleton />
        </View>
      ) : (
        <FlatList
          data={filteredCards}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 16 }}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
        />
      )}
    </SafeAreaView>
  );
}

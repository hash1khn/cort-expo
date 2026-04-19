import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { Pressable, RefreshControl, Text, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons, FontAwesome5, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';
import { useLanguage } from '@/features/shared/context/LanguageContext';
import {
  useGetTodayTripQuery,
  useLazyGetTripEmployeesQuery,
  ShuttleTrip,
} from '../services/shuttleApi';
import { AppHeader } from '../../shared/components/AppHeader';
import { useRefetchOnReconnect } from '@/hooks/useRefetchOnReconnect';

const ROUTE_DETAILS_LABELS = {
  en: {
    sectionTitle: 'Route Details',
    route: 'Route',
    stops: 'Stops',
    employees: 'Employees',
    start: 'Start',
    today: 'Today',
    noRides: 'You have no rides for today.',
    nextRide: 'Next Ride',
    morning: 'Morning',
    evening: 'Evening',
    blackHiace: 'Black Hiace',
  },
  ur: {
    sectionTitle: 'راستے کی تفصیلات',
    route: 'روٹ',
    stops: 'اسٹاپ',
    employees: 'افراد',
    start: 'سفر کا آغاز',
    today: 'آج',
    noRides: 'آج کوئی سواری مقرر نہیں ہے',
    nextRide: 'اگلی سواری',
    morning: 'صبح',
    evening: 'شام',
    blackHiace: 'کالی ہائس',
  },
} as const;

export function ShuttleDriver() {
  const navigation = useNavigation();
  const { language } = useLanguage();
  const { data: todayTrips = [], isLoading: isTodayTripLoading, refetch } = useGetTodayTripQuery();
  useRefetchOnReconnect(refetch);
  const [triggerLoadEmployees] = useLazyGetTripEmployeesQuery();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  useEffect(() => {
    if (!isTodayTripLoading) {
      // Log the raw response for debugging
      console.log('[ShuttleDriver] /shuttle-trips/today response:', todayTrips);
    }
  }, [todayTrips, isTodayTripLoading]);

  const latestTrip: ShuttleTrip | null = todayTrips.length > 0 ? todayTrips[0] : null;
  const upcomingTrips: ShuttleTrip[] = todayTrips.length > 1 ? todayTrips.slice(1) : [];

  // Prefetch employees for the latest trip as soon as we know it,
  // so navigation to RideInProgress/Return feels instant.
  useEffect(() => {
    if (!latestTrip) return;
    triggerLoadEmployees(latestTrip.id);
  }, [latestTrip, triggerLoadEmployees]);

  const openDrawer = () => {
    if ('openDrawer' in navigation && typeof navigation.openDrawer === 'function') {
      navigation.openDrawer();
    }
  };

  const handleCliftonTowerPress = () => {
    // Only allow navigation when there is an active trip for today
    if (!latestTrip) {
      return;
    }

    if (latestTrip.direction === 'EVENING') {
      router.push('/shuttle/return');
    } else {
      router.push('/shuttle/ride');
    }
  };

  const buildRouteDetails = (trip: ShuttleTrip | null) => {
    if (!trip || !trip.routes) {
      return {
        number: '—',
        origin: '—',
        destination: '—',
        stops: '—',
        employees: '—',
        start: isTodayTripLoading ? 'Loading…' : '—',
        end: isTodayTripLoading ? 'Loading…' : '—',
      };
    }

    const route = trip.routes;
    const stops = route.route_stops ?? [];
    const originName = stops[0]?.name ?? '—';
    const destinationName = stops[stops.length - 1]?.name ?? '—';
    const stopsCount = stops.length;
    const employeesCount = route._count?.employee_route_assignments ?? 0;

    const pickEta = (index: number) => {
      const stop = stops[index];
      if (!stop) return null;
      const raw =
        trip.direction === 'MORNING'
          ? stop.morning_eta
          : stop.evening_eta;
      if (!raw) return null;

      // Handle both legacy full-ISO and new HH:MM formats defensively.
      if (raw.includes('T')) {
        const d = new Date(raw);
        if (Number.isNaN(d.getTime())) return null;
        return d.toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
      }

      // Already HH:MM from backend – convert to 12-hour with AM/PM.
      const [hStr, mStr = '00'] = raw.split(':');
      const hour24 = Number.parseInt(hStr, 10);
      if (Number.isNaN(hour24)) return raw;
      const minutes = mStr.padStart(2, '0');
      const suffix = hour24 >= 12 ? 'PM' : 'AM';
      const hour12 = ((hour24 + 11) % 12) + 1;
      return `${hour12}:${minutes} ${suffix}`;
    };

    const startEta = pickEta(0);
    const endEta = pickEta(stops.length - 1);

    return {
      number: route.name ?? `#${route.id}`,
      origin: originName,
      destination: destinationName,
      stops: stopsCount ? `${stopsCount}` : '—',
      employees: employeesCount ? `${employeesCount}` : '0',
      start: startEta ?? '—',
      end: endEta ?? '—',
    };
  };

  const routeDetails = useMemo(
    () => buildRouteDetails(latestTrip),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [latestTrip, isTodayTripLoading],
  );
  const labels = ROUTE_DETAILS_LABELS[language];
  const isUrdu = language === 'ur';
  const [openAccordionId, setOpenAccordionId] = React.useState<string | null>(null);

  const InfoRow = ({
    label,
    value,
    icon,
    isLast = false,
  }: {
    label: string;
    value: string;
    icon: React.ReactNode;
    isLast?: boolean;
  }) => (
    <View
      className={`flex-row justify-between items-center py-3 px-1 ${!isLast ? 'border-b border-black/5' : ''
        }`}
    >
      {isUrdu ? (
        <View className="flex-row items-center w-full justify-between">
          <Text className="text-[#4B5563] text-xl font-semibold">
            {value}
          </Text>
          <View className="flex-row items-center gap-3">
            <Text
              className="text-black text-xl font-medium text-right py-1"
              style={{ fontFamily: 'NotoNastaliqUrdu' }}
            >
              {label}
            </Text>
            <View className="w-9 h-9 rounded-2xl bg-[#F5F5F2] items-center justify-center border border-black/5">
              {icon}
            </View>
          </View>
        </View>
      ) : (
        <>
          <View className="flex-row items-center flex-1 gap-3">
            <View className="w-9 h-9 rounded-2xl bg-[#F5F5F2] items-center justify-center border border-black/5">
              {icon}
            </View>
            <Text className="text-black text-xl font-medium">{label}</Text>
          </View>
          <Text className="text-[#4B5563] text-xl font-semibold text-right ml-4">
            {value}
          </Text>
        </>
      )}
    </View>
  );

  const accordionItems = useMemo(
    () =>
      upcomingTrips.map((trip) => {
        const details = buildRouteDetails(trip);
        const directionLabel = trip.direction === 'MORNING' ? labels.morning : labels.evening;
        return {
          id: String(trip.id),
          title: `${details.origin} → ${details.destination} (${directionLabel})`,
          subtitle: details.start,
          trip,
          details,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [upcomingTrips, isTodayTripLoading],
  );

  // Loading skeleton state
  if (isTodayTripLoading) {
    return (
      <SafeAreaView className="flex-1 bg-[#FFFFFF]" edges={['top']}>
        <AppHeader />
        <ScrollView
          className="flex-1 px-5"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#FF5A00"
              colors={['#FF5A00']}
            />
          }
        >

          {/* Title skeleton */}
          <View className="mb-6 mt-4">
            <View className="h-8 w-40 rounded-full bg-[#EDEDEB] mb-3" />
            <View className="h-4 w-56 rounded-full bg-[#EDEDEB]" />
          </View>

          {/* Main card skeleton */}
          <View className="mb-6 rounded-3xl bg-[#EDEDEB] p-6">
            <View className="mb-5">
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-2xl bg-[#ECECEA]" />
                  <View>
                    <View className="h-3 w-24 rounded-full bg-[#ECECEA] mb-2" />
                    <View className="h-4 w-32 rounded-full bg-[#ECECEA]" />
                  </View>
                </View>
                <View className="h-7 w-16 rounded-full bg-[#ECECEA]" />
              </View>

              <View className="flex-row items-center gap-3 mb-0">
                <View className="h-7 flex-1 rounded-full bg-[#ECECEA]" />
              </View>
            </View>

            <View className="rounded-xl bg-[#ECECEA] py-2">
              {[1, 2, 3, 4].map((i) => (
                <View
                  // eslint-disable-next-line react/no-array-index-key
                  key={i}
                  className="flex-row items-center justify-between py-3 px-3 border-b border-black/5 last:border-b-0"
                >
                  <View className="flex-row items-center gap-3 flex-1">
                    <View className="w-9 h-9 rounded-2xl bg-[#EDEDEB]" />
                    <View className="h-4 w-24 rounded-full bg-[#ECECEA]" />
                  </View>
                  <View className="h-4 w-12 rounded-full bg-[#EDEDEB]" />
                </View>
              ))}
            </View>
          </View>

          {/* Next ride skeleton */}
          <View className="mb-8">
            <View className="h-5 w-28 rounded-full bg-[#EDEDEB] mb-4" />
            <View className="rounded-2xl bg-[#ECECEA] p-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3 flex-1">
                  <View className="w-8 h-8 rounded-full bg-[#EDEDEB]" />
                  <View className="flex-1">
                    <View className="h-4 w-32 rounded-full bg-[#ECECEA] mb-2" />
                    <View className="h-3 w-24 rounded-full bg-[#EDEDEB]" />
                  </View>
                </View>
                <View className="w-4 h-4 rounded-full bg-[#EDEDEB]" />
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const hasTrips = todayTrips.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-[#FFFFFF]" edges={['top']}>
      <AppHeader />
      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#FF5A00"
            colors={['#FF5A00']}
          />
        }
      >

        {/* Title Section */}
        <View className="mb-6">
          <Text className="text-[34px] font-bold text-black">{labels.today}</Text>
          <Text className="text-base font-medium text-[#6B7280]">
            February 6, 2026
          </Text>
        </View>



        {/* No rides message */}
        {!hasTrips && (
          <View className="mt-4 my-auto">
            <Text className={`py-2 font-medium text-black ${language === 'ur' ? 'ml-auto text-2xl ' : 'text-base '}`}>
              {language === 'en' ? labels.noRides : labels.noRides}
            </Text>
          </View>
        )}

        {hasTrips && (
          <>
            {/* JOINT CARD: Status + Route Details */}
            <View className="mb-6 rounded-3xl bg-[#EDEDEB] p-6">
              {/* ACTIVE TRIP STATUS (transparent inside the card) */}
              <View className="mb-5">
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center gap-3">
                    <View className="p-2 bg-white rounded-xl">
                      <Ionicons name="bus" size={20} color="#000000" />
                    </View>
                    <View>
                      <Text className="text-xs font-semibold tracking-wider text-[#6B7280]">
                        {labels.blackHiace}
                      </Text>
                      <Text className="text-lg font-semibold text-black">
                        ABR‑986
                      </Text>
                    </View>
                  </View>
                  <View className="px-3 py-1.5 rounded-xl bg-black">
                    <Text className="text-sm font-bold text-white">
                      {routeDetails.start}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center gap-3 mb-0">
                  <Text className="text-[2rem] text-black font-bold">
                    {routeDetails.origin}
                  </Text>
                  <Feather name="arrow-right" size={24} color="#6B7280" />
                  <Text className="text-[2rem] text-black font-bold">
                    {routeDetails.destination}
                  </Text>
                </View>

              </View>

              {/* Divider */}
              {/* <View className="h-px bg-black/10 mb-4" /> */}

              {/* ROUTE DETAILS (Information table) */}
              <View className="w-full">
                {/* <Text
              className={`text-base font-semibold text-black mb-3 ${
                isUrdu ? 'w-full text-right' : ''
              }`}
              style={isUrdu ? { fontFamily: 'NotoNastaliqUrdu' } : undefined}
            >
              {labels.sectionTitle}
            </Text> */}

                <View className="rounded-xl  ">
                  <InfoRow
                    label={labels.route}
                    value={routeDetails.number}
                    icon={<FontAwesome5 name="route" size={18} color="#000000" />}
                  />
                  <InfoRow
                    label={labels.stops}
                    value={routeDetails.stops}
                    icon={
                      <MaterialCommunityIcons
                        name="bus-stop"
                        size={18}
                        color="#000000"
                      />
                    }
                  />
                  <InfoRow
                    label={labels.employees}
                    value={routeDetails.employees}
                    icon={<Ionicons name="people-outline" size={18} color="#000000" />}
                  />
                  <InfoRow
                    label={labels.start}
                    value={routeDetails.start}
                    icon={<Ionicons name="time-outline" size={18} color="#000000" />}
                    isLast
                  />
                </View>

                <Pressable
                  onPress={handleCliftonTowerPress}
                  className="flex-row items-center justify-center gap-2 py-2 rounded-xl mt-4 bg-[#FF5A00] active:scale-[0.98]"
                >
                  <Ionicons name="play-sharp" size={20} color="#FFFFFF" />
                  <Text
                    className="text-xl py-3 mt-1 text-white"
                    style={{ fontFamily: 'NotoNastaliqUrdu', fontWeight: '800' }}
                  >
                    {' '}
                    شروع  کریں
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* NEXT RIDE SECTION WITH ACCORDIONS */}
            {accordionItems.length > 0 && (
              <View className="mb-8">
                <Text className="text-xl px-2 font-bold mb-4 text-black">
                  {labels.nextRide}
                </Text>

                {accordionItems.map((item) => {
                  const isOpen = openAccordionId === item.id;
                  const tripDetails = item.details;
                  return (
                    <View key={item.id} className="mb-3">
                      <Pressable
                        onPress={() =>
                          setOpenAccordionId(isOpen ? null : item.id)
                        }
                        className="flex-row items-center justify-between px-4 py-3 rounded-xl "
                      >
                        <View className="flex-row items-center gap-3 flex-1">
                          <View className="p-1.5 rounded-full bg-white">
                            <MaterialIcons name="access-time" size={20} color="black" />
                          </View>
                          <View className="flex-1">
                            <Text className="text-base font-semibold text-black">
                              {item.title}
                            </Text>
                            <Text className="text-[0.9rem] text-[#6B7280] mt-0.5">
                              {item.subtitle}
                            </Text>
                          </View>
                        </View>
                        <Ionicons
                          name={isOpen ? 'chevron-up' : 'chevron-down'}
                          size={20}
                          color="#6B7280"
                        />
                      </Pressable>

                      {isOpen && (
                        <View className="mt-3 rounded-3xl bg-[#EDEDEB] p-5">
                          <View className="mb-4">
                            <View className="flex-row items-center justify-between mb-3">
                              <View className="flex-row items-center gap-3">
                                <View className="p-2 bg-white rounded-xl">
                                  <Ionicons
                                    name="bus"
                                    size={18}
                                    color="#000000"
                                  />
                                </View>
                                <View>
                                  <Text className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                                    {item.trip.routes?.name ?? 'Assigned Shuttle'}
                                  </Text>
                                  <Text className="text-sm font-bold text-black">
                                    Route {tripDetails.number}
                                  </Text>
                                </View>
                              </View>
                              <View className="px-3 py-1 rounded-full bg-black">
                                <Text className="text-xs font-bold text-white">
                                  {routeDetails.start}
                                </Text>
                              </View>
                            </View>

                            <View className="flex-row items-center gap-2">
                              <Text className="text-xl text-black font-bold">
                                {tripDetails.origin}
                              </Text>
                              <Feather
                                name="arrow-right"
                                size={18}
                                color="#6B7280"
                              />
                              <Text className="text-xl text-black font-bold">
                                {tripDetails.destination}
                              </Text>
                            </View>
                          </View>

                          <View className="h-px bg-black/10 mb-3" />

                          <View className="rounded-xl  py-1">
                            <InfoRow
                              label={labels.route}
                              value={tripDetails.number}
                              icon={<Feather name="map-pin" size={18} color="#000000" />}
                            />
                            <InfoRow
                              label={labels.stops}
                              value={tripDetails.stops}
                              icon={<Feather name="map" size={18} color="#000000" />}
                            />
                            <InfoRow
                              label={labels.employees}
                              value={tripDetails.employees}
                              icon={
                                <Ionicons
                                  name="people-outline"
                                  size={18}
                                  color="#000000"
                                />
                              }
                            />
                            <InfoRow
                              label={labels.start}
                              value={tripDetails.start}
                              icon={
                                <Ionicons name="time-outline" size={18} color="#000000" />
                              }
                              isLast
                            />
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
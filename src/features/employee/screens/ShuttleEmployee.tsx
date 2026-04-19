import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text as RNText,
  Pressable,
  StyleSheet,
  Linking,
  AppState,
  TextInput,
  ImageBackground,
  ScrollView,
  Image,
  RefreshControl,
  InteractionManager,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AntDesign, Entypo, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { fontFamily } from '@/core/theme';
import { useToast } from '@/shared/ui/molecules/Toast';
import { useRefetchOnReconnect } from '@/hooks/useRefetchOnReconnect';

const Text = (props: React.ComponentProps<typeof RNText>) => {
  return <RNText {...props} style={[{ fontFamily }, props.style]} />;
};

const CustomToast = ({ title, message }: { title: string; message: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Ionicons name="notifications" size={16} color="#fff" />
    </View>
    <View style={{ flex: 1, gap: 2 }}>
      <RNText style={{ fontSize: 14, fontWeight: '600', color: '#fff', fontFamily }}>
        {title}
      </RNText>
      <RNText style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily }}>
        {message}
      </RNText>
    </View>
  </View>
);
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { useRouter, useNavigation, router, useLocalSearchParams } from 'expo-router';
import { DrawerActions, useIsFocused } from '@react-navigation/native';
import { useGetChauffeurBookingsQuery, useGetEmployeeActiveChauffeurBookingQuery } from '../services/bookingsApi';
import { useGetShuttleTripsForEmployeeQuery } from '../services/employeeShuttleApi';
import { useChauffeurStatusListener } from '../../../hooks/useChauffeurStatusListener';
import { CompactRideHistoryCard } from '../components/CompactRideHistoryCard';
import { CompactRideHistoryCardSkeleton } from '../components/CompactRideHistoryCardSkeleton';
import { RideStatusBar, type UpcomingShuttleInfo } from '../components/RideStatusBar';
import {
  setIsWaitingForDriverResponse,
  setOutstationDropoff,
  setChauffeurRide,
} from '../store';
import { useRideStartListener } from '../../../hooks/useRideStartListener';
import FlipCard from '../components/FlipCard';
import { AppHeader } from '../../shared/components/AppHeader';
import BottomSheet from '@gorhom/bottom-sheet';
import RideReviewSheet from '../components/RideReviewSheet';

const PROFILE_SHEET_SNAP = ['65%'];
const DROPOFF_SHEET_SNAP = ['45%'];

export default function NewHome() {
  const { refreshToken } = useLocalSearchParams<{ refreshToken?: string }>();
  const user = useAppSelector((state) => state.auth.user);
  const { isOutstationDev, isWaitingForDriverResponse } = useAppSelector(
    (state) => state.employeeRide,
  );
  const dispatch = useAppDispatch();
  const toast = useToast();

  const showHomeToast = () => {
    toast.show(
      <CustomToast title="New Message" message="Sarah sent you a photo." />,
      {
        duration: 4000,
        position: 'top',
        type: 'default',
        backgroundColor: '#1c1c1c',
      },
    );
  };

  const companyId = (user?.company_id ?? 0) as number;
  const employeeId = (user?.id ?? '') as string;
  
  // Solution B: Service checks to prevent unnecessary API calls
  const hasChauffeur = user?.enabled_services?.chauffeur ?? false;
  const hasShuttle = user?.enabled_services?.shuttle ?? false;

  const { 
    data: chauffeurBookingsData,
    isLoading: isChauffeurBookingsLoading,
    refetch: refetchChauffeurBookings,
  } = useGetChauffeurBookingsQuery(
    { companyId, employeeId },
    { skip: !companyId || !employeeId },
  );

  const {
    data: shuttleTrips = [],
    isLoading: isShuttleTripsLoading,
    refetch: refetchShuttleTrips,
  } = useGetShuttleTripsForEmployeeQuery(
    { companyId, employeeId },
    { skip: !companyId || !employeeId || !hasShuttle },
  );

  const { 
    data: activeChauffeurBooking, 
    refetch: refetchActiveChauffeurBooking, 
    isLoading: isActiveBookingLoading,
    isFetching: isActiveBookingFetching
  } = useGetEmployeeActiveChauffeurBookingQuery(
    { companyId },
    { skip: !companyId || !hasChauffeur },
  );

  useRefetchOnReconnect(refetchShuttleTrips, refetchActiveChauffeurBooking, refetchChauffeurBookings);

  const router = useRouter();
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const handleOpenDrawer = useCallback(() => {
    navigation.dispatch(DrawerActions.openDrawer());
  }, [navigation]);

  const firstName = user?.full_name?.split(' ')?.[0] ?? '';
  const fullName = user?.full_name ?? 'Guest';
  const initials = user?.full_name
    ? user.full_name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
    : '?';

  const upcomingShuttle = useMemo((): UpcomingShuttleInfo | null => {
    const trip = shuttleTrips.find((t) => t.status !== 'COMPLETED') ?? shuttleTrips[0];
    if (!trip) return null;
    const routeName = trip.routes?.name ?? 'Shuttle';
    const driverName = trip.users?.full_name ?? '—';
    let nextShuttleTime = '—';
    if (trip.started_at) {
      const d = new Date(trip.started_at);
      nextShuttleTime = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } else if (trip.trip_date) {
      const d = new Date(trip.trip_date);
      nextShuttleTime = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
    return { routeName, driverName, nextShuttleTime };
  }, [shuttleTrips]);

  const chauffeurCardBooking = useMemo(() => {
    if (!hasChauffeur || !activeChauffeurBooking) return null;
    return activeChauffeurBooking.status !== 'COMPLETED' ? activeChauffeurBooking : null;
  }, [activeChauffeurBooking, hasChauffeur]);

  const shuttleCardTrip = useMemo(() => {
    if (!hasShuttle) return null;
    return shuttleTrips.find((trip) => trip.status !== 'COMPLETED') ?? null;
  }, [hasShuttle, shuttleTrips]);

  const shouldShowChauffeurCard = hasChauffeur;
  const shouldShowShuttleCard = hasShuttle;
  const completedChauffeurRides = useMemo(
    () => chauffeurBookingsData?.data?.filter((booking) => booking.status === 'COMPLETED') ?? [],
    [chauffeurBookingsData],
  );

  useEffect(() => {
    if (
      chauffeurBookingsData?.data &&
      Array.isArray(chauffeurBookingsData.data) &&
      chauffeurBookingsData.data.length > 0
    ) {
      const first = chauffeurBookingsData.data[0];
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
        }),
      );
    } else {
      dispatch(setChauffeurRide(null));
    }
  }, [chauffeurBookingsData, dispatch]);

  // Always keep a ref pointing at the latest trips so the socket callback
  // (which closes over a stale value) can read fresh data after a refetch.
  const shuttleTripsRef = useRef(shuttleTrips);
  useEffect(() => {
    console.log('[ShuttleEmployee] Shuttle Trips updated:', JSON.stringify(shuttleTrips, null, 2));
    shuttleTripsRef.current = shuttleTrips;
  }, [shuttleTrips]);

  // Solution A: Watch API data and navigate to active ride when detected
  // This handles app crash recovery and initial mount navigation without unnecessary refetches
  const hasNavigatedToActiveRideRef = useRef(false);

  // Reset navigation flag when component unmounts (e.g., navigating away from employee stack)
  useEffect(() => {
    return () => {
      hasNavigatedToActiveRideRef.current = false;
    };
  }, []);

  // Watch the API data and navigate when an active ride is detected
  useEffect(() => {
    // ── Review check runs FIRST — before navigation guard ─────────────────────────────
    // Must be here and not after the hasNavigatedToActiveRideRef guard:
    // when the employee returns from ride-active after trip ends, the ref is still true
    // (it resets only on unmount), so anything below the guard is permanently skipped.
    if (!isShuttleTripsLoading && !isActiveBookingLoading && hasChauffeur && activeChauffeurBooking) {
      const isCompleted = activeChauffeurBooking.status === 'COMPLETED';
      // For multiday DROPPED_OFF between days, can_request_driver or driver_requested will be true.
      // Only prompt review on the final drop-off (both are false).
      // Also handle COMPLETED — when the driver closes out the trip before the employee reviews.
      const isFinalDropOff =
        (activeChauffeurBooking.status === 'DROPPED_OFF' &&
          !activeChauffeurBooking.can_request_driver &&
          !activeChauffeurBooking.driver_requested) ||
        isCompleted;
      // Use != null (loose) to treat both null and undefined as "no review"
      const hasReview = activeChauffeurBooking.ride_reviews != null;

      if (isFinalDropOff && !hasReview) {
        setPendingReviewBookingId(activeChauffeurBooking.id);
      }
    }

    // Skip navigation if we've already navigated this session
    if (hasNavigatedToActiveRideRef.current) return;
    
    // Wait for data to finish loading before checking
    if (isShuttleTripsLoading || isActiveBookingLoading) return;
    
    // Skip if no company/employee ID
    if (!companyId || !employeeId) return;

    // ── Check Shuttle ──
    const activeTrip = shuttleTrips.find(
      (t) => t.status === 'STARTED' || t.status === 'IN_PROGRESS'
    );
    
    if (activeTrip) {
      hasNavigatedToActiveRideRef.current = true;
      const vehicle = activeTrip.routes?.vehicles;
      router.push({
        pathname: '/employee/ride-active',
        params: {
          tripId: String(activeTrip.id),
          myPickupStopId: activeTrip.my_pickup_stop_id != null ? String(activeTrip.my_pickup_stop_id) : '',
          driverName: activeTrip.users?.full_name ?? 'Driver',
          driverPhone: activeTrip.users?.phone ?? '',
          vehicleDisplay: vehicle ? `${vehicle.make} ${vehicle.model}`.trim() : '',
          vehiclePlate: vehicle?.plate_number ?? '',
          direction: activeTrip.direction ?? '',
        },
      });
      return; // Exit early after navigating
    }

    // ── Check Chauffeur ──
    if (!hasChauffeur || !activeChauffeurBooking) return;

    const bStatus = activeChauffeurBooking.status;
    const isOutstation = activeChauffeurBooking.trip_type === 'OUT_STATION';
    const driver = activeChauffeurBooking.users_chauffeur_bookings_driver_idTousers;
    const vehicle = activeChauffeurBooking.vehicles;

    if (isOutstation) {
      // OUT_STATION: Direct status mapping based on booking status
      if (bStatus === 'DROPPED_OFF') return;
      
      const liveStatuses = ['OTW', 'ARRIVED', 'IN_PROGRESS'];
      if (liveStatuses.includes(bStatus)) {
        hasNavigatedToActiveRideRef.current = true;
        router.push({
          pathname: '/employee/ride-active',
          params: {
            mode: 'chauffeur',
            bookingId: String(activeChauffeurBooking.id),
            bookingStatus: activeChauffeurBooking.status,
            tripType: activeChauffeurBooking.trip_type,
            driverName: driver?.full_name ?? 'Chauffeur',
            driverPhone: driver?.phone ?? '',
            vehicleDisplay: vehicle ? `${vehicle.make ?? ''} ${vehicle.model ?? ''}`.trim() : '',
            vehiclePlate: vehicle?.plate_number ?? '',
          },
        });
      }
    } else {
      // IN_CITY (multiday): use chauffeur_trip_daily_logs directly.
      // today_log is computed by calendar date and will be null for next-day pickup logs
      // (log_date is tomorrow but server's "today" is still today).
      // Instead, mirror the backend's own targetLog logic: first non-COMPLETED daily log.
      const dailyLogs = activeChauffeurBooking.chauffeur_trip_daily_logs || [];
      const sortedLogs = [...dailyLogs].sort(
        (a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime()
      );
      const targetLog = sortedLogs.find((l) => l.status !== 'COMPLETED') ?? null;

      if (targetLog) {
        if (targetLog.status === 'DROPPED_OFF') return;
        
        if (targetLog.start_time !== null) {
          // Driver has started (start_time set) → ride is active
          hasNavigatedToActiveRideRef.current = true;
          router.push({
            pathname: '/employee/ride-active',
            params: {
              mode: 'chauffeur',
              bookingId: String(activeChauffeurBooking.id),
              bookingStatus: activeChauffeurBooking.status,
              tripType: activeChauffeurBooking.trip_type,
              driverName: driver?.full_name ?? 'Chauffeur',
              driverPhone: driver?.phone ?? '',
              vehicleDisplay: vehicle ? `${vehicle.make ?? ''} ${vehicle.model ?? ''}`.trim() : '',
              vehiclePlate: vehicle?.plate_number ?? '',
            },
          });
        } else if (targetLog.is_requested === true) {
          // Employee has requested but driver hasn't started yet → waiting screen
          hasNavigatedToActiveRideRef.current = true;
          router.push({
            pathname: '/employee/waiting',
            params: {
              mode: 'chauffeur',
              bookingId: String(activeChauffeurBooking.id),
              bookingStatus: activeChauffeurBooking.status,
              tripType: activeChauffeurBooking.trip_type,
              driverName: driver?.full_name ?? 'Captain',
              driverPhone: driver?.phone ?? '',
              vehicleDisplay: vehicle ? `${vehicle.make ?? ''} ${vehicle.model ?? ''}`.trim() : '',
              vehiclePlate: vehicle?.plate_number ?? '',
            },
          });
        }
        // is_requested=false → stay home, no navigation
      }
    }
  }, [
    shuttleTrips,
    activeChauffeurBooking,
    isShuttleTripsLoading,
    isActiveBookingLoading,
    companyId,
    employeeId,
    hasChauffeur,
    router,
  ]);

  // Store active chauffeur booking in a ref for zero-latency navigation inside socket listeners
  const chauffeurBookingRef = useRef(activeChauffeurBooking);

  const handleReviewSuccess = useCallback(() => {
    setPendingReviewBookingId(null);
  }, []);
  useEffect(() => {
    chauffeurBookingRef.current = activeChauffeurBooking;
  }, [activeChauffeurBooking]);

  useChauffeurStatusListener(
    useCallback(
      (data) => {
        // Guard: if user has navigated to a child screen (waiting / ride-active),
        // ShuttleEmployee is still mounted in the stack but not focused.
        // Without this guard, double-navigation conflicts silently fail.
        if (!isFocused) return;

        const booking = chauffeurBookingRef.current;
        if (!booking || String(booking.id) !== String(data.bookingId)) return;

        const liveStatuses = ['OTW', 'ARRIVED', 'IN_PROGRESS'];
        if (liveStatuses.includes(data.status)) {
           const driver = booking.users_chauffeur_bookings_driver_idTousers;
           const vehicle = booking.vehicles;
           router.push({
             pathname: '/employee/ride-active',
             params: {
               mode: 'chauffeur',
               bookingId: String(booking.id),
               bookingStatus: data.status,
               tripType: booking.trip_type,
               driverName: driver?.full_name ?? 'Chauffeur',
               driverPhone: driver?.phone ?? '',
               vehicleDisplay: vehicle ? `${vehicle.make ?? ''} ${vehicle.model ?? ''}`.trim() : '',
               vehiclePlate: vehicle?.plate_number ?? '',
             },
           });
        }
      },
      [router, isFocused]
    )
  );

  // Navigate to active ride screen the moment a driver starts any shuttle trip.
  useRideStartListener(
    useCallback((data: any) => {
      const trips = shuttleTripsRef.current;
      const matchingTrip = trips.find((t: any) => t.id === data.tripId);
      const myPickupStopId = matchingTrip?.my_pickup_stop_id ?? null;
      const driverPhone = matchingTrip?.users?.phone ?? '';
      const vehicle = matchingTrip?.routes?.vehicles;
      const vehicleDisplay = vehicle
        ? `${vehicle.make} ${vehicle.model}`.trim()
        : data.vehicleInfo;
      const vehiclePlate = vehicle?.plate_number ?? '';
      // Backend sends route name in `driverName` field — prefer real name from trip.
      const driverName = matchingTrip?.users?.full_name ?? data.driverName;
      const direction = matchingTrip?.direction ?? '';

      router.push({
        pathname: '/employee/ride-active',
        params: {
          tripId: String(data.tripId),
          myPickupStopId: myPickupStopId != null ? String(myPickupStopId) : '',
          driverName,
          driverPhone,
          vehicleDisplay,
          vehiclePlate,
          direction,
        },
      });
    }, [router]),
  );

  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  const [isCalling, setIsCalling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingReviewBookingId, setPendingReviewBookingId] = useState<number | null>(null);

  const reviewSheetRef = useRef<BottomSheet>(null);
  const reviewDriverName =
    activeChauffeurBooking?.users_chauffeur_bookings_driver_idTousers?.full_name ??
    shuttleTrips[0]?.users?.full_name ??
    'Your Captain';
  const reviewVehicleRaw = activeChauffeurBooking?.vehicles ?? (shuttleTrips[0]?.routes?.vehicles ?? null);
  const reviewVehicleDisplay = reviewVehicleRaw
    ? `${(reviewVehicleRaw as any).make ?? ''} ${(reviewVehicleRaw as any).model ?? ''}`.trim() || '—'
    : '—';
  const reviewVehiclePlate = (reviewVehicleRaw as any)?.plate_number ?? '—';

  const handleRefresh = useCallback(async () => {
    // Avoid duplicate refreshes if already refreshing
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      const tasks: Promise<any>[] = [];
      if (companyId && employeeId && hasShuttle) tasks.push(refetchShuttleTrips());
      if (companyId && hasChauffeur) tasks.push(refetchActiveChauffeurBooking());
      if (companyId && employeeId) tasks.push(refetchChauffeurBookings());
      
      // Batch all refetch operations in parallel
      if (tasks.length > 0) {
        await Promise.all(tasks);
      }
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [companyId, employeeId, hasShuttle, hasChauffeur, refetchShuttleTrips, refetchActiveChauffeurBooking, refetchChauffeurBookings, isRefreshing]);

  const lastHandledRefreshTokenRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isFocused || !refreshToken) return;
    if (lastHandledRefreshTokenRef.current === refreshToken) return;

    lastHandledRefreshTokenRef.current = refreshToken;
    
    // Optimized scroll-to-top: use requestAnimationFrame for better frame timing
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      
      // Defer refresh until current interaction completes to avoid blocking UI thread
      InteractionManager.runAfterInteractions(() => {
        handleRefresh();
      });
    });
  }, [isFocused, refreshToken, handleRefresh]);

  const handleCallDriver = useCallback(() => {
    setIsCalling(true);
    requestAnimationFrame(() => {
      Linking.openURL('tel:+923162211320');
    });
  }, []);

  const handleHelp = useCallback(() => {
    // TODO: open help screen or URL when available
  }, []);

  // Removed logout handler as it now lives in EmployeeDrawerContent

  const handleChauffeurCardPress = useCallback(() => {
    // If dev outstation is enabled and we are not yet waiting for a response,
    // first ask for the dropoff location instead of going straight to active ride.
    if (isOutstationDev && !isWaitingForDriverResponse) {
      // openDropoffSheet behavior removed; outstation dev flow may need to be handled via a screen instead
      return;
    }

    // Find the active/started shuttle trip to pass real params
    const activeTrip = shuttleTrips.find(
      (t) => t.status === 'STARTED' || t.status === 'IN_PROGRESS',
    ) ?? shuttleTrips[0];
    const myPickupStopId = activeTrip?.my_pickup_stop_id ?? null;
    const driverPhone = activeTrip?.users?.phone ?? '';
    const vehicle = activeTrip?.routes?.vehicles;
    const vehicleDisplay = vehicle ? `${vehicle.make} ${vehicle.model}`.trim() : '';
    const vehiclePlate = vehicle?.plate_number ?? '';
    const driverName = activeTrip?.users?.full_name ?? 'Driver';

    router.push({
      pathname: '/employee/ride-active',
      params: {
        tripId: activeTrip?.id ? String(activeTrip.id) : '',
        myPickupStopId: myPickupStopId != null ? String(myPickupStopId) : '',
        driverName,
        driverPhone,
        vehicleDisplay,
        vehiclePlate,
      },
    });
  }, [isOutstationDev, isWaitingForDriverResponse, router, shuttleTrips]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setIsCalling(false);
    });
    return () => sub.remove();
  }, []);

  return (
    <View style={{ paddingTop: insets.top }} className="bg-[#FFFF] flex-1">
      <AppHeader />

      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 20 }}
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
        {/* Status bar: purple card */}
        {/* <View className="px-4 mt-6">
          <RideStatusBar
            enableDevToggle
            upcomingShuttle={upcomingShuttle}
            isLoading={isShuttleTripsLoading}
          />
        </View> */}
        <View className="gap-4">
          {shouldShowChauffeurCard ? (
            <FlipCard
              booking={chauffeurCardBooking}
              shuttleTrip={null}
              isLoading={isActiveBookingLoading || isActiveBookingFetching}
              isChauffeurEnabled
              isShuttleEnabled={false}
            />
          ) : null}
          {shouldShowShuttleCard ? (
            <FlipCard
              booking={null}
              shuttleTrip={shuttleCardTrip}
              isLoading={isShuttleTripsLoading}
              isChauffeurEnabled={false}
              isShuttleEnabled
            />
          ) : null}
        </View>

        {/* Chauffeur / Outstation card - opens dropoff sheet when dev outstation is enabled */}
        {/* <View className="px-4 mt-4">
          <Pressable
            onPress={handleChauffeurCardPress}
            className="rounded-2xl overflow-hidden"
          >
            <View
              className="flex-row items-center px-4 py-5"
              style={{
                backgroundColor: '#f47f00',
                elevation: 4,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 6,
              }}
            >
              <View className="w-12 h-12 rounded-full bg-white/20 items-center justify-center mr-3">
                <Ionicons name="car-outline" size={24} color="#fff" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-lg font-bold">
                  chauffeur ride card
                </Text>
                {isOutstationDev && <Text className="text-white/90 text-sm mt-1">
                  Tap to add your dropoff location and start the ride.
                </Text>}

              </View>
              <Entypo name="chevron-right" size={24} color="#fff" />
            </View>
          </Pressable>
        </View> */}



        {/* Circular action buttons: Call Driver, Scan QR, Help
        <View className="px-4 mt-8 flex-row justify-between">
          <Pressable
            onPress={handleCallDriver}
            className="items-center flex-1"
            android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
          >
            <View style={styles.circleButton} className="bg-white/15">
              <Ionicons name="call" size={28} color="#fff" />
            </View>
            <Text className="text-white text-sm mt-2 font-medium">
              {isCalling ? 'Calling…' : 'Call Driver'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/employee/qr-scanner')}
            className="items-center flex-1"
            android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
          >
            <View style={styles.circleButton} className="bg-white/15">
              <MaterialCommunityIcons name="qrcode-scan" size={28} color="#fff" />
            </View>
            <Text className="text-white text-sm mt-2 font-medium">Scan QR</Text>
          </Pressable>
          <Pressable
            onPress={handleHelp}
            className="items-center flex-1"
            android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
          >
            <View style={styles.circleButton} className="bg-white/15">
              <Ionicons name="help-circle-outline" size={28} color="#fff" />
            </View>
            <Text className="text-white text-sm mt-2 font-medium">Help</Text>
          </Pressable>
        </View> */}

        {/* Recent Rides section - only show if loading or has completed rides */}
        {isChauffeurBookingsLoading || completedChauffeurRides.length > 0 ? (
          <View className="mt-5">
            <Pressable 
              onPress={() => { router.push('/employee/rides') }} 
              hitSlop={8}
              disabled={isChauffeurBookingsLoading}
            >
              <View className="flex-row items-center justify-between gap-0 mb-3">
                <Text className="text-black text-2xl font-bold">Recent Rides</Text>
                <Text className={`text-sm font-bold ${isChauffeurBookingsLoading ? 'text-gray-400' : 'text-[#FF5A00]'}`}>
                  View all
                </Text>
              </View>
            </Pressable>
            <View className="gap-4">
              {/* Show skeleton loaders while loading */}
              {isChauffeurBookingsLoading ? (
                <>
                  <CompactRideHistoryCardSkeleton />
                  <CompactRideHistoryCardSkeleton />
                </>
              ) : (
                completedChauffeurRides
                  .slice(0, 2)
                  .map((booking) => {
                    const destination = booking.destination_cities?.[0]
                      || booking.pickup_address?.split(',')[0]
                      || '—';
                    const dateStr = booking.scheduled_for
                      ? new Date(booking.scheduled_for).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })
                      : '—';
                    const rideType = booking.trip_type === 'OUT_STATION' ? 'Outstation' : 'In-city';
                    const dropoffTime = booking.scheduled_for
                      ? new Date(booking.scheduled_for).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })
                      : '—';

                    return (
                      <CompactRideHistoryCard
                        key={booking.id}
                        destination={destination}
                        date={dateStr}
                        rideType={rideType}
                        timeOfDropoff={dropoffTime}
                        onPress={() =>
                          router.push({
                            pathname: '/employee/ride-details',
                            params: { rideId: String(booking.id) },
                          })
                        }
                      />
                    );
                  })
              )}

            </View>
          </View>
        ) : null}

        {/* Bento grid for promo / placeholders - always visible */}
        <View className="mt-4">
          {/* Large card with bus image background, similar to RideStatusBar styling */}
          <ImageBackground
            source={require('@/../assets/bus_image.png')}
            style={styles.bentoLarge}
            imageStyle={styles.bentoLargeImage}

          >
            <View className="flex-1 justify-between p-4 bg-black/30">
              <Pressable >
                <Text className="text-white text-xs font-semibold uppercase tracking-wide">
                  Instation & Outstation
                </Text>
                <Text className="text-white text-2xl font-bold mt-1">
                  Your chauffeur, your schedule
                </Text>
              </Pressable>
              <View className="flex-row items-center mt-3">

              </View>
            </View>
          </ImageBackground>

          {/* Two small square containers below with images */}
          <View className="flex-row mt-3 gap-3">
            <ImageBackground
              source={require('@/../assets/happy_blackgirl.jpg')}
              style={styles.bentoSmall}
              imageStyle={styles.bentoSmallImage}
            >
              <View className="flex-1  items-start justify-end p-3">
                <Text className="text-white text-lg font-semibold">
                  Enjoy the ride while we handle the rest.
                </Text>
              </View>
            </ImageBackground>
            <ImageBackground
              source={require('@/../assets/carholding.jpg')}
              style={styles.bentoSmall}
              imageStyle={styles.bentoSmallImage}
            >
              <View className="flex-1  items-start justify-end p-3">
                <Text className="text-white text-lg font-semibold">
                  Chauffeur at your door, right on time.
                </Text>
              </View>
            </ImageBackground>
          </View>
        </View>
      </ScrollView>

      <RideReviewSheet
        sheetRef={reviewSheetRef}
        visible={pendingReviewBookingId !== null}
        bookingId={pendingReviewBookingId ?? 0}
        companyId={companyId}
        driverName={reviewDriverName}
        vehicleDisplay={reviewVehicleDisplay}
        vehiclePlate={reviewVehiclePlate}
        onSuccess={handleReviewSuccess}
      />
    </View>
  );
}

function InfoRow({
  label,
  value,
  valueClassName = 'text-white',
  hasBorder
}: {
  label: string;
  value: string;
  valueClassName?: string;
  hasBorder: boolean
}) {
  return (
    <View className="flex-row justify-between items-center py-3 px-4 border-white/10" style={{ borderBottomWidth: hasBorder ? 2 : 0 }}>
      <Text className="text-text-primary text-xl">{label}</Text>
      <Text className={`text-xl text-text-muted font-medium `}>{value}</Text>
    </View>
  );
}

const CIRCLE_SIZE = 56;

const styles = StyleSheet.create({
  circleButton: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoLarge: {
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 150,
    justifyContent: 'flex-end',
  },
  bentoLargeImage: {
    borderRadius: 16,
  },
  bentoSmall: {
    flex: 1,
    height: 120,
  },
  bentoSmallImage: {
    borderRadius: 16,
  },
});


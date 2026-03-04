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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AntDesign, Entypo, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { fontFamily } from '@/core/theme';
import { useToast } from '@/shared/ui/molecules/Toast';

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
import { useRouter, useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { useFocusEffect } from 'expo-router';
import { useGetChauffeurBookingsQuery } from '../services/bookingsApi';
import { useGetShuttleTripsForEmployeeQuery } from '../services/employeeShuttleApi';
import { CompactRideHistoryCard } from '../components/CompactRideHistoryCard';
import { RideStatusBar, type UpcomingShuttleInfo } from '../components/RideStatusBar';
import {
  setIsWaitingForDriverResponse,
  setOutstationDropoff,
  setChauffeurRide,
} from '../store';
import { useRideStartListener } from '../../../hooks/useRideStartListener';
import FlipCard from '../components/FlipCard';

const PROFILE_SHEET_SNAP = ['65%'];
const DROPOFF_SHEET_SNAP = ['45%'];

export default function NewHome() {
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
  const { data: chauffeurBookingsData } = useGetChauffeurBookingsQuery(
    { companyId, employeeId },
    { skip: !companyId || !employeeId },
  );

  const {
    data: shuttleTrips = [],
    isLoading: isShuttleTripsLoading,
    refetch: refetchShuttleTrips,
  } = useGetShuttleTripsForEmployeeQuery(
    { companyId, employeeId },
    { skip: !companyId || !employeeId },
  );

  // Always keep a ref pointing at the latest trips so the socket callback
  // (which closes over a stale value) can read fresh data after a refetch.
  const shuttleTripsRef = useRef(shuttleTrips);
  useEffect(() => {
    shuttleTripsRef.current = shuttleTrips;
  }, [shuttleTrips]);

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

  const router = useRouter();
  const navigation = useNavigation();

  const handleOpenDrawer = useCallback(() => {
    navigation.dispatch(DrawerActions.openDrawer());
  }, [navigation]);

  // Refetch whenever this screen comes back into focus (e.g. returning from RideActive).
  // This ensures the next trip (e.g. evening/return) is automatically shown
  // without the user having to pull-to-refresh.
  useFocusEffect(
    useCallback(() => {
      if (companyId && employeeId) {
        refetchShuttleTrips();
      }
    }, [companyId, employeeId, refetchShuttleTrips]),
  );

  // Navigate to active ride screen the moment a driver starts any trip.
  // Both MORNING and EVENING trips are already SCHEDULED in the DB (generated daily),
  // so they exist in the cached list. We read from the ref for a zero-latency
  // navigation — no network wait before the screen opens.
  useRideStartListener(
    useCallback((data) => {
      const trips = shuttleTripsRef.current;
      const matchingTrip = trips.find((t) => t.id === data.tripId);
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

  const [isCalling, setIsCalling] = useState(false);

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
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row justify-between items-center my-4">
          <View className="flex-1">
            <Pressable onPress={showHomeToast} hitSlop={8}>
              <Text className="text-black text-4xl font-bold">
                {/* Hey there, {firstName ? `${firstName}` : ' Muhammad'} */}
                Home
              </Text>
            </Pressable>

            {/* <Text className="text-text-muted text-xl mt-1">
              Where do you want to go?
            </Text> */}
          </View>
          <Pressable
            onPress={handleOpenDrawer}
            className="w-12 h-12 rounded-full items-center justify-center ml-3"
          >
            <AntDesign name="menu" size={22} color="black" />
          </Pressable>
        </View>

        {/* Status bar: purple card */}
        {/* <View className="px-4 mt-6">
          <RideStatusBar
            enableDevToggle
            upcomingShuttle={upcomingShuttle}
            isLoading={isShuttleTripsLoading}
          />
        </View> */}
        <FlipCard />
        {/* <FlipCard /> */}

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

        {/* Recent Rides section */}
        <View className="mt-5">
          <Pressable onPress={() => { router.push('/employee/rides') }} hitSlop={8}>
            <View className="flex-row items-center justify-between gap-0 mb-3">
              <Text className="text-black text-2xl font-bold">Recent Rides</Text>
              <Text className='text-amber-500 text-sm font-bold'>View all</Text>
              {/* <Pressable onPress={()=>{router.push('/employee/rides')}} hitSlop={8}>
                <Text className="text-text-muted text-sm font-medium">View history</Text>
              </Pressable> */}
            </View>
          </Pressable>
          <View className="gap-4 flex-1">
            {/* <RideHistoryCardNew
              pickup="Clifton"
              destination="Tower"
              status="completed"
              timeOfRide="Today, 08:30 AM"
              rideType="shuttle"
              description="Sajjad, White Toyota Hiace"
              onPress={() =>
                router.push({
                  pathname: '/employee/ride-details',
                  params: { rideId: 'PO123RT' },
                })
              }
            />
            <RideHistoryCardNew
              pickup="Tower"
              destination="Clifton"
              status="missed"
              timeOfRide="Yesterday, 04:15 PM"
              rideType="chauffeur"
              description="Nadir, Black Toyota Camry"
              onPress={() =>
                router.push({
                  pathname: '/employee/ride-details',
                  params: { rideId: 'RO213KS' },
                })
              }
            /> */}
            <CompactRideHistoryCard
              destination="Tower"
              date="Yesterday"
              rideType="Shuttle"
              timeOfDropoff="14:52"
              onPress={() =>
                router.push({
                  pathname: '/employee/ride-details',
                  params: { rideId: 'PO123RT' },
                })
              }
            />
            <CompactRideHistoryCard
              destination="Clifton"
              date="Oct 24"
              rideType="Shuttle"
              timeOfDropoff="22:10"
              onPress={() =>
                router.push({
                  pathname: '/employee/ride-details',
                  params: { rideId: 'PO123RT' },
                })
              }
            />

            {/* Bento grid for promo / placeholders */}
            <View className="mt-4">
              {/* Large card with bus image background, similar to RideStatusBar styling */}
              <ImageBackground
                source={require('@/../assets/bus_image.png')}
                style={styles.bentoLarge}
                imageStyle={styles.bentoLargeImage}

              >
                <View className="flex-1 justify-between p-4 bg-black/30">
                  <Pressable onPress={() => router.push('/employee/ride-active')}>
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
          </View>
        </View>
      </ScrollView>

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
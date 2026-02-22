import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
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
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { useRouter } from 'expo-router';
import { logOut } from '../../auth/store';
import { logout } from '../../auth/services';
import { useGetChauffeurBookingsQuery } from '../services/bookingsApi';
import { useGetShuttleTripsForEmployeeQuery } from '../services/employeeShuttleApi';
import { RideHistoryCard } from '../components/RideHistoryCard';
import { RideStatusBar, type UpcomingShuttleInfo } from '../components/RideStatusBar';
import {
  setIsWaitingForDriverResponse,
  setOutstationDropoff,
  setChauffeurRide,
} from '../store';

const PROFILE_SHEET_SNAP = ['65%'];
const DROPOFF_SHEET_SNAP = ['45%'];

export default function NewHome() {
  const user = useAppSelector((state) => state.auth.user);
  const { isOutstationDev, isWaitingForDriverResponse } = useAppSelector(
    (state) => state.employeeRide,
  );
  const dispatch = useAppDispatch();

  const companyId = (user?.company_id ?? 0) as number;
  const employeeId = (user?.id ?? '') as string;
  const { data: chauffeurBookingsData } = useGetChauffeurBookingsQuery(
    { companyId, employeeId },
    { skip: !companyId || !employeeId },
  );

  const { data: shuttleTrips = [], isLoading: isShuttleTripsLoading } = useGetShuttleTripsForEmployeeQuery(
    { companyId, employeeId },
    { skip: !companyId || !employeeId },
  );

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

  const profileSheetRef = useRef<BottomSheet>(null);
  const dropoffSheetRef = useRef<BottomSheet>(null);
  const profileSnapPoints = useMemo(() => PROFILE_SHEET_SNAP, []);
  const dropoffSnapPoints = useMemo(() => DROPOFF_SHEET_SNAP, []);
  const [dropoffValue, setDropoffValue] = useState('');
  const router = useRouter();
  const openProfileSheet = useCallback(() => {
    profileSheetRef.current?.snapToIndex(0);
  }, []);

  const closeProfileSheet = useCallback(() => {
    profileSheetRef.current?.close();
  }, []);

  const openDropoffSheet = useCallback(() => {
    setDropoffValue('');
    dropoffSheetRef.current?.snapToIndex(0);
  }, []);

  const closeDropoffSheet = useCallback(() => {
    dropoffSheetRef.current?.close();
  }, []);

  const handleConfirmDropoff = useCallback(() => {
    if (!dropoffValue.trim()) {
      return;
    }
    dispatch(setOutstationDropoff(dropoffValue.trim()));
    dispatch(setIsWaitingForDriverResponse(true));
    closeDropoffSheet();
    router.push('/employee/ride-active');
  }, [closeDropoffSheet, dispatch, dropoffValue, router]);
  const insets=useSafeAreaInsets();
  const handleSheetChange = useCallback((index: number) => {
    // optional: track open/close
  }, []);
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5} // Adjust darkness (0-1)
      />
    ),
    []
  );

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

  const handleLogout = useCallback(async () => {
    closeProfileSheet();
    try {
      await logout();
    } finally {
      dispatch(logOut());
      router.replace('/(auth)/get-started');
    }
  }, [closeProfileSheet, dispatch, router]);

  const handleChauffeurCardPress = useCallback(() => {
    // If dev outstation is enabled and we are not yet waiting for a response,
    // first ask for the dropoff location instead of going straight to active ride.
    if (isOutstationDev && !isWaitingForDriverResponse) {
      openDropoffSheet();
      return;
    }
    router.push('/employee/ride-active');
  }, [isOutstationDev, isWaitingForDriverResponse, openDropoffSheet, router]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setIsCalling(false);
    });
    return () => sub.remove();
  }, []);

  return (
    <View style={{ paddingTop: insets.top }} className="bg-white flex-1">
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row justify-between items-center px-4 mt-4">
          <View className="flex-1">
            <Text className="text-black text-3xl font-bold mb-1">
              Hey there, {firstName ? `${firstName}` : ' Muhammad'}
            </Text>
            
            {/* <Text className="text-text-muted text-xl mt-1">
              Where do you want to go?
            </Text> */}
          </View>
          <Pressable
            onPress={openProfileSheet}
            className="w-12 h-12 rounded-full items-center justify-center ml-3"
          >
           <AntDesign name="align-right" size={24} color="black" />
          </Pressable>
        </View>

        {/* Status bar: purple card */}
        <View className="px-4 mt-6">
          <RideStatusBar
            enableDevToggle
            upcomingShuttle={upcomingShuttle}
            isLoading={isShuttleTripsLoading}
          />
        </View>

        {/* Chauffeur / Outstation card - opens dropoff sheet when dev outstation is enabled */}
        <View className="px-4 mt-4">
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
        </View>

    

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
        <View className="px-4 mt-6">
          <Pressable onPress={()=>{router.push('/employee/rides')}} hitSlop={8}>
            <View className="flex-row items-center justify-between gap-0 px-1 mb-3">
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
            <RideHistoryCard
              rideId="PO123RT"
              driverName="Sajjad"
              pickup="Clifton"
              destination="Tower"
              status="completed"
              dateTime="Today, 08:30 AM"
              onPress={() =>
                router.push({
                  pathname: '/employee/ride-details',
                  params: { rideId: 'PO123RT' },
                })
              }
            />
            <RideHistoryCard
              rideId="PO123RT"
              driverName="Sajjad"
              pickup="Clifton"
              destination="Tower"
              status="completed"
              dateTime="Today, 08:30 AM"
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
                  <View>
                    <Text className="text-white text-xs font-semibold uppercase tracking-wide">
                      Instation & Outstation
                    </Text>
                    <Text className="text-white text-2xl font-bold mt-1">
                      Your chauffeur, your schedule
                    </Text>
                  </View>
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
                  <View className="flex-1 bg-black/25 items-start justify-end p-3">
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
                  <View className="flex-1 bg-black/25 items-start justify-end p-3">
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

      {/* Profile bottom sheet */}
      <BottomSheet
        ref={profileSheetRef}
        index={-1}
        snapPoints={profileSnapPoints}
        backdropComponent={renderBackdrop}
        enablePanDownToClose
        onChange={handleSheetChange}
        backgroundStyle={{ backgroundColor: '#1F1F1D' }}
        handleIndicatorStyle={{ backgroundColor: '#1F1F1D' }}
      >
        <BottomSheetView style={{ flex: 1 }}>
          <View className="flex-1" style={{ paddingBottom: 32 }}>
            {/* Close button - top right */}
            <View className="absolute top-0 right-0 px-4 pt-2">
              <Pressable
                onPress={closeProfileSheet}
                className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
              >
                <Ionicons name="close" size={24} color="#fff" />
              </Pressable>
            </View>

            {/* Avatar & name */}
            <View className="items-center mt-0">
              <View className="w-24 h-24 rounded-full bg-white/20 items-center justify-center">
                <Text className="text-white text-3xl font-bold">{initials}</Text>
              </View>
              <Text className="text-white text-2xl font-bold mt-3">
                {fullName}
              </Text>
              {/* <Text className="text-gray-400 text-sm mt-1">Employee</Text> */}
            </View>
{/* 
            Key info - joined date
            <View className="flex-row justify-center mt-6 px-4">
              <View className="items-center">
                <MaterialCommunityIcons
                  name="calendar"
                  size={22}
                  color="rgba(255,255,255,0.8)"
                />
                <Text className="text-gray-300 text-sm mt-1">Joined 1/09/2024</Text>
              </View>
            </View> */}

            {/* Detail list */}
            <View className='mt-6 mb-4  mx-4 '>
              <Text className='text-text-muted ml-4 mb-2'>Details</Text>
              <View className="rounded-xl py-1 bg-surface-light">
                <InfoRow label="Email" value={user?.email ?? '—'} hasBorder={true}/>
                <InfoRow label="Status" value={'Employee'} hasBorder={true}/>
                
                <InfoRow label="Shuttle Route" value="101" hasBorder={false}/>
              
              </View>
            </View>
            <Pressable
              onPress={handleLogout}
              className="py-4 rounded-2xl w-[90%] mx-auto items-center active:opacity-90"
              accessibilityRole="button"
            >
              <Text className="text-red-600 text-base font-semibold">
                Log out
              </Text>
            </Pressable>
          </View>
        </BottomSheetView>
      </BottomSheet>

      {/* Dropoff entry bottom sheet (dev outstation flow) */}
      <BottomSheet
        ref={dropoffSheetRef}
        index={-1}
        snapPoints={dropoffSnapPoints}
        backdropComponent={renderBackdrop}
        enablePanDownToClose
        onChange={handleSheetChange}
        backgroundStyle={{ backgroundColor: '#111827' }}
        handleIndicatorStyle={{ backgroundColor: '#4B5563' }}
      >
        <BottomSheetView style={{ flex: 1 }}>
          <View className="flex-1 px-4 pt-4 pb-6">
            <Text className="text-white text-xl font-bold mb-1">
              Enter dropoff
            </Text>
            <Text className="text-gray-400 text-sm mb-4">
              Add a dropoff location for your outstation chauffeur ride.
            </Text>
            <View className="bg-white/10 rounded-2xl px-3 py-2 mb-4">
              <TextInput
                value={dropoffValue}
                onChangeText={setDropoffValue}
                placeholder="e.g. Gharo Wind Farm"
                placeholderTextColor="#9CA3AF"
                className="text-white text-base"
              />
            </View>
            <Pressable
              onPress={handleConfirmDropoff}
              className="mt-auto bg-white rounded-2xl py-3 items-center active:opacity-90"
            >
              <Text className="text-black font-semibold text-base">
                Confirm dropoff
              </Text>
            </Pressable>
          </View>
        </BottomSheetView>
      </BottomSheet>
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
  hasBorder:boolean
}) {
  return (
    <View className="flex-row justify-between items-center py-3 px-4 border-white/10" style={{borderBottomWidth:hasBorder?2:0}}>
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
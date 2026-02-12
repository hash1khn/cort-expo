import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Linking, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Entypo, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useAppSelector } from '../../../store/hooks';
import { useRouter } from 'expo-router';
import { RideHistoryCard } from '../components/RideHistoryCard';
import { RideStatusBar } from '../components/RideStatusBar';

const PROFILE_SHEET_SNAP = ['65%'];

export default function NewHome() {
  const user = useAppSelector((state) => state.auth.user);
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

  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => PROFILE_SHEET_SNAP, []);
  const router=useRouter();
  const openProfileSheet = useCallback(() => {
    bottomSheetRef.current?.snapToIndex(0);
  }, []);

  const closeProfileSheet = useCallback(() => {
    bottomSheetRef.current?.close();
  }, []);

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

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setIsCalling(false);
    });
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaView
      style={{ flex: 1 }}
      className="bg-background flex-1 flex flex-col"
    >
      <View className="flex-1 flex flex-col">
        <View className="flex-row justify-between items-center px-4 mt-4">
          <View className="flex-1">
            <Text className="text-text-primary text-3xl font-bold mb-1">
              Hey there{firstName ? `, ${firstName}` : ''}
            </Text>
            {/* <Text className="text-text-muted text-xl mt-1">
              Where do you want to go?
            </Text> */}
          </View>
          <Pressable
            onPress={openProfileSheet}
            className="w-12 h-12 rounded-full bg-white/20 items-center justify-center ml-3"
          >
            <Ionicons name="person" size={26} color="#fff" />
          </Pressable>
        </View>

        {/* Status bar: purple card */}
        <View className="px-4 mt-6">
          <RideStatusBar enableDevToggle />
        </View>

        {/* Booked chauffeur ride card — neutral, like recent rides */}
        <View className="px-4 mt-4">
          <Pressable
            onPress={() => router.push('/employee/(home)/ride-active')}
            className="rounded-[1.25rem] overflow-hidden bg-white/10 p-4 active:opacity-90"
          >
            <View className="flex-row items-center mb-3">
              <View className="w-12 h-12 rounded-full bg-[#1a1a1a] items-center justify-center mr-3">
                <MaterialCommunityIcons name="car-side" size={24} color="#9ca3af" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-white text-lg font-bold">Your Chauffeur Ride</Text>
                <Text className="text-gray-400 text-sm mt-0.5">Booked</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </View>
            <View className="flex-row items-center gap-4">
              <View className="flex-1">
                <Text className="text-gray-500 text-[10px] font-medium uppercase tracking-wider">
                  Pick-up
                </Text>
                <Text className="text-white text-base font-bold mt-1">Clifton Block 2</Text>
              </View>
              <View
                style={{
                  flex: 1,
                  height: 0,
                  borderTopWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: 'rgba(156, 163, 175, 0.6)',
                  marginHorizontal: 8,
                }}
              />
              <View className="flex-1 items-end">
                <Text className="text-gray-500 text-[10px] font-medium uppercase tracking-wider">
                  Destination
                </Text>
                <Text className="text-white text-base font-bold mt-1">Ocean Tower</Text>
              </View>
            </View>
            <Text className="text-gray-400 text-xs mt-2">Tomorrow, 9:00 AM</Text>
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
            onPress={() => router.push('/employee/(home)/qr-scanner')}
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
        <View className="px-4 mt-6 flex-grow">
          <Pressable onPress={()=>{router.push('/employee/(home)/rides')}} hitSlop={8}>
            <View className="flex-row items-center gap-2 px-1 mb-4">
              <Text className="text-white text-2xl font-bold">Recent Rides</Text>
              <Entypo name="chevron-right" size={24} color="#8b8a8f" />
              {/* <Pressable onPress={()=>{router.push('/employee/(home)/rides')}} hitSlop={8}>
                <Text className="text-text-muted text-sm font-medium">View history</Text>
              </Pressable> */}
            </View>
          </Pressable>
          <View className="gap-4 flex-1" >
            {/* <RideHistoryCardNew
              pickup="Clifton"
              destination="Tower"
              status="completed"
              timeOfRide="Today, 08:30 AM"
              rideType="shuttle"
              description="Sajjad, White Toyota Hiace"
              onPress={() =>
                router.push({
                  pathname: '/employee/(home)/ride-details',
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
                  pathname: '/employee/(home)/ride-details',
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
                  pathname: '/employee/(home)/ride-details',
                  params: { rideId: 'PO123RT' },
                })
              }
            />
          
          </View>
        </View>
      </View>

      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        enablePanDownToClose
        onChange={handleSheetChange}
        backgroundStyle={{ backgroundColor: '#1F1F1D' }}
        handleIndicatorStyle={{ backgroundColor: '#1F1F1D' }}
      >
        <BottomSheetView style={{ flex: 1 } }>
          <View
            className="flex-1"
            style={{ paddingBottom: 32 }}
        
          >
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
            <Pressable className="py-4 rounded-2xl w-[90%] mx-auto items-center active:opacity-90">
          <Text className="text-red-600 text-base font-semibold">
            Log out
          </Text>
              
        </Pressable>
          </View>
        </BottomSheetView>
      </BottomSheet>
    </SafeAreaView>
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
});
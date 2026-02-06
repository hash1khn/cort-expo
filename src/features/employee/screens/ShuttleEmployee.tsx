import React, { useCallback, useMemo, useRef } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Entypo, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useAppSelector } from '../../../store/hooks';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { RideHistoryCard } from '../components/RideHistoryCard';
import { RideHistoryCardNew } from '../components/RideHistoryCardNew';
import { RideStatusBar } from '../components/RideStatusBar';

const PROFILE_SHEET_SNAP = ['65%'];

export default function ShuttleEmployee() {
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
  
  return (
    <SafeAreaView
      style={{ flex: 1 }}
      className="bg-background flex-1 h-full flex flex-col border-2 "
    >
        <View className="flex-row justify-between px-4 mt-4">
          <View className="flex-1">
            <Text className="text-text-primary text-3xl font-bold mb-1">
              Hey there{firstName ? `, ${firstName}` : ''}
            </Text>
            <Text className="text-text-muted text-xl mt-1">
              Where do you want to go?
            </Text>
          </View>
          <Pressable
            onPress={openProfileSheet}
            className="w-12 h-12 rounded-full bg-white/20 items-center justify-center ml-3"
          >
            <Ionicons name="person" size={26} color="#fff" />
          </Pressable>
        </View>
      <View
        className="flex-1 "
       
  
      >
      

        {/* Bento cards */}
        <View className="px-4 mt-6 gap-4 h-[42%] flex-col">
          <RideStatusBar enableDevToggle />
   
        {/* Top row: two cards - flex-1 takes remaining space when status bar shrinks */}
        <View className="flex-row flex-1 gap-4 min-h-0">
          
            <View
            className='bg-[#379d63]'
            style={[styles.callDriverCard, { minHeight: 110 }]}
          >
            <Text className="text-white/90 text-[0.8rem] font-medium mb-2">Queries about shuttle?</Text>
            <View className='flex flex-row justify-between'>
              <View>
                <Text className="text-white text-2xl font-bold">Call</Text>
                <Text className="text-white text-2xl font-bold">Driver</Text>
              </View>
              <Pressable className="flex-1 w-full items-center justify-center">
                  <Ionicons name="call" size={40} color="white" />
                </Pressable>
            </View>

          </View>
          <View
            className='bg-[#ffa00a]'
            style={[styles.scanQrCard, { minHeight: 110 }]}
          >
            <Text className="text-white/90 text-[0.8rem] font-medium mb-2">Shuttle is here?</Text>

            <View className="flex-row justify-between ">
              <View>
                <Text className="text-white text-2xl font-bold">Scan</Text>
                <Text className="text-white text-2xl font-bold">QR code</Text>
              </View>
              <View className="flex-1 w-full items-center justify-center">
              <MaterialCommunityIcons name="qrcode-scan" size={45} color="white" /> 
              </View>
           
            </View>
          </View> 
        </View>
        {/* Bottom: Promo card - lavender */}
       
      </View>

        {/* Recent Rides section */}
        <View className="px-6 mt-8 flex-grow  ">
          <Pressable onPress={()=>{router.push('/employee/(home)/rides')}} hitSlop={8}>
            <View className="flex-row items-center gap-2 mb-4">
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
            <RideHistoryCard
              rideId="RO213KS"
              driverName="Sajjad"
              pickup="Tower"
              destination="Clifton"
              status="missed"
              dateTime="Yesterday, 04:15 PM"
              onPress={() =>
                router.push({
                  pathname: '/employee/(home)/ride-details',
                  params: { rideId: 'RO213KS' },
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
        backgroundStyle={{ backgroundColor: '#151517' }}
        handleIndicatorStyle={{ backgroundColor: '#151517' }}
      >
        <BottomSheetView style={{ flex: 1, backgroundColor: '#151517' }}>
          <View
            className="flex-1 "
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

const styles = StyleSheet.create({
  container: {
    borderRadius: 32,        // 2rem = 32px (1rem = 16px)
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,   // px-4
    paddingVertical: 16,     // py-4
  },
  callDriverCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: 20,
    overflow: 'hidden',
    padding: 16,
    justifyContent: 'flex-end',
  },
  scanQrCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: 20,
    overflow: 'hidden',
    padding: 16,
    justifyContent: 'flex-end',
  },
});
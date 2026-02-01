import React, { useCallback, useMemo, useRef } from 'react';
import { View, Text, Pressable, ScrollView,StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useAppSelector } from '../../../store/hooks';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { RideHistoryCard } from '../components/RideHistoryCard';

const PROFILE_SHEET_SNAP = ['75%'];

export default function ShuttleEmployee() {
  const insets = useSafeAreaInsets();
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

  return (
    <SafeAreaView
      style={{ flex: 1 }}
      className="bg-[#171717] flex-1 h-full flex flex-col border-2"
    >
        <View className="flex-row justify-between px-4 mt-4">
          <View className="flex-1">
            <Text className="text-white text-3xl font-bold mb-1">
              Hey there{firstName ? `, ${firstName}` : ''}
            </Text>
            <Text className="text-gray-400 text-xl mt-1">
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
        <View className="px-4 mt-6 gap-3">
       
          <LinearGradient
            colors={['#7e6aec', '#8b76f6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.container, { minHeight: 140 }]}

          >
            <View className="flex-1 justify-center">
              <View className="flex-row items-center">
                <Text className="text-white text-4xl font-bold">Clifton</Text>
                <Ionicons name="swap-horizontal" size={20} color="#fff" style={{ marginHorizontal: 4 }} />
                <Text className="text-white text-4xl font-bold">Tower</Text>
              </View>
              <Text className='text-white text-base font-semibold mt-1'>Driver:Sajjad</Text>
              <View className="flex-row items-center bg-black/10 px-2.5 py-1.5 rounded-full self-start mt-2.5 gap-1.5">
                <Ionicons name="time-outline" size={14} color="#fff" />
                <Text className="text-white text-base font-semibold">Next Shuttle: 08:30 AM</Text>
              </View>
            </View>
            <View className="w-20 h-20 rounded-full bg-white/20 items-center justify-center">
              <Ionicons name="bus-outline" size={42} color="#fff" />
            </View>
          </LinearGradient>
   
        {/* Top row: two cards side by side */}
        <View className="flex-row flex gap-3">
          <LinearGradient
            colors={['#379d63', '#88be54']}
            start={{ x: 0, y: 1 }}
            end={{ x: 1, y: 0 }}
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

          </LinearGradient>
          <LinearGradient
            colors={['#faaf02', '#fdd967']}
            start={{ x: 0, y: 1 }}
            end={{ x: 1, y: 0 }}
            style={[styles.scanQrCard, { minHeight: 110 }]}
          >
            <View className="flex-row justify-between items-end">
              <View>
                <Text className="text-white text-2xl font-bold">Scan</Text>
                <Text className="text-white text-2xl font-bold">QR code</Text>
              </View>
              <View className="w-20 h-20 rounded-full items-center justify-center">
              <MaterialCommunityIcons name="qrcode-scan" size={45} color="white" /> 
              </View>
           
            </View>
          </LinearGradient> 
        </View>
        {/* Bottom: Promo card - lavender */}
       
      </View>

        {/* Recent Rides section */}
        <View className="px-4 mt-8 flex-grow  ">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-white text-xl font-bold">Recent Rides</Text>
            <Pressable onPress={()=>{router.push('/employee/(home)/rides')}}>
              <Text className="text-[#f5c542] text-sm font-medium">View history</Text>
            </Pressable>
          </View>
          <View className="gap-4 flex-1">
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
        enablePanDownToClose
        onChange={handleSheetChange}
        backgroundStyle={{ backgroundColor: '#252525' }}
        handleIndicatorStyle={{ backgroundColor: '#252525' }}
      >
        <BottomSheetView style={{ flex: 1, backgroundColor: '#252525' }}>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Close button - top right */}
            <View className="flex-row justify-end px-4 pt-2">
              <Pressable
                onPress={closeProfileSheet}
                className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
              >
                <Ionicons name="close" size={24} color="#fff" />
              </Pressable>
            </View>

            {/* Avatar & name */}
            <View className="items-center mt-2">
              <View className="w-24 h-24 rounded-full bg-white/20 items-center justify-center">
                <Text className="text-white text-3xl font-bold">{initials}</Text>
              </View>
              <Text className="text-white text-2xl font-bold mt-3">
                {fullName}
              </Text>
              <Text className="text-gray-400 text-sm mt-1">Employee</Text>
            </View>

            {/* Key info row */}
            <View className="flex-row justify-center gap-6 mt-6 px-4">
              <View className="items-center">
                <MaterialCommunityIcons
                  name="calendar"
                  size={22}
                  color="rgba(255,255,255,0.8)"
                />
                <Text className="text-gray-300 text-sm mt-1">1/09/2024</Text>
              </View>
              <View className="items-center">
                <MaterialCommunityIcons
                  name="account-group"
                  size={22}
                  color="rgba(255,255,255,0.8)"
                />
                <Text className="text-gray-300 text-sm mt-1">15</Text>
              </View>
              <View className="items-center">
                <View className="w-8 h-8 rounded-full bg-white/10 items-center justify-center">
                  <Ionicons name="arrow-up" size={16} color="#fff" />
                </View>
                <Text className="text-gray-300 text-sm mt-1">$100 / mnth</Text>
              </View>
            </View>

            {/* Next payment banner */}
          

            {/* Detail list */}
            <View className="mt-6 px-4">
              <InfoRow label="Group name" value="Hawaii Vacation" />
              <InfoRow label="Pickup date" value="1/07/2025" />
              <InfoRow label="Amount contributed" value="$100" />
              <InfoRow
                label="Contribution status"
                value="Paid"
                valueClassName="text-green-400"
              />
            </View>
            <Pressable className="mx-10 mt-6 rounded-2xl px-4 py-3 bg-red-400 flex-row items-center justify-center ">
              <Text className='text-white text-xl font-bold mr-4'>Logout</Text>
              <MaterialCommunityIcons name="logout" size={24} color="white" />
            </Pressable>
          </ScrollView>
        </BottomSheetView>
      </BottomSheet>
    </SafeAreaView>
  );
}

function InfoRow({
  label,
  value,
  valueClassName = 'text-white',
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <View className="flex-row justify-between items-center py-3 border-b border-white/10">
      <Text className="text-gray-400 text-sm">{label}</Text>
      <Text className={`text-sm font-medium ${valueClassName}`}>{value}</Text>
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
  statusBarGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 1000,
  },
  callDriverCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: 32,
    overflow: 'hidden',
    padding: 16,
    justifyContent: 'flex-end',
  },
  scanQrCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: 32,
    overflow: 'hidden',
    padding: 16,
    justifyContent: 'flex-end',
  },
});
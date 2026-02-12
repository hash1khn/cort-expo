import { Pressable, Text, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useShuttleStore } from '../store';

export function ShuttleDriver() {
  const outboundRideCompleted = useShuttleStore((s) => s.outboundRideCompleted);

  const handleCliftonTowerPress = () => {
    if (outboundRideCompleted) {
      router.push('/shuttle/(home)/return');
    } else {
      router.push('/shuttle/(home)/ride');
    }
  };

  // Updated Data structure for the Information section
  const routeDetails = {
    number: "101",
    stops: "4 (Clifton, PC, Finance, Tower)",
    employees: "11 Total",
    start: "08:30 AM",
    end: "09:30 AM"
  };
  // Helper component for the info rows to keep code DRY
  const InfoRow = ({ label, value, isLast = false }: { label: string, value: string, isLast?: boolean }) => (
    <View 
      className={`flex-row justify-between items-center py-3 px-4 ${!isLast ? 'border-b border-white/5' : ''}`}
    >
      <Text className="text-white text-xl font-medium">{label}</Text>
      <Text className="text-white/50 text-xl font-semibold text-right flex-1 ml-4">
        {value}
      </Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center justify-end py-0">
          {/* <Pressable hitSlop={12} className="p-2 -ml-2 rounded-full bg-white/5">
            <Ionicons name="menu" size={24} color="#fff" />
          </Pressable> */}
          <Pressable hitSlop={12} className="p-2 -mr-2 rounded-full bg-white/5">
            <Ionicons name="person-circle-outline" size={32} color={'#FFFF'} />
          </Pressable>
        </View>

        {/* Title Section */}
        <View className='mb-6'>
          <Text className="text-[34px] font-bold text-white">Today</Text>
          <Text className="text-white/50 text-xl font-medium">February 6, 2026</Text>
        </View>

        {/* ACTIVE TRIP CARD */}
        <View className="rounded-3xl p-6 bg-[#8B5CF6] mb-6 shadow-xl">
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center gap-3">
              <View className="p-2 bg-white/20 rounded-xl">
                <Ionicons name="bus" size={20} color="#fff" />
              </View>
              <View>
                <Text className="text-white/70 text-xs font-bold uppercase tracking-wider">Hiace ABR-986</Text>
                <Text className="text-white text-lg font-bold">Route {routeDetails.number}</Text>
              </View>
            </View>
            <View className="px-3 py-1.5 rounded-full bg-white/20">
              <Text className="text-sm font-bold text-white">{routeDetails.start}</Text>
            </View>
          </View>

          <View className="flex-row items-center gap-3 mb-8">
            <Text className="text-[2rem] text-white font-bold">Clifton</Text>
            <Feather name="arrow-right" size={24} color="rgba(255,255,255,0.6)" />
            <Text className="text-[2rem] text-white font-bold">Tower</Text>
          </View>

     
            <Pressable
              onPress={handleCliftonTowerPress}
              className="flex-row items-center justify-center gap-2 py-4 rounded-2xl bg-white active:scale-[0.98]"
            >
              <Ionicons name="play-sharp" size={20} color={'#8B5CF6'} />
              <Text className="text-2xl font-bold text-[#8B5CF6]"> شروع کریں</Text>
            </Pressable>
         

        </View>

        {/* ROUTE DETAILS (The "Information" Style Table) */}
        <View className="mb-5">
          <Text className="text-white text-xl px-2 font-bold mb-4">Route Details</Text>
          
          <View className="rounded-xl bg-surface-background py-1">
            <InfoRow label="Route number" value={routeDetails.number} />
            <InfoRow label="Stops" value={'4'} />
            <InfoRow label="Employees" value={routeDetails.employees} />
            <InfoRow label="Start" value={routeDetails.start} />
            <InfoRow label="End" value={routeDetails.end} isLast={true} />
          </View>
        </View>
        
        <View className="mb-8">
          <Text className="text-white text-xl px-2 font-bold mb-4">Next Ride</Text>
          <View className="py-3 rounded-xl px-4 flex-row items-center gap-3 ">
            <View className="p-2.5 rounded-xl bg-white/10">
              <Ionicons name="time-outline" size={24} color="rgba(255,255,255,0.9)" />
            </View>
            <View className="flex-1">
              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-white text-lg font-bold">Tower</Text>
                  <Feather name="arrow-right" size={14} color="rgba(255,255,255,0.6)" />
                  <Text className="text-white text-lg font-bold">Clifton</Text>
                </View>
                <Text className="text-white/60 font-semibold">6:30 PM</Text>
              </View>
              <Text className="text-white/50 text-sm mt-0.5">Return trip</Text>
            </View>
          </View>
        </View>
 

      </ScrollView>
    </SafeAreaView>
  );
}
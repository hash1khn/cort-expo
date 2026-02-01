import React from 'react';
import { Text, View } from 'react-native';
import { Fontisto, MaterialCommunityIcons } from '@expo/vector-icons';

type ShuttleCardProps = {
  routeName?: string;
  status?: string;
};

type UpcomingRideProps = {
  from: string;
  to: string;
  scheduledOn: string;
};

type DefaultBottomSheetProps = {
  shuttle?: ShuttleCardProps;
  upcomingRide?: UpcomingRideProps | null;
};

export function DefaultBottomSheet({ shuttle, upcomingRide }: DefaultBottomSheetProps) {
  return (
    <View className="px-5 pb-8 bg-white h-full">
      {/* Main Heading */}
      <View className="pb-6 pt-2">
        <Text className="text-3xl font-bold text-slate-900">
          Your Rides
        </Text>
      </View>

      {/* --- Shuttle Section --- */}
      <Text className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-widest">
        Shuttle
      </Text>
      
      {/* Orange Card */}
      <View className='rounded-3xl p-6 h-48 flex justify-between bg-orange-500 shadow-lg shadow-orange-200'>
            <View>
              <Text className='text-orange-100 font-medium text-sm mb-1'>Shuttle Route</Text>
              
              {/* Flex Row used here for perfect vertical alignment of text and arrow */}
              <View className="flex-row items-center gap-3">
                <Text className='text-3xl text-white font-bold'>Clifton</Text>
                <Fontisto name="arrow-swap" size={20} color="rgba(255,255,255,0.8)" style={{ marginTop: 4 }} /> 
                <Text className='text-3xl text-white font-bold'>Tower</Text>
              </View>
            </View>

            <View>
              <Text className='text-lg text-white font-medium opacity-90'>8:30am - 6:15 am </Text>
            </View>
      </View>


      {/* --- Upcoming Rides Section --- */}
      <Text className="text-xs font-bold text-gray-400 mt-8 mb-3 uppercase tracking-widest">
        Upcoming rides
      </Text>

      {upcomingRide ? (
        <View className="bg-slate-50 rounded-3xl p-5 border border-slate-100">
          
          {/* Timeline Row: From */}
          <View className="flex-row">
            {/* Visual Timeline Column */}
            <View className="items-center mr-4 w-6 pt-1">
               <View className="w-3 h-3 rounded-full border-[3px] border-slate-300 bg-white" />
               {/* Vertical Line */}
               <View className="w-[2px] flex-1 bg-slate-200 my-1 rounded-full" />
            </View>
            
            <View className="pb-6 flex-1">
              <Text className="text-xs text-slate-400 font-medium mb-1">From</Text>
              <Text className="text-base font-bold text-slate-800 leading-5" numberOfLines={2}>
                {upcomingRide.from}
              </Text>
            </View>
          </View>

          {/* Timeline Row: To */}
          <View className="flex-row">
             <View className="items-center mr-4 w-6 pb-1">
               <MaterialCommunityIcons name="map-marker" size={24} color="#f97316" />
            </View>
            
            <View className="flex-1">
              <Text className="text-xs text-slate-400 font-medium mb-1">To</Text>
              <Text className="text-base font-bold text-slate-800 leading-5" numberOfLines={2}>
                {upcomingRide.to}
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View className="h-[1px] bg-slate-200 w-full my-4" />

          {/* Schedule Footer */}
          <View className="flex-row items-center">
            <MaterialCommunityIcons name="calendar-clock" size={18} color="#94a3b8" />
            <Text className="ml-2 text-sm font-medium text-slate-500">
              Scheduled: <Text className="text-slate-800 font-bold">{upcomingRide.scheduledOn}</Text>
            </Text>
          </View>
        </View>
      ) : (
        <View className="bg-slate-50 rounded-2xl p-6 border border-slate-100 items-center justify-center">
          <Text className="text-sm font-medium text-slate-400">
            No upcoming rides
          </Text>
        </View>
      )}
    </View>
  );
}
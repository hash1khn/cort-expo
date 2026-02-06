import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Entypo, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export type RideStatus = 'completed' | 'cancelled' | 'missed';
export type RideType = 'shuttle' | 'chauffeur';

export interface RideHistoryCardNewProps {
  pickup: string;
  destination: string;
  status: RideStatus;
  timeOfRide: string;
  rideType?: RideType;
  description?: string;
  onPress?: () => void;
}

export function RideHistoryCardNew({
  pickup,
  destination,
  status,
  timeOfRide,
  rideType = 'shuttle',
  description,
  onPress,
}: RideHistoryCardNewProps) {
  const statusColor =
    status === 'completed' ? '#22c55e' : status === 'missed' ? '#f59e0b' : '#ef4444';
  const statusLabel =
    status === 'completed' ? 'Completed' : status === 'missed' ? 'Missed' : 'Cancelled';

  return (
    <Pressable
      onPress={onPress}
      className="rounded-2xl bg-transparent px-1 py-4 active:opacity-90"
    >
      {/* Top row: icon + date */}
      <View className="flex-row items-center mb-2">
        <View className="w-8 h-8 rounded-lg bg-purple-600 items-center justify-center mr-2">
          {rideType === 'shuttle' ? (
            <Ionicons name="bus-outline" size={20} color="white" />
          ) : (
            <MaterialCommunityIcons name="car" size={20} color="white" />
          )}
        </View>
        {/* <Text className="text-text-primary/80 mr-2 text-lg">Shuttle</Text> */}
        
        <Text className="text-text-primary/50 text-base font-bold">Nov 01,2024</Text>
        <View className="bg-green-500/20 ml-2 px-2 py-1 rounded-full">
      <Text className="text-green-400 text-xs font-medium">Finished</Text>
    </View>
      </View>

      {/* Title: pickup → destination */}
      <Text
        className="text-white text-xl/10 font-bold mb-2"
        numberOfLines={1}
      >
        A127, Block 4A
      </Text>
{/* 
      Description (optional)
      {description ? (
        <Text
          className="text-gray-400 text-sm mb-3"
          numberOfLines={2}
        >
          {description}
        </Text>
      ) : null} */}

      {/* Bottom: status badge + View Details button */}
      <View className="flex-row items-center  gap-3 mt-1">
        <View
          className="flex-row items-center justify-center w-24 py-2 px-3 h-9 bg-[#1d1c21]  rounded-3xl shadow-white shadow-3xl"
          
        >
          <MaterialCommunityIcons name="timer-sand-full" size={18} color="white" />
          
          <Text className="ml-2 text-lg/5 text-text-muted font-medium inset-shadow-sm">
            38m
          </Text>
        </View>
        <Pressable
          onPress={onPress}
        className="flex-row items-center justify-center w-36 py-2 px-2 h-9 bg-[#1d1c21]  rounded-3xl"
        ><Text>
          
          <Entypo name="dots-three-horizontal" size={16} color="white" />  </Text>
          <Text className="text-white  text-lg/0 font-medium ">View Details</Text>
          
      </Pressable>
      </View>
    </Pressable>
  );
}

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type RideStatus = 'completed' | 'cancelled' | 'missed';

export interface RideHistoryCardProps {
  rideId: string;
  driverName: string;
  pickup: string;
  destination: string;
  status: RideStatus;
  dateTime: string;
  onPress?: () => void;
}

export function RideHistoryCard({
  rideId,
  driverName,
  pickup,
  destination,
  status,
  dateTime,
  onPress,
}: RideHistoryCardProps) {
  const initials = driverName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const statusColor =
    status === 'completed' ? '#22c55e' : status === 'missed' ? '#f59e0b' : '#ef4444';
  const statusLabel =
    status === 'completed' ? 'Completed' : status === 'missed' ? 'Missed' : 'Cancelled';

  return (
    <Pressable
      onPress={onPress}
      className="rounded-[1.25rem] overflow-hidden bg-[#252525] p-4 active:opacity-90"
    >
      {/* Top section: avatar, name, ride ID | status, arrow */}
      <View className="flex-row justify-between items-start mb-5">
        <View className="flex-row items-center flex-1 min-w-0">
          <View className="w-12 h-12 rounded-full bg-[#1a1a1a] items-center justify-center mr-3">
            <Text className="text-white text-base font-bold">{initials}</Text>
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-white text-lg font-bold">{driverName}</Text>
            <Text className="text-gray-400 text-sm mt-0.5">{rideId}</Text>
          </View>
        </View>
        <View className="flex-row items-center gap-1">
          <Text style={{ color: statusColor }} className="text-sm font-medium">
            {statusLabel}
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
        </View>
      </View>

      {/* Bottom section: pick-up, dashed line, destination */}
      <View className="flex-row items-center gap-4">
        <View className="flex-1">
          <Text className="text-gray-500 text-[10px] font-medium uppercase tracking-wider">
            Pick-up
          </Text>
          <Text className="text-white text-base font-bold mt-1">{pickup}</Text>
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
          <Text className="text-white text-base font-bold mt-1">{destination}</Text>
        </View>
      </View>
      <Text className="text-gray-400 text-xs mt-0.5">{dateTime}</Text>

    </Pressable>
  );
}

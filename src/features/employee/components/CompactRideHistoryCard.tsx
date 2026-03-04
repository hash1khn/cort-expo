import React from 'react';
import { View, Text, Pressable } from 'react-native';

export interface CompactRideHistoryCardProps {
    destination: string;
    date: string;
    rideType: string;
    timeOfDropoff: string;
    onPress?: () => void;
}

export function CompactRideHistoryCard({
    destination,
    date,
    rideType,
    timeOfDropoff,
    onPress,
}: CompactRideHistoryCardProps) {
    return (
        <Pressable
            onPress={onPress}
//   className="rounded-[1.25rem] bg-gray-100 py-5 px-5 mb-1 flex-row justify-between items-center active:opacity-90"
            className="rounded-[1.25rem] bg-transparent border border-gray-400 py-5 px-5 mb-1 flex-row justify-between items-center active:opacity-90"
        >
            <View className="flex-1 pr-4">
                <Text className="text-black text-lg font-bold mb-1" numberOfLines={1}>
                    {destination}
                </Text>
                <Text className="text-gray-500 text-sm font-medium">
                    {date} • {rideType}
                </Text>
            </View>
            <View>
                <Text className="text-black text-base font-bold">{timeOfDropoff}</Text>
            </View>
        </Pressable>
    );
}

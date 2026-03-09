import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';

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
    const isShuttle = rideType?.toLowerCase() === 'shuttle';
    const iconSource = isShuttle
        ? require('@/../assets/cort_bus.png')
        : require('@/../assets/cort_car.png');

    return (
        <Pressable
            onPress={onPress}
            className="rounded-[1.25rem] bg-[#eaeaea] py-3.5 px-5 mb-1 flex-row items-center active:opacity-90"
        >
            <View className="items-center justify-center mr-4 mt-2">
                <Image
                    source={iconSource}
                    style={{ width: 40, height: 40 }}
                    resizeMode="contain"
                />
            </View>
            <View className="flex-1 pr-4">
                <Text className="text-black text-lg font-bold mb-0.5" numberOfLines={1}>
                    {destination}
                </Text>
                <Text className="text-gray-500 text-[13px] font-medium">
                    {date} • {rideType}
                </Text>
            </View>
            <View>
                <Text className="text-black text-base font-bold">{timeOfDropoff}</Text>
            </View>
        </Pressable>
    );
}

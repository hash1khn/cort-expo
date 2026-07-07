import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { useLanguage } from '@/i18n/useLanguage';

export interface CompactRideHistoryCardProps {
    destination: string;
    date: string;
    rideType: string;
    vehicleType?: 'shuttle' | 'chauffeur'; // raw key for icon selection
    timeOfDropoff: string;
    onPress?: () => void;
}

export function CompactRideHistoryCard({
    destination,
    date,
    rideType,
    vehicleType,
    timeOfDropoff,
    onPress,
}: CompactRideHistoryCardProps) {
    const { isRTL } = useLanguage();
    const isShuttle = vehicleType
        ? vehicleType === 'shuttle'
        : rideType?.toLowerCase() === 'shuttle';
    const iconSource = isShuttle
        ? require('@/../assets/cort_bus.png')
        : require('@/../assets/cort_car.png');

    return (
        <Pressable
            onPress={onPress}
            className={`rounded-[1.25rem] bg-[#eaeaea] px-5 mb-1 items-center active:opacity-90 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}
            style={{ minHeight: 84, paddingVertical: 14 }}
        >
            <View className={`items-center justify-center ${isRTL ? 'ml-4' : 'mr-4'}`}>
                <Image
                    source={iconSource}
                    style={{ width: 40, height: 40 }}
                    resizeMode="contain"
                />
            </View>
            <View className={`flex-1 ${isRTL ? 'pl-4' : 'pr-4'}`} style={{ minWidth: 0 }}>
                <Text
                    className={`text-black text-lg font-bold mb-0.5 ${isRTL ? 'text-right' : ''}`}
                    numberOfLines={1}
                >
                    {destination}
                </Text>
                <Text
                    className={`text-gray-500 text-[13px] font-medium ${isRTL ? 'text-right' : ''}`}
                    numberOfLines={1}
                >
                    {date} • {rideType}
                </Text>
            </View>
            <View style={{ minWidth: 72, alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                <Text className="text-black text-base font-bold">{timeOfDropoff}</Text>
            </View>
        </Pressable>
    );
}

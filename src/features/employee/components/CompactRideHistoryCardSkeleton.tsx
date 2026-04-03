import React from 'react';
import { View } from 'react-native';

const shimmerColor = '#e0e0e0';
const shimmerHighlight = '#f0f0f0';

export function CompactRideHistoryCardSkeleton() {
  return (
    <View className="rounded-[1.25rem] bg-[#eaeaea] py-3.5 px-5 mb-1 flex-row items-center">
      {/* Icon placeholder */}
      <View
        className="items-center justify-center mr-4 mt-2"
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          backgroundColor: shimmerColor,
        }}
      />
      {/* Content placeholder */}
      <View className="flex-1 pr-4 gap-2">
        {/* Destination line */}
        <View
          style={{
            height: 16,
            borderRadius: 4,
            backgroundColor: shimmerColor,
            width: '70%',
          }}
        />
        {/* Date + type line */}
        <View
          style={{
            height: 12,
            borderRadius: 4,
            backgroundColor: shimmerColor,
            width: '50%',
          }}
        />
      </View>
      {/* Time placeholder */}
      <View
        style={{
          height: 16,
          borderRadius: 4,
          backgroundColor: shimmerColor,
          width: 40,
        }}
      />
    </View>
  );
}

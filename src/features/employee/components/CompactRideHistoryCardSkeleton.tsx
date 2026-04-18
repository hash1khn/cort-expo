import React from 'react';
import { View } from 'react-native';

const shimmerColor = '#e0e0e0';
const shimmerHighlight = '#f0f0f0';

export function CompactRideHistoryCardSkeleton() {
  return (
    <View
      className="rounded-[1.25rem] bg-[#eaeaea] px-5 mb-1 flex-row items-center"
      style={{ minHeight: 84, paddingVertical: 14 }}
    >
      {/* Icon placeholder */}
      <View
        className="items-center justify-center mr-4"
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
          width: 72,
        }}
      />
    </View>
  );
}

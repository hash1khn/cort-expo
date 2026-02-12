import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SharedValue } from 'react-native-reanimated';

export type RideStatus = 'idle' | 'started' | 'arrived';

type RideStatusBarProps = {
  /** Controlled mode: pass status from parent. When undefined, uses internal state. */
  status?: RideStatus;
  onStatusChange?: (status: RideStatus) => void;
  /** Enable long-press to cycle through states (for dev/demo) */
  enableDevToggle?: boolean;

};

export function RideStatusBar({
  status: controlledStatus,
  onStatusChange,
  enableDevToggle = true,

}: RideStatusBarProps) {
  const [internalStatus, setInternalStatus] = useState<RideStatus>('idle');
  const status = controlledStatus ?? internalStatus;

  const setStatus = useCallback(
    (next: RideStatus) => {
      if (controlledStatus === undefined) {
        setInternalStatus(next);
      }
      onStatusChange?.(next);
    },
    [controlledStatus, onStatusChange]
  );

  const cycleStatus = useCallback(() => {
    if (!enableDevToggle) return;
    const next: Record<RideStatus, RideStatus> = {
      idle: 'started',
      started: 'arrived',
      arrived: 'idle',
    };
    setStatus(next[status]);
  }, [status, setStatus, enableDevToggle]);

  const gradientColors = ['#7e6aec', '#8b76f6'] as const;
  const gradientStart = { x: 0 as const, y: 0 as const };
  const gradientEnd = { x: 1 as const, y: 0 as const };

  if (status === 'started') {
    return (
      <Pressable onLongPress={cycleStatus}>
        <View
          style={styles.container}
          className='bg-primary'
        >
          <View className="flex-1">
            <View className="flex-row items-center mb-2">
              <View className="w-12 h-12 rounded-full bg-white/20 items-center justify-center mr-3">
                <Ionicons name="bus-outline" size={24} color="#fff" />
              </View>
              <View>
                <Text className="text-white text-xl font-bold">Ride is on the way</Text>
                <Text className="text-text-primary text-sm">Clifton ↔ Tower</Text>
              </View>
            </View>
            <Text className="text-white/90 text-sm mb-1">ETA:</Text>
            <Text className="text-white text-3xl font-bold mb-4">5 mins</Text>
            <View>
              <View className="h-1.5 bg-white/40 rounded-full overflow-hidden mb-1">
                <View
                  className="h-full bg-white rounded-full"
                  style={{ width: '75%' }}
                />
              </View>
              <View className="flex-row justify-between">
                <Text className="text-white/80 text-xs">Dispatched</Text>
                <Text className="text-white/80 text-xs">Arriving</Text>
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    );
  }

  if (status === 'arrived') {
    return (
      <Pressable onLongPress={cycleStatus}>
        <View
          style={styles.container}
          className='bg-primary'
        >
          <View className="flex-1 justify-between">
            <View className="flex-row items-center mb-2">
              <View className="w-12 h-12 rounded-full bg-white/20 items-center justify-center mr-3">
                <Ionicons name="bus-outline" size={24} color="#fff" />
              </View>
              <View>
                <Text className="text-white text-xl font-bold">Shuttle has arrived</Text>
                <Text className="text-white/80 text-sm">Clifton ↔ Tower</Text>
              </View>
            </View>
            <View className="flex-row items-end justify-between">
              <View>
                <Text className="text-white text-3xl font-bold">Arrived</Text>
                <View className="flex-row items-center mt-1 gap-1.5">
                  <View className="w-2 h-2 rounded-full bg-[#22c55e]" />
                  <Text className="text-white/90 text-sm">Ready for departure</Text>
                </View>
              </View>
              <View className="w-14 h-14 rounded-full bg-white items-center justify-center">
                <Ionicons name="checkmark" size={32} color="#7e6aec" />
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    );
  }

  // idle
  return (
    <Pressable onLongPress={cycleStatus}>
      <View
          style={styles.container}
          className='bg-primary '
        >
        <View className="flex-1 gap-1 justify-center">
          <View className="flex-row items-center">
            <Text className="text-white text-4xl font-bold">Clifton</Text>
            <Ionicons
              name="swap-horizontal"
              size={20}
              color="#fff"
              style={{ marginHorizontal: 4 }}
            />
            <Text className="text-white text-4xl font-bold">Tower</Text>
          </View>
          <Text className="text-white text-base font-semibold mt-1">Driver: Sajjad</Text>
          <View className="flex-row items-center bg-white px-2.5 py-1.5 rounded-xl self-start mt-2.5 gap-1.5">
            <Ionicons name="time-outline" size={14} color="#9c5af2" />
            <Text className="text-primary text-base font-bold">Next Shuttle: 08:30 AM</Text>
          </View>
        </View>
        <View className="w-20 h-20 rounded-full bg-white/20 items-center justify-center">
          <Ionicons name="bus-outline" size={42} color="#fff" />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight:170
  },
});

import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SharedValue } from 'react-native-reanimated';
import { router } from 'expo-router';

export type RideStatus = 'idle' | 'started' | 'arrived';

/** Upcoming/latest shuttle trip info for the status bar (from API). */
export type UpcomingShuttleInfo = {
  routeName: string;
  driverName: string;
  nextShuttleTime: string;
};

type RideStatusBarProps = {
  /** Controlled mode: pass status from parent. When undefined, uses internal state. */
  status?: RideStatus;
  onStatusChange?: (status: RideStatus) => void;
  /** Enable long-press to cycle through states (for dev/demo) */
  enableDevToggle?: boolean;
  /** Latest/upcoming shuttle trip for this employee's route. When provided, replaces hardcoded labels. */
  upcomingShuttle?: UpcomingShuttleInfo | null;
  /** When true, show skeleton loaders instead of content (e.g. while shuttle data is fetching). */
  isLoading?: boolean;
};

const DEFAULT_ROUTE_LABEL = 'Nazimabad ↔ Tower';
const DEFAULT_DRIVER = 'Sajjad';
const DEFAULT_NEXT_TIME = '08:30 AM';

const SKELETON_BG = 'rgba(255,255,255,0.35)';

export function RideStatusBar({
  status: controlledStatus,
  onStatusChange,
  enableDevToggle = true,
  upcomingShuttle,
  isLoading = false,
}: RideStatusBarProps) {
  const [internalStatus, setInternalStatus] = useState<RideStatus>('idle');
  const status = controlledStatus ?? internalStatus;

  const routeLabel = upcomingShuttle?.routeName ?? DEFAULT_ROUTE_LABEL;
  const driverName = upcomingShuttle?.driverName ?? DEFAULT_DRIVER;
  const nextShuttleTime = upcomingShuttle?.nextShuttleTime ?? DEFAULT_NEXT_TIME;

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

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View className="flex-1 gap-1 justify-center">
          <View style={[styles.skeleton, { width: '70%', height: 36, borderRadius: 8 }]} />
          <View style={[styles.skeleton, { width: 140, height: 18, borderRadius: 6, marginTop: 6 }]} />
          <View
            style={[
              styles.skeleton,
              { width: 180, height: 36, borderRadius: 12, marginTop: 12 },
            ]}
          />
        </View>
      </View>
    );
  }

  if (status === 'started') {
    return (
      <Pressable onLongPress={cycleStatus} >
        <View style={styles.container}>
          <View className="flex-1">
            <View className="flex-row items-center mb-2">
              <View className="w-12 h-12 rounded-full bg-white/20 items-center justify-center mr-3">
                <Ionicons name="bus-outline" size={24} color="#fff" />
              </View>
              <View>
                <Text className="text-white text-xl font-bold">Ride is on the way</Text>
                <Text className="text-text-primary font-medium text-sm">{routeLabel}</Text>
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
                <Text className="text-white/80 text-xs">Left</Text>
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
        <View style={styles.container}>
          <View className="flex-1 justify-between">
            <View className="flex-row items-center mb-2">
              <View className="w-12 h-12 rounded-full bg-white/20 items-center justify-center mr-3">
                <Ionicons name="bus-outline" size={24} color="#fff" />
              </View>
              <View>
                <Text className="text-white text-xl font-bold">Shuttle has arrived</Text>
                <Text className="text-white/80 text-sm">{routeLabel}</Text>
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
    <Pressable onLongPress={cycleStatus} onPress={()=>router.push('/employee/ride-active')}>
      <View style={styles.container}>
        <View className="flex-1 gap-1 justify-center">
          <View className="flex-row items-center flex-wrap">
            <Text className="text-white text-4xl font-bold">{routeLabel}</Text>
          </View>
          <Text className="text-white text-base font-semibold mt-1">Driver: {driverName}</Text>
          <View className="flex-row items-center bg-white px-2.5 py-1.5 rounded-xl self-start mt-2.5 gap-1.5">
            <Ionicons name="time-outline" size={14} color="black" />
            <Text className="text-black text-base font-bold">Next Shuttle: {nextShuttleTime}</Text>
          </View>
        </View>
        {/* <View className="w-20 h-20 rounded-full bg-white/20 items-center justify-center">
          <Ionicons name="bus-outline" size={42} color="#fff" />
        </View> */}
      </View>
    </Pressable>
  );
}

const PURPLE_CARD = '#f47f00';

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 150,
    backgroundColor: PURPLE_CARD,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  skeleton: {
    backgroundColor: SKELETON_BG,
  },
});

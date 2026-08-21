import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text as RNText,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static';
import { router } from 'expo-router';
import { fontFamily } from '@/core/theme';
import { AppHeader } from '../../shared/components/AppHeader';
import { useLanguage } from '@/i18n/useLanguage';
import { useBroadcastRequestsListener } from '@/hooks/useBroadcastRequestsListener';
import {
  useGetBroadcastRequestsQuery,
  type BroadcastRequest,
} from '../services/chauffeur.api';

const Text = (props: React.ComponentProps<typeof RNText>) => (
  <RNText {...props} style={[{ fontFamily }, props.style]} />
);

function RequestCard({ item, onPress }: { item: BroadcastRequest; onPress: () => void }) {
  const { t } = useLanguage();
  const tr = (key: string, options?: Record<string, unknown>) =>
    t(`chauffeur:nearbyRequests.${key}`, options);

  return (
    <Pressable
      onPress={onPress}
      className="rounded-3xl bg-[#EDEDEB] mb-4 overflow-hidden active:opacity-90 px-5 py-4"
    >
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2 flex-1 min-w-0">
          <View className="w-9 h-9 rounded-xl bg-white items-center justify-center">
            <Ionicons name="car-sport" size={18} color="#000000" />
          </View>
          <Text className="text-black font-bold text-[15px] flex-1" numberOfLines={1}>
            {item.company_name ?? 'Cort'}
          </Text>
        </View>
        {item.distance_km != null && (
          <View className="px-3 py-1.5 rounded-xl bg-[#FF5A00]/10">
            <Text className="text-[#FF5A00] text-xs font-bold">
              {tr('away', { distance: item.distance_km.toFixed(1) })}
            </Text>
          </View>
        )}
      </View>

      {item.pickup_address ? (
        <View className="flex-row items-start gap-2 mb-2">
          <Ionicons name="location" size={16} color="#FF5A00" style={{ marginTop: 2 }} />
          <Text className="text-black text-[14px] font-semibold flex-1" numberOfLines={2}>
            {item.pickup_address}
          </Text>
        </View>
      ) : null}

      <View className="flex-row items-center gap-4 mt-1">
        <View className="flex-row items-center gap-1.5">
          <MaterialCommunityIcons
            name={item.trip_type === 'OUT_STATION' ? 'map-marker-distance' : 'city'}
            size={14}
            color="#6B7280"
          />
          <Text className="text-[#6B7280] text-[13px] font-medium">
            {item.trip_type === 'OUT_STATION' ? 'Outstation' : 'In-City'}
          </Text>
        </View>
        {item.city && (
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="pin-outline" size={14} color="#6B7280" />
            <Text className="text-[#6B7280] text-[13px] font-medium">{item.city}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export function NearbyRequestsScreen() {
  const { t } = useLanguage();
  const tr = (key: string, options?: Record<string, unknown>) =>
    t(`chauffeur:nearbyRequests.${key}`, options);

  const { data: requests, isLoading, isError, isFetching, refetch } = useGetBroadcastRequestsQuery(undefined, {
    pollingInterval: 15000,
  });
  useBroadcastRequestsListener();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const openRequest = useCallback((item: BroadcastRequest) => {
    router.push({
      pathname: '/chauffeur/incoming-ride-request',
      params: {
        bookingId: String(item.booking_id),
        address: item.pickup_address ?? undefined,
        passengerName: item.company_name ?? undefined,
        totalDays: undefined,
        tripType: item.trip_type === 'OUT_STATION' ? 'out_station' : 'in_city',
      },
    });
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-[#FFFFFF]" edges={['top']}>
      <AppHeader />
      <View className="px-5 mb-4 mt-2">
        <Text className="text-[28px] font-bold text-black">{tr('title')}</Text>
        <Text className="text-[#6B7280] text-base font-medium">{tr('subtitle')}</Text>
      </View>

      {isLoading && (
        <View className="items-center py-12">
          <ActivityIndicator size="large" color="#FF5A00" />
          <Text className="text-[#6B7280] mt-3 font-medium">{tr('loading')}</Text>
        </View>
      )}

      {isError && !isLoading && (
        <View className="mx-5 rounded-3xl bg-[#FFF1F0] px-5 py-6 items-center">
          <Ionicons name="alert-circle-outline" size={36} color="#EF4444" />
          <Text className="text-[#EF4444] font-semibold mt-2 text-center">{tr('couldNotLoad')}</Text>
          <Pressable
            onPress={refetch}
            className="mt-4 px-6 py-2.5 rounded-xl bg-[#EF4444] active:opacity-80"
          >
            <Text className="text-white font-bold">{tr('retry')}</Text>
          </Pressable>
        </View>
      )}

      {!isLoading && !isError && (
        <FlatList
          data={requests ?? []}
          keyExtractor={(item) => String(item.booking_id)}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing || (isFetching && !isRefreshing)}
              onRefresh={handleRefresh}
              tintColor="#FF5A00"
              colors={['#FF5A00']}
            />
          }
          renderItem={({ item }) => <RequestCard item={item} onPress={() => openRequest(item)} />}
          ListEmptyComponent={
            <View className="rounded-3xl bg-[#EDEDEB] py-10 px-4 items-center mt-2">
              <Ionicons name="navigate-circle-outline" size={48} color="#6B7280" />
              <Text className="text-[#6B7280] text-lg font-medium mt-3 text-center">
                {tr('empty')}
              </Text>
              <Text className="text-[#6B7280]/60 text-sm mt-1 text-center">
                {tr('emptySubtitle')}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

import React, { useMemo } from 'react';
import {
  View,
  Text as RNText,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { fontFamily } from '@/core/theme';
import { useAppSelector } from '../../../store/hooks';
import { useGetEmployeeBookingDetailQuery } from '../services/bookingsApi';
import { useGetShuttleTripsForEmployeeQuery } from '../services/employeeShuttleApi';

const Text = (props: React.ComponentProps<typeof RNText>) => {
  return <RNText {...props} style={[{ fontFamily }, props.style]} />;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between items-center px-4 py-4 border-b border-gray-100">
      <Text className="text-[15px] font-semibold text-gray-500">{label}</Text>
      <Text className="text-[15px] font-semibold text-black flex-1 text-right ml-4" numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function RideDetailsSkeleton() {
  const cardColor = '#eaeaea';
  const skeletonColor = '#d3d3d3';

  return (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, paddingTop: 24 }}
    >
      <View className="rounded-2xl bg-[#eaeaea] overflow-hidden">
        <View className="px-4 py-4 border-b" style={{ borderBottomColor: '#d8d8d8' }}>
          <View className="h-4 w-32 rounded" style={{ backgroundColor: skeletonColor }} />
        </View>
        <View className="px-4 py-4 border-b" style={{ borderBottomColor: '#d8d8d8' }}>
          <View className="h-4 w-full rounded" style={{ backgroundColor: skeletonColor }} />
        </View>
        <View className="px-4 py-4 border-b" style={{ borderBottomColor: '#d8d8d8' }}>
          <View className="h-4 w-3/4 rounded" style={{ backgroundColor: skeletonColor }} />
        </View>
        <View className="px-4 py-4">
          <View className="h-4 w-1/2 rounded" style={{ backgroundColor: skeletonColor }} />
        </View>
      </View>

      <View className="rounded-2xl overflow-hidden mt-4" style={{ backgroundColor: cardColor }}>
        <View className="px-4 py-4 border-b" style={{ borderBottomColor: '#d8d8d8' }}>
          <View className="h-4 w-36 rounded" style={{ backgroundColor: skeletonColor }} />
        </View>
        <View className="px-4 py-4 border-b" style={{ borderBottomColor: '#d8d8d8' }}>
          <View className="h-4 w-2/3 rounded" style={{ backgroundColor: skeletonColor }} />
        </View>
        <View className="px-4 py-4 border-b" style={{ borderBottomColor: '#d8d8d8' }}>
          <View className="h-4 w-3/4 rounded" style={{ backgroundColor: skeletonColor }} />
        </View>
        <View className="px-4 py-4">
          <View className="h-4 w-1/3 rounded" style={{ backgroundColor: skeletonColor }} />
        </View>
      </View>
    </ScrollView>
  );
}

const RideDetails = () => {
  const { rideId, rideType, from, rideDate } = useLocalSearchParams<{
    rideId?: string;
    rideType?: string;
    from?: string;
    rideDate?: string;
  }>();
  const parsedId = rideId ? Number(rideId) : 0;
  const isChauffeur = rideType !== 'shuttle';

  const handleBack = () => {
    if (from === 'history') {
      router.push('/employee/rides');
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
  
  };

  const user = useAppSelector((state) => state.auth.user);
  const companyId = (user?.company_id ?? 0) as number;
  const employeeId = (user?.id ?? '') as string;

  // ── Chauffeur booking detail ──────────────────────────────────────────────
  const {
    data: bookingDetail,
    isLoading: isBookingLoading,
  } = useGetEmployeeBookingDetailQuery(
    { companyId, bookingId: parsedId },
    { skip: !isChauffeur || !parsedId || !companyId },
  );

  // ── Shuttle trip detail (from cache) ─────────────────────────────────────
  const { data: shuttleTrips = [], isLoading: isShuttleLoading } =
    useGetShuttleTripsForEmployeeQuery(
      { companyId, employeeId },
      { skip: isChauffeur || !parsedId || !companyId || !employeeId },
    );
  const shuttleTrip = useMemo(
    () => shuttleTrips.find((t) => t.id === parsedId) ?? null,
    [shuttleTrips, parsedId],
  );

  const isLoading = isChauffeur ? isBookingLoading : isShuttleLoading;

  // ── Derived display values ─────────────────────────────────────────────────
  const headerDate = useMemo(() => {
    if (isChauffeur && bookingDetail?.scheduled_for) {
      return new Date(bookingDetail.scheduled_for).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
    if (!isChauffeur && shuttleTrip?.trip_date) {
      return new Date(shuttleTrip.trip_date).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
    if (rideDate) {
      return rideDate;
    }
    return 'Ride Details';
  }, [isChauffeur, bookingDetail, shuttleTrip, rideDate]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <View className="flex-row items-center justify-center px-4 py-3 relative">
          <Pressable
            onPress={handleBack}
            className="rounded-full flex-row items-center justify-center absolute left-4"
          >
            <Ionicons name="chevron-back" size={26} color="black" />
            <Text className="text-black text-lg font-medium">Back</Text>
          </Pressable>
          <Text className="text-black text-xl font-bold text-center">{headerDate}</Text>
        </View>
        <RideDetailsSkeleton />
      </SafeAreaView>
    );
  }

  // ── Chauffeur view ────────────────────────────────────────────────────────
  if (isChauffeur) {
    const driver = bookingDetail?.users_chauffeur_bookings_driver_idTousers;
    const vehicle = bookingDetail?.vehicles;
    const pickup = bookingDetail?.pickup_address ?? '—';
    const destinations = bookingDetail?.destination_cities?.join(', ') ?? '—';
    const tripType = bookingDetail?.trip_type === 'OUT_STATION' ? 'Outstation' : 'In-city';
    const scheduledFor = bookingDetail?.scheduled_for
      ? new Date(bookingDetail.scheduled_for).toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      : '—';

    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-row items-center justify-center px-4 py-3 relative">
          <Pressable
            onPress={handleBack}
            className="rounded-full flex-row items-center justify-center absolute left-4"
          >
            <Ionicons name="chevron-back" size={26} color="black" />
            <Text className="text-black text-lg font-medium">Back</Text>
          </Pressable>
          <Text className="text-black text-xl font-bold text-center">{headerDate}</Text>
        </View>

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          {/* Trip info */}
          <View className="overflow-hidden rounded-2xl mx-4 mt-6 border border-gray-200 bg-white">
            <View className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <Text className="text-[14px] font-semibold text-gray-600">Trip information</Text>
            </View>
            <DetailRow label="Type" value={tripType} />
            <DetailRow label="Pickup" value={pickup} />
            {destinations !== '—' && <DetailRow label="Destination" value={destinations} />}
            <DetailRow label="Scheduled" value={scheduledFor} />
            <View className="flex-row justify-between items-center px-4 py-4">
              <Text className="text-[15px] font-semibold text-gray-500">Status</Text>
              <View
                className="rounded-full px-3 py-1"
                style={{ backgroundColor: bookingDetail?.status === 'COMPLETED' ? '#dcfce7' : '#fef9c3' }}
              >
                <Text
                  className="text-sm font-semibold"
                  style={{ color: bookingDetail?.status === 'COMPLETED' ? '#16a34a' : '#a16207' }}
                >
                  {bookingDetail?.status ?? '—'}
                </Text>
              </View>
            </View>
          </View>

          {/* Driver info */}
          <View className="overflow-hidden rounded-2xl mx-4 mt-4 border border-gray-200 bg-white">
            <View className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <Text className="text-[14px] font-semibold text-gray-600">Driver information</Text>
            </View>
            <DetailRow label="Name" value={driver?.full_name ?? '—'} />
            <DetailRow
              label="Vehicle"
              value={
                vehicle
                  ? `${vehicle.color ? vehicle.color + ' ' : ''}${vehicle.make ?? ''} ${vehicle.model ?? ''}`.trim()
                  : '—'
              }
            />
            <View className="flex-row justify-between items-center px-4 py-4">
              <Text className="text-[15px] font-semibold text-gray-500">Number Plate</Text>
              <Text className="text-[15px] font-semibold text-black">{vehicle?.plate_number ?? '—'}</Text>
            </View>
          </View>

        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Shuttle view ──────────────────────────────────────────────────────────
  const driver = shuttleTrip?.users;
  const vehicle = shuttleTrip?.routes?.vehicles;
  const routeName = shuttleTrip?.routes?.name ?? '—';
  const direction = shuttleTrip?.direction
    ? shuttleTrip.direction.charAt(0) + shuttleTrip.direction.slice(1).toLowerCase()
    : '—';

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-center px-4 py-3 relative">
        <Pressable
          onPress={handleBack}
          className="rounded-full flex-row items-center justify-center absolute left-4"
        >
          <Ionicons name="chevron-back" size={26} color="black" />
          <Text className="text-black text-lg font-medium">Back</Text>
        </Pressable>
        <Text className="text-black text-xl font-bold text-center">{headerDate}</Text>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Trip info */}
        <View className="overflow-hidden rounded-2xl mx-4 mt-6 border border-gray-200 bg-white">
          <View className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <Text className="text-[14px] font-semibold text-gray-600">Trip information</Text>
          </View>
          <DetailRow label="Route" value={routeName} />
          <DetailRow label="Direction" value={direction} />
          <View className="flex-row justify-between items-center px-4 py-4">
            <Text className="text-[15px] font-semibold text-gray-500">Status</Text>
            <View className="rounded-full px-3 py-1 bg-[#dcfce7]">
              <Text className="text-sm font-semibold text-[#16a34a]">Completed</Text>
            </View>
          </View>
        </View>

        {/* Driver info */}
        <View className="overflow-hidden rounded-2xl mx-4 mt-4 border border-gray-200 bg-white">
          <View className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <Text className="text-[14px] font-semibold text-gray-600">Driver information</Text>
          </View>
          <DetailRow label="Name" value={driver?.full_name ?? '—'} />
          {vehicle && (
            <>
              <DetailRow label="Vehicle" value={`${vehicle.make ?? ''} ${vehicle.model ?? ''}`.trim() || '—'} />
              <View className="flex-row justify-between items-center px-4 py-4">
                <Text className="text-[15px] font-semibold text-gray-500">Number Plate</Text>
                <Text className="text-[15px] font-semibold text-black">{vehicle.plate_number}</Text>
              </View>
            </>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

export default RideDetails;
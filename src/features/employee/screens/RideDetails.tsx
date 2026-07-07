import React, { useMemo } from 'react';
import {
  View,
  Text as RNText,
  ScrollView,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { fontFamily } from '@/core/theme';
import { BackButton } from '@/components/BackButton';
import { useLanguage } from '@/i18n/useLanguage';
import {
  buildRtlBadgeContainerStyle,
  buildRtlBadgeTextStyle,
  buildRtlDetailTextStyle,
  isRTLLanguage,
  type Language,
} from '@/i18n/types';
import { useAppSelector } from '../../../store/hooks';
import { useGetEmployeeBookingDetailQuery } from '../services/bookingsApi';
import { useGetShuttleTripsForEmployeeQuery } from '../services/employeeShuttleApi';

const Text = (props: React.ComponentProps<typeof RNText>) => {
  return <RNText {...props} style={[{ fontFamily }, props.style]} />;
};

function DetailRow({ label, value, isRTL, language }: { label: string; value: string; isRTL?: boolean; language?: Language }) {
  const rtlTextMetrics = isRTL && language ? buildRtlDetailTextStyle(language) : undefined;
  return (
    <View
      className={`${isRTL ? 'flex-row-reverse' : 'flex-row'} justify-between items-center px-4 py-4 border-b border-gray-100`}
    >
      <Text className="text-[15px] font-semibold text-gray-500" style={rtlTextMetrics}>{label}</Text>
      <Text
        className={`text-[15px] font-semibold text-black flex-1 ${isRTL ? 'text-left mr-4' : 'text-right ml-4'}`}
        style={rtlTextMetrics}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

function StatusBadge({
  label,
  backgroundColor,
  textColor,
  language,
}: {
  label: string;
  backgroundColor: string;
  textColor: string;
  language: Language;
}) {
  const isRtl = isRTLLanguage(language);

  return (
    <View
      className={isRtl ? 'rounded-full' : 'rounded-full px-3 py-1'}
      style={[{ backgroundColor }, buildRtlBadgeContainerStyle(language)]}
    >
      <Text
        className={isRtl ? undefined : 'text-sm font-semibold'}
        style={[{ color: textColor }, buildRtlBadgeTextStyle(language)]}
      >
        {label}
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
  const { t, isRTL, language } = useLanguage();
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
          <BackButton label={t('common:back')} onPress={handleBack} />
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
    const tripType = bookingDetail?.trip_type === 'OUT_STATION'
      ? t('employee:outstation')
      : t('employee:inCity');
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
          <BackButton label={t('common:back')} onPress={handleBack} />
          <Text className="text-black text-xl font-bold text-center">{headerDate}</Text>
        </View>

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          {/* Trip info */}
          <View className="overflow-hidden rounded-2xl mx-4 mt-6 border border-gray-200 bg-white">
            <View className={`bg-gray-50 px-4 py-3 border-b border-gray-200 ${isRTL ? 'items-end' : ''}`}>
              <Text
                className="text-[14px] font-semibold text-gray-600"
                style={buildRtlDetailTextStyle(language)}
              >
                {t('employee:tripInformation')}
              </Text>
            </View>
            <DetailRow isRTL={isRTL} language={language} label={t('employee:type')} value={tripType} />
            <DetailRow isRTL={isRTL} language={language} label={t('employee:pickup')} value={pickup} />
            {destinations !== '—' && <DetailRow isRTL={isRTL} language={language} label={t('employee:destination')} value={destinations} />}
            <DetailRow isRTL={isRTL} language={language} label={t('employee:scheduled')} value={scheduledFor} />
            <View className={`${isRTL ? 'flex-row-reverse' : 'flex-row'} justify-between items-center px-4 py-4`}>
              <Text className="text-[15px] font-semibold text-gray-500">{t('employee:status')}</Text>
              <StatusBadge
                label={bookingDetail?.status === 'COMPLETED' ? t('employee:completed') : (bookingDetail?.status ?? '—')}
                backgroundColor={bookingDetail?.status === 'COMPLETED' ? '#dcfce7' : '#fef9c3'}
                textColor={bookingDetail?.status === 'COMPLETED' ? '#16a34a' : '#a16207'}
                language={language}
              />
            </View>
          </View>

          {/* Driver info */}
          <View className="overflow-hidden rounded-2xl mx-4 mt-4 border border-gray-200 bg-white">
            <View className={`bg-gray-50 px-4 py-3 border-b border-gray-200 ${isRTL ? 'items-end' : ''}`}>
              <Text
                className="text-[14px] font-semibold text-gray-600"
                style={buildRtlDetailTextStyle(language)}
              >
                {t('employee:driverInformation')}
              </Text>
            </View>
            <View className={`${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center px-4 py-4 border-b border-gray-100`}>
              <View className={`w-12 h-12 rounded-full bg-black items-center justify-center overflow-hidden ${isRTL ? 'ml-3' : 'mr-3'}`}>
                {driver?.profile_picture_url ? (
                  <ExpoImage
                    source={{ uri: driver.profile_picture_url }}
                    style={{ width: 48, height: 48, borderRadius: 24 }}
                    contentFit="cover"
                  />
                ) : (
                  <Text className="text-[#F1F443] text-lg font-bold">
                    {driver?.full_name
                      ? driver.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                      : '—'}
                  </Text>
                )}
              </View>
              <Text className="text-[15px] font-semibold text-black">{driver?.full_name ?? '—'}</Text>
            </View>
            <DetailRow
              isRTL={isRTL}
              language={language}
              label={t('employee:vehicle')}
              value={
                vehicle
                  ? `${vehicle.color ? vehicle.color + ' ' : ''}${vehicle.make ?? ''} ${vehicle.model ?? ''}`.trim()
                  : '—'
              }
            />
            <View className={`${isRTL ? 'flex-row-reverse' : 'flex-row'} justify-between items-center px-4 py-4`}>
              <Text className="text-[15px] font-semibold text-gray-500">{t('employee:numberPlate')}</Text>
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
        <BackButton label={t('common:back')} onPress={handleBack} />
        <Text className="text-black text-xl font-bold text-center">{headerDate}</Text>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Trip info */}
        <View className="overflow-hidden rounded-2xl mx-4 mt-6 border border-gray-200 bg-white">
          <View className={`bg-gray-50 px-4 py-3 border-b border-gray-200 ${isRTL ? 'items-end' : ''}`}>
            <Text className="text-[14px] font-semibold text-gray-600">{t('employee:tripInformation')}</Text>
          </View>
          <DetailRow isRTL={isRTL} language={language} label={t('employee:route')} value={routeName} />
          <DetailRow isRTL={isRTL} language={language} label={t('employee:direction')} value={direction} />
          <View className={`${isRTL ? 'flex-row-reverse' : 'flex-row'} justify-between items-center px-4 py-4`}>
            <Text className="text-[15px] font-semibold text-gray-500">{t('employee:status')}</Text>
            <StatusBadge
              label={t('employee:completed')}
              backgroundColor="#dcfce7"
              textColor="#16a34a"
              language={language}
            />
          </View>
        </View>

        {/* Driver info */}
        <View className="overflow-hidden rounded-2xl mx-4 mt-4 border border-gray-200 bg-white">
          <View className={`bg-gray-50 px-4 py-3 border-b border-gray-200 ${isRTL ? 'items-end' : ''}`}>
            <Text className="text-[14px] font-semibold text-gray-600">{t('employee:driverInformation')}</Text>
          </View>
          <View className={`${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center px-4 py-4 border-b border-gray-100`}>
            <View className={`w-12 h-12 rounded-full bg-black items-center justify-center overflow-hidden ${isRTL ? 'ml-3' : 'mr-3'}`}>
              {driver?.profile_picture_url ? (
                <ExpoImage
                  source={{ uri: driver.profile_picture_url }}
                  style={{ width: 48, height: 48, borderRadius: 24 }}
                  contentFit="cover"
                />
              ) : (
                <Text className="text-[#F1F443] text-lg font-bold">
                  {driver?.full_name
                    ? driver.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                    : '—'}
                </Text>
              )}
            </View>
            <Text className="text-[15px] font-semibold text-black">{driver?.full_name ?? '—'}</Text>
          </View>
          {vehicle && (
            <>
              <DetailRow isRTL={isRTL} language={language} label={t('employee:vehicle')} value={`${vehicle.make ?? ''} ${vehicle.model ?? ''}`.trim() || '—'} />
              <View className={`${isRTL ? 'flex-row-reverse' : 'flex-row'} justify-between items-center px-4 py-4`}>
                <Text className="text-[15px] font-semibold text-gray-500">{t('employee:numberPlate')}</Text>
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
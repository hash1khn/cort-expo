import React, { useMemo } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text as RNText,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from "@react-native-vector-icons/ionicons/static";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static";
import { router, useLocalSearchParams } from 'expo-router';
import { fontFamily } from '@/core/theme';
import { AppHeader } from '../../shared/components/AppHeader';
import { useLanguage } from '@/i18n/useLanguage';

const Text = (props: React.ComponentProps<typeof RNText>) => (
  <RNText {...props} style={[{ fontFamily }, props.style]} />
);

const PRIMARY = '#FF5A00';
const INK = '#000000';
const SHEET_MUTED = '#6B7280';
const DEFAULT_PICKUP = { latitude: 24.947404, longitude: 67.10848 };
const DEFAULT_ADDRESS = 'County Garden, Metroville Society, Karachi';
const DEFAULT_PASSENGER_NAME = 'Mohammad Azam';
const CARD_SIDE_INSET = 16;

function parseNum(value: string | undefined, fallback: number): number {
  if (value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function IncomingRideRequestScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const tr = (key: string, options?: Record<string, unknown>) =>
    t(`chauffeur:incomingRequest.${key}`, options);

  const params = useLocalSearchParams<{
    lat?: string;
    lng?: string;
    passengerName?: string;
    address?: string;
    totalDays?: string;
    tripType?: string;
  }>();

  const pickup = useMemo(
    () => ({
      latitude: parseNum(params.lat, DEFAULT_PICKUP.latitude),
      longitude: parseNum(params.lng, DEFAULT_PICKUP.longitude),
    }),
    [params.lat, params.lng],
  );

  const region = useMemo(
    () => ({
      latitude: pickup.latitude,
      longitude: pickup.longitude,
      latitudeDelta: 0.012,
      longitudeDelta: 0.012,
    }),
    [pickup.latitude, pickup.longitude],
  );

  const passengerName = params.passengerName?.trim() || DEFAULT_PASSENGER_NAME;
  const address = params.address?.trim() || DEFAULT_ADDRESS;
  const totalDays = Math.max(1, Math.round(parseNum(params.totalDays, 2)));
  const tripTypeRaw = (params.tripType?.trim() ?? '').toLowerCase() || 'in_city';
  const tripTypeLabel =
    tripTypeRaw === 'out_station' || tripTypeRaw === 'outstation' ? tr('outStation') : tr('inCity');

  const bottomPad = Math.max(insets.bottom, 14);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.headerSafe} edges={['top']}>
        <AppHeader />
      </SafeAreaView>

      <View style={styles.mapWrap}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          toolbarEnabled={false}
          showsUserLocation
          showsMyLocationButton={false}
        >
          <Marker coordinate={pickup} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.pickupPin}>
              <View style={styles.pickupPinInner} />
            </View>
          </Marker>
        </MapView>
      </View>

      <View
        style={[
          styles.cardWrap,
          { paddingHorizontal: CARD_SIDE_INSET, paddingBottom: bottomPad },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />

          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={styles.sheetTitle}>{tr('rideRequestTitleNamed', { name: passengerName })}</Text>

            <View style={styles.pickupBlock}>
              <View style={styles.pickupDot} />
              <View style={styles.pickupTextCol}>
                <Text style={styles.pickupLabel}>{tr('pickupLocation')}</Text>
                <Text style={styles.pickupAddress}>{address}</Text>

                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <MaterialCommunityIcons name="city-variant-outline" size={18} color={PRIMARY} />
                    <Text style={styles.metaItemText} numberOfLines={1}>
                      {tripTypeLabel}
                    </Text>
                  </View>
                  <View style={styles.metaDivider} />
                  <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={16} color={PRIMARY} />
                    <Text style={styles.metaItemText} numberOfLines={1}>
                      {tr('nDays', { count: totalDays })}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.sheetDivider} />

          {/* ── ACTION BUTTONS ── completely inline styles, no StyleSheet, no className ── */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 4 }}>

            {/* DECLINE */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() =>
                Alert.alert('Declined', 'You declined this request.', [
                  { text: 'OK', onPress: () => router.back() },
                ])
              }
              style={{
                flex: 1,
                marginRight: 6,
                height: 52,
                borderRadius: 14,
                borderWidth: 2,
                borderColor: '#EF4444',
                backgroundColor: '#FEF2F2',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <RNText
                style={{
                  fontSize: 14,
                  fontWeight: '800',
                  color: '#EF4444',
                  textAlign: 'center',
                }}
              >
                {tr('declineRequest')}
              </RNText>
            </TouchableOpacity>

            {/* ACCEPT */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() =>
                Alert.alert('Accepted', 'Ride accepted!', [
                  { text: 'OK', onPress: () => router.back() },
                ])
              }
              style={{
                flex: 1,
                marginLeft: 6,
                height: 52,
                borderRadius: 14,
                backgroundColor: '#16A34A',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <RNText
                style={{
                  fontSize: 14,
                  fontWeight: '800',
                  color: '#FFFFFF',
                  textAlign: 'center',
                }}
              >
                {tr('acceptRequest')}
              </RNText>
            </TouchableOpacity>

          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerSafe: {
    backgroundColor: '#FFFFFF',
    zIndex: 2,
  },
  mapWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  cardWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    maxHeight: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: PRIMARY,
    marginBottom: 14,
  },
  scrollContent: {
    paddingBottom: 4,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: INK,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    marginTop: 6,
    paddingHorizontal: 8,
  },
  pickupBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  pickupDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: PRIMARY,
    marginTop: 4,
    marginRight: 12,
  },
  pickupTextCol: {
    flex: 1,
    minWidth: 0,
  },
  pickupLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: SHEET_MUTED,
    marginBottom: 4,
  },
  pickupAddress: {
    fontSize: 16,
    fontWeight: '700',
    color: INK,
    lineHeight: 22,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#FAFAF9',
    borderRadius: 12,
  },
  metaItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  metaItemText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: INK,
  },
  metaDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  sheetDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
    marginTop: 8,
    marginBottom: 16,
  },
  pickupPin: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  pickupPinInner: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
});
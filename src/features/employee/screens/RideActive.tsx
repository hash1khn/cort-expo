import React, { useCallback, useMemo, useRef } from 'react';
import { Image as RNImage, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { shuttleCoordinates, mockShuttlePolyline } from '@/services/mockData';
import { router } from 'expo-router';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { setIsOutstationDev } from '../store';

const DRIVER_PHONE = '03162211320';

export default function RideActive() {
  const dispatch = useAppDispatch();
  const isWaitingForDriverResponse = useAppSelector(
    (state) => state.employeeRide.isWaitingForDriverResponse,
  );

  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['42%', '85%'], []);

  const handleContactDriver = useCallback(() => {
    const url = `tel:${DRIVER_PHONE}`;
    Linking.openURL(url).catch((err) => console.warn('Could not open dialer:', err));
  }, []);

  const handleScanQR = useCallback(() => {
    router.push('/employee/qr-scanner');
  }, []);

  const handleDevMarkOutstation = useCallback(() => {
    // Dev-only toggle: mark this as an outstation flow.
    dispatch(setIsOutstationDev(true));
  }, [dispatch]);

  const routePoints = useMemo(
    () =>
      mockShuttlePolyline.map((p) => ({
        latitude: p.latitude,
        longitude: p.longitude,
      })),
    []
  );

  return (
    <View style={styles.root}>
      {/* Map View */}
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: shuttleCoordinates.latitude,
          longitude: shuttleCoordinates.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        toolbarEnabled={false}
        showsMyLocationButton={false}
        showsUserLocation
        userInterfaceStyle="dark"
      >
        {/* Route Polyline */}
        <Polyline
          coordinates={routePoints}
          strokeWidth={4}
          strokeColor="#0C225E"
          lineCap="round"
          lineJoin="round"
        />
        
        {/* Shuttle Marker */}
        <Marker coordinate={shuttleCoordinates} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.vehicleMarker}>
            <MaterialCommunityIcons name="bus-side" size={22} color="white" />
          </View>
        </Marker>
      </MapView>

      {/* Floating Action Buttons */}
      <View style={styles.floatingButtons}>
        <Pressable style={styles.floatingBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose={false}
        handleIndicatorStyle={styles.sheetHandle}
        backgroundStyle={styles.sheetBackground}
      >
        <BottomSheetScrollView 
          style={styles.sheetContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header: ETA */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {isWaitingForDriverResponse
                ? 'Waiting for driver to respond...'
                : 'Driver is arriving in ~6 min'}
            </Text>
            <Text style={styles.headerSubtitle}>Black Hiace </Text>
          </View>

          {/* Driver Card */}
          <View style={styles.driverCard}>
            <View style={styles.driverLeft}>
              <View style={styles.avatarContainer}>
                <Image
                  source={require('@/../assets/driver.png')}
                  style={styles.avatar}
                  contentFit="cover"
                />
               
              </View>
              
              <View style={styles.driverDetails}>
                <Text style={styles.driverName}>Faisal Ali</Text>
                <Text style={styles.vehicleInfo}>Black Toyota Hiace</Text>
              </View>
            </View>

            {/* License Plate */}
            <View style={styles.licensePlate}>
              <RNImage
                source={require('@/../assets/ajrak.jpeg')}
                style={styles.platePattern}
                resizeMode="cover"
              />
              <View style={styles.plateContent}>
                <Text style={styles.plateText}>ABR 986</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <Pressable 
              style={styles.actionButton}
              onPress={handleContactDriver}
              android_ripple={{ color: '#f47f0030' }}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#F59E0B15' }]}>
                <Ionicons name="call" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.actionLabel}>Contact driver</Text>
            </Pressable>

            <Pressable 
              style={styles.actionButton}
              onPress={handleScanQR}
              android_ripple={{ color: '#10B98130' }}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#10B98115' }]}>
                <Ionicons name="qr-code-outline" size={24} color="#10B981" />
              </View>
              <Text style={styles.actionLabel}>Scan QR</Text>
            </Pressable>
          </View>

          {/* Pickup Notes */}
          <Pressable style={styles.notesCard}>
            <View style={styles.notesIcon}>
              <MaterialCommunityIcons name="message-text-outline" size={20} color="#6B7280" />
            </View>
            <Text style={styles.notesText}>Any pickup notes for driver?</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </Pressable>

          {/* Dev-only: mark this chauffeur ride as outstation */}
          <Pressable
            style={styles.devButton}
            onPress={handleDevMarkOutstation}
            android_ripple={{ color: '#4B556320' }}
          >
            <Text style={styles.devButtonText}>Dev: Mark as outstation ride</Text>
          </Pressable>

          {/* Trip Details */}
          <View style={styles.tripDetails}>
            <View style={styles.tripHeader}>
              <Text style={styles.tripHeaderText}>Trip details</Text>
            </View>
            
            <View style={styles.tripContent}>
              {/* Pickup */}
              <View style={styles.locationRow}>
                <View style={[styles.locationDot, { backgroundColor: '#F59E0B' }]}>
                  <View style={styles.locationDotInner} />
                </View>
                <View style={styles.locationInfo}>
                  <Text style={styles.locationLabel}>Pickup</Text>
                  <Text style={styles.locationAddress}>Disco Bakery</Text>
                </View>
              </View>

              {/* Connector Line */}
              <View style={styles.connectorLine} />

              {/* Dropoff */}
              <View style={styles.locationRow}>
                <View style={[styles.locationDot, { backgroundColor: '#10B981' }]}>
                  <MaterialCommunityIcons name="map-marker" size={16} color="white" />
                </View>
                <View style={styles.locationInfo}>
                  <Text style={styles.locationLabel}>Dropoff</Text>
                  <Text style={styles.locationAddress}>
                    {isWaitingForDriverResponse
                      ? 'Dropoff submitted, waiting for driver'
                      : 'Clifton'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Bottom Padding */}
          <View style={{ height: 40 }} />
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },

  // Vehicle Marker
  vehicleMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0C225E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },

  // Floating Buttons
  floatingButtons: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
  },
  floatingBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#141414',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1F1F1F',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },

  // Bottom Sheet — dark (match dashboard bottom sheet)
  sheetBackground: {
    backgroundColor: '#141414',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#1F1F1F',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 16,
  },
  sheetHandle: {
    backgroundColor: '#3F3F3F',
    width: 40,
    height: 4,
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: 20,
  },

  // Header
  header: {
    marginTop: 8,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#9CA3AF',
    fontWeight: '500',
  },

  // Driver Card
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  driverLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2D2D2D',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F1F1F',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 2,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  vehicleInfo: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },

  // License Plate
  licensePlate: {
    width: 95,
    height: 44,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    borderWidth: 1.5,
    borderColor: '#3F3F3F',
  },
  platePattern: {
    width: '100%',
    height: 12,
  },
  plateContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFF',
  },
  plateText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 1.5,
  },

  // Action Buttons
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },

  // Notes Card
  notesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  devButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#4B5563',
    alignItems: 'center',
  },
  devButtonText: {
    fontSize: 13,
    color: '#E5E7EB',
    fontWeight: '500',
  },
  notesIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#141414',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notesText: {
    flex: 1,
    fontSize: 15,
    color: '#9CA3AF',
    fontWeight: '500',
  },

  // Trip Details
  tripDetails: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  tripHeader: {
    backgroundColor: '#141414',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tripHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tripContent: {
    padding: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  locationDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  locationInfo: {
    flex: 1,
    paddingTop: 2,
  },
  locationLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  connectorLine: {
    width: 2,
    height: 24,
    backgroundColor: '#3F3F3F',
    marginLeft: 15,
    marginVertical: 4,
  },
});
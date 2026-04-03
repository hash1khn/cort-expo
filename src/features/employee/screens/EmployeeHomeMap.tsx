import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, StyleSheet, Text as RNText, Image } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons, MaterialCommunityIcons, Octicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import Animated, { useSharedValue, useAnimatedStyle, interpolate } from 'react-native-reanimated';
import { router } from 'expo-router';

import { fontFamily } from '@/core/theme';
import { fetchRoutePolyline } from '@/services/googleRoutes';

const Text = (props: React.ComponentProps<typeof RNText>) => {
  return <RNText {...props} style={[{ fontFamily }, props.style]} />;
};

type LatLng = { latitude: number; longitude: number };

function distanceSq(a: LatLng, b: LatLng): number {
  const dLat = a.latitude - b.latitude;
  const dLng = a.longitude - b.longitude;
  return dLat * dLat + dLng * dLng;
}

function findClosestIndex(points: LatLng[], target: LatLng): number {
  if (!points.length) return 0;
  let bestIdx = 0;
  let bestDist = distanceSq(points[0], target);
  for (let i = 1; i < points.length; i += 1) {
    const d = distanceSq(points[i], target);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function calculateHeading(current: LatLng, next: LatLng) {
  const PI = Math.PI;
  const lat1 = (current.latitude * PI) / 180;
  const long1 = (current.longitude * PI) / 180;
  const lat2 = (next.latitude * PI) / 180;
  const long2 = (next.longitude * PI) / 180;

  const dLon = long2 - long1;

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  let brng = Math.atan2(y, x);
  brng = (brng * 180) / PI;
  brng = (brng + 360) % 360;
  return brng;
}

/**
 * Placeholder employee home screen.
 * Visually similar to `RideActive` but uses static data and no sockets.
 * This will act as the temporary employee home while we refine map behaviour.
 */
export default function EmployeeHomeMap() {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['40%', '55%'], []);
  const animatedIndex = useSharedValue(0);

  const origin = useMemo(
    () => ({
      latitude: 24.9291421,
      longitude: 67.0973605,
    }),
    [],
  );

  const destination = useMemo(
    () => ({
      latitude: 24.9428012,
      longitude: 67.09715,
    }),
    [],
  );

  const stops = useMemo<LatLng[]>(
    () => [
      {
        latitude: 24.935432,
        longitude: 67.097292,
      },
      {
        latitude: 24.935,
        longitude: 67.10527,
      },
    ],
    [],
  );

  const [routePoints, setRoutePoints] = useState<LatLng[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const simulationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [stopIndices, setStopIndices] = useState<number[]>([]);
  const [isPausedAtStop, setIsPausedAtStop] = useState(false);

  const driverCoord = useMemo<LatLng | null>(() => {
    if (!routePoints.length) return null;
    const idx = Math.min(currentIndex, routePoints.length - 1);
    return routePoints[idx];
  }, [routePoints, currentIndex]);

  const lastHeadingRef = useRef(0);

  const busHeading = useMemo(() => {
    if (!routePoints.length || currentIndex >= routePoints.length - 1) {
      return lastHeadingRef.current;
    }
    const current = routePoints[currentIndex];
    // Look ahead a few points for a smoother trajectory
    const lookAheadIndex = Math.min(currentIndex + 3, routePoints.length - 1);
    const next = routePoints[lookAheadIndex];

    if (current.latitude === next.latitude && current.longitude === next.longitude) {
      return lastHeadingRef.current;
    }

    const heading = calculateHeading(current, next);

    // Calculate the shortest difference between the new heading and last heading
    let diff = heading - lastHeadingRef.current;
    diff = ((diff + 540) % 360) - 180;

    // Only update heading if the turn is significant
    // This prevents micro-rotations (jitter) on slightly jagged straight lines
    if (Math.abs(diff) > 2) {
      lastHeadingRef.current = heading;
      return heading;
    }

    return lastHeadingRef.current;
  }, [routePoints, currentIndex]);

  useEffect(() => {
    let cancelled = false;

    const loadRoute = async () => {
      try {
        const points = await fetchRoutePolyline(origin, destination);
        if (!cancelled && points.length) {
          setRoutePoints(points);
          setCurrentIndex(0);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[EmployeeHomeMap] Failed to load route', err);
      }
    };

    loadRoute();

    return () => {
      cancelled = true;
    };
  }, [origin, destination]);

  // Precompute which route indices correspond to the configured stops.
  useEffect(() => {
    if (!routePoints.length) {
      setStopIndices([]);
      return;
    }
    const indices = stops.map((stop) => findClosestIndex(routePoints, stop));
    setStopIndices(indices);
  }, [routePoints, stops]);

  // Clean up any running simulation when unmounting.
  useEffect(() => {
    return () => {
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current);
        simulationTimerRef.current = null;
      }
    };
  }, []);

  const completedRoute = useMemo(() => {
    if (!routePoints.length) return [];
    const idx = Math.min(currentIndex, routePoints.length);
    return routePoints.slice(0, idx);
  }, [routePoints, currentIndex]);

  const remainingRoute = useMemo(() => {
    if (!routePoints.length) return [];
    const idx = Math.min(currentIndex, routePoints.length - 1);
    return routePoints.slice(idx);
  }, [routePoints, currentIndex]);

  const startSimulation = () => {
    if (isSimulating || routePoints.length === 0) return;

    setCurrentIndex(0);
    setIsSimulating(true);
    setIsPausedAtStop(false);

    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = Math.min(prev + 1, routePoints.length - 1);

        // Pause simulation at configured stops.
        if (stopIndices.includes(next)) {
          if (simulationTimerRef.current) {
            clearInterval(simulationTimerRef.current);
            simulationTimerRef.current = null;
          }
          setIsSimulating(false);
          setIsPausedAtStop(true);
          bottomSheetRef.current?.snapToIndex(1);
          return next;
        }

        if (next === routePoints.length - 1) {
          if (simulationTimerRef.current) {
            clearInterval(simulationTimerRef.current);
            simulationTimerRef.current = null;
          }
          setIsSimulating(false);
        }

        return next;
      });
    }, 500);

    simulationTimerRef.current = timer;
  };

  const continueSimulation = () => {
    if (isSimulating || routePoints.length === 0) return;

    setIsSimulating(true);
    setIsPausedAtStop(false);
    bottomSheetRef.current?.snapToIndex(0);

    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = Math.min(prev + 1, routePoints.length - 1);

        if (stopIndices.includes(next)) {
          if (simulationTimerRef.current) {
            clearInterval(simulationTimerRef.current);
            simulationTimerRef.current = null;
          }
          setIsSimulating(false);
          setIsPausedAtStop(true);
          bottomSheetRef.current?.snapToIndex(1);
          return next;
        }

        if (next === routePoints.length - 1) {
          if (simulationTimerRef.current) {
            clearInterval(simulationTimerRef.current);
            simulationTimerRef.current = null;
          }
          setIsSimulating(false);
        }

        return next;
      });
    }, 500);

    simulationTimerRef.current = timer;
  };

  const stopSimulation = () => {
    if (simulationTimerRef.current) {
      clearInterval(simulationTimerRef.current);
      simulationTimerRef.current = null;
    }
    setIsSimulating(false);
    setIsPausedAtStop(false);
  };

  const driverName = 'Your captain';
  const driverInitials = 'YC';
  const vehicleDisplay = 'Shuttle Service';
  const vehiclePlate = 'CORT-001';
  const statusText = 'Your shuttle map preview';

  const smallProfileStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(animatedIndex.value, [0, 1], [1, 0], 'clamp'),
      position: 'absolute',
      top: interpolate(animatedIndex.value, [0, 1], [20, 0], 'clamp'),
      left: 0,
      right: 0,
      zIndex: 1,
      pointerEvents: animatedIndex.value < 0.5 ? 'auto' : 'none',
    };
  });

  const bigProfileStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(animatedIndex.value, [0, 1], [0, 1], 'clamp'),
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 2,
      pointerEvents: animatedIndex.value >= 0.5 ? 'auto' : 'none',
    };
  });

  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      height: interpolate(animatedIndex.value, [0, 1], [65, 195], 'clamp'),
    };
  });

  return (
    <View style={styles.root}>
      {/* Map View */}
      <MapView
      provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: origin.latitude,
          longitude: origin.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        toolbarEnabled={false}
        showsMyLocationButton={false}
        showsUserLocation
      >
        {/* Remaining route Polyline */}
        {remainingRoute.length > 1 && (
          <Polyline
            coordinates={remainingRoute}
            strokeWidth={4}
            strokeColor="#4B5563"
            lineCap="round"
            lineJoin="round"
          />
        )}

        {/* Completed route Polyline (hidden as requested) */}

        {/* Intermediate stops */}
        {stops.map((stop, index) => (
          <Marker
            key={`stop-${index}`}
            coordinate={stop}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <ExpoImage
              source={require('../../../../assets/stop.svg')}
              style={{ width: 25, height: 25 }}
              contentFit="contain"
            />
          </Marker>
        ))}
        {/* Destination / End stop */}
        <Marker
          coordinate={destination}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View style={styles.endStopMarker}>
            <MaterialCommunityIcons name="flag-checkered" size={20} color="white" />
          </View>
        </Marker>
        {/* Simple shuttle marker */}
        {driverCoord && (
          <Marker
            coordinate={driverCoord}
            anchor={{ x: 0.5, y: 0.5 }}
            flat={true}
            rotation={busHeading}
            style={{ zIndex: 100 }}
          >
            <View style={{ transform: [{ rotate: `${busHeading}deg` }] }}>
              <Image
                source={require('../../../../assets/car_birdeye.png')}
                style={{ width: 60, height: 60, resizeMode: 'contain' }}
              />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Floating back button (goes to previous, or auth if none) */}
      <View style={styles.floatingButtons}>
        <Pressable
          style={styles.floatingBtn}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(auth)/get-started');
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </Pressable>
      </View>

      {/* Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        animatedIndex={animatedIndex}
        enablePanDownToClose={false}
        handleIndicatorStyle={styles.sheetHandle}
        backgroundStyle={styles.sheetBackground}
      >
        <BottomSheetView style={styles.sheetContent}>
          {/* Status / title */}
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
          <View style={styles.divider} />

          {/* Crossfade profile section (static) */}
          <Animated.View style={animatedContainerStyle}>
            {/* Small / horizontal */}
            <Animated.View style={smallProfileStyle}>
              <View style={styles.driverRow}>
                <View style={styles.captainSection}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarInitials}>{driverInitials}</Text>
                  </View>
                  <View style={styles.captainInfoBox}>
                    <Text style={styles.captainRole}>{vehicleDisplay}</Text>
                    <Text style={styles.captainName}>{driverName}</Text>
                  </View>
                </View>

                <View style={styles.plateContainer}>
                  <Text style={styles.plateText}>{vehiclePlate}</Text>
                </View>
              </View>
            </Animated.View>

            {/* Big / centered */}
            <Animated.View style={bigProfileStyle}>
              <View style={styles.captainCenterSection}>
                <Text style={styles.captainRoleLabel}>WELCOME</Text>

                <View style={styles.avatarCircleBig}>
                  <Text style={styles.avatarInitialsBig}>{driverInitials}</Text>
                </View>

                <Text style={styles.captainNameBig}>{driverName}</Text>

                <View style={styles.vehicleInfoRow}>
                  <Text style={styles.vehicleText}>{vehicleDisplay}</Text>
                  <View style={styles.dotSeparator} />
                  <View style={styles.plateContainerSmall}>
                    <Text style={styles.plateTextSmall}>{vehiclePlate}</Text>
                  </View>
                </View>
              </View>
            </Animated.View>
          </Animated.View>

          <View style={[styles.divider, { marginTop: 30, marginBottom: 4 }]} />

          {/* Simulation control */}
          <Pressable
            style={[
              styles.simulationButton,
              isSimulating && styles.simulationButtonActive,
            ]}
            onPress={
              isSimulating
                ? stopSimulation
                : isPausedAtStop
                  ? continueSimulation
                  : startSimulation
            }
            disabled={routePoints.length === 0}
          >
            <Text style={styles.simulationButtonText}>
              {isSimulating
                ? 'Stop simulation'
                : isPausedAtStop
                  ? 'Continue simulation'
                  : 'Start simulation'}
            </Text>
          </Pressable>

          {/* Action buttons row (placeholder actions) */}
          <View style={styles.threeActionsRow}>
            <Pressable style={styles.iconActionBtn}>
              <Ionicons name="call-outline" size={20} color="#141414" />
              <Text style={styles.iconActionText}>Call support</Text>
            </Pressable>

            <Pressable style={styles.iconActionBtn}>
              <Octicons name="share" size={20} color="black" />
              <Text style={styles.iconActionText}>Share app</Text>
            </Pressable>

            <Pressable
              style={styles.iconActionBtn}
              onPress={() => router.push('/employee/ride-active')}
            >
              <Ionicons name="navigate-outline" size={20} color="#141414" />
              <Text style={styles.iconActionText}>Open live ride</Text>
            </Pressable>
          </View>

          <View style={{ height: 40 }} />
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F1F1E9',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  vehicleMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF5A00',
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
  endStopMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF5A00', // emerald-500
    alignItems: 'center',
    justifyContent: 'center',
   
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
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
    backgroundColor: '#FFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sheetBackground: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  sheetHandle: {
    backgroundColor: '#D1D5DB',
    width: 48,
    height: 5,
    borderRadius: 3,
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  statusContainer: {
    marginTop: 4,
    marginBottom: 16,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 16,
  },
  driverRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  captainSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  captainInfoBox: {
    justifyContent: 'center',
    gap: 2,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FF5A00',
  },
  captainRole: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  captainName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
    letterSpacing: -0.2,
  },
  plateContainer: {
    backgroundColor: '#EAEAEA',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  plateText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000',
  },
  captainCenterSection: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  captainRoleLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  avatarCircleBig: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarInitialsBig: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FF5A00',
  },
  captainNameBig: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000',
    letterSpacing: -0.3,
  },
  vehicleInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  vehicleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  dotSeparator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#9CA3AF',
  },
  plateContainerSmall: {
    backgroundColor: '#EAEAEA',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  plateTextSmall: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000',
  },
  threeActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: 8,
  },
  iconActionBtn: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
  },
  iconActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#141414',
  },
  simulationButton: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FF5A00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  simulationButtonActive: {
    backgroundColor: '#16a34a',
  },
  simulationButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});


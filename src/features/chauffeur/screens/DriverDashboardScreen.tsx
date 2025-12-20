import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

import { colors, radii, typography } from '../../../core/theme';
import { useAuthStore } from '../../../core/stores/useAuthStore';
import { IncomingRequestModal } from '../components/IncomingRequestModal';

const PURPLE_GRADIENT = ['#5B21B6', '#6D28D9', '#7C3AED'] as const;

type Props = {
  driverName?: string;
};

export function DriverDashboardScreen({ driverName = 'Driver' }: Props) {
  const navigation = useNavigation<any>();
  const [isOnline, setIsOnline] = useState(false);
  const earningsToday = 245.75;
  const logout = useAuthStore((s) => s.logout);
  const [incomingVisible, setIncomingVisible] = useState(false);

  // Demo: when going online, simulate a job after a short delay
  useEffect(() => {
    if (!isOnline) return;
    const t = setTimeout(() => setIncomingVisible(true), 1500);
    return () => clearTimeout(t);
  }, [isOnline]);

  // Bottom sheet slide-in
  const slide = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(slide, {
      toValue: 1,
      useNativeDriver: true,
      damping: 16,
      stiffness: 140,
      mass: 0.8,
    }).start();
  }, [slide]);

  const sheetTranslateY = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [240, 0],
  });

  // Toggle knob animation
  const knobAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(knobAnim, {
      toValue: isOnline ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [isOnline, knobAnim]);

  const knobTranslateX = knobAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 40],
  });

  const statusText = useMemo(() => (isOnline ? 'Online' : 'Offline'), [isOnline]);

  return (
    <View style={styles.root}>
      {/* Full-screen map */}
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude: 37.78825,
          longitude: -122.4324,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
      />

      {/* Subtle map overlay to keep UI high-contrast */}
      <View pointerEvents="none" style={styles.mapOverlay} />

      <SafeAreaView style={styles.safe}>
        {/* Top floating pill */}
        <View style={styles.topRow}>
          <View style={styles.pillRow}>
            <View style={styles.pill}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.pillLabel}>Welcome</Text>
                <Text style={styles.pillTitle} numberOfLines={1}>
                  {driverName}
                </Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Earnings</Text>
              </View>
            </View>

            <Pressable
              onPress={() => navigation.navigate('Settings')}
              style={styles.iconBtn}
              accessibilityRole="button"
              accessibilityLabel="Open Settings"
            >
              <Text style={styles.iconBtnText}>⋯</Text>
            </Pressable>
          </View>

          <View style={styles.actionRow}>
            <Pressable onPress={logout} style={styles.logoutBtn} accessibilityRole="button">
              <Text style={styles.logoutText}>Logout</Text>
            </Pressable>
          </View>
        </View>

        {/* Bottom sheet */}
        <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetTranslateY }] }]}>
          <View style={styles.grabber} />

          <Text style={styles.sheetTitle}>Today</Text>
          <Text style={styles.earningsValue}>${earningsToday.toFixed(2)}</Text>
          <Text style={styles.earningsHint}>Total earnings</Text>

          {/* Big "Go Online" toggle */}
          <View style={{ height: 18 }} />
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Go Online</Text>
              <Text style={styles.toggleSub}>{statusText} — tap to switch</Text>
            </View>

            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: isOnline }}
              onPress={() => setIsOnline((v) => !v)}
              style={styles.toggleOuter}
            >
              {/* Track */}
              {isOnline ? (
                <LinearGradient colors={[...PURPLE_GRADIENT]} start={[0, 0]} end={[1, 1]} style={styles.toggleTrack} />
              ) : (
                <View style={[styles.toggleTrack, { backgroundColor: colors.grey }]} />
              )}

              {/* Knob */}
              <Animated.View style={[styles.knob, { transform: [{ translateX: knobTranslateX }] }]}>
                <View style={styles.knobInner} />
              </Animated.View>
            </Pressable>
          </View>
        </Animated.View>
      </SafeAreaView>

      <IncomingRequestModal
        visible={incomingVisible}
        onDecline={() => setIncomingVisible(false)}
        onAccept={() => setIncomingVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
  },
  safe: {
    flex: 1,
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  topRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 10,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionRow: {
    alignItems: 'flex-end',
  },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  logoutText: {
    fontFamily: typography.family.semibold,
    fontSize: 12,
    color: colors.white,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(12, 34, 94, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: {
    fontFamily: typography.family.semibold,
    fontSize: 18,
    color: colors.white,
    marginTop: -2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.navy,
    borderRadius: radii.pill,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flex: 1,
    // Android
    elevation: 6,
    // iOS
    shadowColor: colors.shadowNavy,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
  },
  pillLabel: {
    fontFamily: typography.family.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.78)',
  },
  pillTitle: {
    marginTop: 2,
    fontFamily: typography.family.semibold,
    fontSize: 16,
    color: colors.white,
  },
  badge: {
    backgroundColor: colors.orange,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  badgeText: {
    fontFamily: typography.family.semibold,
    fontSize: 12,
    color: colors.white,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    // Android
    elevation: 10,
    // iOS
    shadowColor: colors.shadowNavy,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.bgGrey,
    marginBottom: 10,
  },
  sheetTitle: {
    fontFamily: typography.family.medium,
    fontSize: 12,
    color: colors.muted,
  },
  earningsValue: {
    marginTop: 6,
    fontFamily: typography.family.semibold,
    fontSize: 34,
    color: colors.text,
    letterSpacing: -0.4,
  },
  earningsHint: {
    marginTop: 4,
    fontFamily: typography.family.regular,
    fontSize: 12,
    color: colors.muted,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  toggleTitle: {
    fontFamily: typography.family.semibold,
    fontSize: 14,
    color: colors.text,
  },
  toggleSub: {
    marginTop: 4,
    fontFamily: typography.family.regular,
    fontSize: 12,
    color: colors.muted,
  },
  toggleOuter: {
    width: 92,
    height: 44,
    borderRadius: radii.pill,
    justifyContent: 'center',
  },
  toggleTrack: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radii.pill,
  },
  knob: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    marginLeft: 2,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    // Android
    elevation: 6,
    // iOS
    shadowColor: 'rgba(0,0,0,0.25)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
  },
  knobInner: {
    width: 10,
    height: 10,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(12, 34, 94, 0.18)',
  },
});



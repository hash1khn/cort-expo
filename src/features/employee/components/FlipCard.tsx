import React, { useState, useRef, useCallback } from "react";
import { LinearGradient } from "expo-linear-gradient";
import {
    StyleSheet, View, Text, Modal, Pressable,
    TextInput, ActivityIndicator, ScrollView, Platform,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { fontFamily } from '@/core/theme';
import { EmployeeActiveChauffeurBooking, useRequestNextDayPickupMutation } from "../services/bookingsApi";
import { ShuttleTripForEmployee } from "../services/employeeShuttleApi";
import * as Linking from 'expo-linking';
import { useToast } from '@/shared/ui/molecules/Toast';
import { CustomToast } from '@/features/shared/components/CustomToast';
import { useLanguage } from '@/i18n/useLanguage';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    interpolate,
    Extrapolation,
    runOnJS,
    withTiming,
    withRepeat
} from "react-native-reanimated";
import { useWindowDimensions } from "react-native";
import * as Haptics from "expo-haptics";
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';

// Static image references at module level so the source prop reference is stable across renders.
// Inline require() inside a component creates a new object on every render, causing expo-image to
// treat it as a changed source and re-load the image (visible as a flicker during flip animation).
const CITY_BUS_IMAGE = require('../../../../assets/city_bus_bro_2.png');
const CHAUFFEUR_CAR_IMAGE = require('../../../../assets/chauffeur-car.png');

// Formats "HH:MM:SS" or "HH:MM" strings to "H:MM AM/PM"
function formatEta(eta: string | null): string {
    if (!eta) return '—';
    const match = eta.match(/^(\d{1,2}):(\d{2})/);
    if (!match) return eta;
    const h = parseInt(match[1], 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${match[2]} ${ampm}`;
}

interface FrontContentProps {
    booking: EmployeeActiveChauffeurBooking | null;
    shuttleTrip?: ShuttleTripForEmployee | null;
    isLoading?: boolean;
    isChauffeurEnabled?: boolean;
    isShuttleEnabled?: boolean;
}

const SkeletonItem = ({ style, color = 'rgba(255,255,255,0.4)' }: { style: any, color?: string }) => {
    const opacity = useSharedValue(0.3);

    React.useEffect(() => {
        opacity.value = withRepeat(
            withTiming(0.7, { duration: 800 }),
            -1,
            true
        );
    }, [opacity]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        backgroundColor: color,
        borderRadius: 8,
    }));

    return <Animated.View style={[style, animatedStyle]} />;
};

const FrontContent = ({ booking, shuttleTrip, isLoading, isChauffeurEnabled, isShuttleEnabled }: FrontContentProps) => {
    const { t } = useLanguage();
    const te = (key: string, options?: Record<string, unknown>) =>
        t(`employee:${key}`, options);
    const isChauffeurMode = !!booking || isChauffeurEnabled;
    const hasTrip = !!booking || !!shuttleTrip;

    // Chauffeur-specific
    const completedDays = booking?.completed_days ?? 0;
    const totalDays = booking?.total_days ?? 0;
    const todayStatus = booking?.today_log?.status?.toUpperCase();
    const isChauffeurActive = todayStatus === 'DROPPED_OFF' || todayStatus === 'IN_PROGRESS';
    const tripType = booking?.trip_type === 'OUT_STATION' ? 'Outstation' : 'Incity trip';

    // Shuttle-specific
    const shuttleStatus = shuttleTrip?.status?.toUpperCase();
    const isShuttleActive = shuttleStatus === 'STARTED' || shuttleStatus === 'IN_PROGRESS';
    const shuttleDirection = shuttleTrip?.direction;
    const shuttlePickupEta = shuttleDirection === 'EVENING'
        ? (shuttleTrip?.my_pickup_stop?.evening_eta ?? null)
        : (shuttleTrip?.my_pickup_stop?.morning_eta ?? null);
    const shuttlePickupTime = formatEta(shuttlePickupEta);
    const routeName = shuttleTrip?.routes?.name ?? te('dailyShuttle');

    const isShuttleMode = !!isShuttleEnabled && !booking;
    // During loading, trip data isn't available yet — derive illustration from enabled-service flags.
    const loadingIsShuttleMode = !isChauffeurEnabled && !!isShuttleEnabled;
    const illustration = (isLoading ? loadingIsShuttleMode : isShuttleMode)
        ? CITY_BUS_IMAGE
        : CHAUFFEUR_CAR_IMAGE;

    if (isLoading) {
        return (
            <View style={styles.frontContainer}>
                <View style={styles.brandRow}>
                    <SkeletonItem style={{ width: 120, height: 20 }} />
                </View>
                <View style={[styles.illustrationContainer, { opacity: 0.1 }]}>
                    <Image source={illustration} style={styles.illustration} contentFit="contain" />
                </View>
                <View style={styles.headlineContainer}>
                    <SkeletonItem style={{ width: '80%', height: 36, marginBottom: 8 }} />
                    <SkeletonItem style={{ width: '60%', height: 36 }} />
                </View>
                <View style={styles.divider} />
                <View style={styles.statRow}>
                    <SkeletonItem style={{ width: 100, height: 28 }} />
                    <SkeletonItem style={{ width: 80, height: 28, borderRadius: 10 }} />
                </View>
            </View>
        );
    }

    const headline = booking
        ? `${tripType},\nDay ${completedDays}/${totalDays}`
        : shuttleTrip
            ? routeName
            : isChauffeurMode
                ? 'No trips scheduled'
                : isShuttleEnabled
                    ? 'No schedule\ntoday'
                    : '—';

    const isEmptyState = !hasTrip;

    const timeDisplay = booking
        ? (isChauffeurActive ? te('inProgress') : (booking.scheduled_for ? new Date(booking.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'))
        : shuttleTrip
            ? (isShuttleActive ? te('inProgress') : shuttlePickupTime)
            : '—';

    return (
        <View style={styles.frontContainer}>
            {/* Top brand row */}
            <View style={styles.brandRow}>
                <Text style={styles.brandName}>{isShuttleMode ? te('dailyShuttle') : te('yourChauffeur')}</Text>
            </View>

            {/* Center illustration */}
            <View style={styles.illustrationContainer}>
                <Image
                    source={illustration}
                    style={styles.illustration}
                    contentFit="contain"
                    transition={0}
                    cachePolicy="memory-disk"
                />
            </View>

            {/* Headline text */}
            <View style={[styles.headlineContainer, isEmptyState && { alignItems: 'center' }]}>
                <Text style={[styles.headlineText, isEmptyState && { textAlign: 'center', marginBottom: 20 }]}>
                    {headline}
                </Text>
            </View>

            {/* Divider and stat row — hidden only for chauffeur empty state */}
            {!isEmptyState && (
                <>
                    <View style={styles.divider} />
                    <View style={styles.statRow}>
                        <View style={styles.statLeft}>
                            <Text style={styles.statNumber}>{timeDisplay}</Text>
                        </View>
                        <View style={styles.arrowContainer}>
                            <Text style={styles.flipHintText}>{te('tapForDetails')}</Text>
                            <MaterialCommunityIcons name="rotate-3d-variant" size={20} color="black" />
                        </View>
                    </View>
                </>
            )}
        </View>
    );
};

interface BackContentProps {
    booking: EmployeeActiveChauffeurBooking | null;
    shuttleTrip?: ShuttleTripForEmployee | null;
    onClose: () => void;
    onRequestCaptain: () => void;
}

const BackContent = ({ booking, shuttleTrip, onClose, onRequestCaptain }: BackContentProps) => {
    const { t } = useLanguage();
    const te = (key: string, options?: Record<string, unknown>) =>
        t(`employee:${key}`, options);
    const isChauffeurMode = !!booking;
    const driver = booking?.users_chauffeur_bookings_driver_idTousers;
    const chauffeurVehicle = booking?.vehicles;
    const todayStatus = booking?.today_log?.status?.toUpperCase();
    const isDroppedOff = todayStatus === 'DROPPED_OFF' || todayStatus === 'IN_PROGRESS';
    const showRequestCaptain = !!booking?.can_request_driver;

    const shuttleVehicle = shuttleTrip?.routes?.vehicles;
    const shuttleDriver = shuttleTrip?.users;

    const driverName = isChauffeurMode
        ? (driver?.full_name ?? te('assigning'))
        : (shuttleDriver?.full_name ?? te('assigning'));
    const driverPhone = isChauffeurMode ? driver?.phone : shuttleDriver?.phone;
    const driverPictureUrl = isChauffeurMode
        ? (driver?.profile_picture_url ?? null)
        : (shuttleDriver?.profile_picture_url ?? null);
    const isAssigning = !driverPhone && !showRequestCaptain;
    const plateNumber = isChauffeurMode
        ? (chauffeurVehicle?.plate_number ?? '—')
        : (shuttleVehicle?.plate_number ?? '—');
    const vehicleInfo = isChauffeurMode
        ? (chauffeurVehicle ? `${chauffeurVehicle.make} • ${chauffeurVehicle.color}` : '—')
        : (shuttleVehicle ? `${shuttleVehicle.make} • ${shuttleVehicle.model}` : '—');

    const handleAction = () => {
        if (showRequestCaptain && booking) {
            onRequestCaptain();
        } else if (driverPhone) {
            Linking.openURL(`tel:${driverPhone}`);
        }
    };

    const initials = driverName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    return (
        <>
            <LinearGradient
                style={styles.gradient}
                colors={["#F1F443", "#F1F443"]}
            />
            <View style={styles.backContent}>

                {/* Header */}
                <Text style={styles.backTitle}>Ride Details</Text>

                {/* Captain avatar + info grid — grouped close together */}
                <View style={styles.captainBlock}>

                    {/* Captain avatar */}
                    <View style={styles.captainSection}>
                        <View style={styles.avatarCircle}>
                            {driverPictureUrl ? (
                                <Image
                                    source={{ uri: driverPictureUrl }}
                                    style={{ width: 64, height: 64, borderRadius: 32 }}
                                    contentFit="cover"
                                />
                            ) : (
                                <Text style={styles.avatarInitials}>{initials}</Text>
                            )}
                        </View>
                        <Text style={styles.captainRole}>
                            {isChauffeurMode ? te('yourChauffeur') : te('yourCaptain')}
                        </Text>
                        <Text style={styles.captainName}>{driverName}</Text>
                    </View>

                    {/* Divider between avatar and grid */}
                    <View style={styles.backDivider} />

                    {/* 3-column info grid */}
                    <View style={styles.infoGrid}>
                        {/* Vehicle */}
                        <View style={styles.infoCell}>
                            <View style={styles.infoIconBox}>
                                <MaterialCommunityIcons name="bus" size={16} color="#000" />
                            </View>
                            <Text style={styles.infoCellLabel}>Vehicle</Text>
                            <Text style={styles.infoCellValue}>{plateNumber}</Text>
                            <Text style={styles.infoCellSub}>{vehicleInfo}</Text>
                        </View>

                        <View style={styles.gridSeparator} />

                        {/* Pickup Time */}
                        <View style={styles.infoCell}>
                            <View style={styles.infoIconBox}>
                                <Ionicons name="time-outline" size={16} color="#000" />
                            </View>
                            <Text style={styles.infoCellLabel}>Pickup Time</Text>
                            <Text style={styles.infoCellValue}>
                                {isChauffeurMode
                                    ? (isDroppedOff ? 'In Progress' : (booking!.scheduled_for ? new Date(booking!.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'))
                                    : (shuttleTrip?.status?.toUpperCase() === 'STARTED' || shuttleTrip?.status?.toUpperCase() === 'IN_PROGRESS'
                                        ? 'In Progress'
                                        : formatEta(shuttleTrip?.direction === 'EVENING'
                                            ? (shuttleTrip?.my_pickup_stop?.evening_eta ?? null)
                                            : (shuttleTrip?.my_pickup_stop?.morning_eta ?? null)))}
                            </Text>
                            <Text style={styles.infoCellSub}>Today</Text>
                        </View>

                        <View style={styles.gridSeparator} />

                        {/* Stop / Pickup */}
                        <View style={styles.infoCell}>
                            <View style={styles.infoIconBox}>
                                <Ionicons name="location-outline" size={16} color="#000" />
                            </View>
                            <Text style={styles.infoCellLabel}>{isChauffeurMode ? 'Pickup' : 'Stop'}</Text>
                            <Text style={[styles.infoCellValue, { textAlign: 'center' }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>
                                {isChauffeurMode
                                    ? (booking!.pickup_address?.split(',')[0] ?? '—')
                                    : (shuttleTrip?.my_pickup_stop?.name ?? '—')}
                            </Text>
                            <Text style={styles.infoCellSub}>
                                {isChauffeurMode ? '' : (shuttleTrip?.routes?.name ?? '')}
                            </Text>
                        </View>
                    </View>

                </View>

                {/* Divider below grid, same distance as the one above */}
                <View style={styles.backDivider} />

                {/* Action button */}
                <Pressable onPress={handleAction} disabled={isAssigning}>
                    <View style={[styles.actionButton, isAssigning && { opacity: 0.7 }]}>
                        <Text style={styles.buttonText}>
                            {showRequestCaptain
                                ? (isChauffeurMode ? te('requestChauffeur') : te('requestCaptain'))
                                : (isChauffeurMode ? te('callChauffeur') : te('callCaptain'))}
                        </Text>
                    </View>
                </Pressable>

            </View>

            <Pressable style={styles.crossButton} onPress={onClose} hitSlop={15}>
                <Ionicons name="close" size={22} color="#000" />
            </Pressable>
        </>
    );
};

// ── Pickup Location Sheet ───────────────────────────────────────────────────

type SheetMode = 'compact' | 'searchmap';

interface PickupSheetProps {
    visible: boolean;
    screenHeight: number;
    booking: EmployeeActiveChauffeurBooking;
    onClose: () => void;
    /** Called after successful request+navigation handoff */
    onDone: () => void;
}

// Height for the compact 2-option view (without bottom insets — added dynamically)
const SHEET_COMPACT_HEIGHT_LTR = 360;
const SHEET_COMPACT_HEIGHT_RTL = 430;

const GOOGLE_PLACES_API_KEY = Platform.OS === 'ios'
    ? (process.env.EXPO_PUBLIC_IOS_GOOGLE_API_KEY ?? '')
    : (process.env.EXPO_PUBLIC_ANDROID_GOOGLE_API_KEY ?? '');

// Key with NO app restriction (None) — used for HTTP REST calls (Places Autocomplete + Geocoding).
// App-restricted keys (above) only work for native SDK calls; REST calls don't send bundle IDs.
const GOOGLE_REST_KEY = process.env.EXPO_PUBLIC_GOOGLE_REST_KEY ?? '';

/**
 * Reverse-geocode coordinates to a human-readable address string.
 *
 * Priority:
 * 1. Google Geocoding REST API (requires EXPO_PUBLIC_GOOGLE_REST_KEY with no app restriction)
 * 2. expo-location system geocoder as reliable fallback (works on-device without a key)
 */
async function reverseGeocodeAddress(lat: number, lon: number): Promise<string> {
    // 1. Google Geocoding REST API — only if the REST key is configured
    if (GOOGLE_REST_KEY && GOOGLE_REST_KEY !== 'REPLACE_WITH_YOUR_REST_KEY') {
        try {
            const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${GOOGLE_REST_KEY}&language=en`;
            const res = await fetch(url);
            const json = await res.json();
            if (json.status === 'OK' && json.results?.length > 0) {
                return json.results[0].formatted_address as string;
            }
        } catch { /* fall through */ }
    }

    // 2. expo-location system geocoder — deduplicate repeated city names
    try {
        const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
        if (results.length > 0) {
            const a = results[0];
            if ((a as any).formattedAddress) return (a as any).formattedAddress as string;
            const parts = [a.name, a.street, a.district, a.city, a.country]
                .filter((p): p is string => !!p && p.trim().length > 0);
            const deduped = parts.filter((p, i) => p !== parts[i - 1]);
            if (deduped.length > 0) return deduped.join(', ');
        }
    } catch { /* fall through */ }

    return 'Current Location';
}

/**
 * Resolve lat/lng for a place_id via Places Details REST API.
 * Used as fallback when GooglePlacesAutocomplete fetchDetails returns null on real devices.
 */
async function fetchPlaceCoords(placeId: string): Promise<{ lat: number; lng: number } | null> {
    if (!GOOGLE_REST_KEY) return null;
    try {
        const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${GOOGLE_REST_KEY}`;
        const res = await fetch(url);
        const json = await res.json();
        const loc = json?.result?.geometry?.location;
        if (loc?.lat != null && loc?.lng != null) return loc;
    } catch { /* fall through */ }
    return null;
}

const PickupSheet = ({ visible, screenHeight, booking, onClose, onDone }: PickupSheetProps) => {
    const insets = useSafeAreaInsets();
    const toast = useToast();
    const router = useRouter();
    const { t, isRTL } = useLanguage();
    const te = (key: string, options?: Record<string, unknown>) => t(`employee:${key}`, options);
    const [requestNextDayPickup, { isLoading: isRequesting }] = useRequestNextDayPickupMutation();

    const [mode, setMode] = useState<SheetMode>('compact');
    const [resolvedCurrentAddress, setResolvedCurrentAddress] = useState<string | null>(null);
    const [isLocationPermissionDenied, setIsLocationPermissionDenied] = useState(false);
    const [isResolvingLocation, setIsResolvingLocation] = useState(false);

    // Shared map state (used in searchmap mode)
    const DEFAULT_REGION: Region = { latitude: 24.8607, longitude: 67.0011, latitudeDelta: 0.01, longitudeDelta: 0.01 };
    const [mapRegion, setMapRegion] = useState<Region>(DEFAULT_REGION);
    const [mapAddress, setMapAddress] = useState<string | null>(null);
    const [mapCoords, setMapCoords] = useState<{ latitude: number; longitude: number } | null>(null);
    const [isGeocodingMap, setIsGeocodingMap] = useState(false);
    const [headerHeight, setHeaderHeight] = useState(50);
    // Controls whether the autocomplete list is shown — lets us programmatically
    // hide it after a row is selected without relying on blur events.
    const [showSuggestions, setShowSuggestions] = useState(false);
    const geocodeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const mapRef = useRef<MapView>(null);

    const translateY = useSharedValue(screenHeight);
    const [mounted, setMounted] = useState(false);

    // Animate in/out when visible changes
    React.useEffect(() => {
        if (visible) {
            setMounted(true);
            setMode('compact');
            setResolvedCurrentAddress(null);
            setIsLocationPermissionDenied(false);
            setMapAddress(null);
            setMapRegion(DEFAULT_REGION);
            requestAnimationFrame(() => {
                translateY.value = withSpring(0, { damping: 22, stiffness: 160, mass: 0.9 });
            });
            resolveCurrentLocation();
        } else {
            translateY.value = withSpring(
                screenHeight,
                { damping: 22, stiffness: 160, mass: 0.9, overshootClamping: true },
                (finished) => { if (finished) runOnJS(setMounted)(false); }
            );
            setTimeout(() => setMounted(false), 450);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    const resolveCurrentLocation = async () => {
        setIsResolvingLocation(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setIsLocationPermissionDenied(true);
                setResolvedCurrentAddress(null);
                return;
            }
            setIsLocationPermissionDenied(false);
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const { latitude, longitude } = loc.coords;
            const region: Region = { latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 };
            setMapRegion(region);
            setMapCoords({ latitude, longitude });
            // Use Google Geocoding for proper street-level address
            const address = await reverseGeocodeAddress(latitude, longitude);
            setResolvedCurrentAddress(address);
            setMapAddress(address);
        } catch {
            const fallback = booking.pickup_address ?? te('currentLocation');
            setResolvedCurrentAddress(fallback);
            setMapAddress(fallback);
        } finally {
            setIsResolvingLocation(false);
        }
    };

    // Debounced Google reverse-geocode when user pans the map
    const geocodeMapCenter = useCallback((lat: number, lon: number) => {
        if (geocodeDebounceRef.current) clearTimeout(geocodeDebounceRef.current);
        geocodeDebounceRef.current = setTimeout(async () => {
            setIsGeocodingMap(true);
            setMapCoords({ latitude: lat, longitude: lon });
            try {
                const address = await reverseGeocodeAddress(lat, lon);
                setMapAddress(address);
            } finally {
                setIsGeocodingMap(false);
            }
        }, 400);
    }, []);

    const submitPickup = async (address: string, coords?: { latitude: number; longitude: number }) => {
        try {
            await requestNextDayPickup({
                companyId: booking.companies?.id ?? 0,
                bookingId: booking.id,
                pickup_location: address,
                ...(coords ? { pickup_coords: coords } : {}),
            }).unwrap();

            const driver = booking.users_chauffeur_bookings_driver_idTousers;
            const vehicle = booking.vehicles;

            onDone();
            setTimeout(() => {
                router.push({
                    pathname: '/employee/waiting',
                    params: {
                        mode: 'chauffeur',
                        bookingId: String(booking.id),
                        bookingStatus: booking.status,
                        tripType: booking.trip_type,
                        driverName: driver?.full_name ?? 'Captain',
                        driverPhone: driver?.phone ?? '',
                        vehicleDisplay: vehicle ? `${vehicle.make ?? ''} ${vehicle.model ?? ''}`.trim() : '',
                        vehiclePlate: vehicle?.plate_number ?? '',
                    },
                });
            }, 500);
        } catch (error) {
            console.error("Failed to request next day pickup", error);
            toast.show(
                <CustomToast type="error" message={te('requestCaptainFailed')} />,
                { duration: 3500, position: 'top' }
            );
        }
    };

    const sheetStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    if (!mounted) return null;

    const isFullScreen = mode === 'searchmap';
    const sheetTop = isFullScreen ? insets.top : undefined;
    // Compact height accounts for Android bottom nav bar via insets.bottom
    const compactSheetHeight = isRTL ? SHEET_COMPACT_HEIGHT_RTL : SHEET_COMPACT_HEIGHT_LTR;
    const sheetHeight = isFullScreen
        ? undefined
        : compactSheetHeight + insets.bottom;

    return (
        <>
            <Pressable style={StyleSheet.absoluteFill} onPress={visible ? onClose : undefined} />

            <Animated.View style={[styles.pickupSheet, { height: sheetHeight, top: sheetTop }, sheetStyle]}>
                {!isFullScreen && <View style={styles.sheetHandle} />}

                {mode === 'compact' && (
                    <View style={[styles.sheetBody, { paddingBottom: 32 + insets.bottom }]}>
                        <Text style={styles.sheetTitle}>{te('whereShouldWePickYouUp')}</Text>
                        <Text style={[styles.sheetSubtitle, isRTL && styles.sheetSubtitleRtl]}>{te('choosePickupLocation')}</Text>

                        {/* Option A – Current Location */}
                        <Pressable
                            onPress={() => {
                                if (!isResolvingLocation && resolvedCurrentAddress && !isLocationPermissionDenied) {
                                    submitPickup(resolvedCurrentAddress, mapCoords ?? undefined);
                                }
                            }}
                            disabled={isResolvingLocation || isRequesting || isLocationPermissionDenied}
                            style={({ pressed }) => pressed && { opacity: 0.75 }}
                        >
                            <View style={styles.locationOption}>
                                <View style={styles.locationOptionIcon}>
                                    <Ionicons name="navigate" size={18} color="#fff" />
                                </View>
                                <View style={styles.locationOptionTextBlock}>
                                    <Text style={styles.locationOptionTitle}>{te('useCurrentLocation')}</Text>
                                    {isResolvingLocation ? (
                                        <View style={styles.locationOptionDetecting}>
                                            <ActivityIndicator size="small" color="#999" />
                                            <Text style={styles.locationOptionSub}>{te('detectingLocation')}</Text>
                                        </View>
                                    ) : isLocationPermissionDenied ? (
                                        <Text style={styles.locationOptionSub}>{te('locationPermissionDenied')}</Text>
                                    ) : (
                                        <Text style={styles.locationOptionSub} numberOfLines={1}>
                                            {resolvedCurrentAddress ?? '—'}
                                        </Text>
                                    )}
                                </View>
                                {isRequesting
                                    ? <ActivityIndicator size="small" color="#000" />
                                    : <Ionicons name="chevron-forward" size={18} color="#aaa" />}
                            </View>
                        </Pressable>

                        {/* Option B – Search + map picker */}
                        <Pressable
                            onPress={() => setMode('searchmap')}
                            style={({ pressed }) => pressed && { opacity: 0.75 }}
                        >
                            <View style={styles.locationOption}>
                                <View style={[styles.locationOptionIcon, { backgroundColor: '#1a1a1a' }]}>
                                    <Ionicons name="search" size={18} color="#fff" />
                                </View>
                                <View style={styles.locationOptionTextBlock}>
                                    <Text style={styles.locationOptionTitle}>{te('enterPickupAddress')}</Text>
                                    <Text style={styles.locationOptionSub}>{te('searchOrPinOnMap')}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color="#aaa" />
                            </View>
                        </Pressable>
                    </View>
                )}

                {mode === 'searchmap' && (
                    <View style={{ flex: 1 }}>

                        {/* Non-scrolling ScrollView: sole job is keyboard persistence for
                             touches on the map area and confirm bar. */}
                        <ScrollView
                            style={StyleSheet.absoluteFill}
                            scrollEnabled={false}
                            keyboardShouldPersistTaps="always"
                            contentContainerStyle={{ flex: 1 }}
                        >
                            {/* Header row */}
                            <View
                                style={styles.searchMapHeader}
                                onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
                            >
                                <Pressable onPress={() => setMode('compact')} hitSlop={12}>
                                    <Ionicons name="arrow-back" size={22} color="#000" />
                                </Pressable>
                                <Text style={styles.searchMapHeaderTitle}>{te('pickYourLocation')}</Text>
                            </View>

                            {/* Map container */}
                            <View style={{ flex: 1 }} pointerEvents="box-none">
                                <MapView
                                    ref={mapRef}
                                    provider={PROVIDER_GOOGLE}
                                    style={StyleSheet.absoluteFill}
                                    initialRegion={mapRegion}
                                    onRegionChangeComplete={(region) => {
                                        geocodeMapCenter(region.latitude, region.longitude);
                                    }}
                                    showsUserLocation
                                    showsMyLocationButton={false}
                                />
                                {/* Fixed center pin */}
                                <View style={styles.mapPinContainer} pointerEvents="none">
                                    <Ionicons name="location" size={44} color="#F4593B" />
                                </View>
                            </View>

                            {/* Confirm bar */}
                            <View style={[styles.mapConfirmBar, { paddingBottom: 16 + insets.bottom }]}>
                                <View style={{ flex: 1, marginRight: 12 }}>
                                    {isGeocodingMap ? (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <ActivityIndicator size="small" color="#999" />
                                            <Text style={styles.locationOptionSub}>{te('resolvingAddress')}</Text>
                                        </View>
                                    ) : (
                                        <Text style={styles.mapAddressText} numberOfLines={2}>
                                            {mapAddress ?? te('panMapToSelect')}
                                        </Text>
                                    )}
                                </View>
                                <Pressable
                                    onPress={() => mapAddress ? submitPickup(mapAddress, mapCoords ?? undefined) : undefined}
                                    disabled={!mapAddress || isGeocodingMap || isRequesting}
                                    style={({ pressed }) => pressed && { opacity: 0.8 }}
                                >
                                    <View style={[styles.mapConfirmButton, (!mapAddress || isGeocodingMap) && { opacity: 0.4 }]}>
                                        {isRequesting
                                            ? <ActivityIndicator size="small" color="#F1F443" />
                                            : <Text style={styles.mapConfirmButtonText}>{te('confirmLocation')}</Text>}
                                    </View>
                                </Pressable>
                            </View>
                        </ScrollView>

                        {/* Autocomplete overlay — sibling to the ScrollView (not nested inside),
                             so its internal FlatList never triggers the VirtualizedList-in-ScrollView
                             warning. Its own keyboardShouldPersistTaps="always" handles persistence
                             for suggestion row taps. */}
                        <View style={[styles.searchOverlay, { top: headerHeight + 12 }]}>
                            <GooglePlacesAutocomplete
                                placeholder={te('searchAddressPlaceholder')}
                                fetchDetails={true}
                                debounce={400}
                                minLength={2}
                                enablePoweredByContainer={false}
                                keepResultsAfterBlur={true}
                                listViewDisplayed={showSuggestions}
                                textInputProps={{
                                    autoFocus: true,
                                    placeholderTextColor: '#9CA3AF',
                                    onChangeText: (text) => setShowSuggestions(text.length >= 2),
                                }}
                                onPress={async (data, detail) => {
                                    setShowSuggestions(false);
                                    const address = detail?.formatted_address ?? data.description;
                                    setMapAddress(address);

                                    let lat = detail?.geometry?.location?.lat;
                                    let lng = detail?.geometry?.location?.lng;

                                    if ((lat == null || lng == null) && data.place_id) {
                                        const coords = await fetchPlaceCoords(data.place_id);
                                        if (coords) { lat = coords.lat; lng = coords.lng; }
                                    }

                                    if (lat != null && lng != null) {
                                        const newRegion: Region = {
                                            latitude: lat,
                                            longitude: lng,
                                            latitudeDelta: 0.005,
                                            longitudeDelta: 0.005,
                                        };
                                        mapRef.current?.animateToRegion(newRegion, 600);
                                    }
                                }}
                                query={{ key: GOOGLE_REST_KEY, language: 'en' }}
                                styles={{
                                    container: { flex: 0 },
                                    textInputContainer: {
                                        paddingHorizontal: 0,
                                        paddingTop: 0,
                                        paddingBottom: 0,
                                        backgroundColor: 'transparent',
                                    },
                                    textInput: {
                                        height: 46,
                                        backgroundColor: '#fff',
                                        borderRadius: 12,
                                        paddingHorizontal: 14,
                                        fontSize: 15,
                                        color: '#000',
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.12,
                                        shadowRadius: 6,
                                        elevation: 100,
                                        margin: 0,
                                    },
                                    listView: {
                                        backgroundColor: '#fff',
                                        borderRadius: 12,
                                        marginTop: 6,
                                        maxHeight: 220,
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 4 },
                                        shadowOpacity: 0.1,
                                        shadowRadius: 10,
                                        elevation: 9999,
                                    },
                                    row: {
                                        paddingHorizontal: 14,
                                        paddingVertical: 12,
                                        borderBottomWidth: 1,
                                        borderBottomColor: '#f4f4f4',
                                        backgroundColor: '#fff',
                                    },
                                    description: {
                                        fontSize: 14,
                                        color: '#000',
                                        fontWeight: '500',
                                    },
                                    separator: { height: 0 },
                                    poweredContainer: { display: 'none' },
                                }}
                                renderRow={(data) => (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <View style={styles.suggestionIcon} pointerEvents="none">
                                            <Ionicons name="location-outline" size={15} color="#555" />
                                        </View>
                                        <Text style={[styles.suggestionText, { flex: 1 }]} numberOfLines={2}>
                                            {data.description}
                                        </Text>
                                    </View>
                                )}
                                keyboardShouldPersistTaps="always"
                            />
                        </View>
                    </View>
                )}

            </Animated.View>
        </>
    );
};




const CARD_WIDTH = 370;
const CARD_HEIGHT = 420;

export default function CorporateShuttleCard({
    booking = null,
    shuttleTrip = null,
    isLoading = false,
    isChauffeurEnabled = false,
    isShuttleEnabled = false,
}: {
    booking?: EmployeeActiveChauffeurBooking | null;
    shuttleTrip?: ShuttleTripForEmployee | null;
    isLoading?: boolean;
    isChauffeurEnabled?: boolean;
    isShuttleEnabled?: boolean;
}) {
    const showBack = !!booking || !!shuttleTrip; // Allow flipping when any trip data is present

    const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
    const cardWidth = React.useMemo(() => {
        if (Platform.OS !== 'android') return CARD_WIDTH;

        const horizontalMargin = 32;
        return Math.min(CARD_WIDTH, Math.max(300, SCREEN_WIDTH - horizontalMargin));
    }, [SCREEN_WIDTH]);
    const cardRef = React.useRef<View>(null);

    const [modalVisible, setModalVisible] = useState(false);
    const [pickupSheetVisible, setPickupSheetVisible] = useState(false);

    // Share measurement values directly to UI thread to prevent React state cycle lag
    const measX = useSharedValue(0);
    const measY = useSharedValue(0);
    const progress = useSharedValue(0);

    const openModal = () => {
        if (!showBack) return; // Disable modal if there's no trip
        cardRef.current?.measure((x, y, w, h, pageX, pageY) => {

            measX.value = pageX;
            measY.value = pageY;
            progress.value = 0; // Hard reset before component mounts
            setModalVisible(true);
        });
    };

    // Safely trigger entrance only after Modal is fully mounted & painted
    React.useEffect(() => {
        if (modalVisible) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const timeout = setTimeout(() => {
                progress.value = withSpring(1, {
                    damping: 20,
                    stiffness: 150,
                    mass: 0.9,
                });
            }, 60); // give Modal 3–4 frames to fully paint before animating
            return () => clearTimeout(timeout);
        }
    }, [modalVisible, progress]);

    const closeModal = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setPickupSheetVisible(false);

        let hasUnmounted = false;
        const unmountModal = () => {
            if (!hasUnmounted) {
                hasUnmounted = true;
                runOnJS(setModalVisible)(false);
            }
        };

        progress.value = withSpring(0, {
            damping: 20,
            stiffness: 150,
            mass: 0.9,
            overshootClamping: true,
        }, (finished) => {
            if (finished) {
                runOnJS(unmountModal)();
            }
        });

        // Failsafe: Spring math can sometimes take hundreds of micro-frames to perfectly settle to 0.
        // We guarantee touches are restored in ~400ms max.
        setTimeout(unmountModal, 400);
    };

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
        backgroundColor: "rgba(0,0,0,0.6)",
    }));

    const cardContainerStyle = useAnimatedStyle(() => {
        const targetX = (SCREEN_WIDTH - cardWidth) / 2;
        const targetY = (SCREEN_HEIGHT - CARD_HEIGHT) / 2;

        const deltaX = measX.value - targetX;
        const deltaY = measY.value - targetY;

        const translateX = interpolate(progress.value, [0, 1], [deltaX, 0], Extrapolation.CLAMP);
        const translateY = interpolate(progress.value, [0, 1], [deltaY, 0], Extrapolation.CLAMP);

        return {
            transform: [
                { translateX },
                { translateY },
            ],
            width: cardWidth,
            height: CARD_HEIGHT,
        };
    }, [SCREEN_WIDTH, SCREEN_HEIGHT, cardWidth]);

    // Make the inline card stay visible until the spring is actually moving 
    // to prevent the background flashing through right before the modal renders
    const inlineCardStyle = useAnimatedStyle(() => ({
        opacity: progress.value > 0.05 ? 0 : 1
    }));

    const frontAnimatedStyle = useAnimatedStyle(() => {
        const rotateY = interpolate(progress.value, [0, 1], [0, 180], Extrapolation.CLAMP);
        const opacity = interpolate(progress.value, [0, 0.5, 0.501, 1], [1, 1, 0, 0], Extrapolation.CLAMP);

        return {
            transform: [
                { perspective: 1000 },
                { rotateY: `${rotateY}deg` }
            ],
            opacity,
            // zIndex removed — opacity already controls visibility and zIndex
            // changes trigger layout re-composition on every frame, causing flicker.
        };
    });

    const backAnimatedStyle = useAnimatedStyle(() => {
        const rotateY = interpolate(progress.value, [0, 1], [180, 360], Extrapolation.CLAMP);
        const opacity = interpolate(progress.value, [0, 0.499, 0.5, 1], [0, 0, 1, 1], Extrapolation.CLAMP);

        return {
            transform: [
                { perspective: 1000 },
                { rotateY: `${rotateY}deg` }
            ],
            opacity,
        };
    });

    return (
        <View style={styles.safeArea}>
            {/* Inline PlaceHolder / Wrapper */}
            <Animated.View ref={cardRef} style={[{ width: cardWidth, height: CARD_HEIGHT }, inlineCardStyle]}>
                <Pressable onPress={openModal} style={{ flex: 1 }}>
                    <View style={[StyleSheet.absoluteFill, { borderRadius: 28, overflow: 'hidden' }]}>
                        <FrontContent booking={booking} shuttleTrip={shuttleTrip} isLoading={isLoading} isChauffeurEnabled={isChauffeurEnabled} isShuttleEnabled={isShuttleEnabled} />
                    </View>
                </Pressable>
            </Animated.View>



            {/* Full Screen Animated Modal */}
            <Modal visible={modalVisible} transparent animationType="none">
                <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={closeModal} />
                </Animated.View>

                {/* Animated Wrapper Container */}
                <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                    <Animated.View
                        style={[
                            styles.centerContainer,
                            {
                                marginLeft: -cardWidth / 2,
                                width: cardWidth,
                            },
                            cardContainerStyle,
                        ]}
                        pointerEvents="box-none"
                    >

                        {/* Front Side */}
                        <Animated.View
                            style={[styles.cardAbsolute, frontAnimatedStyle]}
                            renderToHardwareTextureAndroid
                            shouldRasterizeIOS
                        >
                            <FrontContent booking={booking} shuttleTrip={shuttleTrip} isLoading={isLoading} isChauffeurEnabled={isChauffeurEnabled} isShuttleEnabled={isShuttleEnabled} />
                        </Animated.View>


                        {/* Back Side */}
                        <Animated.View
                            style={[styles.cardAbsolute, backAnimatedStyle]}
                            renderToHardwareTextureAndroid
                            shouldRasterizeIOS
                        >
                            <BackContent
                                booking={booking}
                                shuttleTrip={shuttleTrip}
                                onClose={closeModal}
                                onRequestCaptain={() => setPickupSheetVisible(true)}
                            />
                        </Animated.View>


                    </Animated.View>
                </View>

                {/* Pickup Location Sheet — rendered at screen level inside the same Modal */}
                {booking && (
                    <View style={StyleSheet.absoluteFill} pointerEvents={pickupSheetVisible ? 'auto' : 'none'}>
                        <PickupSheet
                            visible={pickupSheetVisible}
                            screenHeight={SCREEN_HEIGHT}
                            booking={booking}
                            onClose={() => setPickupSheetVisible(false)}
                            onDone={closeModal}
                        />
                    </View>
                )}
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 8,
    },
    cardWrapper: {
        overflow: "visible",
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "center",
        alignItems: "center",
    },
    crossButton: {
        position: "absolute",
        top: 20,
        right: 20,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "rgba(255,255,255,0.6)",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
    },

    // ── Reanimated Modal Wrappers ─────────────────────────
    centerContainer: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginTop: -CARD_HEIGHT / 2,
        marginLeft: -CARD_WIDTH / 2,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
    },
    cardAbsolute: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 28,
        overflow: 'hidden',
        backfaceVisibility: 'hidden',
    },

    // ── Front ──────────────────────────────────────────────
    frontContainer: {
        flex: 1,
        backgroundColor: "#F4593B",
        borderRadius: 28,
        padding: 24,
        overflow: "hidden",
        justifyContent: "space-between",
    },

    // Brand / logo row at the top
    brandRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    brandIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: "rgba(255,255,255,0.25)",
        alignItems: "center",
        justifyContent: "center",
    },
    brandName: {
        fontSize: 15,
        fontWeight: "800",
        color: "#FFF",
        letterSpacing: 2,
        fontFamily,
    },

    // Illustration
    illustrationContainer: {
        alignItems: "center",
        flex: 1,
        justifyContent: "center",
        paddingVertical: 8,
    },
    illustration: {
        width: 300,
        height: 250,
        marginBottom: -10,
        marginLeft: -10,
        // makes the PNG render white over the orange background
    },

    // Headline
    headlineContainer: {
        marginBottom: 16,
    },
    headlineText: {
        fontSize: 30,
        fontWeight: "900",
        color: "#FFFF",
        letterSpacing: -0.8,
        lineHeight: 36,
        fontFamily

    },
    asterisk: {
        fontSize: 18,
        fontWeight: "900",
        color: "#FFF",
        verticalAlign: "top",
    },

    // Divider
    divider: {
        height: 1,
        backgroundColor: "rgba(255,255,255,0.35)",
        marginBottom: 16,
    },

    // Stat footer
    statRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
    },
    statLeft: {
        gap: 2,
    },
    statNumber: {
        fontSize: 28,
        fontWeight: "900",
        color: "#FFF",
        letterSpacing: -1,
        fontFamily,
    },
    statLabel: {
        fontSize: 12,
        fontWeight: "500",
        color: "rgba(255,255,255,0.75)",
        fontFamily,
    },
    arrowContainer: {
        flexDirection: "row",
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: "rgba(255,255,255,0.45)",
        backgroundColor: "#FFF",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 10,
        paddingVertical: 5,
        gap: 4,
    },
    flipHintText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#000",
        fontFamily,
    },

    // ── Back ──────────────────────────────────────────────
    gradient: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 28,
    },
    backContent: {
        flex: 1,
        padding: 22,
        justifyContent: "space-between",
    },
    backTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: "#000",
        letterSpacing: -0.3,
        fontFamily,
    },

    // Captain section
    captainSection: {
        alignItems: "center",
        gap: 4,
    },
    avatarCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: "#000",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 4,
    },
    avatarInitials: {
        fontSize: 22,
        fontWeight: "800",
        color: "#F1F443",
        fontFamily,
    },
    captainRole: {
        fontSize: 11,
        fontWeight: "600",
        color: "rgba(0,0,0,0.45)",
        textTransform: "uppercase",
        letterSpacing: 1.2,
        fontFamily,
    },
    captainName: {
        fontSize: 18,
        fontWeight: "800",
        color: "#000",
        letterSpacing: -0.3,
        fontFamily,
    },

    // Divider
    backDivider: {
        height: 1,
        backgroundColor: "rgba(0,0,0,0.12)",
    },

    // 3-column info grid
    infoGrid: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    infoCell: {
        flex: 1,
        alignItems: "center",
        gap: 3,
    },
    infoIconBox: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: "rgba(0,0,0,0.08)",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 2,
    },
    infoCellLabel: {
        fontSize: 10,
        fontWeight: "600",
        color: "rgba(0,0,0,0.45)",
        textTransform: "uppercase",
        letterSpacing: 0.8,
        fontFamily,
    },
    infoCellValue: {
        fontSize: 13,
        fontWeight: "800",
        color: "#000",
        letterSpacing: -0.2,
        fontFamily,
    },
    infoCellSub: {
        fontSize: 11,
        fontWeight: "500",
        color: "rgba(0,0,0,0.5)",
        fontFamily,
    },
    gridSeparator: {
        width: 1,
        height: "80%",
        alignSelf: "center",
        backgroundColor: "rgba(0,0,0,0.12)",
    },

    // wrapper that groups avatar + divider + grid so they sit close together
    captainBlock: {
        gap: 14,
    },

    // Call Captain button
    actionButton: {
        backgroundColor: "#000",
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: "center",
    },
    actionButtonLoading: {
        backgroundColor: "#4a4a4a",
        opacity: 0.8,
    },
    buttonText: {
        color: "#F1F443",
        fontWeight: "800",
        fontSize: 14,
        letterSpacing: 0.2,
        fontFamily,
    },

    // ── Pickup Sheet ─────────────────────────────────────
    pickupSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 24,
    },
    sheetHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#e0e0e0',
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: 4,
    },
    sheetBody: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 28,
        gap: 16,
    },
    sheetTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#000',
        letterSpacing: -0.3,
        fontFamily,
        marginBottom: 2,
    },
    sheetSubtitle: {
        fontSize: 13,
        fontWeight: '500',
        color: 'rgba(0,0,0,0.45)',
        fontFamily,
        marginBottom: 8,
    },
    sheetSubtitleRtl: {
        lineHeight: 22,
        marginBottom: 12,
    },
    locationOption: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        backgroundColor: '#f7f7f7',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 16,
        minHeight: 76,
    },
    locationOptionIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#F4593B',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
        flexShrink: 0,
    },
    locationOptionTextBlock: {
        flex: 1,
        justifyContent: 'center',
        marginRight: 8,
    },
    locationOptionDetecting: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 3,
        gap: 6,
    },
    locationOptionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#000',
        fontFamily,
    },
    locationOptionSub: {
        fontSize: 12,
        fontWeight: '500',
        color: 'rgba(0,0,0,0.4)',
        fontFamily,
        marginTop: 3,
    },

    // Search mode
    searchBarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    searchInputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f4f4f4',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#000',
        fontFamily,
        paddingVertical: 0,
    },
    searchDivider: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginBottom: 4,
    },
    suggestionsLoader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 20,
    },
    suggestionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#f4f4f4',
    },
    suggestionIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    suggestionText: {
        flex: 1,
        fontSize: 14,
        color: '#000',
        fontFamily,
        fontWeight: '500',
    },
    confirmTypedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 16,
        marginHorizontal: 16,
        marginTop: 12,
        backgroundColor: '#000',
        borderRadius: 14,
    },
    confirmTypedText: {
        flex: 1,
        fontSize: 14,
        color: '#F1F443',
        fontFamily,
        fontWeight: '700',
    },
    noResults: {
        padding: 24,
        alignItems: 'center',
    },
    noResultsText: {
        fontSize: 14,
        color: 'rgba(0,0,0,0.35)',
        fontFamily,
    },

    // ── Map picker ─────────────────────────────────────────
    mapPinContainer: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginLeft: -22,   // half of 44px icon
        marginTop: -44,    // tip of pin icon sits at exact centre
        zIndex: 5,
    },
    // Search bar floating over the map
    searchOverlay: {
        position: 'absolute',
        // top is set dynamically via inline style (headerHeight + 12)
        left: 12,
        right: 12,
        zIndex: 9999,
        elevation: 9999,
    },
    // Header for searchmap mode
    searchMapHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 10,
        gap: 10,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    searchMapHeaderTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#000',
        letterSpacing: -0.2,
        fontFamily,
    },
    mapConfirmBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        backgroundColor: '#fff',
    },
    mapAddressText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
        fontFamily,
        lineHeight: 20,
    },
    mapConfirmButton: {
        backgroundColor: '#000',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
        minWidth: 90,
        alignItems: 'center',
        justifyContent: 'center',
    },
    mapConfirmButtonText: {
        color: '#F1F443',
        fontWeight: '800',
        fontSize: 14,
        fontFamily,
    },
});
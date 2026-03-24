import React, { useState, useRef, useCallback } from "react";
import { LinearGradient } from "expo-linear-gradient";
import {
    StyleSheet, View, Text, Modal, Pressable,
    TextInput, ActivityIndicator, ScrollView,
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { fontFamily } from '@/core/theme';
import { EmployeeActiveChauffeurBooking, useRequestNextDayPickupMutation } from "../services/bookingsApi";
import { ShuttleTripForEmployee } from "../services/employeeShuttleApi";
import * as Linking from 'expo-linking';
import { useToast } from '@/shared/ui/molecules/Toast';
import { CustomToast } from '@/features/shared/components/CustomToast';
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
    const shuttlePickupTime = formatEta(shuttleTrip?.my_pickup_stop?.morning_eta ?? null);
    const routeName = shuttleTrip?.routes?.name ?? 'Daily Shuttle';

    const isShuttleMode = !!shuttleTrip && !booking;
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

    const isEmptyState = !hasTrip && isChauffeurMode;

    const timeDisplay = booking
        ? (isChauffeurActive ? 'In Progress' : (booking.scheduled_for ? new Date(booking.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'))
        : shuttleTrip
            ? (isShuttleActive ? 'In Progress' : shuttlePickupTime)
            : '—';

    return (
        <View style={styles.frontContainer}>
            {/* Top brand row */}
            <View style={styles.brandRow}>
                <Text style={styles.brandName}>{isShuttleMode ? 'Daily Shuttle' : 'Your Chauffeur'}</Text>
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
                            <Text style={styles.flipHintText}>Tap for details</Text>
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
    const isChauffeurMode = !!booking;
    const driver = booking?.users_chauffeur_bookings_driver_idTousers;
    const chauffeurVehicle = booking?.vehicles;
    const todayStatus = booking?.today_log?.status?.toUpperCase();
    const isDroppedOff = todayStatus === 'DROPPED_OFF' || todayStatus === 'IN_PROGRESS';
    const showRequestCaptain = !!booking?.can_request_driver;

    const shuttleVehicle = shuttleTrip?.routes?.vehicles;
    const shuttleDriver = shuttleTrip?.users;

    const driverName = isChauffeurMode
        ? (driver?.full_name ?? 'Assigning...')
        : (shuttleDriver?.full_name ?? 'Assigning...');
    const driverPhone = isChauffeurMode ? driver?.phone : shuttleDriver?.phone;
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
                            <Text style={styles.avatarInitials}>{initials}</Text>
                        </View>
                        <Text style={styles.captainRole}>Your Captain</Text>
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
                                        : formatEta(shuttleTrip?.my_pickup_stop?.morning_eta ?? null))}
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
                            {showRequestCaptain ? "Request Captain" : "Call Captain"}
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

type SheetMode = 'compact' | 'search';

interface PickupSheetProps {
    visible: boolean;
    screenHeight: number;
    booking: EmployeeActiveChauffeurBooking;
    onClose: () => void;
    /** Called after successful request+navigation handoff */
    onDone: () => void;
}

const SHEET_COMPACT_HEIGHT = 320;

const PickupSheet = ({ visible, screenHeight, booking, onClose, onDone }: PickupSheetProps) => {
    const insets = useSafeAreaInsets();
    const toast = useToast();
    const router = useRouter();
    const [requestNextDayPickup, { isLoading: isRequesting }] = useRequestNextDayPickupMutation();

    const [mode, setMode] = useState<SheetMode>('compact');
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
    const [resolvedCurrentAddress, setResolvedCurrentAddress] = useState<string | null>(null);
    const [isResolvingLocation, setIsResolvingLocation] = useState(false);
    const inputRef = useRef<TextInput>(null);

    const translateY = useSharedValue(screenHeight);
    const [mounted, setMounted] = useState(false);

    // Animate in/out when visible changes
    React.useEffect(() => {
        if (visible) {
            setMounted(true);
            setMode('compact');
            setQuery('');
            setSuggestions([]);
            setResolvedCurrentAddress(null);
            // Small delay so the component has rendered before the spring starts
            requestAnimationFrame(() => {
                translateY.value = withSpring(0, { damping: 22, stiffness: 160, mass: 0.9 });
            });
            // Pre-fetch current location immediately when sheet opens
            resolveCurrentLocation();
        } else {
            // Animate out first, then unmount
            translateY.value = withSpring(
                screenHeight,
                { damping: 22, stiffness: 160, mass: 0.9, overshootClamping: true },
                (finished) => {
                    if (finished) runOnJS(setMounted)(false);
                }
            );
            // Failsafe unmount
            setTimeout(() => setMounted(false), 450);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    // Focus input and keep sheet fully open when entering search mode
    React.useEffect(() => {
        if (!visible) return;
        if (mode === 'search') {
            setTimeout(() => inputRef.current?.focus(), 80);
        }
    }, [mode, visible]);

    const resolveCurrentLocation = async () => {
        setIsResolvingLocation(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setResolvedCurrentAddress('Location permission denied');
                return;
            }
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const geocoded = await Location.reverseGeocodeAsync({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
            });
            if (geocoded.length > 0) {
                const addr = geocoded[0];
                const full = [addr.name, addr.street, addr.district, addr.city].filter(Boolean).join(', ');
                setResolvedCurrentAddress(full || 'Current Location');
            } else {
                setResolvedCurrentAddress('Current Location');
            }
        } catch {
            setResolvedCurrentAddress(booking.pickup_address ?? 'Current Location');
        } finally {
            setIsResolvingLocation(false);
        }
    };

    const searchSuggestions = useCallback(async (text: string) => {
        if (text.trim().length < 3) {
            setSuggestions([]);
            return;
        }
        setIsSuggestionsLoading(true);
        try {
            const results = await Location.geocodeAsync(text);
            // geocodeAsync only returns coords; reverse-geocode up to 5 to build readable labels
            const labels: string[] = [];
            for (const r of results.slice(0, 5)) {
                const rev = await Location.reverseGeocodeAsync({ latitude: r.latitude, longitude: r.longitude });
                if (rev.length > 0) {
                    const a = rev[0];
                    const label = [a.name, a.street, a.district, a.city].filter(Boolean).join(', ');
                    if (label && !labels.includes(label)) labels.push(label);
                }
            }
            setSuggestions(labels);
        } catch {
            setSuggestions([]);
        } finally {
            setIsSuggestionsLoading(false);
        }
    }, []);

    // Debounce query changes
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handleQueryChange = (text: string) => {
        setQuery(text);
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => searchSuggestions(text), 400);
    };

    const submitPickup = async (address: string) => {
        try {
            await requestNextDayPickup({
                companyId: booking.companies?.id ?? 0,
                bookingId: booking.id,
                pickup_location: address,
            }).unwrap();

            const driver = booking.users_chauffeur_bookings_driver_idTousers;
            const vehicle = booking.vehicles;

            onDone(); // close sheet + modal together
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
                <CustomToast type="error" message="Failed to request captain. Please try again." />,
                { duration: 3500, position: 'top' }
            );
        }
    };

    const sheetStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    if (!mounted) return null;

    const isSearch = mode === 'search';
    // In search mode the sheet covers the full screen and respects top safe area
    const sheetTop = isSearch ? insets.top : undefined;
    const sheetHeight = isSearch ? screenHeight - insets.top : SHEET_COMPACT_HEIGHT;

    return (
        <>
            {/* Dim overlay — only interactive when sheet is in compact mode so search input isn't blocked */}
            <Pressable style={StyleSheet.absoluteFill} onPress={visible ? onClose : undefined} />

            <Animated.View style={[styles.pickupSheet, { height: sheetHeight, top: sheetTop }, sheetStyle]}>
                    {/* Handle — hidden in full-screen search mode */}
                    {!isSearch && <View style={styles.sheetHandle} />}

                    {!isSearch ? (
                        <View style={styles.sheetBody}>
                            <Text style={styles.sheetTitle}>Where should we pick you up?</Text>
                            <Text style={styles.sheetSubtitle}>Choose your pickup location for today's ride</Text>

                            {/* Option A – Current Location */}
                            <Pressable
                                onPress={() => {
                                    if (!isResolvingLocation && resolvedCurrentAddress && resolvedCurrentAddress !== 'Location permission denied') {
                                        submitPickup(resolvedCurrentAddress);
                                    }
                                }}
                                disabled={isResolvingLocation || isRequesting}
                                style={({ pressed }) => pressed && { opacity: 0.75 }}
                            >
                                <View style={styles.locationOption}>
                                    <View style={styles.locationOptionIcon}>
                                        <Ionicons name="navigate" size={18} color="#fff" />
                                    </View>
                                    <View style={styles.locationOptionTextBlock}>
                                        <Text style={styles.locationOptionTitle}>Use current location</Text>
                                        {isResolvingLocation ? (
                                            <View style={styles.locationOptionDetecting}>
                                                <ActivityIndicator size="small" color="#999" />
                                                <Text style={styles.locationOptionSub}>Detecting location…</Text>
                                            </View>
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

                            {/* Option B – Enter manually */}
                            <Pressable
                                onPress={() => setMode('search')}
                                style={({ pressed }) => pressed && { opacity: 0.75 }}
                            >
                                <View style={styles.locationOption}>
                                    <View style={[styles.locationOptionIcon, { backgroundColor: '#1a1a1a' }]}>
                                        <Ionicons name="search" size={18} color="#fff" />
                                    </View>
                                    <View style={styles.locationOptionTextBlock}>
                                        <Text style={styles.locationOptionTitle}>Enter pickup address</Text>
                                        <Text style={styles.locationOptionSub}>Type any address or landmark</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={18} color="#aaa" />
                                </View>
                            </Pressable>
                        </View>
                    ) : (
                        // ── Search / full-screen mode ──────────────────────────
                        <View style={{ flex: 1 }}>
                            {/* Search bar row — extra top padding for safe area */}
                            <View style={[styles.searchBarRow, { paddingTop: 16 }]}>
                                <Pressable onPress={() => { setMode('compact'); setQuery(''); setSuggestions([]); }} hitSlop={12}>
                                    <Ionicons name="arrow-back" size={22} color="#000" />
                                </Pressable>
                                <View style={styles.searchInputWrapper}>
                                    <Ionicons name="location-outline" size={16} color="#999" style={{ marginRight: 6 }} />
                                    <TextInput
                                        ref={inputRef}
                                        style={styles.searchInput}
                                        placeholder="Search for an address…"
                                        placeholderTextColor="#aaa"
                                        value={query}
                                        onChangeText={handleQueryChange}
                                        autoCorrect={false}
                                        returnKeyType="search"
                                    />
                                    {query.length > 0 && (
                                        <Pressable onPress={() => { setQuery(''); setSuggestions([]); }} hitSlop={10}>
                                            <Ionicons name="close-circle" size={18} color="#bbb" />
                                        </Pressable>
                                    )}
                                </View>
                            </View>

                            <View style={styles.searchDivider} />

                            {isSuggestionsLoading ? (
                                <View style={styles.suggestionsLoader}>
                                    <ActivityIndicator size="small" color="#999" />
                                    <Text style={styles.locationOptionSub}>Searching…</Text>
                                </View>
                            ) : (
                                <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
                                    {suggestions.length === 0 && query.length >= 3 && (
                                        <View style={styles.noResults}>
                                            <Text style={styles.noResultsText}>No results found</Text>
                                        </View>
                                    )}
                                    {suggestions.map((s, i) => (
                                        <Pressable
                                            key={i}
                                            style={({ pressed }) => [styles.suggestionRow, pressed && { backgroundColor: '#f5f5f5' }]}
                                            onPress={() => submitPickup(s)}
                                            disabled={isRequesting}
                                        >
                                            <View style={styles.suggestionIcon}>
                                                <Ionicons name="location-outline" size={16} color="#555" />
                                            </View>
                                            <Text style={styles.suggestionText} numberOfLines={2}>{s}</Text>
                                            {isRequesting ? (
                                                <ActivityIndicator size="small" color="#aaa" />
                                            ) : null}
                                        </Pressable>
                                    ))}

                                    {/* Confirm typed address directly if no suggestions picked */}
                                    {query.trim().length > 0 && (
                                        <Pressable
                                            style={({ pressed }) => [styles.confirmTypedRow, pressed && { opacity: 0.8 }]}
                                            onPress={() => submitPickup(query.trim())}
                                            disabled={isRequesting}
                                        >
                                            <View style={[styles.suggestionIcon, { backgroundColor: '#000' }]}>
                                                <Ionicons name="checkmark" size={16} color="#F1F443" />
                                            </View>
                                            <Text style={styles.confirmTypedText} numberOfLines={1}>
                                                Use "{query.trim()}"
                                            </Text>
                                            {isRequesting && <ActivityIndicator size="small" color="#aaa" />}
                                        </Pressable>
                                    )}
                                </ScrollView>
                            )}
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
        const targetX = (SCREEN_WIDTH - CARD_WIDTH) / 2;
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
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
        };
    });

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
            <Animated.View ref={cardRef} style={[{ width: CARD_WIDTH, height: CARD_HEIGHT }, inlineCardStyle]}>
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
                    <Animated.View style={[styles.centerContainer, cardContainerStyle]} pointerEvents="box-none">

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
    locationOption: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        backgroundColor: '#f7f7f7',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        minHeight: 70,
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
});
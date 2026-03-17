import React, { useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View, Text, Modal, Pressable } from "react-native";
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
    const illustration = isShuttleMode
        ? require('../../../../assets/city_bus_bro_2.png')
        : require('../../../../assets/chauffeur-car.png');

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
}


const BackContent = ({ booking, shuttleTrip, onClose }: BackContentProps) => {
    const isChauffeurMode = !!booking;
    const driver = booking?.users_chauffeur_bookings_driver_idTousers;
    const chauffeurVehicle = booking?.vehicles;
    const todayStatus = booking?.today_log?.status?.toUpperCase();
    const isDroppedOff = todayStatus === 'DROPPED_OFF' || todayStatus === 'IN_PROGRESS';
    const showRequestCaptain = !!booking?.can_request_driver;

    const shuttleVehicle = shuttleTrip?.routes?.vehicles;
    const shuttleDriver = shuttleTrip?.users;

    const toast = useToast();
    const router = useRouter();
    const [requestNextDayPickup, { isLoading: isRequesting }] = useRequestNextDayPickupMutation();

    const driverName = isChauffeurMode
        ? (driver?.full_name ?? 'Assigning...')
        : (shuttleDriver?.full_name ?? 'Assigning...');
    const driverPhone = isChauffeurMode ? driver?.phone : shuttleDriver?.phone;
    const plateNumber = isChauffeurMode
        ? (chauffeurVehicle?.plate_number ?? '—')
        : (shuttleVehicle?.plate_number ?? '—');
    const vehicleInfo = isChauffeurMode
        ? (chauffeurVehicle ? `${chauffeurVehicle.make} • ${chauffeurVehicle.color}` : '—')
        : (shuttleVehicle ? `${shuttleVehicle.make} • ${shuttleVehicle.model}` : '—');

    const handleAction = async () => {
        if (showRequestCaptain && booking) {
            try {
                let pickupAddress = booking.pickup_address ?? 'Current Location';

                // Attempt to get current location for the pickup address
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    toast.show(
                        <CustomToast
                            type="error"
                            message="Location permission is needed"
                        />,
                        { duration: 3500, position: 'top' }
                    );
                    return;
                }

                const loc = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });
                    
                if (loc) {
                    const reverseGeocoded = await Location.reverseGeocodeAsync({
                        latitude: loc.coords.latitude,
                        longitude: loc.coords.longitude,
                    });
                    
                    if (reverseGeocoded.length > 0) {
                        const addr = reverseGeocoded[0];
                        const fullAddr = [addr.name, addr.street, addr.district, addr.city]
                            .filter(Boolean)
                            .join(', ');
                        if (fullAddr) pickupAddress = fullAddr;
                    }
                }

                await requestNextDayPickup({
                    companyId: booking.companies?.id ?? 0,
                    bookingId: booking.id,
                    pickup_location: pickupAddress
                }).unwrap();

                // Close the modal and start flip animation
                onClose();

                // Wait for flip animation to complete (~500ms) before navigating
                // This prevents visual glitches from overlapping animations
                setTimeout(() => {
                    // Navigate to waiting screen after animation completes
                    router.push({
                        pathname: '/employee/waiting',
                        params: {
                            mode: 'chauffeur',
                            bookingId: String(booking.id),
                            bookingStatus: booking.status,
                            tripType: booking.trip_type,
                            driverName: driver?.full_name ?? 'Captain',
                            driverPhone: driver?.phone ?? '',
                            vehicleDisplay: chauffeurVehicle ? `${chauffeurVehicle.make ?? ''} ${chauffeurVehicle.model ?? ''}`.trim() : '',
                            vehiclePlate: chauffeurVehicle?.plate_number ?? '',
                        },
                    });
                }, 500);
            } catch (error) {
                console.error("Failed to request next day pickup", error);
                toast.show(
                    <CustomToast
                        type="error"
                        message="Failed to request captain. Please try again."
                    />,
                    { duration: 3500, position: 'top' }
                );
            }
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
                            <Text style={styles.infoCellValue}>
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
                <Pressable onPress={handleAction} disabled={isRequesting}>
                    <View style={[styles.actionButton, isRequesting && styles.actionButtonLoading]}>
                        <Text style={styles.buttonText}>
                            {showRequestCaptain ? (isRequesting ? "Requesting..." : "Request Captain") : "Call Captain"}
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
            }, 32); // 2 frames at 60fps guarantees Modal is visible
            return () => clearTimeout(timeout);
        }
    }, [modalVisible, progress]);

    const closeModal = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

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
            zIndex: progress.value < 0.5 ? 1 : 0,
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
            zIndex: progress.value >= 0.5 ? 1 : 0,
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
                        <Animated.View style={[styles.cardAbsolute, frontAnimatedStyle]}>
                            <FrontContent booking={booking} shuttleTrip={shuttleTrip} isLoading={isLoading} isChauffeurEnabled={isChauffeurEnabled} isShuttleEnabled={isShuttleEnabled} />
                        </Animated.View>


                        {/* Back Side */}
                        <Animated.View style={[styles.cardAbsolute, backAnimatedStyle]}>
                            <BackContent booking={booking} shuttleTrip={shuttleTrip} onClose={closeModal} />
                        </Animated.View>


                    </Animated.View>
                </View>
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
});
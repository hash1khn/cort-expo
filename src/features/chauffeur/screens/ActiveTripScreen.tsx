import React, { useMemo, useRef, useState } from 'react';
import { StyleSheet, Text as RNText, View, Pressable, Modal, ActivityIndicator, Linking, TextInput, Image, ScrollView, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { router } from 'expo-router';
import { fontFamily } from '@/core/theme';
import {
    useGetDriverActiveBookingQuery,
    useStartDriverBookingMutation,
    useMarkDriverArrivedMutation,
    useMarkDriverOnboardMutation,
    useMarkDriverDropoffMutation,
    useEndDriverBookingMutation,
    TripStatus,
    getActiveLog,
    ChauffeurDailyLog,
} from '../services';
import { useToast } from '@/shared/ui/molecules/Toast';
import { CustomToast } from '@/features/shared/components/CustomToast';

const Text = (props: React.ComponentProps<typeof RNText>) => {
    return <RNText {...props} style={[{ fontFamily }, props.style]} />;
};

// Maps the backend trip status to what button to show next
type TripStep = 'START_TRIP' | 'MARK_ARRIVED' | 'RESUME_TRIP' | 'MARK_DROPPED_OFF' | 'END_RIDE';

function deriveTripStep(status: TripStatus | undefined, todayLog: ChauffeurDailyLog | null): TripStep {
    // For IN_CITY trips (multi-day or single-day), the active daily log is the true source of truth
    if (todayLog) {
        if (todayLog.status === 'STARTED') {
            // Once they start, start_time is set and they should mark as arrived at the pickup
            return todayLog.start_time ? 'MARK_ARRIVED' : 'START_TRIP';
        }
        switch (todayLog.status) {
            case 'ARRIVED': return 'RESUME_TRIP';
            case 'IN_PROGRESS': return 'MARK_DROPPED_OFF';
            case 'DROPPED_OFF':
            case 'COMPLETED': return 'END_RIDE';
        }
    }

    // Fallback for OUT_STATION (which has no daily logs) or Day 1 before start
    switch (status) {
        case 'OTW':         return 'MARK_ARRIVED';
        case 'ARRIVED':     return 'RESUME_TRIP';
        case 'IN_PROGRESS': return 'MARK_DROPPED_OFF';
        case 'DROPPED_OFF':
        case 'ENDED':
        case 'COMPLETED':   return 'END_RIDE';
        default:            return 'START_TRIP';
    }
}

export function ActiveTripScreen() {
    const bottomSheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ['38%'], []);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const toast = useToast();

    // Outstation Start State
    const [permission, requestPermission] = useCameraPermissions();
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const cameraRef = useRef<CameraView>(null);
    const [startMeterPhoto, setStartMeterPhoto] = useState<string | null>(null);
    const [startMeterValue, setStartMeterValue] = useState('');

    const { data: activeBooking } = useGetDriverActiveBookingQuery();
    const [startDriverBooking, { isLoading: isStartingTrip }] = useStartDriverBookingMutation();
    const [markArrived, { isLoading: isMarkingArrived }] = useMarkDriverArrivedMutation();
    const [markOnboard, { isLoading: isMarkingOnboard }] = useMarkDriverOnboardMutation();
    const [markDropoff, { isLoading: isMarkingDropoff }] = useMarkDriverDropoffMutation();
    const [endTrip, { isLoading: isEndingTrip }] = useEndDriverBookingMutation();

    // Derive buttonStep from server state — use activeLog (not calendar-date-based) to determine true step
    const activeLog = getActiveLog(activeBooking?.chauffeur_trip_daily_logs ?? []);
    const tripStep = deriveTripStep(activeBooking?.status, activeLog);
    const isAnyLoading = isStartingTrip || isMarkingArrived || isMarkingOnboard || isMarkingDropoff || isEndingTrip;

    const totalDays = activeBooking?.no_of_days ?? 1;
    const completedDays = activeBooking?.chauffeur_trip_daily_logs?.filter(l => l.status === 'COMPLETED').length ?? 0;
    const isMultiDayIntermediateEnd = activeBooking?.trip_type === 'IN_CITY' && totalDays > 1 && (completedDays + 1) < totalDays;

    const isDay2Onwards = activeBooking?.trip_type === 'IN_CITY' && completedDays > 0;
    const displayPickupAddress = (isDay2Onwards && activeLog?.pickup_location) 
        ? activeLog.pickup_location 
        : activeBooking?.pickup_address;

    const passengerName =
        activeBooking?.users_chauffeur_bookings_passenger_idTousers?.full_name ?? 'Passenger';
    const initials = passengerName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    const showError = (message: string) => {
        toast.show(
            <CustomToast type="error" message={message} />,
            { duration: 4000, position: 'top', backgroundColor: '#ff4545' }
        );
    };

    const buttonLabel = () => {
        if (isStartingTrip)    return 'Starting...';
        if (isMarkingArrived)  return 'Marking arrived...';
        if (isMarkingOnboard)  return 'Resuming trip...';
        if (isMarkingDropoff)  return 'Marking dropped off...';
        if (isEndingTrip)      return 'Ending day...';
        switch (tripStep) {
            case 'START_TRIP':        return 'Start trip';
            case 'MARK_ARRIVED':      return 'Mark as arrived';
            case 'RESUME_TRIP':       return 'Resume trip';
            case 'MARK_DROPPED_OFF':  return 'Mark as dropped off';
            case 'END_RIDE':          return isMultiDayIntermediateEnd ? 'End day' : 'End ride';
        }
    };

    const handleButtonPress = async () => {
        if (!activeBooking?.id || isAnyLoading) return;
        const id = activeBooking.id;

        if (tripStep === 'START_TRIP') {
            // Confirmation modal handles the API call
            setIsModalVisible(true);
        } else if (tripStep === 'MARK_ARRIVED') {
            try {
                await markArrived({ bookingId: id }).unwrap();
            } catch {
                showError('Could not mark as arrived. Please try again.');
            }
        } else if (tripStep === 'RESUME_TRIP') {
            try {
                await markOnboard({ bookingId: id }).unwrap();
            } catch {
                showError('Could not resume trip. Please try again.');
            }
        } else if (tripStep === 'MARK_DROPPED_OFF') {
            // Confirmation modal handles the API call
            setIsModalVisible(true);
        } else if (tripStep === 'END_RIDE') {
            if (isMultiDayIntermediateEnd) {
                // Multi-day intermediate end - no toll/parking required, just end the log directly via modal
                setIsModalVisible(true);
            } else {
                // Final trip complete - must collect expenses on the end-ride screen
                router.push({
                    pathname: '/chauffeur/end-ride',
                    params: { 
                        tripType: activeBooking?.trip_type,
                        bookingId: activeBooking?.id 
                    },
                });
            }
        }
    };

    const modalTitle = tripStep === 'START_TRIP' ? 'Start this ride?' 
                     : tripStep === 'END_RIDE' ? 'End today\'s trip?'
                     : 'Mark dropped off?';
    
    const modalSubtitle = tripStep === 'START_TRIP' ? 'You want to start this ride now.'
                        : tripStep === 'END_RIDE' ? 'This completes today, but the trip continues tomorrow.'
                        : 'You want to mark this ride as dropped off.';
    
    const modalConfirmLabel = tripStep === 'START_TRIP' ? 'Yes, Start' 
                            : tripStep === 'END_RIDE' ? 'Yes, End day'
                            : 'Yes, Mark';

    const handleModalConfirm = async () => {
        if (!activeBooking?.id) return;
        const id = activeBooking.id;

        if (tripStep === 'START_TRIP') {
            try {
                const isOutstation = activeBooking.trip_type === 'OUT_STATION';
                if (isOutstation && (!startMeterValue || !startMeterPhoto)) {
                    showError('Meter reading and photo are required for OUT_STATION trips.');
                    return;
                }
                
                setIsModalVisible(false);
                await startDriverBooking({ 
                    bookingId: id,
                    ...(isOutstation ? {
                        meter_reading_start: parseFloat(startMeterValue),
                        meter_reading_start_image_url: startMeterPhoto!,
                    } : {})
                }).unwrap();
                
                // Automatically open maps after starting the trip if address exists
                if (displayPickupAddress) {
                    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(displayPickupAddress)}`;
                    Linking.openURL(url).catch(() => {
                        showError('Could not open Google Maps');
                    });
                }
            } catch {
                showError('Ride could not be started. Please try again.');
            }
        } else if (tripStep === 'MARK_DROPPED_OFF') {
            try {
                setIsModalVisible(false);
                await markDropoff({ bookingId: id }).unwrap();
            } catch {
                showError('Could not mark as dropped off. Please try again.');
            }
        } else if (tripStep === 'END_RIDE') {
            try {
                setIsModalVisible(false);
                await endTrip({ bookingId: id, body: {} }).unwrap();
                router.push('/chauffeur');
            } catch {
                showError('Could not complete today\'s trip. Please try again.');
            }
        }
    };

    const handleOpenCamera = async () => {
        if (!permission?.granted) {
            const { granted } = await requestPermission();
            if (!granted) {
                Alert.alert('Camera required', 'Please allow camera access to take the meter photo.');
                return;
            }
        }
        setIsCameraOpen(true);
    };

    const handleCapture = async () => {
        if (!cameraRef.current || isCapturing) return;
        setIsCapturing(true);
        try {
            const result = await cameraRef.current.takePictureAsync({ quality: 0.8 });
            if (result?.uri) {
                setStartMeterPhoto(result.uri);
                setIsCameraOpen(false);
            }
        } catch (e) {
            console.warn('Capture error', e);
        } finally {
            setIsCapturing(false);
        }
    };

    const isOutstationStart = tripStep === 'START_TRIP' && activeBooking?.trip_type === 'OUT_STATION';
    const canSubmitOutstationStart = startMeterValue && startMeterPhoto;

    return (
        <View style={styles.root}>
            {/* Map View */}
            <MapView
                style={StyleSheet.absoluteFillObject}
                initialRegion={{
                    latitude: 37.618,
                    longitude: -122.375,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }}
                showsUserLocation
            />

            {/* Header Strip */}
            <SafeAreaView style={styles.headerContainer} className='rounded-b-3xl' edges={['top']}>
                <View style={styles.headerContent}>
                    <Pressable style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="chevron-back" size={24} color="#000" />
                    </Pressable>
                    <Text style={styles.headerTitle}>Ride In Progress</Text>
                    <View style={{ width: 40 }} />
                </View>
            </SafeAreaView>

            {/* Bottom Sheet Details */}
            <BottomSheet
                ref={bottomSheetRef}
                index={0}
                snapPoints={snapPoints}
                enableDynamicSizing={false}
                enablePanDownToClose={false}
                handleIndicatorStyle={styles.sheetHandle}
                backgroundStyle={styles.sheetBackground}
            >
                <BottomSheetView style={styles.sheetContent}>
                    <View style={styles.passengerRow}>
                        <View style={styles.avatarCircle}>
                            <Text style={styles.avatarInitials}>{initials}</Text>
                        </View>
                        <View style={styles.passengerInfoBox}>
                            <Text style={styles.passengerRole}>PASSENGER</Text>
                            <Text style={styles.passengerName}>{passengerName}</Text>
                        </View>
                    </View>

                    {displayPickupAddress && (
                        <View style={styles.addressSection}>
                            <View style={styles.addressInfo}>
                                <Ionicons name="location-outline" size={20} color="#666" />
                                <View style={styles.addressTextContainer}>
                                    <Text style={styles.addressLabel}>PICKUP ADDRESS</Text>
                                    <Text style={styles.addressValue} numberOfLines={2}>
                                        {displayPickupAddress}
                                    </Text>
                                </View>
                            </View>
                            <Pressable 
                                style={styles.navigateSmallButton}
                                onPress={() => {
                                    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(displayPickupAddress)}`;
                                    Linking.openURL(url);
                                }}
                            >
                                <Ionicons name="navigate-circle" size={32} color="#FF5A00" />
                            </Pressable>
                        </View>
                    )}

                    <View style={styles.divider} />

                    <Pressable
                        style={[styles.primaryButton, isAnyLoading && styles.primaryButtonDisabled]}
                        disabled={isAnyLoading || !activeBooking}
                        onPress={handleButtonPress}
                    >
                        {isAnyLoading && (
                            <ActivityIndicator
                                size="small"
                                color="#FFFFFF"
                                style={{ marginRight: 8 }}
                            />
                        )}
                        <Text style={styles.primaryButtonText}>{buttonLabel()}</Text>
                    </Pressable>
                </BottomSheetView>
            </BottomSheet>

            {/* Confirmation Modal */}
            <Modal
                transparent
                visible={isModalVisible && !isCameraOpen}
                animationType="fade"
                onRequestClose={() => setIsModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Ionicons name="alert-circle-sharp" size={36} color="#FF5A00" style={{ marginBottom: 16 }} />
                        <Text style={styles.modalTitle}>{modalTitle}</Text>
                        
                        {isOutstationStart ? (
                            <View style={{ width: '100%', marginBottom: 20 }}>
                                <Text style={[styles.modalSubtitle, { textAlign: 'left', marginBottom: 8 }]}>Meter Reading</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter start meter"
                                    keyboardType="numeric"
                                    value={startMeterValue}
                                    onChangeText={setStartMeterValue}
                                    placeholderTextColor="#9CA3AF"
                                    maxLength={8}
                                />
                                
                                <Text style={[styles.modalSubtitle, { textAlign: 'left', marginTop: 16, marginBottom: 8 }]}>Meter Photo</Text>
                                {startMeterPhoto ? (
                                    <View>
                                        <Image source={{ uri: startMeterPhoto }} style={{ width: '100%', height: 120, borderRadius: 12, marginBottom: 8 }} resizeMode="cover" />
                                        <Pressable onPress={() => setStartMeterPhoto(null)} style={{ paddingVertical: 8, alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8 }}>
                                            <Text style={{ color: '#FF5A00', fontWeight: 'bold' }}>Retake Photo</Text>
                                        </Pressable>
                                    </View>
                                ) : (
                                    <Pressable
                                        onPress={handleOpenCamera}
                                        style={{ height: 120, borderRadius: 12, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#FF5A00', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <Ionicons name="camera-outline" size={32} color="#9CA3AF" />
                                        <Text style={{ color: '#9CA3AF', fontSize: 13, marginTop: 8, fontWeight: '500' }}>Tap to capture meter photo</Text>
                                    </Pressable>
                                )}
                            </View>
                        ) : (
                            <Text style={styles.modalSubtitle}>{modalSubtitle}</Text>
                        )}

                        <Pressable
                            style={[
                                styles.modalButton, 
                                styles.modalButtonPrimary,
                                (isOutstationStart && !canSubmitOutstationStart) && { opacity: 0.5 }
                            ]}
                            disabled={isOutstationStart && !canSubmitOutstationStart}
                            onPress={handleModalConfirm}
                        >
                            <Text style={styles.modalButtonPrimaryText}>{modalConfirmLabel}</Text>
                        </Pressable>

                        <Pressable
                            style={[styles.modalButton, styles.modalButtonSecondary]}
                            onPress={() => setIsModalVisible(false)}
                        >
                            <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            {/* Camera Fullscreen Modal */}
            <Modal visible={isCameraOpen} animationType="slide">
                <View style={{ flex: 1, backgroundColor: '#000' }}>
                    <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} />
                    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                        <Pressable onPress={() => setIsCameraOpen(false)} style={{ position: 'absolute', top: 50, left: 20, zIndex: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="close" size={28} color="#fff" />
                        </Pressable>
                        <View style={{ position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' }}>
                            <Pressable onPress={handleCapture} disabled={isCapturing} style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#fff' }}>
                                {isCapturing ? <ActivityIndicator color="#fff" /> : <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' }} />}
                            </Pressable>
                            <Text style={{ color: '#fff', marginTop: 8, fontSize: 14, fontWeight: '500' }}>
                                {isCapturing ? 'Capturing…' : 'Tap to capture meter'}
                            </Text>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#FFFFFF' },
    headerContainer: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
        zIndex: 10,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 16,
        paddingTop: 8,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F3F4F6',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#000',
        textAlign: 'center',
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
        paddingHorizontal: 24,
        paddingTop: 10,
        paddingBottom: 30,
    },
    passengerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginVertical: 10,
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
        fontSize: 22,
        fontWeight: '800',
        color: '#F1F443',
    },
    passengerInfoBox: {
        justifyContent: 'center',
    },
    passengerRole: {
        fontSize: 12,
        fontWeight: '700',
        color: '#6B7280',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 2,
    },
    passengerName: {
        fontSize: 20,
        fontWeight: '800',
        color: '#000',
    },
    addressSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F8F8F8',
        padding: 12,
        borderRadius: 12,
        marginTop: 16,
    },
    addressInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    addressTextContainer: {
        marginLeft: 10,
        flex: 1,
    },
    addressLabel: {
        fontSize: 10,
        color: '#999',
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    addressValue: {
        fontSize: 14,
        color: '#333',
        marginTop: 2,
    },
    navigateSmallButton: {
        padding: 4,
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 20,
    },
    primaryButton: {
        display: 'flex',
        flexDirection: 'row',
        backgroundColor: '#FF5A00',
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonDisabled: {
        opacity: 0.7,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderRadius: 28,
        padding: 24,
        alignItems: 'center',
        width: '100%',
        maxWidth: 320,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#000',
        marginBottom: 8,
    },
    modalSubtitle: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 24,
    },
    modalButton: {
        width: '100%',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    modalButtonPrimary: {
        backgroundColor: '#FF5A00',
    },
    modalButtonPrimaryText: {
        color: '#FFF',
        fontSize: 17,
        fontWeight: '700',
    },
    modalButtonSecondary: {
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 0,
    },
    modalButtonSecondaryText: {
        color: '#374151',
        fontSize: 17,
        fontWeight: '700',
    },
    input: {
        width: '100%',
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: '#111827',
    },
});

import React, { useState, useRef } from 'react';
import { View, ScrollView, Pressable, Text as RNText, StyleSheet, Image, Modal, ActivityIndicator, Alert, TextInput } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from "@react-native-vector-icons/feather/static";
import Ionicons from "@react-native-vector-icons/ionicons/static";
import { router, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { fontFamily } from '@/core/theme';
import { useToast } from '@/shared/ui/molecules/Toast';
import { CustomToast } from '@/features/shared/components/CustomToast';
import { useEndDriverBookingMutation } from '../services/chauffeur.api';
import { stopLocationTracking } from '@/services/location/riderLocationService';
import { useLanguage } from '@/i18n/useLanguage';
import {
  buildRtlFormLabelStyle,
  buildRtlPrimaryButtonContainerStyle,
  buildRtlPrimaryButtonTextStyle,
  buildRtlScreenTitleStyle,
  buildRtlSmallSubtitleTextStyle,
  buildRtlStepLabelStyle,
  buildRtlSubtitleTextStyle,
  buildRtlTextInputStyle,
} from '@/i18n/types';
import { BackButton } from '@/components/BackButton';

const Text = (props: React.ComponentProps<typeof RNText>) => {
    return <RNText {...props} style={[{ fontFamily }, props.style]} />;
};

export function EndRideScreen() {
    const { tripType, bookingId, forceComplete } = useLocalSearchParams<{ tripType: string; bookingId: string; forceComplete?: string }>();
    const isForceComplete = forceComplete === 'true';
    const { t, isRTL, language, rtlRowStyle } = useLanguage();
    const tr = (key: string, options?: Record<string, unknown>) =>
        t(`chauffeur:endRide.${key}`, options);
    
    const STEPS = React.useMemo(() => {
        if (tripType === 'IN_CITY') {
            return ['Parking', 'Toll receipt'];
        }
        return ['Meter', 'Parking', 'Toll receipt'];
    }, [tripType]);

    // Translated step labels for display
    const stepLabels = React.useMemo(
        () => STEPS.map((s) => tr(`steps.${s}`)),
        [STEPS, t],
    );

    const [currentStep, setCurrentStep] = useState(0);
    const insets = useSafeAreaInsets();
    const toast = useToast();
    const [endRide, { isLoading: isEnding }] = useEndDriverBookingMutation();

    const [permission, requestPermission] = useCameraPermissions();
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const cameraRef = useRef<CameraView>(null);
    const [photos, setPhotos] = useState<Record<number, string[]>>({
        0: [],
        1: [],
        2: [],
    });

    const [meterValue, setMeterValue] = useState('');
    const [parkingValue, setParkingValue] = useState('');
    const [tollValue, setTollValue] = useState('');

    const handleNext = () => {
        if (STEPS[currentStep] === 'Meter' && photos[currentStep].length === 0) {
            toast.show(
                <CustomToast
                    type="error"
                    message={tr('errorMeterMandatory')}
                />,
                { duration: 3500, position: 'top', backgroundColor: '#ff4545' },
            );
            return;
        }

        if (currentStep < STEPS.length - 1) {
            setCurrentStep((s) => s + 1);
        } else {
            // End the ride logic here
            handleEndRide();
        }
    };

    const handleEndRide = async () => {
        if (!bookingId) return;

        const meterStep = STEPS.indexOf('Meter');
        const parkingStep = STEPS.indexOf('Parking');
        const tollStep = STEPS.indexOf('Toll receipt');

        const meterUrl = meterStep !== -1 ? photos[meterStep]?.[0] : undefined;
        const parkingUrls = parkingStep !== -1 ? (photos[parkingStep] ?? []) : [];
        const tollUrls = tollStep !== -1 ? (photos[tollStep] ?? []) : [];

        try {
            await endRide({
                bookingId: parseInt(bookingId),
                body: {
                    end_time: new Date().toISOString(),
                    meter_reading_end: meterValue ? parseFloat(meterValue) : undefined,
                    expense_parking: parkingValue ? parseFloat(parkingValue) : undefined,
                    expense_toll: tollValue ? parseFloat(tollValue) : undefined,
                    meter_reading_end_image_url: meterUrl,
                    expense_parking_image_urls: parkingUrls.length ? parkingUrls : undefined,
                    expense_toll_image_urls: tollUrls.length ? tollUrls : undefined,
                    ...(isForceComplete ? { force_complete: true } : {}),
                }
            }).unwrap();

            toast.show(
                <CustomToast
                    type="success"
                    message={tr('successMsg')}
                />,
                { duration: 3000, position: 'top' }
            );
            
            // Go back to home
            await stopLocationTracking().catch(console.warn);
            router.push('/chauffeur');
        } catch (err: any) {
            // If the trip was already ENDED in a previous attempt (idempotent retry),
            // treat it as success and navigate home instead of showing an error.
            const errMessage: string = err?.data?.message ?? '';
            if (err?.status === 400 && errMessage.includes('ENDED')) {
                await stopLocationTracking().catch(console.warn);
                router.push('/chauffeur');
                return;
            }
            console.error('End ride error:', err);
            toast.show(
                <CustomToast
                    type="error"
                    message={tr('errorEndRide')}
                />,
                { duration: 3500, position: 'top' }
            );
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep((s) => s - 1);
        }
    };

    const handleOpenCamera = async () => {
        if (!permission?.granted) {
            const { granted } = await requestPermission();
            if (!granted) {
                Alert.alert(tr('cameraRequired'), tr('cameraPermissionMsg'));
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
                setPhotos((prev) => {
                    const updated = { ...prev };
                    if (STEPS[currentStep] === 'Meter') {
                        updated[currentStep] = [result.uri];
                    } else {
                        updated[currentStep] = [...(updated[currentStep] || []), result.uri];
                    }
                    return updated;
                });
                setIsCameraOpen(false);
            }
        } catch (e) {
            console.warn('Capture error', e);
        } finally {
            setIsCapturing(false);
        }
    };

    const inputBaseStyle = {
        width: '100%' as const,
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: '#111827',
    };

    const currentPhotos = photos[currentStep];

    return (
        <SafeAreaView className="flex-1 bg-[#FFFFFF]" edges={['top']}>
            <View className={`flex-row items-center px-4 py-3 pb-0 ${isRTL ? 'justify-end' : ''}`}>
                <BackButton
                    onPress={() => router.back()}
                    anchored={false}
                    iconSize={28}
                    hitSlop={12}
                    className="p-2"
                />
            </View>

            <ScrollView
                className="flex-1 px-6 pt-2"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }} // Reserve space for buttons
            >
                <View
                    className={`mb-4 ${isRTL ? 'items-end' : ''}`}
                    style={isRTL ? { overflow: 'visible' } : undefined}
                >
                    <Text
                        className={isRTL ? 'font-bold text-black' : 'text-[34px] font-bold text-black'}
                        style={buildRtlScreenTitleStyle(language)}
                    >
                        {tr('title')}
                    </Text>
                </View>

                {/* Dynamic instructions based on current step */}
                <Text
                    className={isRTL ? 'text-[#6B7280] font-medium mb-8' : 'text-[#6B7280] text-base font-medium mb-8'}
                    style={buildRtlSubtitleTextStyle(language)}
                >
                    {tr('uploadInstruction', { step: tr(`steps.${STEPS[currentStep]}`) })}
                </Text>

                {/* Step Indicator Container */}
                <View
                    className="w-full flex-row items-center justify-between mb-10 px-2 relative"
                    style={{ height: isRTL ? 78 : 60, overflow: 'visible' }}
                >
                    {/* Connecting Lines */}
                    <View
                        className="absolute flex-row"
                        style={{ height: 2, top: 16, left: 32, right: 32, zIndex: 0 }}
                    >
                        {STEPS.map((_, i) => {
                            if (i === STEPS.length - 1) return null;
                            const isSolid = i < currentStep;

                            return (
                                <View
                                    key={`line-${i}`}
                                    className="flex-1"
                                    style={{ height: 2, overflow: 'hidden' }}
                                >
                                    {isSolid ? (
                                        <View className="w-full h-full bg-[#FF5A00]" />
                                    ) : (
                                        <View
                                            style={{
                                                width: '100%',
                                                height: 1,
                                                borderWidth: 1,
                                                borderColor: '#E5E7EB',
                                                borderStyle: 'dashed',
                                            }}
                                        />
                                    )}
                                </View>
                            );
                        })}
                    </View>

                    {/* Step Nodes */}
                    {STEPS.map((step, index) => {
                        const isCompleted = index < currentStep;
                        const isCurrent = index === currentStep;
                        const isFuture = index > currentStep;

                        return (
                            <View key={step} className="items-center" style={{ width: isRTL ? 76 : 64, zIndex: 1, overflow: 'visible' }}>
                                <View
                                    className="w-8 h-8 rounded-full items-center justify-center mb-2"
                                    style={[
                                        (isCompleted || isCurrent) && { backgroundColor: '#FF5A00' },
                                        isFuture && { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E5E7EB' },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            { fontSize: 13, fontWeight: '700' },
                                            (isCompleted || isCurrent) && { color: '#FFFFFF' },
                                            isFuture && { color: '#D1D5DB' },
                                        ]}
                                    >
                                        {index + 1}
                                    </Text>
                                </View>
                                <Text
                                    className={isRTL ? 'text-center' : 'text-xs text-center'}
                                    style={[
                                        isCompleted && { color: '#4B5563', fontWeight: '500' },
                                        isCurrent && { color: '#111827', fontWeight: '700' },
                                        isFuture && { color: '#9CA3AF', fontWeight: '500' },
                                        buildRtlStepLabelStyle(language),
                                    ]}
                                >
                                    {stepLabels[index]}
                                </Text>
                            </View>
                        );
                    })}
                </View>
                                 <View className="mt-2 mb-4">
                    {STEPS[currentStep] === 'Meter' && (
                        <View style={isRTL ? { overflow: 'visible' } : undefined}>
                            <Text
                                className={isRTL ? 'text-[#111827] font-bold mb-3' : 'text-[#111827] text-base font-bold mb-3'}
                                style={[buildRtlSubtitleTextStyle(language), { fontWeight: '700' }]}
                            >
                                {tr('meterReading')}
                            </Text>
                            <TextInput
                                placeholder={tr('enterMeterReading')}
                                keyboardType="numeric"
                                value={meterValue}
                                onChangeText={setMeterValue}
                                style={[inputBaseStyle, buildRtlTextInputStyle(language)]}
                                placeholderTextColor="#9CA3AF"
                                maxLength={8}
                            />
                        </View>
                    )}
                    {STEPS[currentStep] === 'Parking' && (
                        <View style={isRTL ? { overflow: 'visible' } : undefined}>
                            <Text
                                className={isRTL ? 'text-[#111827] font-bold mb-2' : 'text-[#111827] text-sm font-bold mb-2'}
                                style={buildRtlFormLabelStyle(language)}
                            >
                                {tr('parkingExpense')}
                            </Text>
                            <TextInput
                                placeholder={tr('enterParkingAmount')}
                                keyboardType="numeric"
                                value={parkingValue}
                                onChangeText={setParkingValue}
                                style={[inputBaseStyle, buildRtlTextInputStyle(language)]}
                                placeholderTextColor="#9CA3AF"
                                maxLength={8}
                            />
                        </View>
                    )}
                    {STEPS[currentStep] === 'Toll receipt' && (
                        <View style={isRTL ? { overflow: 'visible' } : undefined}>
                            <Text
                                className={isRTL ? 'text-[#111827] font-bold mb-2' : 'text-[#111827] text-sm font-bold mb-2'}
                                style={buildRtlFormLabelStyle(language)}
                            >
                                {tr('tollExpense')}
                            </Text>
                            <TextInput
                                placeholder={tr('enterTollAmount')}
                                keyboardType="numeric"
                                value={tollValue}
                                onChangeText={setTollValue}
                                style={[inputBaseStyle, buildRtlTextInputStyle(language)]}
                                placeholderTextColor="#9CA3AF"
                                maxLength={8}
                            />
                        </View>
                    )}
                </View>

                {/* Render Dynamic Photo Upload Area */}
                {currentPhotos.length === 0 ? (
                    <Pressable
                        onPress={handleOpenCamera}
                        className="w-full h-64 rounded-2xl bg-[#F9FAFB] border border-[#FF5A00] border-dashed items-center justify-center active:opacity-70"
                    >
                        <Ionicons name="camera-outline" size={48} color="#9CA3AF" />
                        <Text
                            className={isRTL ? 'text-[#9CA3AF] mt-2 font-medium text-center px-4' : 'text-[#9CA3AF] text-sm mt-2 font-medium'}
                            style={[buildRtlSmallSubtitleTextStyle(language), { textAlign: 'center' }]}
                        >
                            {tr('tapToUpload', { step: tr(`steps.${STEPS[currentStep]}`) })}
                        </Text>
                    </Pressable>
                ) : STEPS[currentStep] === 'Meter' ? (
                    <View>
                        <View className="w-full h-80 rounded-2xl overflow-hidden bg-black mb-4">
                            <Image source={{ uri: currentPhotos[0] }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                        </View>
                        <Pressable
                            onPress={() => {
                                setPhotos(prev => ({ ...prev, [currentStep]: [] }));
                                handleOpenCamera();
                            }}
                            className="w-full py-4 rounded-xl items-center justify-center border border-[#D1D5DB] active:opacity-70 bg-white"
                        >
                            <Text className="text-black font-bold text-base">{tr('retake')}</Text>
                        </Pressable>
                    </View>
                ) : (
                    <View className="flex-row flex-wrap gap-4">
                        {currentPhotos.map((uri, idx) => (
                            <View key={idx} className="w-[30%] aspect-square rounded-2xl overflow-hidden bg-black relative">
                                <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                <Pressable
                                    onPress={() => {
                                        setPhotos(prev => {
                                            const updated = { ...prev };
                                            updated[currentStep] = updated[currentStep].filter((_, i) => i !== idx);
                                            return updated;
                                        });
                                    }}
                                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 items-center justify-center"
                                    hitSlop={12}
                                >
                                    <Ionicons name="close" size={16} color="#FFF" />
                                </Pressable>
                            </View>
                        ))}

                        <Pressable
                            onPress={handleOpenCamera}
                            className="w-[30%] aspect-square rounded-2xl bg-[#F9FAFB] border border-[#FF5A00] border-dashed items-center justify-center active:opacity-70"
                        >
                            <Ionicons name="camera-outline" size={28} color="#FF5A00" />
                            <Text className="text-[#FF5A00] text-xs mt-1 font-bold">{tr('add')}</Text>
                        </Pressable>
                    </View>
                )}

   
            </ScrollView>

            {/* Bottom Navigation Buttons */}
            <View
                className="absolute left-0 right-0 px-6 py-4 bg-white border-t border-gray-100 flex-row gap-3"
                style={[{ bottom: Math.max(insets.bottom, 0) }, rtlRowStyle]}
            >
                {currentStep > 0 && (
                    <Pressable
                        onPress={handlePrev}
                        className="flex-1 rounded-2xl items-center justify-center bg-transparent border-2 border-black active:opacity-60"
                        style={[
                            { paddingVertical: 14 },
                            buildRtlPrimaryButtonContainerStyle(language),
                        ]}
                    >
                        <Text
                            className={isRTL ? 'text-black font-bold' : 'text-black text-[17px] font-bold'}
                            style={buildRtlPrimaryButtonTextStyle(language)}
                        >
                            {tr('previous')}
                        </Text>
                    </Pressable>
                )}
                <Pressable
                    onPress={handleNext}
                    disabled={isEnding}
                    className="flex-1 flex-row rounded-2xl items-center justify-center bg-[#FF5A00] active:opacity-90 disabled:opacity-70"
                    style={[
                        { paddingVertical: 14, gap: 8 },
                        rtlRowStyle,
                        buildRtlPrimaryButtonContainerStyle(language),
                    ]}
                >
                    {isEnding && (
                        <ActivityIndicator
                            size="small"
                            color="#FFFFFF"
                        />
                    )}
                    <Text
                        className={isRTL ? 'text-white font-bold' : 'text-white text-[17px] font-bold'}
                        style={buildRtlPrimaryButtonTextStyle(language)}
                    >
                        {currentStep === STEPS.length - 1 ? tr('endRide') : tr('next')}
                    </Text>
                </Pressable>
            </View>
            {/* Camera Modal */}
            <Modal visible={isCameraOpen} animationType="slide">
                <View style={styles.cameraContainer}>
                    <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} />
                    <View style={styles.cameraOverlay} pointerEvents="box-none">
                        <Pressable onPress={() => setIsCameraOpen(false)} style={styles.cameraClose}>
                            <Ionicons name="close" size={28} color="#fff" />
                        </Pressable>
                        <View style={[styles.cameraBottom, { paddingBottom: Math.max(insets.bottom, 24) }]}>
                            <Pressable
                                onPress={handleCapture}
                                disabled={isCapturing}
                                style={styles.captureBtn}
                            >
                                {isCapturing ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <View style={styles.captureBtnInner} />
                                )}
                            </Pressable>
                            <Text style={styles.captureLabel}>
                                {isCapturing ? tr('capturing') : tr('tapToCapture')}
                            </Text>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    cameraContainer: { flex: 1, backgroundColor: '#000' },
    cameraOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-end',
    },
    cameraBottom: {
        alignItems: 'center',
        paddingTop: 24,
    },
    cameraClose: {
        position: 'absolute',
        top: 50,
        left: 20,
        zIndex: 10,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    captureBtn: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(255,255,255,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: '#fff',
    },
    captureBtnInner: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#fff',
    },
    captureLabel: {
        color: '#fff',
        marginTop: 8,
        fontSize: 14,
        fontWeight: '500',
    },
});

import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import MapView from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { router } from 'expo-router';
import { SlideToStartTrip } from '@/features/shuttle/components';
import { useChauffeurStore } from '../store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Step = 'slide' | 'camera_open' | 'preview';

export function StartRideScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState<Step>('slide');
  const [meterImageUri, setMeterImageUri] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = React.useMemo(() => ['50%', '65%'], []);

  const insets = useSafeAreaInsets();
  const { bookings, selectedBookingId, setMeterPhoto, clearTrip } = useChauffeurStore();
  const booking = bookings.find((b) => b.id === selectedBookingId);

  const handleSlideComplete = useCallback(async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert('Camera required', 'Please allow camera access to take the meter photo.');
        return;
      }
    }
    setStep('camera_open');
  }, [permission?.granted, requestPermission]);

  const handleCapture = useCallback(async () => {
    const camera = cameraRef.current;
    if (!camera || isCapturing) return;
    setIsCapturing(true);
    try {
      const result = await camera.takePictureAsync({ quality: 0.8 });
      if (result?.uri) {
        setMeterImageUri(result.uri);
        setStep('preview');
      }
    } catch (e) {
      console.warn('Capture error', e);
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing]);

  const handleRetake = useCallback(() => {
    setStep('camera_open');
  }, []);

  const handleConfirmPhoto = useCallback(() => {
    if (meterImageUri) {
      setMeterPhoto(meterImageUri);
      // After confirming meter photo, go into the active trip flow
      router.replace('/chauffeur/(home)/active-trip');
    }
  }, [meterImageUri, setMeterPhoto]);

  const handleCloseCamera = useCallback(() => {
    if (meterImageUri) {
      setStep('preview');
    } else {
      setStep('slide');
    }
  }, [meterImageUri]);

  if (!booking) {
    return (
      <View style={styles.center}>
        <Text className="text-white">No booking selected.</Text>
        <Pressable onPress={() => router.back()} className="mt-4 px-4 py-2 bg-white/20 rounded-xl">
          <Text className="text-white">Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <MapView
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude: 37.78825,
          longitude: -122.4324,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        }}
        toolbarEnabled={false}
        showsUserLocation={false}
        userInterfaceStyle="dark"
      />

      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose={false}
        backgroundStyle={{ backgroundColor: '#1F1F1D' }}
        handleIndicatorStyle={{ backgroundColor: 'rgba(255,255,255,0.4)' }}
      >
        <BottomSheetView style={styles.sheetContent}>
          <View className="px-5 pb-8">
            {step === 'slide' && (
              <>
                <Text className="text-white text-2xl font-bold mb-1">Ready to start</Text>
                <Text className="text-text-muted text-sm mb-5">
                  {booking.pickup} → {booking.dropoff}
                </Text>
                <View className="rounded-2xl p-4 mb-5 flex-row bg-[#28282a]">
                  <View className="w-10 h-10 rounded-xl items-center justify-center mr-3 bg-[#3a3a3d]">
                    <Ionicons name="person" size={22} color="#856ff6" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white text-base font-semibold">{booking.passengerName}</Text>
                    <Text className="text-text-muted text-sm mt-0.5">{booking.pickupTime}</Text>
                  </View>
                </View>
                <SlideToStartTrip label="Slide to start trip" onComplete={handleSlideComplete} />
              </>
            )}

            {step === 'preview' && meterImageUri && (
              <>
                <Text className="text-white text-2xl font-bold mb-1">Confirm meter photo</Text>
                <Text className="text-text-muted text-sm mb-4">
                  Make sure the meter reading is visible. You can retake if needed.
                </Text>
                <View className="rounded-2xl overflow-hidden bg-[#28282a] mb-4" style={styles.previewWrap}>
                  <Image source={{ uri: meterImageUri }} style={styles.previewImage} resizeMode="cover" />
                </View>
                <View className="flex-row gap-3">
                  <Pressable
                    onPress={handleRetake}
                    className="flex-1 py-3 rounded-xl items-center justify-center border border-white/30 active:opacity-90"
                  >
                    <Text className="text-white font-semibold">Retake</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleConfirmPhoto}
                    className="flex-1 py-3 rounded-xl bg-white items-center justify-center active:opacity-90"
                  >
                    <Text className="text-black font-semibold">Confirm & start</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </BottomSheetView>
      </BottomSheet>

      <Modal visible={step === 'camera_open'} animationType="slide">
        <View style={styles.cameraContainer}>
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} />
          <View style={styles.cameraOverlay} pointerEvents="box-none">
            <Pressable onPress={handleCloseCamera} style={styles.cameraClose}>
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
  root: { flex: 1, backgroundColor: '#0d0c12' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0d0c12' },
  sheetContent: { flex: 1, backgroundColor: '#1F1F1D' },
  previewWrap: { height: 200 },
  previewImage: { width: '100%', height: '100%' },
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  cameraBottom: {
    alignItems: 'center',
    paddingTop: 24,
  },
  captureLabel: {
    color: '#fff',
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
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
});

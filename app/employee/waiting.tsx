import React, { useRef, useCallback } from 'react';
import { View, Text as RNText, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import { fontFamily } from '@/core/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useChauffeurSocket } from '@/hooks/useChauffeurSocket';
import { useAppSelector } from '@/store/hooks';
import * as Linking from 'expo-linking';

const Text = (props: React.ComponentProps<typeof RNText>) => {
    return <RNText {...props} style={[{ fontFamily }, props.style]} />;
};

export default function WaitingScreen() {
    const insets = useSafeAreaInsets();
    const animation = useRef<LottieView>(null);
    const router = useRouter();
    const user = useAppSelector((state) => state.auth.user);

    /**
     * Route params from FlipCard or ShuttleEmployee navigation
     */
    const {
        mode: modeParam,
        bookingId: bookingIdParam,
        bookingStatus: bookingStatusParam,
        tripType: tripTypeParam,
        driverName: driverNameParam,
        driverPhone: driverPhoneParam,
        vehicleDisplay: vehicleDisplayParam,
        vehiclePlate: vehiclePlateParam,
    } = useLocalSearchParams<{
        mode?: 'shuttle' | 'chauffeur';
        bookingId?: string;
        bookingStatus?: string;
        tripType?: string;
        driverName?: string;
        driverPhone?: string;
        vehicleDisplay?: string;
        vehiclePlate?: string;
    }>();

    const mode = modeParam ?? 'chauffeur';
    const isChauffeurMode = mode === 'chauffeur';
    const bookingId = bookingIdParam ? Number(bookingIdParam) : 0;
    const userId = user?.id ?? '';
    const driverPhone = driverPhoneParam ?? '';

    /**
     * Listen to chauffeur socket events.
     * When the driver starts the ride (OTW, IN_PROGRESS, ARRIVED), navigate to ride-active.
     */
    const handleStatusChange = useCallback(
        (data: { bookingId: number; status: string }) => {
            // Only navigate if this status update is for our booking
            if (String(data.bookingId) !== String(bookingId)) return;

            const liveStatuses = ['OTW', 'ARRIVED', 'IN_PROGRESS'];
            if (liveStatuses.includes(data.status)) {
                router.replace({
                    pathname: '/employee/ride-active',
                    params: {
                        mode: 'chauffeur',
                        bookingId: String(bookingId),
                        bookingStatus: data.status,
                        tripType: tripTypeParam ?? '',
                        driverName: driverNameParam ?? 'Captain',
                        driverPhone: driverPhoneParam ?? '',
                        vehicleDisplay: vehicleDisplayParam ?? '',
                        vehiclePlate: vehiclePlateParam ?? '',
                    },
                });
            }
        },
        [
            bookingId,
            router,
            tripTypeParam,
            driverNameParam,
            driverPhoneParam,
            vehicleDisplayParam,
            vehiclePlateParam,
        ]
    );

    useChauffeurSocket({
        bookingId: isChauffeurMode ? bookingId : 0,
        userId,
        onStatusChange: isChauffeurMode ? handleStatusChange : undefined,
    });

    const handleCallCaptain = useCallback(() => {
        if (!driverPhone) return;
        Linking.openURL(`tel:${driverPhone}`).catch((err) =>
            console.warn('Could not open dialer:', err)
        );
    }, [driverPhone]);

    return (
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top, paddingBottom: insets.bottom || 24 }}>
            <View className="flex-1 justify-center items-center px-6">
                <View className="p-8 rounded-[40px] items-center w-full min-h-[420px] justify-center ">
                    <View className="mb-6 items-center justify-center shadow-sm">
                        <LottieView
                            ref={animation}
                            source={require('../../assets/timer-sand.json')}
                            style={{ width: 240, height: 240 }}
                            autoPlay
                            loop
                            speed={1.5}
                        />
                    </View>
                    <View className="mt-4 items-center space-y-2">
                        <Text className="text-slate-900 text-3xl font-extrabold text-center tracking-tight">
                            Driver Notified!
                        </Text>
                        <Text className="text-slate-500 text-lg font-medium text-center mt-3 leading-6 px-4">
                            Your captain is getting ready. The ride will commence shortly.
                        </Text>
                    </View>
                </View>
            </View>

            <View className="px-6 pb-2 pt-4">
                <TouchableOpacity 
                    className="bg-primary flex-row items-center justify-center py-4 rounded-2xl active:opacity-90"
                    onPress={handleCallCaptain}
                    disabled={!driverPhone}
                >
                    <Ionicons name="call" size={22} color="white" style={{ marginRight: 10 }} />
                    <Text className="text-white text-lg font-bold tracking-wide">
                        Call Captain
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

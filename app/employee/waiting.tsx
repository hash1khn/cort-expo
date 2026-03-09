import React, { useRef } from 'react';
import { View, Text as RNText, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import { fontFamily } from '@/core/theme';
import { Ionicons } from '@expo/vector-icons';

const Text = (props: React.ComponentProps<typeof RNText>) => {
    return <RNText {...props} style={[{ fontFamily }, props.style]} />;
};

export default function WaitingScreen() {
    const insets = useSafeAreaInsets();
    const animation = useRef<LottieView>(null);

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
                <TouchableOpacity className="bg-primary flex-row items-center justify-center py-4 rounded-2xl active:opacity-90 ">
                    <Ionicons name="call" size={22} color="white" style={{ marginRight: 10 }} />
                    <Text className="text-white text-lg font-bold tracking-wide">
                        Call Captain
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

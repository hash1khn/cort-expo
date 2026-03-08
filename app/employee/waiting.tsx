import React, { useRef } from 'react';
import { View, Text as RNText } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import { fontFamily } from '@/core/theme';

const Text = (props: React.ComponentProps<typeof RNText>) => {
    return <RNText {...props} style={[{ fontFamily }, props.style]} />;
};

export default function WaitingScreen() {
    const insets = useSafeAreaInsets();
    const animation = useRef<LottieView>(null);

    return (
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
            <View className="flex-1 justify-center items-center px-6">
                <LottieView
                    ref={animation}
                    source={require('../../assets/timer-sand.json')}
                    style={{ width: 280, height: 280 }}
                    autoPlay
                    loop
                    speed={2}
                />
                <View className="mt-8 items-center">
                    <Text className="text-black text-3xl font-bold text-center">
                        Driver has been notified!
                    </Text>
                    <Text className="text-black/50 text-xl font-medium text-center mt-3">
                        Ride will start soon
                    </Text>
                </View>
            </View>
        </View>
    );
}

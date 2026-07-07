import React from 'react';
import { Pressable, Text as RNText, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import {
    DrawerContentScrollView,
    DrawerContentComponentProps,
} from '@react-navigation/drawer';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { logOut } from '@/features/auth/store';
import { logout } from '@/features/auth/services';
import { useLanguage } from '@/i18n/useLanguage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { fontFamily } from '@/core/theme';
import { DrawerLanguagePicker } from '@/components/DrawerLanguagePicker';

const Text = (props: React.ComponentProps<typeof RNText>) => {
    return <RNText {...props} style={[{ fontFamily }, props.style]} />;
};

export function ChauffeurDrawerContent(props: DrawerContentComponentProps) {
    const dispatch = useAppDispatch();
    const user = useAppSelector((state) => state.auth.user);
    const { t, rtlRowStyle, drawerSubTextStyle } = useLanguage();
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [isLoggingOut, setIsLoggingOut] = React.useState(false);

    const handleLogout = async () => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);
        try {
            await logout();
        } catch (error) {
            console.error('Logout failed:', error);
        } finally {
            dispatch(logOut());
            setIsLoggingOut(false);
            router.replace('/(auth)/get-started');
        }
    };

    const fullName = user?.full_name ?? t('common:guest');
    const initials = user?.full_name
        ? user.full_name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()
        : '?';

    return (
        <DrawerContentScrollView
            {...props}
            contentContainerStyle={{ flex: 1, paddingTop: insets.top, paddingBottom: 20 }}
            style={{ backgroundColor: '#1F1F1D' }}
            showsVerticalScrollIndicator={false}
        >
            <View className="px-5 pb-6 flex-1">
                <View className="mt-4">
                    <View className="w-24 h-24 rounded-full bg-white/20 items-center justify-center overflow-hidden">
                        {user?.profile_picture_url ? (
                            <ExpoImage
                                source={{ uri: user.profile_picture_url }}
                                style={{ width: 96, height: 96, borderRadius: 48 }}
                                contentFit="cover"
                            />
                        ) : (
                            <Text className="text-white text-3xl font-bold">{initials}</Text>
                        )}
                    </View>
                    <Text className="text-white text-3xl font-bold mt-3">{fullName}</Text>
                    <Text className="text-gray-400 text-md mt-1">{t('chauffeur:roleLabel')}</Text>
                </View>

                <View className="h-[1px] bg-white/10 w-full my-6" />

                <DrawerLanguagePicker />

                <Pressable
                    onPress={handleLogout}
                    style={rtlRowStyle}
                    className={`mt-auto mb-16 pt-6 flex-row items-center gap-2 py-3 rounded-xl ${isLoggingOut ? 'opacity-50' : ''}`}
                    accessibilityRole="button"
                    accessibilityLabel={t('common:logout')}
                    disabled={isLoggingOut}
                >
                    {isLoggingOut ? (
                        <ActivityIndicator size="small" color="#ef4444" />
                    ) : (
                        <MaterialCommunityIcons name="logout" size={20} color="#EF4444" />
                    )}
                    <Text className="text-base font-semibold text-red-500" style={drawerSubTextStyle}>
                        {isLoggingOut ? t('common:loggingOut') : t('common:logout')}
                    </Text>
                </Pressable>
            </View>
        </DrawerContentScrollView>
    );
}

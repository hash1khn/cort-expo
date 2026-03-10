import React from 'react';
import { Pressable, Text as RNText, View, Image, StyleSheet, ActivityIndicator } from 'react-native';
import {
    DrawerContentScrollView,
    DrawerContentComponentProps,
} from '@react-navigation/drawer';
import { Ionicons, MaterialCommunityIcons, Feather, MaterialIcons } from '@expo/vector-icons';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { logOut } from '@/features/auth/store';
import { logout } from '@/features/auth/services';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fontFamily } from '@/core/theme';
import { useRouter } from 'expo-router';

const Text = (props: React.ComponentProps<typeof RNText>) => {
    return <RNText {...props} style={[{ fontFamily }, props.style]} />;
};

export function EmployeeDrawerContent(props: DrawerContentComponentProps) {
    const dispatch = useAppDispatch();
    const user = useAppSelector((state) => state.auth.user);
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

    const fullName = user?.full_name ?? 'Judy Smith'; // Fallback for UI demo

    return (
        <DrawerContentScrollView
            {...props}
            // Use flexGrow: 1 to ensure the footer can be pushed to the bottom
            contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top, paddingBottom: insets.bottom + 20 }}
            style={{ backgroundColor: '#1F1F1D' }}
            showsVerticalScrollIndicator={false}
        >
            <View className="px-4   flex-1 w-full">
                {/* --- Profile Section --- */}
                <View className="mt-4">
                    {/* Profile Image (Placeholder logic) */}
                    <View className="w-24 h-24 rounded-full bg-white/10 items-center justify-center border border-white/20">
                        <Text className="text-white text-3xl font-bold uppercase">{fullName.charAt(0)}</Text>
                    </View>

                    <View className="flex-row items-center mt-3">
                        <Text className="text-white text-xl font-bold mr-1">
                            {fullName}
                        </Text>
                    </View>

                    <Pressable onPress={() => { }}>
                        <Text className="text-white text-lg font-semibold mt-1">
                            {user?.email}
                        </Text>
                    </Pressable>
                </View>

                {/* --- The "Underline" Separator --- */}
                <View className="h-[1px] bg-white/10 w-full my-6" />

                {/* --- Main Menu Items (The "Three Use Cases") --- */}
                <View className="flex-1">
                    <Pressable
                        onPress={() => props.navigation.navigate('index')}
                        className="py-3 mb-2 flex-row items-center"
                    >
                        <Feather name="home" size={20} color="white" />
                        <Text className="text-white text-xl font-bold ml-4">Home</Text>
                    </Pressable>

                    <Pressable
                        onPress={() => props.navigation.navigate('rides')}
                        className="py-3 mb-2 flex-row items-center"
                    >
                        <MaterialIcons name="history-toggle-off" size={20} color="white" />
                        <Text className="text-white text-xl font-bold ml-4">History</Text>
                    </Pressable>

                    <Pressable
                        onPress={() => { }}
                        className="py-3 mb-2 flex-row items-center"
                    >
                        <MaterialIcons name="report-gmailerrorred" size={20} color="white" />
                        <Text className="text-white text-xl font-bold ml-4">Report a problem</Text>
                    </Pressable>
                </View>

                {/* --- Bottom Section (Premium & Logout) --- */}
                <View className="mt-auto pt-4 mb-[30%]">

                    <View className="h-[1px] bg-white/10 w-full my-6" />
                    <Pressable
                        onPress={handleLogout}
                        className={`flex-row items-center py-4 ${isLoggingOut ? 'opacity-50' : ''}`}
                        accessibilityRole="button"
                        disabled={isLoggingOut}
                    >
                        {isLoggingOut ? (
                            <ActivityIndicator size="small" color="#ef4444" />
                        ) : (
                            <MaterialCommunityIcons name="logout" color="#ef4444" size={20} />
                        )}
                        <Text className="text-red-500 text-lg font-bold ml-3">
                            {isLoggingOut ? 'Logging out...' : 'Log out'}
                        </Text>
                    </Pressable>
                </View>
            </View>
        </DrawerContentScrollView>
    );
}


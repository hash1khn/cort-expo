import React from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  DrawerContentScrollView,
  DrawerContentComponentProps,
} from '@react-navigation/drawer';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { logOut } from '@/features/auth/store';
import { logout } from '@/features/auth/services';
import { useLanguage } from '@/features/shared/context/LanguageContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function ShuttleDrawerContent(props: DrawerContentComponentProps) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const { language, setLanguage } = useLanguage();
  const insets = useSafeAreaInsets();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      dispatch(logOut());
    }
  };
  const fullName = user?.full_name ?? 'Guest';
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
      <View className="px-4 pb-6 flex-1">
        <View className="items-center mt-4">
          <View className="w-24 h-24 rounded-full bg-white/20 items-center justify-center">
            <Text className="text-white text-3xl font-bold">{initials}</Text>
          </View>
          <Text className="text-white text-2xl font-bold mt-3">{fullName}</Text>
          <Text className="text-gray-400 text-sm mt-1">Shuttle Driver</Text>
        </View>

        <View className="mt-6 mb-4">
          <Text className="text-gray-400 text-sm ml-1 mb-2">Details</Text>
          <View className="rounded-xl py-1 bg-white/5">
            <View className="flex-row justify-between items-center py-3 px-4 border-b border-white/10">
              <Text className="text-white text-base">Email</Text>
              <Text className="text-gray-400 text-base font-medium" numberOfLines={1}>
                {user?.email ?? '—'}
              </Text>
            </View>
            <View className="flex-row justify-between items-center py-3 px-4">
              <Text className="text-white text-base">Status</Text>
              <Text className="text-gray-400 text-base font-medium">Shuttle Driver</Text>
            </View>
          </View>
        </View>

        <View className="mt-6">
          <Text className="text-gray-400 text-sm ml-1 mb-3">Language</Text>
          <View className="flex-row rounded-xl overflow-hidden bg-white/5">
            <Pressable
              onPress={() => setLanguage('en')}
              className={`flex-1 py-3 items-center rounded-l-xl ${language === 'en' ? 'bg-[#8B5CF6]' : 'bg-transparent'}`}
            >
              <Text
                className={`text-base font-semibold ${language === 'en' ? 'text-white' : 'text-gray-400'}`}
              >
                English
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setLanguage('ur')}
              className={`flex-1 py-3 items-center rounded-r-xl ${language === 'ur' ? 'bg-[#8B5CF6]' : 'bg-transparent'}`}
            >
              <Text
                className={`text-base font-semibold ${language === 'ur' ? 'text-white' : 'text-gray-400'}`}
              >
                اردو
              </Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          onPress={handleLogout}
          className="mt-auto pt-6 flex-row items-center justify-center gap-2 py-3 rounded-xl bg-white/10"
          accessibilityRole="button"
          accessibilityLabel="Log out"
        >
          <MaterialCommunityIcons name="logout" size={20} color="#EF4444" />
          <Text className="text-base font-semibold text-red-500">Logout</Text>
        </Pressable>
      </View>
    </DrawerContentScrollView>
  );
}

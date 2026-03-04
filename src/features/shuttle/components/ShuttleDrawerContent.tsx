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
      <View className=" px-1 pb-6 flex-1 ">
        <View className=" mt-4">
          <View className="w-24 h-24 rounded-full bg-white/20 items-center justify-center">
            <Text className="text-white text-3xl font-bold">{initials}</Text>
          </View>
          <Text className="text-white text-3xl font-bold mt-3">{fullName}</Text>
          <Text className="text-gray-400 text-md mt-1">Shuttle Driver</Text>
        </View>


        <View className="mt-10">
          <Text className="text-gray-400 text-sm mb-2 font-medium">PREFERENCES</Text>
          <View className="bg-white/10 rounded-2xl overflow-hidden">
            <Pressable
              onPress={() => setLanguage('en')}
              className="flex-row justify-between items-center px-4 py-4 active:bg-white/5 border-b border-white/5"
            >
              <Text className="text-white text-lg font-medium">English</Text>
              {language === 'en' && (
                <MaterialCommunityIcons name="check" size={24} color="#FF5A00" />
              )}
            </Pressable>
            <Pressable
              onPress={() => setLanguage('ur')}
              className="flex-row justify-between items-center px-4 py-4 active:bg-white/5"
            >
              <Text className="text-white text-lg font-medium">اردو (Urdu)</Text>
              {language === 'ur' && (
                <MaterialCommunityIcons name="check" size={24} color="#FF5A00" />
              )}
            </Pressable>
          </View>
        </View>

        <Pressable
          onPress={handleLogout}
          className="mt-auto mb-16 pt-6 flex-row items-center  gap-2 py-3 rounded-xl "
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

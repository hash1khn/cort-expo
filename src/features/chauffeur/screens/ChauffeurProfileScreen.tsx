import React from 'react';
import { Pressable, Text, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logOut } from '@/features/auth/store';
import { logout } from '@/features/auth/services';

export function ChauffeurProfileScreen() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);

  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';

  const handleLogout = async () => {
    await logout();
    dispatch(logOut());
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center px-4 py-3 border-b border-white/10">
        <Pressable onPress={() => router.back()} hitSlop={12} className="p-2 -ml-2">
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text className="text-white text-lg font-semibold ml-2">Profile</Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center gap-4 mb-8">
          <View className="w-16 h-16 rounded-full bg-white/15 items-center justify-center">
            <Text className="text-white text-xl font-bold">{initials}</Text>
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-white text-xl font-bold" numberOfLines={1}>
              {user?.full_name ?? 'Chauffeur'}
            </Text>
            <Text className="text-white/50 text-sm mt-1" numberOfLines={1}>
              {user?.email ?? ''}
            </Text>
          </View>
        </View>

        <View className="rounded-xl bg-surface-background overflow-hidden mb-6">
          <View className="flex-row justify-between items-center py-4 px-4 border-b border-white/5">
            <Text className="text-white text-base font-medium">Role</Text>
            <Text className="text-white/60 text-base">Chauffeur</Text>
          </View>
          <View className="flex-row justify-between items-center py-4 px-4">
            <Text className="text-white text-base font-medium">Phone</Text>
            <Text className="text-white/60 text-base">{user?.phone ?? '—'}</Text>
          </View>
        </View>

        <Pressable
          onPress={() => router.push('/chauffeur/(home)/settings')}
          className="flex-row items-center justify-between py-4 px-4 rounded-xl bg-surface-background mb-6"
        >
          <Text className="text-white text-base font-medium">Settings</Text>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.5)" />
        </Pressable>

        <Pressable
          onPress={handleLogout}
          className="py-4 items-center rounded-xl border border-red-500/50 active:opacity-80"
        >
          <Text className="text-red-400 font-semibold text-base">Log out</Text>
        </Pressable>

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}

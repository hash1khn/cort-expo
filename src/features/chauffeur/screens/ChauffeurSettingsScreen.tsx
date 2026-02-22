import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export function ChauffeurSettingsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center px-4 py-3 border-b border-white/10">
        <Pressable onPress={() => router.back()} hitSlop={12} className="p-2 -ml-2">
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text className="text-white text-lg font-semibold ml-2">Settings</Text>
      </View>

      <View className="flex-1 px-5 pt-6">
        <View className="rounded-xl bg-surface-background py-4 px-4">
          <Text className="text-white/60 text-sm">Settings options coming soon.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

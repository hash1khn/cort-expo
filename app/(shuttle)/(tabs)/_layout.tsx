import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../../src/core/theme';

export default function ShuttleTabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.orange,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { borderTopColor: colors.border },
        tabBarIcon: ({ color, size }) => {
          const icon =
            route.name === 'index'
              ? 'list'
              : route.name === 'overview'
                ? 'map'
                : route.name === 'profile'
                  ? 'person'
                  : 'settings';
          return <Ionicons name={icon as any} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Route' }} />
      <Tabs.Screen name="overview" options={{ title: 'Overview' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}


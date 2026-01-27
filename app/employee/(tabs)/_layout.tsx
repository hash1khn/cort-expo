import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../../src/core/theme';

export default function EmployeeTabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.orange,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { borderTopColor: colors.border }
      })}
    >
      <Tabs.Screen name="(home)" options={{ title: 'Home', headerShown: false, tabBarIcon: ({ color, focused }) => (<Ionicons name="home" color={focused ? color : 'gray'} size={32} />) }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', headerShown: false, tabBarIcon: ({ color, focused }) => (<Ionicons name="person" color={focused ? color : 'gray'} size={32} />) }} />
      {/* <Tabs.Screen name="settings" options={{ title: 'Settings' }} /> */}
    </Tabs>
  );
}


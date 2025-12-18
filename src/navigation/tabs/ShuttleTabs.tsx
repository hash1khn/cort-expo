import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../core/theme';
import { SettingsScreen } from '../../features/shared/screens/SettingsScreen';
import { ShuttleStack } from '../stacks/ShuttleStack';
import { ProfileScreen } from '../../features/shuttle/screens/ProfileScreen';
import { RouteOverviewScreen } from '../../features/shuttle/screens/RouteOverviewScreen';

export type ShuttleTabParamList = {
  Dashboard: undefined;
  Overview: undefined;
  Profile: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<ShuttleTabParamList>();

export function ShuttleTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.orange,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { borderTopColor: colors.border },
        tabBarIcon: ({ color, size }) => {
          const icon =
            route.name === 'Dashboard'
              ? 'list'
              : route.name === 'Overview'
                ? 'map'
                : route.name === 'Profile'
                  ? 'person'
                  : 'settings';
          return <Ionicons name={icon as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={ShuttleStack} options={{ title: 'Route' }} />
      <Tab.Screen name="Overview" component={RouteOverviewScreen} options={{ title: 'Overview' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
}



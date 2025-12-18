import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../core/theme';
import { SettingsScreen } from '../../features/shared/screens/SettingsScreen';
import { ChauffeurStack } from '../stacks/ChauffeurStack';
import { TripRequestsScreen } from '../../features/chauffeur/screens/TripRequestsScreen';
import { EarningsScreen } from '../../features/chauffeur/screens/EarningsScreen';
import { ProfileScreen } from '../../features/chauffeur/screens/ProfileScreen';

export type ChauffeurTabParamList = {
  Dashboard: undefined;
  Requests: undefined;
  Earnings: undefined;
  Profile: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<ChauffeurTabParamList>();

export function ChauffeurTabNavigator() {
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
              ? 'car-sport'
              : route.name === 'Requests'
                ? 'list'
                : route.name === 'Earnings'
                  ? 'cash'
                  : route.name === 'Profile'
                    ? 'person'
                    : 'settings';
          return <Ionicons name={icon as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={ChauffeurStack} options={{ title: 'Drive' }} />
      <Tab.Screen name="Requests" component={TripRequestsScreen} options={{ title: 'Requests' }} />
      <Tab.Screen name="Earnings" component={EarningsScreen} options={{ title: 'Earnings' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
}



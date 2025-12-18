import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { SettingsScreen } from '../../features/shared/screens/SettingsScreen';
import { EmployeeStack } from '../stacks/EmployeeStack';
import { EmployeeProfileScreen } from '../../features/employee/screens/EmployeeProfileScreen';
import { colors } from '../../core/theme';

export type PassengerTabParamList = {
  PassengerHome: undefined;
  Profile: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<PassengerTabParamList>();

export function PassengerTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.orange,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { borderTopColor: colors.border },
        tabBarIcon: ({ color, size }) => {
          const icon =
            route.name === 'PassengerHome'
              ? 'home'
              : route.name === 'Profile'
                ? 'person'
                : 'settings';
          return <Ionicons name={icon as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="PassengerHome"
        component={EmployeeStack}
        options={{ title: 'Home' }}
      />
      <Tab.Screen name="Profile" component={EmployeeProfileScreen} options={{ title: 'Profile' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
}



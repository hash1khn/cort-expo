import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { SettingsScreen } from '../../features/shared/screens/SettingsScreen';
import { EmployeeStack } from '../stacks/EmployeeStack';
import { EmployeeProfileScreen } from '../../features/employee/screens/EmployeeProfileScreen';

export type PassengerTabParamList = {
  PassengerHome: undefined;
  Profile: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<PassengerTabParamList>();

export function PassengerTabNavigator() {
  return (
    <Tab.Navigator>
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



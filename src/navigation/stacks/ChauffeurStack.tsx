import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { DriverDashboardScreen } from '../../features/chauffeur/screens/DriverDashboardScreen';
import { SettingsScreen } from '../../features/shared/screens/SettingsScreen';

export type ChauffeurStackParamList = {
  DriverDashboard: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<ChauffeurStackParamList>();

export function ChauffeurStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="DriverDashboard"
        component={DriverDashboardScreen}
        options={{ title: 'Dashboard', headerShown: false }}
      />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Stack.Navigator>
  );
}



import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ShuttleRouteScreen } from '../../features/shuttle/screens/ShuttleRouteScreen';
import { RouteOverviewScreen } from '../../features/shuttle/screens/RouteOverviewScreen';
import { ShuttleQrScannerScreen } from '../../features/shuttle/screens/ShuttleQrScannerScreen';
import { TripSummaryScreen } from '../../features/shuttle/screens/TripSummaryScreen';
import { SettingsScreen } from '../../features/shared/screens/SettingsScreen';

export type ShuttleStackParamList = {
  ShuttleRoute: undefined;
  RouteOverview: undefined;
  ShuttleQrScanner: undefined;
  TripSummary: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<ShuttleStackParamList>();

export function ShuttleStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ShuttleRoute"
        component={ShuttleRouteScreen}
        options={{ title: 'Route', headerShown: false }}
      />
      <Stack.Screen
        name="RouteOverview"
        component={RouteOverviewScreen}
        options={{ title: 'Route Overview', headerShown: false }}
      />
      <Stack.Screen
        name="ShuttleQrScanner"
        component={ShuttleQrScannerScreen}
        options={{ title: 'Scan', headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen
        name="TripSummary"
        component={TripSummaryScreen}
        options={{ title: 'Summary', headerShown: false }}
      />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Stack.Navigator>
  );
}



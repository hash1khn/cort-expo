import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { DriverDashboardScreen } from '../../features/chauffeur/screens/DriverDashboardScreen';
import { TripRequestsScreen } from '../../features/chauffeur/screens/TripRequestsScreen';
import { EarningsScreen } from '../../features/chauffeur/screens/EarningsScreen';
import { ProfileScreen } from '../../features/chauffeur/screens/ProfileScreen';
import { ActiveTripScreen } from '../../features/chauffeur/screens/ActiveTripScreen';

const Stack = createNativeStackNavigator();

export function ChauffeurStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Dashboard" component={DriverDashboardScreen} />
      <Stack.Screen name="AssignedRides" component={TripRequestsScreen} />
      <Stack.Screen name="ActiveTrip" component={ActiveTripScreen} />
      <Stack.Screen name="Earnings" component={EarningsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}

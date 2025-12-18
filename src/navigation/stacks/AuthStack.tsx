import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { LoginScreen } from '../../features/auth/screens/LoginScreen';
import { RoleSelectScreen } from '../../features/auth/screens/RoleSelectScreen';
import { GetStartedScreen } from '../../features/auth/screens/GetStartedScreen';
import { ChauffeurSignupScreen } from '../../features/auth/screens/ChauffeurSignupScreen';
import { ChauffeurPendingScreen } from '../../features/auth/screens/ChauffeurPendingScreen';

export type AuthStackParamList = {
  GetStarted: undefined;
  Login: undefined;
  RoleSelect: undefined;
  ChauffeurSignup: undefined;
  ChauffeurPending: { email: string };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

type GetStartedProps = NativeStackScreenProps<AuthStackParamList, 'GetStarted'>;

function GetStartedRoute({ navigation }: GetStartedProps) {
  return <GetStartedScreen onGetStarted={() => navigation.navigate('Login')} />;
}

export function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="GetStarted" component={GetStartedRoute} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
      <Stack.Screen name="ChauffeurSignup" component={ChauffeurSignupScreen} />
      <Stack.Screen name="ChauffeurPending" component={ChauffeurPendingScreen} />
    </Stack.Navigator>
  );
}



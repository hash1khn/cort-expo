import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { EmployeeHomeScreen } from '../../features/employee/screens/EmployeeHomeScreen';
import { EmployeeQrScannerScreen } from '../../features/employee/screens/EmployeeQrScannerScreen';
import { BoardingSuccessScreen } from '../../features/employee/screens/BoardingSuccessScreen';
import { EmployeeChauffeurDetailsScreen } from '../../features/employee/screens/EmployeeChauffeurDetailsScreen';
import { useAuthStore } from '../../core/stores/useAuthStore';

export type EmployeeStackParamList = {
  EmployeeHome: undefined;
  EmployeeQrScanner: undefined;
  BoardingSuccess: undefined;
  EmployeeChauffeurDetails: undefined;
};

const Stack = createNativeStackNavigator<EmployeeStackParamList>();

type ScannerProps = NativeStackScreenProps<EmployeeStackParamList, 'EmployeeQrScanner'>;
function EmployeeQrScannerRoute({ navigation }: ScannerProps) {
  return (
    <EmployeeQrScannerScreen
      onClose={() => navigation.goBack()}
      onSuccess={() => navigation.replace('BoardingSuccess')}
    />
  );
}

type SuccessProps = NativeStackScreenProps<EmployeeStackParamList, 'BoardingSuccess'>;
function BoardingSuccessRoute({ navigation }: SuccessProps) {
  const user = useAuthStore((s) => s.user);
  const first = (user?.name ?? 'Sarah').split(' ').filter(Boolean)[0] ?? 'Sarah';
  return <BoardingSuccessScreen userName={first} onDone={() => navigation.popToTop()} />;
}

export function EmployeeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EmployeeHome" component={EmployeeHomeScreen} />
      <Stack.Screen
        name="EmployeeQrScanner"
        component={EmployeeQrScannerRoute}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="BoardingSuccess"
        component={BoardingSuccessRoute}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="EmployeeChauffeurDetails"
        component={EmployeeChauffeurDetailsScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}



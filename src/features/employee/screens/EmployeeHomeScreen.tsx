import React from 'react';
import { useNavigation } from '@react-navigation/native';

import { EmployeeDashboardScreen } from './EmployeeDashboardScreen';

export function EmployeeHomeScreen() {
  const navigation = useNavigation<any>();
  return (
    <EmployeeDashboardScreen
      onScanPress={() => navigation.navigate('EmployeeQrScanner')}
      onPreviewSuccessPress={() => navigation.navigate('BoardingSuccess')}
    />
  );
}



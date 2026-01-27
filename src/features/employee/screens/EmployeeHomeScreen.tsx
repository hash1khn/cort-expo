import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';

import { EmployeeDashboardScreen } from './EmployeeDashboardScreen';
import { useRouter } from 'expo-router';
import { useAppSelector } from '../../../store/hooks';
import { useGetChauffeurBookingsQuery } from '../services/bookingsApi';

export function EmployeeHomeScreen() {
  const navigation = useNavigation<any>();
  const router = useRouter();
  const user = useAppSelector(state => state.auth.user);

  const { data, isLoading, error } = useGetChauffeurBookingsQuery(
    {
      companyId: user?.company_id!,
      employeeId: user?.id!,
    },
    {
      skip: !user?.company_id || !user?.id,
    }
  );

  useEffect(() => {
    if (data?.data) {
      console.log('Fetched chauffeur bookings:', data.data);
    }
  }, [data]);

  return (
    <EmployeeDashboardScreen
      onScanPress={() => navigation.navigate('EmployeeQrScanner')}
      onPreviewSuccessPress={() => navigation.navigate('BoardingSuccess')}
      onChauffeurPress={() => router.push('/employee/(tabs)/(home)/chauffeur-details')}
    />
  );
}

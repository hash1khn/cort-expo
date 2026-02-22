import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';

import { useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { useGetChauffeurBookingsQuery } from '../services/bookingsApi';
import { setChauffeurRide } from '../store';

export function EmployeeHomeScreen() {
  const navigation = useNavigation<any>();
  const router = useRouter();
  const user = useAppSelector(state => state.auth.user);
  const dispatch = useAppDispatch();

  const { data, isLoading } = useGetChauffeurBookingsQuery(
    {
      companyId: (user?.company_id ?? 0) as number,
      employeeId: (user?.id ?? '') as string,
    },
    {
      skip: !user?.company_id || !user?.id,
    }
  );

  useEffect(() => {
    if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
      const first = data.data[0];
      dispatch(
        setChauffeurRide({
          id: first.id,
          driver: first.users_chauffeur_bookings_driver_idTousers
            ? {
                id: first.users_chauffeur_bookings_driver_idTousers.id,
                full_name: first.users_chauffeur_bookings_driver_idTousers.full_name,
                phone: first.users_chauffeur_bookings_driver_idTousers.phone,
              }
            : undefined,
          vehicle: first.vehicles
            ? {
                plate_number: first.vehicles.plate_number,
                make: first.vehicles.make,
                model: first.vehicles.model,
                year: first.vehicles.year,
                color: first.vehicles.color,
              }
            : undefined,
          pickupAddress: first.pickup_address ?? null,
          destinationCities: first.destination_cities ?? null,
        }),
      );
    } else {
      dispatch(setChauffeurRide(null));
    }
  }, [data, dispatch]);

  return (<></>
    // <EmployeeDashboardScreen
    //   onScanPress={() => navigation.navigate('EmployeeQrScanner')}
    //   onPreviewSuccessPress={() => navigation.navigate('BoardingSuccess')}
    //   onChauffeurPress={() => router.push('/employee/(home)/chauffeur-details')}
    //   chauffeurRideLoading={isLoading}
    // />
  );
}

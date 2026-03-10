import React from 'react';
import EmployeeRides from '@/features/employee/screens/EmployeeRides';
import { DrawerScreenWrapper } from '@/features/shared/components/DrawerScreenWrapper';

const Rides = () => {
  return (
    <DrawerScreenWrapper>
      <EmployeeRides />
    </DrawerScreenWrapper>
  );
};

export default Rides;

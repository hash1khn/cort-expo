import React from 'react';
import EmployeeRides from '@/features/employee/screens/EmployeeRides';
import { EmployeeDrawerScreenWrapper } from '@/features/employee/components/EmployeeDrawerScreenWrapper';

const Rides = () => {
  return (
    <EmployeeDrawerScreenWrapper>
      <EmployeeRides />
    </EmployeeDrawerScreenWrapper>
  );
};

export default Rides;

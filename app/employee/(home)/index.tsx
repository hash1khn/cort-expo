import { useEffect } from 'react';
import { EmployeeHomeScreen } from '@/features/employee/screens/EmployeeSession';
import NewHome from '@/features/employee/screens/RideActive';
import { router } from 'expo-router';
import { ShuttleHomeScreen } from '@/features/shuttle/screens/ShuttleHomeScreen';
import ShuttleEmployee from '@/features/employee/screens/ShuttleEmployee';
import EmployeeHome from '@/features/employee/screens/EmployeeHome';

export default function EmployeeHomeRoute() {
  
  return (<ShuttleEmployee/>);
}
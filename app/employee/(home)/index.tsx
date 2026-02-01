import { useEffect } from 'react';
import { EmployeeHomeScreen } from '@/features/employee/screens/EmployeeHomeScreen';
import NewHome from '@/features/employee/screens/NewHome';
import { router } from 'expo-router';
import { ShuttleHomeScreen } from '@/features/shuttle/screens/ShuttleHomeScreen';
import ShuttleEmployee from '@/features/employee/screens/ShuttleEmployee';

export default function EmployeeHomeRoute() {
  
  return (<ShuttleEmployee/>);
}
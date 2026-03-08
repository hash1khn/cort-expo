import ShuttleEmployee from '@/features/employee/screens/ShuttleEmployee';
import { EmployeeDrawerScreenWrapper } from '@/features/employee/components/EmployeeDrawerScreenWrapper';
import EmployeeHomeMap from '@/features/employee/screens/EmployeeHomeMap';
import WaitingScreen from './waiting';

export default function EmployeeHomeRoute() {
  return (
    <EmployeeDrawerScreenWrapper>
      <ShuttleEmployee />
    </EmployeeDrawerScreenWrapper>
  );
}

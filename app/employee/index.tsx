import ShuttleEmployee from '@/features/employee/screens/ShuttleEmployee';
import { EmployeeDrawerScreenWrapper } from '@/features/employee/components/EmployeeDrawerScreenWrapper';

export default function EmployeeHomeRoute() {
  return (
    <EmployeeDrawerScreenWrapper>
      <ShuttleEmployee />
    </EmployeeDrawerScreenWrapper>
  );
}

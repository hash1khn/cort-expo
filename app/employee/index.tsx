import ShuttleEmployee from '@/features/employee/screens/ShuttleEmployee';
import { DrawerScreenWrapper } from '@/features/shared/components/DrawerScreenWrapper';

export default function EmployeeHomeRoute() {
  return (
    <DrawerScreenWrapper>
      <ShuttleEmployee />
    </DrawerScreenWrapper>
  );
}

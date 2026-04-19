import ShuttleEmployee from '@/features/employee/screens/ShuttleEmployee';
import { DrawerScreenWrapper } from '@/features/shared/components/DrawerScreenWrapper';
import RideActive from '@/features/employee/screens/RideActive';
import WaitingScreen from './waiting';

export default function EmployeeHomeRoute() {
  return (
    <DrawerScreenWrapper>
      <ShuttleEmployee />
    </DrawerScreenWrapper>
  );
}

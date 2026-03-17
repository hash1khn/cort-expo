import ShuttleEmployee from '@/features/employee/screens/ShuttleEmployee';
import { DrawerScreenWrapper } from '@/features/shared/components/DrawerScreenWrapper';
import EmployeeHomeMap from '@/features/employee/screens/EmployeeHomeMap';
import WaitingScreen from './waiting';
import RideActive from './ride-active';

export default function EmployeeHomeRoute() {
  return (
    <DrawerScreenWrapper>
      <ShuttleEmployee />
    </DrawerScreenWrapper>
  );
}

import RideInProgress from '@/features/shuttle/screens/RideInProgress';
import { DrawerScreenWrapper } from '@/features/shared/components/DrawerScreenWrapper';

export default function Ride() {
  return (
    <DrawerScreenWrapper>
      <RideInProgress />
    </DrawerScreenWrapper>
  );
}

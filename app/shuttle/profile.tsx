import { ProfileScreen } from '@/features/shuttle/screens/ProfileScreen';
import { DrawerScreenWrapper } from '@/features/shuttle/components/DrawerScreenWrapper';

export default function ShuttleProfileRoute() {
  return (
    <DrawerScreenWrapper>
      <ProfileScreen />
    </DrawerScreenWrapper>
  );
}

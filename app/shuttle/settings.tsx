import { ProfileScreen } from '@/features/shuttle/screens/ProfileScreen';
import { DrawerScreenWrapper } from '@/features/shuttle/components/DrawerScreenWrapper';

export default function ShuttleSettingsRoute() {
  return (
    <DrawerScreenWrapper>
      <ProfileScreen />
    </DrawerScreenWrapper>
  );
}

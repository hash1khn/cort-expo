import { ShuttleDriver } from '@/features/shuttle/screens/ShuttleDriver';
import { DrawerScreenWrapper } from '@/features/shuttle/components/DrawerScreenWrapper';

export default function ShuttleHomeRoute() {
  return (
    <DrawerScreenWrapper>
      <ShuttleDriver />
    </DrawerScreenWrapper>
  );
}

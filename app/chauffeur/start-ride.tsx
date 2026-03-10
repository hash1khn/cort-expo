import { StartRideScreen } from '@/features/chauffeur/screens/StartRideScreen';
import { DrawerScreenWrapper } from '@/features/shared/components/DrawerScreenWrapper';

export default function StartRideRoute() {
  return (
    <DrawerScreenWrapper>
      <StartRideScreen />
    </DrawerScreenWrapper>
  );
}

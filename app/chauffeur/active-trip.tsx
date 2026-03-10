import { ActiveTripScreen } from '@/features/chauffeur/screens/ActiveTripScreen';
import { ChauffeurActiveTripScreen } from '@/features/chauffeur/screens/ChauffeurActiveTripScreen';
import { DrawerScreenWrapper } from '@/features/shared/components/DrawerScreenWrapper';

export default function ChauffeurActiveTripRoute() {
  return (
    <DrawerScreenWrapper>
      <ActiveTripScreen />
    </DrawerScreenWrapper>
  );
}

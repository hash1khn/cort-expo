import { ActiveTripScreen } from '@/features/chauffeur/screens/ActiveTripScreen';
import { ChauffeurHomeScreen } from '@/features/chauffeur/screens/ChauffeurHomeScreen';
import { EndRideScreen } from '@/features/chauffeur/screens/EndRide';
import { IncomingRideRequestScreen } from '@/features/chauffeur/screens/IncomingRideRequestScreen';
import { DrawerScreenWrapper } from '@/features/shared/components/DrawerScreenWrapper';

export default function ChauffeurHomeRoute() {
  return (
    <DrawerScreenWrapper>
      <ChauffeurHomeScreen />
    </DrawerScreenWrapper>
  );
}

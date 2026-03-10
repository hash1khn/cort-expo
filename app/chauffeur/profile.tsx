import { ChauffeurProfileScreen } from '@/features/chauffeur/screens/ChauffeurProfileScreen';
import { DrawerScreenWrapper } from '@/features/shared/components/DrawerScreenWrapper';

export default function ChauffeurProfileRoute() {
  return (
    <DrawerScreenWrapper>
      <ChauffeurProfileScreen />
    </DrawerScreenWrapper>
  );
}

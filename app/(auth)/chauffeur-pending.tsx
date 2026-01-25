import { useLocalSearchParams } from 'expo-router';

import { ChauffeurPendingScreen } from '../../src/features/auth/screens/ChauffeurPendingScreen';

type Params = {
  email?: string;
};

export default function ChauffeurPendingRoute() {
  const params = useLocalSearchParams<Params>();

  return <ChauffeurPendingScreen email={params.email ?? ''} />;
}


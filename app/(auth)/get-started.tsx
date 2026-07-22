import { useRouter } from 'expo-router';

import { GetStartedScreen } from '../../src/features/auth/screens/GetStartedScreen';

export default function GetStartedRoute() {
  const router = useRouter();

  return (
    <GetStartedScreen
      onGetStarted={() => {
        router.navigate('/(auth)/login');
      }}
    />
  );
}


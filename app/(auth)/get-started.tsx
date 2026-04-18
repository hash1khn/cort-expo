import { useRouter } from 'expo-router';

import { GetStartedScreen } from '../../src/features/auth/screens/GetStartedScreen';

export default function GetStartedRoute() {
  const router = useRouter();

  return (
    <GetStartedScreen
      onGetStarted={(role) => {
        if (role === 'driver') {
          router.push('/(auth)/otp-login');
        } else {
          router.push('/(auth)/login');
        }
      }}
    />
  );
}


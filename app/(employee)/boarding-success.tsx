import { useRouter } from 'expo-router';

import { BoardingSuccessScreen } from '../../src/features/employee/screens/BoardingSuccessScreen';
import { useAppSelector } from '../../src/store/hooks';

export default function EmployeeBoardingSuccessRoute() {
  const router = useRouter();
  const user = useAppSelector((state) => state.auth.user);
  const first = (user?.name ?? 'Sarah').split(' ').filter(Boolean)[0] ?? 'Sarah';

  return <BoardingSuccessScreen userName={first} onDone={() => router.replace('/(employee)/(tabs)')} />;
}


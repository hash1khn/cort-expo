import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useAppSelector } from '../src/store/hooks';
import { getHomePathForRole } from '../src/features/auth/utils/getHomePathForRole';

export default function IndexScreen() {
  const router = useRouter();
  const role = useAppSelector((s) => s.auth.role);
  const hasHydrated = useAppSelector((s) => s.auth._hasHydrated);

  useEffect(() => {
    if (!hasHydrated) return;

    if (role != null) {
      router.replace(getHomePathForRole(role) as Parameters<typeof router.replace>[0]);
      // router.replace('/(auth)/get-started')
    } else {
      router.replace('/(auth)/get-started');
    }
  }, [hasHydrated, role, router]);

  // Don't render anything meaningful while waiting for hydration or before redirect
  if (!hasHydrated) return null;

  return null;
}

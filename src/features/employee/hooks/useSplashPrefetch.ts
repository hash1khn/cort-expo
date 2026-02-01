import { useEffect, useRef } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { store } from '../../../store';
import { bookingsApi } from '../services/bookingsApi';
import { tokenStorage } from '../../auth/utils/tokenStorage';

export function useSplashPrefetch(
  fontsLoaded: boolean,
  hasHydrated: boolean,
  isEmployee: boolean,
  userId?: string,
  companyId?: number,
) {
  const hasPrefetchedRef = useRef(false);

  useEffect(() => {
    if (!fontsLoaded || !hasHydrated || hasPrefetchedRef.current) return;

    const handleSplash = async () => {
      const token = await tokenStorage.getAccessToken();

      if (token && isEmployee && userId && companyId) {
        // Prefetch bookings
        const queryPromise = store.dispatch(
          bookingsApi.endpoints.getChauffeurBookings.initiate({
            companyId,
            employeeId: userId,
          }),
        );

        // Wait for query or timeout (5s)
        await Promise.race([
          queryPromise,
          new Promise((resolve) => setTimeout(resolve, 5000)),
        ]);
      }

      SplashScreen.hideAsync().catch(() => {});
      hasPrefetchedRef.current = true;
    };

    handleSplash();
  }, [fontsLoaded, hasHydrated, isEmployee, userId, companyId]);
}

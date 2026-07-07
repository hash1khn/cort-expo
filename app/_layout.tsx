import { Stack, usePathname, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { stopLocationTracking } from '../src/services/location/riderLocationService';
import { RIDER_LOCATION_TASK, ACTIVE_RIDE_KEY } from '../src/services/location/backgroundLocationTask';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
// ⚠️ Must be imported at module scope so the task is registered before any
// component mounts (and before the OS can deliver a background location event).
import '../src/services/location/backgroundLocationTask';
import { NotificationProvider } from '../src/context/NotificationContext';
import { I18nAppProvider } from '../src/i18n/I18nAppProvider';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import '../global.css';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import {
  Montserrat_300Light,
  Montserrat_400Regular,
} from '@expo-google-fonts/montserrat';
import {
  NotoSansArabic_400Regular,
  NotoSansArabic_700Bold,
} from '@expo-google-fonts/noto-sans-arabic';

import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { ToastProviderWithViewport } from '../src/shared/ui/molecules/Toast';
import { store, persistor } from '../src/store';
import { useAppSelector } from '../src/store/hooks';
import { logOut } from '../src/features/auth/store/auth.slice';
import { setOnUnauthorized } from '../src/services/api';
import { useSplashPrefetch } from '../src/features/employee/hooks/useSplashPrefetch';
import { useSocketConnection } from '../src/hooks/useSocketConnection';
import { useNetworkToast } from '../src/hooks/useNetworkToast';
import { useAppLaunchRideCheck } from '../src/hooks/useAppLaunchRideCheck';
import { useProfileSync } from '../src/hooks/useProfileSync';
import { tokenStorage } from '../src/features/auth/utils/tokenStorage';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import { apiFetch } from '../src/services/api';
import { useNotification } from '../src/context/NotificationContext';

SplashScreen.preventAutoHideAsync().catch(() => {
  // no-op (can throw if called twice in dev)
});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND-NOTIFICATION-TASK';

TaskManager.defineTask(
  BACKGROUND_NOTIFICATION_TASK,
  ({ data, error, executionInfo }: TaskManager.TaskManagerTaskBody) => {
    console.log(
      '[BackgroundNotification]',
      JSON.stringify({ data, error, executionInfo }, null, 2),
    );
    return Promise.resolve();
  },
);

Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK).catch((err) => {
  console.warn('[BackgroundNotification] Could not register task (expected in Expo Go):', err.message);
});

function RootLayoutContent() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Montserrat_300Light,
    Montserrat_400Regular,
    Geist: require('../fonts/Geist-VariableFont_wght.ttf'),
    NotoNastaliqUrdu: require('../fonts/NotoNastaliqUrdu-VariableFont_wght.ttf'),
    NotoSansArabic_400Regular,
    NotoSansArabic_700Bold,
  });

  const role = useAppSelector((s) => s.auth.role);
  const user = useAppSelector((s) => s.auth.user);
  const hasHydrated = useAppSelector((s) => s.auth._hasHydrated);

  // Handle both null and undefined, and wait for hydration
  // Use != null to check for both null and undefined
  const isLoggedIn = hasHydrated && (role != null);
  const isChauffeur = role === 'CHAUFFEUR';
  const isDriver = role === 'SHUTTLE_DRIVER';
  const isEmployee = role === 'EMPLOYEE';

  const pathname = usePathname();
  const segments = useSegments();

  // Debug: log where the app is and which guards are active
  useEffect(() => {
    const activeStack = !hasHydrated
      ? '(waiting hydration)'
      : !isLoggedIn
        ? '(auth)'
        : isChauffeur
          ? '(chauffeur)'
          : isDriver
            ? '(shuttle)'
            : isEmployee
              ? 'employee'
              : '(none)';
    console.log('[ROUTE]', {
      pathname,
      segments: segments.slice(),
      hasHydrated,
      isLoggedIn,
      role: role ?? 'null',
      activeStack,
    });
  }, [pathname, segments, hasHydrated, isLoggedIn, role]);

  // On every app boot, if the location task is still registered from a
  // previous crash/force-kill but there is no active ride in storage,
  // the foreground service is orphaned — stop it so the notification clears.
  useEffect(() => {
    TaskManager.isTaskRegisteredAsync(RIDER_LOCATION_TASK).then(async (registered) => {
      if (!registered) return;
      const activeRideId = await AsyncStorage.getItem(ACTIVE_RIDE_KEY);
      if (!activeRideId) {
        await stopLocationTracking().catch(console.warn);
      }
    });
  }, []);

  useSplashPrefetch(fontsLoaded, hasHydrated);

  useEffect(() => {
    setOnUnauthorized(() => store.dispatch(logOut()));
    return () => setOnUnauthorized(null);
  }, []);

  // Load token once auth is hydrated and user is logged in
  const [authToken, setAuthToken] = useState<string | null>(null);
  useEffect(() => {
    if (!isLoggedIn) return;
    tokenStorage.getAccessToken().then((t) => setAuthToken(t ?? null));
  }, [isLoggedIn]);

  const { expoPushToken } = useNotification();

  // Register push token with backend after login
  useEffect(() => {
    if (!isLoggedIn || !expoPushToken) return;
    apiFetch('/notifications/push-token', {
      method: 'POST',
      body: JSON.stringify({ token: expoPushToken, platform: Platform.OS }),
    }).catch((err) => console.warn('[PushToken] register failed:', err));
  }, [isLoggedIn, expoPushToken]);

  // Manage socket connection lifecycle (foreground/background)
  useSocketConnection(authToken);
  useNetworkToast();
  useProfileSync();

  useAppLaunchRideCheck(user?.id, (rideData) => {
    if (rideData.role === 'driver') {
      if (rideData.direction === 'EVENING') {
        router.push('/shuttle/return');
      } else {
        router.push('/shuttle/ride');
      }
    } else {
      router.push({ pathname: '/employee/ride-active', params: { tripId: rideData.tripId } });
    }
  });


  if (!fontsLoaded || !hasHydrated) {
    return null;
  }
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ToastProviderWithViewport>
        <SafeAreaProvider>
          <BottomSheetModalProvider>
            <StatusBar style="auto" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Protected guard={!isLoggedIn}>
                <Stack.Screen name="(auth)" />
              </Stack.Protected>

              <Stack.Protected guard={isLoggedIn}>
                <Stack.Protected guard={isChauffeur}>
                  <Stack.Screen name="chauffeur" />
                </Stack.Protected>

                <Stack.Protected guard={isDriver}>
                  <Stack.Screen name="shuttle" />
                </Stack.Protected>

                <Stack.Protected guard={isEmployee}>
                  <Stack.Screen name="employee" />
                </Stack.Protected>
              </Stack.Protected>

              <Stack.Screen name="+not-found" />
            </Stack>
          </BottomSheetModalProvider>
        </SafeAreaProvider>
      </ToastProviderWithViewport>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <I18nAppProvider>
          <NotificationProvider>
            <RootLayoutContent />
          </NotificationProvider>
        </I18nAppProvider>
      </PersistGate>
    </Provider>
  );
}
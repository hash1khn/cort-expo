import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
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

import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '../src/store';
import { useAppSelector } from '../src/store/hooks';
import { logOut } from '../src/features/auth/store/auth.slice';
import { setOnUnauthorized } from '../src/services/api';

SplashScreen.preventAutoHideAsync().catch(() => {
  // no-op (can throw if called twice in dev)
});

function RootLayoutContent() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Montserrat_300Light,
    Montserrat_400Regular,
  });

  const role = useAppSelector((s) => s.auth.role);
  const hasHydrated = useAppSelector((s) => s.auth._hasHydrated);

  // Handle both null and undefined, and wait for hydration
  // Use != null to check for both null and undefined
  const isLoggedIn = hasHydrated && (role != null);
  const isChauffeur = role === 'CHAUFFEUR';
  const isDriver = role === 'SHUTTLE_DRIVER';
  const isEmployee = role === 'EMPLOYEE';

  useEffect(() => {
    if (fontsLoaded && hasHydrated) {
      SplashScreen.hideAsync().catch(() => { });
    }
  }, [fontsLoaded, hasHydrated]);

  useEffect(() => {
    setOnUnauthorized(() => store.dispatch(logOut()));
    return () => setOnUnauthorized(null);
  }, []);

  // Wait for both fonts and hydration before rendering
  if (!fontsLoaded || !hasHydrated) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!isLoggedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>

        <Stack.Protected guard={isLoggedIn}>
          <Stack.Protected guard={isChauffeur}>
            <Stack.Screen name="(chauffeur)" />
          </Stack.Protected>

          <Stack.Protected guard={isDriver}>
            <Stack.Screen name="(shuttle)" />
          </Stack.Protected>

          <Stack.Protected guard={isEmployee}>
            <Stack.Screen name="employee/(tabs)" />
          </Stack.Protected>
        </Stack.Protected>

        <Stack.Screen name="+not-found" />
      </Stack>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <RootLayoutContent />
      </PersistGate>
    </Provider>
  );
}


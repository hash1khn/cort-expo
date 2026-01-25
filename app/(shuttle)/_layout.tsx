import { Stack } from 'expo-router';

export default function ShuttleLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="route" />
      <Stack.Screen name="route-overview" />
      <Stack.Screen name="qr-scanner" />
      <Stack.Screen name="trip-summary" />
      <Stack.Screen name="stops" />
      <Stack.Screen name="passenger-manifest" />
    </Stack>
  );
}


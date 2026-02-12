import { Stack } from 'expo-router';

export default function ShuttleHomeLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="ride" />
      <Stack.Screen name="return" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="shuttle-driver" />
    </Stack>
  );
}

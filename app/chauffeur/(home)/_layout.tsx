import { Stack } from 'expo-router';

export default function ChauffeurHomeLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="booking-detail" />
      <Stack.Screen name="start-ride" />
      <Stack.Screen name="active-trip" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}

import { Stack } from 'expo-router';

export default function ChauffeurLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="active-trip" />
    </Stack>
  );
}


import { Stack } from 'expo-router';

export default function EmployeeLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="qr-scanner" />
      <Stack.Screen name="boarding-success" />
      <Stack.Screen name="chauffeur-details" />
    </Stack>
  );
}


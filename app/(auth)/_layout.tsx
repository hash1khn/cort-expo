import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="get-started" />
      <Stack.Screen name="login" />
      <Stack.Screen name="role-select" />
      <Stack.Screen name="chauffeur-signup" />
      <Stack.Screen name="chauffeur-pending" />
    </Stack>
  );
}


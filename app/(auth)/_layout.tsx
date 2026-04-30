import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="get-started" />
      <Stack.Screen name="login" />
    </Stack>
  );
}


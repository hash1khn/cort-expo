import { Stack } from "expo-router";

export default function layout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="chauffeur-details" />
            <Stack.Screen name="qr-scanner" />
        </Stack>
    )
}
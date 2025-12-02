import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="select-role" />
        <Stack.Screen name="login" />
        <Stack.Screen name="client-dashboard" />
        <Stack.Screen name="company-dashboard" />
        <Stack.Screen name="book-appointment" />
        <Stack.Screen name="my-appointments" />
        <Stack.Screen name="client-profile" />
        <Stack.Screen name="company-reservations" />
        <Stack.Screen name="company-analytics" />
      </Stack>
      <StatusBar style="light" backgroundColor="#0C553C" />
    </>
  );
}

import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#1a1a2e' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="scan-sms" />
        <Stack.Screen name="add-expense" />
        <Stack.Screen name="expenses" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="expense/[id]" />
      </Stack>
    </SafeAreaProvider>
  );
}

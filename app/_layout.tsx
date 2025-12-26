import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="(tabs)" 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen
        name="settings"
        options={{
          title: 'Settings',
          presentation: 'modal',
          headerBackTitle: 'Back',
          headerTitleStyle: {
            fontWeight: '700',
          },
        }}
      />
    </Stack>
  );
}

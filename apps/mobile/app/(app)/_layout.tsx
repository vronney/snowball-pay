import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { Screen, StateView } from '@/components/ui';

/** Everything under (app) requires a signed-in user. */
export default function AppLayout() {
  const { status } = useAuth();
  if (status === 'loading') {
    return (
      <Screen scroll={false}>
        <StateView kind="loading" />
      </Screen>
    );
  }
  if (status === 'signedOut') return <Redirect href="/calculator" />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#f8fafc' } }}>
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="debt/[id]/extra" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

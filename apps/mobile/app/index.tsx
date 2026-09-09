import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { Screen, StateView } from '@/components/ui';

/** Signed-in users land on their saved plan; everyone else gets the free calculator. */
export default function Index() {
  const { status } = useAuth();
  if (status === 'loading') {
    return (
      <Screen scroll={false}>
        <StateView kind="loading" />
      </Screen>
    );
  }
  return <Redirect href={status === 'signedIn' ? '/(app)/dashboard' : '/calculator'} />;
}

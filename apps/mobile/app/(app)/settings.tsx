import React, { useState } from 'react';
import { Alert, Linking, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Body, Button, Card, Eyebrow, LinkText, Muted, Screen, Tag, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useDeleteAccount, useSubscription } from '@/lib/queries';
import { config } from '@/lib/config';
import { monthYear } from '@/lib/format';

/**
 * Screen 7 — settings. Sign out, subscription status, and in-app account
 * deletion (App Store requirement; wired to the same teardown the web uses).
 */
export default function SettingsScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const subscription = useSubscription();
  const deleteAccount = useDeleteAccount();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const confirmDelete = () => {
    Alert.alert(
      'Delete your account?',
      'This permanently removes your debts, payments, and plan, cancels any subscription, and disconnects linked banks. It cannot be undone.',
      [
        { text: 'Keep my account', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: async () => {
            setDeleteError(null);
            try {
              await deleteAccount.mutateAsync();
              await signOut();
              router.replace('/calculator');
            } catch (e) {
              setDeleteError(e instanceof Error ? e.message : 'Deletion failed. Try again or email support.');
            }
          },
        },
      ],
    );
  };

  const sub = subscription.data;

  return (
    <Screen>
      <View className="mb-4 flex-row items-center justify-between">
        <Title>Settings</Title>
        <LinkText title="Done" onPress={() => router.back()} />
      </View>

      <Eyebrow>Plan</Eyebrow>
      <Card className="mb-4 mt-1">
        {subscription.isPending ? (
          <Muted>Loading…</Muted>
        ) : sub ? (
          <>
            <View className="flex-row items-center gap-2">
              <Body className="font-semibold">{sub.proEligible ? 'SnowballPay Pro' : 'Free plan'}</Body>
              {sub.signupTrialActive ? <Tag tone="primary">Trial</Tag> : null}
            </View>
            <Muted className="mt-1">
              {sub.signupTrialActive && sub.signupTrialEndsAt
                ? `Pro included until ${monthYear(sub.signupTrialEndsAt)}.`
                : sub.proEligible
                  ? 'Unlimited debts, custom order, exports and AI recommendations.'
                  : `Free holds ${config.freeDebtLimit} debts. Pro is $${config.proMonthlyPrice}/mo.`}
            </Muted>
            <Muted className="mt-2">In-app upgrade is coming in the next release. Subscriptions are managed on getsnowballpay.com for now.</Muted>
          </>
        ) : (
          <Muted>Couldn't load your plan status.</Muted>
        )}
      </Card>

      <Eyebrow>Account</Eyebrow>
      <Card className="mb-4 mt-1">
        <Button title="Sign out" variant="quiet" onPress={async () => { await signOut(); router.replace('/calculator'); }} />
        <View className="my-3 h-px bg-line" />
        <Button title="Delete account" variant="danger" onPress={confirmDelete} loading={deleteAccount.isPending} />
        {deleteError ? <Muted className="mt-2 text-error">{deleteError}</Muted> : null}
        <Muted className="mt-2">Deletes your data here and at Auth0, cancels billing, and disconnects any linked banks.</Muted>
      </Card>

      <Eyebrow>Legal</Eyebrow>
      <View className="mt-1 flex-row gap-5">
        <LinkText title="Privacy" onPress={() => Linking.openURL(`${config.apiUrl}/privacy`)} />
        <LinkText title="Terms" onPress={() => Linking.openURL(`${config.apiUrl}/terms`)} />
        <LinkText title="Support" onPress={() => Linking.openURL(`${config.apiUrl}/contact`)} />
      </View>
    </Screen>
  );
}

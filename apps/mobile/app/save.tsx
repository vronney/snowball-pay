import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';
import { Body, Button, Card, LinkText, Muted, Num, ProgressSteps, Screen, Title } from '@/components/ui';
import { PlanHero } from '@/components/PlanHero';
import { useAuth } from '@/lib/auth';
import { api, ApiError } from '@/lib/api';
import { useCalculate, useSavePlan } from '@/lib/queries';
import { money } from '@/lib/format';
import { authConfigured, config } from '@/lib/config';
import type { Debt } from '@/lib/types';
import { PLAN_STEPS, toCalculateInput, toSavePayload, useCalculatorStore } from '@/store/calculator';

/**
 * Screen 3 — the save gate. The CTA is "Save my plan", never "Sign up":
 * signup is the last step of something already built. Progress starts at
 * 2 of 3 because the calculator inputs were step 1.
 */
export default function SaveScreen() {
  const router = useRouter();
  const { status, signIn } = useAuth();
  const savePlan = useSavePlan();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const s = useCalculatorStore(
    useShallow((st) => ({
      rows: st.rows,
      takeHome: st.takeHome,
      essential: st.essential,
      extra: st.extra,
      method: st.method,
      planName: st.planName,
    })),
  );
  const input = useMemo(() => toCalculateInput(s), [s]);
  const plan = useCalculate(input);
  const payload = useMemo(() => toSavePayload(s), [s]);
  const interest = plan.data?.result.totalInterestPaid ?? 0;

  const handleSave = async () => {
    if (!payload) return;
    setError(null);
    setBusy(true);
    try {
      if (status !== 'signedIn') {
        const ok = await signIn();
        if (!ok) {
          setError(authConfigured ? "Sign-in didn't complete. Your plan is still here — try again." : 'Sign-in is not configured in this build.');
          return;
        }
      }

      // An existing web user pressing "Save my plan" already has a plan on
      // the server; never duplicate their debts. Send them to it instead.
      const existing = await api<{ debts: Debt[] }>('/api/debts');
      if (existing.debts.length > 0) {
        router.replace({ pathname: '/(app)/dashboard', params: { existing: '1' } });
        return;
      }

      const result = await savePlan.mutateAsync(payload);
      router.replace({
        pathname: '/(app)/dashboard',
        params: result.skippedDebts > 0 ? { skipped: String(result.skippedDebts) } : {},
      });
    } catch (e) {
      if (e instanceof ApiError && e.isUpgradeRequired) {
        setError(
          `The free plan holds ${config.freeDebtLimit} debts and this plan has ${payload.debts.length}. Pro ($${config.proMonthlyPrice}/mo) keeps all of them — this plan is working against ${money(interest)} in interest.`,
        );
      } else {
        setError(e instanceof Error ? e.message : 'Something went wrong. Your plan is still here.');
      }
    } finally {
      setBusy(false);
    }
  };

  if (!payload) {
    return (
      <Screen>
        <Title>Nothing to save yet</Title>
        <Button title="Back to calculator" className="mt-4" onPress={() => router.replace('/calculator')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ProgressSteps step={2} total={3} labels={PLAN_STEPS} />
      <Title>{s.planName.trim() || 'Your plan'} is ready</Title>
      <Muted className="mb-4 mt-1">
        {payload.debts.length} {payload.debts.length === 1 ? 'debt' : 'debts'} · {s.method} · {money(payload.income.extraPayment)} extra/mo
      </Muted>

      <PlanHero plan={plan.data} isLoading={plan.isFetching} isError={plan.isError} compact />

      <Card className="mb-4 mt-4">
        <Body className="font-semibold">Saving keeps this plan on every device</Body>
        <Muted className="mt-1">
          Log payments, add one-tap extra payments, and watch <Num className="text-[13px] text-muted">{money(interest)}</Num> of projected interest shrink. Without saving, this plan lives only on this screen.
        </Muted>
      </Card>

      {error ? <Muted className="mb-3 text-error">{error}</Muted> : null}
      <Button title="Save my plan" onPress={handleSave} loading={busy} />
      <View className="mt-3 items-center">
        <LinkText title="Keep exploring without saving" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

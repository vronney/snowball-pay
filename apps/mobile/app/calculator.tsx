import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { keepPreviousData } from '@tanstack/react-query';
import { useShallow } from 'zustand/react/shallow';
import { Body, Button, Card, Eyebrow, Field, Heading, LinkText, Muted, Num, Screen, Title } from '@/components/ui';
import { PlanHero } from '@/components/PlanHero';
import { DebtRowEditor } from '@/components/DebtRowEditor';
import { useAuth } from '@/lib/auth';
import { useCalculate } from '@/lib/queries';
import { useDebounced } from '@/lib/hooks';
import { money, monthYear, parseNumericInput } from '@/lib/format';
import { ESTIMATE_DISCLOSURE } from '@/lib/estimates';
import { isPlanUnfinished, monthFromNow } from '@/lib/plan';
import { authConfigured } from '@/lib/config';
import { toCalculateInput, useCalculatorStore } from '@/store/calculator';

/**
 * Screen 1 — the free, no-login calculator. Opens pre-filled with realistic
 * numbers so a payoff date renders before the visitor types anything.
 */
export default function CalculatorScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  const s = useCalculatorStore(
    useShallow((st) => ({
      rows: st.rows,
      takeHome: st.takeHome,
      essential: st.essential,
      extra: st.extra,
      method: st.method,
      isSample: st.isSample,
    })),
  );
  const { addRow, setBudget, clearSample, reset } = useCalculatorStore(
    useShallow((st) => ({ addRow: st.addRow, setBudget: st.setBudget, clearSample: st.clearSample, reset: st.reset })),
  );

  const input = useMemo(() => toCalculateInput(s), [s]);
  const debounced = useDebounced(input);
  const plan = useCalculate(debounced, { placeholderData: keepPreviousData });

  const extraNum = parseNumericInput(s.extra) ?? 0;
  const available = plan.data?.availableForDebt ?? null;
  const overBudget = available !== null && extraNum > available;

  const handleSignIn = async () => {
    setSigningIn(true);
    setSignInError(null);
    const ok = await signIn();
    setSigningIn(false);
    if (ok) router.replace('/(app)/dashboard');
    else setSignInError(authConfigured ? "Sign-in didn't complete. Try again." : 'Sign-in is not configured in this build.');
  };

  return (
    <Screen>
      <View className="mb-4 flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Title>When will you be debt-free?</Title>
          <Muted className="mt-1">Free. No account. Every number on this screen is yours to keep.</Muted>
        </View>
        <LinkText title={signingIn ? 'Signing in…' : 'Sign in'} onPress={signingIn ? () => {} : handleSignIn} />
      </View>
      {signInError ? <Muted className="mb-3 text-error">{signInError}</Muted> : null}

      <PlanHero
        plan={plan.data}
        isLoading={plan.isFetching}
        isError={plan.isError}
        error={plan.error}
        sample={s.isSample}
      />

      <View className="mb-2 mt-6 flex-row items-center justify-between">
        <Heading>Your debts</Heading>
        <LinkText title={s.isSample ? 'Start blank' : 'Load sample'} onPress={s.isSample ? clearSample : reset} />
      </View>
      {s.rows.map((row, i) => (
        <DebtRowEditor key={row.id} row={row} index={i} canRemove={s.rows.length > 1} />
      ))}
      <Button title="+ Add another debt" variant="quiet" onPress={addRow} className="mb-6" />

      <Heading className="mb-2">Your budget</Heading>
      <Card className="mb-2">
        <Field
          label="Extra toward debt each month"
          prefix="$"
          keyboardType="decimal-pad"
          value={s.extra}
          onChangeText={(v) => setBudget('extra', v)}
          hint="Beyond minimums. This is the number that moves your date."
        />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Field
              label="Monthly take-home"
              prefix="$"
              keyboardType="decimal-pad"
              value={s.takeHome}
              onChangeText={(v) => setBudget('takeHome', v)}
              placeholder="optional"
            />
          </View>
          <View className="flex-1">
            <Field
              label="Essentials"
              prefix="$"
              keyboardType="decimal-pad"
              value={s.essential}
              onChangeText={(v) => setBudget('essential', v)}
              placeholder="optional"
            />
          </View>
        </View>
        {overBudget ? (
          <Muted className="text-amber-700">
            Your budget shows {money(Math.max(0, available ?? 0))} left after essentials and minimums — the date above assumes {money(extraNum)} extra.
          </Muted>
        ) : null}
      </Card>
      {plan.data?.usesEstimates ? <Muted className="mb-4">{ESTIMATE_DISCLOSURE}</Muted> : null}

      {plan.data && plan.data.result.payoffSchedule.length > 0 && !isPlanUnfinished(plan.data.result) ? (
        <>
          <Heading className="mb-2 mt-4">Payoff order</Heading>
          <Card className="mb-6">
            {plan.data.result.payoffSchedule.map((step, i) => {
              const paidOff = monthFromNow(step.monthPaidOff);
              return (
                <View
                  key={step.debtId}
                  className={`flex-row items-center py-2 ${i > 0 ? 'border-t border-line' : ''}`}
                >
                  <View className="mr-3 h-6 w-6 items-center justify-center rounded-full bg-slate-100">
                    <Num className="text-[12px]">{step.orderInPayoff}</Num>
                  </View>
                  <View className="flex-1">
                    <Body className="font-semibold">{step.debtName}</Body>
                    <Muted>{money(step.interestPaid)} interest</Muted>
                  </View>
                  <Num className="text-[14px]">{monthYear(paidOff)}</Num>
                </View>
              );
            })}
          </Card>
        </>
      ) : null}

      <Eyebrow>Next</Eyebrow>
      <Body className="mb-3 mt-1">Pick snowball or avalanche, name your plan, and set the order you'll attack.</Body>
      <Button title="Build my plan" onPress={() => router.push('/plan')} disabled={!input} />
    </Screen>
  );
}

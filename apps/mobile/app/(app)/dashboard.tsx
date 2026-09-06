import React, { useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View, type RefreshControlProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Body, Button, Card, Eyebrow, Heading, LinkText, Muted, Num, StateView, Tag, Title, colors } from '@/components/ui';
import { PlanHero } from '@/components/PlanHero';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';
import { planInputFromServer, useCalculate, useDebts, useIncome, useSubscription } from '@/lib/queries';
import { money, monthYear } from '@/lib/format';
import type { Debt } from '@/lib/types';

/**
 * Screen 4 — the saved plan. Debt-free date first on every visit, then the
 * debt list where each row is one tap from an extra payment (the wedge).
 */
export default function DashboardScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const params = useLocalSearchParams<{ existing?: string; skipped?: string }>();

  const debts = useDebts();
  const income = useIncome();
  const subscription = useSubscription();

  const planInput = useMemo(
    () => planInputFromServer(debts.data ?? [], income.data ?? null),
    [debts.data, income.data],
  );
  const plan = useCalculate(planInput);

  const refreshing = debts.isRefetching || income.isRefetching;
  const refresh = () => {
    debts.refetch();
    income.refetch();
    subscription.refetch();
  };

  const error = debts.error ?? income.error;
  if (error instanceof ApiError && error.isUnauthorized) {
    return (
      <Container>
        <StateView
          kind="error"
          title="Session expired"
          message="Sign in again to load your plan."
          action={<Button title="Sign in" onPress={() => signOut()} />}
        />
      </Container>
    );
  }

  if (debts.isPending || income.isPending) {
    return (
      <Container>
        <StateView kind="loading" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <StateView
          kind="error"
          message={error instanceof Error ? error.message : undefined}
          action={<Button title="Try again" variant="quiet" onPress={refresh} />}
        />
      </Container>
    );
  }

  const list = debts.data ?? [];
  const active = list.filter((d) => d.balance > 0.01);
  const original = list.reduce((s, d) => s + Math.max(d.originalBalance, d.balance), 0);
  const remaining = list.reduce((s, d) => s + d.balance, 0);
  const paidShare = original > 0 ? Math.min(1, (original - remaining) / original) : 0;

  const schedule = new Map(plan.data?.result.payoffSchedule.map((s) => [s.debtId, s]) ?? []);
  const planStart = plan.data?.result.monthlyBalances[0]?.date;

  return (
    <Container
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
    >
      <View className="mb-4 flex-row items-center justify-between">
        <View>
          <Eyebrow>Your plan</Eyebrow>
          <Title className="text-[24px] leading-8">
            {subscription.data?.proEligible ? 'Pro' : 'Free'} · {active.length} {active.length === 1 ? 'debt' : 'debts'}
          </Title>
        </View>
        <LinkText title="Settings" onPress={() => router.push('/(app)/settings')} />
      </View>

      {params.existing === '1' ? (
        <Card className="mb-3 border-tint-border bg-tint">
          <Body className="font-semibold">Your saved plan is loaded.</Body>
          <Muted>The calculator numbers weren't added — this plan already exists on your account.</Muted>
        </Card>
      ) : null}
      {params.skipped ? (
        <Card className="mb-3 border-amber-200 bg-amber-50">
          <Body className="font-semibold">{params.skipped} {params.skipped === '1' ? 'debt' : 'debts'} didn't fit the free plan.</Body>
          <Muted>Free holds 5 debts. Pro keeps all of them — manage your plan at getsnowballpay.com.</Muted>
        </Card>
      ) : null}

      {active.length === 0 ? (
        <StateView
          kind="empty"
          title="No debts on your plan yet"
          message="Build one in the calculator and save it here."
          action={<Button title="Open calculator" onPress={() => router.push('/calculator')} />}
        />
      ) : !income.data ? (
        <StateView
          kind="empty"
          title="Add your budget to get a date"
          message="Your plan needs monthly take-home and essentials. Set them on getsnowballpay.com — mobile budget editing lands next."
        />
      ) : (
        <>
          <PlanHero plan={plan.data} isLoading={plan.isFetching} isError={plan.isError} error={plan.error} />

          <Card className="mt-3">
            <View className="mb-2 flex-row items-center justify-between">
              <Muted>Paid so far</Muted>
              <Num className="text-[14px]">{Math.round(paidShare * 100)}%</Num>
            </View>
            <View className="h-2 overflow-hidden rounded-full bg-slate-200">
              <View className="h-full rounded-full bg-primary" style={{ width: `${Math.round(paidShare * 100)}%` }} />
            </View>
            <View className="mt-2 flex-row justify-between">
              <Muted>{money(original - remaining)} down</Muted>
              <Muted>{money(remaining)} to go</Muted>
            </View>
          </Card>

          <Heading className="mb-2 mt-6">Debts</Heading>
          {active.map((debt) => (
            <DebtRow
              key={debt.id}
              debt={debt}
              paidOffLabel={
                schedule.get(debt.id) && planStart
                  ? paidOffMonth(planStart, schedule.get(debt.id)!.monthPaidOff)
                  : undefined
              }
              onExtra={() => router.push({ pathname: '/(app)/debt/[id]/extra', params: { id: debt.id } })}
            />
          ))}
          <Muted className="mt-2">
            Extra payments recalculate your date instantly — that's the whole game.
          </Muted>
        </>
      )}
    </Container>
  );
}

function Container({
  children,
  refreshControl,
}: {
  children: React.ReactNode;
  refreshControl?: React.ReactElement<RefreshControlProps>;
}) {
  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'left', 'right']}>
      <ScrollView contentContainerClassName="px-5 pb-12 pt-2" refreshControl={refreshControl}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

function paidOffMonth(planStart: string, monthsFromStart: number): string {
  const date = new Date(planStart);
  date.setMonth(date.getMonth() + monthsFromStart);
  return monthYear(date);
}

function DebtRow({ debt, paidOffLabel, onExtra }: { debt: Debt; paidOffLabel?: string; onExtra: () => void }) {
  const base = Math.max(debt.originalBalance, debt.balance);
  const progress = base > 0 ? Math.min(1, 1 - debt.balance / base) : 0;
  return (
    <Pressable onPress={onExtra} accessibilityRole="button" accessibilityLabel={`${debt.name}, add extra payment`}>
      <Card className="mb-3">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Body className="font-bold text-[16px]">{debt.name}</Body>
            <View className="mt-1 flex-row items-center gap-2">
              <Tag>{debt.category}</Tag>
              {debt.isLinked ? <Tag tone={debt.needsReauth ? 'warning' : 'success'}>{debt.needsReauth ? 'Reconnect bank' : 'Bank-linked'}</Tag> : null}
            </View>
          </View>
          <View className="items-end">
            <Num className="text-[18px]">{money(debt.balance)}</Num>
            <Muted>{debt.interestRate}% APR</Muted>
          </View>
        </View>
        <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <View className="h-full rounded-full bg-primary" style={{ width: `${Math.round(progress * 100)}%` }} />
        </View>
        <View className="mt-2 flex-row items-center justify-between">
          <Muted>{paidOffLabel ? `Paid off ${paidOffLabel}` : `${money(debt.minimumPayment)}/mo minimum`}</Muted>
          <View className="rounded-button bg-primary px-3 py-1.5">
            <Text className="font-bold text-[13px] text-white">+ Extra payment</Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

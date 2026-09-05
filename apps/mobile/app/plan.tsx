import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';
import { Body, Button, Card, Field, Heading, LinkText, Muted, Num, ProgressSteps, Screen, Tag, Title } from '@/components/ui';
import { MethodToggle } from '@/components/MethodToggle';
import { PlanHero } from '@/components/PlanHero';
import { useCalculate } from '@/lib/queries';
import { money, parseNumericInput } from '@/lib/format';
import { config } from '@/lib/config';
import { PLAN_STEPS, countedRows, toCalculateInput, useCalculatorStore } from '@/store/calculator';

/**
 * Screen 2 — plan builder. Method, name, and order are chosen HERE, before
 * any account exists: the user builds something worth saving first.
 */
export default function PlanScreen() {
  const router = useRouter();
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
  const { setMethod, setPlanName, moveRow } = useCalculatorStore(
    useShallow((st) => ({ setMethod: st.setMethod, setPlanName: st.setPlanName, moveRow: st.moveRow })),
  );

  const current = useMemo(() => toCalculateInput(s), [s]);
  const snowballInput = useMemo(() => (current ? { ...current, method: 'snowball' as const } : null), [current]);
  const avalancheInput = useMemo(() => (current ? { ...current, method: 'avalanche' as const } : null), [current]);

  const snowball = useCalculate(snowballInput);
  const avalanche = useCalculate(avalancheInput);
  const chosen = useCalculate(current);

  const rows = countedRows(s.rows);

  if (!current) {
    return (
      <Screen>
        <Title>Add a debt first</Title>
        <Body className="mb-4 mt-2">Your plan needs at least one debt with a balance.</Body>
        <Button title="Back to calculator" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ProgressSteps step={2} total={3} labels={PLAN_STEPS} />
      <Title>Make it yours</Title>
      <Muted className="mb-4 mt-1">Same debts, same budget — you choose how to attack them.</Muted>

      <Heading className="mb-2">Strategy</Heading>
      <MethodToggle
        value={s.method}
        onChange={setMethod}
        options={[
          {
            method: 'snowball',
            title: 'Snowball',
            blurb: 'Smallest balance first. Quick wins keep you going.',
            plan: snowball.data,
          },
          {
            method: 'avalanche',
            title: 'Avalanche',
            blurb: 'Highest APR first. The least interest overall.',
            plan: avalanche.data,
          },
        ]}
      />
      {s.method === 'custom' ? (
        <View className="mt-3 flex-row items-center gap-2">
          <Tag tone="primary">Custom order</Tag>
          <Muted className="flex-1">
            You reordered your debts. Custom order is a Pro feature (${config.proMonthlyPrice}/mo) — on the free plan it saves as Snowball.
          </Muted>
        </View>
      ) : null}

      <Heading className="mb-2 mt-6">Attack order</Heading>
      <Card className="mb-6">
        {rows.map((row, i) => (
          <View key={row.id} className={`flex-row items-center py-2 ${i > 0 ? 'border-t border-line' : ''}`}>
            <View className="flex-1">
              <Body className="font-semibold">{row.name.trim() || `Debt ${i + 1}`}</Body>
              <Muted>{money(parseNumericInput(row.balance) ?? 0)} · {row.rate.trim() ? `${row.rate}% APR` : 'est. APR'}</Muted>
            </View>
            <Pressable
              accessibilityLabel="Move up"
              disabled={i === 0}
              onPress={() => moveRow(row.id, -1)}
              hitSlop={6}
              className={`mr-2 h-9 w-9 items-center justify-center rounded-button bg-slate-100 ${i === 0 ? 'opacity-30' : ''}`}
            >
              <Text className="text-ink">▲</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Move down"
              disabled={i === rows.length - 1}
              onPress={() => moveRow(row.id, 1)}
              hitSlop={6}
              className={`h-9 w-9 items-center justify-center rounded-button bg-slate-100 ${i === rows.length - 1 ? 'opacity-30' : ''}`}
            >
              <Text className="text-ink">▼</Text>
            </Pressable>
          </View>
        ))}
        {s.method !== 'custom' ? (
          <Muted className="mt-2">
            Shown in {s.method} order. Move a debt to set your own order.
          </Muted>
        ) : null}
      </Card>

      <Heading className="mb-2">Name your plan</Heading>
      <Field
        label="Plan name"
        value={s.planName}
        onChangeText={setPlanName}
        placeholder="e.g. Debt-free by 35"
        maxLength={60}
        autoCapitalize="sentences"
      />

      <View className="mb-4 mt-2">
        <PlanHero plan={chosen.data} isLoading={chosen.isFetching} isError={chosen.isError} compact />
      </View>

      {chosen.data ? (
        <Muted className="mb-3">
          You'll pay <Num className="text-[13px]">{money(chosen.data.result.totalInterestPaid)}</Num> in interest on this plan. Saving it is how you keep chipping at that number.
        </Muted>
      ) : null}
      <Button title="Save my plan" onPress={() => router.push('/save')} />
      <View className="mt-3 items-center">
        <LinkText title="Back to numbers" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

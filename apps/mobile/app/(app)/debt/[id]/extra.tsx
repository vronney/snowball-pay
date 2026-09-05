import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { keepPreviousData } from '@tanstack/react-query';
import { Body, Button, Card, Eyebrow, Field, LinkText, Muted, Num, Screen, StateView, Title, colors } from '@/components/ui';
import { planInputFromServer, useCalculate, useDebts, useIncome, useLogExtraPayment } from '@/lib/queries';
import { useDebounced } from '@/lib/hooks';
import { daysBetween, money, monthYear, parseNumericInput } from '@/lib/format';

const QUICK_AMOUNTS = [25, 50, 100, 250];

/** DESIGN.md: every win-moment animation uses the celebration curve. */
const celebrate = Easing.bezier(0.22, 1, 0.36, 1);

/**
 * Screen 5 — the wedge. One tap from a debt row, type an amount, and the
 * debt-free date moves with a visible delta before anything is committed.
 */
export default function ExtraPaymentScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const debts = useDebts();
  const income = useIncome();
  const log = useLogExtraPayment();

  const [amount, setAmount] = useState('100');
  const debouncedAmount = useDebounced(amount);
  const amountNum = parseNumericInput(debouncedAmount);

  const debt = debts.data?.find((d) => d.id === id);

  const baseInput = useMemo(
    () => planInputFromServer(debts.data ?? [], income.data ?? null),
    [debts.data, income.data],
  );
  const previewInput = useMemo(() => {
    if (!baseInput || !debt || amountNum === null || amountNum <= 0) return null;
    const applied = Math.min(amountNum, debt.balance);
    const remaining = debt.balance - applied;
    return {
      ...baseInput,
      debts: baseInput.debts
        .map((d) => (d.id === debt.id ? { ...d, balance: remaining } : d))
        .filter((d) => d.balance > 0.01),
    };
  }, [baseInput, debt, amountNum]);

  const base = useCalculate(baseInput);
  const preview = useCalculate(previewInput, { placeholderData: keepPreviousData });

  const clears = debt !== undefined && amountNum !== null && amountNum >= debt.balance;
  const daysSooner =
    base.data && preview.data ? daysBetween(preview.data.result.debtFreeDate, base.data.result.debtFreeDate) : null;
  const interestSaved =
    base.data && preview.data
      ? Math.max(0, base.data.result.totalInterestPaid - preview.data.result.totalInterestPaid)
      : null;

  // The delta card springs in each time the number changes — the earned moment.
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (daysSooner === null) return;
    pop.setValue(0);
    Animated.timing(pop, { toValue: 1, duration: 450, easing: celebrate, useNativeDriver: true }).start();
  }, [daysSooner, interestSaved, pop]);

  const handleLog = async () => {
    if (!debt || amountNum === null || amountNum <= 0) return;
    await log.mutateAsync({ debtId: debt.id, amount: Math.min(amountNum, debt.balance) });
    router.back();
  };

  if (debts.isPending) {
    return (
      <Screen scroll={false}>
        <StateView kind="loading" />
      </Screen>
    );
  }
  if (!debt) {
    return (
      <Screen>
        <StateView kind="error" title="Debt not found" action={<Button title="Close" variant="quiet" onPress={() => router.back()} />} />
      </Screen>
    );
  }

  const inputError =
    amount.trim() !== '' && (amountNum === null || amountNum < 0) ? 'Enter a dollar amount' : undefined;

  return (
    <Screen>
      <View className="mb-4 flex-row items-center justify-between">
        <Eyebrow>Extra payment</Eyebrow>
        <LinkText title="Close" onPress={() => router.back()} />
      </View>
      <Title>{debt.name}</Title>
      <Muted className="mb-4 mt-1">
        {money(debt.balance)} left · {debt.interestRate}% APR · {money(debt.minimumPayment)}/mo minimum
      </Muted>

      <Field
        label="How much extra?"
        prefix="$"
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
        error={inputError}
        autoFocus
        selectTextOnFocus
      />
      <View className="mb-5 flex-row gap-2">
        {QUICK_AMOUNTS.map((q) => (
          <Pressable
            key={q}
            onPress={() => setAmount(String(q))}
            accessibilityRole="button"
            className={`flex-1 items-center rounded-tag border py-2 ${amount === String(q) ? 'border-primary bg-tint' : 'border-line bg-surface'}`}
          >
            <Num className={`text-[14px] ${amount === String(q) ? 'text-primary' : ''}`}>${q}</Num>
          </Pressable>
        ))}
      </View>

      {!baseInput ? (
        <Card>
          <Muted>Add your budget on getsnowballpay.com to see how this payment moves your date.</Muted>
        </Card>
      ) : amountNum === null || amountNum <= 0 ? (
        <Card>
          <Muted>Enter an amount to see your new debt-free date.</Muted>
        </Card>
      ) : (
        <Animated.View
          style={{ opacity: pop, transform: [{ translateY: pop.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}
        >
          <Card className={preview.isFetching ? 'opacity-70' : ''}>
            {preview.isError ? (
              <StateView kind="error" title="Couldn't recalculate" message="Check your connection and try again." />
            ) : daysSooner === null ? (
              <StateView kind="loading" />
            ) : (
              <>
                <View className="flex-row items-center">
                  <View className="mr-2 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors.success }} />
                  <Num className="text-[26px] text-emerald-700">
                    {daysSooner > 0 ? `Debt-free ${daysSooner} ${daysSooner === 1 ? 'day' : 'days'} sooner` : 'Same debt-free month'}
                  </Num>
                </View>
                <Muted className="mt-2">
                  New date: <Num className="text-[13px] text-muted">{monthYear(preview.data!.result.debtFreeDate)}</Num>
                  {interestSaved !== null && interestSaved > 0 ? ` · saves ${money(interestSaved)} in interest` : ''}
                </Muted>
                {daysSooner === 0 ? (
                  <Muted className="mt-1">Still worth it — every dollar of principal cuts interest, even inside the same month.</Muted>
                ) : null}
                {clears ? <Body className="mt-2 font-semibold text-emerald-700">This clears {debt.name} entirely. 🎉</Body> : null}
              </>
            )}
          </Card>
        </Animated.View>
      )}

      {debt.isLinked ? (
        <Muted className="mt-3">Bank-linked debt: the payment is recorded now and the balance updates on the next bank sync.</Muted>
      ) : null}
      {log.isError ? (
        <Muted className="mt-3 text-error">{log.error instanceof Error ? log.error.message : 'Could not log the payment.'}</Muted>
      ) : null}

      <Button
        className="mt-5"
        title={amountNum && amountNum > 0 ? `Log ${money(Math.min(amountNum, debt.balance))} payment` : 'Log payment'}
        onPress={handleLog}
        loading={log.isPending}
        disabled={!amountNum || amountNum <= 0 || Boolean(inputError)}
      />
      <Text className="mt-3 text-center font-medium text-[12px] text-muted">
        Logged as a payment on your plan — same as marking it on the web.
      </Text>
    </Screen>
  );
}

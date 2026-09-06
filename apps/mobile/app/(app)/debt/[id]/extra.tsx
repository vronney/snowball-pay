import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { keepPreviousData } from '@tanstack/react-query';
import { Body, Button, Card, Eyebrow, Field, LinkText, Muted, Num, Screen, StateView, Title, colors } from '@/components/ui';
import { planInputFromServer, useCalculate, useDebts, useExpenses, useIncome, useLogExtraPayment } from '@/lib/queries';
import { useDebounced } from '@/lib/hooks';
import { daysBetween, money, monthYear, parseNumericInput } from '@/lib/format';
import { monthFromNow } from '@/lib/plan';

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
  const expenses = useExpenses();
  const log = useLogExtraPayment();

  const [amount, setAmount] = useState('100');
  // The typed amount drives the button and the logged payment; the debounced
  // copy only paces the preview recalculation.
  const liveAmount = parseNumericInput(amount);
  const debouncedAmount = useDebounced(amount);
  const amountNum = parseNumericInput(debouncedAmount);

  const debt = debts.data?.find((d) => d.id === id);

  // Never preview with expenses missing: an empty list would overstate the
  // surplus. Until they load, baseInput stays null and the card shows loading.
  const baseInput = useMemo(
    () =>
      expenses.data && income.data
        ? planInputFromServer(debts.data ?? [], income.data, expenses.data)
        : null,
    [debts.data, income.data, expenses.data],
  );
  const previewDebts = useMemo(() => {
    if (!baseInput || !debt || amountNum === null || amountNum <= 0) return null;
    const remaining = debt.balance - Math.min(amountNum, debt.balance);
    return baseInput.debts
      .map((d) => (d.id === debt.id ? { ...d, balance: remaining } : d))
      .filter((d) => d.balance > 0.01);
  }, [baseInput, debt, amountNum]);
  // Paying off the last debt leaves nothing to simulate: the answer is "today".
  const clearsEverything = previewDebts !== null && previewDebts.length === 0;
  const previewInput = useMemo(
    () => (baseInput && previewDebts && previewDebts.length > 0 ? { ...baseInput, debts: previewDebts } : null),
    [baseInput, previewDebts],
  );

  const base = useCalculate(baseInput);
  const preview = useCalculate(previewInput, { placeholderData: keepPreviousData });

  const previewOutcome = clearsEverything
    ? { debtFreeDate: new Date().toISOString(), totalInterestPaid: 0, months: 0 }
    : preview.data?.result;
  const clears = debt !== undefined && amountNum !== null && amountNum >= debt.balance;
  const daysSooner =
    base.data && previewOutcome ? Math.max(0, daysBetween(previewOutcome.debtFreeDate, base.data.result.debtFreeDate)) : null;
  const interestSaved =
    base.data && previewOutcome
      ? Math.max(0, base.data.result.totalInterestPaid - previewOutcome.totalInterestPaid)
      : null;

  // The delta card springs in each time the number changes — the earned moment.
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (daysSooner === null) return;
    pop.setValue(0);
    Animated.timing(pop, { toValue: 1, duration: 450, easing: celebrate, useNativeDriver: true }).start();
  }, [daysSooner, interestSaved, pop]);

  const handleLog = async () => {
    if (!debt || liveAmount === null || liveAmount <= 0) return;
    try {
      await log.mutateAsync({ debtId: debt.id, amount: Math.min(liveAmount, debt.balance) });
      router.back();
    } catch {
      // Stay on the sheet; log.isError renders the API message below the card.
    }
  };

  if (debts.isPending || income.isPending || expenses.isPending) {
    return (
      <Screen scroll={false}>
        <StateView kind="loading" />
      </Screen>
    );
  }
  if (expenses.isError || income.isError) {
    return (
      <Screen>
        <StateView
          kind="error"
          title="Couldn't load your budget"
          message="The preview needs your expenses to be accurate."
          action={
            <Button
              title="Try again"
              variant="quiet"
              onPress={() => {
                income.refetch();
                expenses.refetch();
              }}
            />
          }
        />
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
    amount.trim() !== '' && (liveAmount === null || liveAmount < 0) ? 'Enter a dollar amount' : undefined;

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
          <Card className={preview.isFetching && !clearsEverything ? 'opacity-70' : ''}>
            {preview.isError && !clearsEverything ? (
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
                  New date: <Num className="text-[13px] text-muted">{clearsEverything ? 'today' : monthYear(monthFromNow(previewOutcome!.months))}</Num>
                  {interestSaved !== null && interestSaved > 0 ? ` · saves ${money(interestSaved)} in interest` : ''}
                </Muted>
                {daysSooner === 0 ? (
                  <Muted className="mt-1">Still worth it — every dollar of principal cuts interest, even inside the same month.</Muted>
                ) : null}
                {clearsEverything ? (
                  <Body className="mt-2 font-semibold text-emerald-700">This clears your last debt. You’d be debt-free today. 🎉</Body>
                ) : clears ? (
                  <Body className="mt-2 font-semibold text-emerald-700">This clears {debt.name} entirely. 🎉</Body>
                ) : null}
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
        title={liveAmount && liveAmount > 0 ? `Log ${money(Math.min(liveAmount, debt.balance))} payment` : 'Log payment'}
        onPress={handleLog}
        loading={log.isPending}
        disabled={!liveAmount || liveAmount <= 0 || Boolean(inputError)}
      />
      <Text className="mt-3 text-center font-medium text-[12px] text-muted">
        Logged as a payment on your plan — same as marking it on the web.
      </Text>
    </Screen>
  );
}

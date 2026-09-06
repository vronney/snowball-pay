import React from 'react';
import { View } from 'react-native';
import { Card, Eyebrow, Muted, Num, StateView, Tag, colors } from './ui';
import { money, monthYear, monthsLabel } from '@/lib/format';
import { isPlanUnfinished, monthFromNow } from '@/lib/plan';
import type { CalculateResponse } from '@/lib/types';

/**
 * The debt-free date, front and center — the one number every screen leads
 * with. Also the reciprocity moment: the full result is free and never blurred.
 */
export function PlanHero({
  plan,
  isLoading,
  isError,
  error,
  sample,
  compact,
}: {
  plan: CalculateResponse | undefined;
  isLoading?: boolean;
  isError?: boolean;
  /** The query error — its message is shown so a failed request is diagnosable on-device. */
  error?: unknown;
  sample?: boolean;
  compact?: boolean;
}) {
  if (!plan) {
    if (isError) {
      const detail = error instanceof Error ? error.message : 'Check your connection and try again.';
      return (
        <Card>
          <StateView kind="error" title="Couldn't calculate" message={detail} />
        </Card>
      );
    }
    return (
      <Card>
        <StateView kind={isLoading ? 'loading' : 'empty'} title="Add a debt to see your date" />
      </Card>
    );
  }

  const { result, interestSaved, monthsSaved } = plan;
  const stuck = isPlanUnfinished(result);

  return (
    <Card className={isLoading ? 'opacity-70' : ''}>
      <View className="mb-1 flex-row items-center justify-between">
        <Eyebrow>Debt-free</Eyebrow>
        {sample ? <Tag>Sample numbers</Tag> : null}
      </View>
      {stuck ? (
        <Muted>
          At {money(result.monthlyPayment)}/mo this never pays off — interest outruns the payments. Raise the extra amount or a minimum to get a date.
        </Muted>
      ) : (
        <>
          <Num className={compact ? 'text-[28px]' : 'text-[40px] leading-[46px]'}>{monthYear(monthFromNow(result.months))}</Num>
          <Muted className="mt-1">
            {monthsLabel(result.months)} · {money(result.monthlyPayment)}/mo · {money(result.totalInterestPaid)} total interest
          </Muted>
        </>
      )}
      {!stuck && (monthsSaved > 0 || interestSaved > 0) ? (
        <View className="mt-3 flex-row items-center rounded-tag bg-emerald-50 px-3 py-2">
          <View className="mr-2 h-2 w-2 rounded-full" style={{ backgroundColor: colors.success }} />
          <Muted className="flex-1 text-emerald-800">
            {monthsSaved > 0 ? `${monthsLabel(monthsSaved)} sooner` : 'Same date'} and {money(interestSaved)} less interest than minimums only
          </Muted>
        </View>
      ) : null}
    </Card>
  );
}

import type { PayoffResult } from '@/lib/snowball';

/** A capped projection is not a payoff plan until every balance reaches zero. */
export function isPayoffComplete(result: Pick<PayoffResult, 'monthlyBalances'>): boolean {
  const finalBalance = result.monthlyBalances[result.monthlyBalances.length - 1]?.totalBalance;
  return finalBalance !== undefined && finalBalance <= 0.01;
}

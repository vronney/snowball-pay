export type MilestoneTier =
  | 'first_payment'
  | 'debt_paid_off'
  | 'quarter_paid'
  | 'half_paid'
  | 'three_quarter'
  | 'streak_six_months'
  | 'anniversary'
  | null;

export interface MilestoneInput {
  debtId: string;
  debtName: string;
  amountPaid: number;
  totalDebtPaid: number;
  totalDebtOriginal: number;
  isFirstPayment: boolean;
  debtBalance: number;
  debtOriginalBalance: number;
  debtCreatedAt: string;
  /**
   * Everything paid in one batch, when this payment arrived with others and
   * `totalDebtPaid` already counts them all. Without it the prior percentage is
   * reconstructed from this debt's payment alone, which hides a threshold the
   * batch crossed together — 20% to 36% via 6% and 10% would look like a step
   * from 26%, and the quarter mark would go unnoticed. Defaults to `amountPaid`.
   */
  batchAmountPaid?: number;
}

export function detectMilestone(body: MilestoneInput, streakMonths: number): MilestoneTier {
  if (body.isFirstPayment) return 'first_payment';

  if (body.debtBalance <= 0) return 'debt_paid_off';

  const paidNow = body.batchAmountPaid ?? body.amountPaid;
  const pctPaid = body.totalDebtPaid / body.totalDebtOriginal;
  const prevPctPaid = (body.totalDebtPaid - paidNow) / body.totalDebtOriginal;

  if (pctPaid >= 0.75 && prevPctPaid < 0.75) return 'three_quarter';
  if (pctPaid >= 0.5  && prevPctPaid < 0.5)  return 'half_paid';
  if (pctPaid >= 0.25 && prevPctPaid < 0.25) return 'quarter_paid';

  if (streakMonths >= 6) return 'streak_six_months';

  const msInYear = 365.25 * 24 * 60 * 60 * 1000;
  const yearMark = new Date(new Date(body.debtCreatedAt).getTime() + msInYear);
  const daysFromAnniversary = Math.abs(Date.now() - yearMark.getTime()) / (24 * 60 * 60 * 1000);
  if (daysFromAnniversary <= 3) return 'anniversary';

  return null;
}

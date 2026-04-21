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
}

export function detectMilestone(body: MilestoneInput, streakMonths: number): MilestoneTier {
  if (body.isFirstPayment) return 'first_payment';

  if (body.debtBalance <= 0) return 'debt_paid_off';

  const pctPaid = body.totalDebtPaid / body.totalDebtOriginal;
  const prevPctPaid = (body.totalDebtPaid - body.amountPaid) / body.totalDebtOriginal;

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

export const WIN_BACK_INACTIVE_DAYS = 30;
export const WIN_BACK_CHECK_KEY = 'winback_30d_v1_sent';
export const WIN_BACK_MESSAGE_VERSION = 'supportive_v1';

const DAY_MS = 24 * 60 * 60 * 1000;

interface PlanActivity {
  createdAt: Date;
  debts: Array<{ updatedAt: Date }>;
  income: { updatedAt: Date } | null;
  paymentRecords: Array<{ paidAt: Date }>;
}

/**
 * The database does not track passive page views. Use the latest durable plan
 * change or payment as the honest activity signal for lifecycle targeting.
 */
export function getLatestPlanActivityAt(activity: PlanActivity): Date {
  const timestamps = [
    activity.createdAt.getTime(),
    ...activity.debts.map((debt) => debt.updatedAt.getTime()),
    ...(activity.income ? [activity.income.updatedAt.getTime()] : []),
    ...activity.paymentRecords.map((payment) => payment.paidAt.getTime()),
  ].filter(Number.isFinite);

  return new Date(Math.max(...timestamps));
}

export function getInactiveDays(activityAt: Date, now = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - activityAt.getTime()) / DAY_MS));
}

export function hasReceivedWinBack(actionChecks: unknown): boolean {
  if (!actionChecks || typeof actionChecks !== 'object' || Array.isArray(actionChecks)) {
    return false;
  }

  return (actionChecks as Record<string, unknown>)[WIN_BACK_CHECK_KEY] === true;
}

export function isInactiveForWinBack(activityAt: Date, now = new Date()): boolean {
  return getInactiveDays(activityAt, now) >= WIN_BACK_INACTIVE_DAYS;
}

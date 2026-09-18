export const WIN_BACK_INACTIVE_DAYS = 30;
export const WIN_BACK_CHECK_KEY = 'winback_30d_v1_sent';
export const WIN_BACK_MESSAGE_VERSION = 'supportive_v1';

const DAY_MS = 24 * 60 * 60 * 1000;

interface PlanActivity {
  createdAt: Date;
  debts: Array<{ updatedAt: Date }>;
  income: { updatedAt: Date } | null;
  paymentRecords: Array<{ paidAt: Date }>;
  /** Optional: a recurring-expense edit is a plan edit too, when the caller selects it. */
  expenses?: Array<{ updatedAt: Date }>;
}

/**
 * The latest durable plan edit: a debt, income, or expense change, or a
 * logged payment. Null when the plan has never been touched. Account
 * creation is deliberately not an edit: after a delete-and-recreate the new
 * row's createdAt can postdate a grant-anchored trial end, and that must not
 * read as "still using the plan".
 */
export function getLatestPlanEditAt(activity: Omit<PlanActivity, 'createdAt'>): Date | null {
  const timestamps = [
    ...activity.debts.map((debt) => debt.updatedAt.getTime()),
    ...(activity.income ? [activity.income.updatedAt.getTime()] : []),
    ...activity.paymentRecords.map((payment) => payment.paidAt.getTime()),
    ...(activity.expenses ?? []).map((expense) => expense.updatedAt.getTime()),
  ].filter(Number.isFinite);

  return timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null;
}

/**
 * The database does not track passive page views. Use the latest durable plan
 * change or payment as the honest activity signal for lifecycle targeting,
 * with account creation as the floor (win-back measures idle time from it).
 */
export function getLatestPlanActivityAt(activity: PlanActivity): Date {
  const edit = getLatestPlanEditAt(activity);
  const created = activity.createdAt.getTime();
  return edit && edit.getTime() > created ? edit : new Date(created);
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

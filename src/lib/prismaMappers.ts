import type { Debt as DebtRow, Income as IncomeRow } from '@prisma/client';
import type { Debt, Income } from '@/types';

type DebtCategory = Debt['category'];

const DEBT_CATEGORIES = [
  'Credit Card', 'Student Loan', 'Auto Loan', 'Mortgage', 'Personal Loan', 'Medical Debt', 'Other',
] as const satisfies ReadonlyArray<DebtCategory>;

function isDebtCategory(value: string): value is DebtCategory {
  return (DEBT_CATEGORIES as ReadonlyArray<string>).includes(value);
}

/**
 * The column is a plain String, but every write path (the debts/onboarding Zod
 * enums, the Plaid category mapper) keeps it inside the domain union. A stray
 * value becomes 'Other', which no calculation special-cases — the only
 * category branch anywhere is `=== 'Credit Card'`.
 */
export function toDebtCategory(value: string): DebtCategory {
  return isDebtCategory(value) ? value : 'Other';
}

/**
 * Prisma `Debt` row → domain `Debt`, field by field, so a schema or domain
 * change fails to compile here instead of slipping past a cast. Numbers pass
 * through untouched. A null due day becomes undefined; every consumer tests
 * it as falsy or `== null`, so both mean "no due day".
 */
export function debtFromRow(row: DebtRow): Debt {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    category: toDebtCategory(row.category),
    balance: row.balance,
    originalBalance: row.originalBalance,
    interestRate: row.interestRate,
    minimumPayment: row.minimumPayment,
    creditLimit: row.creditLimit,
    priorityOrder: row.priorityOrder,
    dueDate: row.dueDate ?? undefined,
    isLinked: row.isLinked,
    plaidAccountId: row.plaidAccountId,
    plaidPersistentAccountId: row.plaidPersistentAccountId,
    plaidItemId: row.plaidItemId,
    lastSyncedAt: row.lastSyncedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Prisma `Income` row → domain `Income`; numbers pass through untouched. */
export function incomeFromRow(row: IncomeRow): Income {
  return {
    id: row.id,
    userId: row.userId,
    monthlyTakeHome: row.monthlyTakeHome,
    essentialExpenses: row.essentialExpenses,
    extraPayment: row.extraPayment,
    payoffMethod: row.payoffMethod,
    accelerationAmount: row.accelerationAmount,
    source: row.source ?? undefined,
    frequency: row.frequency,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, serverError } from '@/lib/auth-server';
import { calculateResultByMethod, methodFromIncome } from '@/lib/payoffPlan';
import type { Debt } from '@/types';
import { isInPlan, isPlanDebt } from '@/lib/monthlyFocusDebt';

/** Returns the current month and two prior months as [{year, month}]. */
function getRolling3Months(): { year: number; month: number }[] {
  const now = new Date();
  return [2, 1, 0].reverse().map((offset) => {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
}

export interface AccelerationMonthData {
  year: number;
  month: number;
  actualExtra: number;
  onTrack: boolean;
}

export interface AccelerationStatsResponse {
  plannedMonthly: number;
  monthlyData: AccelerationMonthData[];
  totalPlanned: number;
  totalActualExtra: number;
  streak: number;
  currentDebtFreeDate: string | null;
  baselineDebtFreeDate: string;
  monthsSaved: number;
  performanceScore: number;
  interestSaved: number;
}

/** The `!income || debts.length === 0` shape — also used when every debt is outside the plan (spec §6.2). */
function zeroStatResponse(monthRanges: { year: number; month: number }[]): AccelerationStatsResponse {
  return {
    plannedMonthly: 0,
    monthlyData: monthRanges.map((m) => ({ ...m, actualExtra: 0, onTrack: false })),
    totalPlanned: 0,
    totalActualExtra: 0,
    streak: 0,
    currentDebtFreeDate: null,
    baselineDebtFreeDate: new Date().toISOString(),
    monthsSaved: 0,
    performanceScore: 0,
    interestSaved: 0,
  };
}

/** GET /api/acceleration-stats — returns rolling 3-month acceleration metrics */
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  try {
    const monthRanges = getRolling3Months();

    const [debts, income, expenses, allRecords] = await Promise.all([
      prisma.debt.findMany({ where: { userId: auth.user.id } }),
      prisma.income.findUnique({ where: { userId: auth.user.id } }),
      prisma.expense.findMany({ where: { userId: auth.user.id } }),
      prisma.paymentRecord.findMany({
        where: {
          userId: auth.user.id,
          OR: monthRanges.map(({ year, month }) => ({ dueYear: year, dueMonth: month })),
        },
      }),
    ]);

    if (!income || debts.length === 0) {
      return NextResponse.json<AccelerationStatsResponse>(zeroStatResponse(monthRanges));
    }

    const normalizedDebts: Debt[] = debts.map((d) => ({
      ...d,
      category: d.category as Debt['category'],
      dueDate: d.dueDate ?? undefined,
    }));

    // Every debt outside the plan: zero-stat, same shape as no debts at all.
    // NOT triggered merely because no debt is active — a fully paid-off
    // account (every debt still in-plan) keeps today's computation below.
    if (!normalizedDebts.some(isInPlan)) {
      return NextResponse.json<AccelerationStatsResponse>(zeroStatResponse(monthRanges));
    }

    // The plan's debts only (spec §6.2), so the planned extra matches the dashboard's plan.
    const activeDebts = normalizedDebts.filter(isPlanDebt);
    // Built from ALL debts, not just plan debts: a payment on a debt that
    // just got paid off this month must still count toward actualExtra.
    const outsideDebtIds = new Set(normalizedDebts.filter((d) => !isInPlan(d)).map((d) => d.id));
    const recurringTotal = expenses.reduce((s, e) => s + e.amount, 0);
    const totalMinPayments = activeDebts.reduce((s, d) => s + d.minimumPayment, 0);

    const naturalSurplus = Math.max(
      0,
      income.monthlyTakeHome -
        income.essentialExpenses -
        recurringTotal -
        totalMinPayments,
    );
    const availableCashFlow = naturalSurplus;
    const plannedMonthly =
      income.accelerationAmount != null
        ? Math.min(income.accelerationAmount, availableCashFlow)
        : availableCashFlow;

    const debtMinMap = new Map(normalizedDebts.map((d) => [d.id, d.minimumPayment]));

    const monthlyData: AccelerationMonthData[] = monthRanges.map(({ year, month }) => {
      const monthRecords = allRecords.filter(
        (r) => r.dueYear === year && r.dueMonth === month && !outsideDebtIds.has(r.debtId),
      );
      const actualExtra = monthRecords.reduce((sum, r) => {
        const min = debtMinMap.get(r.debtId) ?? 0;
        return sum + Math.max(0, r.amount - min);
      }, 0);
      const onTrack = plannedMonthly > 0 && actualExtra >= plannedMonthly * 0.85;
      return { year, month, actualExtra, onTrack };
    });

    let streak = 0;
    for (let i = monthlyData.length - 1; i >= 0; i--) {
      if (monthlyData[i].onTrack) streak++;
      else break;
    }

    const totalPlanned = plannedMonthly * 3;
    const totalActualExtra = monthlyData.reduce((s, m) => s + m.actualExtra, 0);

    const method = methodFromIncome(income);

    const baselineResult = calculateResultByMethod(
      activeDebts,
      income,
      recurringTotal,
      0,
      method,
    );

    const adjustedExtra = Math.max(0, plannedMonthly - naturalSurplus);

    const currentResult = calculateResultByMethod(
      activeDebts,
      income,
      recurringTotal,
      adjustedExtra,
      method,
    );
    const currentDebtFreeDate: Date = currentResult.debtFreeDate;
    const interestSaved = Math.max(0, baselineResult.totalInterestPaid - currentResult.totalInterestPaid);

    // Plain plan-month subtraction — same formula the UI uses, so coach copy
    // can never disagree with the header by a month.
    const monthsSaved = Math.max(0, baselineResult.months - currentResult.months);

    const consistencyScore =
      totalPlanned > 0 ? Math.min(1, totalActualExtra / totalPlanned) : 0;
    const streakScore = Math.min(1, streak / 3);
    const savingsScore = monthsSaved > 0 ? Math.min(1, monthsSaved / 12) : 0;
    const performanceScore =
      consistencyScore * 0.5 + streakScore * 0.3 + savingsScore * 0.2;

    return NextResponse.json<AccelerationStatsResponse>({
      plannedMonthly,
      monthlyData,
      totalPlanned,
      totalActualExtra,
      streak,
      currentDebtFreeDate: currentDebtFreeDate.toISOString(),
      baselineDebtFreeDate: baselineResult.debtFreeDate.toISOString(),
      monthsSaved,
      performanceScore,
      interestSaved,
    });
  } catch (error) {
    console.error('Error fetching acceleration stats:', error);
    return serverError('Failed to fetch acceleration stats');
  }
}

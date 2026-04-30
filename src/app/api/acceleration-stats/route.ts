import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, serverError } from '@/lib/auth-server';
import {
  calculateDebtSnowball,
  calculateDebtAvalanche,
  calculateDebtCustom,
} from '@/lib/snowball';
import type { Debt } from '@/types';

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
      return NextResponse.json<AccelerationStatsResponse>({
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
      });
    }

    const recurringTotal = expenses.reduce((s, e) => s + e.amount, 0);
    const totalMinPayments = debts.reduce((s, d) => s + d.minimumPayment, 0);

    const plannedMonthly =
      income.accelerationAmount != null
        ? income.accelerationAmount
        : Math.max(
            0,
            income.monthlyTakeHome -
              income.essentialExpenses -
              recurringTotal -
              totalMinPayments,
          );

    const debtMinMap = new Map(debts.map((d) => [d.id, d.minimumPayment]));

    const monthlyData: AccelerationMonthData[] = monthRanges.map(({ year, month }) => {
      const monthRecords = allRecords.filter(
        (r) => r.dueYear === year && r.dueMonth === month,
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

    const normalizedDebts: Debt[] = debts.map((d) => ({
      ...d,
      category: d.category as Debt['category'],
      dueDate: d.dueDate ?? undefined,
    }));

    const method = (income.payoffMethod ?? 'snowball') as 'snowball' | 'avalanche' | 'custom';
    const calcFn =
      method === 'avalanche'
        ? calculateDebtAvalanche
        : method === 'custom'
          ? calculateDebtCustom
          : calculateDebtSnowball;

    const baselineResult = calcFn(
      normalizedDebts,
      income.monthlyTakeHome,
      income.essentialExpenses,
      recurringTotal,
      0,
    );

    const naturalSurplus = income.monthlyTakeHome - income.essentialExpenses - recurringTotal - totalMinPayments;
    const adjustedExtra = Math.max(0, plannedMonthly - naturalSurplus);

    const currentResult = calcFn(
      normalizedDebts,
      income.monthlyTakeHome,
      income.essentialExpenses,
      recurringTotal,
      adjustedExtra,
    );
    const currentDebtFreeDate: Date = currentResult.debtFreeDate;
    const interestSaved = Math.max(0, baselineResult.totalInterestPaid - currentResult.totalInterestPaid);

    const baselineMs = baselineResult.debtFreeDate.getTime();
    const currentMs = currentDebtFreeDate.getTime();
    const msPerMonth = 1000 * 60 * 60 * 24 * 30.44;
    const monthsSaved = Math.round((baselineMs - currentMs) / msPerMonth);

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

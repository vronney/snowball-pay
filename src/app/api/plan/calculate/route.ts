import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, badRequest, serverError } from '@/lib/auth-server';
import {
  calculateDebtSnowball,
  calculateDebtAvalanche,
  calculateDebtCustom,
  type PayoffMethod,
  type DebtPayoffSchedule,
} from '@/lib/snowball';
import type { Debt } from '@/types';

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  try {
    const body = await request.json().catch(() => ({}));
    const method = body?.method as PayoffMethod | undefined;
    const payoffMethod: PayoffMethod = method ?? 'snowball';

    if (!['snowball', 'avalanche', 'custom'].includes(payoffMethod)) {
      return badRequest('Invalid payoff method');
    }

    // Fetch user's debts and income
    const [debts, income, expenses] = await Promise.all([
      prisma.debt.findMany({
        where: { userId: auth.user.id },
      }),
      prisma.income.findUnique({
        where: { userId: auth.user.id },
      }),
      prisma.expense.findMany({
        where: { userId: auth.user.id },
      }),
    ]);

    if (!income || debts.length === 0) {
      return NextResponse.json(
        { error: 'Add debts and income information first' },
        { status: 400 }
      );
    }

    // Calculate recurring expenses total
    const recurringTotal = expenses.reduce((sum: number, e: { amount: number }) => sum + e.amount, 0);

    const normalizedDebts: Debt[] = debts.map((debt: (typeof debts)[number]) => ({
      ...debt,
      category: debt.category as Debt['category'],
      dueDate: debt.dueDate ?? undefined,
    }));

    // Calculate payoff plan
    const payoffResult = payoffMethod === 'avalanche'
      ? calculateDebtAvalanche(
          normalizedDebts,
          income.monthlyTakeHome,
          income.essentialExpenses,
          recurringTotal,
          income.extraPayment
        )
      : payoffMethod === 'custom'
      ? calculateDebtCustom(
          normalizedDebts,
          income.monthlyTakeHome,
          income.essentialExpenses,
          recurringTotal,
          income.extraPayment
        )
      : calculateDebtSnowball(
          normalizedDebts,
          income.monthlyTakeHome,
          income.essentialExpenses,
          recurringTotal,
          income.extraPayment
        );

    // Save payoff plan and steps atomically
    const plan = await prisma.$transaction(async (tx) => {
      const existingPlan = await tx.payoffPlan.findUnique({
        where: { userId: auth.user.id },
      });

      let savedPlan;
      if (existingPlan) {
        savedPlan = await tx.payoffPlan.update({
          where: { userId: auth.user.id },
          data: {
            debtFreeDate: payoffResult.debtFreeDate,
            totalInterestPaid: payoffResult.totalInterestPaid,
            totalAmountPaid: payoffResult.totalAmountPaid,
            monthlyPayment: payoffResult.monthlyPayment,
          },
          include: { payoffSteps: true },
        });
        await tx.payoffStep.deleteMany({ where: { payoffPlanId: savedPlan.id } });
      } else {
        savedPlan = await tx.payoffPlan.create({
          data: {
            userId: auth.user.id,
            debtFreeDate: payoffResult.debtFreeDate,
            totalInterestPaid: payoffResult.totalInterestPaid,
            totalAmountPaid: payoffResult.totalAmountPaid,
            monthlyPayment: payoffResult.monthlyPayment,
          },
          include: { payoffSteps: true },
        });
      }

      await Promise.all(
        payoffResult.payoffSchedule.map((step: DebtPayoffSchedule) =>
          tx.payoffStep.create({
            data: {
              debtId: step.debtId,
              payoffPlanId: savedPlan.id,
              stepNumber: step.orderInPayoff,
              startBalance: step.originalBalance,
              payoffMonth: step.monthPaidOff,
              interestPaid: step.interestPaid,
            },
          }),
        ),
      );

      return savedPlan;
    });

    return NextResponse.json({
      payoffPlan: {
        ...plan,
        schedule: payoffResult.payoffSchedule,
      },
    });
  } catch (error) {
    console.error('Error calculating payoff plan:', error);
    return serverError('Failed to calculate payoff plan');
  }
}

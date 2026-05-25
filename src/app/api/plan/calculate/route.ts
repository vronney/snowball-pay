import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, badRequest, serverError } from '@/lib/auth-server';
import { type PayoffMethod, type DebtPayoffSchedule } from '@/lib/snowball';
import { calculatePlanMetrics, isPayoffMethod } from '@/lib/payoffPlan';
import type { Debt } from '@/types';

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  try {
    const body = await request.json().catch(() => ({}));
    const method = body?.method as PayoffMethod | undefined;

    if (method !== undefined && !isPayoffMethod(method)) {
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

    const normalizedDebts: Debt[] = debts.map((debt: (typeof debts)[number]) => ({
      ...debt,
      category: debt.category as Debt['category'],
      dueDate: debt.dueDate ?? undefined,
    }));

    const metrics = calculatePlanMetrics(normalizedDebts, income, expenses, {
      method: method ?? null,
    });
    if (!metrics) {
      return NextResponse.json(
        { error: 'Add debts and income information first' },
        { status: 400 },
      );
    }
    const payoffResult = metrics.result;

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

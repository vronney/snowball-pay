import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, serverError } from '@/lib/auth-server';
import { calculateDebtSnowball, calculateDebtAvalanche } from '@/lib/snowball';
import type { Debt } from '@/types';

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  try {
    const { method = 'snowball' } = await request.json();

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
    const payoffResult = method === 'avalanche'
      ? calculateDebtAvalanche(
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

    // Save payoff plan to database
    const existingPlan = await prisma.payoffPlan.findUnique({
      where: { userId: auth.user.id },
    });

    let plan;
    if (existingPlan) {
      plan = await prisma.payoffPlan.update({
        where: { userId: auth.user.id },
        data: {
          debtFreeDate: payoffResult.debtFreeDate,
          totalInterestPaid: payoffResult.totalInterestPaid,
          totalAmountPaid: payoffResult.totalAmountPaid,
          monthlyPayment: payoffResult.monthlyPayment,
        },
        include: { payoffSteps: true },
      });

      // Delete old payoff steps and create new ones
      await prisma.payoffStep.deleteMany({
        where: { payoffPlanId: plan.id },
      });
    } else {
      plan = await prisma.payoffPlan.create({
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

    // Create new payoff steps
    await Promise.all(
      payoffResult.payoffSchedule.map((step) => {
        const debt = debts.find((d: { name: string; id: string }) => d.name === step.debtName);
        return prisma.payoffStep.create({
          data: {
            debtId: debt?.id || '',
            payoffPlanId: plan.id,
            stepNumber: step.orderInPayoff,
            startBalance: step.originalBalance,
            payoffMonth: step.monthPaidOff,
            interestPaid: step.interestPaid,
          },
        });
      })
    );

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

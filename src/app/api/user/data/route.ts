import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, serverError } from '@/lib/auth-server';

export async function DELETE(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  try {
    const userId = auth.user.id;

    // Delete in dependency order
    await prisma.balanceSnapshot.deleteMany({ where: { userId } });
    await prisma.payoffStep.deleteMany({
      where: { payoffPlan: { userId } },
    });
    await prisma.payoffPlan.deleteMany({ where: { userId } });
    await prisma.debt.deleteMany({ where: { userId } });
    await prisma.expense.deleteMany({ where: { userId } });
    await prisma.income.deleteMany({ where: { userId } });
    await prisma.aiRecommendationCache.deleteMany({ where: { userId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error clearing user data:', error);
    return serverError('Failed to clear data');
  }
}

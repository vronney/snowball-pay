import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, serverError } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  try {
    const plan = await prisma.payoffPlan.findUnique({
      where: { userId: auth.user.id },
      include: { payoffSteps: { include: { debt: true }, orderBy: { stepNumber: 'asc' } } },
    });

    if (!plan) {
      return NextResponse.json({ payoffPlan: null }, { status: 200 });
    }

    return NextResponse.json({ payoffPlan: plan });
  } catch (error) {
    console.error('Error fetching payoff plan:', error);
    return serverError('Failed to fetch payoff plan');
  }
}

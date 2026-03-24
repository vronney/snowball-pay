import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, badRequest, serverError } from '@/lib/auth-server';
import { z } from 'zod';

const BonusIncomeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  amount: z.number().min(0),
  frequency: z.enum(['monthly', 'annual', 'one-time']),
});

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  try {
    const bonusIncomes = await prisma.bonusIncome.findMany({
      where: { userId: auth.user.id },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ bonusIncomes });
  } catch (error) {
    console.error('Error fetching bonus incomes:', error);
    return serverError('Failed to fetch bonus incomes');
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  try {
    const body = await request.json();
    const parseResult = BonusIncomeSchema.safeParse(body);
    if (!parseResult.success) {
      return badRequest(parseResult.error.issues[0]?.message ?? 'Invalid payload');
    }

    const bonusIncome = await prisma.bonusIncome.create({
      data: { userId: auth.user.id, ...parseResult.data },
    });

    return NextResponse.json({ bonusIncome }, { status: 201 });
  } catch (error) {
    console.error('Error creating bonus income:', error);
    return serverError('Failed to create bonus income');
  }
}

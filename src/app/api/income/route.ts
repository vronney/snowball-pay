import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, serverError } from '@/lib/auth-server';
import { z } from 'zod';

const IncomeSchema = z.object({
  monthlyTakeHome: z.number().min(0),
  essentialExpenses: z.number().min(0),
  extraPayment: z.number().min(0),
  source: z.string().optional(),
  frequency: z.string().default('monthly'),
});

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  try {
    const income = await prisma.income.findUnique({
      where: { userId: auth.user.id },
    });

    return NextResponse.json({ income: income || null });
  } catch (error) {
    console.error('Error fetching income:', error);
    return serverError('Failed to fetch income');
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  try {
    const body = await request.json();
    const validated = IncomeSchema.parse(body);

    // Check if income record exists
    const existingIncome = await prisma.income.findUnique({
      where: { userId: auth.user.id },
    });

    let income;
    if (existingIncome) {
      income = await prisma.income.update({
        where: { userId: auth.user.id },
        data: validated,
      });
    } else {
      income = await prisma.income.create({
        data: {
          userId: auth.user.id,
          ...validated,
        },
      });
    }

    return NextResponse.json({ income });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Invalid request payload' },
        { status: 400 }
      );
    }
    console.error('Error saving income:', error);
    return serverError('Failed to save income');
  }
}

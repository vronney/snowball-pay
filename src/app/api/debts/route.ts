import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, badRequest, serverError } from '@/lib/auth-server';
import { getUserTier, FREE_DEBT_LIMIT, upgradeRequired } from '@/lib/gates';
import { z } from 'zod';

const CreateDebtSchema = z.object({
  name: z.string().min(1, 'Debt name required'),
  category: z.enum(['Credit Card', 'Student Loan', 'Auto Loan', 'Mortgage', 'Personal Loan', 'Medical Debt', 'Other']),
  balance: z.number().min(0, 'Balance must be positive'),
  interestRate: z.number().min(0).max(100),
  minimumPayment: z.number().min(0),
  creditLimit: z.number().min(0).optional(),
  dueDate: z.number().min(1).max(31).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  try {
    const debts = await prisma.debt.findMany({
      where: { userId: auth.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ debts });
  } catch (error) {
    console.error('Error fetching debts:', error);
    return serverError('Failed to fetch debts');
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  try {
    const body = await request.json();
    const validated = CreateDebtSchema.parse(body);

    // Free-tier debt limit check
    const tier = await getUserTier(auth.user.id);
    if (tier === 'free') {
      const count = await prisma.debt.count({ where: { userId: auth.user.id } });
      if (count >= FREE_DEBT_LIMIT) {
        return upgradeRequired('Unlimited debts');
      }
    }

    const debt = await prisma.debt.create({
      data: {
        userId: auth.user.id,
        name: validated.name,
        category: validated.category,
        balance: validated.balance,
        originalBalance: validated.balance,
        interestRate: validated.interestRate,
        minimumPayment: validated.minimumPayment,
        creditLimit: validated.creditLimit || 0,
        dueDate: validated.dueDate,
      },
    });

    return NextResponse.json({ debt }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message || 'Invalid request payload');
    }
    console.error('Error creating debt:', error);
    return serverError('Failed to create debt');
  }
}

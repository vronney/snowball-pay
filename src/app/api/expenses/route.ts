import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, badRequest, serverError } from '@/lib/auth-server';
import { z } from 'zod';

const CreateExpenseSchema = z.object({
  name: z.string().min(1),
  amount: z.number().min(0),
  frequency: z.string().default('monthly'),
  category: z.string().default('other'),
});

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  try {
    const expenses = await prisma.expense.findMany({
      where: { userId: auth.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ expenses });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return serverError('Failed to fetch expenses');
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  try {
    const body = await request.json();
    const validated = CreateExpenseSchema.parse(body);

    const expense = await prisma.expense.create({
      data: {
        userId: auth.user.id,
        ...validated,
      },
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message || 'Invalid request payload');
    }
    console.error('Error creating expense:', error);
    return serverError('Failed to create expense');
  }
}

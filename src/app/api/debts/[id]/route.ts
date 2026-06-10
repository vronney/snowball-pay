import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, badRequest, serverError, isValidId } from '@/lib/auth-server';
import { z } from 'zod';

const UpdateDebtSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.enum(['Credit Card', 'Student Loan', 'Auto Loan', 'Mortgage', 'Personal Loan', 'Medical Debt', 'Other']).optional(),
  balance: z.number().min(0).optional(),
  originalBalance: z.number().min(0).optional(),
  interestRate: z.number().min(0).max(100).optional(),
  minimumPayment: z.number().min(0).optional(),
  creditLimit: z.number().min(0).optional(),
  dueDate: z.number().min(1).max(31).nullable().optional(),
  priorityOrder: z.number().int().min(1).nullable().optional(),
}).strict();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isValidId(params.id)) return badRequest('Invalid id');
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  try {
    const debt = await prisma.debt.findUnique({
      where: { id: params.id },
    });

    if (!debt || debt.userId !== auth.user.id) {
      return badRequest('Debt not found');
    }

    return NextResponse.json({ debt });
  } catch (error) {
    console.error('Error fetching debt:', error);
    return serverError('Failed to fetch debt');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isValidId(params.id)) return badRequest('Invalid id');
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  try {
    // First, verify the debt belongs to the user
    const existingDebt = await prisma.debt.findUnique({
      where: { id: params.id },
    });

    if (!existingDebt || existingDebt.userId !== auth.user.id) {
      return badRequest('Debt not found');
    }

    const body = await request.json();
    const updates = UpdateDebtSchema.parse(body);
    const userId = auth.user.id;

    const updatedDebt = await prisma.$transaction(async (tx) => {
      const debt = await tx.debt.update({
        where: { id: params.id },
        data: updates,
      });

      // A manual balance edit must also sync this month's snapshot, or the
      // Actual vs Projected chart diverges from the real balance.
      if (updates.balance !== undefined) {
        const now = new Date();
        const recordedAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        await tx.balanceSnapshot.upsert({
          where: { debtId_recordedAt: { debtId: params.id, recordedAt } },
          update: { balance: debt.balance },
          create: { debtId: params.id, userId, balance: debt.balance, recordedAt },
        });
      }

      return debt;
    });

    return NextResponse.json({ debt: updatedDebt });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message || 'Invalid request payload');
    }
    console.error('Error updating debt:', error);
    return serverError('Failed to update debt');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isValidId(params.id)) return badRequest('Invalid id');
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  try {
    // First, verify the debt belongs to the user
    const existingDebt = await prisma.debt.findUnique({
      where: { id: params.id },
    });

    if (!existingDebt || existingDebt.userId !== auth.user.id) {
      return badRequest('Debt not found');
    }

    await prisma.debt.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting debt:', error);
    return serverError('Failed to delete debt');
  }
}

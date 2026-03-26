import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, badRequest, serverError, isValidId } from '@/lib/auth-server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

const CreatePaymentSchema = z.object({
  debtId:   z.string().min(1),
  amount:   z.number().min(0),
  dueYear:  z.number().int(),
  dueMonth: z.number().int().min(0).max(11),
});

/** GET /api/payments?year=2025&month=2 — returns all payment records for that month */
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const year  = parseInt(searchParams.get('year')  ?? '', 10);
  const month = parseInt(searchParams.get('month') ?? '', 10);

  if (isNaN(year) || isNaN(month) || month < 0 || month > 11) {
    return badRequest('year and month (0-11) are required');
  }

  try {
    const records = await prisma.paymentRecord.findMany({
      where: { userId: auth.user.id, dueYear: year, dueMonth: month },
    });
    return NextResponse.json({ records });
  } catch (error) {
    console.error('Error fetching payment records:', error);
    return serverError('Failed to fetch payment records');
  }
}

/** POST /api/payments — mark a debt payment as paid (upsert) */
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  try {
    const body = await request.json();
    const { debtId, amount, dueYear, dueMonth } = CreatePaymentSchema.parse(body);

    if (!isValidId(debtId)) return badRequest('Invalid debtId');

    const debt = await prisma.debt.findUnique({ where: { id: debtId } });
    if (!debt || debt.userId !== auth.user.id) return badRequest('Debt not found');

    let record;
    let updatedBalance = debt.balance;
    let shouldDecrementBalance = false;

    try {
      record = await prisma.paymentRecord.create({
        data: { userId: auth.user.id, debtId, amount, dueYear, dueMonth },
      });
      shouldDecrementBalance = true;
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
        throw error;
      }

      // Already marked for this debt/month: update metadata without re-applying balance change.
      record = await prisma.paymentRecord.update({
        where: { debtId_dueYear_dueMonth: { debtId, dueYear, dueMonth } },
        data: { amount, paidAt: new Date() },
      });
    }

    if (shouldDecrementBalance) {
      // Subtract payment from debt balance (floor at 0) only on first mark-paid create.
      const updatedDebt = await prisma.debt.update({
        where: { id: debtId },
        data: { balance: { decrement: amount } },
      });
      if (updatedDebt.balance < 0) {
        await prisma.debt.update({ where: { id: debtId }, data: { balance: 0 } });
        updatedBalance = 0;
      } else {
        updatedBalance = updatedDebt.balance;
      }
    }

    // Record a balance snapshot for this month
    const snapshotDate = new Date(Date.UTC(dueYear, dueMonth, 1));
    await prisma.balanceSnapshot.upsert({
      where: { debtId_recordedAt: { debtId, recordedAt: snapshotDate } },
      update: { balance: updatedBalance },
      create: { debtId, userId: auth.user.id, balance: updatedBalance, recordedAt: snapshotDate },
    });

    return NextResponse.json({ record, updatedBalance }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message || 'Invalid payload');
    }
    console.error('Error saving payment record:', error);
    return serverError('Failed to save payment record');
  }
}

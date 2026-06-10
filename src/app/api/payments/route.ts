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
  // 'mark' = idempotent mark-as-paid (repeat calls are no-ops so a reminder
  // button can never overwrite a logged payment); 'log' = a payment event
  // (repeat calls add to the month's total and deduct from the balance).
  mode:     z.enum(['mark', 'log']).default('mark'),
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

/** POST /api/payments — record a debt payment ('mark' is idempotent, 'log' is additive) */
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  try {
    const body = await request.json();
    const { debtId, amount, dueYear, dueMonth, mode } = CreatePaymentSchema.parse(body);

    if (!isValidId(debtId)) return badRequest('Invalid debtId');

    const debt = await prisma.debt.findUnique({ where: { id: debtId } });
    if (!debt || debt.userId !== auth.user.id) return badRequest('Debt not found');

    let record;
    let updatedBalance: number;

    try {
      // Create the record and deduct the balance atomically so they can never drift apart.
      const [created, updatedDebt] = await prisma.$transaction([
        prisma.paymentRecord.create({
          data: { userId: auth.user.id, debtId, amount, dueYear, dueMonth },
        }),
        prisma.debt.update({
          where: { id: debtId },
          data: { balance: { decrement: amount } },
        }),
      ]);
      record = created;
      updatedBalance = updatedDebt.balance;
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
        throw error;
      }

      // A record already exists for this debt/month.
      const existingRecord = await prisma.paymentRecord.findUnique({
        where: { debtId_dueYear_dueMonth: { debtId, dueYear, dueMonth } },
      });
      if (!existingRecord) throw error;

      if (mode === 'mark') {
        // Idempotent: the month is already marked paid, so a repeated "mark paid"
        // (reminder toast, calendar, notification) must not overwrite a logged
        // amount or move the balance.
        return NextResponse.json(
          { record: existingRecord, updatedBalance: debt.balance, alreadyMarked: true },
          { status: 200 },
        );
      }

      // 'log': another payment this month — add it to the month's total and
      // deduct it from the balance, atomically.
      const [updatedRecord, updatedDebt] = await prisma.$transaction([
        prisma.paymentRecord.update({
          where: { debtId_dueYear_dueMonth: { debtId, dueYear, dueMonth } },
          data: { amount: { increment: amount }, paidAt: new Date() },
        }),
        prisma.debt.update({
          where: { id: debtId },
          data: { balance: { decrement: amount } },
        }),
      ]);
      record = updatedRecord;
      updatedBalance = updatedDebt.balance;
    }

    if (updatedBalance < 0) {
      // Floor the balance at 0 (overpayment of the remaining balance).
      await prisma.debt.update({ where: { id: debtId }, data: { balance: 0 } });
      updatedBalance = 0;
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

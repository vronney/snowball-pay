import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, badRequest, serverError, isValidId } from '@/lib/auth-server';
import { z } from 'zod';

const UpdatePaymentSchema = z.object({ amount: z.number().positive() });

/** DELETE /api/payments/[id] — unmark a payment as paid */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isValidId(params.id)) return badRequest('Invalid id');
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  try {
    const record = await prisma.paymentRecord.findUnique({ where: { id: params.id } });
    if (!record || record.userId !== auth.user.id) return badRequest('Record not found');

    // Delete the record, restore the debt balance, and revert this month's
    // snapshot to the pre-payment balance atomically, so the Actual vs
    // Projected chart can never drift from the real balance.
    const snapshotDate = new Date(Date.UTC(record.dueYear, record.dueMonth, 1));
    await prisma.$transaction([
      prisma.paymentRecord.delete({ where: { id: params.id } }),
      prisma.debt.update({
        where: { id: record.debtId },
        data: { balance: { increment: record.amount } },
      }),
      prisma.balanceSnapshot.updateMany({
        where: { debtId: record.debtId, recordedAt: snapshotDate },
        data: { balance: { increment: record.amount } },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting payment record:', error);
    return serverError('Failed to delete payment record');
  }
}

/** PATCH /api/payments/[id] — update payment amount and adjust debt balance */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isValidId(params.id)) return badRequest('Invalid id');
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  try {
    const body = await request.json();
    const { amount } = UpdatePaymentSchema.parse(body);

    const record = await prisma.paymentRecord.findUnique({ where: { id: params.id } });
    if (!record || record.userId !== auth.user.id) return badRequest('Record not found');

    // delta > 0 means new amount is larger (balance goes down more); < 0 means balance goes back up
    const delta = amount - record.amount;
    const snapshotDate = new Date(Date.UTC(record.dueYear, record.dueMonth, 1));

    // Update the record, the debt balance, and that month's snapshot atomically.
    // Balance and snapshot are floored at 0 (an edit can exceed the remaining balance).
    const updated = await prisma.$transaction(async (tx) => {
      const updatedRecord = await tx.paymentRecord.update({
        where: { id: params.id },
        data: { amount, paidAt: new Date() },
      });

      const updatedDebt = await tx.debt.update({
        where: { id: record.debtId },
        data: { balance: { decrement: delta } },
      });
      if (updatedDebt.balance < 0) {
        await tx.debt.update({ where: { id: record.debtId }, data: { balance: 0 } });
      }

      // Keep that month's snapshot in sync with the amount delta.
      const snapshot = await tx.balanceSnapshot.findUnique({
        where: { debtId_recordedAt: { debtId: record.debtId, recordedAt: snapshotDate } },
      });
      if (snapshot) {
        await tx.balanceSnapshot.update({
          where: { id: snapshot.id },
          data: { balance: Math.max(0, snapshot.balance - delta) },
        });
      }

      return updatedRecord;
    });

    return NextResponse.json({ record: updated });
  } catch (error) {
    if (error instanceof z.ZodError) return badRequest(error.issues[0]?.message || 'Invalid payload');
    console.error('Error updating payment record:', error);
    return serverError('Failed to update payment record');
  }
}

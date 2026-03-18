import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, badRequest, serverError } from '@/lib/auth-server';
import { z } from 'zod';

const CreateSnapshotSchema = z.object({
  balance: z.number().min(0),
  recordedAt: z.string().datetime(),
});

function normalizeToUtcMonthStart(dateIso: string): Date {
  const d = new Date(dateIso);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  try {
    const debt = await prisma.debt.findUnique({ where: { id: params.id } });
    if (!debt || debt.userId !== auth.user.id) return badRequest('Debt not found');

    const snapshots = await prisma.balanceSnapshot.findMany({
      where: { debtId: params.id },
      orderBy: { recordedAt: 'asc' },
    });
    
    return NextResponse.json({ snapshots });
  } catch (error) {
    console.error('Error fetching snapshots:', error);
    return serverError('Failed to fetch snapshots');
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  try {
    const debt = await prisma.debt.findUnique({ where: { id: params.id } });
    if (!debt || debt.userId !== auth.user.id) return badRequest('Debt not found');

    const body = await request.json();
    const { balance, recordedAt } = CreateSnapshotSchema.parse(body);
    const normalizedRecordedAt = normalizeToUtcMonthStart(recordedAt);

    // Upsert so logging the same debt + month updates instead of creating duplicates.
    const snapshot = await prisma.balanceSnapshot.upsert({
      where: { debtId_recordedAt: { debtId: params.id, recordedAt: normalizedRecordedAt } },
      create: { debtId: params.id, userId: auth.user.id, balance, recordedAt: normalizedRecordedAt },
      update: { balance },
    });

    return NextResponse.json({ snapshot }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message || 'Invalid payload');
    }
    console.error('Error saving snapshot:', error);
    return serverError('Failed to save snapshot');
  }
}

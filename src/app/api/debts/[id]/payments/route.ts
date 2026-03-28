import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, badRequest, serverError, isValidId } from '@/lib/auth-server';

/** GET /api/debts/[id]/payments — returns all payment records for a specific debt, newest first */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isValidId(params.id)) return badRequest('Invalid id');
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  try {
    const debt = await prisma.debt.findUnique({ where: { id: params.id } });
    if (!debt || debt.userId !== auth.user.id) return badRequest('Debt not found');

    const records = await prisma.paymentRecord.findMany({
      where: { debtId: params.id, userId: auth.user.id },
      orderBy: [{ dueYear: 'desc' }, { dueMonth: 'desc' }],
    });

    return NextResponse.json({ records });
  } catch (error) {
    console.error('Error fetching debt payment history:', error);
    return serverError('Failed to fetch payment history');
  }
}

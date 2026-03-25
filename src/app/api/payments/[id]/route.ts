import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, badRequest, serverError, isValidId } from '@/lib/auth-server';

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

    await prisma.paymentRecord.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting payment record:', error);
    return serverError('Failed to delete payment record');
  }
}

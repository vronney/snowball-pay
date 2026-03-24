import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, badRequest, serverError, isValidId } from '@/lib/auth-server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isValidId(params.id)) return badRequest('Invalid id');
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  try {
    const entry = await prisma.bonusIncome.findUnique({ where: { id: params.id } });
    if (!entry || entry.userId !== auth.user.id) return badRequest('Not found');

    await prisma.bonusIncome.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting bonus income:', error);
    return serverError('Failed to delete bonus income');
  }
}

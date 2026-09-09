import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, badRequest, serverError, isValidId } from '@/lib/auth-server';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; snapshotId: string }> }
) {
  // Next 15: route handler params is a Promise.
  const params = await context.params;
  if (!isValidId(params.id) || !isValidId(params.snapshotId)) return badRequest('Invalid id');
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  try {
    const snapshot = await prisma.balanceSnapshot.findUnique({
      where: { id: params.snapshotId },
    });

    if (!snapshot || snapshot.userId !== auth.user.id) {
      return badRequest('Snapshot not found');
    }

    await prisma.balanceSnapshot.delete({ where: { id: params.snapshotId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting snapshot:', error);
    return serverError('Failed to delete snapshot');
  }
}

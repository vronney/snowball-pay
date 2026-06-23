import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, serverError } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  try {
    // Filter to debts that still exist — orphaned snapshots from deleted debts
    // would otherwise inflate historical totals on the chart.
    const snapshots = await prisma.balanceSnapshot.findMany({
      where: {
        userId: auth.user.id,
        debt: { userId: auth.user.id },
      },
      orderBy: { recordedAt: 'asc' },
    });

    return NextResponse.json({ snapshots });
  } catch (error) {
    console.error('Error fetching snapshots:', error);
    return serverError('Failed to fetch snapshots');
  }
}

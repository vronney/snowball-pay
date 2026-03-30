import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, serverError } from '@/lib/auth-server';
import { generateICS } from '@/lib/calendar/generateICS';

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid) return unauthorized();

  try {
    const debts = await prisma.debt.findMany({
      where: { userId: auth.user.id, dueDate: { not: null } },
      select: {
        id: true,
        name: true,
        minimumPayment: true,
        dueDate: true,
        category: true,
        balance: true,
      },
    });

    if (debts.length === 0) {
      return NextResponse.json(
        { error: 'No debts with due dates found' },
        { status: 404 },
      );
    }

    const icsContent = generateICS(
      debts.map((d) => ({ ...d, dueDate: d.dueDate! })),
    );

    return new NextResponse(icsContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="debt-due-dates.ics"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Calendar export error:', error);
    return serverError('Failed to generate calendar file');
  }
}

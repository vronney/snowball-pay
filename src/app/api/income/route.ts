import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, serverError } from '@/lib/auth-server';
import { isPro, upgradeRequired } from '@/lib/gates';
import { z } from 'zod';

const IncomeSchema = z.object({
  monthlyTakeHome: z.number().min(0),
  essentialExpenses: z.number().min(0),
  extraPayment: z.number().min(0),
  // Optional, NOT defaulted: IncomeTab saves budget fields without a method,
  // and a default here would silently reset a saved avalanche/custom choice
  // on every income edit. Prisma defaults new rows to 'snowball'.
  payoffMethod: z.enum(['snowball', 'avalanche', 'custom']).optional(),
  accelerationAmount: z.number().min(0).nullable().optional(),
  source: z.string().optional(),
  frequency: z.string().default('monthly'),
});

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  try {
    const income = await prisma.income.findUnique({
      where: { userId: auth.user.id },
    });

    return NextResponse.json({ income: income || null });
  } catch (error) {
    console.error('Error fetching income:', error);
    return serverError('Failed to fetch income');
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  try {
    const body = await request.json();
    const validated = IncomeSchema.parse(body);

    const existingIncome = await prisma.income.findUnique({
      where: { userId: auth.user.id },
    });

    // Pro-only fields. The client hides both controls for free users, but
    // gate the API too so a direct POST can't set them.
    // - Acceleration: absent/null/0 always passes — clearing a what-if
    //   (e.g. right after a downgrade) must never be paywalled.
    // - Custom priority: only ENTERING custom is gated. A record already on
    //   custom (saved before a downgrade) keeps saving until the user
    //   switches away; snowball/avalanche always pass.
    const wantsAcceleration =
      typeof validated.accelerationAmount === 'number' &&
      validated.accelerationAmount > 0;
    const entersCustom =
      validated.payoffMethod === 'custom' &&
      existingIncome?.payoffMethod !== 'custom';
    if ((wantsAcceleration || entersCustom) && !(await isPro(auth.user.id))) {
      return upgradeRequired(
        wantsAcceleration ? 'What-if slider' : 'Custom priority order',
      );
    }

    let income;
    if (existingIncome) {
      income = await prisma.income.update({
        where: { userId: auth.user.id },
        data: validated,
      });
    } else {
      income = await prisma.income.create({
        data: {
          userId: auth.user.id,
          ...validated,
        },
      });
    }

    return NextResponse.json({ income });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Invalid request payload' },
        { status: 400 }
      );
    }
    console.error('Error saving income:', error);
    return serverError('Failed to save income');
  }
}

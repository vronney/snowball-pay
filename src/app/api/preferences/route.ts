import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, serverError } from '@/lib/auth-server';
import { z } from 'zod';

const PreferencesSchema = z.object({
  actionChecks:     z.record(z.string(), z.boolean()).optional(),
  sandboxMethod:    z.enum(['snowball', 'avalanche', 'custom']).optional(),
  sandboxExtra:     z.number().min(0).nullable().optional(),
  splitDebtPercent: z.number().int().min(0).max(100).optional(),
  shockMode:        z.enum(['none', 'income-10', 'expense-500']).optional(),
  notifyDueDates:   z.boolean().optional(),
  notifyLowBuffer:  z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  try {
    const prefs = await prisma.userPreferences.findUnique({
      where: { userId: auth.user.id },
    });
    return NextResponse.json({
      preferences: prefs ?? {
        actionChecks: {},
        sandboxMethod: 'snowball',
        sandboxExtra: null,
        splitDebtPercent: 70,
        shockMode: 'none',
        notifyDueDates: true,
        notifyLowBuffer: true,
      },
    });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    return serverError('Failed to fetch preferences');
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  try {
    const body = await request.json();
    const validated = PreferencesSchema.parse(body);

    const prefs = await prisma.userPreferences.upsert({
      where: { userId: auth.user.id },
      update: validated,
      create: { userId: auth.user.id, ...validated },
    });

    return NextResponse.json({ preferences: prefs });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Invalid request payload' },
        { status: 400 }
      );
    }
    console.error('Error saving preferences:', error);
    return serverError('Failed to save preferences');
  }
}

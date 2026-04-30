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
  emailOptOut:      z.boolean().optional(),
  emailDigest:      z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  try {
    const [prefs, user] = await Promise.all([
      prisma.userPreferences.findUnique({ where: { userId: auth.user.id } }),
      prisma.user.findUnique({ where: { id: auth.user.id }, select: { emailDigest: true } }),
    ]);
    return NextResponse.json({
      preferences: {
        actionChecks: {},
        sandboxMethod: 'snowball',
        sandboxExtra: null,
        splitDebtPercent: 70,
        shockMode: 'none',
        notifyDueDates: true,
        notifyLowBuffer: true,
        emailOptOut: false,
        ...(prefs ?? {}),
        emailDigest: user?.emailDigest ?? true,
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

    const { emailDigest, ...prefsData } = validated;

    const [prefs, user] = await Promise.all([
      prisma.userPreferences.upsert({
        where: { userId: auth.user.id },
        update: prefsData,
        create: { userId: auth.user.id, ...prefsData },
      }),
      emailDigest !== undefined
        ? prisma.user.update({ where: { id: auth.user.id }, data: { emailDigest }, select: { emailDigest: true } })
        : prisma.user.findUnique({ where: { id: auth.user.id }, select: { emailDigest: true } }),
    ]);

    return NextResponse.json({ preferences: { ...prefs, emailDigest: user?.emailDigest ?? true } });
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

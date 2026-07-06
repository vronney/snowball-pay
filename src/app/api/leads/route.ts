import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { badRequest, serverError } from '@/lib/auth-server';
import { limits } from '@/lib/rateLimit';

const leadSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(180),
  method: z.string().trim().max(20).optional(),
  debtFreeDate: z.string().trim().max(40).optional(),
  interestSaved: z.number().finite().nonnegative().optional(),
  // Honeypot field: real users should leave this empty. Must accept content
  // so filled values reach the fake-success branch instead of failing Zod.
  website: z.string().max(200).optional(),
});

// IP only — no user-agent. UA is attacker-controlled, and folding it into the
// key would mint a fresh rate-limit bucket per rotated UA string.
function getClientKey(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  return forwardedFor?.split(',')[0]?.trim() || 'unknown';
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON');
  }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest('Please provide a valid email address.');
  }

  const { email, method, debtFreeDate, interestSaved, website } = parsed.data;
  if (website && website.length > 0) {
    // Pretend success for bots to reduce probing.
    return NextResponse.json({ saved: true });
  }

  if (!(await limits.savePlanLead(getClientKey(request)))) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a few minutes and try again.' },
      { status: 429 },
    );
  }

  try {
    await prisma.calculatorLead.upsert({
      where: { email },
      create: { email, method, debtFreeDate, interestSaved },
      update: { method, debtFreeDate, interestSaved },
    });
    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error('[leads] failed', error);
    return serverError('Failed to save plan');
  }
}

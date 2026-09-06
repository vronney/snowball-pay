import { NextRequest, NextResponse } from 'next/server';
import { badRequest } from '@/lib/auth-server';
import { CalculateSchema, runCalculation } from '@/lib/planCalculate';

/**
 * POST /api/plan/calculate — public, no login.
 *
 * The web calculator runs the payoff math in the browser; the mobile app
 * calls this instead so both clients share ONE implementation
 * (src/lib/snowball.ts). Pure computation over the request body — nothing is
 * stored, so it sits in the middleware's PUBLIC_API_PATHS and is only
 * protected by the per-IP rate limit.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const parsed = CalculateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message || 'Invalid request payload');
  }

  return NextResponse.json(runCalculation(parsed.data));
}

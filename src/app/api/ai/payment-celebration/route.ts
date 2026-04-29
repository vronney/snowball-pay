import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, badRequest } from '@/lib/auth-server';
import { limits } from '@/lib/rateLimit';
import { anthropic, parseClaudeJson, extractTextBlocks } from '@/lib/claude';
import { detectMilestone, type MilestoneTier } from '@/lib/milestoneDetection';
import { computeHighlightStat } from '@/lib/highlightStat';

export const maxDuration = 15;

// ── Request schema ────────────────────────────────────────────────────────────

const RequestSchema = z.object({
  debtId:              z.string(),
  debtName:            z.string(),
  amountPaid:          z.number().positive(),
  totalDebtPaid:       z.number().min(0),
  totalDebtOriginal:   z.number().positive(),
  isFirstPayment:      z.boolean(),
  debtBalance:         z.number().min(0),
  debtOriginalBalance: z.number().positive(),
  debtCreatedAt:       z.string(),
  monthsSaved:         z.number().optional(),
});

type CelebrationRequest = z.infer<typeof RequestSchema>;

// ── Streak calculation ────────────────────────────────────────────────────────

async function getStreakMonths(userId: string): Promise<number> {
  // Build the last-6-month window as (year, month) pairs (month is 1-indexed)
  const now = new Date();
  const monthWindows: Array<{ dueYear: number; dueMonth: number }> = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthWindows.push({ dueYear: d.getFullYear(), dueMonth: d.getMonth() + 1 });
  }

  try {
    const records = await prisma.paymentRecord.findMany({
      where: {
        debt: { userId },
        OR: monthWindows.map(({ dueYear, dueMonth }) => ({ dueYear, dueMonth })),
      },
      select: { dueYear: true, dueMonth: true },
    });

    const uniqueMonths = new Set(records.map((r) => `${r.dueYear}-${r.dueMonth}`));
    return uniqueMonths.size;
  } catch {
    // DB failure — treat streak as zero rather than propagating a 500
    return 0;
  }
}

// ── Claude message builder ────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a supportive debt-payoff coach. The user just logged a payment.
Write one short, specific, encouraging message (max 30 words).
- Reference the debt name and amount paid
- Be direct and warm, not corporate or generic
- Never use: "amazing", "awesome", "fantastic", "journey", "game-changer", "seamless", "elevate"
- Return ONLY valid JSON: { "message": "..." }`;

function buildUserContext(body: CelebrationRequest, milestone: MilestoneTier): string {
  const pctPaid = body.totalDebtOriginal > 0
    ? ((body.totalDebtPaid / body.totalDebtOriginal) * 100).toFixed(0)
    : '0';

  const lines = [
    `Debt: ${body.debtName}`,
    `Amount paid now: $${body.amountPaid.toFixed(0)}`,
    `Remaining balance: $${body.debtBalance.toFixed(0)}`,
    `Total debt paid across all debts: $${body.totalDebtPaid.toFixed(0)} (${pctPaid}% of original)`,
    `Milestone: ${milestone ?? 'none — regular payment'}`,
  ];

  return lines.join('\n');
}

// ── Response schema ───────────────────────────────────────────────────────────

const CelebrationResponseSchema = z.object({
  message: z.string().min(1).max(200),
});

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  const allowed = await limits.paymentCelebration(auth.user.id);
  if (!allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  let body: CelebrationRequest;
  try {
    const raw = await request.json();
    const parsed = RequestSchema.safeParse(raw);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? 'Invalid payload');
    }
    body = parsed.data;
  } catch {
    return badRequest('Invalid JSON');
  }

  const streakMonths = await getStreakMonths(auth.user.id);
  const milestone = detectMilestone(body, streakMonths);

  const pctThisDebt = body.debtOriginalBalance > 0
    ? ((body.debtOriginalBalance - body.debtBalance) / body.debtOriginalBalance) * 100
    : 0;
  const pctAllDebts = body.totalDebtOriginal > 0
    ? (body.totalDebtPaid / body.totalDebtOriginal) * 100
    : 0;
  const highlightStat = computeHighlightStat({
    tier: milestone,
    monthsSaved: body.monthsSaved,
    pctThisDebt,
    pctAllDebts,
    debtName: body.debtName,
  });

  try {
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 4000);

    let rawText: string;
    try {
      const msg = await anthropic.messages.create(
        {
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 120,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: buildUserContext(body, milestone) }],
        },
        { signal: ac.signal },
      );
      rawText = extractTextBlocks(msg.content);
    } finally {
      clearTimeout(timeout);
    }

    const parsed = parseClaudeJson(rawText);
    const validated = CelebrationResponseSchema.safeParse(parsed);

    const message = validated.success
      ? validated.data.message
      : `${body.debtName} — payment logged.`;

    return NextResponse.json({
      message,
      milestoneLabel: milestone,
      highlightStat,
      ...buildPayoffExtras(body, milestone),
    });
  } catch {
    return NextResponse.json({
      message: `${body.debtName} — payment logged.`,
      milestoneLabel: milestone,
      highlightStat,
      ...buildPayoffExtras(body, milestone),
    });
  }
}

// ── Payoff card extras ────────────────────────────────────────────────────────

function buildPayoffExtras(
  body: CelebrationRequest,
  milestone: MilestoneTier,
): { paidTotal?: number; monthsElapsed?: number } {
  if (milestone !== 'debt_paid_off') return {};
  const paidTotal = body.debtOriginalBalance;
  const createdMs = new Date(body.debtCreatedAt).getTime();
  const monthsElapsed = isNaN(createdMs)
    ? undefined
    : Math.round((Date.now() - createdMs) / (1000 * 60 * 60 * 24 * 30));
  return { paidTotal, monthsElapsed };
}

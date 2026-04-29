import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized } from '@/lib/auth-server';
import { limits } from '@/lib/rateLimit';
import { anthropic, parseClaudeJson, extractTextBlocks } from '@/lib/claude';

export const maxDuration = 15;

// ── Response schema ───────────────────────────────────────────────────────────

const StoryResponseSchema = z.object({
  headline: z.string().min(1).max(100),
  body:     z.string().min(1).max(400),
});

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a supportive debt-payoff coach writing a short, personal progress update.
Based on the user's payment data, write a 2-3 sentence summary of their debt-free journey so far.
- Be warm, specific, and encouraging without being generic
- Reference their actual numbers (payments made, amount paid, streak)
- Focus on progress and momentum, not how much is left
- Never use: "amazing", "awesome", "fantastic", "game-changer", "seamless", "transformative"
- Return ONLY valid JSON: { "headline": "...", "body": "..." }
  headline: a short (≤8 words) chapter title (e.g. "Building Momentum Month by Month")
  body: 2-3 warm, specific sentences`;

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  const allowed = await limits.debtStory(auth.user.id);
  if (!allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  // Pull the data we need to build the story prompt
  const [debts, recentPayments] = await Promise.all([
    prisma.debt.findMany({
      where: { userId: auth.user.id },
      select: {
        name: true,
        balance: true,
        originalBalance: true,
        createdAt: true,
      },
    }),
    prisma.paymentRecord.findMany({
      where: { userId: auth.user.id },
      orderBy: { paidAt: 'desc' },
      take: 50,
      select: { amount: true, dueYear: true, dueMonth: true, paidAt: true },
    }),
  ]);

  if (recentPayments.length === 0) {
    return NextResponse.json({ empty: true });
  }

  // Compute summary stats for the prompt
  const totalPaid      = recentPayments.reduce((s, p) => s + p.amount, 0);
  const paymentCount   = recentPayments.length;
  const uniqueMonths   = new Set(recentPayments.map((p) => `${p.dueYear}-${p.dueMonth}`)).size;
  const totalOriginal  = debts.reduce((s, d) => s + (d.originalBalance ?? d.balance), 0);
  const totalRemaining = debts.reduce((s, d) => s + d.balance, 0);
  const paidOff        = debts.filter((d) => d.balance <= 0).length;

  const context = [
    `Payments logged: ${paymentCount}`,
    `Total amount paid toward debt: $${Math.round(totalPaid).toLocaleString()}`,
    `Active months in the plan: ${uniqueMonths}`,
    `Debts fully paid off: ${paidOff}`,
    `Total original debt: $${Math.round(totalOriginal).toLocaleString()}`,
    `Total remaining: $${Math.round(totalRemaining).toLocaleString()}`,
    `Progress: ${totalOriginal > 0 ? ((1 - totalRemaining / totalOriginal) * 100).toFixed(0) : 0}% paid down`,
  ].join('\n');

  try {
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 5000);

    let rawText: string;
    try {
      const msg = await anthropic.messages.create(
        {
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 200,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: context }],
        },
        { signal: ac.signal },
      );
      rawText = extractTextBlocks(msg.content);
    } finally {
      clearTimeout(timeout);
    }

    const parsed    = parseClaudeJson(rawText);
    const validated = StoryResponseSchema.safeParse(parsed);

    if (validated.success) {
      return NextResponse.json({
        headline: validated.data.headline,
        body:     validated.data.body,
        stats: { paymentCount, totalPaid, uniqueMonths, paidOff },
      });
    }

    // Claude returned unexpected shape — surface a safe fallback
    return NextResponse.json({
      headline: 'Your Debt Journey',
      body: `You've logged ${paymentCount} payment${paymentCount !== 1 ? 's' : ''} and paid down $${Math.round(totalPaid).toLocaleString()} so far. Keep going.`,
      stats: { paymentCount, totalPaid, uniqueMonths, paidOff },
    });
  } catch {
    return NextResponse.json(
      { error: 'story_unavailable' },
      { status: 503 },
    );
  }
}

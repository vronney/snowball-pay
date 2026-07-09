import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized } from '@/lib/auth-server';
import { limits } from '@/lib/rateLimit';
import { anthropic, parseClaudeJson, extractTextBlocks } from '@/lib/claude';
import { getCachedStory, setCachedStory, FALLBACK_TTL_SECONDS } from '@/lib/storyCache';

export const maxDuration = 15;

// ── Response schema ───────────────────────────────────────────────────────────

const StoryResponseSchema = z.object({
  headline: z.string().min(1).max(100),
  body:     z.string().min(1).max(400),
});

// ── Cache fingerprint ─────────────────────────────────────────────────────────

/**
 * Fingerprints the financial figures the story is built from, so a cache hit
 * only counts while those figures are unchanged (mirrors the dataHash approach
 * in the recommendations / coach-brief caches). Rounded to whole dollars so
 * float noise doesn't churn the hash.
 */
function buildStoryDataHash(s: {
  paymentCount: number;
  totalPaid: number;
  uniqueMonths: number;
  paidOff: number;
  totalOriginal: number;
  totalRemaining: number;
}): string {
  return [
    s.paymentCount,
    Math.round(s.totalPaid),
    s.uniqueMonths,
    s.paidOff,
    Math.round(s.totalOriginal),
    Math.round(s.totalRemaining),
  ].join('|');
}

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
  const userId = auth.user.id;

  // Pull the data the story is built from. This runs before the rate-limit check
  // because we need it to compute the cache fingerprint — a cache hit must NOT
  // consume a rate-limit token (repeat views / reloads shouldn't burn the 3/24h
  // budget when nothing has changed).
  const [debts, recentPayments] = await Promise.all([
    prisma.debt.findMany({
      where: { userId },
      select: {
        name: true,
        balance: true,
        originalBalance: true,
        createdAt: true,
      },
    }),
    prisma.paymentRecord.findMany({
      where: { userId },
      orderBy: { paidAt: 'desc' },
      take: 50,
      select: { amount: true, dueYear: true, dueMonth: true, paidAt: true },
    }),
  ]);

  if (recentPayments.length === 0) {
    return NextResponse.json({ empty: true });
  }

  // Compute summary stats for the prompt + fingerprint
  const totalPaid      = recentPayments.reduce((s, p) => s + p.amount, 0);
  const paymentCount   = recentPayments.length;
  const uniqueMonths   = new Set(recentPayments.map((p) => `${p.dueYear}-${p.dueMonth}`)).size;
  const totalOriginal  = debts.reduce((s, d) => s + (d.originalBalance ?? d.balance), 0);
  const totalRemaining = debts.reduce((s, d) => s + d.balance, 0);
  const paidOff        = debts.filter((d) => d.balance <= 0).length;

  const stats = { paymentCount, totalPaid, uniqueMonths, paidOff };
  const dataHash = buildStoryDataHash({
    paymentCount, totalPaid, uniqueMonths, paidOff, totalOriginal, totalRemaining,
  });

  // Serve the previously generated story when the financials are unchanged —
  // no Claude call, no rate-limit token consumed.
  const cached = await getCachedStory(userId, dataHash);
  if (cached) {
    return NextResponse.json(cached);
  }

  // Cache miss (first view or the data changed) — this is a real AI generation,
  // so it's rate-limited. The 429 is still handled gracefully by the client.
  const allowed = await limits.debtStory(userId);
  if (!allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const context = [
    `Payments logged: ${paymentCount}`,
    `Total amount paid toward debt: $${Math.round(totalPaid).toLocaleString()}`,
    `Active months in the plan: ${uniqueMonths}`,
    `Debts fully paid off: ${paidOff}`,
    `Total original debt: $${Math.round(totalOriginal).toLocaleString()}`,
    `Total remaining: $${Math.round(totalRemaining).toLocaleString()}`,
    `Progress: ${totalOriginal > 0 ? ((1 - totalRemaining / totalOriginal) * 100).toFixed(0) : 0}% paid down`,
  ].join('\n');

  // Deterministic fallback used whenever the AI story is unavailable
  // (timeout, upstream error, or an unexpected response shape). This is a
  // nice-to-have narrative, so a transient AI blip should degrade to a plain
  // summary — never a user-facing 503. The fallback is cached with a SHORT TTL
  // (see below) so a burst of reloads during an AI outage is served from cache
  // instead of each one draining a rate-limit token; it refreshes to the real
  // AI story within FALLBACK_TTL_SECONDS once Claude recovers.
  const fallback = {
    headline: 'Your Debt Journey',
    body: `You've logged ${paymentCount} payment${paymentCount !== 1 ? 's' : ''} and paid down $${Math.round(totalPaid).toLocaleString()} so far. Keep going.`,
    stats,
  };

  try {
    const ac = new AbortController();
    // Give Haiku more room than the old 5s (which clipped normal responses),
    // but stay well under maxDuration (15s). Auth, two Prisma queries, the cache
    // check and the rate-limit check run before this and can cost a few seconds
    // cold, so the abort must leave margin — otherwise a platform timeout (hard
    // 504) fires before our graceful catch below can serve the fallback.
    const timeout = setTimeout(() => ac.abort(), 9000);

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
      const payload = {
        headline: validated.data.headline,
        body:     validated.data.body,
        stats,
      };
      // Cache the successful story so subsequent views (until the data changes)
      // are served without a Claude call or a rate-limit token.
      await setCachedStory(userId, dataHash, payload);
      return NextResponse.json(payload);
    }

    // Claude returned an unexpected shape — surface the safe fallback, cached
    // briefly so reloads during the blip don't each burn a token.
    await setCachedStory(userId, dataHash, fallback, FALLBACK_TTL_SECONDS);
    return NextResponse.json(fallback);
  } catch {
    // Timeout or upstream failure — degrade gracefully rather than 503, and
    // cache the fallback briefly so reloads don't each burn a token.
    await setCachedStory(userId, dataHash, fallback, FALLBACK_TTL_SECONDS);
    return NextResponse.json(fallback);
  }
}

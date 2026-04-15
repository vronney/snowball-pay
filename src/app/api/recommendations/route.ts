import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, badRequest, serverError } from '@/lib/auth-server';
import { isPro, upgradeRequired } from '@/lib/gates';
import { z } from 'zod';
import { limits } from '@/lib/rateLimit';

export const maxDuration = 30;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a personal debt payoff advisor. Analyze the user's financial situation and provide 4 specific, actionable recommendations to help them pay off debt faster.

Rules:
- Reference actual dollar amounts from their data whenever possible
- Prioritize the highest-impact changes
- Be direct and specific — never generic
- Never use the words: "elevate", "seamless", "game-changer", "unleash", "journey", "delve"
- type "strategy" = payoff method or ordering advice
- type "cashflow" = income or spending optimization
- type "priority" = which specific debt to focus on and why
- type "savings" = interest savings or refinancing opportunities

Return ONLY valid JSON — no markdown fences, no explanation:
{
  "recommendations": [
    {
      "type": "strategy | cashflow | priority | savings",
      "impact": "high | medium | low",
      "title": "short headline under 8 words",
      "body": "2 specific sentences referencing their actual numbers",
      "action": "one clear next step under 12 words"
    }
  ]
}`;

function parseClaudeJson(raw: string): unknown {
  const clean = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  return JSON.parse(clean);
}

/** Deterministic fingerprint of the financial data used to detect staleness. */
function buildDataHash(body: RecommendationPayload): string {
  const totalDebt = body.debts.reduce((s, d) => s + d.balance, 0);
  const totalMin  = body.debts.reduce((s, d) => s + d.minimumPayment, 0);
  return [
    totalDebt.toFixed(0),
    totalMin.toFixed(0),
    body.monthlyTakeHome.toFixed(0),
    body.essentialExpenses.toFixed(0),
    body.recurringExpenses.toFixed(0),
    body.extraPayment.toFixed(0),
    body.planMonths,
  ].join('|');
}

const DebtItemSchema = z.object({
  name: z.string(),
  balance: z.number(),
  interestRate: z.number(),
  minimumPayment: z.number(),
  category: z.string(),
});

const RecommendationPayloadSchema = z.object({
  debts: z.array(DebtItemSchema).min(1, 'At least one debt is required'),
  monthlyTakeHome: z.number(),
  essentialExpenses: z.number(),
  recurringExpenses: z.number(),
  extraPayment: z.number(),
  planMonths: z.number(),
  totalInterestPaid: z.number(),
  availableCashFlow: z.number(),
});

type RecommendationPayload = z.infer<typeof RecommendationPayloadSchema>;

// ── GET — return cached recommendations ──────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  try {
    const cache = await prisma.aiRecommendationCache.findUnique({
      where: { userId: auth.user.id },
    });

    if (!cache) {
      return NextResponse.json({ recommendations: null, dataHash: null, generatedAt: null });
    }

    return NextResponse.json({
      recommendations: cache.recommendations,
      dataHash:        cache.dataHash,
      generatedAt:     cache.generatedAt,
    });
  } catch (error) {
    console.error('Recommendations GET error:', error);
    return serverError('Failed to load recommendations');
  }
}

// ── POST — generate new recommendations and upsert cache ─────────────────────

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  if (!(await isPro(auth.user.id))) {
    return upgradeRequired('AI recommendations');
  }

  if (!(await limits.recommendations(auth.user.id))) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before generating new recommendations.' },
      { status: 429 }
    );
  }

  try {
    const requestBody = await request.json();
    const parseResult = RecommendationPayloadSchema.safeParse(requestBody);
    if (!parseResult.success) {
      return badRequest(parseResult.error.issues[0]?.message ?? 'Invalid request payload');
    }
    const body: RecommendationPayload = parseResult.data;

    const totalDebt = body.debts.reduce((s, d) => s + d.balance, 0);
    const totalMin  = body.debts.reduce((s, d) => s + d.minimumPayment, 0);

    const debtList = body.debts
      .sort((a, b) => b.balance - a.balance)
      .map((d) => `  - ${d.name} (${d.category}): $${d.balance.toFixed(0)} balance, ${d.interestRate}% APR, $${d.minimumPayment}/mo minimum`)
      .join('\n');

    const years   = Math.floor(body.planMonths / 12);
    const months  = body.planMonths % 12;
    const timeStr = years > 0 ? `${years} years ${months} months` : `${months} months`;

    const userContext = `User's financial snapshot:

Debts (${body.debts.length} total, $${totalDebt.toFixed(0)} combined):
${debtList}

Monthly cash flow:
  - Take-home: $${body.monthlyTakeHome.toFixed(0)}
  - Essential expenses: $${body.essentialExpenses.toFixed(0)}
  - Recurring expenses: $${body.recurringExpenses.toFixed(0)}
  - Debt minimums: $${totalMin.toFixed(0)}
  - Extra payment committed: $${body.extraPayment.toFixed(0)}
  - Available for acceleration: $${body.availableCashFlow.toFixed(0)}

Current plan:
  - Payoff timeline: ${timeStr}
  - Total interest to be paid: $${body.totalInterestPaid.toFixed(0)}`;

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContext }],
    });

    const rawText = msg.content[0].type === 'text' ? msg.content[0].text : '';
    const claudeResponse = z.object({ recommendations: z.array(z.unknown()) })
      .safeParse(parseClaudeJson(rawText));
    if (!claudeResponse.success) {
      return serverError('Failed to parse AI response');
    }
    const parsed = claudeResponse.data;
    const dataHash = buildDataHash(body);

    // Upsert — one cache row per user
    const cache = await prisma.aiRecommendationCache.upsert({
      where:  { userId: auth.user.id },
      update: { recommendations: parsed.recommendations as object[], dataHash, generatedAt: new Date() },
      create: { userId: auth.user.id, recommendations: parsed.recommendations as object[], dataHash },
    });

    return NextResponse.json({
      recommendations: cache.recommendations,
      dataHash:        cache.dataHash,
      generatedAt:     cache.generatedAt,
    });
  } catch (error) {
    console.error('Recommendations POST error:', error);
    return serverError('Failed to generate recommendations');
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, badRequest, serverError } from '@/lib/auth-server';
import { isPro, upgradeRequired } from '@/lib/gates';
import { z } from 'zod';
import { limits } from '@/lib/rateLimit';
import { anthropic as client, parseClaudeJson, extractTextBlocks } from '@/lib/claude';

export const maxDuration = 30;

const RECOMMENDATION_TYPES = [
  'payoff_advice',
  'spending_insight',
  'month_change',
  'behavior_nudge',
  'debt_risk_alert',
  'negotiation_suggestion',
] as const;

type RecommendationType = (typeof RECOMMENDATION_TYPES)[number];

const SYSTEM_PROMPT = `You are a personal debt payoff advisor. Analyze the user's financial situation and provide exactly 6 recommendations, one for each insight type.

Rules:
- Reference actual dollar amounts from their data whenever possible
- Prioritize the highest-impact changes
- Be direct and specific - never generic
- Never use the words: "elevate", "seamless", "game-changer", "unleash", "journey", "delve"
- Include one recommendation for each type and do not repeat types:
  - "payoff_advice" = payoff method or ordering advice
  - "spending_insight" = spending optimization tied to current spend data
  - "month_change" = what changed this month using month-over-month debt movement
  - "behavior_nudge" = a practical habit or accountability nudge
  - "debt_risk_alert" = early warning based on debt stress/risk indicators
  - "negotiation_suggestion" = a script or plan to negotiate APR/fees/terms

Return ONLY valid JSON - no markdown fences, no explanation:
{
  "recommendations": [
    {
      "type": "payoff_advice | spending_insight | month_change | behavior_nudge | debt_risk_alert | negotiation_suggestion",
      "impact": "high | medium | low",
      "title": "short headline under 8 words",
      "body": "1-2 specific sentences referencing their actual numbers (max 35 words)",
      "action": "one clear next step under 12 words",
      "why": "one sentence explaining why this applies to THIS user based on their specific numbers (max 22 words)",
      "action_payload": {"action_type": "reallocate_funds", "source_amount": 54}
    }
  ]
}

action_payload rules:
- Include "action_payload" ONLY on the "spending_insight" recommendation, and ONLY when you identify a specific recurring expense the user could cut or reduce. Set "source_amount" to the monthly dollar savings.
- Omit "action_payload" entirely on all other recommendation types.`;


const RawRecommendationTypeSchema = z.enum([
  ...RECOMMENDATION_TYPES,
  // Legacy recommendation types retained for backwards compatibility.
  'strategy',
  'cashflow',
  'priority',
  'savings',
]);

type RawRecommendationType = z.infer<typeof RawRecommendationTypeSchema>;

const ActionPayloadSchema = z.discriminatedUnion('action_type', [
  z.object({ action_type: z.literal('reallocate_funds'), source_amount: z.number().positive() }),
]);

const RecommendationSchema = z.object({
  type: RawRecommendationTypeSchema,
  impact: z.enum(['high', 'medium', 'low']),
  title: z.string().min(1),
  body: z.string().min(1),
  action: z.string().min(1),
  why: z.string().optional(),
  action_payload: ActionPayloadSchema.optional().catch(undefined),
});

type RawRecommendation = z.infer<typeof RecommendationSchema>;
type NormalizedRecommendation = Omit<RawRecommendation, 'type'> & { type: RecommendationType };

function normalizeRecommendationType(type: RawRecommendationType): RecommendationType {
  switch (type) {
    case 'strategy':
      return 'payoff_advice';
    case 'cashflow':
      return 'spending_insight';
    case 'priority':
      return 'behavior_nudge';
    case 'savings':
      return 'negotiation_suggestion';
    default:
      return type;
  }
}

function normalizeRecommendations(input: RawRecommendation[]): NormalizedRecommendation[] {
  const byType = new Map<RecommendationType, NormalizedRecommendation>();
  for (const rec of input) {
    const type = normalizeRecommendationType(rec.type);
    if (byType.has(type)) continue;
    const normalized: NormalizedRecommendation = {
      ...rec,
      type,
      title: rec.title.trim(),
      body: rec.body.trim(),
      action: rec.action.trim(),
    };
    const why = rec.why?.trim();
    if (why) normalized.why = why;
    byType.set(type, normalized);
  }

  return RECOMMENDATION_TYPES
    .map((type) => byType.get(type))
    .filter((rec): rec is NormalizedRecommendation => Boolean(rec));
}

const DebtItemSchema = z.object({
  name: z.string(),
  balance: z.number(),
  interestRate: z.number(),
  minimumPayment: z.number(),
  category: z.string(),
  creditLimit: z.number().nullable().optional(),
});

const ExpenseItemSchema = z.object({
  name: z.string(),
  amount: z.number(),
  category: z.string(),
});

const RecommendationPayloadSchema = z.object({
  debts: z.array(DebtItemSchema).min(1, 'At least one debt is required'),
  expenseItems: z.array(ExpenseItemSchema),
  monthlyTakeHome: z.number(),
  essentialExpenses: z.number(),
  recurringExpenses: z.number(),
  extraPayment: z.number(),
  planMonths: z.number(),
  totalInterestPaid: z.number(),
  availableCashFlow: z.number(),
});

type RecommendationPayload = z.infer<typeof RecommendationPayloadSchema>;
type SnapshotRow = { debtId: string; balance: number; recordedAt: Date };

/** Deterministic fingerprint of the financial data used to detect staleness. */
function buildDataHash(body: RecommendationPayload): string {
  const totalDebt = body.debts.reduce((s, d) => s + d.balance, 0);
  const totalMin = body.debts.reduce((s, d) => s + d.minimumPayment, 0);
  const expenseSignature = [...body.expenseItems]
    .sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
    .slice(0, 5)
    .map((e) => `${e.category}:${e.amount.toFixed(0)}`)
    .join(',');

  return [
    totalDebt.toFixed(0),
    totalMin.toFixed(0),
    body.monthlyTakeHome.toFixed(0),
    body.essentialExpenses.toFixed(0),
    body.recurringExpenses.toFixed(0),
    body.extraPayment.toFixed(0),
    body.planMonths,
    expenseSignature,
  ].join('|');
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  return date.toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function buildMonthlyDebtSeries(snapshots: SnapshotRow[]): Array<{ month: string; totalDebt: number }> {
  if (snapshots.length === 0) return [];

  const byDebt = new Map<string, Array<{ month: string; balance: number }>>();
  for (const snapshot of snapshots) {
    const key = monthKey(snapshot.recordedAt);
    if (!byDebt.has(snapshot.debtId)) byDebt.set(snapshot.debtId, []);
    byDebt.get(snapshot.debtId)!.push({ month: key, balance: snapshot.balance });
  }

  for (const points of byDebt.values()) {
    points.sort((a, b) => a.month.localeCompare(b.month));
  }

  const allMonths = [...new Set(snapshots.map((snapshot) => monthKey(snapshot.recordedAt)))].sort();
  const totals: Array<{ month: string; totalDebt: number }> = [];

  for (const currentMonth of allMonths) {
    let total = 0;
    for (const points of byDebt.values()) {
      if (points[0].month > currentMonth) continue;
      let latest = points[0].balance;
      for (const point of points) {
        if (point.month <= currentMonth) latest = point.balance;
        else break;
      }
      total += latest;
    }
    totals.push({ month: currentMonth, totalDebt: total });
  }

  return totals;
}

function buildMonthChangeContext(currentTotalDebt: number, snapshots: SnapshotRow[]): string {
  const series = buildMonthlyDebtSeries(snapshots);
  if (series.length >= 2) {
    const latest = series[series.length - 1];
    const previous = series[series.length - 2];
    const delta = latest.totalDebt - previous.totalDebt;
    const pct = previous.totalDebt > 0 ? (delta / previous.totalDebt) * 100 : 0;

    return [
      `- Latest snapshot month: ${monthLabel(latest.month)}.`,
      `- Debt moved ${delta < 0 ? 'down' : 'up'} by $${Math.abs(delta).toFixed(0)} (${Math.abs(pct).toFixed(1)}%) vs ${monthLabel(previous.month)}.`,
    ].join('\n');
  }

  if (series.length === 1) {
    const latest = series[0];
    const delta = currentTotalDebt - latest.totalDebt;

    return [
      `- One snapshot month available: ${monthLabel(latest.month)}.`,
      `- Current debt is ${delta < 0 ? 'down' : 'up'} by $${Math.abs(delta).toFixed(0)} vs that snapshot month.`,
    ].join('\n');
  }

  return '- No monthly snapshot history yet.';
}

// GET - return cached recommendations
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
      dataHash: cache.dataHash,
      generatedAt: cache.generatedAt,
    });
  } catch (error) {
    console.error('Recommendations GET error:', error);
    return serverError('Failed to load recommendations');
  }
}

// POST - generate new recommendations and upsert cache
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
    const totalMin = body.debts.reduce((s, d) => s + d.minimumPayment, 0);

    const snapshots = await prisma.balanceSnapshot.findMany({
      where: { userId: auth.user.id },
      select: { debtId: true, balance: true, recordedAt: true },
      orderBy: { recordedAt: 'asc' },
    });

    const monthChangeContext = buildMonthChangeContext(totalDebt, snapshots);

    const debtList = [...body.debts]
      .sort((a, b) => b.balance - a.balance)
      .map((d) => {
        const utilization =
          d.category === 'Credit Card' && (d.creditLimit ?? 0) > 0
            ? `, ${((d.balance / (d.creditLimit ?? 1)) * 100).toFixed(0)}% utilization`
            : '';
        return `  - ${d.name} (${d.category}): $${d.balance.toFixed(0)} balance, ${d.interestRate}% APR, $${d.minimumPayment.toFixed(0)}/mo minimum${utilization}`;
      })
      .join('\n');

    const topExpenses = [...body.expenseItems]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map((e) => `  - ${e.name} (${e.category}): $${e.amount.toFixed(0)}/mo`)
      .join('\n');

    const highAprDebts = body.debts.filter((d) => d.interestRate >= 20);
    const highUtilDebts = body.debts.filter(
      (d) => d.category === 'Credit Card' && (d.creditLimit ?? 0) > 0 && d.balance / (d.creditLimit ?? 1) >= 0.8,
    );
    const debtLoadPct = body.monthlyTakeHome > 0
      ? ((totalMin + body.extraPayment) / body.monthlyTakeHome) * 100
      : 0;

    const years = Math.floor(body.planMonths / 12);
    const months = body.planMonths % 12;
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

Top recurring spending items:
${topExpenses || '  - No recurring expense items supplied.'}

What changed this month context:
${monthChangeContext}

Debt risk indicators:
  - Debt payment load (minimums + extra): ${debtLoadPct.toFixed(1)}% of take-home pay
  - High APR debts (>=20%): ${highAprDebts.length}
  - High credit utilization cards (>=80%): ${highUtilDebts.length}

Current plan:
  - Payoff timeline: ${timeStr}
  - Total interest to be paid: $${body.totalInterestPaid.toFixed(0)}`;

    let msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1400,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContext }],
    });

    let rawText = extractTextBlocks(msg.content);
    let parsedJson = parseClaudeJson(rawText);

    // Claude responses can truncate mid-JSON when max_tokens is hit.
    if (!parsedJson && msg.stop_reason === 'max_tokens') {
      msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `${userContext}

IMPORTANT:
- Your previous response was truncated.
- Return compact JSON only.
- No prose before or after the JSON object.`,
          },
        ],
      });
      rawText = extractTextBlocks(msg.content);
      parsedJson = parseClaudeJson(rawText);
    }

    if (!parsedJson) {
      console.warn('AI response remained unparsable', {
        stopReason: msg.stop_reason,
        preview: rawText.slice(0, 300),
      });
      return serverError('Failed to parse AI response');
    }

    const claudeResponse = z.object({ recommendations: z.array(RecommendationSchema).min(4).max(10) })
      .safeParse(parsedJson);

    if (!claudeResponse.success) {
      console.error('Zod validation failed on Claude response', {
        issues: claudeResponse.error.issues,
        preview: JSON.stringify(parsedJson).slice(0, 500),
      });
      return serverError('Failed to parse AI response');
    }

    const normalizedRecommendations = normalizeRecommendations(claudeResponse.data.recommendations);
    if (normalizedRecommendations.length === 0) {
      return serverError('AI did not return valid recommendations');
    }

    const dataHash = buildDataHash(body);

    // Upsert - one cache row per user
    const cache = await prisma.aiRecommendationCache.upsert({
      where: { userId: auth.user.id },
      update: {
        recommendations: normalizedRecommendations as object[],
        dataHash,
        generatedAt: new Date(),
      },
      create: {
        userId: auth.user.id,
        recommendations: normalizedRecommendations as object[],
        dataHash,
      },
    });

    return NextResponse.json({
      recommendations: cache.recommendations,
      dataHash: cache.dataHash,
      generatedAt: cache.generatedAt,
    });
  } catch (error) {
    console.error('Recommendations POST error:', error);
    return serverError('Failed to generate recommendations');
  }
}

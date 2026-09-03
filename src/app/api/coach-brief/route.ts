import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, badRequest, serverError } from '@/lib/auth-server';
import { isPro, upgradeRequired } from '@/lib/gates';
import { z } from 'zod';
import { limits } from '@/lib/rateLimit';
import { anthropic as client, parseClaudeJson, extractTextBlocks } from '@/lib/claude';
import { calculatePlanMetrics, calculateMinimumsOnlyResult, isPayoffMethod } from '@/lib/payoffPlan';
import { isActiveDebt } from '@/lib/monthlyFocusDebt';
import { selectMonthlyFocusDebt } from '@/lib/monthlyFocusDebt';
import { formatMonths } from '@/lib/utils';
import { CoachBriefSchema, normalizeModelBrief, findBriefViolation, toClientBrief, parseLawfulStoredBrief, type CoachBrief, type StoredCoachBrief } from '@/lib/coachBriefSafety';
import type { Debt } from '@/types';

export const maxDuration = 30;

const SYSTEM_PROMPT = `You are a personal debt payoff coach. You are given one user's full financial snapshot and must return a single verdict plus the ONE best next action for this month.

Rules:
- Reference actual dollar amounts from their data whenever possible.
- The verdict "summary" must explain WHY the status was chosen using real numbers (max 40 words).
- "status" = "on_track" when payments are current, cash flow has buffer, and no Plaid sync issues exist. "at_risk" when one concerning signal exists (thin buffer, a missed recent payment, stale linked-account data, high utilization). "off_track" when multiple risk signals stack or cash flow is negative.
- nextAction must be the single highest-impact action for this month, not a generic tip. Pick from: payoff order change, the size of the EXTRA/acceleration payment, due-date risk, reconnecting a bank login, or one concrete expense tradeoff.

HARD LAW — enforced by code, not just this prompt. A response that breaks it is discarded automatically before any user sees it:
- Every debt's minimum payment is paid in full, every month, with no exceptions. You may NEVER suggest skipping, pausing, reducing, delaying, or redirecting money away from any debt's minimum payment, in any phrasing — doing so risks late fees, penalty APRs, and credit damage.
- The ONLY money you may propose moving between debts is the discretionary "Planned acceleration" amount stated in the data below. That figure is a hard ceiling.
- "redirectAmount" must equal the total EXTRA dollars (never any minimum) your nextAction proposes moving this month. It is compared programmatically against the stated Planned acceleration — if it exceeds that ceiling, the response is rejected outright. Use 0 when nextAction does not move money between debts.
- "kind" must be one of: "set_acceleration", "reconnect_bank", "log_payments", "review_refinance", or "keep_course".
- Use "set_acceleration" only when recommending a new total monthly EXTRA/acceleration payment. In that case, "targetExtra" MUST be a number of 0 or more (e.g. 750; 0 means drop extra to zero and pay minimums only) — never null — and cannot exceed the stated Available cash flow after essentials and minimums. A "set_acceleration" action with "targetExtra": null is rejected.
- "outcome" must ALWAYS be null, for every kind including "set_acceleration" — the server computes the real outcome from "targetExtra" with plan-engine math. Never invent an outcome object.
- For every other kind, return "targetExtra": null and "outcome": null.
- Never claim a debt will be paid off, eliminated, cleared, wiped out, or reach zero within any timeframe unless the total payment you propose for it (its minimum + the extra) covers its FULL current balance from the data. This is checked arithmetically — an impossible claim is rejected outright. When a balance will remain, state the remaining balance instead.
- "payoffClaims" is where you DECLARE such claims instead of leaving them to be read out of your sentences. It is a LIST with ONE ENTRY PER DEBT you say will be paid off, eliminated, cleared, wiped out, gone, or reaching zero. Each entry is {"debtName": "<the debt's name>", "horizonMonths": <whole months from now until that balance reaches zero>}. Use 1 for "by month-end" or "this month". If you make no such claim about any debt, use an empty list [].
- If one sentence names two debts as being paid off, that is TWO entries. Never describe two debts with one entry, and never leave a debt out because another entry already covers the sentence.
- "debtName" is the debt's name ONLY, copied from the "Active debts" list below and stopping before the category in parentheses: for a line reading "Store Card (Credit Card): $410 balance", the name is "Store Card".
- "horizonMonths" must be a whole number, and it belongs to that entry's debt alone. Two debts paid off on different timelines get different numbers.
- Every entry is checked against its own debt's real balance: horizonMonths x (that debt's minimum + the extra you propose for it) must cover that balance. If ANY entry is impossible the whole response is rejected.
- When you cannot fund a payoff, do NOT simply drop that debt from the list and leave the sentence standing. Rewrite the sentence so it no longer says that debt gets paid off, and give the balance that will remain instead. The list and your text must describe the same thing: dropping an entry while the prose still promises the payoff is the one shape that would mislead a reader.
- An empty list does NOT hide a claim your text makes — your sentences are checked too, and where they state a timeframe, that timeframe is what counts.
- Keep tone calm and practical. No shame, hype, or vague encouragement.
- Never use the words: "elevate", "seamless", "game-changer", "unleash", "journey", "delve"

Return ONLY valid JSON - no markdown fences, no explanation:
{
  "verdict": {
    "status": "on_track | at_risk | off_track",
    "headline": "under 8 words",
    "summary": "1-2 sentences, max 40 words, references real numbers"
  },
  "nextAction": {
    "title": "under 8 words",
    "body": "1-2 sentences, max 35 words, references real numbers",
    "action": "one clear next step under 12 words",
    "impact": "high | medium | low",
    "kind": "set_acceleration | reconnect_bank | log_payments | review_refinance | keep_course",
    "targetExtra": null,
    "outcome": null,
    "redirectAmount": 0,
    "payoffClaims": []
  }
}

The template shows "targetExtra": null, which is correct for every kind EXCEPT "set_acceleration". When kind is "set_acceleration", replace that null with the new total extra payment as a number of 0 or more (for example 750); leaving it null makes the response invalid.`;

// ── Data gathering helpers ──────────────────────────────────────────────────

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

type SnapshotRow = { debtId: string; balance: number; recordedAt: Date };

/** Total debt by month, carrying the last known balance forward per debt. */
function buildMonthlyDebtSeries(snapshots: SnapshotRow[]): Array<{ month: string; totalDebt: number }> {
  if (snapshots.length === 0) return [];

  const byDebt = new Map<string, Array<{ month: string; balance: number }>>();
  for (const snapshot of snapshots) {
    const key = monthKey(snapshot.recordedAt);
    if (!byDebt.has(snapshot.debtId)) byDebt.set(snapshot.debtId, []);
    byDebt.get(snapshot.debtId)!.push({ month: key, balance: snapshot.balance });
  }
  for (const points of byDebt.values()) points.sort((a, b) => a.month.localeCompare(b.month));

  const allMonths = [...new Set(snapshots.map((s) => monthKey(s.recordedAt)))].sort();
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

/** Snapshot-based variance: actual month-over-month debt movement vs the pace the plan expects. */
function buildVarianceContext(
  snapshots: SnapshotRow[],
  expectedMonthlyPaydown: number,
): string {
  const series = buildMonthlyDebtSeries(snapshots);
  if (series.length < 2) {
    return series.length === 1
      ? `- Only one snapshot month on record (${monthLabel(series[0].month)}) — not enough history to measure pace yet.`
      : '- No monthly snapshot history yet — pace cannot be verified against the plan.';
  }

  const latest = series[series.length - 1];
  const previous = series[series.length - 2];
  const actualDelta = previous.totalDebt - latest.totalDebt; // positive = balance went down
  const gap = actualDelta - expectedMonthlyPaydown;

  return [
    `- Debt moved from $${previous.totalDebt.toFixed(0)} (${monthLabel(previous.month)}) to $${latest.totalDebt.toFixed(0)} (${monthLabel(latest.month)}).`,
    `- Actual paydown: $${actualDelta.toFixed(0)}/mo vs plan's expected pace of roughly $${expectedMonthlyPaydown.toFixed(0)}/mo (minimums + acceleration, before interest).`,
    gap < -25
      ? `- That is $${Math.abs(gap).toFixed(0)}/mo behind the expected pace.`
      : gap > 25
        ? `- That is $${gap.toFixed(0)}/mo ahead of the expected pace.`
        : '- That is roughly on pace.',
  ].join('\n');
}

function buildPaymentHistoryContext(
  records: Array<{ debtId: string; dueYear: number; dueMonth: number; paidAt: Date }>,
  activeDebtCount: number,
): { context: string; recentAdherencePct: number } {
  if (activeDebtCount === 0 || records.length === 0) {
    return { context: '- No payment history logged yet.', recentAdherencePct: 0 };
  }

  const now = new Date();
  const monthsBack = [0, 1, 2].map((offset) => {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const lines = monthsBack.map(({ year, month }) => {
    const count = new Set(
      records.filter((r) => r.dueYear === year && r.dueMonth === month).map((r) => r.debtId),
    ).size;
    const label = new Date(year, month, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
    return `  - ${label}: ${count}/${activeDebtCount} debts logged as paid`;
  });

  const pastMonths = monthsBack.slice(1); // exclude current (still in progress)
  const pastAdherence = pastMonths.map(({ year, month }) => {
    const count = new Set(
      records.filter((r) => r.dueYear === year && r.dueMonth === month).map((r) => r.debtId),
    ).size;
    return activeDebtCount > 0 ? count / activeDebtCount : 0;
  });
  const recentAdherencePct = pastAdherence.length
    ? (pastAdherence.reduce((s, v) => s + v, 0) / pastAdherence.length) * 100
    : 0;

  return { context: ['- Last 3 months logged payments:', ...lines].join('\n'), recentAdherencePct };
}

function buildPlaidSyncContext(
  linkedDebts: Debt[],
  plaidItems: Array<{ institutionName: string | null; needsReauth: boolean; lastSyncedAt: Date | null }>,
): { context: string; hasReauthIssue: boolean; hasStaleSync: boolean } {
  if (linkedDebts.length === 0 && plaidItems.length === 0) {
    return { context: '- No linked bank accounts.', hasReauthIssue: false, hasStaleSync: false };
  }

  const hasReauthIssue = plaidItems.some((item) => item.needsReauth);
  const staleCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const hasStaleSync = linkedDebts.some(
    (debt) => !debt.lastSyncedAt || new Date(debt.lastSyncedAt).getTime() < staleCutoff,
  );

  const lines: string[] = [
    `- ${linkedDebts.length} debt${linkedDebts.length === 1 ? '' : 's'} linked via Plaid across ${plaidItems.length} institution${plaidItems.length === 1 ? '' : 's'}.`,
  ];
  if (hasReauthIssue) {
    const names = plaidItems.filter((i) => i.needsReauth).map((i) => i.institutionName ?? 'a linked bank');
    lines.push(`- Reauth required for: ${names.join(', ')}. Balances there may be stale until reconnected.`);
  }
  if (hasStaleSync) {
    lines.push('- One or more linked accounts have not synced in over 7 days.');
  }
  if (!hasReauthIssue && !hasStaleSync && linkedDebts.length > 0) {
    lines.push('- All linked accounts are synced and current.');
  }

  return { context: lines.join('\n'), hasReauthIssue, hasStaleSync };
}

/** Deterministic fingerprint of the data used, to detect staleness. */
function buildDataHash(input: {
  totalDebt: number;
  totalMin: number;
  income: { monthlyTakeHome: number; essentialExpenses: number } | null;
  recurringExpenses: number;
  planMonths: number;
  latestSnapshotMonth: string | null;
  paymentRecordCount: number;
  plaidReauthFlag: boolean;
  plaidStaleFlag: boolean;
}): string {
  return [
    input.totalDebt.toFixed(0),
    input.totalMin.toFixed(0),
    input.income?.monthlyTakeHome.toFixed(0) ?? '0',
    input.income?.essentialExpenses.toFixed(0) ?? '0',
    input.recurringExpenses.toFixed(0),
    input.planMonths,
    input.latestSnapshotMonth ?? '',
    input.paymentRecordCount,
    input.plaidReauthFlag ? '1' : '0',
    input.plaidStaleFlag ? '1' : '0',
  ].join('|');
}

function buildFallbackBrief(params: {
  totalDebt: number;
  debtLoadPct: number;
  buffer: number;
  recentAdherencePct: number;
  hasReauthIssue: boolean;
  hasStaleSync: boolean;
  focusDebtName: string | null;
  planMonths: number;
  availableCashFlow: number;
}): CoachBrief {
  const {
    totalDebt,
    debtLoadPct,
    buffer,
    recentAdherencePct,
    hasReauthIssue,
    hasStaleSync,
    focusDebtName,
    planMonths,
    availableCashFlow,
  } = params;

  const riskSignals = [
    buffer < 0,
    debtLoadPct >= 40,
    recentAdherencePct < 50,
    hasReauthIssue,
  ].filter(Boolean).length;

  const status = riskSignals >= 2 || buffer < 0 ? 'off_track' : riskSignals === 1 ? 'at_risk' : 'on_track';

  if (hasReauthIssue) {
    return {
      verdict: {
        status,
        headline: 'A linked account needs reconnecting',
        summary: `A linked bank login has expired, so its balance may be out of date. Total tracked debt is $${Math.round(totalDebt).toLocaleString('en-US')}.`,
      },
      nextAction: {
        title: 'Reconnect your bank',
        body: 'Reconnect the flagged account so balances stay accurate before this month’s plan is trusted.',
        action: 'Reconnect linked account',
        impact: 'high',
        kind: 'reconnect_bank',
        targetExtra: null,
        outcome: null,
        redirectAmount: 0,
        payoffClaims: [],
      },
    };
  }

  if (buffer < 0) {
    return {
      verdict: {
        status,
        headline: 'This month is short on cash flow',
        summary: `Planned payments exceed take-home pay by $${Math.abs(Math.round(buffer)).toLocaleString('en-US')} after essentials and minimums.`,
      },
      nextAction: {
        title: 'Lower the extra payment',
        body: 'Reduce planned acceleration until the monthly buffer is non-negative again.',
        action: 'Adjust extra payment amount',
        impact: 'high',
        kind: 'set_acceleration',
        targetExtra: availableCashFlow,
        outcome: null,
        redirectAmount: 0,
        payoffClaims: [],
      },
    };
  }

  if (recentAdherencePct < 50) {
    return {
      verdict: {
        status,
        headline: 'Recent payments have been inconsistent',
        summary: `Fewer than half of expected debt payments were logged over the last two months, against a ${formatMonths(planMonths)} plan.`,
      },
      nextAction: {
        title: 'Log this month’s payments',
        body: focusDebtName
          ? `Confirm ${focusDebtName} is paid and logged so the plan reflects reality.`
          : 'Confirm this month’s payments are logged so the plan reflects reality.',
        action: 'Log any unrecorded payments',
        impact: 'medium',
        kind: 'log_payments',
        targetExtra: null,
        outcome: null,
        redirectAmount: 0,
        payoffClaims: [],
      },
    };
  }

  return {
    verdict: {
      status,
      headline: 'The plan is on pace',
      summary: `Total debt is $${Math.round(totalDebt).toLocaleString('en-US')} with debt payments at ${debtLoadPct.toFixed(0)}% of take-home pay, a ${formatMonths(planMonths)} timeline.`,
    },
    nextAction: {
      title: 'Keep the current course',
      body: focusDebtName
        ? `Continue directing extra payments to ${focusDebtName} this month.`
        : 'Continue the current payoff order this month.',
      action: hasStaleSync ? 'Refresh linked balances' : 'Stay on the current plan',
      impact: 'low',
      kind: 'keep_course',
      targetExtra: null,
      outcome: null,
      redirectAmount: 0,
      payoffClaims: [],
    },
  };
}

/**
 * Recomputes the same dataHash fingerprint POST would produce from the
 * user's CURRENT debts/income/expenses/snapshots/payments/Plaid state.
 * Used by GET to tell the client when a cached brief is stale — i.e. the
 * underlying numbers moved since the brief was generated — without
 * requiring the client to duplicate this computation itself. Returns null
 * when there isn't enough data to form an opinion (no debts/income), in
 * which case staleness simply isn't reported.
 */
async function computeCurrentDataHash(userId: string): Promise<string | null> {
  const [debts, income, expenses, snapshots, paymentRecords, plaidItems] = await Promise.all([
    prisma.debt.findMany({ where: { userId } }),
    prisma.income.findUnique({ where: { userId } }),
    prisma.expense.findMany({ where: { userId } }),
    prisma.balanceSnapshot.findMany({
      where: { userId },
      select: { debtId: true, balance: true, recordedAt: true },
      orderBy: { recordedAt: 'asc' },
    }),
    prisma.paymentRecord.findMany({
      where: { userId },
      select: { debtId: true, dueYear: true, dueMonth: true, paidAt: true },
      orderBy: { paidAt: 'desc' },
      take: 60,
    }),
    prisma.plaidItem.findMany({
      where: { userId },
      select: { institutionName: true, needsReauth: true, lastSyncedAt: true },
    }),
  ]);

  if (debts.length === 0 || !income) return null;

  const typedDebts = debts as unknown as Debt[];
  const activeDebts = typedDebts.filter(isActiveDebt);
  const totalDebt = activeDebts.reduce((s, d) => s + d.balance, 0);
  const totalMin = activeDebts.reduce((s, d) => s + d.minimumPayment, 0);
  const recurringExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const method = isPayoffMethod(income.payoffMethod) ? income.payoffMethod : 'snowball';

  const planMetrics = calculatePlanMetrics(typedDebts, income, expenses, { method });
  if (!planMetrics) return null;

  const linkedDebts = typedDebts.filter((d) => d.isLinked);
  const { hasReauthIssue, hasStaleSync } = buildPlaidSyncContext(linkedDebts, plaidItems);
  const snapshotSeries = buildMonthlyDebtSeries(snapshots);

  return buildDataHash({
    totalDebt,
    totalMin,
    income: {
      monthlyTakeHome: income.monthlyTakeHome,
      essentialExpenses: income.essentialExpenses,
    },
    recurringExpenses,
    planMonths: planMetrics.result.months,
    latestSnapshotMonth: snapshotSeries.length ? snapshotSeries[snapshotSeries.length - 1].month : null,
    paymentRecordCount: paymentRecords.length,
    plaidReauthFlag: hasReauthIssue,
    plaidStaleFlag: hasStaleSync,
  });
}

// ── GET — return cached brief ───────────────────────────────────────────────
//
// The law is re-checked here, not just at generation time. A brief that was
// cached before this rule existed (or before a prompt/model regression was
// fixed) must never keep being served just because it already made it into
// the database — so every read re-validates and purges on failure.
//
// Staleness (P2 fix): also recomputes the CURRENT dataHash and compares it
// against what the cached brief was generated from. If the underlying
// numbers have moved (new balance, payment logged, income change, etc.),
// `stale: true` is returned so the UI can prompt a refresh instead of
// silently showing advice based on outdated figures.

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  try {
    const cache = await prisma.coachBriefCache.findUnique({ where: { userId: auth.user.id } });
    if (!cache) {
      return NextResponse.json({ brief: null, dataHash: null, generatedAt: null, stale: false });
    }

    const lawfulBrief = parseLawfulStoredBrief(cache.brief);
    if (!lawfulBrief) {
      console.error('Purging unlawful cached coach brief', { userId: auth.user.id, briefId: cache.id });
      await prisma.coachBriefCache.delete({ where: { userId: auth.user.id } });
      return NextResponse.json({ brief: null, dataHash: null, generatedAt: null, stale: false });
    }

    const currentHash = await computeCurrentDataHash(auth.user.id);
    const stale = currentHash !== null && currentHash !== cache.dataHash;

    return NextResponse.json({
      brief: lawfulBrief,
      dataHash: cache.dataHash,
      generatedAt: cache.generatedAt,
      stale,
    });
  } catch (error) {
    console.error('Coach brief GET error:', error);
    return serverError('Failed to load coach brief');
  }
}

// ── POST — gather data server-side, generate a new brief, upsert cache ─────

const PostBodySchema = z.object({
  method: z.enum(['snowball', 'avalanche', 'custom']).optional(),
}).optional();

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  if (!(await isPro(auth.user.id))) {
    return upgradeRequired('AI Coach Brief');
  }

  if (!(await limits.coachBrief(auth.user.id))) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before generating a new brief.', retryAfter: 600 },
      { status: 429, headers: { 'Retry-After': '600' } }
    );
  }

  try {
    let methodOverride: 'snowball' | 'avalanche' | 'custom' | undefined;
    const rawBody = await request.text();
    if (rawBody) {
      let parsedBody: unknown;
      try {
        parsedBody = JSON.parse(rawBody);
      } catch {
        return badRequest('Invalid request body');
      }
      const parsed = PostBodySchema.safeParse(parsedBody);
      if (!parsed.success) return badRequest('Invalid request body');
      methodOverride = parsed.data?.method;
    }

    const userId = auth.user.id;

    const [debts, income, expenses, snapshots, paymentRecords, plaidItems] = await Promise.all([
      prisma.debt.findMany({ where: { userId } }),
      prisma.income.findUnique({ where: { userId } }),
      prisma.expense.findMany({ where: { userId } }),
      prisma.balanceSnapshot.findMany({
        where: { userId },
        select: { debtId: true, balance: true, recordedAt: true },
        orderBy: { recordedAt: 'asc' },
      }),
      prisma.paymentRecord.findMany({
        where: { userId },
        select: { debtId: true, dueYear: true, dueMonth: true, paidAt: true },
        orderBy: { paidAt: 'desc' },
        take: 60,
      }),
      prisma.plaidItem.findMany({
        where: { userId },
        select: { institutionName: true, needsReauth: true, lastSyncedAt: true },
      }),
    ]);

    if (debts.length === 0) {
      return badRequest('At least one debt is required to generate a coach brief');
    }
    if (!income) {
      return badRequest('Income must be set up to generate a coach brief');
    }

    const typedDebts = debts as unknown as Debt[];
    const activeDebts = typedDebts.filter(isActiveDebt);
    const totalDebt = activeDebts.reduce((s, d) => s + d.balance, 0);
    const totalMin = activeDebts.reduce((s, d) => s + d.minimumPayment, 0);
    const recurringExpenses = expenses.reduce((s, e) => s + e.amount, 0);

    const method = isPayoffMethod(methodOverride)
      ? methodOverride
      : (isPayoffMethod(income.payoffMethod) ? income.payoffMethod : 'snowball');

    const planMetrics = calculatePlanMetrics(typedDebts, income, expenses, { method });
    if (!planMetrics) {
      return badRequest('Unable to calculate a payoff plan from current data');
    }
    const { result } = planMetrics;

    const minimumsResult = calculateMinimumsOnlyResult(typedDebts);
    const monthsSaved = Math.max(0, minimumsResult.months - result.months);
    const availableCashFlow = Math.max(
      0,
      income.monthlyTakeHome - planMetrics.totalEssential - totalMin,
    );

    const focusDebt = selectMonthlyFocusDebt(typedDebts, result);

    const debtLoadPct = income.monthlyTakeHome > 0
      ? ((totalMin + planMetrics.effectiveAcceleration) / income.monthlyTakeHome) * 100
      : 0;
    const buffer = income.monthlyTakeHome - planMetrics.totalEssential - totalMin - planMetrics.effectiveAcceleration;

    const withComputedOutcome = (candidate: CoachBrief): CoachBrief => {
      if (candidate.nextAction.kind !== 'set_acceleration') {
        return {
          ...candidate,
          nextAction: {
            ...candidate.nextAction,
            outcome: null,
          },
        };
      }

      const targetExtra = candidate.nextAction.targetExtra;
      if (targetExtra === null) {
        return {
          ...candidate,
          nextAction: {
            ...candidate.nextAction,
            outcome: null,
          },
        };
      }

      const targetMetrics = calculatePlanMetrics(typedDebts, income, expenses, {
        method,
        accelerationAmount: targetExtra,
      });
      const outcome = targetMetrics
        ? {
            bufferAfter:
              income.monthlyTakeHome -
              planMetrics.totalEssential -
              totalMin -
              targetExtra,
            monthsSavedVsMin: Math.max(
              0,
              minimumsResult.months - targetMetrics.result.months,
            ),
          }
        : null;

      return {
        ...candidate,
        nextAction: {
          ...candidate.nextAction,
          outcome,
        },
      };
    };

    const linkedDebts = typedDebts.filter((d) => d.isLinked);
    const { context: plaidContext, hasReauthIssue, hasStaleSync } = buildPlaidSyncContext(linkedDebts, plaidItems);

    const activeDebtCount = activeDebts.length;
    const { context: paymentHistoryContext, recentAdherencePct } = buildPaymentHistoryContext(
      paymentRecords,
      activeDebtCount,
    );

    const expectedMonthlyPaydown = totalMin + planMetrics.effectiveAcceleration;
    const varianceContext = buildVarianceContext(snapshots, expectedMonthlyPaydown);

    const debtList = [...activeDebts]
      .sort((a, b) => b.balance - a.balance)
      .map((d) => {
        const utilization = d.category === 'Credit Card' && d.creditLimit > 0
          ? `, ${((d.balance / d.creditLimit) * 100).toFixed(0)}% utilization`
          : '';
        const linked = d.isLinked ? ' [Plaid-linked]' : '';
        return `  - ${d.name} (${d.category}): $${d.balance.toFixed(0)} balance, ${d.interestRate}% APR, $${d.minimumPayment.toFixed(0)}/mo minimum${utilization}${linked}`;
      })
      .join('\n');

    const highAprDebts = activeDebts.filter((d) => d.interestRate >= 20);
    const highUtilDebts = activeDebts.filter(
      (d) => d.category === 'Credit Card' && d.creditLimit > 0 && d.balance / d.creditLimit >= 0.8,
    );

    const userContext = `User's financial snapshot:

Active debts (${activeDebts.length} total, $${totalDebt.toFixed(0)} combined):
${debtList}

Focus debt this month: ${focusDebt ? focusDebt.name : 'none (all paid off)'}

Monthly cash flow:
  - Take-home: $${income.monthlyTakeHome.toFixed(0)}
  - Essential expenses: $${income.essentialExpenses.toFixed(0)}
  - Recurring expenses: $${recurringExpenses.toFixed(0)}
  - Debt minimums: $${totalMin.toFixed(0)}
  - Planned acceleration: $${planMetrics.effectiveAcceleration.toFixed(0)}
  - Available cash flow after essentials and minimums: $${availableCashFlow.toFixed(0)}
  - Buffer remaining after plan: $${buffer.toFixed(0)}
  - Debt payment load: ${debtLoadPct.toFixed(1)}% of take-home pay

Payment history:
${paymentHistoryContext}

Snapshot variance (actual pace vs plan's expected pace):
${varianceContext}

Plaid sync state:
${plaidContext}

Risk indicators:
  - High APR debts (>=20%): ${highAprDebts.length}
  - High credit utilization cards (>=80%): ${highUtilDebts.length}

Current plan:
  - Strategy: ${method}
  - Payoff timeline: ${formatMonths(result.months)}
  - Total interest to be paid: $${result.totalInterestPaid.toFixed(0)}
  - Months saved vs minimums-only: ${monthsSaved}`;

    // Law context for the elimination-claim check: the most a debt can get
    // this month is its own minimum + the proposed extra, so a "pays it off
    // this month" claim is checked against these balances. `isFocus` marks the
    // one debt the plan's acceleration actually flows to — without it the law
    // credited the whole acceleration to every debt and accepted a payoff
    // claim about a card receiving only its minimum.
    // `payoffOrder` is the plan's real queue position, straight from the
    // engine's strategy sort. Without it the law had to infer an order and
    // moved declared debts to the front, crediting a brief with a payoff the
    // plan would not reach that month.
    const payoffOrderByDebtId = new Map(
      result.payoffSchedule.map((entry) => [entry.debtId, entry.orderInPayoff]),
    );
    const lawDebts = activeDebts.map((d) => ({
      name: d.name,
      balance: d.balance,
      minimumPayment: d.minimumPayment,
      isFocus: focusDebt ? d.id === focusDebt.id : false,
      ...(payoffOrderByDebtId.has(d.id)
        ? { payoffOrder: payoffOrderByDebtId.get(d.id) as number }
        : {}),
    }));

    let brief: CoachBrief;
    let usedFallback = false;

    try {
      let msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 700,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContext }],
      });

      let rawText = extractTextBlocks(msg.content);
      let parsedJson = parseClaudeJson(rawText);

      if (!parsedJson) {
        const retryReason = msg.stop_reason === 'max_tokens' ? 'truncated' : 'malformed';
        msg = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 900,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: `${userContext}\n\nIMPORTANT:\n- Your previous response was ${retryReason === 'truncated' ? 'truncated' : 'not valid JSON'}.\n- Return compact JSON only.\n- Escape all quotes inside string values.\n- Do not wrap the response in markdown fences.\n- No prose before or after the JSON object.`,
            },
          ],
        });
        rawText = extractTextBlocks(msg.content);
        parsedJson = parseClaudeJson(rawText);
      }

      const claudeResponse = parsedJson ? CoachBriefSchema.safeParse(normalizeModelBrief(parsedJson)) : null;
      const violation = claudeResponse?.success
        ? findBriefViolation(
            claudeResponse.data,
            planMetrics.effectiveAcceleration,
            availableCashFlow,
            lawDebts,
          )
        : null;
      if (claudeResponse?.success && violation) {
        // Numbers + a reason code and the fixed-enum `kind` only — nextAction's
        // free text carries debt names and dollar amounts, which must not end
        // up in logs. `violation` tells the four laws apart (esp. an omitted
        // set_acceleration target vs a regex hit), which the old single message
        // could not, making rejections undiagnosable.
        console.error('Coach brief rejected by the law', {
          violation,
          kind: claudeResponse.data.nextAction.kind,
          redirectAmount: claudeResponse.data.nextAction.redirectAmount,
          effectiveAcceleration: planMetrics.effectiveAcceleration,
          targetExtra: claudeResponse.data.nextAction.targetExtra,
          availableCashFlow,
        });
      }

      if (claudeResponse?.success && !violation) {
        brief = claudeResponse.data;
      } else {
        if (!parsedJson) {
          // Both attempts came back unparseable. Content-free by design:
          // parseClaudeJson's own warn previews raw model text, but at the
          // route level stop_reason is all the diagnosis needs.
          console.error('Coach brief response unparseable after retry', {
            stopReason: msg.stop_reason,
          });
        }
        if (parsedJson && claudeResponse && !claudeResponse.success) {
          // Flatten paths to strings — console.error's default inspect depth
          // renders nested path arrays as '[Array]', which made the 2026-08-28
          // production failure (invented outcome keys) undiagnosable from logs.
          // Codes and paths ONLY — no issue.message: Zod's invalid_enum_value
          // message embeds the received value verbatim, and enum fields are
          // model-authored free text that can carry debt names or amounts.
          console.error('Zod validation failed on coach brief response', {
            issues: claudeResponse.error.issues.map((issue) => ({
              code: issue.code,
              path: issue.path.join('.'),
            })),
          });
        }
        brief = buildFallbackBrief({
          totalDebt,
          debtLoadPct,
          buffer,
          recentAdherencePct,
          hasReauthIssue,
          hasStaleSync,
          focusDebtName: focusDebt?.name ?? null,
          planMonths: result.months,
          availableCashFlow,
        });
        usedFallback = true;
      }
    } catch (aiError) {
      console.error('AI provider error, using fallback coach brief', aiError);
      brief = buildFallbackBrief({
        totalDebt,
        debtLoadPct,
        buffer,
        recentAdherencePct,
        hasReauthIssue,
        hasStaleSync,
        focusDebtName: focusDebt?.name ?? null,
        planMonths: result.months,
        availableCashFlow,
      });
      usedFallback = true;
    }

    brief = withComputedOutcome(brief);

    const snapshotSeries = buildMonthlyDebtSeries(snapshots);
    const dataHash = buildDataHash({
      totalDebt,
      totalMin,
      income: {
        monthlyTakeHome: income.monthlyTakeHome,
        essentialExpenses: income.essentialExpenses,
      },
      recurringExpenses,
      planMonths: result.months,
      latestSnapshotMonth: snapshotSeries.length ? snapshotSeries[snapshotSeries.length - 1].month : null,
      paymentRecordCount: paymentRecords.length,
      plaidReauthFlag: hasReauthIssue,
      plaidStaleFlag: hasStaleSync,
    });

    // Don't persist fallback — return it transiently, leave any previously
    // cached good result intact so the next request retries the AI.
    if (usedFallback) {
      return NextResponse.json({ brief, dataHash, generatedAt: new Date(), fallback: true });
    }

    // The law context (ceiling + debt balances) travels with the stored brief
    // so GET can re-run the law later without recomputing the whole plan.
    const storedBrief: StoredCoachBrief = {
      ...brief,
      _meta: {
        effectiveAcceleration: planMetrics.effectiveAcceleration,
        availableCashFlow,
        debts: lawDebts,
      },
    };

    const cache = await prisma.coachBriefCache.upsert({
      where: { userId },
      update: { brief: storedBrief as unknown as object, dataHash, generatedAt: new Date() },
      create: { userId, brief: storedBrief as unknown as object, dataHash },
    });

    return NextResponse.json({
      brief: toClientBrief(cache.brief as unknown as StoredCoachBrief),
      dataHash: cache.dataHash,
      generatedAt: cache.generatedAt,
    });
  } catch (error) {
    console.error('Coach brief POST error:', error);
    return serverError('Failed to generate coach brief');
  }
}

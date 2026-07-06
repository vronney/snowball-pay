import { z } from 'zod';

const VerdictStatus = ['on_track', 'at_risk', 'off_track'] as const;

export const CoachBriefSchema = z.object({
  verdict: z.object({
    status: z.enum(VerdictStatus),
    headline: z.string().min(1),
    summary: z.string().min(1),
  }),
  nextAction: z.object({
    title: z.string().min(1),
    body: z.string().min(1),
    action: z.string().min(1),
    impact: z.enum(['high', 'medium', 'low']),
    // Total EXTRA dollars (never counting any minimum payment) this action
    // proposes moving this month. This is the numeric half of the "minimums
    // are non-negotiable" law below — 0 when the action doesn't move money.
    // Deliberately NOT `.catch(0)`: a missing/malformed value must fail the
    // whole response (→ safe deterministic fallback), not silently coerce to
    // a "no reallocation" value that would let the numeric check pass by
    // omission instead of by being genuinely honest.
    redirectAmount: z.number().min(0),
  }),
});

export type CoachBrief = z.infer<typeof CoachBriefSchema>;

/** The slice of a debt the elimination-claim check needs to fact-check math. */
export interface EliminationCheckDebt {
  name: string;
  balance: number;
  minimumPayment: number;
}

// Persisted shape carries the law context that was true at generation time
// (discretionary ceiling + active debt balances), so GET can re-run the law
// later without recomputing the user's whole plan.
export type StoredCoachBrief = CoachBrief & {
  _meta: { effectiveAcceleration: number; debts?: EliminationCheckDebt[] };
};

// ─────────────────────────────────────────────────────────────────────────
// THE LAW: a debt's minimum payment is never optional. No prompt wording is
// trusted to enforce this on its own — every brief (freshly generated OR
// read back from cache) is re-checked against this function, and anything
// that fails is discarded rather than shown to the user. Two independent
// checks, either one is disqualifying:
//   1. Text check — the action must not read as pausing/skipping/reducing
//      any payment, in any phrasing.
//   2. Numeric check — the dollar amount proposed for reallocation can never
//      exceed the discretionary extra payment that was actually available.
//      A model claiming to move more than that MUST be pulling from a
//      minimum, regardless of how it phrased the sentence.
// ─────────────────────────────────────────────────────────────────────────
// The pause/stop/skip/etc. verbs match anywhere — there's no legitimate
// coach-brief phrasing that uses them. "reduce"/"lower" are narrower: they're
// only unsafe near "minimum" (bare matches would also reject benign copy like
// "lowers your total interest paid" or "lower your APR by calling the issuer").
export const UNSAFE_MINIMUM_ADVICE_RE =
  /\b(pause|stop paying|skip|don'?t pay|miss(?:ing)?|hold off|defer|delay|withhold)\b|\b(?:reduc(?:e|ing)|lower(?:ing)?)\b[^.]{0,40}\bminimum\b|\bminimum\b[^.]{0,40}\b(?:reduc(?:e|ing)|lower(?:ing)?)\b/i;

export const REDIRECT_TOLERANCE = 1; // dollars — absorbs rounding only

// Elimination-claim verbs: phrases asserting a specific debt hits zero.
// Deliberately does NOT include timeline phrases like "debt-free in 11
// months" — those describe the whole plan, not a single debt's balance.
// "clear(s/ed/ing)" is matched broadly (minus "steer clear") on purpose: a
// false positive only downgrades to the deterministic fallback, while a
// missed synonym re-opens the exact bug this law exists to stop.
export const ELIMINATION_CLAIM_RE =
  /\b(?:eliminat\w+|paid\s+off|pay(?:s|ing)?\s+off|pay(?:s|ing)?\s+\w+(?:\s+\w+)?\s+off|(?<!steer\s)clear(?:s|ed|ing)?\b|zero(?:s|ed)?\s+out|(?:reach(?:es)?|hits?|down\s+to)\s+\$?(?:0|zero)\b|wipe[sd]?\s+out|knock(?:s|ed|ing)?\s+out|gone\s+by)\b/i;

/**
 * Third law: an "eliminates it this month"-style claim must be arithmetically
 * possible. The most a single debt can receive this month is its own minimum
 * plus the proposed extra (redirectAmount) — if that can't cover the debt's
 * balance, the claim is a hallucination (reported incident: "$565 total
 * eliminates it by month-end" against a $1,209 balance).
 *
 * Attribution: if the text names debts, the claim must hold for at least one
 * named debt; if it names none, it must hold for at least one active debt.
 * With no debt context at all (pre-rule cached briefs), any elimination claim
 * is rejected — conservative on purpose, so stale caches with unverifiable
 * claims get purged rather than re-served.
 */
function makesUnverifiedEliminationClaim(
  brief: CoachBrief,
  debts: EliminationCheckDebt[],
): boolean {
  const text = `${brief.nextAction.title} ${brief.nextAction.body} ${brief.nextAction.action}`;
  if (!ELIMINATION_CLAIM_RE.test(text)) return false;

  const canEliminate = (d: EliminationCheckDebt) =>
    brief.nextAction.redirectAmount + d.minimumPayment + REDIRECT_TOLERANCE >= d.balance;

  // Attribute debt names longest-first, blanking out each match before
  // checking shorter names — otherwise "Chase" would count as named whenever
  // "Chase Sapphire" appears, and its small balance could vouch for an
  // impossible claim about the bigger card.
  let remaining = text.toLowerCase();
  const named: EliminationCheckDebt[] = [];
  const byNameLengthDesc = debts
    .filter((d) => d.name.trim().length > 0)
    .sort((a, b) => b.name.trim().length - a.name.trim().length);
  for (const debt of byNameLengthDesc) {
    const needle = debt.name.trim().toLowerCase();
    if (remaining.includes(needle)) {
      named.push(debt);
      remaining = remaining.split(needle).join(' ');
    }
  }

  const candidates = named.length > 0 ? named : debts;
  return !candidates.some(canEliminate);
}

export function isBriefLawful(
  brief: CoachBrief,
  effectiveAcceleration: number,
  debts: EliminationCheckDebt[] = [],
): boolean {
  const text = `${brief.nextAction.title} ${brief.nextAction.body} ${brief.nextAction.action}`;
  if (UNSAFE_MINIMUM_ADVICE_RE.test(text)) return false;
  if (brief.nextAction.redirectAmount > effectiveAcceleration + REDIRECT_TOLERANCE) return false;
  if (makesUnverifiedEliminationClaim(brief, debts)) return false;
  return true;
}

/** Strips server-only bookkeeping before a stored brief is sent to the client. */
export function toClientBrief(stored: StoredCoachBrief): CoachBrief {
  const { _meta: _unused, ...brief } = stored;
  return brief;
}

/**
 * Reads a raw `CoachBriefCache.brief` JSON value (e.g. straight from Prisma)
 * and returns a client-safe brief ONLY if it parses and passes the law.
 * Returns null on any failure — malformed shape, missing/stale _meta, or an
 * unlawful nextAction. This is the single path every consumer of a cached
 * brief (API route, cron emails, anything future) should go through instead
 * of trusting `cache.brief` directly.
 */
export function parseLawfulStoredBrief(raw: unknown): CoachBrief | null {
  const parsed = CoachBriefSchema.safeParse(raw);
  if (!parsed.success) return null;
  const meta = (
    raw as { _meta?: { effectiveAcceleration?: number; debts?: unknown } } | null
  )?._meta;
  // Number.isFinite (not typeof === 'number') so a NaN can't silently
  // disable the numeric ceiling — NaN + tolerance comparisons are always
  // false, which would make isBriefLawful's redirectAmount check a no-op.
  const effectiveAcceleration = Number.isFinite(meta?.effectiveAcceleration)
    ? (meta!.effectiveAcceleration as number)
    : 0;
  // Same finite-number discipline for the elimination-check debts: drop any
  // malformed entry rather than letting NaN balances neutralize the math.
  // Briefs cached before this context existed get an empty list, which makes
  // any elimination claim unverifiable → purged, not re-served.
  const debts: EliminationCheckDebt[] = Array.isArray(meta?.debts)
    ? (meta!.debts as unknown[]).flatMap((d) => {
        const candidate = d as Partial<EliminationCheckDebt> | null;
        return typeof candidate?.name === 'string' &&
          Number.isFinite(candidate?.balance) &&
          Number.isFinite(candidate?.minimumPayment)
          ? [{ name: candidate.name, balance: candidate.balance!, minimumPayment: candidate.minimumPayment! }]
          : [];
      })
    : [];
  if (!isBriefLawful(parsed.data, effectiveAcceleration, debts)) return null;
  return parsed.data;
}

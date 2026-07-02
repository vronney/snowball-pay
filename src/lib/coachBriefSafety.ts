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
// Persisted shape carries the discretionary ceiling that was true at
// generation time, so GET can re-run the law later without recomputing the
// user's whole plan.
export type StoredCoachBrief = CoachBrief & { _meta: { effectiveAcceleration: number } };

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
export const UNSAFE_MINIMUM_ADVICE_RE =
  /\b(pause|stop paying|skip|don'?t pay|miss(?:ing)?|hold off|defer|delay|withhold|reduc(?:e|ing)|lower(?:ing)?)\b/i;

export const REDIRECT_TOLERANCE = 1; // dollars — absorbs rounding only

export function isBriefLawful(brief: CoachBrief, effectiveAcceleration: number): boolean {
  const text = `${brief.nextAction.title} ${brief.nextAction.body} ${brief.nextAction.action}`;
  if (UNSAFE_MINIMUM_ADVICE_RE.test(text)) return false;
  if (brief.nextAction.redirectAmount > effectiveAcceleration + REDIRECT_TOLERANCE) return false;
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
  const meta = (raw as { _meta?: { effectiveAcceleration?: number } } | null)?._meta;
  const effectiveAcceleration = typeof meta?.effectiveAcceleration === 'number' ? meta.effectiveAcceleration : 0;
  if (!isBriefLawful(parsed.data, effectiveAcceleration)) return null;
  return parsed.data;
}

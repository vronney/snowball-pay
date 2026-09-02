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
    kind: z.enum([
      'set_acceleration',
      'reconnect_bank',
      'log_payments',
      'review_refinance',
      'keep_course',
    ]),
    targetExtra: z.number().min(0).nullable(),
    outcome: z
      .object({
        bufferAfter: z.number(),
        monthsSavedVsMin: z.number(),
      })
      .nullable(),
    // Total EXTRA dollars (never counting any minimum payment) this action
    // proposes moving this month. This is the numeric half of the "minimums
    // are non-negotiable" law below — 0 when the action doesn't move money.
    // Deliberately NOT `.catch(0)`: a missing/malformed value must fail the
    // whole response (→ safe deterministic fallback), not silently coerce to
    // a "no reallocation" value that would let the numeric check pass by
    // omission instead of by being genuinely honest.
    redirectAmount: z.number().min(0),
  }).superRefine((nextAction, ctx) => {
    // HARD LAW (shape): targetExtra is a concrete money move and outcome is its
    // computed forecast — both only make sense for a set_acceleration action.
    // Enforced in code, not just the prompt. The targetExtra half fires on both
    // paths; the outcome half effectively guards CACHED briefs only, because
    // fresh model responses go through normalizeModelBrief (outcome → null)
    // before parsing and the server recomputes outcome regardless. A stray
    // non-null value that does reach this check fails parsing (→ deterministic
    // fallback / cache purge) instead of reaching the client, where the CTA
    // keys off exactly these fields.
    if (
      nextAction.kind !== 'set_acceleration' &&
      (nextAction.targetExtra !== null || nextAction.outcome !== null)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'targetExtra and outcome must be null unless kind is set_acceleration',
      });
    }
  }),
});

export type CoachBrief = z.infer<typeof CoachBriefSchema>;

/**
 * Normalizes a raw MODEL response before schema validation. The model's
 * "outcome" value is never shown to anyone — withComputedOutcome() in the
 * route always replaces it with plan-engine math derived from targetExtra —
 * so an outcome object with invented keys (the model was never told the
 * exact shape) must not fail the whole response into the deterministic
 * fallback. Cached briefs do NOT go through this: their outcome is
 * server-computed and stays strictly validated by CoachBriefSchema.
 */
export function normalizeModelBrief(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const candidate = raw as { nextAction?: unknown };
  if (!candidate.nextAction || typeof candidate.nextAction !== 'object') return raw;
  return { ...candidate, nextAction: { ...(candidate.nextAction as object), outcome: null } };
}

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
  _meta: {
    effectiveAcceleration: number;
    availableCashFlow: number;
    debts?: EliminationCheckDebt[];
  };
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
// Verbs that name the act of not paying are unsafe in ANY sentence — there is
// no benign coach-brief phrasing for them.
const ALWAYS_UNSAFE_VERBS = String.raw`stop\s+paying|don'?t\s+pay|do\s+not\s+pay|withhold`;

// Verbs that are only unsafe when the sentence is about a payment. Matched
// bare, they rejected copy the prompt itself asks for — "missing September
// logging creates visibility risk" (the 2026-09-02 production rejection: a
// reconnect_bank brief with redirectAmount 0), "reconnect without delay",
// "skip the coffee runs" — and every false positive silently swapped the paid
// AI brief for the deterministic fallback. They now have to share a sentence
// (40 chars, no period) with a payment word or an active debt's name. An
// immediately-preceding negation ("never miss", "avoid missing", "without
// delay") exempts them: unsafe advice still needs one positive directive
// somewhere, and that occurrence is caught.
const PAYMENT_SCOPED_VERBS = String.raw`pause|skip|miss(?:ing)?|hold\s+off|defer|delay`;
const NOT_NEGATED = String.raw`(?<!\b(?:never|don'?t|do\s+not|avoid|without|not|no)\s)`;
const PAYMENT_WORDS = String.raw`minimums?|payments?|pay(?:s|ing)?|autopay|installments?|due\s+dates?|bills?`;
const SAME_SENTENCE = String.raw`[^.]{0,40}`;

// "reduce"/"lower" stay narrower still: only unsafe next to "minimum", since
// "lower your extra payment" is legitimate set_acceleration advice and bare
// matches would also reject "lowers your total interest paid".
const MINIMUM_CUT = String.raw`\b(?:reduc(?:e|ing)|lower(?:ing)?)\b[^.]{0,40}\bminimum\b|\bminimum\b[^.]{0,40}\b(?:reduc(?:e|ing)|lower(?:ing)?)\b`;

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Builds the unsafe-minimum text law for one brief. Active debt names count as
 * payment context, so "pause CreditOne 6610" is still caught in a sentence
 * that never says "payment" — the reported incident's action was that shape.
 * With no debt list the payment words alone provide the context.
 */
export function buildUnsafeMinimumAdviceRe(debtNames: string[] = []): RegExp {
  const names = debtNames
    .map((name) => name.trim())
    .filter((name) => name.length >= 2)
    .map((name) => escapeForRegex(name).replace(/\s+/g, String.raw`\s+`));
  const context = String.raw`(?<!\w)(?:${[PAYMENT_WORDS, ...names].join('|')})(?!\w)`;
  const verb = String.raw`${NOT_NEGATED}\b(?:${PAYMENT_SCOPED_VERBS})\b`;
  return new RegExp(
    [
      String.raw`\b(?:${ALWAYS_UNSAFE_VERBS})\b`,
      `${verb}${SAME_SENTENCE}${context}`,
      `${context}${SAME_SENTENCE}${verb}`,
      MINIMUM_CUT,
    ].join('|'),
    'i',
  );
}

export const REDIRECT_TOLERANCE = 1; // dollars — absorbs rounding only

// Elimination-claim verbs: phrases asserting a specific debt hits zero.
// Deliberately does NOT include timeline phrases like "debt-free in 11
// months" — those describe the whole plan, not a single debt's balance.
// "eliminate $200 of its $1,209 balance" is exempt: "<verb> $<amount> of" is
// partitive by construction — it states how much comes OFF a balance, which
// is the opposite of claiming the balance ends at zero. Observed in live
// model output and rejected as an unverified claim. The dollar sign is
// required so only this explicit amount-then-"of" shape is exempt; a bare
// "eliminates it" or "eliminates the $1,209 balance" still matches.
const PARTITIVE_AMOUNT = String.raw`(?!\s+\$[\d,]+(?:\.\d+)?\s+of\b)`;

// Verbs whose object is unambiguous — nobody writes "wipes out" or "zeroes
// out" about anything but a balance in a debt brief, so these match bare.
// "zeroes" (the -es spelling) was missing here and slipped past the law
// entirely; found while testing the "clear" scoping below.
const UNAMBIGUOUS_PAYOFF_VERBS = String.raw`eliminat\w+${PARTITIVE_AMOUNT}|paid\s+off|pay(?:s|ing)?\s+off|pay(?:s|ing)?\s+\w+(?:\s+\w+)?\s+off|zero(?:e?s|ed)?\s+out|(?:reach(?:es)?|hits?|down\s+to)\s+\$?(?:0|zero)\b|wipe[sd]?\s+out|knock(?:s|ed|ing)?\s+out|gone\s+by`;

// "clear" is the one verb that needs its object checked. Matched bare it fired
// on ordinary English about anything but money — "stale bank data blocks CLEAR
// progress tracking", "this CLEARS the largest uncertainty", "blocks a CLEAR
// picture" — which was the last remaining source of false rejections in live
// sampling. It now has to point at something payoff-shaped: a dollar amount, a
// balance noun, an active debt's name, or the bare pronoun. "account" is
// deliberately NOT a balance noun; reconnect_bank briefs say it constantly
// about bank connections ("stale ACCOUNT data blocks a clear picture").
const BALANCE_OBJECT_NOUNS = String.raw`balances?|cards?|debts?|loans?`;

/**
 * Builds the elimination-claim law for one brief, with the brief's own debt
 * names usable as the object of "clear" ("clears CreditOne 6610"). Every
 * other payoff verb is name-independent, so the no-names default below stays
 * a faithful law for callers without debt context.
 */
export function buildEliminationClaimRe(debtNames: string[] = []): RegExp {
  const names = debtNames
    .map((name) => name.trim())
    .filter((name) => name.length >= 2)
    .map((name) => escapeForRegex(name).replace(/\s+/g, String.raw`\s+`));
  const target = String.raw`(?:\$[\d,]+|(?<!\w)(?:${[BALANCE_OBJECT_NOUNS, ...names].join('|')})(?!\w))`;
  // "payment(s) cleared" is bank-sync phrasing ("confirm September payments
  // cleared") about a transaction posting, not a balance reaching zero.
  const clearVerb = String.raw`(?<!steer\s)(?<!payment\s)(?<!payments\s)\bclear(?:s|ed|ing)?\b${PARTITIVE_AMOUNT}`;
  const clearClaim = [
    // "clears it" — the pronoun stands in for the debt. "clears it up" is an
    // idiom about confusion, never a balance.
    String.raw`${clearVerb}\s+it\b(?!\s+up)`,
    // "clears the $1,209 balance" / "clearing your CreditOne 6610"
    `${clearVerb}[^.]{0,40}?${target}`,
    // Passive: "CreditOne 6610 is cleared this month". Deliberately requires a
    // copula rather than mere proximity — a plain "<target> ... clear" window
    // matched ordinary prose that happens to follow a figure, e.g. "confirm
    // the $1209 balance and clear the stale-data risk".
    String.raw`${target}(?:\s+\w+){0,2}\s+(?:is|are|was|were|gets?|got|will\s+be|would\s+be|should\s+be)\s+(?:fully\s+|completely\s+|finally\s+)?clear(?:ed|ing)\b`,
  ].join('|');

  return new RegExp(String.raw`\b(?:${UNAMBIGUOUS_PAYOFF_VERBS})\b|${clearClaim}`, 'i');
}

/** The law with no debt-name context — every verb but "clear" is unaffected. */
export const ELIMINATION_CLAIM_RE = buildEliminationClaimRe();

// ── Claim horizon ────────────────────────────────────────────────────────
// How long a payoff claim gives itself. The law used to assume every claim
// meant THIS month, so honest copy with a stated runway ("redirect $350 to
// eliminate it within 4 months") was measured against one month of money and
// rejected as a hallucination — the largest remaining source of false
// rejections in live-model sampling.
//
// The horizon is not a blanket exemption: it multiplies the affordability
// math, so a claim is still verified, just against the runway it actually
// stated. "Eliminate Delta Amex within 4 months" on $415/mo is still
// impossible and still rejected.

// A same-month COMPLETION DEADLINE ("by month-end"). This wins outright, so
// naming a longer runway alongside it can never launder the reported incident
// shape ("$565 eliminates it by month-end ... over the next 4 months").
const SAME_MONTH_DEADLINE_RE =
  /\b(?:by\s+month[-\s]?end|by\s+the\s+end\s+of\s+(?:the|this)\s+(?:month|week)|end\s+of\s+the\s+month|within\s+the\s+month|by\s+(?:mon|tues|wednes|thurs|fri|satur|sun)day|today|immediately)\b/i;

// Weaker time framing that usually says when the ACTION happens, not when the
// balance ends: "redirect $500 extra this month to eliminate it in 3 months"
// is a 3-month claim, not a same-month one. So this only sets the runway when
// the sentence states no explicit one — a real deadline above still wins, and
// a bare "this eliminates it this month" still gets the strict math.
const SAME_MONTH_FRAMING_RE = /\b(?:this\s+month|this\s+week|this\s+cycle|right\s+now)\b/i;

// A number of months/years, but only behind a horizon preposition. The
// preposition is required so a savings figure like "debt-free 11 months
// sooner" is never mistaken for a runway the claim gets to spend.
const SPELLED_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
};
// The count tolerates the hedges models actually write ("in ~2.2 months",
// "in about 3 months"); a fractional runway is used as stated rather than
// rounded, since rounding down would re-reject the claim it exists to allow.
const HORIZON_RE = new RegExp(
  String.raw`\b(?:(?:with)?in|over|across|for)\s+(?:the\s+next\s+)?(?:~|about|around|roughly|approximately|nearly|under)?\s*(\d{1,2}(?:\.\d+)?|${Object.keys(SPELLED_NUMBERS).join('|')})\s+(month|year)s?\b`,
  'gi',
);

// Rate comparatives claim a debt goes faster, never that it reaches zero on a
// given date ("redirect the acceleration here to clear the balance fastest").
// There is no date to fact-check, so the arithmetic check does not apply.
// "sooner" is deliberately absent: it overwhelmingly attaches to the
// whole-plan timeline this law already ignores ("debt-free 11 months
// sooner"), where it would exempt an otherwise bare payoff claim in the same
// sentence.
const RATE_COMPARATIVE_RE = /\b(?:faster|fastest|quicker|quickest|more\s+quickly|ahead\s+of\s+schedule)\b/i;

/**
 * Months of payments a claim in this sentence may be measured against.
 * 1 (the strict default) when the claim is same-month or states no runway,
 * N when it states one, and Infinity for a rate comparative with no date to
 * check. Returns the SMALLEST stated runway, so a sentence naming several is
 * held to the tightest one.
 */
function claimHorizonMonths(text: string): number {
  if (SAME_MONTH_DEADLINE_RE.test(text)) return 1;

  let smallest = Infinity;
  for (const match of text.matchAll(HORIZON_RE)) {
    const raw = match[1].toLowerCase();
    const count = SPELLED_NUMBERS[raw] ?? Number.parseFloat(raw);
    if (!Number.isFinite(count) || count <= 0) continue;
    smallest = Math.min(smallest, match[2].toLowerCase() === 'year' ? count * 12 : count);
  }
  if (Number.isFinite(smallest)) return smallest;

  if (SAME_MONTH_FRAMING_RE.test(text)) return 1;
  return RATE_COMPARATIVE_RE.test(text) ? Infinity : 1;
}

/**
 * Every piece of model-authored free text the text-based laws must scan. The
 * verdict is descriptive rather than prescriptive, but it is shown to the user
 * just the same — "skip the Chase minimum this month" phrased as a summary is
 * exactly as harmful as the same words in the action. A false positive here
 * only downgrades to the deterministic fallback; a scan gap re-opens the bug
 * the law exists to stop.
 */
function lawScannedText(brief: CoachBrief): string {
  return `${brief.verdict.headline} ${brief.verdict.summary} ${brief.nextAction.title} ${brief.nextAction.body} ${brief.nextAction.action}`;
}

/**
 * The most extra (never-a-minimum) money this action could put on a single
 * debt this month — the numerator of the elimination check's affordability
 * math. redirectAmount alone is wrong for a `set_acceleration`: that action
 * moves money by RAISING the monthly extra, so its redirectAmount is 0 and
 * the real figure is targetExtra. Using redirectAmount there rejected honest
 * copy like "raise your extra to $2,000, which clears your $1,500 card".
 *
 * Both are read (via max) rather than branching on kind, because each is an
 * independent claim about money moving this month and the check needs their
 * true upper bound. Overstating it can only ALLOW a claim; the ceiling laws
 * above already cap both figures against real discretionary cash, so neither
 * can be inflated to launder an impossible claim through this one.
 */
function maxExtraOnOneDebt(nextAction: CoachBrief['nextAction']): number {
  const target = Number.isFinite(nextAction.targetExtra) ? (nextAction.targetExtra as number) : 0;
  return Math.max(target, nextAction.redirectAmount);
}

/**
 * Third law: an "eliminates it this month"-style claim must be arithmetically
 * possible. The most a single debt can receive is its own minimum plus the
 * proposed extra, times the runway the claim gives itself (one month unless
 * it says otherwise — see claimHorizonMonths) — if that can't cover the
 * debt's balance, the claim is a hallucination (reported incident: "$565
 * total eliminates it by month-end" against a $1,209 balance).
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
  // Claim attribution is scoped PER BLOCK (verdict vs nextAction), not across
  // the full concatenation: a benign mention of a small, coverable debt in the
  // verdict must not vouch for an impossible payoff claim about a different
  // debt in the nextAction (CodeRabbit-flagged on the verdict-scan change).
  // For nextAction claims this is exactly the pre-verdict-scan behavior.
  // Joined with '. ' so each field is its own sentence: a title framing the
  // whole brief ("Target CreditOne aggressively this month") must not merge
  // into the body's claim and impose a same-month runway on it.
  const blocks = [
    [brief.verdict.headline, brief.verdict.summary].join('. '),
    [brief.nextAction.title, brief.nextAction.body, brief.nextAction.action].join('. '),
  ];
  const extraAvailable = maxExtraOnOneDebt(brief.nextAction);
  return blocks.some((block) => blockMakesUnverifiedClaim(block, extraAvailable, debts));
}

/** Runs the elimination-claim law against one text block in isolation. */
function blockMakesUnverifiedClaim(
  text: string,
  extraAvailable: number,
  debts: EliminationCheckDebt[],
): boolean {
  const claimRe = buildEliminationClaimRe(debts.map((d) => d.name));
  if (!claimRe.test(text)) return false;

  // Interest is deliberately ignored across the horizon: the check only ever
  // rejects claims that are impossible even on the arithmetic most generous
  // to the model, so an approximation that overstates paydown is the safe
  // direction to err in.
  const canEliminate = (d: EliminationCheckDebt, horizonMonths: number) =>
    horizonMonths === Infinity ||
    horizonMonths * (extraAvailable + d.minimumPayment) + REDIRECT_TOLERANCE >= d.balance;

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

  // Attribution stays BLOCK-scoped (a debt named anywhere in the block can
  // answer for a claim in it), but the runway is per CLAIM SENTENCE, since
  // that is the unit that actually states a deadline. Each claim sentence
  // must stand on its own: one impossible claim condemns the block even when
  // a neighbouring sentence makes a possible one.
  const candidates = named.length > 0 ? named : debts;
  const claimSentences = text
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => claimRe.test(sentence));
  // Fall back to the whole block if splitting finds nothing — the block-level
  // regex already matched, so a claim is present either way and must be checked.
  const units = claimSentences.length > 0 ? claimSentences : [text];
  return units.some((sentence) => {
    const horizonMonths = claimHorizonMonths(sentence);
    return !candidates.some((debt) => canEliminate(debt, horizonMonths));
  });
}

// Which of the four independent laws a brief broke. Kept as a stable string
// union (not free text) so it is safe to log — it carries no debt names or
// dollar amounts, only the category of failure.
export type LawViolation =
  | 'unsafe_minimum_text' // action text reads as pausing/skipping/reducing a payment
  | 'redirect_exceeds_ceiling' // redirectAmount above the discretionary extra
  | 'set_acceleration_target_invalid' // set_acceleration with a null/out-of-range target
  | 'unverified_elimination_claim'; // "pays it off this month" the math can't support

/**
 * Runs THE LAW and returns the FIRST violation found, or null when the brief
 * is lawful. Prefer this over the boolean `isBriefLawful` when the caller
 * needs to know WHICH law failed — a single "rejected" boolean can't tell a
 * minimum-advice text hit apart from a ceiling breach, an omitted
 * set_acceleration target, or an impossible payoff claim, which makes
 * rejections undiagnosable from logs. Check order matches `isBriefLawful`.
 */
export function findBriefViolation(
  brief: CoachBrief,
  effectiveAcceleration: number,
  availableCashFlow: number,
  debts: EliminationCheckDebt[] = [],
): LawViolation | null {
  const text = lawScannedText(brief);
  if (buildUnsafeMinimumAdviceRe(debts.map((d) => d.name)).test(text)) {
    return 'unsafe_minimum_text';
  }
  if (brief.nextAction.redirectAmount > effectiveAcceleration + REDIRECT_TOLERANCE) {
    return 'redirect_exceeds_ceiling';
  }
  if (brief.nextAction.kind === 'set_acceleration') {
    const targetExtra = brief.nextAction.targetExtra;
    const finiteAvailableCashFlow = Number.isFinite(availableCashFlow)
      ? Math.max(0, availableCashFlow)
      : 0;
    if (
      targetExtra === null ||
      !Number.isFinite(targetExtra) ||
      targetExtra < 0 ||
      targetExtra > finiteAvailableCashFlow + REDIRECT_TOLERANCE
    ) {
      return 'set_acceleration_target_invalid';
    }
  }
  if (makesUnverifiedEliminationClaim(brief, debts)) return 'unverified_elimination_claim';
  return null;
}

export function isBriefLawful(
  brief: CoachBrief,
  effectiveAcceleration: number,
  availableCashFlow: number,
  debts: EliminationCheckDebt[] = [],
): boolean {
  return (
    findBriefViolation(brief, effectiveAcceleration, availableCashFlow, debts) === null
  );
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
    raw as {
      _meta?: {
        effectiveAcceleration?: number;
        availableCashFlow?: number;
        debts?: unknown;
      };
    } | null
  )?._meta;
  // Number.isFinite (not typeof === 'number') so a NaN can't silently
  // disable the numeric ceiling — NaN + tolerance comparisons are always
  // false, which would make isBriefLawful's redirectAmount check a no-op.
  const effectiveAcceleration = Number.isFinite(meta?.effectiveAcceleration)
    ? (meta!.effectiveAcceleration as number)
    : 0;
  const availableCashFlow = Number.isFinite(meta?.availableCashFlow)
    ? (meta!.availableCashFlow as number)
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
  if (!isBriefLawful(parsed.data, effectiveAcceleration, availableCashFlow, debts)) return null;
  return parsed.data;
}

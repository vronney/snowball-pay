import { z } from 'zod';

const VerdictStatus = ['on_track', 'at_risk', 'off_track'] as const;

// A payoff claim the model DECLARES it is making, instead of leaving the law
// to infer one from prose. The elimination law has to answer two questions
// about any "this clears Delta Amex" sentence — WHICH debt, and over HOW LONG
// — and until now it answered both with regular expressions over English.
// That does not converge: across four review rounds on PR #91 every narrowing
// carved out an adjacent shape, and two of the last round's findings were
// caused by earlier narrowings. The model already knows both answers, so
// asking for them as JSON — exactly as `targetExtra` and `redirectAmount`
// already do — turns a parsing problem into an arithmetic one.
//
// `horizonMonths` is whole months from now by which the balance reaches zero,
// so 1 means "by month-end". The upper bound is a sanity check, not a policy:
// a payoff horizon of fifty years is a malformed number, not a claim.
//
// `.int()` is load-bearing, not tidiness. canEliminateDebt rounds the horizon
// UP, which is right for a runway PARSED from prose ("in 2.2 months" is gone
// on the third payment) but wrong for a declared one: a declared 1.1 bought
// two months of payments, so on a $900 balance at $565/mo it passed where an
// honest 1 was rejected (Codex, PR #92). The prompt asks for whole months, so
// a fractional value is malformed, and rejecting it here routes it through
// `.catch(null)` to the strict prose law — the intended failure mode.
const PayoffClaimSchema = z.object({
  debtName: z.string().min(1),
  horizonMonths: z.number().int().positive().max(600),
});

export type PayoffClaim = z.infer<typeof PayoffClaimSchema>;

// One entry per debt the brief claims to pay off, because a single declaration
// could not describe a sentence that names two. "Pay off CreditOne 6610 and
// Store Card" was accepted with only CreditOne declared, since the affordable
// debt satisfied the claim on its own and the declared runway reached the
// other one too (CodeRabbit, PR #92). Declaring each debt separately makes
// both halves checkable arithmetically and gives every debt its OWN horizon,
// which is what stopped the runway leaking between claims twice on PR #92.
//
// The cap is a sanity bound: a brief has one nextAction and a 40-word summary,
// so twenty payoff claims is a malformed response, not an ambitious one.
const PayoffClaimsSchema = z.array(PayoffClaimSchema).max(20);

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
    // The payoff claim this brief declares, or null when it makes none.
    // `.catch(null)` is deliberate, and deliberately the OPPOSITE of the rule
    // three fields up. There a missing value silently coerced to 0 would let
    // the numeric ceiling pass by omission, so anything malformed must fail
    // the whole brief. Here null means "the model declared nothing", and the
    // prose law then runs at full strictness — the same law that shipped
    // before this field existed. Failing softly into MORE scrutiny is safe,
    // so a model that garbles this field costs the user nothing, whereas
    // rejecting the brief would downgrade a good AI brief to the
    // deterministic fallback. It also lets briefs cached before this field
    // existed keep parsing, with no purge and no behaviour change.
    // The payoff claims this brief declares — one per debt, empty when it
    // claims none. `.catch([])` keeps the rule that made `payoffClaim` safe:
    // this is the OPPOSITE of redirectAmount's no-catch rule three fields up,
    // because there a missing value coerced to 0 would let the numeric ceiling
    // pass by omission, while an empty list here means the prose law runs at
    // full strictness. Failing soft into MORE scrutiny costs the user nothing;
    // failing the brief would drop them to the deterministic fallback.
    //
    // Briefs cached with the previous singular `payoffClaim` field parse to an
    // empty list, so they simply lose their declaration and are re-judged by
    // the prose law. That is the strict direction, and any brief it now
    // rejects is purged and regenerated on the next request rather than being
    // served stale — no migration needed.
    payoffClaims: PayoffClaimsSchema.catch([]),
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
  /**
   * True for the debt this month's extra actually flows to. The payoff engine
   * sends the acceleration to one target, so crediting it to every debt let a
   * claim about a card receiving only its minimum pass (Codex, PR #91).
   * Optional because briefs cached before this field existed carry none; with
   * no debt marked, the old whole-plan behaviour stands rather than purging
   * those caches.
   */
  isFocus?: boolean;
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
const PAYMENT_SCOPED_VERBS = String.raw`pause|skip|hold\s+off|defer|delay`;
const NOT_NEGATED = String.raw`(?<!\b(?:never|don'?t|do\s+not|avoid|without|not|no)\s)`;
const PAYMENT_WORDS = String.raw`minimums?|payments?|pay(?:s|ing)?|autopay|installments?|due\s+dates?|bills?`;
const SAME_SENTENCE = String.raw`[^.]{0,40}`;

// "miss" gets a stricter rule than its neighbours above, because mere
// proximity to a payment word was not enough: the payment word is usually
// part of a COMPOUND NOUN describing records, not the thing being skipped.
// "Sep payment logging is missing", "missing payment documentation" and "you
// risk missing payment changes" all describe bookkeeping and were all
// rejected in live sampling. Unsafe advice instead says miss A payment, THE
// minimum, YOUR bill — so a determiner is required, with a bare plural
// ("miss payments") as the other honest way to say it.
// Past tense is excluded on purpose. "Last month you missed one payment" is
// history, and the system prompt explicitly asks the model to cite a missed
// recent payment as an at_risk signal — the law is about ADVICE to miss one.
const MISS_DETERMINERS = String.raw`a|an|the|your|his|her|their|its|one|any|this|that|next|another|\d+`;
const PLURAL_PAYMENT_WORDS = String.raw`payments|minimums|bills|installments`;
// Even with a determiner, the payment word is often a MODIFIER of a record
// noun rather than the thing skipped: "missing a payment signal", "missing
// the payment confirmation". Only the last of these was caught by the
// determiner rule alone, and it is still bookkeeping, not advice.
const RECORD_HEAD_NOUNS = String.raw`signals?|documentation|logging|logs?|records?|data|history|info(?:rmation)?|details?|tracking|confirmations?|changes?|updates?|entr(?:y|ies)|receipts?|activity|status|schedules?|reminders?|alerts?|notifications?`;
const NOT_RECORD_COMPOUND = String.raw`(?!(?:\s+(?:${PAYMENT_WORDS}))?\s+(?:${RECORD_HEAD_NOUNS})\b)`;
// A sentence that names the HARM is warning against missing a payment, which
// is the very thing the law wants users told: "Missing payments on
// high-utilization cards will spike APR and damage credit score" was rejected
// as if it were advice. Unsafe advice sells a benefit ("frees up cash"), so
// naming a penalty in the same breath rules it out.
const CONSEQUENCE_WORDS = String.raw`spikes?|damages?|damaging|hurts?|harms?|triggers?|causes?|risks?|jeopardi[sz]es?|wrecks?|tanks?|derails?|late\s+fees?|penalty|penalties|collections?|delinquen\w+|credit\s+score`;
const NOT_A_WARNING = String.raw`(?![^.]{0,70}?\b(?:${CONSEQUENCE_WORDS})\b)`;
// "September's MISSING 2 payments" counts payments absent from the log. A
// determiner, number or possessive in front makes "missing" an adjective on
// the noun, never a directive to skip one — and so does a record-handling
// verb governing it: "log MISSING payments" is an instruction to write down
// the ones already absent, the opposite of advice to skip any.
const ATTRIBUTIVE_LEADS = String.raw`\d+|the|those|these|any|all|some|both|several|few|many|two|three|four|five|your|its|their|his|her|our|\w+'s|\w+s'`;
const RECORD_VERBS = String.raw`log(?:s|ged|ging)?|record(?:s|ed|ing)?|recover(?:s|ed|ing)?|backfill(?:s|ed|ing)?|reconcile[sd]?|enter(?:s|ed|ing)?|add(?:s|ed|ing)?|find(?:s|ing)?|found|spot(?:s|ted|ting)?|catch(?:es|ing)?|flag(?:s|ged|ging)?|report(?:s|ed|ing)?|review(?:s|ed|ing)?|check(?:s|ed|ing)?|identif(?:y|ies|ied)|note[sd]?`;
// "Stale data RISKS missing a payment" warns about failing to NOTICE one, and
// "PREVENTS missing a payment" is the advice the law wants given. Both read as
// directives to skip without this.
const RISK_VERBS = String.raw`risk(?:s|ed|ing)?|prevent(?:s|ed|ing)?|detect(?:s|ed|ing)?|notice[sd]?|noticing|stop(?:s|ped|ping)?\s+you\s+from`;
const NOT_ATTRIBUTIVE = String.raw`(?<!\b(?:${ATTRIBUTIVE_LEADS}|${RECORD_VERBS}|${RISK_VERBS})\s)`;
// The warning exemption belongs ONLY to the gerund. "Missing payments will
// spike APR" describes what happens if you do; "Miss a payment if paying it
// risks an overdraft penalty" is a directive, and a consequence word later in
// the sentence was excusing it (Codex, PR #91). An imperative or finite verb
// is always advice, whatever else the sentence mentions.
const missObject = String.raw`(?:(?:${MISS_DETERMINERS})\s+(?:\w+\s+){0,2}?(?:${PAYMENT_WORDS})|(?:${PLURAL_PAYMENT_WORDS}))(?!\w)${NOT_RECORD_COMPOUND}`;
const MISSED_PAYMENT = [
  String.raw`${NOT_NEGATED}${NOT_ATTRIBUTIVE}\bmiss(?:es)?\s+${missObject}`,
  String.raw`${NOT_NEGATED}${NOT_ATTRIBUTIVE}\bmissing\s+${missObject}${NOT_A_WARNING}`,
].join('|');

// "reduce"/"lower" are narrower still: the minimum has to be what is being cut.
// A plain proximity window was not enough either — it fired on "freeing $65
// minimum AND reducing utilization" and "$65 minimum to cut utilization faster
// and reduce total interest", where the thing reduced is plainly something
// else. So the verb must govern the word "minimum" directly (a few modifiers
// like "your CreditOne 6610" may sit between), or the passive must name it as
// the subject, and neither may cross a conjunction into a new predicate.
const CUT_VERB = String.raw`reduc(?:e|es|ing)|lower(?:s|ing)?`;
const NOT_CONJUNCTION = String.raw`(?!and\b|or\b|but\b|then\b|so\b|while\b|plus\b|to\b)`;
const MINIMUM_CUT = [
  String.raw`\b(?:${CUT_VERB})\b(?:\s+${NOT_CONJUNCTION}\w+){0,3}\s+minimum\b`,
  String.raw`\bminimum\b(?:\s+${NOT_CONJUNCTION}\w+){0,2}\s+(?:is|are|was|were|gets?|got|will\s+be|would\s+be|should\s+be|can\s+be)\s+(?:${CUT_VERB}|reduced|lowered)\b`,
].join('|');

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Folds typographic apostrophes to the ASCII one before any law reads the
 * text. Models emit U+2019 freely, and every apostrophe in these patterns was
 * written ASCII, so a curly one slipped past `don't pay` — unsafe advice
 * bypassing the law outright — while `September's` defeated the attributive
 * guard in the other direction and caused a false rejection (CodeRabbit,
 * PR #91). Normalising once beats patching each pattern and cannot be
 * forgotten by the next one added.
 *
 * Each replacement is a single character, so string offsets are preserved and
 * match indices still line up with the text the callers slice.
 */
function normalizeApostrophes(value: string): string {
  return value.replace(/[‘’ʼ՚＇]/g, "'");
}

/**
 * Builds the unsafe-minimum text law for one brief. Active debt names count as
 * payment context, so "pause CreditOne 6610" is still caught in a sentence
 * that never says "payment" — the reported incident's action was that shape.
 * With no debt list the payment words alone provide the context.
 */
export function buildUnsafeMinimumAdviceRe(debtNames: string[] = []): RegExp {
  const names = debtNames
    .map((name) => normalizeApostrophes(name.trim()))
    .filter((name) => name.length >= 2)
    // Longest first: regex alternation is first-match-wins, so "Chase" ahead
    // of "Chase Sapphire" would match only "clears Chase" and let the small
    // Chase balance answer for a claim about the $8,000 card (Codex, PR #91).
    // The attribution pass below already sorts this way for the same reason.
    .sort((a, b) => b.length - a.length)
    .map((name) => escapeForRegex(name).replace(/\s+/g, String.raw`\s+`));
  const context = String.raw`(?<!\w)(?:${[PAYMENT_WORDS, ...names].join('|')})(?!\w)`;
  const verb = String.raw`${NOT_NEGATED}\b(?:${PAYMENT_SCOPED_VERBS})\b`;
  return new RegExp(
    [
      String.raw`\b(?:${ALWAYS_UNSAFE_VERBS})\b`,
      // Same record-compound guard as "miss" below: "may DELAY accurate
      // PAYMENT logging" is about bookkeeping falling behind, not about
      // delaying a payment.
      `${verb}${SAME_SENTENCE}${context}${NOT_RECORD_COMPOUND}`,
      // Payment-word BEFORE the verb only counts in the passive, where the
      // payment really is what gets paused. Bare proximity read a noun as a
      // verb: "could mask a missed PAYMENT or create reconciliation DELAY".
      String.raw`${context}${SAME_SENTENCE}(?:is|are|was|were|gets?|got|will\s+be|would\s+be|should\s+be|can\s+be|being)\s+(?:${PAYMENT_SCOPED_VERBS})(?:d|ed|ing)?\b`,
      // A directive whose object is only a PRONOUN, with the payment named in
      // the sentence before: "The Store Card minimum is due. Delay it until
      // next month." Both branches above are sentence-bounded, so neither saw
      // it and the advice went out (Codex, PR #91). This is the one place the
      // law reaches across a sentence break, and only for a pronoun object —
      // the record-compound guard still applies, so "Payment logging is
      // stale. Skip it if you already logged." stays allowed.
      String.raw`${context}${NOT_RECORD_COMPOUND}[^.!?]{0,60}[.!?]\s+[^.!?]{0,40}?${verb}\s+(?:on\s+|it\s+)?(?:it|them|that)\b`,
      // The same shape WITHIN one sentence: "For the Store Card payment, delay
      // it until next month." The passive branch above needs a copula, and the
      // forward branch needs context after the verb, so neither saw this and
      // the advice went out (Codex, PR #91). Requiring a pronoun object is
      // what keeps it off "mask a missed PAYMENT or create reconciliation
      // DELAY", where the verb is a noun and no pronoun follows.
      String.raw`${context}${NOT_RECORD_COMPOUND}[^.!?]{0,60}?${verb}\s+(?:on\s+)?(?:it|them|that)\b`,
      MISSED_PAYMENT,
      MINIMUM_CUT,
    ].join('|'),
    'i',
  );
}

export const REDIRECT_TOLERANCE = 1; // dollars — absorbs rounding only

/**
 * Months of slack a DECLARED horizon gets, and only a declared one.
 *
 * The model writes "clears it in ~2 months" and declares `horizonMonths: 2`
 * for a balance that actually clears at 2.14. PR #91 already settled that case
 * for prose: an approximate hedge ("~2 months") earns the next whole month,
 * precisely because measuring a flat 2 rejected a fair approximation. A
 * declared integer is the same claim with the hedge stripped out by the JSON,
 * so it earns the same allowance — without it the declaration path re-opened
 * the exact false positive PR #91 closed, measured at 7 of 10 disagreements in
 * a live sweep.
 *
 * HALF a month, not a whole one. The allowance exists for ROUNDING, so the
 * question it answers is "does the true payoff time round to the number the
 * model declared" — true at 2.14 vs 2, false at 2.87 vs 2. A whole month
 * excused a claim that was genuinely a month short and broke the shared-pot
 * checks from PR #93; half a month is exactly the rounding boundary.
 *
 * It does NOT loosen a stated deadline either. Prose that says "by month-end"
 * sets the horizon itself and wins over the declaration, so the same-month
 * claims this law exists to stop stay strict.
 */
const DECLARED_HORIZON_ROUNDING_MONTHS = 0.5;

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
// Payoff ORDER is the product's whole subject, and saying which debt to
// finish first claims nothing about a balance reaching zero. "Paying it off
// FIRST saves $330 in interest vs paying Delta Amex first" was rejected in
// live sampling. Two shapes are exempt, both built in buildEliminationClaimRe
// because the second needs the brief's debt names:
//   a) an ordering adverb right after the verb — "pay it off first/next";
//   b) a comparison against another NAMED debt — "pay off CreditOne 6610
//      before Delta Amex". The named debt is required so an ordinary time
//      clause ("pays off the card before interest compounds") stays a claim.
const PAYOFF_ORDER_ADVERB = String.raw`(?!\s+(?:first|next|sooner)\b)`;

// Counterfactual COST framing states what finishing a debt would take, which
// is the opposite of claiming it happens: "Paying it off entirely this month
// costs $1209 total; your minimum ($65) plus $500 extra ($565) reaches $630"
// was rejected even though it spells out that the payoff is unaffordable. The
// dollar sign is required, so a runway ("takes 3 months") stays a claim and
// is checked against its horizon as usual.
// The window stops at clause punctuation. Crossing a semicolon reached into a
// separate statement, so a real directive with a deadline was suppressed:
// "Pay off Delta by Friday; this requires $5,000" (Codex, PR #91).
const NOT_COST_FRAMING = String.raw`(?![^.;()]{0,40}?\b(?:costs?|requires?|needs?|would\s+(?:cost|require|need))\s+(?:you\s+)?\$)`;

function payoffVerbs(names: string[]): string {
  const versusNamedDebt =
    names.length > 0
      ? // Both sides must be named debts, directly either side of the ordering
        // word. A loose 30-character window let "before" introduce a plain
        // time clause and cancel a real claim: "Pay it off by Friday before
        // Delta Amex is due" was exempted, so its explicit deadline never
        // reached the arithmetic (Codex, PR #91).
        String.raw`(?!\s+(?:the\s+|your\s+)?(?:${names.join('|')})(?!\w)\s+(?:before|ahead\s+of|instead\s+of|rather\s+than|vs\.?|versus)\s+(?:the\s+|your\s+)?(?:${names.join('|')})(?!\w))`
      : '';
  const order = `${PAYOFF_ORDER_ADVERB}${versusNamedDebt}${NOT_COST_FRAMING}`;
  return String.raw`paid\s+off${order}|pay(?:s|ing)?\s+off${order}|pay(?:s|ing)?\s+\w+(?:\s+\w+)?\s+off${order}|zero(?:e?s|ed)?\s+out|(?:reach(?:es)?|hits?|down\s+to)\s+\$?(?:0|zero)\b|wipe[sd]?\s+out|knock(?:s|ed|ing)?\s+out|gone\s+by`;
}

// "clear" and "eliminate" are the two verbs that need their object checked;
// matched bare, both fired on ordinary English about anything but money.
// "clear": "stale bank data blocks CLEAR progress tracking", "this CLEARS the
// largest uncertainty", "blocks a CLEAR picture". "eliminate": "ELIMINATE
// manual entry errors", "ELIMINATE manual entry gaps", "this ELIMINATES gaps
// like September's missing records" — all from reconnect-flavoured briefs
// selling the benefit of linking a bank. Each now has to point at something
// payoff-shaped: a dollar amount, a balance noun, an active debt's name, or
// the bare pronoun.
//
// "account" is deliberately NOT a balance noun; reconnect_bank briefs say it
// constantly about bank connections ("stale ACCOUNT data blocks a clear
// picture"). The remaining verbs ("wipes out", "zeroes out", "knocks out")
// keep matching bare: no false positive for them has ever been observed, and
// scoping a verb is a loosening that should follow evidence, not symmetry.
const BALANCE_OBJECT_NOUNS = String.raw`balances?|cards?|debts?|loans?`;

/**
 * The three shapes in which a verb can take a payoff target: the bare pronoun,
 * the target following the verb, and the target as subject (active or
 * passive). A conjunction between subject and verb means a new predicate has
 * started and the verb is no longer about the target — that is what made a
 * plain proximity window match "confirm the $1209 balance AND clear the
 * stale-data risk".
 */
function objectScopedClaim(
  verb: string,
  inflectedVerb: string,
  target: string,
  subjectTarget: string,
  pronounSuffix = '',
): string {
  return [
    String.raw`${verb}\s+it\b${pronounSuffix}`,
    // The window stops at a semicolon or parenthesis: crossing one lands in a
    // different clause, which is how "eliminate manual logging gaps (Sep
    // showed 1/3 DEBTS logged)" found a balance noun to attach to. Commas
    // stay allowed because dollar amounts contain them ("$1,209").
    `${verb}[^.;()]{0,40}?${target}`,
    // The debt as SUBJECT. `subjectTarget` excludes bare dollar amounts,
    // because money in front of the verb is what PAYS, not what is paid off:
    // "$2,000 clears Delta Amex" was matching here as though the $2,000 were
    // the balance, which then hid the real claim about Delta Amex.
    String.raw`${subjectTarget}(?:\s+(?!and\b|or\b|but\b|then\b|so\b|while\b|plus\b)\w+){0,2}\s+(?:(?:is|are|was|were|gets?|got|will\s+be|would\s+be|should\s+be)\s+(?:fully\s+|completely\s+|finally\s+)?)?${inflectedVerb}`,
  ].join('|');
}

/**
 * Builds the elimination-claim law for one brief, with the brief's own debt
 * names usable as the object of "clear" ("clears CreditOne 6610"). Every
 * other payoff verb is name-independent, so the no-names default below stays
 * a faithful law for callers without debt context.
 */
export function buildEliminationClaimRe(debtNames: string[] = []): RegExp {
  const names = debtNames
    .map((name) => normalizeApostrophes(name.trim()))
    .filter((name) => name.length >= 2)
    // Longest first: regex alternation is first-match-wins, so "Chase" ahead
    // of "Chase Sapphire" would match only "clears Chase" and let the small
    // Chase balance answer for a claim about the $8,000 card (Codex, PR #91).
    // The attribution pass below already sorts this way for the same reason.
    .sort((a, b) => b.length - a.length)
    .map((name) => escapeForRegex(name).replace(/\s+/g, String.raw`\s+`));
  // A hyphen counts as part of the word for the balance nouns, so a compound
  // adjective is not mistaken for the object: "manual gaps like September's
  // single-DEBT entry" was read as eliminating a debt. It also keeps
  // "DEBT-free", a whole-plan phrase this law ignores, from qualifying.
  // A balance noun followed by a record noun is a MODIFIER, not the object:
  // "this clears stale BALANCE DATA" is about sync freshness, not a payoff.
  // Same compound-noun shape the "miss" law already guards against.
  const balanceNoun = String.raw`(?<![\w-])(?:${BALANCE_OBJECT_NOUNS})(?![\w-])(?!\s+(?:${RECORD_HEAD_NOUNS})\b)`;
  const namedDebt = names.length > 0 ? String.raw`|(?<!\w)(?:${names.join('|')})(?!\w)` : '';
  // A dollar amount behind a preposition qualifies something else rather than
  // naming what is paid off: "auto-sync eliminates late-payment risk ON $385/mo
  // minimums" is about risk, not about clearing $385.
  const amount = String.raw`(?<!\b(?:on|for|of|about|against|with|from|per|into|across)\s)\$[\d,]+`;
  const target = String.raw`(?:${amount}|${balanceNoun}${namedDebt})`;
  // No bare dollar amount: before the verb, money is the payer, not the payee.
  const subjectTarget = String.raw`(?:${balanceNoun}${namedDebt})`;
  // "payment(s) cleared" and "minimum cleared" are bank-sync phrasing about a
  // transaction posting, not a balance reaching zero ("confirm September
  // payments cleared", "confirm the $65 minimum cleared").
  const notBankSync = String.raw`(?<!steer\s)(?<!payment\s)(?<!payments\s)(?<!minimum\s)(?<!minimums\s)`;
  // The \b before the partitive lookahead matters: without it the engine
  // backtracks "eliminates" to "eliminate", sees "s" where it wanted the
  // dollar amount, and slips past the partitive exemption.
  // An inflected "clears/cleared/clearing" is unambiguously a verb. A BARE
  // "clear" is usually the adjective, so it only counts when its object comes
  // straight after: "block CLEAR visibility into which DEBT may have slipped"
  // otherwise found a balance noun further down the window and matched.
  const clearObjectAhead = String.raw`(?=\s+(?:the|your|its|this|that|his|her|their|all|off|it)\b|\s+\$${
    names.length > 0 ? String.raw`|\s+(?:${names.join('|')})(?!\w)` : ''
  })`;
  const clearVerb = String.raw`${notBankSync}\b(?:clear(?:s|ed|ing)\b|clear\b${clearObjectAhead})${PARTITIVE_AMOUNT}${NOT_COST_FRAMING}`;
  const eliminateVerb = String.raw`\beliminat\w+\b${PARTITIVE_AMOUNT}${NOT_COST_FRAMING}`;

  // With NO debt context the law goes deliberately broad: nothing can be
  // arithmetically verified anyway, so every claim is unverifiable and gets
  // purged rather than re-served. This is the path pre-rule cached briefs
  // take (they predate _meta.debts), and matching loosely is what keeps a
  // stale "$565 eliminates a $1,209 balance" from surviving another read.
  // Every live caller passes the brief's debts and gets the precise law.
  const clearClaim =
    names.length === 0
      ? clearVerb
      : // "clears it up" is an idiom about confusion, never a balance.
        // Inflected forms only for the subject shape: after a target, a bare
        // "clear" is more often the adjective than the verb.
        objectScopedClaim(
          clearVerb,
          String.raw`${notBankSync}\bclear(?:s|ed|ing)\b`,
          target,
          subjectTarget,
          String.raw`(?!\s+up)`,
        );
  const eliminateClaim =
    names.length === 0
      ? eliminateVerb
      : objectScopedClaim(
          eliminateVerb,
          String.raw`\beliminat(?:es|ed|ing)\b`,
          target,
          subjectTarget,
        );

  return new RegExp(
    String.raw`\b(?:${payoffVerbs(names)})\b|${clearClaim}|${eliminateClaim}`,
    'i',
  );
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
// "immediately"/"today" are NOT here: they are adverbs that attach to
// whatever verb is nearest, and as deadlines they overrode a real runway in
// the same clause — "will clear its $1,209 balance in 3 months, freeing $65/mo
// and dropping utilization immediately" became a one-month claim. They sit
// with the weak framing below, where an explicit runway outranks them.
const SAME_MONTH_DEADLINE_RE =
  /\b(?:by\s+month[-\s]?end|by\s+the\s+end\s+of\s+(?:the|this)\s+(?:month|week)|end\s+of\s+the\s+month|within\s+the\s+month|by\s+(?:mon|tues|wednes|thurs|fri|satur|sun)day)\b/i;

// Weaker time framing that usually says when the ACTION happens, not when the
// balance ends: "redirect $500 extra this month to eliminate it in 3 months"
// is a 3-month claim, not a same-month one. So this only sets the runway when
// the sentence states no explicit one — a real deadline above still wins, and
// a bare "this eliminates it this month" still gets the strict math.
const SAME_MONTH_FRAMING_RE =
  /\b(?:this\s+month|this\s+week|this\s+cycle|right\s+now|immediately|today)\b/i;

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
// A RANGE ("in 2-3 months") is one claim, and the check only rejects the
// impossible, so its upper bound is the honest figure to test — reading only
// the "2" rejected "will clear its $1,209 balance in 2-3 months" at $565/mo,
// which is true at 2.14. A trailing "+" ("19+ months") reads as its number.
// Two kinds of hedge, and they point opposite ways. "~2 months" / "about 2
// months" mean roughly that, maybe a little more, so they earn the next whole
// month. "under 2 months" / "nearly 2 months" state an upper BOUND — the
// claim promises completion before that point, so adding a month would let a
// payoff needing three payments pass a two-month promise (Codex, PR #91).
const APPROXIMATE_HEDGES = String.raw`~|about|around|roughly|approximately`;
const BOUNDING_HEDGES = String.raw`under|nearly|less\s+than|no\s+more\s+than|at\s+most`;
const HEDGES = `${APPROXIMATE_HEDGES}|${BOUNDING_HEDGES}`;
const APPROXIMATE_HEDGE_RE = new RegExp(String.raw`^(?:${APPROXIMATE_HEDGES})$`, 'i');
const COUNT = String.raw`\d{1,2}(?:\.\d+)?|${Object.keys(SPELLED_NUMBERS).join('|')}`;
// "takes/needs/requires 19 months" carries a runway without a preposition.
// The preposition or one of these verbs is still REQUIRED, so a savings
// figure ("debt-free 11 months sooner") is never read as runway.
const HORIZON_LEAD = String.raw`(?:with)?in|over|across|for|takes?|took|needs?|requires?|running`;
const HORIZON_RE = new RegExp(
  String.raw`\b(?:${HORIZON_LEAD})\s+(?:the\s+next\s+)?(${HEDGES})?\s*(${COUNT})\s*(?:\+|(?:[-–—]|\s+to\s+)\s*(?:${HEDGES})?\s*(${COUNT}))?\s+(month|year)s?\b`,
  'gi',
);

// A deadline written as a month name ("by January 2027").
const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];
const MONTH_DEADLINE_RE = new RegExp(
  String.raw`\bby\s+(${MONTH_NAMES.map((m) => `${m.slice(0, 3)}(?:${m.slice(3)})?`).join('|')})\b\.?\s*(\d{4})?`,
  'i',
);

/**
 * Whole months from now to the START of a named month, so "by January" in
 * September is 4. A month already past, or the current one, reads as 1 — the
 * strict value — since a deadline inside this month is a same-month claim.
 * With no year given, a month that has passed means next year's occurrence.
 */
function monthsUntilNamedMonth(name: string, year: string | undefined, now: Date): number {
  const prefix = name.slice(0, 3).toLowerCase();
  const target = MONTH_NAMES.findIndex((m) => m.startsWith(prefix));
  if (target < 0) return 1;
  const targetYear = year ? Number.parseInt(year, 10) : now.getFullYear();
  const months = (targetYear - now.getFullYear()) * 12 + (target - now.getMonth());
  const rolled = !year && months < 0 ? months + 12 : months;
  return rolled > 0 ? rolled : 1;
}

// Rate comparatives claim a debt goes faster, never that it reaches zero on a
// given date ("redirect the acceleration here to clear the balance fastest").
// There is no date to fact-check, so the arithmetic check does not apply.
// "sooner" is deliberately absent: it overwhelmingly attaches to the
// whole-plan timeline this law already ignores ("debt-free 11 months
// sooner"), where it would exempt an otherwise bare payoff claim in the same
// sentence.
const RATE_COMPARATIVE_RE = /\b(?:faster|fastest|quicker|quickest|more\s+quickly|ahead\s+of\s+schedule)\b/i;

// "sooner" counts as a rate comparative ONLY in the text that follows the
// claim verb ("clearing it sooner to free cash flow"). Before the verb it
// nearly always belongs to the whole-plan timeline this law ignores
// ("debt-free 11 months sooner, this payment eliminates Delta Amex"), where
// it would exempt an otherwise bare claim.
const SOONER_RE = /\b(?:sooner|soonest)\b/i;

/**
 * The runway a single stretch of text states, or null if it states none.
 *
 * An explicit same-month COMPLETION DEADLINE wins outright, wherever it sits.
 * Everything else is ordered by position, because this text starts at the
 * claim verb and the nearest marker is the one modifying it: "will clear it
 * FASTEST and reduce utilization pressure immediately" is a rate claim, and
 * letting the trailing "immediately" outrank it by rule order made it a
 * one-month claim.
 *
 * Position alone was not enough for the deadline, though. A rate comparative
 * returns Infinity, which skips the arithmetic entirely, so an earlier
 * "faster" could suppress a later "by month-end" and wave through any balance
 * (Codex, PR #91). A stated deadline is unambiguous and a bypass is the
 * costliest possible error, so it outranks position.
 */
function statedHorizon(text: string, soonerCounts: boolean, now: Date = new Date()): number | null {
  const markers: Array<{ index: number; months: number }> = [];

  if (SAME_MONTH_DEADLINE_RE.test(text)) return 1;

  // Everything past the first coordinating conjunction belongs to another
  // predicate, so both the stated runway and the rate comparative stop there:
  // "Pay off Store Card and rebuild savings over 12 months" was handing the
  // payoff claim the savings runway, and "…and build savings faster" was
  // handing it a total bypass (Codex, PR #91). Deadlines and weak framing
  // still scan the whole clause; both resolve to one month, the strict way.
  const beforeConjunction = text.split(/\b(?:and|but|then|or|while|plus)\b/i)[0];

  // Across several runways, the tightest wins — but they share the position of
  // the first, since together they describe one claim's timing.
  let firstIndex = Infinity;
  let smallest = Infinity;
  for (const match of beforeConjunction.matchAll(HORIZON_RE)) {
    const [, hedge, lowRaw, highRaw, unit] = match;
    // Upper bound of a range; the lone figure otherwise.
    const raw = (highRaw ?? lowRaw).toLowerCase();
    const parsed = SPELLED_NUMBERS[raw] ?? Number.parseFloat(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) continue;
    // An APPROXIMATE hedge ("~2 months", "about 3 months") is the model saying
    // roughly, maybe a little more, so it earns the next whole month: $565/mo
    // clears $1,209 at 2.14 months, and measuring a flat 2 rejected "~2
    // months" as a hallucination when it was a fair approximation. A bounding
    // hedge ("under 2 months") gets no such allowance — it is a promise.
    const isApproximate = Boolean(hedge) && APPROXIMATE_HEDGE_RE.test(hedge.trim());
    const count = isApproximate && !highRaw ? Math.floor(parsed) + 1 : parsed;
    smallest = Math.min(smallest, unit.toLowerCase() === 'year' ? count * 12 : count);
    firstIndex = Math.min(firstIndex, match.index ?? 0);
  }
  if (Number.isFinite(smallest)) markers.push({ index: firstIndex, months: smallest });

  // "by January 2027" is a real runway, just written as a date. Reading it
  // needs a clock, which is why it went unparsed at first — but live output
  // uses it, and falling back to one month rejected a claim with five months
  // to run. It scans the whole clause like the other deadline forms.
  const namedMonth = MONTH_DEADLINE_RE.exec(text);
  if (namedMonth) {
    markers.push({
      index: namedMonth.index,
      months: monthsUntilNamedMonth(namedMonth[1], namedMonth[2], now),
    });
  }

  const framing = SAME_MONTH_FRAMING_RE.exec(text);
  if (framing) markers.push({ index: framing.index, months: 1 });

  const rate = RATE_COMPARATIVE_RE.exec(beforeConjunction);
  if (rate) markers.push({ index: rate.index, months: Infinity });
  const sooner = soonerCounts ? SOONER_RE.exec(beforeConjunction) : null;
  if (sooner) markers.push({ index: sooner.index, months: Infinity });

  if (markers.length === 0) return null;
  return markers.sort((a, b) => a.index - b.index)[0].months;
}

/**
 * The runway a claim STATES, or null when it states none at all: N when it
 * names one, 1 when it reads as same-month, and Infinity for a rate
 * comparative that names no date to check.
 *
 * Null used to collapse to 1 right here. It is now returned so the caller can
 * prefer the model's own declared horizon over that guess — and a claim that
 * states no timing is exactly the case where prose inference had nothing to
 * work with, so guessing "this month" is what rejected honest copy.
 *
 * The text FOLLOWING the claim verb wins, because that is the clause the
 * runway belongs to. A compound sentence otherwise mixes them up: "reduces it
 * to $565 by month-end, clearing it in 3 months" attaches the deadline to the
 * reduction and the runway to the payoff, and reading the whole sentence made
 * it a one-month claim. The rest of the sentence is the fallback, for the
 * common "this month ... eliminates it" order.
 */
function claimStatedHorizonMonths(afterClaim: string, sentence: string): number | null {
  return statedHorizon(afterClaim, true) ?? statedHorizon(sentence, false);
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
  return normalizeApostrophes(
    `${brief.verdict.headline} ${brief.verdict.summary} ${brief.nextAction.title} ${brief.nextAction.body} ${brief.nextAction.action}`,
  );
}

/**
 * The most extra (never-a-minimum) money that could land on a single debt in
 * one month — the numerator of the elimination check's affordability math.
 * Three independent figures, and the check needs their true upper bound:
 *
 * A `set_acceleration` REPLACES the monthly extra, so `targetExtra` is the
 * whole answer for that kind and the current acceleration must not be a floor
 * under it. The prompt explicitly allows lowering the target, zero included,
 * and keeping the old figure let "drop your extra to $0" carry a payoff claim
 * funded by acceleration the action is proposing to remove (Codex review,
 * PR #91). `redirectAmount` is excluded here for the same reason: an earlier
 * law caps it against the OLD acceleration, which is exactly the stale number
 * this must not reach for.
 *
 * Every other kind leaves the plan's acceleration running, so there the
 * figure is the larger of:
 *
 * - `effectiveAcceleration` — the extra the plan ALREADY sends every month.
 *   Leaving it out was a bug: the prompt requires `redirectAmount: 0` for an
 *   action that moves no money between debts, so a `keep_course` or
 *   `reconnect_bank` brief describing the plan's existing pace ("at current
 *   pace, CreditOne clears in ~3 months") was measured against $0 of extra
 *   and rejected as a hallucination. The money is real and already allocated.
 * - `redirectAmount` — defence in depth. The ceiling law runs BEFORE this one
 *   and already caps it at effectiveAcceleration + tolerance, so today it can
 *   never be the max by more than the rounding tolerance.
 *
 * Every figure is either server-computed (the acceleration, from the plan
 * engine) or capped by an earlier law against real discretionary cash, so the
 * model cannot inflate one to launder a claim through this check.
 */
interface PaymentCapacity {
  /** Extra dollars this action proposes moving, on top of any minimum. */
  redirectAmount: number;
  /** When this debt's balance reaches zero under the PLAN's order. */
  retirementTime: (debt: EliminationCheckDebt) => number;
  /**
   * When it reaches zero if the action's redirect drives the order instead —
   * the same dollars, allocated the way the brief proposes rather than the way
   * the plan currently does. Infinity when nothing is redirected.
   */
  redirectRetirementTime: (debt: EliminationCheckDebt) => number;
}

/** Simulation ceiling. Above the schema's 600-month cap nothing can be claimed. */
const MAX_SIMULATED_MONTHS = 600;

/**
 * When each debt is retired, simulated ONCE for the whole brief against a
 * shared pot of money — mirroring src/lib/snowball.ts, minus interest.
 *
 * The result is FRACTIONAL: a debt cleared by two thirds of month three is
 * 2.67, not 3. Whole months are enough to check a horizon the prose states
 * (payments arrive monthly), but the declared-horizon allowance above needs to
 * know whether the true time rounds to the declared figure, and 3 cannot tell
 * 2.14 from 2.87.
 *
 * A per-debt approximation was tried first and was wrong in both directions
 * (Codex, PR #93). The engine sends `extraThisMonth` to ONE target per month,
 * so granting every non-focus debt the rolled-over acceleration independently
 * let two mutually impossible payoffs both pass; and it does
 * `snowballExtra += debt.minimumPayment` on retirement, so omitting the freed
 * minimum understated capacity and rejected briefs that were true. A shared
 * sequential simulation is the only thing that gets both right, and it is
 * simpler to reason about than the heuristic it replaces.
 *
 * Interest is still ignored, deliberately: the law rejects only what is
 * impossible even on the arithmetic most favourable to the model, so
 * overstating paydown is the safe direction.
 *
 * ORDER is the model's own claimed sequence — the focus debt first, since the
 * plan is already funding it, then declared debts by the horizon the model
 * gave them, then everything else smallest first. Testing a brief against the
 * order it asserts is the generous reading; the law is not trying to guess the
 * user's payoff method.
 *
 * Nothing here changes a SAME-MONTH claim about a non-focus debt: the focus
 * debt takes at least one month to retire, so no other debt can see the pot in
 * month one. The reported incident and every same-month test are untouched.
 */
function simulateRetirementTimes(
  debts: EliminationCheckDebt[],
  monthlyExtra: number,
  order: EliminationCheckDebt[],
): Map<EliminationCheckDebt, number> {
  const retired = new Map<EliminationCheckDebt, number>();
  const remaining = new Map<EliminationCheckDebt, number>(
    debts.map((d) => [d, Math.max(0, d.balance)]),
  );
  let pot = monthlyExtra;

  for (let month = 1; month <= MAX_SIMULATED_MONTHS; month += 1) {
    if (retired.size === debts.length) break;
    const target = order.find((d) => !retired.has(d) && (remaining.get(d) ?? 0) > 0);
    // The pot is read ONCE at the start of the month, and minimums freed this
    // month are held back until the next one — `extraThisMonth = snowballExtra`
    // in src/lib/snowball.ts, with `snowballExtra += debt.minimumPayment` only
    // taking effect on the following pass. `debts` arrives in the caller's
    // order (unsorted) while `target` comes from the strategy order, so a
    // non-target debt sitting earlier in the array used to retire and hand its
    // minimum to the target within the same month, retiring it early enough to
    // accept an impossible declared horizon (Codex and CodeRabbit, PR #93).
    const potThisMonth = pot;
    let freedThisMonth = 0;
    let progressed = false;
    for (const debt of debts) {
      if (retired.has(debt)) continue;
      const payment = debt.minimumPayment + (debt === target ? potThisMonth : 0);
      if (payment <= 0) continue;
      progressed = true;
      const before = remaining.get(debt) ?? 0;
      const left = before - payment;
      remaining.set(debt, left);
      if (left <= 0) {
        // Where inside this month the balance actually hit zero.
        retired.set(debt, month - 1 + Math.min(1, before / payment));
        // The engine rolls the retired debt's minimum into the pot too, from
        // the next month onward.
        freedThisMonth += debt.minimumPayment;
      }
    }
    pot += freedThisMonth;
    // Nobody can pay anything (all minimums zero and no extra): stop rather
    // than spin for 600 months.
    if (!progressed) break;
  }
  return retired;
}

/**
 * The money that can reach each debt, resolved for the whole brief at once.
 */
function buildPaymentCapacity(
  nextAction: CoachBrief['nextAction'],
  effectiveAcceleration: number,
  debts: EliminationCheckDebt[],
  claimOrder: EliminationCheckDebt[],
): PaymentCapacity {
  // Number.isFinite, not typeof: a NaN must fall back to 0 rather than poison
  // every comparison into passing.
  const monthlyExtra =
    nextAction.kind === 'set_acceleration' && Number.isFinite(nextAction.targetExtra)
      ? Math.max(0, nextAction.targetExtra as number)
      : Number.isFinite(effectiveAcceleration)
        ? Math.max(0, effectiveAcceleration)
        : 0;
  // Never more than the extra the action actually leaves in play. A
  // set_acceleration REPLACES the monthly extra, so `targetExtra: 0` means the
  // plan stops sending anything — and redirectAmount surviving as independent
  // capacity let a brief fund a payoff with the money it was proposing to take
  // away, reopening the safeguard added in PR #91 (Codex, PR #93). For every
  // other kind an earlier law already caps it at effectiveAcceleration, so the
  // clamp changes nothing there.
  const redirectAmount = Math.min(
    Number.isFinite(nextAction.redirectAmount) ? Math.max(0, nextAction.redirectAmount) : 0,
    monthlyExtra,
  );

  const focusDebt = debts.find((d) => d.isFocus === true) ?? null;

  // Briefs cached before isFocus existed carry no focus. The established rule
  // is that they keep the old whole-plan reading rather than being purged, so
  // every debt is measured as though the extra were its own — no sequencing.
  if (focusDebt === null) {
    return {
      redirectAmount,
      retirementTime: (debt) => {
        const perMonth = debt.minimumPayment + monthlyExtra;
        return perMonth > 0 ? debt.balance / perMonth : Infinity;
      },
      redirectRetirementTime: (debt) => {
        const perMonth = debt.minimumPayment + redirectAmount;
        return perMonth > 0 ? debt.balance / perMonth : Infinity;
      },
    };
  }

  // Focus first — the plan is already funding it — then the debts the brief
  // claims, soonest first, then the rest smallest first.
  const order = [
    focusDebt,
    ...claimOrder.filter((d) => d !== focusDebt),
    ...debts
      .filter((d) => d !== focusDebt && !claimOrder.includes(d))
      .sort((a, b) => a.balance - b.balance),
  ];
  const retired = simulateRetirementTimes(debts, monthlyExtra, order);

  // The SAME money, allocated the way the action proposes: the redirect drives
  // the order through the debts the brief actually claims. Without this, a
  // brief that moves the acceleration off the current focus and retires two
  // cards in turn was rejected, because the plan simulation kept funding the
  // old focus (Codex, PR #93). Run as its own allocation, so it too spends its
  // money once.
  const redirectOrder = [...claimOrder, ...debts.filter((d) => !claimOrder.includes(d))];
  const redirectRetired =
    redirectAmount > 0 && claimOrder.length > 0
      ? simulateRetirementTimes(debts, redirectAmount, redirectOrder)
      : null;

  return {
    redirectAmount,
    retirementTime: (debt) => retired.get(debt) ?? Infinity,
    redirectRetirementTime: (debt) => redirectRetired?.get(debt) ?? Infinity,
  };
}

/**
 * Whether a debt's balance can actually reach zero within a horizon. This is
 * the whole arithmetic of the third law; everything around it exists only to
 * decide WHICH debt and HOW MANY months to hand it.
 *
 * Interest is deliberately ignored across the horizon: the check only ever
 * rejects claims that are impossible even on the arithmetic most generous to
 * the model, so an approximation that overstates paydown is the safe direction
 * to err in. A fractional runway rounds UP for the same reason and because
 * payments are monthly: a balance gone "in 2.1 months" is gone on the third
 * payment, and measuring 2.1 of them rejected a claim that was right to within
 * a rounding step.
 */
/**
 * Whether the plan's own sequential allocation retires this debt in time.
 *
 * `horizonMonths` is already the EFFECTIVE horizon — callers whole-month a
 * runway the prose states and add the rounding allowance to a declared one —
 * so it is compared as given, fractions included.
 */
function planRetiresDebt(
  debt: EliminationCheckDebt,
  horizonMonths: number,
  payments: PaymentCapacity,
): boolean {
  return horizonMonths === Infinity || payments.retirementTime(debt) <= horizonMonths;
}

/**
 * Whether the money THIS action proposes moving would retire the debt on its
 * own — defence in depth over the SAME dollars as the acceleration rather than
 * a sum, since an earlier law caps redirectAmount against
 * effectiveAcceleration.
 *
 * Compared as a fractional payoff TIME, not by rounding the horizon up to whole
 * payments: Math.ceil turned the 0.5-month rounding allowance back into a full
 * extra month, so a debt needing 1.6 months passed a declared 1 (Codex,
 * PR #93).
 */
function redirectRetiresDebt(
  debt: EliminationCheckDebt,
  horizonMonths: number,
  payments: PaymentCapacity,
): boolean {
  if (horizonMonths === Infinity) return true;
  const monthly = debt.minimumPayment + payments.redirectAmount;
  if (monthly <= 0) return false;
  return (debt.balance - REDIRECT_TOLERANCE) / monthly <= horizonMonths;
}

function canEliminateDebt(
  debt: EliminationCheckDebt,
  horizonMonths: number,
  payments: PaymentCapacity,
): boolean {
  return (
    planRetiresDebt(debt, horizonMonths, payments) ||
    redirectRetiresDebt(debt, horizonMonths, payments)
  );
}

/**
 * The declared horizon for each debt whose name matched a real one. A Map
 * keyed by the debt OBJECT, so lookups are identity-based and cannot be
 * confused by two debts sharing a name — which happens (three cards all named
 * "American Express" once reached production).
 */
type DeclaredHorizons = Map<EliminationCheckDebt, number>;

/**
 * Every active debt a declared claim could name — usually one, empty when the
 * name matches nothing.
 *
 * Matching is exact once case, surrounding whitespace, internal whitespace
 * runs and typographic apostrophes are normalised — the same normalisation the
 * text laws already apply.
 *
 * One further allowance, measured rather than guessed: the user context renders
 * each debt as "Store Card (Credit Card): $410 balance, ...", and in a live
 * sweep the model copied that whole rendered prefix into `debtName` on 25 of 30
 * briefs. A trailing parenthetical is therefore stripped before matching. Both
 * forms are compared, so a debt genuinely named "Card (Old)" still resolves.
 *
 * Deliberately NOT fuzzy beyond that: a near-match would bind a payoff claim to
 * the wrong balance, which is the failure the longest-name-first sorting
 * elsewhere in this file exists to prevent.
 */
function resolveDeclaredDebts(
  debtName: string,
  debts: EliminationCheckDebt[],
): EliminationCheckDebt[] {
  const canonical = (value: string) =>
    normalizeApostrophes(value).trim().toLowerCase().replace(/\s+/g, ' ');
  const asWritten = canonical(debtName);
  const withoutCategory = canonical(debtName.replace(/\s*\([^()]*\)\s*$/, ''));
  // Exact first, so a debt genuinely named "Card (Old)" always wins over a
  // different debt that only matches once the parenthetical is stripped.
  //
  // ALL matches, not the first. Duplicate names are not hypothetical — three
  // cards all named "American Express" reached production and had to be merged
  // by hand — and `find` resolved every declaration for that name to the same
  // debt, letting an affordable $300 balance stand in for an unaffordable
  // $5,000 one (Codex, PR #93). The claim has to hold for each of them, since
  // nothing in the declaration says which was meant.
  const exact = debts.filter((debt) => canonical(debt.name) === asWritten);
  if (exact.length > 0) return exact;
  return debts.filter((debt) => canonical(debt.name) === withoutCategory);
}

/**
 * Third law: an "eliminates it this month"-style claim must be arithmetically
 * possible. The most a single debt can receive is its own minimum plus the
 * proposed extra, times the runway the claim gives itself — if that can't
 * cover the debt's balance, the claim is a hallucination (reported incident:
 * "$565 total eliminates it by month-end" against a $1,209 balance).
 *
 * Two paths, in this order:
 *
 * 1. DECLARED. `nextAction.payoffClaims` names each debt and its horizon
 *    outright, so the arithmetic runs with no parsing at all, and ANY
 *    declaration that fails it rejects the brief. A name that matches no
 *    active debt is IGNORED rather than rejected — see below.
 *
 * 2. PROSE. The regex law still runs on every brief, declaration or not. It is
 *    the only defence when a model omits the field while its text makes a
 *    payoff claim anyway, which is exactly the reported incident's shape, so a
 *    declaration must never be able to switch it off. What a VERIFIED
 *    declaration does change is the two places the prose law had to guess:
 *    a claim that states no runway of its own gets the declared horizon rather
 *    than the strict one-month default, and a claim that names no debt is
 *    pinned to the declared one rather than being satisfied by whichever
 *    active debt happens to be small enough. The first loosens (that guess is
 *    what rejected honest multi-month copy); the second tightens.
 *
 * Attribution in the prose path: if the text names debts, the claim must hold
 * for at least one named debt; if it names none, for the declared debt, or —
 * with nothing declared — for at least one active debt. With no debt context
 * at all (pre-rule cached briefs), any elimination claim is rejected:
 * conservative on purpose, so stale caches with unverifiable claims get purged
 * rather than re-served.
 */
function makesUnverifiedEliminationClaim(
  brief: CoachBrief,
  debts: EliminationCheckDebt[],
  effectiveAcceleration: number,
): boolean {
  // Resolve the declarations first: the sequential simulation below needs to
  // know which debts the brief claims, and in what order it says they finish,
  // before it can work out when the shared pot reaches each of them.
  const resolvedClaims: Array<{ debt: EliminationCheckDebt; horizonMonths: number }> = [];
  for (const claimed of brief.nextAction.payoffClaims ?? []) {
    // An ambiguous name yields several debts and the claim must hold for all of
    // them; an unmatched one yields none and is ignored (see below).
    for (const debt of resolveDeclaredDebts(claimed.debtName, debts)) {
      resolvedClaims.push({ debt, horizonMonths: claimed.horizonMonths });
    }
  }
  // Soonest deadline first, and among equal deadlines the LARGEST balance
  // first. The tie-break is not cosmetic: with equal horizons the comparator
  // returned zero and JS sort stability made the JSON array order the payoff
  // sequence, so the same brief got different verdicts depending on how the
  // model happened to list its entries — and payoffClaims carries no ordering
  // meaning in the prompt (Codex, PR #93). Largest-first is also the order that
  // meets a shared deadline when one does: the debt needing the pot for the
  // most months has to start earliest, and the smaller one can still be
  // finished afterwards by a pot that has since grown.
  const claimOrder = [...resolvedClaims]
    .sort((a, b) => a.horizonMonths - b.horizonMonths || b.debt.balance - a.debt.balance)
    .map((c) => c.debt);

  // One shared allocation for the whole brief: the acceleration funds one debt
  // at a time and rolls onward, with the retired debt's minimum, exactly as the
  // payoff engine does.
  const payments = buildPaymentCapacity(
    brief.nextAction,
    effectiveAcceleration,
    debts,
    claimOrder,
  );

  // Path 1 — the model's own declarations, checked before a word is parsed.
  // Every one must hold: a brief claiming two payoffs is wrong if either is
  // impossible, which is exactly what one-claim-per-brief could not express.
  const declaredHorizons: DeclaredHorizons = new Map();
  // Unresolvable names were already dropped above, and dropping is deliberate:
  // rejecting them looked principled — claiming to retire a debt the user does
  // not have is a hallucination in a different costume — but a live sweep put
  // the real failure rate of name matching at 25 of 30 briefs, every one of
  // them honest, because the model echoed the context's rendered "Store Card
  // (Credit Card)" form. A formatting mismatch is far likelier than an invented
  // debt, and an unmatched name harms nobody by itself: whatever the TEXT
  // claims is still checked below at full strictness. Same rule as the schema's
  // `.catch([])` — fail soft into more scrutiny, never into a brief the user
  // loses.
  // The redirect IS the acceleration — an earlier law caps redirectAmount
  // against effectiveAcceleration, and the clamp above holds it to whatever
  // extra the action leaves in play. It is not additional money: it is a
  // DIFFERENT allocation of the dollars the plan simulation already spends.
  //
  // So every declared claim has to hold under ONE allocation or the other,
  // never a mix. Judging them one at a time let a $600 acceleration clear a
  // $620 focus debt through the plan while the same $600 cleared a second $620
  // debt through the redirect (Codex, PR #93). An earlier fix gated the
  // redirect to single-claim briefs, which was too blunt: it also rejected an
  // action that moves the acceleration off the focus debt and retires two
  // cards in turn, which is perfectly fundable.
  const effectiveMonthsFor = (claimedMonths: number) =>
    claimedMonths + DECLARED_HORIZON_ROUNDING_MONTHS;
  const planFundsEveryClaim = resolvedClaims.every((claim) =>
    planRetiresDebt(claim.debt, effectiveMonthsFor(claim.horizonMonths), payments),
  );
  const redirectFundsEveryClaim = resolvedClaims.every(
    (claim) =>
      payments.redirectRetirementTime(claim.debt) <=
      effectiveMonthsFor(claim.horizonMonths),
  );
  if (resolvedClaims.length > 0 && !planFundsEveryClaim && !redirectFundsEveryClaim) {
    return true;
  }
  for (const { debt, horizonMonths: claimedMonths } of resolvedClaims) {
    // The same debt declared twice keeps the SHORTER runway. Two horizons for
    // one balance is malformed either way, and the shorter one is the stricter
    // reading — the direction every other ambiguity in this file resolves.
    const existing = declaredHorizons.get(debt);
    declaredHorizons.set(
      debt,
      existing === undefined ? claimedMonths : Math.min(existing, claimedMonths),
    );
  }

  // Claim attribution is scoped PER BLOCK (verdict vs nextAction), not across
  // the full concatenation: a benign mention of a small, coverable debt in the
  // verdict must not vouch for an impossible payoff claim about a different
  // debt in the nextAction (CodeRabbit-flagged on the verdict-scan change).
  // For nextAction claims this is exactly the pre-verdict-scan behavior.
  // Joined with '. ' so each field is its own sentence: a title framing the
  // whole brief ("Target CreditOne aggressively this month") must not merge
  // into the body's claim and impose a same-month runway on it.
  const blocks = [
    normalizeApostrophes([brief.verdict.headline, brief.verdict.summary].join('. ')),
    normalizeApostrophes(
      [brief.nextAction.title, brief.nextAction.body, brief.nextAction.action].join('. '),
    ),
  ];
  // Path 2 — the prose law, unchanged except for the defaults a verified
  // declaration supplies where it used to guess. The claim count is taken over
  // every block before any block is judged, because a declaration that stands
  // in for an unnamed claim has to be the brief's ONLY claim, not merely the
  // only one in whichever block is being scanned.
  const claimRe = buildEliminationClaimRe(debts.map((d) => d.name));
  const briefClaimCount = blocks.reduce(
    (count, block) => count + countClaims(block, claimRe),
    0,
  );
  return blocks.some((block) =>
    blockMakesUnverifiedClaim(block, payments, debts, declaredHorizons, briefClaimCount),
  );
}

/**
 * Whether a claim match carried its own object — a dollar amount, a balance
 * noun, or the pronoun. Verbs like "wipes out" are unscoped, so their object
 * sits outside the match and has to be read forward instead.
 */
const CLAIM_OBJECT_RE = new RegExp(
  String.raw`\$[\d,]+|(?<![\w-])(?:${BALANCE_OBJECT_NOUNS})(?![\w-])|\bit\b`,
  'i',
);

/**
 * Which debts a stretch of text names. Longest name first, blanking out each
 * match before checking shorter ones — otherwise "Chase" would count as named
 * whenever "Chase Sapphire" appears, and its small balance could vouch for an
 * impossible claim about the bigger card.
 */
function attributeDebts(
  text: string,
  debts: EliminationCheckDebt[],
): EliminationCheckDebt[] {
  let remaining = normalizeApostrophes(text.toLowerCase());
  const named: EliminationCheckDebt[] = [];
  const byNameLengthDesc = debts
    .filter((d) => d.name.trim().length > 0)
    .sort((a, b) => b.name.trim().length - a.name.trim().length);
  for (const debt of byNameLengthDesc) {
    const needle = normalizeApostrophes(debt.name.trim().toLowerCase());
    if (remaining.includes(needle)) {
      named.push(debt);
      remaining = remaining.split(needle).join(' ');
    }
  }
  return named;
}

/**
 * The stretches of text the claim loop walks: the sentences that contain a
 * claim, or the whole block when splitting finds none (the block-level regex
 * already matched, so a claim is present either way and must be checked).
 *
 * Shared with the claim COUNT below so the two can never disagree about what
 * counts as a claim.
 */
function claimUnits(text: string, claimRe: RegExp): string[] {
  const claimSentences = text
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => claimRe.test(sentence));
  return claimSentences.length > 0 ? claimSentences : [text];
}

/** How many payoff claims a stretch of text makes. */
function countClaims(text: string, claimRe: RegExp): number {
  const globalClaimRe = new RegExp(claimRe.source, 'gi');
  return claimUnits(text, claimRe).reduce(
    (count, unit) => count + [...unit.matchAll(globalClaimRe)].length,
    0,
  );
}

/**
 * Runs the elimination-claim law against one text block in isolation.
 *
 * `declaredHorizons` holds the brief's verified declarations, used ONLY where
 * the prose law would otherwise guess — see makesUnverifiedEliminationClaim.
 * `briefClaimCount` spans the WHOLE brief, not this block; see below.
 */
function blockMakesUnverifiedClaim(
  text: string,
  payments: PaymentCapacity,
  debts: EliminationCheckDebt[],
  declaredHorizons: DeclaredHorizons,
  briefClaimCount: number,
): boolean {
  const claimRe = buildEliminationClaimRe(debts.map((d) => d.name));
  if (!claimRe.test(text)) return false;

  // A runway the TEXT states buys whole months of payments, as it always has.
  const statedEffective = (months: number) => Math.ceil(months);
  // A declared horizon carries its rounding allowance wherever it is read, so
  // the two call sites below cannot drift apart.
  const declaredEffective = (debt: EliminationCheckDebt): number | undefined => {
    const declared = declaredHorizons.get(debt);
    return declared === undefined ? undefined : declared + DECLARED_HORIZON_ROUNDING_MONTHS;
  };
  const canEliminate = (d: EliminationCheckDebt, horizonMonths: number) =>
    canEliminateDebt(d, horizonMonths, payments);

  // EVERY claim is checked, not just the first in its sentence. One sentence
  // can make two: "This clears Store Card and wipes out Delta Amex by
  // month-end" was accepted because the affordable Store Card satisfied the
  // sentence and the impossible Delta Amex payoff was never looked at
  // (CodeRabbit, PR #91).
  //
  // Each claim is attributed to the debts in ITS OWN clause — the span running
  // from the previous claim to the next one. Requiring instead that every debt
  // named in the sentence be coverable would be simpler but wrong: naming a
  // debt is not claiming its payoff, and "keep paying the Delta Amex minimum
  // while this clears Store Card" would start failing.
  const units = claimUnits(text, claimRe);
  const globalClaimRe = new RegExp(claimRe.source, 'gi');

  // A declaration describes ONE payoff, so it can only stand in for a claim
  // that names no debt when there is nothing else it might have meant. With a
  // second claim anywhere in the brief, handing the declared debt AND its
  // horizon to whichever claim named none let an undeclared payoff ride on the
  // declared one's runway — a real regression against main, twice over:
  //   - within one block: "Six months of $565 clears CreditOne 6610. It also
  //     wipes out the next balance."
  //   - across blocks, once the first was fixed: the same two claims split
  //     between the verdict and the nextAction, where a PER-BLOCK count reset
  //     and both halves looked like the sole claim (Codex, PR #92).
  // Hence the count spans the whole brief. It is passed in rather than
  // recomputed here because only the caller sees every block.
  //
  // Restatement is unaffected: a claim that NAMES the declared debt is covered
  // regardless of the count (see below), so a verdict and an action describing
  // one payoff both keep the declared runway.
  // A declaration can stand in for a claim that names no debt only when there
  // is nothing else it might have meant: the brief makes one claim, and
  // exactly one debt was declared. With two declarations an unnamed claim
  // could be about either, and guessing is what leaked a runway twice on
  // PR #92.
  const soleDeclaredDebt =
    briefClaimCount <= 1 && declaredHorizons.size === 1
      ? [...declaredHorizons.keys()][0]
      : null;

  return units.some((sentence) => {
    const matches = [...sentence.matchAll(globalClaimRe)];
    if (matches.length === 0) {
      // The unit matched as a whole but yields no positioned match; treat it
      // as one unattributed claim rather than skipping it.
      const statedMonths = claimStatedHorizonMonths('', sentence);
      // No positioned match means nothing to attribute from, so a declared
      // horizon applies only when the brief's single declaration is standing
      // in for this claim. Falling back to every debt AND letting each look up
      // its own declaration would hand this claim a runway declared for some
      // other debt — the leak from PR #92 through a new door.
      const candidates = soleDeclaredDebt ? [soleDeclaredDebt] : debts;
      return !candidates.some((debt) =>
        canEliminate(
          debt,
          statedMonths !== null ? statedEffective(statedMonths) : declaredEffective(debt) ?? 1,
        ),
      );
    }

    return matches.some((match, i) => {
      const start = match.index ?? 0;
      const end = start + match[0].length;
      const clauseStart = i > 0 ? (matches[i - 1].index ?? 0) + matches[i - 1][0].length : 0;
      const clauseEnd = i < matches.length - 1 ? (matches[i + 1].index ?? 0) : sentence.length;

      // Both the runway search and its fallback stop at `clauseEnd`, the next
      // claim's start. Reading to the end of the sentence let a later claim's
      // marker govern an earlier one: in "Pay off Delta Amex and then clear
      // Store Card faster", the trailing "faster" returned "no date to check"
      // for the Delta payoff and skipped its arithmetic entirely (Codex,
      // PR #91). For a single-claim sentence the clause IS the sentence, so
      // nothing changes there.
      const statedHorizonMonths = claimStatedHorizonMonths(
        sentence.slice(end, clauseEnd),
        sentence.slice(clauseStart, clauseEnd),
      );

      // Three attribution cases, by what the match itself captured:
      //  1. It NAMES a debt ("clears Store Card") — bound to that debt.
      //  2. It captured a generic object ("clears it", "eliminate this card",
      //     "clear its $1209 balance") — the claim declines to say which debt,
      //     so its referent can only be earlier. Reading forward let a debt
      //     named afterwards for another reason answer for it: "eliminate this
      //     card and move to CreditOne 6610" is about the focus card, and
      //     "clears it ... to attack Delta Amex" about the focus debt.
      //  3. It captured no object at all ("wipes out") — those verbs are
      //     unscoped, so the object follows the verb and we must read forward.
      const namedInMatch = attributeDebts(match[0], debts);
      const capturedObject = CLAIM_OBJECT_RE.test(match[0]);
      const attributionScope = capturedObject
        ? sentence.slice(clauseStart, start)
        : sentence.slice(clauseStart, clauseEnd);
      const named =
        namedInMatch.length > 0 ? namedInMatch : attributeDebts(attributionScope, debts);

      // Each candidate is measured on ITS OWN horizon. That is the whole point
      // of declaring per debt: a runway declared for CreditOne can no longer
      // reach a claim about Store Card, which is the leak that recurred twice
      // on PR #92 — once inside a block, once across blocks — each time because
      // one horizon was shared by every candidate.
      //
      // Precedence per debt: a runway the TEXT states wins, because it is what
      // the user actually reads ("eliminates it by month-end" stays a one-month
      // claim however the JSON declares it — the reported incident). Then the
      // debt's own declaration. Then the strict one-month default.
      //
      // A claim naming no debt falls back to `soleDeclaredDebt`, which is null
      // unless the brief makes exactly one claim and declares exactly one debt.
      const candidates =
        named.length > 0 ? named : soleDeclaredDebt ? [soleDeclaredDebt] : debts;

      // A declared horizon applies only where the claim actually points at
      // that debt: either the claim NAMES it, or the brief's one declaration
      // is standing in for a claim that names nothing. An UNATTRIBUTABLE claim
      // — none named, and no single declaration to stand in — falls back to
      // every active debt and must get the strict default for each, never a
      // runway declared for a different debt. Skipping this check was the same
      // leak that recurred twice on PR #92, reappearing through per-debt
      // lookup, and it is caught by that PR's regression tests.
      const declarationApplies = named.length > 0 || soleDeclaredDebt !== null;
      return !candidates.some((debt) =>
        canEliminate(
          debt,
          statedHorizonMonths !== null
            ? statedEffective(statedHorizonMonths)
            : (declarationApplies ? declaredEffective(debt) : undefined) ?? 1,
        ),
      );
    });
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
  if (makesUnverifiedEliminationClaim(brief, debts, effectiveAcceleration)) {
    return 'unverified_elimination_claim';
  }
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
          ? [
              {
                name: candidate.name,
                balance: candidate.balance!,
                minimumPayment: candidate.minimumPayment!,
                // Absent on briefs cached before the field existed; those keep
                // the old whole-plan reading rather than being purged.
                isFocus: candidate.isFocus === true,
              },
            ]
          : [];
      })
    : [];
  if (!isBriefLawful(parsed.data, effectiveAcceleration, availableCashFlow, debts)) return null;
  return parsed.data;
}

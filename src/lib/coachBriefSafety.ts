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
const NOT_ATTRIBUTIVE = String.raw`(?<!\b(?:${ATTRIBUTIVE_LEADS}|${RECORD_VERBS})\s)`;
const MISSED_PAYMENT = [
  String.raw`${NOT_NEGATED}${NOT_ATTRIBUTIVE}\bmiss(?:es|ing)?\s+(?:${MISS_DETERMINERS})\s+(?:\w+\s+){0,2}?(?:${PAYMENT_WORDS})(?!\w)${NOT_RECORD_COMPOUND}${NOT_A_WARNING}`,
  String.raw`${NOT_NEGATED}${NOT_ATTRIBUTIVE}\bmiss(?:es|ing)?\s+(?:${PLURAL_PAYMENT_WORDS})(?!\w)${NOT_RECORD_COMPOUND}${NOT_A_WARNING}`,
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
      MISSED_PAYMENT,
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
const NOT_COST_FRAMING = String.raw`(?![^.]{0,40}?\b(?:costs?|requires?|needs?|would\s+(?:cost|require|need))\s+(?:you\s+)?\$)`;

function payoffVerbs(names: string[]): string {
  const versusNamedDebt =
    names.length > 0
      ? String.raw`(?![^.]{0,30}?\b(?:before|ahead\s+of|instead\s+of|rather\s+than|vs\.?|versus)\s+(?:the\s+|your\s+)?(?:${names.join('|')})(?!\w))`
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
  const target = String.raw`(?:\$[\d,]+|${balanceNoun}${namedDebt})`;
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
function statedHorizon(text: string, soonerCounts: boolean): number | null {
  const markers: Array<{ index: number; months: number }> = [];

  if (SAME_MONTH_DEADLINE_RE.test(text)) return 1;

  // Across several runways, the tightest wins — but they share the position of
  // the first, since together they describe one claim's timing.
  let firstIndex = Infinity;
  let smallest = Infinity;
  for (const match of text.matchAll(HORIZON_RE)) {
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

  const framing = SAME_MONTH_FRAMING_RE.exec(text);
  if (framing) markers.push({ index: framing.index, months: 1 });

  const rate = RATE_COMPARATIVE_RE.exec(text);
  if (rate) markers.push({ index: rate.index, months: Infinity });
  const sooner = soonerCounts ? SOONER_RE.exec(text) : null;
  if (sooner) markers.push({ index: sooner.index, months: Infinity });

  if (markers.length === 0) return null;
  return markers.sort((a, b) => a.index - b.index)[0].months;
}

/**
 * Months of payments a claim may be measured against: 1 (the strict default)
 * when it is same-month or states no runway, N when it states one, and
 * Infinity for a rate comparative that names no date to check.
 *
 * The text FOLLOWING the claim verb wins, because that is the clause the
 * runway belongs to. A compound sentence otherwise mixes them up: "reduces it
 * to $565 by month-end, clearing it in 3 months" attaches the deadline to the
 * reduction and the runway to the payoff, and reading the whole sentence made
 * it a one-month claim. The rest of the sentence is the fallback, for the
 * common "this month ... eliminates it" order.
 */
function claimHorizonMonths(afterClaim: string, sentence: string): number {
  return statedHorizon(afterClaim, true) ?? statedHorizon(sentence, false) ?? 1;
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
function maxExtraOnOneDebt(
  nextAction: CoachBrief['nextAction'],
  effectiveAcceleration: number,
): number {
  // Number.isFinite, not typeof: a NaN must fall back to 0 rather than poison
  // every comparison into passing.
  if (nextAction.kind === 'set_acceleration' && Number.isFinite(nextAction.targetExtra)) {
    return Math.max(0, nextAction.targetExtra as number);
  }
  const accelerationFloor = Number.isFinite(effectiveAcceleration)
    ? Math.max(0, effectiveAcceleration)
    : 0;
  return Math.max(nextAction.redirectAmount, accelerationFloor);
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
  effectiveAcceleration: number,
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
    normalizeApostrophes([brief.verdict.headline, brief.verdict.summary].join('. ')),
    normalizeApostrophes(
      [brief.nextAction.title, brief.nextAction.body, brief.nextAction.action].join('. '),
    ),
  ];
  const extraAvailable = maxExtraOnOneDebt(brief.nextAction, effectiveAcceleration);
  return blocks.some((block) => blockMakesUnverifiedClaim(block, extraAvailable, debts));
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
  // direction to err in. A fractional runway rounds UP for the same reason
  // and because payments are monthly: a balance gone "in 2.1 months" is gone
  // on the third payment, and measuring 2.1 of them rejected a claim that was
  // right to within a rounding step.
  const canEliminate = (d: EliminationCheckDebt, horizonMonths: number) =>
    horizonMonths === Infinity ||
    Math.ceil(horizonMonths) * (extraAvailable + d.minimumPayment) + REDIRECT_TOLERANCE >=
      d.balance;

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
  const claimSentences = text
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => claimRe.test(sentence));
  // Fall back to the whole block if splitting finds nothing — the block-level
  // regex already matched, so a claim is present either way and must be checked.
  const units = claimSentences.length > 0 ? claimSentences : [text];
  const globalClaimRe = new RegExp(claimRe.source, 'gi');

  return units.some((sentence) => {
    const matches = [...sentence.matchAll(globalClaimRe)];
    if (matches.length === 0) {
      // The unit matched as a whole but yields no positioned match; treat it
      // as one unattributed claim rather than skipping it.
      const horizonMonths = claimHorizonMonths('', sentence);
      return !debts.some((debt) => canEliminate(debt, horizonMonths));
    }

    return matches.some((match, i) => {
      const start = match.index ?? 0;
      const end = start + match[0].length;
      const clauseStart = i > 0 ? (matches[i - 1].index ?? 0) + matches[i - 1][0].length : 0;
      const clauseEnd = i < matches.length - 1 ? (matches[i + 1].index ?? 0) : sentence.length;

      // What follows the claim verb is the clause the runway belongs to; the
      // whole sentence is the fallback.
      const horizonMonths = claimHorizonMonths(sentence.slice(end), sentence);

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
      const candidates = named.length > 0 ? named : debts;
      return !candidates.some((debt) => canEliminate(debt, horizonMonths));
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
          ? [{ name: candidate.name, balance: candidate.balance!, minimumPayment: candidate.minimumPayment! }]
          : [];
      })
    : [];
  if (!isBriefLawful(parsed.data, effectiveAcceleration, availableCashFlow, debts)) return null;
  return parsed.data;
}

import { describe, it, expect } from 'vitest';
import { CoachBriefSchema, normalizeModelBrief, isBriefLawful, findBriefViolation, parseLawfulStoredBrief, toClientBrief, type CoachBrief, type StoredCoachBrief } from '@/lib/coachBriefSafety';

function nextAction(overrides: Partial<CoachBrief['nextAction']> = {}): CoachBrief {
  return {
    verdict: { status: 'off_track', headline: 'Debt grew instead of shrinking', summary: 'Balance increased despite planned paydown.' },
    nextAction: {
      title: 'Redirect acceleration to highest APR',
      body: 'Send the full acceleration to the highest APR balance.',
      action: 'Pay extra to the highest APR debt',
      impact: 'high',
      kind: 'keep_course',
      targetExtra: null,
      outcome: null,
      redirectAmount: 0,
      payoffClaims: [],
      ...overrides,
    },
  };
}

describe('isBriefLawful', () => {
  it('rejects the exact reported incident: telling the user to stop paying a minimum', () => {
    const brief = nextAction({
      title: 'Redirect $500 acceleration to highest APR',
      body: 'Stop paying CreditOne 6610 minimums ($65/mo). Move that $65 plus your full $500 acceleration ($565 total) to Delta Amex ($10,169 at 28.24% APR). This saves $85/mo in interest vs current split.',
      action: 'Pay $565/mo to Delta Amex; pause CreditOne 6610',
      redirectAmount: 565,
    });
    expect(isBriefLawful(brief, 500, 500)).toBe(false);
  });

  it('rejects a paraphrase that avoids trigger words but still exceeds the discretionary ceiling', () => {
    const brief = nextAction({
      title: 'Send everything to Delta Amex',
      body: 'Combine your CreditOne 6610 payment with your acceleration and send $565 total to Delta Amex this month.',
      action: 'Send $565 to Delta Amex this month',
      redirectAmount: 565,
    });
    // No "pause"/"stop paying"/"skip" anywhere — only the numeric law catches this.
    expect(isBriefLawful(brief, 500, 500)).toBe(false);
  });

  it.each([
    'Hold off on the CapitalOne minimum this month',
    'Defer the Discover payment until next month',
    'Delay the Chase minimum by a week',
    'Withhold this month\'s Amex minimum',
    "Don't pay the Wells Fargo minimum this cycle",
    'Missing one minimum payment frees up cash',
    'Reduce your CreditOne minimum to $40 this month',
    'Lower the Discover minimum payment while cash is tight',
  ])('rejects trigger phrase: %s', (phrase) => {
    const brief = nextAction({ body: phrase, redirectAmount: 0 });
    expect(isBriefLawful(brief, 500, 500)).toBe(false);
  });

  it('rejects a minimum reduced outright with no reallocation proposed (CodeRabbit-flagged gap)', () => {
    // redirectAmount 0 — nothing reallocated, so the numeric check alone
    // would have let this through before "reduc(e|ing)" was added to the
    // text regex. The minimum itself is what's being cut here, not moved.
    const brief = nextAction({
      title: 'Lower your CreditOne minimum',
      body: 'Reduce your CreditOne minimum to $40 this month to free up cash.',
      action: 'Call CreditOne to reduce the minimum',
      redirectAmount: 0,
    });
    expect(isBriefLawful(brief, 500, 500)).toBe(false);
  });

  it.each([
    'This lowers your total interest paid by $85 over the plan.',
    'Call the issuer and ask them to lower your APR on this card.',
    'Reducing the balance faster saves interest over the life of the plan.',
  ])('allows benign phrasing that is not about a minimum payment: %s', (phrase) => {
    // Regression for the CodeRabbit nitpick: a bare "lower"/"reduce" match
    // used to reject legitimate advice like this. The regex now only fires
    // when "minimum" appears nearby.
    const brief = nextAction({ body: phrase, redirectAmount: 0 });
    expect(isBriefLawful(brief, 500, 500)).toBe(true);
  });

  it('allows a legitimate action that stays within the discretionary ceiling', () => {
    const brief = nextAction({
      title: 'Keep extra on Delta Amex',
      body: 'Continue sending the full $500 acceleration to Delta Amex, the highest APR balance.',
      action: 'Pay $500 extra to Delta Amex',
      redirectAmount: 500,
    });
    expect(isBriefLawful(brief, 500, 500)).toBe(true);
  });

  it('allows redirectAmount within rounding tolerance of the ceiling', () => {
    const brief = nextAction({ redirectAmount: 501 });
    expect(isBriefLawful(brief, 500, 500)).toBe(true);
  });

  it('rejects redirectAmount past the rounding tolerance', () => {
    const brief = nextAction({ redirectAmount: 502 });
    expect(isBriefLawful(brief, 500, 500)).toBe(false);
  });

  it('allows a no-op action (redirectAmount 0) with no risky language', () => {
    const brief = nextAction({
      title: 'Keep the current course',
      body: 'Continue directing extra payments to the current focus debt.',
      action: 'Stay on the current plan',
      redirectAmount: 0,
    });
    expect(isBriefLawful(brief, 0, 0)).toBe(true);
  });
});

describe('isBriefLawful — actionable acceleration bounds', () => {
  it('allows set_acceleration within available cash flow', () => {
    const brief = nextAction({
      kind: 'set_acceleration',
      targetExtra: 400,
      outcome: { bufferAfter: 100, monthsSavedVsMin: 8 },
    });
    expect(isBriefLawful(brief, 500, 500)).toBe(true);
  });

  it('rejects targetExtra above available cash flow', () => {
    const brief = nextAction({
      kind: 'set_acceleration',
      targetExtra: 502,
      outcome: { bufferAfter: -2, monthsSavedVsMin: 9 },
    });
    expect(isBriefLawful(brief, 500, 500)).toBe(false);
  });

  it('rejects a negative targetExtra', () => {
    const brief = nextAction({
      kind: 'set_acceleration',
      targetExtra: -1,
      outcome: { bufferAfter: 501, monthsSavedVsMin: 0 },
    });
    expect(CoachBriefSchema.safeParse(brief).success).toBe(false);
    expect(isBriefLawful(brief, 500, 500)).toBe(false);
  });

  it('allows targetExtra of exactly 0 — "drop extra to zero, minimums only" (CodeRabbit: zero-acceleration contract)', () => {
    // Zero is a legitimate set_acceleration target: pay minimums only. The
    // deterministic fallback itself emits a 0 target when available cash flow
    // is 0, and Zod's .min(0) + the prompt ("0 or more") agree. Only null is
    // rejected for set_acceleration, not zero.
    const brief = nextAction({
      kind: 'set_acceleration',
      targetExtra: 0,
      outcome: { bufferAfter: 500, monthsSavedVsMin: 0 },
    });
    expect(CoachBriefSchema.safeParse(brief).success).toBe(true);
    expect(isBriefLawful(brief, 500, 500)).toBe(true);
    expect(findBriefViolation(brief, 500, 500)).toBeNull();
  });

  it('allows a non-set_acceleration action with null targetExtra', () => {
    const brief = nextAction({
      kind: 'reconnect_bank',
      targetExtra: null,
      outcome: null,
    });
    expect(isBriefLawful(brief, 500, 500)).toBe(true);
  });

  it('treats NaN availableCashFlow as a zero ceiling', () => {
    const brief = nextAction({
      kind: 'set_acceleration',
      targetExtra: 100,
      outcome: { bufferAfter: 0, monthsSavedVsMin: 1 },
    });
    expect(isBriefLawful(brief, 500, NaN)).toBe(false);
  });

  it('rejects non-set_acceleration kinds that carry a stray targetExtra or outcome', () => {
    const strayTarget = nextAction({
      kind: 'keep_course',
      targetExtra: 200,
      outcome: null,
    });
    expect(CoachBriefSchema.safeParse(strayTarget).success).toBe(false);

    const strayOutcome = nextAction({
      kind: 'log_payments',
      targetExtra: null,
      outcome: { bufferAfter: 300, monthsSavedVsMin: 4 },
    });
    expect(CoachBriefSchema.safeParse(strayOutcome).success).toBe(false);
  });
});

describe('isBriefLawful — elimination claims must be arithmetically possible', () => {
  const CREDIT_ONE = { name: 'CreditOne 6610', balance: 1209, minimumPayment: 65 };
  const DELTA_AMEX = { name: 'Delta Amex', balance: 10169, minimumPayment: 250 };

  it('rejects the reported incident: claiming $565 eliminates a $1,209 balance', () => {
    const brief = nextAction({
      title: 'Attack CreditOne 6610 now',
      body: 'CreditOne 6610 carries 27.49% APR on $1,209. Paying $565 total ($65 min + $500) this month eliminates it by month-end.',
      action: 'Pay $565 to CreditOne 6610 this month',
      redirectAmount: 500,
    });
    expect(isBriefLawful(brief, 500, 500, [CREDIT_ONE, DELTA_AMEX])).toBe(false);
  });

  it('allows the same claim when minimum + extra actually covers the balance', () => {
    const smallCreditOne = { ...CREDIT_ONE, balance: 550 };
    const brief = nextAction({
      title: 'Finish off CreditOne 6610',
      body: 'Paying $565 total ($65 min + $500) this month eliminates CreditOne 6610 by month-end.',
      action: 'Pay $565 to CreditOne 6610 this month',
      redirectAmount: 500,
    });
    expect(isBriefLawful(brief, 500, 500, [smallCreditOne, DELTA_AMEX])).toBe(true);
  });

  it.each([
    'This eliminates the smallest balance this month.',
    'That pays off your smallest card by the end of the month.',
    'One payment wipes out the balance entirely.',
  ])('unattributed claim "%s" passes only when SOME debt is eliminable', (phrase) => {
    const brief = nextAction({ body: phrase, redirectAmount: 500 });
    // $500 extra + $65 min covers a $550 balance → plausible for smallCreditOne.
    expect(isBriefLawful(brief, 500, 500, [{ ...CREDIT_ONE, balance: 550 }, DELTA_AMEX])).toBe(true);
    // No debt is coverable → hallucinated claim.
    expect(isBriefLawful(brief, 500, 500, [CREDIT_ONE, DELTA_AMEX])).toBe(false);
  });

  it('does not treat whole-plan timeline phrasing as a per-debt elimination claim', () => {
    const brief = nextAction({
      body: 'Staying on this plan makes you debt-free 11 months sooner and saves $5,714 in interest.',
      redirectAmount: 0,
    });
    expect(isBriefLawful(brief, 500, 500, [CREDIT_ONE, DELTA_AMEX])).toBe(true);
  });

  it('ignores claim-free briefs regardless of debt context (default arg)', () => {
    const brief = nextAction({ redirectAmount: 500 });
    expect(isBriefLawful(brief, 500, 500)).toBe(true);
  });

  it('catches the "clears" synonym (Codex-flagged gap)', () => {
    const brief = nextAction({
      body: 'Paying $565 clears CreditOne 6610 by month-end.',
      action: 'Pay $565 to CreditOne 6610',
      redirectAmount: 500,
    });
    expect(isBriefLawful(brief, 500, 500, [CREDIT_ONE])).toBe(false);
  });

  it('does not treat "steer clear" as a payoff claim', () => {
    const brief = nextAction({
      body: 'Steer clear of new charges on CreditOne 6610 while paying it down.',
      redirectAmount: 500,
    });
    expect(isBriefLawful(brief, 500, 500, [CREDIT_ONE, DELTA_AMEX])).toBe(true);
  });

  it('does not let an overlapping shorter name vouch for a longer one (Codex-flagged gap)', () => {
    // "Chase" is a substring of "Chase Sapphire": naive matching would mark
    // both as named and let the eliminable small Chase balance validate an
    // impossible claim about the $8,000 Chase Sapphire.
    const chase = { name: 'Chase', balance: 300, minimumPayment: 35 };
    const chaseSapphire = { name: 'Chase Sapphire', balance: 8000, minimumPayment: 160 };
    const brief = nextAction({
      body: 'Pay $600 to Chase Sapphire; this eliminates it this month.',
      action: 'Pay $600 to Chase Sapphire',
      redirectAmount: 565,
    });
    expect(isBriefLawful(brief, 565, 565, [chase, chaseSapphire])).toBe(false);
  });

  it('still credits a shorter overlapping name when it is mentioned on its own', () => {
    const chase = { name: 'Chase', balance: 300, minimumPayment: 35 };
    const chaseSapphire = { name: 'Chase Sapphire', balance: 8000, minimumPayment: 160 };
    const brief = nextAction({
      body: 'Send $335 to Chase to eliminate it, then keep Chase Sapphire on its minimum.',
      action: 'Pay $335 to Chase this month',
      redirectAmount: 300,
    });
    expect(isBriefLawful(brief, 300, 300, [chase, chaseSapphire])).toBe(true);
  });
});

describe('elimination law — a set_acceleration claim is checked against targetExtra', () => {
  const CARD_1500 = { name: 'Store Card', balance: 1500, minimumPayment: 40 };
  const DELTA_AMEX = { name: 'Delta Amex', balance: 10169, minimumPayment: 250 };

  it('allows a payoff claim the new extra payment actually covers', () => {
    // The gap: a set_acceleration moves money by RAISING the monthly extra,
    // so redirectAmount is 0 and targetExtra carries the real figure. Checking
    // redirectAmount alone made $0 + $40 the ceiling, so this honest claim was
    // rejected as a hallucination.
    const brief = nextAction({
      kind: 'set_acceleration',
      title: 'Raise your extra to $2,000',
      body: 'Raising the monthly extra to $2,000 clears Store Card outright this month.',
      action: 'Set extra payment to $2,000',
      targetExtra: 2000,
      outcome: { bufferAfter: 100, monthsSavedVsMin: 12 },
      redirectAmount: 0,
    });
    expect(findBriefViolation(brief, 2000, 2100, [CARD_1500, DELTA_AMEX])).toBeNull();
  });

  it('still rejects a set_acceleration payoff claim targetExtra cannot cover', () => {
    // Loosening must not disarm the law: $2,000 + the $250 minimum is nowhere
    // near the $10,169 Delta Amex balance.
    const brief = nextAction({
      kind: 'set_acceleration',
      body: 'Raising the monthly extra to $2,000 clears Delta Amex outright this month.',
      action: 'Set extra payment to $2,000',
      targetExtra: 2000,
      outcome: { bufferAfter: 100, monthsSavedVsMin: 12 },
      redirectAmount: 0,
    });
    expect(findBriefViolation(brief, 2000, 2100, [CARD_1500, DELTA_AMEX])).toBe(
      'unverified_elimination_claim',
    );
  });

  it('drops the acceleration floor when set_acceleration LOWERS the extra', () => {
    // Codex, PR #91: a set_acceleration replaces the monthly extra, so the
    // acceleration it proposes to remove must not fund the claim. Dropping the
    // extra to $0 leaves the $35 minimum, nowhere near the $900 balance.
    const CARD_900 = { name: 'Store Card', balance: 900, minimumPayment: 35 };
    const brief = nextAction({
      kind: 'set_acceleration',
      title: 'Drop your extra to zero this month',
      body: 'Cash is tight, so drop the extra to zero; the Store Card is still cleared this month.',
      action: 'Set extra payment to $0',
      targetExtra: 0,
      outcome: { bufferAfter: 1000, monthsSavedVsMin: 0 },
      redirectAmount: 0,
    });
    expect(findBriefViolation(brief, 1000, 1000, [CARD_900])).toBe(
      'unverified_elimination_claim',
    );
  });

  it('lets targetExtra exceed the current acceleration, which is what raising it means', () => {
    // targetExtra is the one input that can legitimately sit above the
    // acceleration floor: the action proposes raising the monthly extra from
    // $200 to $1,600, and only that larger figure covers the $1,500 card.
    const brief = nextAction({
      kind: 'set_acceleration',
      body: 'Raising the monthly extra to $1,600 clears Store Card this month.',
      targetExtra: 1600,
      outcome: { bufferAfter: 100, monthsSavedVsMin: 9 },
      redirectAmount: 0,
    });
    expect(findBriefViolation(brief, 200, 1700, [CARD_1500])).toBeNull();
  });

  it('holds a non-set_acceleration kind to the money the plan actually has', () => {
    const covered = nextAction({
      body: 'This eliminates Store Card this month.',
      redirectAmount: 1500,
    });
    expect(findBriefViolation(covered, 1500, 1500, [CARD_1500])).toBeNull();

    const notCovered = nextAction({
      body: 'This eliminates Store Card this month.',
      redirectAmount: 200,
    });
    expect(findBriefViolation(notCovered, 200, 200, [CARD_1500])).toBe(
      'unverified_elimination_claim',
    );
  });

  it('purges a cached set_acceleration brief whose targetExtra cannot cover its claim', () => {
    const stored: StoredCoachBrief = {
      ...nextAction({
        kind: 'set_acceleration',
        body: 'Raising the extra to $300 clears Store Card this month.',
        targetExtra: 300,
        outcome: { bufferAfter: 100, monthsSavedVsMin: 3 },
        redirectAmount: 0,
      }),
      _meta: { effectiveAcceleration: 300, availableCashFlow: 400, debts: [CARD_1500] },
    };
    expect(parseLawfulStoredBrief(stored)).toBeNull();
  });
});

describe("elimination law — the plan's existing acceleration is the affordability floor", () => {
  const CREDIT_ONE = { name: 'CreditOne 6610', balance: 1209, minimumPayment: 65 };
  const DELTA_AMEX = { name: 'Delta Amex', balance: 10169, minimumPayment: 250 };

  it('allows a keep_course claim about the pace the plan already funds', () => {
    // The gap: the prompt mandates redirectAmount 0 for an action that moves
    // no money, so this was measured against $0 of extra ($65/mo) and
    // rejected. The plan already sends $500/mo, making the real pace $565 and
    // the 3-month claim true.
    const brief = nextAction({
      kind: 'keep_course',
      title: 'Keep the current course',
      body: 'At current pace, CreditOne 6610 clears in ~3 months, freeing its $65 minimum for Delta Amex.',
      action: 'Stay on the current plan',
      redirectAmount: 0,
    });
    expect(findBriefViolation(brief, 500, 900, [CREDIT_ONE, DELTA_AMEX])).toBeNull();
  });

  it('allows a reconnect_bank brief to describe the same funded pace', () => {
    const brief = nextAction({
      kind: 'reconnect_bank',
      body: 'Balances may be stale, but at the current $565/mo pace CreditOne 6610 clears in 3 months.',
      action: 'Reconnect Credit One Bank',
      redirectAmount: 0,
    });
    expect(findBriefViolation(brief, 500, 900, [CREDIT_ONE, DELTA_AMEX])).toBeNull();
  });

  it('still rejects a claim the existing acceleration cannot reach either', () => {
    // $500 + $250 over 3 months is $2,250 against a $10,169 balance.
    const brief = nextAction({
      kind: 'keep_course',
      body: 'At current pace, Delta Amex clears in 3 months.',
      redirectAmount: 0,
    });
    expect(findBriefViolation(brief, 500, 900, [DELTA_AMEX])).toBe('unverified_elimination_claim');
  });

  it('does not let the floor disarm the same-month math', () => {
    // The reported incident, restated as a no-money action: $500 + $65 is
    // still $565 against a $1,209 balance in one month.
    const brief = nextAction({
      kind: 'keep_course',
      body: 'This month wipes out CreditOne 6610 entirely.',
      redirectAmount: 0,
    });
    expect(findBriefViolation(brief, 500, 900, [CREDIT_ONE])).toBe('unverified_elimination_claim');
  });

  it('gives a minimums-only plan no floor at all', () => {
    const brief = nextAction({
      kind: 'keep_course',
      body: 'At current pace, CreditOne 6610 clears in 3 months.',
      redirectAmount: 0,
    });
    // $0 acceleration: 3 months of the $65 minimum is $195, not $1,209.
    expect(findBriefViolation(brief, 0, 0, [CREDIT_ONE])).toBe('unverified_elimination_claim');
  });

  it('reads the floor from _meta for a cached brief', () => {
    const body = 'At current pace, CreditOne 6610 clears in ~3 months.';
    const funded: StoredCoachBrief = {
      ...nextAction({ kind: 'keep_course', body, redirectAmount: 0 }),
      _meta: { effectiveAcceleration: 500, availableCashFlow: 900, debts: [CREDIT_ONE] },
    };
    expect(parseLawfulStoredBrief(funded)).not.toBeNull();

    const unfunded: StoredCoachBrief = {
      ...nextAction({ kind: 'keep_course', body, redirectAmount: 0 }),
      _meta: { effectiveAcceleration: 0, availableCashFlow: 900, debts: [CREDIT_ONE] },
    };
    expect(parseLawfulStoredBrief(unfunded)).toBeNull();
  });

  it('treats a NaN acceleration as no floor rather than an infinite one', () => {
    const brief = nextAction({
      kind: 'keep_course',
      body: 'At current pace, CreditOne 6610 clears in 3 months.',
      redirectAmount: 0,
    });
    expect(findBriefViolation(brief, NaN, 900, [CREDIT_ONE])).toBe('unverified_elimination_claim');
  });
});

describe('elimination law — "clear" must point at something payoff-shaped', () => {
  const CREDIT_ONE = { name: 'CreditOne 6610', balance: 1209, minimumPayment: 65 };
  const DELTA_AMEX = { name: 'Delta Amex', balance: 10169, minimumPayment: 250 };

  it.each([
    // All verbatim from live-model runs, all rejected before this change.
    'Stale bank data blocks clear progress tracking.',
    'This takes 5 minutes and clears the largest uncertainty.',
    'Stale account data blocks clear picture.',
    'Reconnect now to confirm the $1209 balance and clear the stale-data risk.',
    'Reconnect to confirm September payment of $65 minimum cleared.',
    // Bare "clear" as an adjective, with a balance noun further along.
    'Missing logs hide payment status and block clear visibility into which debt may have slipped.',
    'Stale sync blocks a clear read on your card balances.',
    // Verbatim: "balance data" is sync freshness; the balance noun is a
    // modifier here, not the thing being cleared.
    'This clears stale balance data and confirms whether September payments posted.',
    // Verbatim: the object is the risk; "$385" behind "on" only qualifies it.
    // (A balance NOUN later in the window would still match — that shape has
    // not been observed, and shortening the window risks real payoff claims.)
    'Auto-sync eliminates late-payment risk on $385/mo minimums.',
    'Reconnecting clears the card history gap from September.',
  ])('allows "clear" used about anything but a balance: %s', (phrase) => {
    const brief = nextAction({ kind: 'reconnect_bank', body: phrase, redirectAmount: 0 });
    expect(findBriefViolation(brief, 200, 760, [CREDIT_ONE, DELTA_AMEX])).toBeNull();
  });

  it.each([
    'Paying $565 clears CreditOne 6610 by month-end.',
    'Paying $565 clears the $1,209 balance by month-end.',
    'Paying $565 clears the card by month-end.',
    'One $565 payment and CreditOne 6610 is cleared by month-end.',
    'Send $565 to CreditOne 6610 and that clears it by month-end.',
    // Bare "clear" still counts when its object comes straight after.
    'Send $565 this month to clear the $1,209 balance.',
    'Send $565 this month to clear CreditOne 6610.',
  ])('still rejects an unaffordable payoff claim: %s', (phrase) => {
    const brief = nextAction({ body: phrase, redirectAmount: 500 });
    expect(findBriefViolation(brief, 500, 500, [CREDIT_ONE, DELTA_AMEX])).toBe(
      'unverified_elimination_claim',
    );
  });

  it('uses a debt name as the object when the debt list is supplied', () => {
    // No dollar amount and no balance noun, so the debt name is the only
    // thing that can make this a payoff claim.
    const brief = nextAction({ body: 'Your plan clears CreditOne 6610 by month-end.', redirectAmount: 500 });
    expect(findBriefViolation(brief, 500, 500, [CREDIT_ONE])).toBe('unverified_elimination_claim');
  });

  it('falls back to broad matching with no debt context, so nothing unverifiable survives', () => {
    // Object scoping needs debt names to be precise. Given none, the law
    // cannot verify anything either, so it matches loosely and rejects —
    // which is what purges pre-rule cached briefs on their next read.
    const brief = nextAction({ body: 'Your plan clears CreditOne 6610 by month-end.', redirectAmount: 500 });
    expect(findBriefViolation(brief, 500, 500, [])).toBe('unverified_elimination_claim');
  });

  it('does not treat "clears it up" as a payoff claim', () => {
    const brief = nextAction({
      kind: 'reconnect_bank',
      body: 'September logging looks off; reconnecting clears it up.',
      redirectAmount: 0,
    });
    expect(findBriefViolation(brief, 200, 760, [CREDIT_ONE])).toBeNull();
  });

  it('keeps allowing "steer clear" and "payments cleared"', () => {
    const steer = nextAction({
      body: 'Steer clear of new charges on CreditOne 6610 while paying it down.',
      redirectAmount: 500,
    });
    expect(findBriefViolation(steer, 500, 500, [CREDIT_ONE, DELTA_AMEX])).toBeNull();

    const synced = nextAction({
      kind: 'reconnect_bank',
      body: 'Reauth Credit One Bank to confirm September payments cleared.',
      redirectAmount: 0,
    });
    expect(findBriefViolation(synced, 200, 760, [CREDIT_ONE, DELTA_AMEX])).toBeNull();
  });

  it('leaves the other payoff verbs matching without an object', () => {
    for (const phrase of [
      'One payment wipes out the smallest balance.',
      'This zeroes out your smallest card.',
      'That knocks out the smallest balance this month.',
    ]) {
      expect(findBriefViolation(nextAction({ body: phrase, redirectAmount: 500 }), 500, 500, [
        CREDIT_ONE,
      ])).toBe('unverified_elimination_claim');
    }
  });
});

describe('elimination law — a claim is measured against the runway it states', () => {
  const CREDIT_ONE = { name: 'CreditOne 6610', balance: 1209, minimumPayment: 65 };
  const DELTA_AMEX = { name: 'Delta Amex', balance: 10169, minimumPayment: 250 };

  it('allows the live-model multi-month claim its runway actually covers', () => {
    // Verbatim from a live-model run, rejected before this change. The budget
    // is the $500 acceleration floor plus the $65 minimum, so $565/mo: four
    // months is $2,260 against a $1,209 balance, and one month ($565) is not.
    const brief = nextAction({
      title: 'Target CreditOne aggressively this month',
      body: 'CreditOne 6610 is your highest-utilization card. Redirect $350 of your $500 planned acceleration to eliminate it within 4 months, freeing $65/mo for Discover.',
      action: 'Allocate $350 extra to CreditOne 6610',
      redirectAmount: 350,
    });
    expect(findBriefViolation(brief, 500, 500, [CREDIT_ONE, DELTA_AMEX])).toBeNull();
  });

  it('allows a rate comparative, which names no date to fact-check', () => {
    // Also verbatim: "clear $1209 balance fastest" claims speed, not a payoff
    // date, so there is nothing for the arithmetic to falsify.
    const brief = nextAction({
      body: 'Paying the $65 minimum, redirect the $500 acceleration here to clear the $1209 balance fastest and lower utilization.',
      action: 'Apply $565 total to CreditOne 6610 this cycle',
      redirectAmount: 500,
    });
    expect(findBriefViolation(brief, 500, 500, [CREDIT_ONE, DELTA_AMEX])).toBeNull();
  });

  it('still rejects a multi-month claim the runway cannot cover', () => {
    // The loosening must stay a real check: $500 + $250 over 4 months is
    // $3,000 against a $10,169 balance.
    const brief = nextAction({
      body: 'Redirect the full acceleration to eliminate Delta Amex within 4 months.',
      action: 'Send $500 extra to Delta Amex',
      redirectAmount: 500,
    });
    expect(findBriefViolation(brief, 500, 500, [DELTA_AMEX])).toBe('unverified_elimination_claim');
  });

  it.each([
    ['in 3 months', 3],
    ['within three months', 3],
    ['over the next 3 months', 3],
  ])('reads the runway from "%s"', (phrase) => {
    // The budget is the acceleration floor ($500), not the $350 redirect, so
    // $65 min + $500 = $565/mo. 3 months ($1,695) covers the $1,209 balance;
    // 2 months ($1,130) does not.
    const brief = nextAction({ body: `This eliminates CreditOne 6610 ${phrase}.`, redirectAmount: 350 });
    expect(findBriefViolation(brief, 500, 500, [CREDIT_ONE])).toBeNull();

    const tooShort = nextAction({ body: 'This eliminates CreditOne 6610 in 2 months.', redirectAmount: 350 });
    expect(findBriefViolation(tooShort, 500, 500, [CREDIT_ONE])).toBe('unverified_elimination_claim');
  });

  it('converts a runway stated in years', () => {
    const brief = nextAction({
      body: 'Staying the course eliminates Delta Amex within 2 years.',
      redirectAmount: 250,
    });
    // Again the $500 acceleration floor is the budget, not the $250 redirect:
    // 24 months x ($500 + $250 minimum) = $18,000 against $10,169.
    expect(findBriefViolation(brief, 500, 500, [DELTA_AMEX])).toBeNull();
  });

  it('reads a hedged or fractional runway', () => {
    // Verbatim shape from a live-model run: "will clear the $1,209 balance in
    // ~2.2 months". $565/mo x 2.2 is $1,243, so the claim holds.
    const brief = nextAction({
      body: 'Applying $500 extra monthly plus the $65 minimum will clear the $1,209 balance in ~2.2 months.',
      redirectAmount: 500,
    });
    expect(findBriefViolation(brief, 500, 500, [CREDIT_ONE])).toBeNull();

    const hedged = nextAction({
      body: 'This eliminates CreditOne 6610 in about 3 months.',
      redirectAmount: 350,
    });
    expect(findBriefViolation(hedged, 500, 500, [CREDIT_ONE])).toBeNull();
  });

  it('reads a runway written as a range, using its upper bound', () => {
    // Verbatim, and rejected before this change: $565/mo clears $1,209 in
    // 2.14 months, so "2-3 months" is true. Reading only the "2" ($1,130)
    // called it a hallucination.
    const brief = nextAction({
      kind: 'keep_course',
      body: 'Paying $565/mo (minimum $65 + acceleration $500) will clear its $1209 balance in 2-3 months.',
      redirectAmount: 0,
    });
    expect(findBriefViolation(brief, 500, 900, [CREDIT_ONE])).toBeNull();

    // The en-dash form the model actually emitted, and the "to" spelling.
    for (const phrase of ['in 2–3 months', 'in 2 to 3 months']) {
      const variant = nextAction({
        kind: 'keep_course',
        body: `Paying $565/mo will clear its $1209 balance ${phrase}.`,
        redirectAmount: 0,
      });
      expect(findBriefViolation(variant, 500, 900, [CREDIT_ONE])).toBeNull();
    }
  });

  it('still rejects a range whose upper bound cannot cover the balance', () => {
    const brief = nextAction({
      kind: 'keep_course',
      body: 'At current pace, Delta Amex clears in 2-3 months.',
      redirectAmount: 0,
    });
    expect(findBriefViolation(brief, 500, 900, [DELTA_AMEX])).toBe('unverified_elimination_claim');
  });

  it('takes the runway from the clause the claim is in, not the whole sentence', () => {
    // Verbatim: "by month-end" belongs to the reduction, "in 3 months" to the
    // payoff. Reading the whole sentence let the deadline win and rejected it.
    const brief = nextAction({
      body: 'Applying the full $500 monthly extra here reduces it to $565 by month-end, clearing it in 3 months and saving ~$200 in interest.',
      redirectAmount: 500,
    });
    expect(findBriefViolation(brief, 500, 900, [CREDIT_ONE])).toBeNull();
  });

  it('counts "sooner" only after the claim verb', () => {
    // Verbatim: "clearing it sooner" names no date to fact-check.
    const after = nextAction({
      body: 'Paying $565 total this month attacks the smallest balance ($1209) fastest under snowball, clearing it sooner to free cash flow.',
      redirectAmount: 500,
    });
    expect(findBriefViolation(after, 500, 900, [CREDIT_ONE])).toBeNull();

    // Before the verb it belongs to the whole-plan timeline this law ignores,
    // so it must not exempt the bare claim that follows.
    const before = nextAction({
      body: 'Being debt-free 11 months sooner, this payment eliminates Delta Amex.',
      redirectAmount: 500,
    });
    expect(findBriefViolation(before, 500, 900, [DELTA_AMEX])).toBe('unverified_elimination_claim');
  });

  it('keeps an explicit deadline authoritative over an earlier rate comparative', () => {
    // Codex, PR #91: a comparative returns "no date to check", which skips the
    // arithmetic entirely, so an earlier "faster" must not suppress a later
    // "by month-end" and wave through any balance.
    const brief = nextAction({
      body: 'Pay off Delta Amex faster, by month-end.',
      redirectAmount: 500,
    });
    expect(findBriefViolation(brief, 500, 900, [DELTA_AMEX])).toBe('unverified_elimination_claim');
  });

  it('does not give a bounding hedge the extra month an approximate one earns', () => {
    // Codex, PR #91: "under 2 months" promises completion BEFORE two months,
    // so it must not be read as three. $565 x 2 is $1,130 against $1,209.
    const bounded = nextAction({
      body: 'Paying $565/mo clears it in under 2 months.',
      redirectAmount: 500,
    });
    expect(findBriefViolation(bounded, 500, 900, [CREDIT_ONE])).toBe(
      'unverified_elimination_claim',
    );

    const nearly = nextAction({
      body: 'Paying $565/mo clears it in nearly 2 months.',
      redirectAmount: 500,
    });
    expect(findBriefViolation(nearly, 500, 900, [CREDIT_ONE])).toBe(
      'unverified_elimination_claim',
    );

    // The approximate form still earns it.
    const approximate = nextAction({
      body: 'Paying $565/mo clears it in about 2 months.',
      redirectAmount: 500,
    });
    expect(findBriefViolation(approximate, 500, 900, [CREDIT_ONE])).toBeNull();
  });

  it('lets the marker nearest the claim win', () => {
    // Verbatim: "fastest" attaches to the payoff, "immediately" to reducing
    // utilization. Rule order let the trailing adverb win and rejected it.
    const brief = nextAction({
      body: 'Paying $500 extra monthly will clear it fastest and reduce utilization pressure immediately.',
      redirectAmount: 500,
    });
    expect(findBriefViolation(brief, 500, 900, [CREDIT_ONE])).toBeNull();

    // Reversed, the deadline is the nearest marker and still binds — this is
    // what stops a longer runway named afterwards from laundering a claim.
    const laundered = nextAction({
      body: 'Paying $565 will clear it by month-end, finishing the plan faster over the next 4 months.',
      redirectAmount: 500,
    });
    expect(findBriefViolation(laundered, 500, 900, [CREDIT_ONE])).toBe(
      'unverified_elimination_claim',
    );
  });

  it('does not let a stray "immediately" outrank a stated runway', () => {
    // Verbatim: "immediately" belongs to dropping utilization, not the payoff.
    // Treating it as a completion deadline made this a one-month claim.
    const brief = nextAction({
      body: 'Paying $565/mo (minimum $65 + $500 extra) will clear its $1,209 balance in 3 months, freeing $65/mo and dropping utilization immediately.',
      redirectAmount: 500,
    });
    expect(findBriefViolation(brief, 500, 900, [CREDIT_ONE])).toBeNull();

    // With no runway stated it still means this month.
    const bare = nextAction({
      body: 'Paying $565 immediately eliminates CreditOne 6610.',
      redirectAmount: 500,
    });
    expect(findBriefViolation(bare, 500, 900, [CREDIT_ONE])).toBe('unverified_elimination_claim');
  });

  it('rounds a fractional runway up to a whole payment', () => {
    // Verbatim: "eliminates this $1209 balance in 2.1 months" at $565/mo. The
    // true figure is 2.14, so measuring 2.1 payments ($1,186) rejected a claim
    // that was right to within a rounding step. Payments are monthly: gone "in
    // 2.1 months" means gone on the third one.
    const brief = nextAction({
      body: 'Paying $565/mo total (minimum $65 + $500 acceleration) eliminates this $1209 balance in 2.1 months.',
      redirectAmount: 500,
    });
    expect(findBriefViolation(brief, 500, 900, [CREDIT_ONE])).toBeNull();

    // Rounding up must not swallow a whole extra month: 2 payments of $565 is
    // $1,130 and still cannot cover $1,209.
    const twoMonths = nextAction({
      body: 'Paying $565/mo eliminates this $1209 balance in 2 months.',
      redirectAmount: 500,
    });
    expect(findBriefViolation(twoMonths, 500, 900, [CREDIT_ONE])).toBe(
      'unverified_elimination_claim',
    );
  });

  it('does not bind a generic-object claim to a debt named after it', () => {
    // Verbatim from a live sweep: "this card" is the focus Store Card, and
    // CreditOne 6610 is named only as where attention moves next. $35 + $400
    // covers the $410 Store Card.
    const STORE_CARD = { name: 'Store Card', balance: 410, minimumPayment: 35 };
    const CREDIT_ONE_820 = { name: 'CreditOne 6610', balance: 820, minimumPayment: 45 };
    const brief = nextAction({
      body: 'Continuing $400/mo extra, beyond the $35 minimum, keeps you on pace to eliminate this card and move to CreditOne 6610 next.',
      redirectAmount: 400,
    });
    expect(findBriefViolation(brief, 400, 700, [STORE_CARD, CREDIT_ONE_820])).toBeNull();
  });

  it('checks every claim in a compound sentence, not just the first', () => {
    // CodeRabbit, PR #91: one sentence can claim payoff of two debts. Only the
    // first match was evaluated, and any named debt being coverable passed the
    // whole sentence — so the affordable Store Card waved through an
    // impossible Delta Amex payoff.
    const STORE_CARD = { name: 'Store Card', balance: 410, minimumPayment: 35 };
    const brief = nextAction({
      body: 'This clears Store Card and wipes out Delta Amex by month-end.',
      redirectAmount: 500,
    });
    expect(findBriefViolation(brief, 500, 900, [STORE_CARD, DELTA_AMEX])).toBe(
      'unverified_elimination_claim',
    );
  });

  it("does not let a later claim's runway marker govern an earlier claim", () => {
    // Codex, PR #91: "faster" belongs to the Store Card claim, but the search
    // ran to the end of the sentence, returned "no date to check" for the
    // Delta Amex payoff, and skipped its arithmetic entirely.
    const STORE_CARD = { name: 'Store Card', balance: 410, minimumPayment: 35 };
    const brief = nextAction({
      body: 'Pay off Delta Amex and then clear Store Card faster.',
      redirectAmount: 500,
    });
    expect(findBriefViolation(brief, 500, 900, [STORE_CARD, DELTA_AMEX])).toBe(
      'unverified_elimination_claim',
    );
  });

  it('still reads a runway that belongs to a single-claim sentence', () => {
    // For one claim the clause IS the sentence, so clause-bounding changed
    // nothing here.
    const brief = nextAction({
      body: 'Paying $565/mo clears CreditOne 6610 in 3 months.',
      redirectAmount: 500,
    });
    expect(findBriefViolation(brief, 500, 900, [CREDIT_ONE])).toBeNull();
  });

  it('still allows a compound sentence where each claim stands on its own', () => {
    // The fix must stay per-claim rather than "every named debt must be
    // coverable": naming a debt is not claiming its payoff. Here Delta Amex is
    // named only as the debt that keeps receiving its minimum.
    const STORE_CARD = { name: 'Store Card', balance: 410, minimumPayment: 35 };
    const brief = nextAction({
      body: 'Keep paying the Delta Amex minimum while this clears Store Card by month-end.',
      redirectAmount: 500,
    });
    expect(findBriefViolation(brief, 500, 900, [STORE_CARD, DELTA_AMEX])).toBeNull();
  });

  it('does not let a debt named for another reason answer for a pronoun claim', () => {
    // Verbatim: "it" is the focus debt; Delta Amex is named only as where the
    // freed cash goes next. Attributing the claim to Delta Amex rejected it.
    const brief = nextAction({
      body: 'Applying $565/mo total ($65 minimum + $500 extra) clears it in ~2.1 months, freeing $65/mo to attack Delta Amex (28.24% APR, $10169).',
      redirectAmount: 500,
    });
    expect(findBriefViolation(brief, 500, 900, [CREDIT_ONE, DELTA_AMEX])).toBeNull();

    // Naming the debt still binds the claim to it.
    const named = nextAction({
      body: 'Applying $565/mo total clears Delta Amex in ~2.1 months.',
      redirectAmount: 500,
    });
    expect(findBriefViolation(named, 500, 900, [CREDIT_ONE, DELTA_AMEX])).toBe(
      'unverified_elimination_claim',
    );
  });

  it('gives a hedged runway the next whole month', () => {
    // Verbatim: "clears it in ~2 months" at $565/mo. The true figure is 2.14,
    // so the hedge is fair and a flat 2 ($1,130) rejected it.
    const brief = nextAction({
      body: 'Paying $565/mo total ($65 min + $500 extra) clears it in ~2 months, freeing cash flow.',
      redirectAmount: 500,
    });
    expect(findBriefViolation(brief, 500, 900, [CREDIT_ONE])).toBeNull();

    // Unhedged, the stated figure is taken at face value.
    const exact = nextAction({
      body: 'Paying $565/mo clears it in 2 months.',
      redirectAmount: 500,
    });
    expect(findBriefViolation(exact, 500, 900, [CREDIT_ONE])).toBe('unverified_elimination_claim');

    // The hedge buys one month, not a blank cheque.
    const wild = nextAction({
      body: 'Paying $565/mo clears Delta Amex in about 2 months.',
      redirectAmount: 500,
    });
    expect(findBriefViolation(wild, 500, 900, [DELTA_AMEX])).toBe('unverified_elimination_claim');
  });

  it('does not read a hyphenated compound as the object', () => {
    // Verbatim: "single-debt entry" is a description of a record, not a debt
    // being eliminated.
    const brief = nextAction({
      kind: 'reconnect_bank',
      body: "Reconnecting will auto-log payments, eliminate manual gaps like September's single-debt entry, and give real-time visibility.",
      redirectAmount: 0,
    });
    expect(findBriefViolation(brief, 200, 760, [CREDIT_ONE, DELTA_AMEX])).toBeNull();

    // "debt-free" is whole-plan phrasing this law deliberately ignores.
    const debtFree = nextAction({
      body: 'Staying the course eliminates debt-free timelines guesswork.',
      redirectAmount: 0,
    });
    expect(findBriefViolation(debtFree, 200, 760, [CREDIT_ONE])).toBeNull();
  });

  it('does not let the claim window cross into a parenthetical', () => {
    // Verbatim: "debts" inside the aside was read as the object of eliminate.
    const brief = nextAction({
      kind: 'reconnect_bank',
      body: 'Automated sync will eliminate manual logging gaps (Sep showed 1/3 debts logged) and create visibility.',
      redirectAmount: 0,
    });
    expect(findBriefViolation(brief, 200, 760, [CREDIT_ONE, DELTA_AMEX])).toBeNull();
  });

  it('reads a runway stated without a preposition, and a trailing plus', () => {
    // "Current $65 minimum alone takes 19+ months to clear $1209 balance" —
    // verbatim, and rejected as a one-month claim before this change.
    const brief = nextAction({
      kind: 'keep_course',
      body: 'The $65 minimum alone takes 19+ months to clear the $1209 balance.',
      redirectAmount: 0,
    });
    expect(findBriefViolation(brief, 0, 900, [CREDIT_ONE])).toBeNull();
  });

  it('treats "this month" as when the action happens, not when the balance ends', () => {
    // Also verbatim: "Redirect $500 extra this month to eliminate it in 3
    // months" is a 3-month claim. Reading the framing as a deadline made it a
    // one-month claim and rejected it.
    const brief = nextAction({
      body: 'Redirect $500 extra this month to eliminate it in 3 months, freeing the $65 minimum.',
      redirectAmount: 500,
    });
    expect(findBriefViolation(brief, 500, 500, [CREDIT_ONE])).toBeNull();
  });

  it('still applies the strict math to "this month" when no runway is stated', () => {
    // The incident shape, and the reason the framing is not simply ignored:
    // $565 against a $1,209 balance with no runway named.
    const brief = nextAction({
      body: 'Paying it entirely this month ($65 minimum + $500 extra = $565 total) eliminates CreditOne 6610.',
      redirectAmount: 500,
    });
    expect(findBriefViolation(brief, 500, 500, [CREDIT_ONE])).toBe('unverified_elimination_claim');
  });

  it('lets an explicit same-month deadline override a longer runway in the same block', () => {
    // The incident shape must never be launderable by naming a longer horizon
    // elsewhere in the sentence.
    const brief = nextAction({
      body: 'Your plan runs for 4 months, but this $565 payment eliminates CreditOne 6610 by month-end.',
      redirectAmount: 500,
    });
    expect(findBriefViolation(brief, 500, 500, [CREDIT_ONE])).toBe('unverified_elimination_claim');
  });

  it('holds a sentence naming several runways to the shortest', () => {
    const brief = nextAction({
      body: 'This eliminates CreditOne 6610 in 2 months, and Delta Amex within 12 months.',
      redirectAmount: 350,
    });
    expect(findBriefViolation(brief, 500, 500, [CREDIT_ONE])).toBe('unverified_elimination_claim');
  });

  it('does not read a savings figure as a runway', () => {
    // "11 months sooner" is how much time the plan saves, not time this claim
    // gets to spend. Without the required preposition it is ignored, so the
    // claim stays on the strict one-month math.
    const brief = nextAction({
      body: 'Being debt-free 11 months sooner, this payment eliminates Delta Amex.',
      redirectAmount: 500,
    });
    expect(findBriefViolation(brief, 500, 500, [DELTA_AMEX])).toBe('unverified_elimination_claim');
  });

  it('still defaults to one month when no runway is stated', () => {
    const brief = nextAction({ body: 'One payment wipes out CreditOne 6610.', redirectAmount: 500 });
    expect(findBriefViolation(brief, 500, 500, [CREDIT_ONE])).toBe('unverified_elimination_claim');
  });
});

describe('elimination law — partitive "$X of" phrasing is not a payoff claim', () => {
  const CREDIT_ONE = { name: 'CreditOne 6610', balance: 1209, minimumPayment: 65 };

  it('allows the live-model partial-paydown wording', () => {
    // Observed in a live-model run: it says how much comes OFF the balance,
    // never that the balance ends at zero, but it was rejected.
    const brief = nextAction({
      body: "Increase its acceleration to eliminate $200 of its $1209 balance faster, reducing utilization below 90%.",
      action: 'Allocate $200 of the $500 acceleration to CreditOne 6610',
      redirectAmount: 200,
    });
    expect(findBriefViolation(brief, 500, 500, [CREDIT_ONE])).toBeNull();
  });

  it.each([
    'That eliminates $1,209.50 of your revolving balance.',
    'This eliminates $200 of its balance.',
  ])('allows other partitive amounts: %s', (phrase) => {
    const brief = nextAction({ body: phrase, redirectAmount: 200 });
    expect(findBriefViolation(brief, 500, 500, [CREDIT_ONE])).toBeNull();
  });

  it.each([
    // No amount at all — the classic whole-balance claim.
    'Paying $565 this month eliminates CreditOne 6610 by month-end.',
    // An amount, but no partitive "of" — this claims the balance itself goes.
    'This eliminates the $1,209 CreditOne 6610 balance by month-end.',
    // "of" without a dollar amount is not the partitive shape.
    'This eliminates all of the CreditOne 6610 balance this month.',
  ])('still rejects unverifiable whole-balance claims: %s', (phrase) => {
    const brief = nextAction({ body: phrase, redirectAmount: 500 });
    expect(findBriefViolation(brief, 500, 500, [CREDIT_ONE])).toBe('unverified_elimination_claim');
  });

  it('does not let the exemption launder a second, whole-balance claim in the same block', () => {
    const brief = nextAction({
      body: 'This eliminates $200 of the balance now and wipes out CreditOne 6610 by Friday.',
      redirectAmount: 200,
    });
    expect(findBriefViolation(brief, 500, 500, [CREDIT_ONE])).toBe('unverified_elimination_claim');
  });
});

describe('unsafe-minimum text law — suppression verbs are scoped to a payment context', () => {
  const CREDIT_ONE = { name: 'CreditOne 6610', balance: 1209, minimumPayment: 65 };
  const DELTA_AMEX = { name: 'Delta Amex', balance: 10169, minimumPayment: 250 };

  it('allows the 2026-09-02 production brief that was wrongly rejected', () => {
    // Reproduced against the live model with the real system prompt: a
    // reconnect_bank action (redirectAmount 0, targetExtra null, ceiling $200,
    // cash flow $760.52) whose only trigger was a descriptive "missing".
    const brief = {
      verdict: {
        status: 'at_risk' as const,
        headline: 'Stale CreditOne data blocks clarity.',
        summary:
          'CreditOne Plaid sync is stale (7+ days); balances may be outdated. Actual Aug paydown of $580 tracks the plan, but missing September logging creates visibility risk.',
      },
      nextAction: {
        title: 'Reconnect CreditOne Bank Plaid link.',
        body: 'CreditOne 6610 requires reauth. Reconnect now to confirm current balance and ensure September payments posted correctly.',
        action: 'Log into Plaid settings and reauthorize Credit One Bank.',
        impact: 'high' as const,
        kind: 'reconnect_bank' as const,
        targetExtra: null,
        outcome: null,
        redirectAmount: 0,
        payoffClaims: [],
      },
    };
    expect(findBriefViolation(brief, 200, 760.52, [CREDIT_ONE, DELTA_AMEX])).toBeNull();
  });

  it.each([
    'Reconnect Credit One Bank without delay so balances stay current.',
    'Hold off on changing the plan until the linked balances refresh.',
    'Skip the coffee runs and redirect that $60 to your focus debt.',
    'Never miss your minimum payment; the extra goes on top of it.',
    'Set up autopay so you avoid missing a payment.',
  ])('allows benign copy that only happens to contain a suppression verb: %s', (phrase) => {
    const brief = nextAction({ kind: 'reconnect_bank', body: phrase, redirectAmount: 0 });
    expect(findBriefViolation(brief, 200, 760, [CREDIT_ONE, DELTA_AMEX])).toBeNull();
  });

  it.each([
    'Skip paying Discover this cycle.',
    'Delay the Chase minimum by a week.',
    'Defer this bill until next month to free up cash.',
    "Don't skip the Amex minimum, skip the Chase minimum instead.",
    'Pause the CreditOne payment until cash flow improves.',
  ])('still rejects suppression aimed at a payment: %s', (phrase) => {
    const brief = nextAction({ body: phrase, redirectAmount: 0 });
    expect(findBriefViolation(brief, 500, 500, [CREDIT_ONE, DELTA_AMEX])).toBe('unsafe_minimum_text');
  });

  it.each([
    'Pause CreditOne 6610 until cash flow improves.',
    'Skip CreditOne 6610 this month and send its $65 to Delta Amex.',
  ])('uses an active debt name as payment context when no payment word appears: %s', (phrase) => {
    const brief = nextAction({ body: phrase, redirectAmount: 0 });
    expect(findBriefViolation(brief, 500, 500, [CREDIT_ONE, DELTA_AMEX])).toBe('unsafe_minimum_text');
    // Documents the dependency: with no debt list there is no context to
    // anchor on. Both callers (POST and parseLawfulStoredBrief) pass one.
    expect(findBriefViolation(brief, 500, 500, [])).toBeNull();
  });

  it('escapes regex metacharacters in debt names', () => {
    const weird = { name: 'Loan (Mom+Dad) [0%]', balance: 900, minimumPayment: 50 };
    const brief = nextAction({ body: 'Skip Loan (Mom+Dad) [0%] this month.', redirectAmount: 0 });
    expect(findBriefViolation(brief, 500, 500, [weird])).toBe('unsafe_minimum_text');
  });

  it('keeps rejecting the always-unsafe verbs with no payment context at all', () => {
    for (const phrase of ['Stop paying CreditOne this month.', 'Withhold it until next month.']) {
      expect(findBriefViolation(nextAction({ body: phrase }), 500, 500)).toBe('unsafe_minimum_text');
    }
  });

  it('does not read "payments cleared" (bank-sync phrasing) as a payoff claim', () => {
    // Same live-model reproduction: "confirm September payments cleared" is
    // about transactions posting, not a balance reaching zero.
    const brief = nextAction({
      kind: 'reconnect_bank',
      body: 'Reauth the Credit One Bank connection to sync balances and confirm September payments cleared.',
      redirectAmount: 0,
    });
    expect(findBriefViolation(brief, 200, 760, [CREDIT_ONE, DELTA_AMEX])).toBeNull();
  });

  it('still catches "clears <debt>" as an elimination claim', () => {
    const brief = nextAction({
      body: 'Paying $565 clears CreditOne 6610 by month-end.',
      redirectAmount: 500,
    });
    expect(findBriefViolation(brief, 500, 500, [CREDIT_ONE])).toBe('unverified_elimination_claim');
  });
});

describe('unsafe-minimum law — "miss" needs the payment as its object', () => {
  const CREDIT_ONE = { name: 'CreditOne 6610', balance: 1209, minimumPayment: 65 };
  const DELTA_AMEX = { name: 'Delta Amex', balance: 10169, minimumPayment: 250 };

  it.each([
    // All verbatim from live-model runs. The payment word is part of a
    // compound noun about bookkeeping, not the thing being skipped.
    'Sep payment logging is missing.',
    'Missing payment documentation and high utilization signal urgency.',
    'Without current balance data, you risk missing payment changes.',
    'September shows 0/3 logged, so payment history is missing.',
    // Determiner present, but the payment word modifies a record noun.
    'Stale data for 7+ days risks missing a payment signal on your focus debt.',
    'Reconnect so you are not missing the payment confirmation.',
    'Stale sync risks missing a minimum payment alert.',
  ])('allows bookkeeping copy that merely contains "missing": %s', (phrase) => {
    const brief = nextAction({ kind: 'reconnect_bank', body: phrase, redirectAmount: 0 });
    expect(findBriefViolation(brief, 200, 760, [CREDIT_ONE, DELTA_AMEX])).toBeNull();
  });

  it.each([
    'Missing one minimum payment frees up cash.',
    'Miss a payment on Discover to fund the extra.',
    'Missing your CreditOne minimum this month frees $65.',
    'Miss payments on the smallest card while cash is tight.',
  ])('still rejects advice to miss an actual payment: %s', (phrase) => {
    const brief = nextAction({ body: phrase, redirectAmount: 0 });
    expect(findBriefViolation(brief, 500, 500, [CREDIT_ONE, DELTA_AMEX])).toBe('unsafe_minimum_text');
  });

  it.each([
    // Verbatim, and rejected before this change. Naming the harm is warning
    // AGAINST missing a payment, which is what the law wants users told.
    'Missing payments on high-utilization cards will spike APR and damage credit score.',
    'Missing a payment triggers late fees and a penalty APR.',
    'Stale data could mask a missed payment or create reconciliation delay.',
    // Verbatim: a count of payments absent from the log. A determiner or
    // number in front makes "missing" an adjective, not a directive.
    "This eliminates manual logging gaps (like September's 2 missing payments) and flags issues early.",
    "Reconnecting removes logging gaps like September's missing 2 payments.",
    'Reconnect to recover the missing payments from September.',
    'Reconnect to recover your missing payments from September.',
    // Verbatim: a warning about failing to NOTICE a payment that was missed.
    'Stale data risks missing a genuine missed payment or misalignment.',
    'Autopay prevents missing a minimum payment while balances sync.',
    // Verbatim: an instruction to write down the ones already absent.
    'Check bank and card statements; log missing payments.',
    'Review statements and record missing payments for September.',
    // Verbatim: what is delayed is the logging, not the payment.
    "Stale data may delay accurate payment logging for this month's $65 minimum.",
    'Reauth gaps can pause payment tracking until you reconnect.',
  ])('allows a warning about the consequences of missing a payment: %s', (phrase) => {
    const brief = nextAction({ kind: 'reconnect_bank', body: phrase, redirectAmount: 0 });
    expect(findBriefViolation(brief, 200, 760, [CREDIT_ONE, DELTA_AMEX])).toBeNull();
  });

  it('still rejects the passive form, where the payment really is what is paused', () => {
    const brief = nextAction({ body: 'The CreditOne minimum can be paused for one cycle.' });
    expect(findBriefViolation(brief, 500, 500, [CREDIT_ONE])).toBe('unsafe_minimum_text');
  });

  it('keeps the negation exemption working', () => {
    for (const phrase of [
      'Never miss a minimum payment; the extra goes on top.',
      'Set up autopay so you avoid missing a payment.',
    ]) {
      expect(findBriefViolation(nextAction({ body: phrase }), 500, 500, [CREDIT_ONE])).toBeNull();
    }
  });
});

describe('elimination law — a deadline written as a month name', () => {
  const CREDIT_ONE = { name: 'CreditOne 6610', balance: 1209, minimumPayment: 65 };

  const monthName = (offset: number) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + offset);
    return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  };

  it('reads a far month as the runway it is', () => {
    // Verbatim shape from a live sweep: "eliminates this card by January 2027"
    // at $565/mo against $1,209. Unparsed, it fell back to one month and was
    // rejected. Computed from the current date so the test does not rot.
    const brief = nextAction({
      body: `Applying the entire $500 monthly extra here eliminates this card by ${monthName(5)}.`,
      redirectAmount: 500,
    });
    expect(findBriefViolation(brief, 500, 900, [CREDIT_ONE])).toBeNull();
  });

  it('still rejects a near month the money cannot reach', () => {
    // Next month is two payments of $565 against a $10,169 balance.
    const DELTA_AMEX = { name: 'Delta Amex', balance: 10169, minimumPayment: 250 };
    const brief = nextAction({
      body: `This eliminates Delta Amex by ${monthName(1)}.`,
      redirectAmount: 500,
    });
    expect(findBriefViolation(brief, 500, 900, [DELTA_AMEX])).toBe('unverified_elimination_claim');
  });

  it('treats the current month as a same-month claim', () => {
    const brief = nextAction({
      body: `This eliminates CreditOne 6610 by ${monthName(0)}.`,
      redirectAmount: 500,
    });
    expect(findBriefViolation(brief, 500, 900, [CREDIT_ONE])).toBe('unverified_elimination_claim');
  });
});

describe('both laws — Codex round-four holes', () => {
  const STORE_CARD = { name: 'Store Card', balance: 900, minimumPayment: 100, isFocus: false };
  const FOCUS_DEBT = { name: 'Delta Amex', balance: 5000, minimumPayment: 250, isFocus: true };
  const CREDIT_ONE = { name: 'CreditOne 6610', balance: 1209, minimumPayment: 65 };

  it("credits the plan's acceleration only to the debt it flows to", () => {
    // The engine sends the extra to one target. Crediting $1,000 to every debt
    // accepted a payoff claim about a card that receives only its $100
    // minimum.
    const brief = nextAction({ body: 'Pay off Store Card this month.', redirectAmount: 0 });
    expect(findBriefViolation(brief, 1000, 1200, [STORE_CARD, FOCUS_DEBT])).toBe(
      'unverified_elimination_claim',
    );
  });

  it('still credits it to the focus debt', () => {
    const brief = nextAction({ body: 'Pay off Delta Amex this month.', redirectAmount: 0 });
    expect(findBriefViolation(brief, 5000, 5200, [STORE_CARD, FOCUS_DEBT])).toBeNull();
  });

  it('still credits money the action proposes moving to another debt', () => {
    const brief = nextAction({ body: 'Redirect $800 to Store Card, clearing it this month.', redirectAmount: 800 });
    expect(findBriefViolation(brief, 1000, 1200, [STORE_CARD, FOCUS_DEBT])).toBeNull();
  });

  it('keeps the whole-plan reading for briefs cached before isFocus existed', () => {
    // No debt marked: purging every old cache would be worse than the gap it
    // closes, so those keep the previous behaviour.
    const legacy = [
      { name: 'Store Card', balance: 900, minimumPayment: 100 },
      { name: 'Delta Amex', balance: 5000, minimumPayment: 250 },
    ];
    const brief = nextAction({ body: 'Pay off Store Card this month.', redirectAmount: 0 });
    expect(findBriefViolation(brief, 1000, 1200, legacy)).toBeNull();
  });

  it('does not take a stated runway from another predicate', () => {
    const brief = nextAction({
      body: 'Pay off Store Card and rebuild savings over 12 months.',
      redirectAmount: 0,
    });
    expect(findBriefViolation(brief, 0, 1200, [STORE_CARD, FOCUS_DEBT])).toBe(
      'unverified_elimination_claim',
    );
  });

  it('still takes a runway that belongs to the payoff', () => {
    const brief = nextAction({
      body: 'Paying $565/mo clears CreditOne 6610 over 3 months.',
      redirectAmount: 500,
    });
    expect(findBriefViolation(brief, 500, 900, [CREDIT_ONE])).toBeNull();
  });

  it('catches a pronoun directive whose payment context is earlier in the SAME sentence', () => {
    const brief = nextAction({
      body: 'For the Store Card payment, delay it until next month.',
      redirectAmount: 0,
    });
    expect(findBriefViolation(brief, 0, 1200, [STORE_CARD])).toBe('unsafe_minimum_text');
  });

  it('does not excuse an imperative because the sentence mentions a penalty', () => {
    // The warning exemption belongs to the gerund only: "Missing payments will
    // spike APR" describes a consequence, this one advises causing it.
    const brief = nextAction({
      body: 'Miss a payment if paying it risks an overdraft penalty.',
      redirectAmount: 0,
    });
    expect(findBriefViolation(brief, 0, 1200, [STORE_CARD])).toBe('unsafe_minimum_text');
  });

  it('still exempts a genuine gerund warning', () => {
    for (const phrase of [
      'Missing payments will spike APR and damage credit score.',
      'Missing a payment triggers late fees and a penalty APR.',
    ]) {
      expect(findBriefViolation(nextAction({ body: phrase }), 0, 1200, [STORE_CARD])).toBeNull();
    }
  });

  it('does not let cost framing across a semicolon cancel a directive', () => {
    const brief = nextAction({
      body: 'Pay off Delta Amex by Friday; this requires $5,000.',
      redirectAmount: 100,
    });
    expect(findBriefViolation(brief, 100, 1200, [FOCUS_DEBT])).toBe('unverified_elimination_claim');
  });

  it('still exempts cost framing inside one clause', () => {
    const brief = nextAction({
      body: 'Paying it off entirely this month costs $1209 total; your $565 falls short.',
      redirectAmount: 500,
    });
    expect(findBriefViolation(brief, 500, 900, [CREDIT_ONE])).toBeNull();
  });
});

describe('elimination law — Codex round-three holes', () => {
  const CHASE = { name: 'Chase', balance: 300, minimumPayment: 35 };
  const CHASE_SAPPHIRE = { name: 'Chase Sapphire', balance: 8000, minimumPayment: 160 };
  const DELTA_AMEX = { name: 'Delta Amex', balance: 10169, minimumPayment: 250 };
  const CREDIT_ONE = { name: 'CreditOne 6610', balance: 1209, minimumPayment: 65 };

  it('matches the longest debt name regardless of the list order', () => {
    // Regex alternation is first-match-wins. With "Chase" ahead of "Chase
    // Sapphire" the claim matched only "clears Chase", and the $300 balance
    // then vouched for an impossible payoff of the $8,000 card. The debt list
    // comes from the DB in arbitrary order, so both orders must behave alike.
    const brief = nextAction({ body: 'This clears Chase Sapphire by month-end.', redirectAmount: 500 });
    expect(findBriefViolation(brief, 500, 900, [CHASE, CHASE_SAPPHIRE])).toBe(
      'unverified_elimination_claim',
    );
    expect(findBriefViolation(brief, 500, 900, [CHASE_SAPPHIRE, CHASE])).toBe(
      'unverified_elimination_claim',
    );
  });

  it('still credits the shorter name when the claim is about it', () => {
    const brief = nextAction({ body: 'Send $335 to Chase to eliminate it.', redirectAmount: 300 });
    expect(findBriefViolation(brief, 300, 900, [CHASE, CHASE_SAPPHIRE])).toBeNull();
  });

  it('does not take a rate comparative that modifies a different predicate', () => {
    // "faster" is about building savings. Taking it returns "no date to
    // check", which skips the arithmetic entirely.
    const brief = nextAction({ body: 'Pay off Delta Amex and build savings faster.', redirectAmount: 500 });
    expect(findBriefViolation(brief, 500, 900, [DELTA_AMEX])).toBe('unverified_elimination_claim');
  });

  it('still takes a comparative that modifies the payoff itself', () => {
    const brief = nextAction({
      body: 'Redirect the acceleration to clear the $1209 balance fastest.',
      redirectAmount: 500,
    });
    expect(findBriefViolation(brief, 500, 900, [CREDIT_ONE])).toBeNull();
  });

  it('does not let "before" as a time clause cancel a payoff claim', () => {
    // The ordering exemption is for snowball-order talk. Here "before Delta
    // Amex is due" is timing, and swallowing the claim meant its explicit
    // Friday deadline never reached the arithmetic.
    const brief = nextAction({
      body: 'Pay it off by Friday before Delta Amex is due.',
      redirectAmount: 500,
    });
    expect(findBriefViolation(brief, 500, 900, [DELTA_AMEX, CREDIT_ONE])).toBe(
      'unverified_elimination_claim',
    );
  });

  it('still exempts a genuine ordering comparison between two named debts', () => {
    const brief = nextAction({
      body: 'Pay off CreditOne 6610 before Delta Amex to save interest.',
      redirectAmount: 500,
    });
    expect(findBriefViolation(brief, 500, 900, [DELTA_AMEX, CREDIT_ONE])).toBeNull();
  });
});

describe('unsafe-minimum law — a pronoun directive after a named payment', () => {
  const STORE_CARD = { name: 'Store Card', balance: 410, minimumPayment: 35 };
  const CREDIT_ONE = { name: 'CreditOne 6610', balance: 1209, minimumPayment: 65 };

  it.each([
    // Codex, PR #91: both context branches are sentence-bounded, so a
    // directive naming its target only by pronoun in the NEXT sentence went
    // out unchecked.
    'The Store Card minimum is due. Delay it until next month.',
    'The Store Card minimum is due. Pause it this cycle.',
    'Your $65 minimum posts Friday. Hold off on it until payday.',
    'The CreditOne 6610 payment is due. Skip it while cash is tight.',
  ])('rejects suppression whose object is a pronoun: %s', (phrase) => {
    const brief = nextAction({ body: phrase, redirectAmount: 0 });
    expect(findBriefViolation(brief, 500, 900, [STORE_CARD, CREDIT_ONE])).toBe(
      'unsafe_minimum_text',
    );
  });

  it.each([
    // The record-compound guard still applies across the break, so a
    // bookkeeping noun phrase does not become a payment directive.
    'Payment logging is stale. Skip it if you already logged.',
    'Payment history is missing. Skip it and reconnect instead.',
  ])('still allows a pronoun directive about a record: %s', (phrase) => {
    const brief = nextAction({ kind: 'reconnect_bank', body: phrase, redirectAmount: 0 });
    expect(findBriefViolation(brief, 200, 760, [STORE_CARD, CREDIT_ONE])).toBeNull();
  });

  it('does not reach back more than one sentence', () => {
    // The reach is deliberately one break: an unrelated later sentence must
    // not be bound to a payment named paragraphs earlier.
    const brief = nextAction({
      kind: 'reconnect_bank',
      body: 'The Store Card minimum is due. Balances synced fine. Skip it if you prefer the app.',
      redirectAmount: 0,
    });
    expect(findBriefViolation(brief, 200, 760, [STORE_CARD])).toBeNull();
  });
});

describe('both laws — typographic apostrophes are folded before matching', () => {
  const CREDIT_ONE = { name: 'CreditOne 6610', balance: 1209, minimumPayment: 65 };

  it('catches unsafe advice written with a curly apostrophe', () => {
    // CodeRabbit flagged the false-positive direction on PR #91; the same gap
    // ran the other way and mattered more. Every apostrophe in these patterns
    // is ASCII, so U+2019 let "don't pay" bypass the law outright.
    const curly = nextAction({ body: 'Reconnect, and don’t pay the CreditOne minimum this month.' });
    expect(findBriefViolation(curly, 500, 500, [CREDIT_ONE])).toBe('unsafe_minimum_text');

    const straight = nextAction({ body: "Reconnect, and don't pay the CreditOne minimum this month." });
    expect(findBriefViolation(straight, 500, 500, [CREDIT_ONE])).toBe('unsafe_minimum_text');
  });

  it('keeps the attributive guard working with a curly apostrophe', () => {
    const curly = nextAction({
      kind: 'reconnect_bank',
      body: 'Reconnecting removes logging gaps like September’s missing 2 payments.',
      redirectAmount: 0,
    });
    expect(findBriefViolation(curly, 200, 760, [CREDIT_ONE])).toBeNull();
  });

  it('matches a debt name whose apostrophe style differs from the text', () => {
    const momsLoan = { name: 'Mom’s Loan', balance: 4000, minimumPayment: 50 };
    const brief = nextAction({
      body: "Paying $565 clears Mom's Loan by month-end.",
      redirectAmount: 500,
    });
    expect(findBriefViolation(brief, 500, 500, [momsLoan])).toBe('unverified_elimination_claim');
  });
});

describe('unsafe-minimum law — "reduce" must govern the minimum itself', () => {
  const CREDIT_ONE = { name: 'CreditOne 6610', balance: 1209, minimumPayment: 65 };

  it.each([
    // Verbatim: in both, the thing reduced is plainly not the minimum.
    'Redirect $350 here, freeing $65 minimum and reducing utilization.',
    'Add $200/mo extra to its $65 minimum to cut utilization faster and reduce total interest paid.',
    'Paying the minimum on Delta Amex while reducing utilization on CreditOne.',
  ])('allows copy that reduces something other than the minimum: %s', (phrase) => {
    const brief = nextAction({ body: phrase, redirectAmount: 200 });
    expect(findBriefViolation(brief, 500, 500, [CREDIT_ONE])).toBeNull();
  });

  it.each([
    'Reduce your CreditOne minimum to $40 this month.',
    'Lower the Discover minimum payment while cash is tight.',
    'Call CreditOne and ask them to reduce the minimum.',
    'Your CreditOne minimum can be reduced to $40 by calling.',
  ])('still rejects cutting the minimum itself: %s', (phrase) => {
    const brief = nextAction({ body: phrase, redirectAmount: 0 });
    expect(findBriefViolation(brief, 500, 500, [CREDIT_ONE])).toBe('unsafe_minimum_text');
  });

  it('still allows the benign "lower"/"reduce" copy the earlier fix protected', () => {
    for (const phrase of [
      'This lowers your total interest paid by $85 over the plan.',
      'Call the issuer and ask them to lower your APR on this card.',
      'Reducing the balance faster saves interest over the life of the plan.',
    ]) {
      expect(findBriefViolation(nextAction({ body: phrase }), 500, 500, [CREDIT_ONE])).toBeNull();
    }
  });
});

describe('elimination law — "eliminate" must point at something payoff-shaped', () => {
  const CREDIT_ONE = { name: 'CreditOne 6610', balance: 1209, minimumPayment: 65 };
  const DELTA_AMEX = { name: 'Delta Amex', balance: 10169, minimumPayment: 250 };

  it.each([
    // All verbatim from a live sweep of the negative-buffer scenario, where
    // the model sells the benefit of linking a bank. None is about a balance.
    'Reconnecting will auto-log payments, eliminate manual entry errors, and flag any missed payments in real time.',
    'Link your bank to Plaid to auto-log payments and eliminate manual entry gaps.',
    "This eliminates gaps like September's missing records and flags late fees instantly.",
    'Automating this eliminates the guesswork in tracking your progress.',
  ])('allows "eliminate" used about anything but a balance: %s', (phrase) => {
    const brief = nextAction({ kind: 'reconnect_bank', body: phrase, redirectAmount: 0 });
    expect(findBriefViolation(brief, 200, 760, [CREDIT_ONE, DELTA_AMEX])).toBeNull();
  });

  it.each([
    // The reported incident's own wording is the first of these.
    'Paying $565 total ($65 minimum + $500 extra) this month eliminates it by month-end.',
    'This eliminates CreditOne 6610 by month-end.',
    'This eliminates the $1,209 balance by month-end.',
    'This eliminates the card by month-end.',
    'With this payment CreditOne 6610 is eliminated by month-end.',
  ])('still rejects an unaffordable payoff claim: %s', (phrase) => {
    const brief = nextAction({ body: phrase, redirectAmount: 500 });
    expect(findBriefViolation(brief, 500, 500, [CREDIT_ONE, DELTA_AMEX])).toBe(
      'unverified_elimination_claim',
    );
  });

  it('leaves the unscoped payoff verbs matching bare', () => {
    // No false positive has been observed for these, so they were left alone
    // rather than scoped for symmetry.
    for (const phrase of [
      'One payment wipes out the smallest balance.',
      'This zeroes out your smallest card.',
      'That knocks out the smallest balance this month.',
    ]) {
      expect(findBriefViolation(nextAction({ body: phrase, redirectAmount: 500 }), 500, 500, [
        CREDIT_ONE,
      ])).toBe('unverified_elimination_claim');
    }
  });
});

describe('elimination law — counterfactual cost framing is not a payoff claim', () => {
  const CREDIT_ONE = { name: 'CreditOne 6610', balance: 1209, minimumPayment: 65 };

  it('allows the live-model statement that a payoff is NOT affordable', () => {
    // Verbatim, and rejected before this change even though it spells out
    // that the money falls short — the opposite of a hallucinated claim.
    const brief = nextAction({
      body: 'Paying it off entirely this month costs $1209 total; your minimum ($65) plus $500 extra ($565) reaches $630.',
      redirectAmount: 500,
    });
    expect(findBriefViolation(brief, 500, 900, [CREDIT_ONE])).toBeNull();
  });

  it.each([
    'Clearing the $1209 balance this month would require $1,209 in one go.',
    'Eliminating CreditOne 6610 outright needs $1,209, which the plan does not have.',
  ])('allows other cost framing: %s', (phrase) => {
    const brief = nextAction({ body: phrase, redirectAmount: 500 });
    expect(findBriefViolation(brief, 500, 900, [CREDIT_ONE])).toBeNull();
  });

  it('still checks a runway, which cost framing must not be confused with', () => {
    // "takes 3 months" is a claim with a horizon, not a cost: $565 x 3 covers
    // $1,209, so it passes on the arithmetic rather than by exemption.
    const affordable = nextAction({
      body: 'Paying it off takes 3 months at $565/mo.',
      redirectAmount: 500,
    });
    expect(findBriefViolation(affordable, 500, 900, [CREDIT_ONE])).toBeNull();

    const notAffordable = nextAction({
      body: 'Paying it off takes 1 month at $565/mo.',
      redirectAmount: 500,
    });
    expect(findBriefViolation(notAffordable, 500, 900, [CREDIT_ONE])).toBe(
      'unverified_elimination_claim',
    );
  });
});

describe('elimination law — payoff ORDER is not a payoff claim', () => {
  const CREDIT_ONE = { name: 'CreditOne 6610', balance: 1209, minimumPayment: 65 };
  const DELTA_AMEX = { name: 'Delta Amex', balance: 10169, minimumPayment: 250 };

  it('allows the live-model snowball-order statement', () => {
    // Verbatim, and rejected before this change. It compares orderings; it
    // never says a balance reaches zero.
    const brief = nextAction({
      kind: 'keep_course',
      body: 'Paying it off first (current snowball focus) saves $330+ in interest vs paying Delta Amex first.',
      redirectAmount: 0,
    });
    expect(findBriefViolation(brief, 500, 900, [CREDIT_ONE, DELTA_AMEX])).toBeNull();
  });

  it.each([
    'Pay off CreditOne 6610 before Delta Amex to save interest.',
    'Paying the smallest off next keeps momentum.',
  ])('allows other ordering language: %s', (phrase) => {
    const brief = nextAction({ kind: 'keep_course', body: phrase, redirectAmount: 0 });
    expect(findBriefViolation(brief, 500, 900, [CREDIT_ONE, DELTA_AMEX])).toBeNull();
  });

  it.each([
    'That pays off your smallest card by the end of the month.',
    'This payment pays CreditOne 6610 off this month.',
    'Delta Amex is paid off by month-end with this plan.',
  ])('still rejects an unaffordable completion claim: %s', (phrase) => {
    const brief = nextAction({ body: phrase, redirectAmount: 500 });
    expect(findBriefViolation(brief, 500, 500, [CREDIT_ONE, DELTA_AMEX])).toBe(
      'unverified_elimination_claim',
    );
  });
});

describe('findBriefViolation — reason codes for diagnosable logging', () => {
  it('returns null for a lawful brief', () => {
    const brief = nextAction({ redirectAmount: 500 });
    expect(findBriefViolation(brief, 500, 500)).toBeNull();
  });

  it('names the unsafe-minimum-text law', () => {
    const brief = nextAction({ body: 'Hold off on the CapitalOne minimum this month', redirectAmount: 0 });
    expect(findBriefViolation(brief, 500, 500)).toBe('unsafe_minimum_text');
  });

  it('names the ceiling-breach law', () => {
    const brief = nextAction({
      title: 'Send everything to Delta Amex',
      body: 'Send $565 total to Delta Amex this month.',
      action: 'Send $565 to Delta Amex',
      redirectAmount: 565,
    });
    expect(findBriefViolation(brief, 500, 500)).toBe('redirect_exceeds_ceiling');
  });

  it('names the set_acceleration-null law — the path the old single log message never surfaced', () => {
    // Zod permits set_acceleration with targetExtra null (the incident shape:
    // redirectAmount 0, targetExtra null); only this check rejects it.
    const brief = nextAction({ kind: 'set_acceleration', targetExtra: null, outcome: null });
    expect(findBriefViolation(brief, 500, 2436.95)).toBe('set_acceleration_target_invalid');
  });

  it('names the unverified-elimination law', () => {
    const creditOne = { name: 'CreditOne 6610', balance: 1209, minimumPayment: 65 };
    const brief = nextAction({
      body: 'Paying $565 total this month eliminates CreditOne 6610 by month-end.',
      action: 'Pay $565 to CreditOne 6610',
      redirectAmount: 500,
    });
    expect(findBriefViolation(brief, 500, 500, [creditOne])).toBe('unverified_elimination_claim');
  });

  it('reports the text law first when multiple laws are broken (matches check order)', () => {
    const brief = nextAction({
      title: 'Skip the CreditOne minimum',
      body: 'Skip the CreditOne minimum and send $565 to Delta Amex.',
      action: 'Skip CreditOne; pay $565 to Delta Amex',
      redirectAmount: 565,
    });
    expect(findBriefViolation(brief, 500, 500)).toBe('unsafe_minimum_text');
  });
});

describe('isBriefLawful — verdict text is scanned by the laws too', () => {
  const CREDIT_ONE = { name: 'CreditOne 6610', balance: 1209, minimumPayment: 65 };

  function withVerdict(overrides: Partial<CoachBrief['verdict']>, redirectAmount = 0): CoachBrief {
    const base = nextAction({ redirectAmount });
    return { ...base, verdict: { ...base.verdict, ...overrides } };
  }

  it('rejects unsafe-minimum advice hidden in verdict.summary', () => {
    // The adversarial-review gap: verdict.headline/summary are model free text
    // shown to the user, but the laws only scanned nextAction before this.
    const brief = withVerdict({
      summary: 'Skip the Chase minimum this month to rebuild your cash buffer.',
    });
    expect(findBriefViolation(brief, 500, 500)).toBe('unsafe_minimum_text');
    expect(isBriefLawful(brief, 500, 500)).toBe(false);
  });

  it('rejects unsafe-minimum advice in verdict.headline', () => {
    const brief = withVerdict({ headline: 'Hold off on the Amex minimum' });
    expect(findBriefViolation(brief, 500, 500)).toBe('unsafe_minimum_text');
  });

  it('rejects an elimination claim in verdict.summary the math cannot support', () => {
    const brief = withVerdict(
      { summary: 'Paying $565 total eliminates CreditOne 6610 by month-end.' },
      500,
    );
    expect(findBriefViolation(brief, 500, 500, [CREDIT_ONE])).toBe('unverified_elimination_claim');
  });

  it('allows a verdict elimination claim the payment actually covers', () => {
    const brief = withVerdict(
      { summary: 'Paying $565 total eliminates CreditOne 6610 by month-end.' },
      500,
    );
    expect(isBriefLawful(brief, 500, 500, [{ ...CREDIT_ONE, balance: 550 }])).toBe(true);
  });

  it('allows benign descriptive verdict text with real numbers', () => {
    const brief = withVerdict({
      headline: 'Debt payments are a third of income',
      summary: 'Total debt is $11,378 with payments at 32% of take-home pay, and last month you missed one payment.',
    });
    expect(findBriefViolation(brief, 500, 500, [CREDIT_ONE])).toBeNull();
  });

  it('does not let a benign verdict mention of a small debt vouch for an impossible nextAction claim (CodeRabbit-flagged)', () => {
    // Attribution is per block: the verdict names the coverable CreditOne
    // (descriptively), but the nextAction's payoff claim is about the $10k
    // Delta Amex — concatenated attribution would let CreditOne's small
    // balance validate the impossible claim.
    const DELTA_AMEX = { name: 'Delta Amex', balance: 10169, minimumPayment: 250 };
    const smallCreditOne = { ...CREDIT_ONE, balance: 400 };
    const base = nextAction({
      title: 'Go all-in on Delta Amex',
      body: 'Paying $750 total this month eliminates Delta Amex.',
      action: 'Pay $750 to Delta Amex',
      redirectAmount: 500,
    });
    const brief = {
      ...base,
      verdict: {
        ...base.verdict,
        summary: 'CreditOne 6610 is nearly done at $400, and cash flow has buffer.',
      },
    };
    expect(findBriefViolation(brief, 500, 500, [smallCreditOne, DELTA_AMEX])).toBe(
      'unverified_elimination_claim',
    );
  });

  it('does not let a benign nextAction mention vouch for an impossible verdict claim', () => {
    const DELTA_AMEX = { name: 'Delta Amex', balance: 10169, minimumPayment: 250 };
    const smallCreditOne = { ...CREDIT_ONE, balance: 400 };
    const base = nextAction({
      body: 'Keep sending the $500 acceleration to CreditOne 6610 this month.',
      redirectAmount: 500,
    });
    const brief = {
      ...base,
      verdict: { ...base.verdict, summary: 'This month wipes out Delta Amex entirely.' },
    };
    expect(findBriefViolation(brief, 500, 500, [smallCreditOne, DELTA_AMEX])).toBe(
      'unverified_elimination_claim',
    );
  });

  it('purges a cached brief whose verdict carries an unverifiable elimination claim', () => {
    const stored: StoredCoachBrief = {
      ...withVerdict(
        { summary: 'This wipes out CreditOne 6610 by Friday.' },
        500,
      ),
      _meta: { effectiveAcceleration: 500, availableCashFlow: 500, debts: [CREDIT_ONE] },
    };
    expect(parseLawfulStoredBrief(stored)).toBeNull();
  });
});

describe('normalizeModelBrief — model outcome previews must not sink the response', () => {
  it('rescues the 2026-08-28 production incident: set_acceleration with invented outcome keys', () => {
    // The prompt told the model to "return an outcome object with your
    // preview" without ever defining its keys, so it invented some. That
    // failed CoachBriefSchema with exactly two invalid_type issues at
    // nextAction.outcome.bufferAfter / .monthsSavedVsMin and dumped a valid
    // AI brief into the deterministic fallback.
    const raw = nextAction({
      kind: 'set_acceleration',
      targetExtra: 300,
      outcome: { newPayoffMonths: 41, interestSaved: 1200 } as unknown as CoachBrief['nextAction']['outcome'],
    });

    // Proves the test is meaningful: without normalization this still fails.
    const withoutFix = CoachBriefSchema.safeParse(raw);
    expect(withoutFix.success).toBe(false);
    // Membership, not order — Zod issue ordering is not contractual across versions.
    const failedPaths = withoutFix.success ? [] : withoutFix.error.issues.map((i) => i.path.join('.'));
    expect(failedPaths).toHaveLength(2);
    expect(failedPaths).toEqual(
      expect.arrayContaining(['nextAction.outcome.bufferAfter', 'nextAction.outcome.monthsSavedVsMin']),
    );

    const normalized = CoachBriefSchema.safeParse(normalizeModelBrief(raw));
    expect(normalized.success).toBe(true);
    if (normalized.success) {
      expect(normalized.data.nextAction.outcome).toBeNull();
      expect(normalized.data.nextAction.targetExtra).toBe(300);
    }
  });

  it('nulls a stray outcome on a non-set_acceleration kind instead of rejecting the brief', () => {
    const raw = nextAction({
      kind: 'log_payments',
      targetExtra: null,
      outcome: { bufferAfter: 300, monthsSavedVsMin: 4 },
    });
    expect(CoachBriefSchema.safeParse(raw).success).toBe(false); // superRefine invariant, still intact for cached briefs
    expect(CoachBriefSchema.safeParse(normalizeModelBrief(raw)).success).toBe(true);
  });

  it('still rejects a stray targetExtra on a non-set_acceleration kind after normalization', () => {
    // targetExtra IS used by the server (outcome is recomputed from it), so
    // normalization must not launder it.
    const raw = nextAction({ kind: 'keep_course', targetExtra: 200, outcome: null });
    expect(CoachBriefSchema.safeParse(normalizeModelBrief(raw)).success).toBe(false);
  });

  it('passes through non-object and shapeless values untouched', () => {
    expect(normalizeModelBrief(null)).toBeNull();
    expect(normalizeModelBrief('not json')).toBe('not json');
    expect(normalizeModelBrief({ verdict: {} })).toEqual({ verdict: {} });
    expect(normalizeModelBrief({ nextAction: 'oops' })).toEqual({ nextAction: 'oops' });
  });
});

describe('toClientBrief', () => {
  it('strips server-only _meta before the brief reaches the client', () => {
    const stored: StoredCoachBrief = {
      ...nextAction({ redirectAmount: 500 }),
      _meta: { effectiveAcceleration: 500, availableCashFlow: 500 },
    };
    const client = toClientBrief(stored);
    expect(client).not.toHaveProperty('_meta');
    expect(client.nextAction.redirectAmount).toBe(500);
  });
});

describe('CoachBriefSchema — redirectAmount must be honest, not defaulted', () => {
  it('fails validation when redirectAmount is missing (CodeRabbit/codex-flagged gap)', () => {
    const raw = nextAction({ redirectAmount: 565 });
    const { redirectAmount: _omitted, ...actionWithoutRedirect } = raw.nextAction;
    const malformed = { ...raw, nextAction: actionWithoutRedirect };
    // Previously `.catch(0)` would have silently accepted this as redirectAmount: 0,
    // letting the numeric law be bypassed just by omitting the field.
    expect(CoachBriefSchema.safeParse(malformed).success).toBe(false);
  });

  it('fails validation when redirectAmount is a string instead of a number', () => {
    const raw = nextAction({ redirectAmount: 565 });
    const malformed = { ...raw, nextAction: { ...raw.nextAction, redirectAmount: '565' } };
    expect(CoachBriefSchema.safeParse(malformed).success).toBe(false);
  });

  it('fails validation when redirectAmount is negative', () => {
    const raw = nextAction({ redirectAmount: -10 });
    expect(CoachBriefSchema.safeParse(raw).success).toBe(false);
  });
});

describe('parseLawfulStoredBrief', () => {
  it('returns null (not a defaulted brief) for a stored value missing redirectAmount', () => {
    const raw = nextAction({ redirectAmount: 565 });
    const { redirectAmount: _omitted, ...actionWithoutRedirect } = raw.nextAction;
    const malformed = {
      ...raw,
      nextAction: actionWithoutRedirect,
      _meta: { effectiveAcceleration: 500, availableCashFlow: 500 },
    };
    expect(parseLawfulStoredBrief(malformed)).toBeNull();
  });

  it('returns null for a lawfully-shaped brief whose numeric ceiling was exceeded at generation time', () => {
    const stored: StoredCoachBrief = {
      ...nextAction({ redirectAmount: 565 }),
      _meta: { effectiveAcceleration: 500, availableCashFlow: 500 },
    };
    expect(parseLawfulStoredBrief(stored)).toBeNull();
  });

  it('returns the brief for a valid, lawful stored value', () => {
    const stored: StoredCoachBrief = {
      ...nextAction({ redirectAmount: 500 }),
      _meta: { effectiveAcceleration: 500, availableCashFlow: 500 },
    };
    expect(parseLawfulStoredBrief(stored)).not.toBeNull();
  });

  it('purges a pre-rule cached brief that makes an elimination claim (no debt context stored)', () => {
    // Cached before _meta.debts existed: the claim can't be verified, so the
    // brief must be discarded — this is exactly how the live incident brief
    // ("$565 eliminates a $1,209 balance") gets purged on its next read.
    const stored: StoredCoachBrief = {
      ...nextAction({
        body: 'Paying $565 total this month eliminates CreditOne 6610 by month-end.',
        redirectAmount: 500,
      }),
      _meta: { effectiveAcceleration: 500, availableCashFlow: 500 },
    };
    expect(parseLawfulStoredBrief(stored)).toBeNull();
  });

  it('keeps a cached brief whose elimination claim verifies against stored debts', () => {
    const stored: StoredCoachBrief = {
      ...nextAction({
        body: 'Paying $565 total this month eliminates CreditOne 6610 by month-end.',
        redirectAmount: 500,
      }),
      _meta: {
        effectiveAcceleration: 500,
        availableCashFlow: 500,
        debts: [{ name: 'CreditOne 6610', balance: 550, minimumPayment: 65 }],
      },
    };
    expect(parseLawfulStoredBrief(stored)).not.toBeNull();
  });

  it('treats a NaN effectiveAcceleration as a 0 ceiling rather than disabling the check (CodeRabbit nitpick)', () => {
    // typeof NaN === 'number' is true, so a naive `typeof` guard would have
    // let NaN through as the ceiling — and redirectAmount > NaN is always
    // false, silently letting any redirectAmount pass. Number.isFinite must
    // reject it and fall back to 0, which a positive redirectAmount then fails.
    const stored = {
      ...nextAction({ redirectAmount: 100 }),
      _meta: { effectiveAcceleration: NaN, availableCashFlow: 500 },
    } as unknown as StoredCoachBrief;
    expect(parseLawfulStoredBrief(stored)).toBeNull();
  });

  it('treats a NaN availableCashFlow as a zero targetExtra ceiling', () => {
    const stored = {
      ...nextAction({
        kind: 'set_acceleration',
        targetExtra: 100,
        outcome: { bufferAfter: 0, monthsSavedVsMin: 1 },
      }),
      _meta: { effectiveAcceleration: 500, availableCashFlow: NaN },
    } as unknown as StoredCoachBrief;
    expect(parseLawfulStoredBrief(stored)).toBeNull();
  });
});
describe('declared payoffClaims (structured fields)', () => {
  // The plan sends $500/mo of acceleration, and it all lands on CreditOne —
  // so CreditOne can absorb $565/mo and every other debt only its own minimum.
  const CREDIT_ONE = {
    name: 'CreditOne 6610',
    balance: 1209,
    minimumPayment: 65,
    isFocus: true,
  };
  const DELTA_AMEX = { name: 'Delta Amex', balance: 10169, minimumPayment: 250 };
  const OLD_FEE = { name: 'Old Fee', balance: 40, minimumPayment: 40 };
  const DEBTS = [CREDIT_ONE, DELTA_AMEX];

  it('measures an untimed claim against the DECLARED horizon instead of guessing one month', () => {
    // The prose states no runway at all, so the law defaulted to one month and
    // rejected it: $565 against $1,209. The model knows it means three months
    // and now says so, and $1,695 covers the balance. This is the whole point
    // of the field — the horizon stops being inferred.
    const brief = nextAction({
      title: 'Keep the extra on CreditOne 6610',
      body: 'Directing the full $500 extra at CreditOne 6610 clears that balance.',
      redirectAmount: 0,
      payoffClaims: [{ debtName: 'CreditOne 6610', horizonMonths: 3 }],
    });
    expect(findBriefViolation(brief, 500, 500, DEBTS)).toBeNull();
  });

  it('still rejects that same copy when the model declares nothing', () => {
    // Control for the test above: the loosening comes from the declaration,
    // not from the prose law having been weakened. With no declaration the
    // strict one-month default is exactly what it always was.
    const brief = nextAction({
      title: 'Keep the extra on CreditOne 6610',
      body: 'Directing the full $500 extra at CreditOne 6610 clears that balance.',
      redirectAmount: 0,
      payoffClaims: [],
    });
    expect(findBriefViolation(brief, 500, 500, DEBTS)).toBe('unverified_elimination_claim');
  });

  it('pins an unattributed claim to the declared debt instead of the smallest one that fits', () => {
    // "wipes out the balance by month-end" names no debt, so the law let ANY
    // active debt vouch for it — and a $40 leftover fee covered by its own
    // minimum did. The declaration says the brief is about CreditOne, so that
    // is the debt the claim has to hold for, and $565 does not clear $1,209.
    const brief = nextAction({
      title: 'Keep the extra on CreditOne 6610',
      body: 'Keep the extra where it is. This wipes out the balance by month-end.',
      redirectAmount: 0,
      payoffClaims: [{ debtName: 'CreditOne 6610', horizonMonths: 6 }],
    });
    expect(findBriefViolation(brief, 500, 500, [CREDIT_ONE, DELTA_AMEX, OLD_FEE])).toBe(
      'unverified_elimination_claim',
    );
  });

  it('lets the tiny debt vouch for that same claim when nothing is declared', () => {
    // Control for the test above: without a declaration the unattributed claim
    // keeps its old, looser attribution. This documents the hole the
    // declaration closes rather than asserting the hole is desirable.
    const brief = nextAction({
      title: 'Keep the extra on CreditOne 6610',
      body: 'Keep the extra where it is. This wipes out the balance by month-end.',
      redirectAmount: 0,
      payoffClaims: [],
    });
    expect(findBriefViolation(brief, 500, 500, [CREDIT_ONE, DELTA_AMEX, OLD_FEE])).toBeNull();
  });

  it('rejects an impossible declaration even when no sentence makes a payoff claim', () => {
    // $750/mo for two months is $1,500 against a $10,169 balance. The text is
    // clean, so every text law passes it; the model incriminated itself in the
    // JSON, and that is now checked on its own.
    const brief = nextAction({
      title: 'Send the extra to Delta Amex',
      body: 'Send the $500 extra to Delta Amex on top of its $250 minimum.',
      redirectAmount: 500,
      payoffClaims: [{ debtName: 'Delta Amex', horizonMonths: 2 }],
    });
    expect(findBriefViolation(brief, 500, 500, DEBTS)).toBe('unverified_elimination_claim');
  });

  it('resolves a declared name that carries the context rendering of its category', () => {
    // The user context renders each debt as "Store Card (Credit Card): $410
    // balance, ...", and in a live sweep the model copied that whole prefix
    // into debtName on 25 of 30 briefs. Exact-only matching turned every one
    // of those honest briefs into a rejection.
    const brief = nextAction({
      body: 'Directing the full $500 extra at CreditOne 6610 clears that balance.',
      redirectAmount: 0,
      payoffClaims: [{ debtName: 'CreditOne 6610 (Credit Card)', horizonMonths: 3 }],
    });
    expect(findBriefViolation(brief, 500, 500, DEBTS)).toBeNull();
  });

  it('ignores a declaration naming a debt that is not in the plan', () => {
    // Rejecting an unresolvable name looked principled and measured terribly:
    // a formatting mismatch is far likelier than an invented debt, and an
    // unmatched name harms nobody on its own. It fails soft to the prose law,
    // which here finds no claim in the text.
    const brief = nextAction({
      body: 'Keep the current payoff order this month.',
      redirectAmount: 0,
      payoffClaims: [{ debtName: 'Best Buy Card', horizonMonths: 3 }],
    });
    expect(findBriefViolation(brief, 500, 500, DEBTS)).toBeNull();
  });

  it('still judges the text on its own when the declared name resolves to nothing', () => {
    // Control for failing soft: an unresolvable declaration buys the brief no
    // leniency at all. The prose law runs exactly as it would with null, so
    // the reported incident is still caught.
    const brief = nextAction({
      title: 'Attack CreditOne 6610 now',
      body: 'CreditOne 6610 carries 27.49% APR on $1,209. Paying $565 total ($65 min + $500) this month eliminates it by month-end.',
      redirectAmount: 500,
      payoffClaims: [{ debtName: 'Best Buy Card', horizonMonths: 12 }],
    });
    expect(findBriefViolation(brief, 500, 500, DEBTS)).toBe('unverified_elimination_claim');
  });

  it('matches the declared debt name ignoring case, spacing and apostrophe style', () => {
    const brief = nextAction({
      body: 'Directing the full $500 extra at CreditOne 6610 clears that balance.',
      redirectAmount: 0,
      payoffClaims: [{ debtName: '  creditone   6610 ', horizonMonths: 3 }],
    });
    expect(findBriefViolation(brief, 500, 500, DEBTS)).toBeNull();
  });

  it('lets a stated deadline in the text override a longer declared horizon (the reported incident)', () => {
    // The declaration on its own passes: three months of $565 clears $1,209.
    // But the sentence the user READS promises month-end, and $565 does not
    // cover $1,209 in one month. A declaration is a default for what the prose
    // leaves unsaid, never a licence to contradict it.
    const brief = nextAction({
      title: 'Attack CreditOne 6610 now',
      body: 'CreditOne 6610 carries 27.49% APR on $1,209. Paying $565 total ($65 min + $500) this month eliminates it by month-end.',
      redirectAmount: 500,
      payoffClaims: [{ debtName: 'CreditOne 6610', horizonMonths: 3 }],
    });
    expect(findBriefViolation(brief, 500, 500, DEBTS)).toBe('unverified_elimination_claim');
  });

  it('does not let one declaration vouch for a claim about a different debt', () => {
    // The declared CreditOne payoff is real and affordable. The Delta Amex
    // claim beside it was never declared, so it keeps the strict defaults and
    // is measured on its own: $750 in one month against $10,169.
    const brief = nextAction({
      title: 'Keep the extra on CreditOne 6610',
      body: 'Six months of $565 clears CreditOne 6610. It also wipes out Delta Amex.',
      redirectAmount: 500,
      payoffClaims: [{ debtName: 'CreditOne 6610', horizonMonths: 6 }],
    });
    expect(findBriefViolation(brief, 500, 500, DEBTS)).toBe('unverified_elimination_claim');
  });

  it('allows a declared claim the arithmetic supports, prose and JSON agreeing', () => {
    const brief = nextAction({
      title: 'Finish CreditOne 6610',
      body: 'Keeping $565/mo on CreditOne 6610 clears its $1,209 balance in 3 months.',
      redirectAmount: 0,
      payoffClaims: [{ debtName: 'CreditOne 6610', horizonMonths: 3 }],
    });
    expect(findBriefViolation(brief, 500, 500, DEBTS)).toBeNull();
  });

  it('re-checks a declared claim on a cached brief against the stored debts', () => {
    const stored: StoredCoachBrief = {
      ...nextAction({
        body: 'Send the $500 extra to Delta Amex on top of its $250 minimum.',
        redirectAmount: 500,
        payoffClaims: [{ debtName: 'Delta Amex', horizonMonths: 2 }],
      }),
      _meta: {
        effectiveAcceleration: 500,
        availableCashFlow: 500,
        debts: [CREDIT_ONE, DELTA_AMEX],
      },
    };
    expect(parseLawfulStoredBrief(stored)).toBeNull();
  });

  it('does not let the declared runway carry a SECOND, unattributed claim (Codex, PR #92)', () => {
    // Regression, not just a residual hole: main rejected this text and the
    // first cut of this change accepted it. The declaration describes ONE
    // payoff, so handing its debt AND its six-month runway to whichever claim
    // named no debt let an undeclared payoff ride on the declared one.
    const brief = nextAction({
      title: 'Keep the extra on CreditOne 6610',
      body: 'Six months of $565 clears CreditOne 6610. It also wipes out the next balance.',
      redirectAmount: 0,
      payoffClaims: [{ debtName: 'CreditOne 6610', horizonMonths: 6 }],
    });
    expect(findBriefViolation(brief, 500, 500, DEBTS)).toBe('unverified_elimination_claim');
  });

  it('still covers two claims that both NAME the declared debt', () => {
    // Control for the fix above, and the reason the two cases are not
    // symmetric: a title and body restating one payoff are two claim matches
    // in the same block, but both name the debt, so attribution is certain and
    // only the horizon comes from the declaration. Spending the declaration on
    // the first match would have rejected this ordinary shape.
    const brief = nextAction({
      title: 'Clear CreditOne 6610 with the extra',
      body: 'The $565/mo total clears CreditOne 6610.',
      redirectAmount: 0,
      payoffClaims: [{ debtName: 'CreditOne 6610', horizonMonths: 3 }],
    });
    expect(findBriefViolation(brief, 500, 500, DEBTS)).toBeNull();
  });

  it('counts claims across BOTH blocks before a declaration stands in for an unnamed one (Codex, PR #92)', () => {
    // The multi-claim guard above was per block, so a claim in the verdict and
    // an unattributed claim in the nextAction each looked like the sole claim
    // and both borrowed the declared debt and its six-month runway. main
    // rejected this; the first fix still accepted it.
    const base = nextAction({
      title: 'Keep the extra on CreditOne 6610',
      body: 'It also wipes out the next balance.',
      redirectAmount: 0,
      payoffClaims: [{ debtName: 'CreditOne 6610', horizonMonths: 6 }],
    });
    const brief = {
      ...base,
      verdict: { ...base.verdict, summary: 'Six months of $565 clears CreditOne 6610.' },
    };
    expect(findBriefViolation(brief, 500, 500, DEBTS)).toBe('unverified_elimination_claim');
  });

  it('still covers a verdict and an action restating ONE payoff across blocks', () => {
    // Control for the fix above: counting brief-wide must not break the
    // ordinary shape where the verdict and the action describe the same
    // payoff. Both name the declared debt, so attribution is certain and the
    // count never enters into it.
    const base = nextAction({
      title: 'Keep the extra on CreditOne 6610',
      body: 'The $565/mo total clears CreditOne 6610.',
      redirectAmount: 0,
      payoffClaims: [{ debtName: 'CreditOne 6610', horizonMonths: 3 }],
    });
    const brief = {
      ...base,
      verdict: { ...base.verdict, summary: 'CreditOne 6610 clears with the extra.' },
    };
    expect(findBriefViolation(brief, 500, 500, DEBTS)).toBeNull();
  });

  it('does not let a fractional horizon buy an extra month of payments (Codex, PR #92)', () => {
    // $565/mo against $900: one month is short, two months covers. The
    // horizon is rounded UP, which is right for a runway read out of prose
    // ("in 2.2 months" is gone on the third payment) and wrong for a declared
    // one — 1.1 bought the same pass as an honest 2. Whole months only, so a
    // fractional value falls through .catch(null) to the strict prose law.
    const MID = { name: 'CreditOne 6610', balance: 900, minimumPayment: 65, isFocus: true };
    const body = 'Directing the full $500 extra at CreditOne 6610 clears that balance.';
    const fractional = CoachBriefSchema.parse(
      nextAction({ body, redirectAmount: 0, payoffClaims: [{ debtName: 'CreditOne 6610', horizonMonths: 1.1 }] }),
    );
    expect(fractional.nextAction.payoffClaims).toEqual([]);
    expect(findBriefViolation(fractional, 500, 500, [MID])).toBe('unverified_elimination_claim');

    // Control: an honestly declared 2 still earns its two months.
    const honest = CoachBriefSchema.parse(
      nextAction({ body, redirectAmount: 0, payoffClaims: [{ debtName: 'CreditOne 6610', horizonMonths: 2 }] }),
    );
    expect(findBriefViolation(honest, 500, 500, [MID])).toBeNull();
  });

  // Characterization, not endorsement: CodeRabbit flagged (PR #92) that a claim
  // naming several debts can be vouched for by whichever one is affordable, and
  // that the declared horizon reaches all of them. Both are true. Neither is
  // introduced here, and the proposed fix — per-candidate horizons — is a
  // measured no-op, because path 1 already proved the declared debt clears at
  // the declared horizon, so it always satisfies the `.some` below whatever the
  // other candidates receive (240 combinations, 0 cases where a non-declared
  // debt did the vouching). These tests pin the behaviour so a future change to
  // it is deliberate rather than accidental. The real fix is a declaration PER
  // DEBT rather than per brief — deliberately out of scope for this PR.
  //
  // The accepted cases below are a KNOWN GAP, not a desired outcome: a brief
  // saying "Pay off CreditOne 6610 and Store Card" when Store Card cannot be
  // paid off is telling the user something false. It is recorded rather than
  // fixed because the only narrow fix — requiring EVERY named debt to be
  // eliminable — inverts the quantifier on the `.some` below and breaks eight
  // tests that predate this PR, among them the three "passes only when SOME
  // debt is eliminable" cases that exist to hold exactly that line.
  describe('a multi-debt claim is vouched for by one named debt (pre-existing)', () => {
    const AFFORDABLE = { name: 'CreditOne 6610', balance: 1209, minimumPayment: 65, isFocus: true };
    const IMPOSSIBLE = { name: 'Store Card', balance: 3000, minimumPayment: 50 };
    const PAIR = [AFFORDABLE, IMPOSSIBLE];
    // $565/mo clears CreditOne in 3 months; Store Card gets $50/mo and no
    // extra, so it cannot be paid off on any horizon here.

    it('KNOWN GAP: accepts it when the runway is STATED where the parser can read it — on main too', () => {
      // The `.some` over named debts is deliberate and documented: attributeDebts
      // collects every name in the clause, and the claim verb governs only one
      // of them, so requiring all of them would reject "keep paying the Delta
      // Amex minimum while this clears Store Card".
      const brief = nextAction({
        body: 'Over the next 6 months pay off CreditOne 6610 and Store Card.',
        redirectAmount: 0,
        payoffClaims: [],
      });
      expect(findBriefViolation(brief, 500, 500, PAIR)).toBeNull();
    });

    it('rejects the same claim when the runway sits after the conjunction', () => {
      // Not a safety property — the horizon parser stops at the first
      // coordinating conjunction, so the runway is simply never read and the
      // strict one-month default applies. This is the prose crudity the
      // declared field exists to route around.
      const brief = nextAction({
        body: 'Pay off CreditOne 6610 and Store Card over the next 6 months.',
        redirectAmount: 0,
        payoffClaims: [],
      });
      expect(findBriefViolation(brief, 500, 500, PAIR)).toBe('unverified_elimination_claim');
    });

    it('KNOWN GAP: accepts it on a DECLARED horizon, matching the readable-runway case', () => {
      // The declaration supplies the horizon prose parsing refused, so this
      // lands on the same answer as the first test rather than the second. That
      // is the intended design; what it inherits is the `.some` leniency above.
      const brief = nextAction({
        body: 'Pay off CreditOne 6610 and Store Card.',
        redirectAmount: 0,
        payoffClaims: [{ debtName: 'CreditOne 6610', horizonMonths: 6 }],
      });
      expect(findBriefViolation(brief, 500, 500, PAIR)).toBeNull();
    });
  });

  describe('schema', () => {
    const valid = nextAction({
      payoffClaims: [{ debtName: 'CreditOne 6610', horizonMonths: 3 }],
    });

    it('keeps a well-formed declaration', () => {
      const parsed = CoachBriefSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
      expect(parsed.success && parsed.data.nextAction.payoffClaims).toEqual([
        { debtName: 'CreditOne 6610', horizonMonths: 3 },
      ]);
    });

    it.each([
      ['a missing field (briefs cached before it existed)', undefined],
      ['the previous singular field shape', { debtName: 'CreditOne 6610', horizonMonths: 3 }],
      ['a bare string instead of a list', 'CreditOne 6610'],
      ['an entry missing horizonMonths', [{ debtName: 'CreditOne 6610' }]],
      ['a zero horizon', [{ debtName: 'CreditOne 6610', horizonMonths: 0 }]],
      ['a negative horizon', [{ debtName: 'CreditOne 6610', horizonMonths: -3 }]],
      ['an absurd horizon', [{ debtName: 'CreditOne 6610', horizonMonths: 5000 }]],
      ['a fractional horizon', [{ debtName: 'CreditOne 6610', horizonMonths: 1.1 }]],
      ['an empty debt name', [{ debtName: '', horizonMonths: 3 }]],
      ['one bad entry among good ones', [
        { debtName: 'CreditOne 6610', horizonMonths: 3 },
        { debtName: 'Delta Amex', horizonMonths: 1.5 },
      ]],
    ])('falls back to an empty list on %s rather than failing the whole brief', (_label, value) => {
      // The opposite of redirectAmount's rule, on purpose: null here means the
      // prose law runs at full strength, so failing soft costs the user
      // nothing, while failing the brief would drop them to the deterministic
      // fallback over a malformed optional field.
      const raw = nextAction();
      const candidate = {
        ...raw,
        nextAction: { ...raw.nextAction, payoffClaims: value },
      };
      if (value === undefined) delete (candidate.nextAction as { payoffClaims?: unknown }).payoffClaims;
      const parsed = CoachBriefSchema.safeParse(candidate);
      expect(parsed.success).toBe(true);
      // One bad entry discards the WHOLE list rather than just that entry: a
      // brief that miscounted its own claims should be re-judged by the prose
      // law, not acted on through a partial declaration.
      expect(parsed.success && parsed.data.nextAction.payoffClaims).toEqual([]);
    });
  });
});

describe('one declaration per debt', () => {
  // CreditOne is the focus debt, so the $500 acceleration reaches it: $565/mo.
  // Every other debt receives only its own minimum unless the action moves
  // money to it.
  const CREDIT_ONE = { name: 'CreditOne 6610', balance: 1209, minimumPayment: 65, isFocus: true };
  const STORE_CARD_BIG = { name: 'Store Card', balance: 3000, minimumPayment: 50 };
  const STORE_CARD_TINY = { name: 'Store Card', balance: 100, minimumPayment: 50 };

  it('rejects a two-debt claim when the second debt cannot be paid off', () => {
    // The gap CodeRabbit found on PR #92, closed. One declaration could not
    // describe this sentence: CreditOne is affordable and vouched for the whole
    // claim while Store Card — $3,000 at $50/mo — was never checked. Declaring
    // each debt makes the impossible half fail its own arithmetic.
    const brief = nextAction({
      title: 'Clear both cards',
      body: 'Pay off CreditOne 6610 and Store Card.',
      redirectAmount: 0,
      payoffClaims: [
        { debtName: 'CreditOne 6610', horizonMonths: 6 },
        { debtName: 'Store Card', horizonMonths: 6 },
      ],
    });
    expect(findBriefViolation(brief, 500, 500, [CREDIT_ONE, STORE_CARD_BIG])).toBe(
      'unverified_elimination_claim',
    );
  });

  it('KNOWN GAP: still accepts it when the model declares only the affordable debt', () => {
    // The residual, stated honestly: declaring per debt closes the gap for a
    // model that declares what it claims, not for one that omits the awkward
    // half. The prose law cannot close it either — `attributeDebts` collects
    // every name in the clause while the verb governs one of them, so requiring
    // all named debts would reject "keep paying the Delta Amex minimum while
    // this clears Store Card". Tracked, not fixed.
    const brief = nextAction({
      title: 'Clear both cards',
      body: 'Pay off CreditOne 6610 and Store Card.',
      redirectAmount: 0,
      payoffClaims: [{ debtName: 'CreditOne 6610', horizonMonths: 6 }],
    });
    expect(findBriefViolation(brief, 500, 500, [CREDIT_ONE, STORE_CARD_BIG])).toBeNull();
  });

  it('gives each debt its own horizon', () => {
    // Two payoffs on different timelines, which a single declaration could not
    // express at all: Store Card needs 2 months of its own $50 minimum, and
    // CreditOne needs 3 months of $565. Each claim is measured against the
    // horizon declared for ITS debt.
    const brief = nextAction({
      title: 'Two cards finish this quarter',
      body: 'Store Card clears with its minimum. CreditOne 6610 clears with the extra.',
      redirectAmount: 0,
      payoffClaims: [
        { debtName: 'Store Card', horizonMonths: 2 },
        { debtName: 'CreditOne 6610', horizonMonths: 3 },
      ],
    });
    expect(findBriefViolation(brief, 500, 500, [CREDIT_ONE, STORE_CARD_TINY])).toBeNull();
  });

  it('checks each declaration against its own debt, not the easiest one', () => {
    // The same two debts with the horizons swapped. CreditOne at one month is
    // $565 against $1,209 and fails, even though Store Card's declaration is
    // comfortably true — every entry has to hold.
    const brief = nextAction({
      title: 'Two cards finish this quarter',
      body: 'Store Card clears with its minimum. CreditOne 6610 clears with the extra.',
      redirectAmount: 0,
      payoffClaims: [
        { debtName: 'Store Card', horizonMonths: 3 },
        { debtName: 'CreditOne 6610', horizonMonths: 1 },
      ],
    });
    expect(findBriefViolation(brief, 500, 500, [CREDIT_ONE, STORE_CARD_TINY])).toBe(
      'unverified_elimination_claim',
    );
  });

  it('does not let one debt\'s declared runway reach another debt\'s claim', () => {
    // The leak that recurred twice on PR #92, re-tested against the per-debt
    // shape: Store Card is declared at 6 months, and the CreditOne claim beside
    // it must still be measured at one month rather than borrowing that runway.
    const brief = nextAction({
      title: 'Two cards',
      body: 'Store Card clears with its minimum. This also clears CreditOne 6610.',
      redirectAmount: 0,
      payoffClaims: [{ debtName: 'Store Card', horizonMonths: 6 }],
    });
    expect(findBriefViolation(brief, 500, 500, [CREDIT_ONE, STORE_CARD_TINY])).toBe(
      'unverified_elimination_claim',
    );
  });

  it('ignores unresolvable names while still checking the ones that resolve', () => {
    // Established rule from PR #92: an unmatched name is dropped rather than
    // rejected, because the model echoing "Store Card (Credit Card)" cost 25 of
    // 30 briefs. A real declaration alongside it is still enforced.
    const brief = nextAction({
      title: 'Clear the card',
      body: 'Pay off CreditOne 6610.',
      redirectAmount: 0,
      payoffClaims: [
        { debtName: 'Best Buy Card', horizonMonths: 1 },
        { debtName: 'CreditOne 6610', horizonMonths: 1 },
      ],
    });
    expect(findBriefViolation(brief, 500, 500, [CREDIT_ONE, STORE_CARD_BIG])).toBe(
      'unverified_elimination_claim',
    );
  });
});
describe('acceleration rolling over to the next debt', () => {
  // Store Card is the focus and takes the $600 acceleration: $625/mo against a
  // $200 balance, so it is gone after one month and the money moves on.
  const STORE = { name: 'Store Card', balance: 200, minimumPayment: 25, isFocus: true };
  const OLD_FEE = { name: 'Old Fee Card', balance: 150, minimumPayment: 20 };
  const DELTA = { name: 'Delta Amex', balance: 10169, minimumPayment: 250 };

  it('accepts a sequential payoff the plan genuinely funds', () => {
    // Verbatim from a live sweep, and true: the law credited the acceleration
    // only to the CURRENT focus debt, so Old Fee Card was measured as though
    // stuck on its $20 minimum forever and a truthful brief was rejected.
    // Declaring per debt is what surfaced it — the model now declares the
    // second payoff instead of burying it in prose.
    const brief = nextAction({
      title: 'Finish both small cards',
      body: 'Store Card ($200 balance, 26.99% APR) will clear in one month with $25 minimum plus $600 acceleration. Then redirect full $625 to Old Fee Card ($150, 24.99% APR) to finish within two months total.',
      redirectAmount: 0,
      payoffClaims: [
        { debtName: 'Store Card', horizonMonths: 1 },
        { debtName: 'Old Fee Card', horizonMonths: 2 },
      ],
    });
    expect(findBriefViolation(brief, 600, 900, [STORE, OLD_FEE])).toBeNull();
  });

  it('still rejects a SAME-MONTH claim about a debt the extra has not reached', () => {
    // The control that matters most: retiring the focus debt takes at least one
    // month, so a one-month horizon still yields zero months of rolled-over
    // extra. Old Fee Card gets its $20 minimum and nothing else. This is the
    // shape of the reported incident, and the rollover model must not touch it.
    const brief = nextAction({
      title: 'Clear the fee card',
      body: 'Old Fee Card is gone by month-end.',
      redirectAmount: 0,
      payoffClaims: [{ debtName: 'Old Fee Card', horizonMonths: 1 }],
    });
    expect(findBriefViolation(brief, 600, 900, [STORE, OLD_FEE])).toBe(
      'unverified_elimination_claim',
    );
  });

  it('still rejects a rollover claim the freed money cannot reach', () => {
    // Three months: one to retire Store Card, leaving two months of $600 plus
    // three of the $250 minimum — $1,950 against $10,169. Modelling the
    // rollover makes the law more generous, not blind.
    const brief = nextAction({
      title: 'Clear the big card',
      body: 'Store Card clears this month, then the freed cash wipes out Delta Amex within 3 months.',
      redirectAmount: 0,
      payoffClaims: [
        { debtName: 'Store Card', horizonMonths: 1 },
        { debtName: 'Delta Amex', horizonMonths: 3 },
      ],
    });
    expect(findBriefViolation(brief, 600, 900, [STORE, DELTA])).toBe(
      'unverified_elimination_claim',
    );
  });

  it('keeps the whole-plan reading when no focus debt is marked', () => {
    // Briefs cached before isFocus existed carry no focus, and the established
    // rule is that they keep the old reading rather than being purged: every
    // debt sees the extra for the whole horizon.
    const unmarked = [
      { name: 'Store Card', balance: 200, minimumPayment: 25 },
      { name: 'Old Fee Card', balance: 150, minimumPayment: 20 },
    ];
    const brief = nextAction({
      title: 'Clear the fee card',
      body: 'Old Fee Card is gone by month-end.',
      redirectAmount: 0,
      payoffClaims: [{ debtName: 'Old Fee Card', horizonMonths: 1 }],
    });
    expect(findBriefViolation(brief, 600, 900, unmarked)).toBeNull();
  });
});

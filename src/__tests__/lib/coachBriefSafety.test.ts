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
  ])('still rejects an unaffordable payoff claim: %s', (phrase) => {
    const brief = nextAction({ body: phrase, redirectAmount: 500 });
    expect(findBriefViolation(brief, 500, 500, [CREDIT_ONE, DELTA_AMEX])).toBe(
      'unverified_elimination_claim',
    );
  });

  it('needs the debt list to use a bare debt name as the object', () => {
    // No dollar amount and no balance noun, so the debt name is the only
    // thing that can make this a payoff claim.
    const brief = nextAction({ body: 'Your plan clears CreditOne 6610 by month-end.', redirectAmount: 500 });
    expect(findBriefViolation(brief, 500, 500, [CREDIT_ONE])).toBe('unverified_elimination_claim');
    // Documents the dependency, same as the unsafe-minimum law. Both callers
    // pass a debt list; with none there is no name to recognise as an object.
    expect(findBriefViolation(brief, 500, 500, [])).toBeNull();
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
    // Verbatim from a live-model run, rejected before this change: $350 extra
    // + the $65 minimum is $415/mo, and 4 months of that is $1,660 against a
    // $1,209 balance. True, but one month of it ($415) is not.
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
    // $65 min + $350 extra = $415/mo. 3 months ($1,245) covers the $1,209
    // balance; 2 months ($830) does not.
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
    // 24 months x ($250 extra + $250 minimum) = $12,000 against $10,169.
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

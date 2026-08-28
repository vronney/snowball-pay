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

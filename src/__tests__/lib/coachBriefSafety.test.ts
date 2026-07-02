import { describe, it, expect } from 'vitest';
import { isBriefLawful, toClientBrief, type CoachBrief, type StoredCoachBrief } from '@/lib/coachBriefSafety';

function nextAction(overrides: Partial<CoachBrief['nextAction']> = {}): CoachBrief {
  return {
    verdict: { status: 'off_track', headline: 'Debt grew instead of shrinking', summary: 'Balance increased despite planned paydown.' },
    nextAction: {
      title: 'Redirect acceleration to highest APR',
      body: 'Send the full acceleration to the highest APR balance.',
      action: 'Pay extra to the highest APR debt',
      impact: 'high',
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
    expect(isBriefLawful(brief, 500)).toBe(false);
  });

  it('rejects a paraphrase that avoids trigger words but still exceeds the discretionary ceiling', () => {
    const brief = nextAction({
      title: 'Send everything to Delta Amex',
      body: 'Combine your CreditOne 6610 payment with your acceleration and send $565 total to Delta Amex this month.',
      action: 'Send $565 to Delta Amex this month',
      redirectAmount: 565,
    });
    // No "pause"/"stop paying"/"skip" anywhere — only the numeric law catches this.
    expect(isBriefLawful(brief, 500)).toBe(false);
  });

  it.each([
    'Hold off on the CapitalOne minimum this month',
    'Defer the Discover payment until next month',
    'Delay the Chase minimum by a week',
    'Withhold this month\'s Amex minimum',
    "Don't pay the Wells Fargo minimum this cycle",
    'Missing one minimum payment frees up cash',
  ])('rejects trigger phrase: %s', (phrase) => {
    const brief = nextAction({ body: phrase, redirectAmount: 0 });
    expect(isBriefLawful(brief, 500)).toBe(false);
  });

  it('allows a legitimate action that stays within the discretionary ceiling', () => {
    const brief = nextAction({
      title: 'Keep extra on Delta Amex',
      body: 'Continue sending the full $500 acceleration to Delta Amex, the highest APR balance.',
      action: 'Pay $500 extra to Delta Amex',
      redirectAmount: 500,
    });
    expect(isBriefLawful(brief, 500)).toBe(true);
  });

  it('allows redirectAmount within rounding tolerance of the ceiling', () => {
    const brief = nextAction({ redirectAmount: 501 });
    expect(isBriefLawful(brief, 500)).toBe(true);
  });

  it('rejects redirectAmount past the rounding tolerance', () => {
    const brief = nextAction({ redirectAmount: 502 });
    expect(isBriefLawful(brief, 500)).toBe(false);
  });

  it('allows a no-op action (redirectAmount 0) with no risky language', () => {
    const brief = nextAction({
      title: 'Keep the current course',
      body: 'Continue directing extra payments to the current focus debt.',
      action: 'Stay on the current plan',
      redirectAmount: 0,
    });
    expect(isBriefLawful(brief, 0)).toBe(true);
  });
});

describe('toClientBrief', () => {
  it('strips server-only _meta before the brief reaches the client', () => {
    const stored: StoredCoachBrief = {
      ...nextAction({ redirectAmount: 500 }),
      _meta: { effectiveAcceleration: 500 },
    };
    const client = toClientBrief(stored);
    expect(client).not.toHaveProperty('_meta');
    expect(client.nextAction.redirectAmount).toBe(500);
  });
});

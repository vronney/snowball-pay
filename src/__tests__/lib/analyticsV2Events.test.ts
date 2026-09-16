import { describe, expect, it } from 'vitest';
import { Events } from '@/lib/analyticsEvents';
import { sanitiseAnalyticsProperties } from '@/lib/analyticsPrivacy';

describe('dashboard v2 This Month events (spec §9)', () => {
  it('defines the three events', () => {
    expect(Events.READINESS_CTA).toBe('readiness_cta');
    expect(Events.COACH_MOVE_CTA).toBe('coach_move_cta');
    expect(Events.BULK_LOG_SUBMITTED).toBe('bulk_log_submitted');
  });

  it('sends their properties through the privacy sanitiser untouched', () => {
    const props = { step: 'dueDates', move: 'log_missed', gated: false, debt_count: 3 };
    expect(sanitiseAnalyticsProperties(props)).toEqual(props);
  });
});

describe('dashboard v2 My Debts events (spec §9)', () => {
  it('defines the three events', () => {
    expect(Events.DEBT_SAVED_OUTSIDE_PLAN).toBe('debt_saved_outside_plan');
    expect(Events.UPGRADE_MOMENT_VIEWED).toBe('upgrade_moment_viewed');
    expect(Events.UPGRADE_MOMENT_CTA).toBe('upgrade_moment_cta');
  });

  it('sends their properties through the privacy sanitiser untouched', () => {
    const props = { state: 'E', action: 'checkout', source: 'upgrade_moment_e', billing: 'monthly' };
    expect(sanitiseAnalyticsProperties(props)).toEqual(props);
  });
});

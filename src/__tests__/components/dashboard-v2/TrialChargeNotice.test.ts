// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import TrialChargeNotice, {
  daysUntilCharge,
  trialEndLabel,
} from '@/components/dashboard-v2/shell/TrialChargeNotice';
import { useOpenBillingPortal, type SubscriptionInfo } from '@/lib/hooks';
import { STRIPE_TRIAL_CHARGE_NOTICE } from '@/lib/upgradeMessaging';

vi.mock('@/lib/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/hooks')>()),
  useOpenBillingPortal: vi.fn(),
}));

const DAY = 24 * 60 * 60 * 1000;

function setup(sub: Partial<SubscriptionInfo> | undefined) {
  vi.mocked(useOpenBillingPortal).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
  } as unknown as ReturnType<typeof useOpenBillingPortal>);
  const { container } = render(
    createElement(TrialChargeNotice, { sub: sub as SubscriptionInfo | undefined }),
  );
  return container;
}

const trialing = (endsInDays: number) => ({
  subscriptionStatus: 'trialing',
  subscriptionEndsAt: new Date(Date.now() + endsInDays * DAY).toISOString(),
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('daysUntilCharge', () => {
  const now = Date.parse('2026-09-17T12:00:00.000Z');

  it('rounds up whole days remaining', () => {
    expect(daysUntilCharge('2026-09-20T12:00:00.000Z', now)).toBe(3);
    expect(daysUntilCharge('2026-09-18T00:00:00.000Z', now)).toBe(1);
  });

  it('floors at zero once the date has passed', () => {
    expect(daysUntilCharge('2026-09-16T12:00:00.000Z', now)).toBe(0);
  });

  it('reports an unusable date as out of window', () => {
    expect(daysUntilCharge('not a date', now)).toBe(-1);
  });
});

describe('trialEndLabel', () => {
  it('names the day without a bare number for today and tomorrow', () => {
    expect(trialEndLabel(0)).toBe('Your Pro trial ends today');
    expect(trialEndLabel(1)).toBe('Your Pro trial ends tomorrow');
    expect(trialEndLabel(5)).toBe('Your Pro trial ends in 5 days');
  });

  // A trial scheduled to cancel keeps status "trialing" and stores cancel_at in
  // the same column as trial_end, so the heading must not assert a charge.
  it('does not claim billing will start', () => {
    for (const days of [0, 1, 5]) {
      expect(trialEndLabel(days)).not.toMatch(/bill|charge/i);
    }
  });
});

describe('TrialChargeNotice', () => {
  it('warns a card-backed trial inside the final week', () => {
    setup(trialing(3));
    expect(screen.getByText('Your Pro trial ends in 3 days')).toBeTruthy();
    expect(screen.getByText(STRIPE_TRIAL_CHARGE_NOTICE)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Review billing/ })).toBeTruthy();
  });

  it('stays quiet earlier in the trial', () => {
    const container = setup(trialing(9));
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing without a Stripe trial', () => {
    expect(setup(undefined).innerHTML).toBe('');
    // A self-serve trial has no Stripe subscription and can never be charged.
    expect(setup({ signupTrialActive: true } as Partial<SubscriptionInfo>).innerHTML).toBe('');
    // A paid subscription past its trial is billed already; nothing to warn about.
    expect(setup({ ...trialing(2), subscriptionStatus: 'active' } as Partial<SubscriptionInfo>).innerHTML)
      .toBe('');
  });

  it('renders nothing for a trial with no end date', () => {
    expect(setup({ subscriptionStatus: 'trialing' }).innerHTML).toBe('');
  });
});

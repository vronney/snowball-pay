// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import TrialChargeNotice, {
  chargeLabel,
  daysUntilCharge,
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

describe('chargeLabel', () => {
  it('names the day without a bare number for today and tomorrow', () => {
    expect(chargeLabel(0)).toBe('Pro starts billing today');
    expect(chargeLabel(1)).toBe('Pro starts billing tomorrow');
    expect(chargeLabel(5)).toBe('Pro starts billing in 5 days');
  });
});

describe('TrialChargeNotice', () => {
  it('warns a card-backed trial inside the final week', () => {
    setup(trialing(3));
    expect(screen.getByText('Pro starts billing in 3 days')).toBeTruthy();
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

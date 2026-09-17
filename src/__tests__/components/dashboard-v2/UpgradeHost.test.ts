// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { render } from '@testing-library/react';
import { useDashboardInsights } from '@/lib/hooks';
import UpgradeHost from '@/components/dashboard-v2/upgrade/UpgradeHost';

const seen = vi.hoisted(() => ({ trial: null as null | Record<string, unknown>, fallback: null as null | Record<string, unknown> }));

vi.mock('@/lib/hooks', () => ({ useDashboardInsights: vi.fn() }));
vi.mock('@/components/dashboard-v2/upgrade/TrialStartSheet', () => ({
  default: (props: Record<string, unknown>) => { seen.trial = props; return null; },
}));
vi.mock('@/components/dashboard-v2/upgrade/UpgradeFallbackSheet', () => ({
  default: (props: Record<string, unknown>) => { seen.fallback = props; return null; },
}));

function insightsFor(eligible: boolean | undefined, proEligible = false) {
  return eligible === undefined ? undefined : { tier: { proEligible, trial: { eligible } } };
}

function renderHost(eligible: boolean | undefined, proEligible = false) {
  vi.mocked(useDashboardInsights).mockReturnValue({ data: insightsFor(eligible, proEligible) } as unknown as ReturnType<typeof useDashboardInsights>);
  const onClose = vi.fn();
  const view = render(createElement(UpgradeHost, { feature: 'Coach moves', interestAtStake: 500, onClose }));
  return { onClose, view };
}

afterEach(() => {
  vi.clearAllMocks();
  seen.trial = null;
  seen.fallback = null;
});

describe('UpgradeHost (spec §7; plan decision 8)', () => {
  it('offers the trial to an account that can start one', () => {
    const { onClose } = renderHost(true);
    expect(seen.trial).toEqual({ onClose });
    expect(seen.fallback).toBeNull();
  });

  it('offers checkout to everyone else, with the feature copy and the anchor', () => {
    const { onClose } = renderHost(false);
    expect(seen.fallback).toEqual({ feature: 'Coach moves', interestAtStake: 500, onClose });
    expect(seen.trial).toBeNull();
  });

  it('never offers a trial it cannot confirm: checkout while insights load', () => {
    renderHost(undefined);
    expect(seen.fallback).not.toBeNull();
    expect(seen.trial).toBeNull();
  });

  it('closes instead of offering checkout once a trial it offered is on', () => {
    const { onClose, view } = renderHost(true, false);
    expect(seen.trial).toEqual({ onClose });

    vi.mocked(useDashboardInsights).mockReturnValue({ data: insightsFor(false, true) } as unknown as ReturnType<typeof useDashboardInsights>);
    view.rerender(createElement(UpgradeHost, { feature: 'Coach moves', interestAtStake: 500, onClose }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(seen.fallback).toBeNull();
  });

  it('keeps the trial sheet (and its error) when eligibility drops without Pro', () => {
    const { onClose, view } = renderHost(true, false);
    expect(seen.trial).not.toBeNull();
    seen.trial = null;

    vi.mocked(useDashboardInsights).mockReturnValue({ data: insightsFor(false, false) } as unknown as ReturnType<typeof useDashboardInsights>);
    view.rerender(createElement(UpgradeHost, { feature: 'Coach moves', interestAtStake: 500, onClose }));

    expect(seen.trial).toEqual({ onClose });
    expect(seen.fallback).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });
});

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

function renderHost(eligible: boolean | undefined) {
  const data = eligible === undefined ? undefined : { tier: { trial: { eligible } } };
  vi.mocked(useDashboardInsights).mockReturnValue({ data } as unknown as ReturnType<typeof useDashboardInsights>);
  const onClose = vi.fn();
  render(createElement(UpgradeHost, { feature: 'Coach moves', interestAtStake: 500, onClose }));
  return { onClose };
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
});

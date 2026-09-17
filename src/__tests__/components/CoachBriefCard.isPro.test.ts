// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { useCachedCoachBrief, useGenerateCoachBrief, useSubscription } from '@/lib/hooks';
import { upgradeEvents } from '@/lib/upgradeEvents';
import CoachBriefCard from '@/components/payoff/CoachBriefCard';

vi.mock('@/lib/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/hooks')>()),
  useCachedCoachBrief: vi.fn(),
  useGenerateCoachBrief: vi.fn(),
  useSubscription: vi.fn(),
}));

/** An empty brief cache and a subscription cache that still says Free: the stale state right after a trial starts. */
function renderCard(props: { isPro?: boolean }) {
  const mutate = vi.fn();
  vi.mocked(useCachedCoachBrief).mockReturnValue(
    { data: { brief: null, dataHash: null, generatedAt: null }, isLoading: false } as unknown as ReturnType<typeof useCachedCoachBrief>,
  );
  vi.mocked(useGenerateCoachBrief).mockReturnValue(
    { mutate, isPending: false, isError: false, data: undefined, error: null } as unknown as ReturnType<typeof useGenerateCoachBrief>,
  );
  vi.mocked(useSubscription).mockReturnValue(
    { data: { proEligible: false }, isLoading: false } as unknown as ReturnType<typeof useSubscription>,
  );
  render(createElement(CoachBriefCard, { hasDebts: true, hasIncome: true, ...props }));
  return { mutate };
}

afterEach(() => vi.clearAllMocks());

describe("CoachBriefCard's isPro (plan decision 10)", () => {
  it("trusts the page's resolved tier over a stale subscription cache: no locked door", () => {
    const { mutate } = renderCard({ isPro: true });
    expect(mutate).toHaveBeenCalledWith({});
    expect(screen.queryByRole('button', { name: /Upgrade to unlock coach brief/ })).toBeNull();
  });

  it('without the prop (v1), still reads the subscription', () => {
    const seen: string[] = [];
    const unsubscribe = upgradeEvents.subscribe((feature) => seen.push(feature));
    const { mutate } = renderCard({});
    expect(mutate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Upgrade to unlock coach brief/ }));
    expect(seen).toEqual(['AI Coach Brief']);
    unsubscribe();
  });
});

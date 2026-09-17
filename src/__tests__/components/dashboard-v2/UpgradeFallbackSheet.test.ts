// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { useStartCheckout } from '@/lib/hooks';
import { track, Events } from '@/lib/analytics';
import { PLANS } from '@/lib/stripe';
import { formatCurrencyWhole } from '@/lib/utils';
import { getUpgradeMessage, UPGRADE_MESSAGE_VERSION } from '@/lib/upgradeMessaging';
import UpgradeFallbackSheet from '@/components/dashboard-v2/upgrade/UpgradeFallbackSheet';

vi.mock('@/lib/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/hooks')>()),
  useStartCheckout: vi.fn(),
}));
vi.mock('@/lib/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/analytics')>()),
  track: vi.fn(),
}));

const FEATURE = 'What-if scenarios';
const MESSAGE = getUpgradeMessage(FEATURE);

function renderSheet({ interestAtStake = 1_234, checkout = {} as Record<string, unknown> } = {}) {
  const mutate = vi.fn();
  vi.mocked(useStartCheckout).mockReturnValue(
    { mutate, isPending: false, isError: false, error: null, ...checkout } as unknown as ReturnType<typeof useStartCheckout>,
  );
  const onClose = vi.fn();
  render(createElement(UpgradeFallbackSheet, { feature: FEATURE, interestAtStake, onClose }));
  return { mutate, onClose };
}

afterEach(() => vi.clearAllMocks());

describe("UpgradeFallbackSheet — UpgradeModal's content in the v2 sheet (spec §7)", () => {
  it("shows the feature's copy, the interest anchor and the price, and records the view", () => {
    renderSheet();
    const dialog = screen.getByRole('dialog', { name: MESSAGE.headline });
    expect(within(dialog).getByText(MESSAGE.description)).toBeTruthy();
    for (const benefit of MESSAGE.benefits) expect(within(dialog).getByText(benefit)).toBeTruthy();
    expect(within(dialog).getByText(formatCurrencyWhole(1_234))).toBeTruthy();
    expect(within(dialog).getByText(formatCurrencyWhole(PLANS.pro.price))).toBeTruthy();
    expect(track).toHaveBeenCalledWith(Events.UPGRADE_MODAL_VIEWED, {
      feature: FEATURE, trigger: MESSAGE.id, message_version: UPGRADE_MESSAGE_VERSION, source: 'dashboard_v2_upgrade_sheet',
    });
  });

  it('omits the anchor without a real saving', () => {
    renderSheet({ interestAtStake: 0 });
    expect(screen.queryByText(/projected to avoid/)).toBeNull();
  });

  it('starts the existing checkout from its CTA', () => {
    const { mutate } = renderSheet();
    fireEvent.click(screen.getByRole('button', { name: MESSAGE.monthlyCta }));
    expect(track).toHaveBeenCalledWith(Events.CHECKOUT_STARTED, {
      source: 'upgrade_sheet', feature: FEATURE, trigger: MESSAGE.id, message_version: UPGRADE_MESSAGE_VERSION, billing: 'monthly',
    });
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it('records one dismissal and closes on "Continue with Free"', () => {
    const { onClose } = renderSheet();
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Free' }));
    expect(track).toHaveBeenCalledWith(Events.UPGRADE_MODAL_DISMISSED, {
      feature: FEATURE, trigger: MESSAGE.id, message_version: UPGRADE_MESSAGE_VERSION, reason: 'continue_free', source: 'dashboard_v2_upgrade_sheet',
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('holds the sheet while checkout redirects', () => {
    renderSheet({ checkout: { isPending: true } });
    expect((screen.getByRole('button', { name: 'Redirecting…' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Continue with Free' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows an alert when checkout fails', () => {
    renderSheet({ checkout: { isError: true, error: new Error('Network down') } });
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});

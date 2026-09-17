// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { AxiosError, type AxiosResponse } from 'axios';
import { useStartCheckout, useStartTrial } from '@/lib/hooks';
import { MOMENT_A } from '@/lib/dashboard/upgradeMoments';
import { track, Events } from '@/lib/analytics';
import UpgradeSheet from '@/components/dashboard-v2/sheets/UpgradeSheet';

vi.mock('@/lib/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/hooks')>()),
  useStartCheckout: vi.fn(),
  useStartTrial: vi.fn(),
}));
vi.mock('@/lib/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/analytics')>()),
  track: vi.fn(),
}));

const VIEW = {
  eyebrow: 'Debt 4 of 5 · saved, not counted',
  title: 'Your date is built from 3 of your 5 debts.',
  body: "The 2 uncounted balances add $4,910.25 and roughly 19 months that April 2029 doesn't include.",
  cta: 'Count all 5 — $9/mo',
};
const COUNTED = [{ id: 'a', name: 'Visa', balance: 1_000.5 }, { id: 'b', name: 'Car', balance: 9_000 }];
const OUTSIDE = [{ id: 'x', name: 'Store card', balance: 1_200 }];

function renderSheet(
  checkout: Record<string, unknown> = {},
  { trialEligible = false, trial = {} as Record<string, unknown> } = {},
) {
  const mutate = vi.fn();
  const startTrial = vi.fn();
  vi.mocked(useStartCheckout).mockReturnValue(
    { mutate, isPending: false, isError: false, error: null, ...checkout } as unknown as ReturnType<typeof useStartCheckout>,
  );
  vi.mocked(useStartTrial).mockReturnValue(
    { mutate: startTrial, isPending: false, isError: false, error: null, ...trial } as unknown as ReturnType<typeof useStartTrial>,
  );
  const onClose = vi.fn();
  render(createElement(UpgradeSheet, { view: VIEW, counted: COUNTED, outside: OUTSIDE, trialEligible, onClose }));
  return { mutate, startTrial, onClose };
}

afterEach(() => vi.clearAllMocks());

describe('UpgradeSheet — moment E (spec §7)', () => {
  it("shows the user's counted and outside debts with the moment's copy", () => {
    renderSheet();
    const dialog = screen.getByRole('dialog', { name: VIEW.title });
    expect(within(dialog).getByText(VIEW.eyebrow)).toBeTruthy();
    const list = within(dialog).getByRole('list', { name: 'Your debts' });
    expect(within(list).getByText('$1,000.50')).toBeTruthy();
    expect(within(list).getByText('Store card')).toBeTruthy();
    expect(within(list).getByText('not in plan')).toBeTruthy();
    expect(within(dialog).getByText(VIEW.body)).toBeTruthy();
    expect(track).toHaveBeenCalledWith(Events.UPGRADE_MOMENT_VIEWED, { state: 'E' });
  });

  it('starts the existing checkout from its CTA', () => {
    const { mutate } = renderSheet();
    fireEvent.click(screen.getByRole('button', { name: VIEW.cta }));
    expect(track).toHaveBeenCalledWith(Events.UPGRADE_MOMENT_CTA, { state: 'E', action: 'checkout' });
    expect(track).toHaveBeenCalledWith(Events.CHECKOUT_STARTED, { source: 'upgrade_moment_e', billing: 'monthly' });
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it('holds the sheet while checkout redirects', () => {
    renderSheet({ isPending: true });
    expect((screen.getByRole('button', { name: 'Redirecting…' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Close' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('says so when checkout fails', () => {
    renderSheet({ isError: true, error: new Error('Network down') });
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('starts the trial instead of checkout for an account that can (plan decision 9)', () => {
    const { mutate, startTrial, onClose } = renderSheet({}, { trialEligible: true });
    fireEvent.click(screen.getByRole('button', { name: VIEW.cta }));
    expect(track).toHaveBeenCalledWith(Events.UPGRADE_MOMENT_CTA, { state: 'E', action: 'start_trial' });
    expect(track).not.toHaveBeenCalledWith(Events.CHECKOUT_STARTED, expect.anything());
    expect(mutate).not.toHaveBeenCalled();
    const [, options] = startTrial.mock.calls[0] as [unknown, { onSuccess: () => void }];
    options.onSuccess();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('holds the sheet while the trial starts', () => {
    renderSheet({}, { trialEligible: true, trial: { isPending: true } });
    expect((screen.getByRole('button', { name: MOMENT_A.pending }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Close' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('names a refused trial start', () => {
    const refused = new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 409, data: { error: 'trial_used' },
    } as unknown as AxiosResponse);
    renderSheet({}, { trialEligible: true, trial: { isError: true, error: refused } });
    expect(screen.getByRole('alert').textContent).toBe('This email has already used its free trial.');
  });
});

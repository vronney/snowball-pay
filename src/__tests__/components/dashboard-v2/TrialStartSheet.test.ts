// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { AxiosError, type AxiosResponse } from 'axios';
import { useStartTrial } from '@/lib/hooks';
import { track, Events } from '@/lib/analytics';
import { MOMENT_A } from '@/lib/dashboard/upgradeMoments';
import TrialStartSheet from '@/components/dashboard-v2/upgrade/TrialStartSheet';

vi.mock('@/lib/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/hooks')>()),
  useStartTrial: vi.fn(),
}));
vi.mock('@/lib/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/analytics')>()),
  track: vi.fn(),
}));

function renderSheet(state: Record<string, unknown> = {}) {
  const mutate = vi.fn();
  vi.mocked(useStartTrial).mockReturnValue(
    { mutate, isPending: false, isError: false, error: null, ...state } as unknown as ReturnType<typeof useStartTrial>,
  );
  const onClose = vi.fn();
  render(createElement(TrialStartSheet, { onClose }));
  return { mutate, onClose };
}

function httpError(status: number): AxiosError {
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    data: { error: 'trial_used' },
  } as unknown as AxiosResponse);
}

afterEach(() => vi.clearAllMocks());

describe('TrialStartSheet — moment A (spec §7)', () => {
  it('shows the handoff copy and records the view', () => {
    renderSheet();
    const dialog = screen.getByRole('dialog', { name: MOMENT_A.title });
    expect(within(dialog).getByText(MOMENT_A.badge)).toBeTruthy();
    expect(within(dialog).getByText(MOMENT_A.body)).toBeTruthy();
    expect(within(dialog).getByText(MOMENT_A.footnote)).toBeTruthy();
    expect(track).toHaveBeenCalledWith(Events.UPGRADE_MOMENT_VIEWED, { state: 'A' });
  });

  it('starts the trial and closes once it has started', () => {
    const { mutate, onClose } = renderSheet();
    fireEvent.click(screen.getByRole('button', { name: MOMENT_A.cta }));
    expect(track).toHaveBeenCalledWith(Events.UPGRADE_MOMENT_CTA, { state: 'A', action: 'start_trial' });
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    const [, options] = mutate.mock.calls[0] as [unknown, { onSuccess: () => void }];
    options.onSuccess();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('holds the sheet while the trial starts', () => {
    renderSheet({ isPending: true });
    expect((screen.getByRole('button', { name: MOMENT_A.pending }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Close' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('says so when the email already used its trial', () => {
    renderSheet({ isError: true, error: httpError(409) });
    expect(screen.getByRole('alert').textContent).toBe('This email has already used its free trial.');
  });
});

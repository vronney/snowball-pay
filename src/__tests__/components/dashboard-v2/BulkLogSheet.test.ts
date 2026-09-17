// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import BulkLogSheet, { batchCelebration, parseAmount } from '@/components/dashboard-v2/sheets/BulkLogSheet';
import { fireCelebration, useMarkPaid, type CelebrationPayload } from '@/lib/hooks';
import { track } from '@/lib/analytics';

vi.mock('@/lib/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/hooks')>()),
  useMarkPaid: vi.fn(),
  fireCelebration: vi.fn(),
}));
vi.mock('@/lib/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/analytics')>()),
  track: vi.fn(),
}));

const ROWS = [
  { debtId: 'a', name: 'Visa', amount: 25 },
  { debtId: 'b', name: 'Car loan', amount: 310.5 },
];

function setup(mutateAsync = vi.fn().mockResolvedValue({})) {
  vi.mocked(useMarkPaid).mockReturnValue({ mutateAsync } as unknown as ReturnType<typeof useMarkPaid>);
  const onClose = vi.fn();
  render(createElement(BulkLogSheet, { title: 'Log Sep payments', rows: ROWS, year: 2026, month: 8, onClose }));
  return { mutateAsync, onClose };
}

function payload(over: Partial<CelebrationPayload> = {}): CelebrationPayload {
  return {
    debtId: 'a',
    debtName: 'Visa',
    amountPaid: 25,
    totalDebtPaid: 100,
    totalDebtOriginal: 1000,
    isFirstPayment: false,
    debtBalance: 500,
    debtOriginalBalance: 600,
    debtCreatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

const amount = (name: string) => screen.getByLabelText(`Amount for ${name}`) as HTMLInputElement;
const logButton = (name: string) => screen.getByRole('button', { name }) as HTMLButtonElement;

afterEach(() => {
  vi.clearAllMocks();
});

describe('parseAmount', () => {
  it('accepts positive amounts, rounded to cents', () => {
    expect(parseAmount('25')).toBe(25);
    expect(parseAmount(' 310.556 ')).toBe(310.56);
    expect(parseAmount('.5')).toBe(0.5);
  });

  it('rejects empty, zero, negative and non-numbers', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('0')).toBeNull();
    expect(parseAmount('-5')).toBeNull();
    expect(parseAmount('1,000')).toBeNull();
    expect(parseAmount('0.004')).toBeNull();
    expect(parseAmount('.001')).toBeNull();
    expect(parseAmount('1e3')).toBeNull();
    expect(parseAmount('0x10')).toBeNull();
  });
});

describe('BulkLogSheet', () => {
  it('pre-fills each payment at its minimum, all checked', () => {
    setup();
    expect(screen.getByRole('dialog', { name: 'Log Sep payments' })).toBeTruthy();
    expect(amount('Visa').value).toBe('25.00');
    expect(amount('Car loan').value).toBe('310.50');
    expect((screen.getByLabelText('Visa') as HTMLInputElement).checked).toBe(true);
    expect(logButton('Log 2 payments').disabled).toBe(false);
  });

  it('logs the checked payments in order for the given month, then closes', async () => {
    const { mutateAsync, onClose } = setup();
    fireEvent.change(amount('Car loan'), { target: { value: '400' } });
    fireEvent.click(logButton('Log 2 payments'));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mutateAsync.mock.calls.map(([args]) => args)).toEqual([
      { debtId: 'a', amount: 25, dueYear: 2026, dueMonth: 8, celebrate: false },
      { debtId: 'b', amount: 400, dueYear: 2026, dueMonth: 8, celebrate: false },
    ]);
    expect(track).toHaveBeenCalledWith('bulk_log_submitted', { debt_count: 2 });
  });

  it('leaves an unchecked payment out', async () => {
    const { mutateAsync } = setup();
    fireEvent.click(screen.getByLabelText('Visa'));
    expect(amount('Visa').disabled).toBe(true);
    fireEvent.click(logButton('Log 1 payment'));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(mutateAsync.mock.calls[0][0]).toMatchObject({ debtId: 'b' });
  });

  it('blocks a checked payment without a positive amount', () => {
    setup();
    fireEvent.change(amount('Visa'), { target: { value: '0' } });
    expect(logButton('Log 2 payments').disabled).toBe(true);
    expect(screen.getByText('Each checked payment needs an amount above $0.')).toBeTruthy();
  });

  it('waits for each payment before starting the next', async () => {
    let release: () => void = () => {};
    const mutateAsync = vi.fn()
      .mockImplementationOnce(() => new Promise<void>((resolve) => { release = resolve; }))
      .mockResolvedValue({});
    const { onClose } = setup(mutateAsync);
    fireEvent.click(logButton('Log 2 payments'));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(logButton('Saving…').disabled).toBe(true);
    await act(async () => { release(); });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mutateAsync).toHaveBeenCalledTimes(2);
  });

  it('stops at the first failure, drops what logged and names the debt', async () => {
    const mutateAsync = vi.fn().mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('offline'));
    const { onClose } = setup(mutateAsync);
    fireEvent.click(logButton('Log 2 payments'));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain("Car loan didn't save.");
    expect(screen.queryByLabelText('Visa')).toBeNull();
    expect(logButton('Log 1 payment').disabled).toBe(false);
    expect(track).toHaveBeenCalledWith('bulk_log_submitted', { debt_count: 1 });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('fires one celebration for the batch, not one per payment', async () => {
    const mutateAsync = vi.fn()
      .mockResolvedValueOnce({ celebration: payload({ debtId: 'a', amountPaid: 25, debtBalance: 500 }) })
      .mockResolvedValueOnce({
        celebration: payload({ debtId: 'b', debtName: 'Car loan', amountPaid: 310.5, debtBalance: 0 }),
      });
    const { onClose } = setup(mutateAsync);

    fireEvent.click(logButton('Log 2 payments'));
    await waitFor(() => expect(onClose).toHaveBeenCalled());

    expect(mutateAsync.mock.calls.every(([args]) => args.celebrate === false)).toBe(true);
    expect(fireCelebration).toHaveBeenCalledTimes(1);
    // Car loan was paid off, so it carries the batch.
    expect(fireCelebration).toHaveBeenCalledWith(
      expect.objectContaining({ debtId: 'b', alsoLoggedCount: 1 }),
    );
  });

  it('still celebrates what saved when a later payment fails', async () => {
    const mutateAsync = vi.fn()
      .mockResolvedValueOnce({ celebration: payload({ debtId: 'a' }) })
      .mockRejectedValueOnce(new Error('offline'));
    setup(mutateAsync);

    fireEvent.click(logButton('Log 2 payments'));
    await screen.findByRole('alert');

    expect(fireCelebration).toHaveBeenCalledTimes(1);
    expect(fireCelebration).toHaveBeenCalledWith(
      expect.objectContaining({ debtId: 'a', alsoLoggedCount: 0 }),
    );
  });

  it('celebrates once for the sheet even when a retry follows a failure', async () => {
    const mutateAsync = vi.fn()
      .mockResolvedValueOnce({ celebration: payload({ debtId: 'a' }) })
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ celebration: payload({ debtId: 'b', debtName: 'Car loan' }) });
    const { onClose } = setup(mutateAsync);

    fireEvent.click(logButton('Log 2 payments'));
    await screen.findByRole('alert');
    expect(fireCelebration).toHaveBeenCalledTimes(1);

    // Visa saved, so only Car loan is left to retry.
    fireEvent.click(logButton('Log 1 payment'));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(fireCelebration).toHaveBeenCalledTimes(1);
  });

  it('does not count a month that was already marked paid', async () => {
    const mutateAsync = vi.fn()
      .mockResolvedValueOnce({ celebration: payload({ debtId: 'a' }) })
      .mockResolvedValueOnce({ alreadyMarked: true });
    const { onClose } = setup(mutateAsync);

    fireEvent.click(logButton('Log 2 payments'));
    await waitFor(() => expect(onClose).toHaveBeenCalled());

    // One real payment, one server-side no-op: the batch logged one.
    expect(track).toHaveBeenCalledWith('bulk_log_submitted', { debt_count: 1 });
    expect(fireCelebration).toHaveBeenCalledWith(
      expect.objectContaining({ debtId: 'a', alsoLoggedCount: 0 }),
    );
  });

  it('skips the celebration when a saved payment yielded no payload', async () => {
    // Second row saves but its debt is absent from the debts cache, so
    // useMarkPaid returns no payload and the batch totals would be short.
    const mutateAsync = vi.fn()
      .mockResolvedValueOnce({ celebration: payload({ debtId: 'a' }) })
      .mockResolvedValueOnce({});
    const { onClose } = setup(mutateAsync);

    fireEvent.click(logButton('Log 2 payments'));
    await waitFor(() => expect(onClose).toHaveBeenCalled());

    // Both payments still saved and still counted.
    expect(track).toHaveBeenCalledWith('bulk_log_submitted', { debt_count: 2 });
    expect(fireCelebration).not.toHaveBeenCalled();
  });

  it('celebrates nothing when no payment saved', async () => {
    const mutateAsync = vi.fn().mockRejectedValue(new Error('offline'));
    setup(mutateAsync);

    fireEvent.click(logButton('Log 2 payments'));
    await screen.findByRole('alert');

    expect(fireCelebration).not.toHaveBeenCalled();
  });
});

describe('batchCelebration', () => {
  it('has nothing to say about an empty batch', () => {
    expect(batchCelebration([])).toBeNull();
  });

  it('counts no others for a lone payment', () => {
    expect(batchCelebration([payload()])).toMatchObject({ debtId: 'a', alsoLoggedCount: 0 });
  });

  it('prefers a debt the batch paid off over a larger payment', () => {
    const one = batchCelebration([
      payload({ debtId: 'big', amountPaid: 500, debtBalance: 200 }),
      payload({ debtId: 'cleared', amountPaid: 25, debtBalance: 0 }),
    ]);
    expect(one).toMatchObject({ debtId: 'cleared', alsoLoggedCount: 1 });
  });

  it('picks the largest payment when nothing was paid off', () => {
    const one = batchCelebration([
      payload({ debtId: 'small', amountPaid: 25, debtBalance: 100 }),
      payload({ debtId: 'large', amountPaid: 310.5, debtBalance: 900 }),
      payload({ debtId: 'middle', amountPaid: 90, debtBalance: 400 }),
    ]);
    expect(one).toMatchObject({ debtId: 'large', alsoLoggedCount: 2 });
  });

  it('re-derives the total paid across the whole batch', () => {
    const one = batchCelebration([
      payload({ debtId: 'first', amountPaid: 500, totalDebtPaid: 600, debtBalance: 0 }),
      payload({ debtId: 'second', amountPaid: 310.5, totalDebtPaid: 1100, debtBalance: 40 }),
    ]);
    // 'first' wins on the payoff, but its own snapshot (600) was taken before
    // the second payment. The batch started from 100 and moved 810.50.
    expect(one).toMatchObject({ debtId: 'first', totalDebtPaid: 910.5 });
    // Milestone detection subtracts this to recover the prior total, so it has
    // to be everything the batch paid, not just the winner's 500.
    expect(one).toMatchObject({ batchAmountPaid: 810.5 });
  });

  it("keeps the batch's first-payment milestone when a later payment wins", () => {
    // Logging one payment refetches the payments query, so only the first
    // payload can report isFirstPayment; the winner here is the second.
    const one = batchCelebration([
      payload({ debtId: 'first', amountPaid: 25, isFirstPayment: true }),
      payload({ debtId: 'bigger', amountPaid: 900, isFirstPayment: false }),
    ]);
    expect(one).toMatchObject({ debtId: 'bigger', isFirstPayment: true });
  });

  it('does not invent a first payment for a batch that has none', () => {
    const one = batchCelebration([
      payload({ debtId: 'a', isFirstPayment: false }),
      payload({ debtId: 'b', amountPaid: 900, isFirstPayment: false }),
    ]);
    expect(one).toMatchObject({ isFirstPayment: false });
  });

  it('says nothing when a saved payment produced no payload', () => {
    // A debt missing from the cache is absent from both the starting total and
    // the batch sum, so every figure below it would be short.
    expect(batchCelebration([payload()], 3)).toBeNull();
    expect(batchCelebration([payload(), payload({ debtId: 'b' })], 3)).toBeNull();
  });

  it('celebrates when every saved payment produced a payload', () => {
    expect(batchCelebration([payload()], 1)).toMatchObject({ alsoLoggedCount: 0 });
    expect(batchCelebration([payload(), payload({ debtId: 'b' })], 2)).toMatchObject({
      alsoLoggedCount: 1,
    });
  });

  it('picks the largest among the paid-off debts, ties keeping log order', () => {
    const one = batchCelebration([
      payload({ debtId: 'first', amountPaid: 100, debtBalance: 0 }),
      payload({ debtId: 'second', amountPaid: 100, debtBalance: 0 }),
    ]);
    expect(one).toMatchObject({ debtId: 'first', alsoLoggedCount: 1 });
  });
});

// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import BulkLogSheet, { parseAmount } from '@/components/dashboard-v2/sheets/BulkLogSheet';
import { useMarkPaid } from '@/lib/hooks';
import { track } from '@/lib/analytics';

vi.mock('@/lib/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/hooks')>()),
  useMarkPaid: vi.fn(),
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
      { debtId: 'a', amount: 25, dueYear: 2026, dueMonth: 8 },
      { debtId: 'b', amount: 400, dueYear: 2026, dueMonth: 8 },
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
});

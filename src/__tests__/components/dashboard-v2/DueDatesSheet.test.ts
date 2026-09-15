// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import DueDatesSheet from '@/components/dashboard-v2/sheets/DueDatesSheet';
import { useUpdateDebt } from '@/lib/hooks';

vi.mock('@/lib/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/hooks')>()),
  useUpdateDebt: vi.fn(),
}));

const DEBTS = [{ id: 'a', name: 'Visa' }, { id: 'b', name: 'Car loan' }];

function setup(mutateAsync = vi.fn().mockResolvedValue({})) {
  vi.mocked(useUpdateDebt).mockReturnValue({ mutateAsync } as unknown as ReturnType<typeof useUpdateDebt>);
  const onClose = vi.fn();
  render(createElement(DueDatesSheet, { debts: DEBTS, onClose }));
  return { mutateAsync, onClose };
}

const pick = (name: string, day: string) => fireEvent.change(screen.getByLabelText(name), { target: { value: day } });

afterEach(() => {
  vi.clearAllMocks();
});

describe('DueDatesSheet', () => {
  it('offers a day picker per debt and waits for a choice', () => {
    setup();
    expect((screen.getByLabelText('Visa') as HTMLSelectElement).value).toBe('');
    expect(screen.getAllByRole('option', { name: '31st' })).toHaveLength(2);
    expect((screen.getByRole('button', { name: 'Save due dates' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('saves only the chosen days, then closes', async () => {
    const { mutateAsync, onClose } = setup();
    pick('Car loan', '15');
    fireEvent.click(screen.getByRole('button', { name: 'Save 1 due date' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mutateAsync.mock.calls).toEqual([[{ id: 'b', updates: { dueDate: 15 } }]]);
  });

  it('writes one debt at a time, in order', async () => {
    let release: () => void = () => {};
    const mutateAsync = vi.fn()
      .mockImplementationOnce(() => new Promise<void>((resolve) => { release = resolve; }))
      .mockResolvedValue({});
    const { onClose } = setup(mutateAsync);
    pick('Visa', '3');
    pick('Car loan', '20');
    fireEvent.click(screen.getByRole('button', { name: 'Save 2 due dates' }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeTruthy();
    await act(async () => { release(); });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mutateAsync.mock.calls.map(([arg]) => arg)).toEqual([
      { id: 'a', updates: { dueDate: 3 } },
      { id: 'b', updates: { dueDate: 20 } },
    ]);
  });

  it('stops at the first failure, drops what saved and names the debt', async () => {
    const mutateAsync = vi.fn().mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('offline'));
    const { onClose } = setup(mutateAsync);
    pick('Visa', '3');
    pick('Car loan', '20');
    fireEvent.click(screen.getByRole('button', { name: 'Save 2 due dates' }));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain("Car loan didn't save.");
    expect(screen.queryByLabelText('Visa')).toBeNull();
    expect((screen.getByLabelText('Car loan') as HTMLSelectElement).value).toBe('20');
    expect(onClose).not.toHaveBeenCalled();
  });
});

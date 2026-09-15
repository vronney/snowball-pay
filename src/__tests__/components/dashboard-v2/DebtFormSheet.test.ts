// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useCreateDebt } from '@/lib/hooks';
import { track, Events } from '@/lib/analytics';
import DebtFormSheet from '@/components/dashboard-v2/debts/DebtFormSheet';

vi.mock('@/components/DebtForm', async () => {
  const { createElement: h } = await import('react');
  return {
    default: (p: { onSubmit: (data: unknown) => void; onCancel: () => void }) =>
      h('div', null,
        h('button', {
          type: 'button',
          onClick: () => p.onSubmit({ name: 'Store card', category: 'Credit Card', balance: 1200, interestRate: 24.99, minimumPayment: 40 }),
        }, 'Submit form'),
        h('button', { type: 'button', onClick: p.onCancel }, 'Cancel form')),
  };
});
vi.mock('@/lib/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/hooks')>()),
  useCreateDebt: vi.fn(),
}));
vi.mock('@/lib/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/analytics')>()),
  track: vi.fn(),
}));

const NOTICE = 'On Free, your plan counts 5 debts. This one will be saved outside it.';

function renderSheet(notice: string | null, mutateAsync = vi.fn().mockResolvedValue({ debt: { id: 'd1' } })) {
  vi.mocked(useCreateDebt).mockReturnValue({ mutateAsync, isPending: false } as unknown as ReturnType<typeof useCreateDebt>);
  const onClose = vi.fn();
  render(createElement(DebtFormSheet, { notice, onClose }));
  return { mutateAsync, onClose };
}

afterEach(() => vi.clearAllMocks());

describe('DebtFormSheet', () => {
  it('opts in to saving past the Free cap, then closes', async () => {
    const { mutateAsync, onClose } = renderSheet(null);
    fireEvent.click(screen.getByRole('button', { name: 'Submit form' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ name: 'Store card', allowOutsidePlan: true }));
    expect(track).toHaveBeenCalledWith(Events.DEBT_ADDED, { category: 'Credit Card' });
    expect(track).not.toHaveBeenCalledWith(Events.DEBT_SAVED_OUTSIDE_PLAN);
  });

  it('records a save outside the plan', async () => {
    const { onClose } = renderSheet(NOTICE, vi.fn().mockResolvedValue({ debt: { id: 'd1' }, outsidePlan: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit form' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(track).toHaveBeenCalledWith(Events.DEBT_SAVED_OUTSIDE_PLAN);
  });

  it('says up front when the debt will be saved outside the plan', () => {
    renderSheet(NOTICE);
    const dialog = screen.getByRole('dialog', { name: 'Add a debt' });
    expect(within(dialog).getByText(NOTICE)).toBeTruthy();
  });

  it('keeps the form open with an error when the save fails', async () => {
    const { onClose } = renderSheet(null, vi.fn().mockRejectedValue(new Error('boom')));
    fireEvent.click(screen.getByRole('button', { name: 'Submit form' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes from the form's cancel", () => {
    const { onClose } = renderSheet(null);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel form' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

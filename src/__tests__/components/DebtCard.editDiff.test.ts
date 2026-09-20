// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Debt } from '@/types';

// vi.mock factories are hoisted above imports, so anything they reference
// must be hoisted too.
const { updateMutateAsync, idleMutation } = vi.hoisted(() => ({
  updateMutateAsync: vi.fn().mockResolvedValue({}),
  idleMutation: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
}));

vi.mock('@/lib/hooks', () => ({
  useAddBulkSnapshots: idleMutation,
  useUpdateDebt: () => ({ mutateAsync: updateMutateAsync, isPending: false }),
  useMarkPaid: idleMutation,
  useSubscription: () => ({ data: undefined }),
}));
vi.mock('@/lib/hooks/useRefreshDebtFromPlaid', () => ({ useRefreshDebtFromPlaid: idleMutation }));
vi.mock('@/lib/hooks/useDisconnectPlaidItem', () => ({ useDisconnectPlaidItem: idleMutation }));
vi.mock('@/components/plaid/PlaidReauthBanner', () => ({ PlaidReauthBanner: () => null }));
vi.mock('@/components/debt/DebtPaidOffModal', () => ({ DebtPaidOffModal: () => null }));

import DebtCard from '@/components/DebtCard';

const debt: Debt = {
  id: 'd1',
  userId: 'u1',
  name: 'Discover',
  category: 'Credit Card',
  balance: 10691.17,
  originalBalance: 10691.17,
  interestRate: 26.49,
  minimumPayment: 250,
  creditLimit: 0,
  createdAt: new Date('2026-09-19T14:22:16Z'),
  updatedAt: new Date('2026-09-19T14:22:16Z'),
};

function renderCard(d: Debt) {
  return render(createElement(DebtCard, { debt: d, allDebts: [d], onDelete: vi.fn() }));
}

describe('DebtCard edit panel', () => {
  beforeEach(() => updateMutateAsync.mockClear());

  it('PATCHes only the fields the user changed, never the seeded balance', async () => {
    const { rerender } = renderCard(debt);
    fireEvent.click(screen.getByTitle('Edit debt'));

    // A payment lands while the panel is open: the live debt drops, the open
    // form still shows the balance it was seeded with.
    const afterPayment = { ...debt, balance: 10222.3 };
    rerender(createElement(DebtCard, { debt: afterPayment, allDebts: [afterPayment], onDelete: vi.fn() }));

    fireEvent.change(screen.getByPlaceholderText('15'), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/ }));

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1));
    expect(updateMutateAsync).toHaveBeenCalledWith({ id: 'd1', updates: { dueDate: 20 } });
  });

  it('makes no request when the form is saved untouched', async () => {
    renderCard(debt);
    fireEvent.click(screen.getByTitle('Edit debt'));
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/ }));

    // The panel closes without a PATCH.
    await waitFor(() => expect(screen.queryByRole('button', { name: /Save Changes/ })).toBeNull());
    expect(updateMutateAsync).not.toHaveBeenCalled();
  });

  it('still sends a balance the user deliberately changed', async () => {
    renderCard(debt);
    fireEvent.click(screen.getByTitle('Edit debt'));
    fireEvent.change(screen.getByPlaceholderText('5000'), { target: { value: '9800' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/ }));

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1));
    expect(updateMutateAsync).toHaveBeenCalledWith({ id: 'd1', updates: { balance: 9800 } });
  });
});

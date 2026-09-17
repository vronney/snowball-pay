// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import { useDebts } from '@/lib/hooks';
import { AprNegotiationCard, type AprOpenRequest } from '@/components/AprNegotiationCard';
import { makeDebt } from '../lib/dashboard/fixtures';

vi.mock('@/lib/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/hooks')>()),
  useDebts: vi.fn(),
}));

const CARDS = [
  makeDebt({ id: 'citi', name: 'Citi', category: 'Credit Card', balance: 4_000, minimumPayment: 120, interestRate: 28 }),
  makeDebt({ id: 'amex', name: 'Amex', category: 'Credit Card', balance: 2_000, minimumPayment: 60, interestRate: 22 }),
];

function renderCard(openRequest?: AprOpenRequest | null) {
  vi.mocked(useDebts).mockReturnValue({ data: { debts: CARDS }, isLoading: false, isError: false } as unknown as ReturnType<typeof useDebts>);
  // jsdom has no scrollIntoView.
  Element.prototype.scrollIntoView = vi.fn();
  const props: { openRequest?: AprOpenRequest | null } = openRequest === undefined ? {} : { openRequest };
  render(createElement<{ openRequest?: AprOpenRequest | null }>(AprNegotiationCard, props));
}

afterEach(() => vi.clearAllMocks());

describe('AprNegotiationCard.openRequest (dashboard v2 Coach, PR 5)', () => {
  it('stays collapsed on the highest-APR card without a request (v1)', () => {
    renderCard();
    expect(screen.queryByRole('button', { name: /Amex · 22% APR/ })).toBeNull();
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('selects the requested card, expands, and scrolls into view', async () => {
    renderCard({ debtId: 'amex', nonce: 1 });
    const amex = await screen.findByRole('button', { name: /Amex · 22% APR/ });
    expect(amex.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: /Citi · 28% APR/ }).getAttribute('aria-pressed')).toBe('false');
    await vi.waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1));
  });
});

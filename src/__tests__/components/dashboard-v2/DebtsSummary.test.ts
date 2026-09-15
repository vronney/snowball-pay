// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import DebtsSummary from '@/components/dashboard-v2/debts/DebtsSummary';

describe('DebtsSummary', () => {
  it('shows the counted and not-counted totals, the outside one dashed', () => {
    render(createElement(DebtsSummary, { view: { pill: '3 of 5 counted', counted: '$10,000.50', notCounted: '$4,910.25' } }));
    expect(screen.getByText('Counted').parentElement?.textContent).toContain('$10,000.50');
    const notCounted = screen.getByText('Not counted').parentElement;
    expect(notCounted?.textContent).toContain('$4,910.25');
    expect(notCounted?.className).toContain('border-dashed');
  });
});

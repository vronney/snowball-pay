// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import CompactDebtRow from '@/components/debt/CompactDebtRow';
import { makeDebt } from '../../lib/dashboard/fixtures';

const BASE = {
  isFocus: false,
  paidThisMonth: false,
  defaultOpen: false,
  forceOpen: false,
  children: createElement('div', null, 'card'),
};

describe('CompactDebtRow', () => {
  it('renders an in-plan row as before: solid border, no plan label', () => {
    render(createElement(CompactDebtRow, { ...BASE, debt: makeDebt({ id: 'a', name: 'Visa', balance: 900, minimumPayment: 25 }) }));
    expect(screen.getByRole('button', { expanded: false }).getAttribute('style')).toContain('solid');
    expect(screen.queryByText('Not in plan')).toBeNull();
  });

  it('marks a debt saved outside the plan: dashed, labeled (spec §8.5)', () => {
    render(createElement(CompactDebtRow, {
      ...BASE,
      outsidePlan: true,
      debt: makeDebt({ id: 'x', name: 'Store card', balance: 1_200, minimumPayment: 35, inPlan: false }),
    }));
    expect(screen.getByRole('button', { expanded: false }).getAttribute('style')).toContain('dashed');
    expect(screen.getByText('Not in plan')).toBeTruthy();
  });

  it('keeps the label when expanded', () => {
    render(createElement(CompactDebtRow, {
      ...BASE,
      defaultOpen: true,
      outsidePlan: true,
      debt: makeDebt({ id: 'x', name: 'Store card', balance: 1_200, minimumPayment: 35, inPlan: false }),
    }));
    expect(screen.getByText('Not in plan')).toBeTruthy();
    expect(screen.getByText('card')).toBeTruthy();
  });
});

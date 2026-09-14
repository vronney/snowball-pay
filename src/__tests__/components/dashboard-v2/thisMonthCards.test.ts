// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReadinessView } from '@/lib/dashboard/thisMonth';
import ReadinessCard from '@/components/dashboard-v2/this-month/ReadinessCard';
import InterestMeter from '@/components/dashboard-v2/this-month/InterestMeter';
import DebtFreeHero from '@/components/dashboard-v2/this-month/DebtFreeHero';
import RateWatchCard from '@/components/dashboard-v2/this-month/RateWatchCard';

const READINESS: ReadinessView = {
  title: 'Your plan is 60% set up',
  counter: '3 of 5',
  percent: 60,
  chips: [
    { id: 'debts', label: 'Debts', complete: true },
    { id: 'income', label: 'Income', complete: true },
    { id: 'expenses', label: 'Expenses', complete: true },
    { id: 'dueDates', label: 'Due dates', complete: false },
    { id: 'firstPayment', label: 'First payment', complete: false },
  ],
  cta: { step: 'dueDates', label: 'Add 2 due dates' },
};

describe('ReadinessCard', () => {
  it('shows the title, the blue counter, the meter and labelled chips', () => {
    render(createElement(ReadinessCard, { view: READINESS, onStep: vi.fn() }));
    expect(screen.getByRole('heading', { name: 'Your plan is 60% set up' })).toBeTruthy();
    expect(screen.getByText('3 of 5').className).toContain('text-action');
    const bar = screen.getByRole('progressbar', { name: 'Your plan is 60% set up' });
    expect(bar.getAttribute('aria-valuenow')).toBe('60');
    expect((bar.firstElementChild as HTMLElement).style.width).toBe('60%');
    expect(screen.getByRole('button', { name: 'Debts, done' }).className).toContain('text-success-text');
    expect(screen.getByRole('button', { name: 'Due dates, to do' })).toBeTruthy();
  });

  it('reports CTA and chip presses separately', () => {
    const onStep = vi.fn();
    render(createElement(ReadinessCard, { view: READINESS, onStep }));
    fireEvent.click(screen.getByRole('button', { name: 'Add 2 due dates' }));
    fireEvent.click(screen.getByRole('button', { name: 'Income, done' }));
    expect(onStep.mock.calls).toEqual([['dueDates', 'cta'], ['income', 'chip']]);
  });

  it('puts the CTA on ink with a 46px mobile target', () => {
    render(createElement(ReadinessCard, { view: READINESS, onStep: vi.fn() }));
    const cta = screen.getByRole('button', { name: 'Add 2 due dates' });
    expect(cta.className).toContain('bg-ink');
    expect(cta.className).toContain('min-h-[46px]');
    expect(cta.className).toContain('rounded-lg');
  });
});

describe('InterestMeter', () => {
  it('states the estimate, the average, and splits the bar', () => {
    const { container } = render(createElement(InterestMeter, {
      view: { figure: '$840', avgLine: '≈$278/mo your plan saves vs minimums (avg)', lenderShare: 75 },
    }));
    expect(screen.getByRole('heading', { name: 'Interest going to lenders this month' })).toBeTruthy();
    expect(screen.getByText('$840').className).toContain('text-danger');
    expect(screen.getByText('est.')).toBeTruthy();
    expect(screen.getByText('≈$278/mo your plan saves vs minimums (avg)')).toBeTruthy();
    expect((container.querySelector('[data-meter="lenders"]') as HTMLElement).style.width).toBe('75%');
  });

  it('shows only the estimate without an average', () => {
    const { container } = render(createElement(InterestMeter, { view: { figure: '$50', avgLine: null, lenderShare: null } }));
    expect(container.querySelector('[data-meter="lenders"]')).toBeNull();
    expect(screen.queryByText(/your plan saves/)).toBeNull();
  });
});

describe('DebtFreeHero', () => {
  it('shows the date, the time to go (not blue) and the paid-off ring', () => {
    render(createElement(DebtFreeHero, { view: { dateLabel: 'April 2029', toGo: '2y 7m to go', paidPct: 5 } }));
    expect(screen.getByRole('heading', { name: 'Debt-free by' })).toBeTruthy();
    expect(screen.getByText('April 2029')).toBeTruthy();
    expect(screen.getByText('2y 7m to go').className).not.toContain('text-action');
    expect(screen.getByRole('img', { name: '5% paid off' })).toBeTruthy();
  });
});

describe('RateWatchCard', () => {
  it('shows the yearly estimate in green text, labelled as an estimate', () => {
    render(createElement(RateWatchCard, {
      view: { eyebrow: 'Rate watch · 3 cards', figure: '$1,656/yr', caption: 'est. if your cards drop to their target rates' },
    }));
    expect(screen.getByRole('heading', { name: 'Rate watch · 3 cards' })).toBeTruthy();
    expect(screen.getByText('$1,656/yr').className).toContain('text-success-text');
    expect(screen.getByText('est. if your cards drop to their target rates')).toBeTruthy();
  });
});

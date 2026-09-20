import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ResultsPanel from '@/components/calculator/ResultsPanel';
import type { PayoffResult } from '@/lib/snowball';

vi.mock('@/lib/analytics', () => ({
  track: vi.fn(),
  Events: {
    CALCULATOR_RESULT_VIEWED: 'calculator_result_viewed',
    CALCULATOR_USED: 'calculator_used',
    CALCULATOR_SAVE_CLICKED: 'calculator_save_clicked',
  },
}));
vi.mock('@/components/payoff/BalanceOverTimeChart', () => ({ default: () => null }));
vi.mock('@/components/calculator/SavePlanModal', () => ({ default: () => null }));

const planResult = {
  months: 68,
  debtFreeDate: new Date(2032, 4, 1),
  totalInterestPaid: 14837.79,
  monthlyPayment: 1140,
  payoffSchedule: [{}, {}, {}],
} as unknown as PayoffResult;

/** Static markup of the results card for the given sample-mode flag. */
function render(sampleMode: boolean) {
  return renderToStaticMarkup(
    createElement(ResultsPanel, {
      planResult,
      balanceChartData: [],
      interestSaved: 15525.03,
      effectiveAccel: 200,
      showMinimumsLine: true,
      timeStr: '5y 8m',
      hasInteracted: false,
      sampleMode,
    }),
  );
}

describe('ResultsPanel sample copy', () => {
  it('presents the pre-filled result as the visitor’s own projection, with the debt count', () => {
    const html = render(true);
    expect(html).not.toContain('Sample scenario');
    expect(html).toContain('Your projected result');
    expect(html).toContain('based on the 3 debts in this plan');
    expect(html).toContain('Change any number and it updates instantly');
  });

  it('drops the note once the visitor has made the numbers their own', () => {
    const html = render(false);
    expect(html).not.toContain('Your projected result');
    expect(html).not.toContain('Sample scenario');
  });

  it('renders the two money figures and the helper line at AA contrast', () => {
    const html = render(true);
    // Total interest (was #f59e0b, 2.05:1) and vs Minimums (was #22c55e, 2.17:1).
    expect(html).toContain('color:#b45309">$14,837.79');
    expect(html).toContain('color:#15803d">−$15,525.03');
    // Helper under the CTA (was #94a3b8, 2.56:1).
    expect(html).toContain('color:#64748b">Free account');
    for (const legacy of ['#f59e0b', '#22c55e', '#94a3b8']) expect(html).not.toContain(legacy);
  });
});

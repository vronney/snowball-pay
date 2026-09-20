import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import BudgetPanel from '@/components/calculator/BudgetPanel';

type BudgetPanelProps = Parameters<typeof BudgetPanel>[0];

/** Static markup of the budget card with the calculator's seeded numbers. */
function render(overrides: Partial<BudgetPanelProps> = {}) {
  return renderToStaticMarkup(
    createElement(BudgetPanel, {
      takeHome: '5200',
      essential: '2400',
      extra: '200',
      takeHomeNum: 5200,
      essentialNum: 2400,
      totalMinPayments: 640,
      availableForDebt: 2160,
      extraNum: 200,
      onTakeHomeChange: vi.fn(),
      onEssentialChange: vi.fn(),
      onExtraChange: vi.fn(),
      ...overrides,
    }),
  );
}

describe('BudgetPanel accessibility and contrast', () => {
  it('names the extra-payment slider so screen readers announce the primary control', () => {
    const html = render();
    expect(html).toMatch(/<label[^>]*for="budget-extra"[^>]*>Extra Monthly Payment Toward Debt<\/label>/);
    const range = html.match(/<input[^>]*type="range"[^>]*>/)?.[0] ?? '';
    expect(range).toContain('id="budget-extra"');
    expect(range).toContain('aria-valuetext="$200.00 per month"');
  });

  it('renders the cash-flow figures and slider bounds at AA contrast', () => {
    const html = render();
    // Essentials and minimums (was #f87171, 2.64:1).
    expect(html).toContain('color:#b91c1c">−$2,400.00');
    expect(html).toContain('color:#b91c1c">−$640.00');
    // Available for extra (was #34d399, 1.83:1) uses the success-text token.
    expect(html).toContain('color:#15803d"><span>Available for extra</span>');
    // Slider bounds (was #94a3b8, 2.56:1).
    expect(html).toContain('color:#64748b"><span>$0</span>');
    for (const legacy of ['#f87171', '#34d399', '#94a3b8']) expect(html).not.toContain(legacy);
  });

  it('keeps the shortfall state red when nothing is left for extra payments', () => {
    const html = render({ availableForDebt: -100, extraNum: 0 });
    expect(html).toContain('color:#b91c1c"><span>Available for extra</span>');
    expect(html).toContain('color:#64748b">$0.00 / mo extra');
  });
});

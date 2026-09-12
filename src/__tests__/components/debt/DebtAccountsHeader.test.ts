import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Collapsible } from '@/components/ui/collapsible';
import DebtAccountsHeader, { type DebtAccountsHeaderProps } from '@/components/debt/DebtAccountsHeader';

const BASE: DebtAccountsHeaderProps = {
  open: true,
  debtCount: 4,
  activeDebtCount: 3,
  loggedCount: 2,
  showAddButton: true,
  showFreeCount: false,
  onAddDebt: vi.fn(),
};

function render(props: Partial<DebtAccountsHeaderProps> = {}): string {
  const merged = { ...BASE, ...props };
  return renderToStaticMarkup(
    createElement(Collapsible, { open: merged.open }, createElement(DebtAccountsHeader, merged)),
  );
}

/** Deepest <button> nesting in the markup: 1 = no button inside another button. */
function maxButtonDepth(html: string): number {
  let depth = 0;
  let max = 0;
  for (const match of html.matchAll(/<\/?button\b/g)) {
    depth += match[0].startsWith('</') ? -1 : 1;
    max = Math.max(max, depth);
  }
  return max;
}

describe('DebtAccountsHeader', () => {
  it('never nests a <button> inside another <button> (invalid HTML, hydration error)', () => {
    expect(maxButtonDepth(render())).toBe(1);
    expect(maxButtonDepth(render({ showFreeCount: true }))).toBe(1);
  });

  it('keeps the Add debt button, and hides it while the form is open', () => {
    expect(render()).toContain('aria-label="Add debt"');
    expect(render({ showAddButton: false })).not.toContain('aria-label="Add debt"');
  });

  it('still toggles the accounts list from the header', () => {
    const html = render();
    expect(html).toContain('Your debt accounts');
    expect(html).toMatch(/aria-expanded="true"/);
    expect(render({ open: false })).toMatch(/aria-expanded="false"/);
  });

  it('shows the logged chip only when there are active debts', () => {
    expect(render()).toContain('2/3 logged');
    expect(render({ loggedCount: 3 })).toContain('3/3 logged ✓');
    expect(render({ activeDebtCount: 0, loggedCount: 0 })).not.toContain('logged');
  });

  it('shows the Free debt count only when asked', () => {
    expect(render({ showFreeCount: true })).toContain('4/5 on Free');
    expect(render()).not.toContain('on Free');
  });
});

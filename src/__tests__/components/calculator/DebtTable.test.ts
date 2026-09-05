import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import DebtTable from '@/components/calculator/DebtTable';
import type { DebtRow } from '@/components/calculator/PublicCalculator';

const rows: DebtRow[] = [
  { id: 'row-a', name: 'Visa', balance: '5000', rate: '19.99', minimum: '100' },
  { id: 'row-b', name: '', balance: '', rate: '', minimum: '' },
];

function render(props: Partial<Parameters<typeof DebtTable>[0]> = {}) {
  return renderToStaticMarkup(
    createElement(DebtTable, {
      rows,
      onRowChange: vi.fn(),
      onRowBlur: vi.fn(),
      onRowRemove: vi.fn(),
      onRowAdd: vi.fn(),
      ...props,
    }),
  );
}

describe('DebtTable', () => {
  it('hides the sample reset while the rows still are the sample', () => {
    expect(render()).not.toContain('Reset to sample numbers');
  });

  it('offers "Reset to sample numbers" once the rows have been edited', () => {
    expect(render({ onResetToSample: vi.fn() })).toContain('Reset to sample numbers');
  });

  it('gives each balance field a stable id on both layouts so it can be focused', () => {
    const html = render();
    // Mobile card (< md) and desktop table (≥ md) both render the row.
    expect(html).toContain('id="row-a-balance"');
    expect(html).toContain('id="row-a-balance-desktop"');
    expect(html).toContain('id="row-b-balance"');
    expect(html).toContain('id="row-b-balance-desktop"');
  });
});

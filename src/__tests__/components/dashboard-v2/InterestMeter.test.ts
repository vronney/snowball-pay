// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import InterestMeter from '@/components/dashboard-v2/this-month/InterestMeter';

const view = { figure: '$840', avgLine: '≈$278/mo your plan saves vs minimums (avg)', lenderShare: 75.1 };

describe('InterestMeter', () => {
  it('keeps the This Month figure size by default', () => {
    render(createElement(InterestMeter, { view }));
    expect(screen.getByText('$840').className).toContain('text-[36px]');
  });

  it('shrinks the figure in compact mode and keeps the labelled figures (Coach, spec §8.5)', () => {
    render(createElement(InterestMeter, { view, compact: true }));
    const figure = screen.getByText('$840');
    expect(figure.className).toContain('text-[32px]');
    expect(figure.className).not.toContain('text-[36px]');
    expect(screen.getByText('est.')).toBeTruthy();
    expect(screen.getByText(view.avgLine)).toBeTruthy();
  });
});

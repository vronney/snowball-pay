// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderHook } from '@testing-library/react';
import { useMeterValue } from '@/components/dashboard-v2/useMeterValue';

function Probe({ target }: { target: number }) {
  return createElement('span', null, String(useMeterValue(target)));
}

describe('useMeterValue', () => {
  it('draws 0 first, on the server and before mount, so the meter animates in', () => {
    expect(renderToStaticMarkup(createElement(Probe, { target: 60 }))).toBe('<span>0</span>');
  });

  it('lands on the value after mount and follows later values', () => {
    const { result, rerender } = renderHook(({ target }) => useMeterValue(target), { initialProps: { target: 60 } });
    expect(result.current).toBe(60);
    rerender({ target: 80 });
    expect(result.current).toBe(80);
  });
});

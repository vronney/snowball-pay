import { describe, expect, it } from 'vitest';
import { celebrationFallbackMessage } from '@/lib/celebrationCopy';

describe('celebrationFallbackMessage', () => {
  it('names the debt for a single payment', () => {
    expect(celebrationFallbackMessage('Visa')).toBe('Visa — payment logged.');
    expect(celebrationFallbackMessage('Visa', 0)).toBe('Visa — payment logged.');
  });

  it('counts the rest of a batch', () => {
    expect(celebrationFallbackMessage('Car loan', 1)).toBe('Car loan and 1 more — payments logged.');
    expect(celebrationFallbackMessage('Car loan', 3)).toBe('Car loan and 3 more — payments logged.');
  });

  it('claims nothing about progress', () => {
    const message = celebrationFallbackMessage('Visa', 2);
    expect(message).not.toMatch(/\$|%|saved|ahead|sooner/i);
  });
});

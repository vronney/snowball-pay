import { describe, expect, it } from 'vitest';
import { parseNumericInput, debtFieldError } from '@/lib/parseNumericInput';

describe('parseNumericInput', () => {
  it('parses plain integers and decimals', () => {
    expect(parseNumericInput('14200')).toBe(14200);
    expect(parseNumericInput('24.99')).toBe(24.99);
    expect(parseNumericInput('0')).toBe(0);
  });

  it('strips thousands commas', () => {
    expect(parseNumericInput('14,200')).toBe(14200);
    expect(parseNumericInput('1,234,567')).toBe(1234567);
  });

  it('strips currency symbols and surrounding whitespace', () => {
    expect(parseNumericInput('$14200')).toBe(14200);
    expect(parseNumericInput(' $14,200 ')).toBe(14200);
  });

  it('reads a lone comma as a decimal mark (European APR)', () => {
    expect(parseNumericInput('24,99')).toBe(24.99);
    expect(parseNumericInput('6,9')).toBe(6.9);
  });

  it('resolves mixed separators by the trailing decimal mark', () => {
    expect(parseNumericInput('1,234.56')).toBe(1234.56);
    expect(parseNumericInput('1.234,56')).toBe(1234.56);
  });

  it('returns null for empty or garbage input', () => {
    expect(parseNumericInput('')).toBeNull();
    expect(parseNumericInput('   ')).toBeNull();
    expect(parseNumericInput('abc')).toBeNull();
    expect(parseNumericInput('$')).toBeNull();
  });
});

describe('debtFieldError', () => {
  it('accepts well-formed comma / currency values', () => {
    expect(debtFieldError('balance', '14,200')).toBeNull();
    expect(debtFieldError('balance', '$14200')).toBeNull();
    expect(debtFieldError('rate', '24.99')).toBeNull();
    expect(debtFieldError('rate', '24,99')).toBeNull();
  });

  it('flags unparseable input with a format hint', () => {
    expect(debtFieldError('balance', 'abc')).toMatch(/14,200/);
    expect(debtFieldError('rate', 'twenty')).toMatch(/24\.99/);
  });

  it('rejects a non-positive balance', () => {
    expect(debtFieldError('balance', '0')).not.toBeNull();
    expect(debtFieldError('balance', '-5')).not.toBeNull();
  });

  it('stays quiet on empty optional fields', () => {
    expect(debtFieldError('rate', '')).toBeNull();
    expect(debtFieldError('minimum', '')).toBeNull();
  });

  it('asks for a balance only once the row is started', () => {
    expect(debtFieldError('balance', '', { rowStarted: false })).toBeNull();
    expect(debtFieldError('balance', '', { rowStarted: true })).toMatch(
      /balance/i,
    );
  });
});

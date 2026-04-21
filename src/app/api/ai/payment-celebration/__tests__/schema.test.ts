import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const RequestSchema = z.object({
  debtId:              z.string(),
  debtName:            z.string(),
  amountPaid:          z.number().positive(),
  totalDebtPaid:       z.number().min(0),
  totalDebtOriginal:   z.number().positive(),
  isFirstPayment:      z.boolean(),
  debtBalance:         z.number().min(0),
  debtOriginalBalance: z.number().positive(),
  debtCreatedAt:       z.string(),
});

describe('payment-celebration request schema', () => {
  const valid = {
    debtId:              'debt-abc',
    debtName:            'Chase Sapphire',
    amountPaid:          250,
    totalDebtPaid:       1250,
    totalDebtOriginal:   8000,
    isFirstPayment:      false,
    debtBalance:         3750,
    debtOriginalBalance: 5000,
    debtCreatedAt:       '2025-04-01T00:00:00.000Z',
  };

  it('accepts a valid payload', () => {
    expect(RequestSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects missing debtId', () => {
    const { debtId: _, ...rest } = valid;
    expect(RequestSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects negative amountPaid', () => {
    expect(RequestSchema.safeParse({ ...valid, amountPaid: -10 }).success).toBe(false);
  });

  it('rejects zero totalDebtOriginal', () => {
    expect(RequestSchema.safeParse({ ...valid, totalDebtOriginal: 0 }).success).toBe(false);
  });

  it('rejects negative debtBalance', () => {
    expect(RequestSchema.safeParse({ ...valid, debtBalance: -1 }).success).toBe(false);
  });

  it('rejects non-boolean isFirstPayment', () => {
    expect(RequestSchema.safeParse({ ...valid, isFirstPayment: 'yes' }).success).toBe(false);
  });
});

describe('payment-celebration response schema', () => {
  const ResponseSchema = z.object({
    message:        z.string().min(1).max(200),
    milestoneLabel: z.string().nullable(),
  });

  it('accepts a valid response with milestone', () => {
    expect(ResponseSchema.safeParse({ message: 'Great job!', milestoneLabel: 'first_payment' }).success).toBe(true);
  });

  it('accepts null milestoneLabel', () => {
    expect(ResponseSchema.safeParse({ message: 'Payment logged.', milestoneLabel: null }).success).toBe(true);
  });

  it('rejects empty message', () => {
    expect(ResponseSchema.safeParse({ message: '', milestoneLabel: null }).success).toBe(false);
  });

  it('rejects message over 200 chars', () => {
    expect(ResponseSchema.safeParse({ message: 'x'.repeat(201), milestoneLabel: null }).success).toBe(false);
  });
});

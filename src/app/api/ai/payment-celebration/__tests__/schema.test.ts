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
  monthsSaved:         z.number().optional(),
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

  it('accepts optional monthsSaved', () => {
    expect(RequestSchema.safeParse({ ...valid, monthsSaved: 3 }).success).toBe(true);
    expect(RequestSchema.safeParse({ ...valid, monthsSaved: undefined }).success).toBe(true);
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
    highlightStat:  z.string(),
  });

  const validResponse = {
    message:       'Great job!',
    milestoneLabel: 'first_payment',
    highlightStat:  '8% of Chase Sapphire paid',
  };

  it('accepts a valid response with milestone', () => {
    expect(ResponseSchema.safeParse(validResponse).success).toBe(true);
  });

  it('accepts null milestoneLabel', () => {
    expect(ResponseSchema.safeParse({ ...validResponse, milestoneLabel: null }).success).toBe(true);
  });

  it('accepts highlightStat with schedule info', () => {
    expect(ResponseSchema.safeParse({ ...validResponse, highlightStat: '3 months ahead of original schedule' }).success).toBe(true);
  });

  it('rejects missing highlightStat', () => {
    const { highlightStat: _, ...rest } = validResponse;
    expect(ResponseSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects empty message', () => {
    expect(ResponseSchema.safeParse({ ...validResponse, message: '' }).success).toBe(false);
  });

  it('rejects message over 200 chars', () => {
    expect(ResponseSchema.safeParse({ ...validResponse, message: 'x'.repeat(201) }).success).toBe(false);
  });
});

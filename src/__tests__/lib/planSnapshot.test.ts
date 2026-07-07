import { describe, it, expect } from 'vitest';
import {
  planSnapshotSchema,
  buildPlanSnapshot,
  snapshotToDraft,
  MAX_SNAPSHOT_DEBTS,
} from '@/lib/planSnapshot';

const CALC_STATE = {
  method: 'snowball' as const,
  monthlyIncome: '5200',
  essentialExpenses: '2400',
  extraPayment: '200',
  debtCategory: 'Credit Card',
  debts: [
    { name: 'Visa', balance: '14200', rate: '24.99', minimum: '285' },
    { name: '', balance: '4800', rate: '6.9', minimum: '145' },
    { name: 'Zeroed out', balance: '0', rate: '10', minimum: '25' },
  ],
};

describe('buildPlanSnapshot', () => {
  it('normalizes strings to numbers, names blank debts, drops zero balances', () => {
    const snapshot = buildPlanSnapshot(CALC_STATE);

    expect(snapshot).not.toBeNull();
    expect(snapshot!.monthlyIncome).toBe(5200);
    expect(snapshot!.debts).toHaveLength(2);
    expect(snapshot!.debts[0]).toEqual({
      name: 'Visa',
      balance: 14200,
      rate: 24.99,
      minimum: 285,
    });
    expect(snapshot!.debts[1].name).toBe('Debt 2');
  });

  it('produces output that passes its own schema', () => {
    const snapshot = buildPlanSnapshot(CALC_STATE);
    expect(planSnapshotSchema.safeParse(snapshot).success).toBe(true);
  });

  it('clamps out-of-range APR so the stored snapshot stays valid', () => {
    const snapshot = buildPlanSnapshot({
      ...CALC_STATE,
      debts: [{ name: 'Payday', balance: '500', rate: '400', minimum: '50' }],
    });
    expect(snapshot!.debts[0].rate).toBe(100);
    expect(planSnapshotSchema.safeParse(snapshot).success).toBe(true);
  });

  it('caps the number of debts', () => {
    const snapshot = buildPlanSnapshot({
      ...CALC_STATE,
      debts: Array.from({ length: 40 }, (_, i) => ({
        name: `D${i}`,
        balance: '100',
        rate: '5',
        minimum: '10',
      })),
    });
    expect(snapshot!.debts).toHaveLength(MAX_SNAPSHOT_DEBTS);
  });

  it('returns null when no debt has a balance', () => {
    const snapshot = buildPlanSnapshot({
      ...CALC_STATE,
      debts: [{ name: 'Empty', balance: '', rate: '5', minimum: '10' }],
    });
    expect(snapshot).toBeNull();
  });
});

describe('snapshotToDraft', () => {
  it('round-trips back to the draft shape the express screen consumes', () => {
    const snapshot = buildPlanSnapshot(CALC_STATE)!;
    const draft = snapshotToDraft(snapshot, {
      savedAt: 1234,
      debtFreeDate: 'March 2029',
      interestSaved: 4200,
    });

    expect(draft.savedAt).toBe(1234);
    expect(draft.method).toBe('snowball');
    expect(draft.monthlyIncome).toBe('5200');
    expect(draft.debts[0]).toEqual({
      name: 'Visa',
      balance: '14200',
      rate: '24.99',
      minimum: '285',
    });
    expect(draft.debtFreeDate).toBe('March 2029');
    expect(draft.interestSaved).toBe(4200);
  });

  it('omits missing extras instead of passing nulls to the UI', () => {
    const snapshot = buildPlanSnapshot(CALC_STATE)!;
    const draft = snapshotToDraft(snapshot, {
      savedAt: 1,
      debtFreeDate: null,
      interestSaved: null,
    });
    expect(draft.debtFreeDate).toBeUndefined();
    expect(draft.interestSaved).toBeUndefined();
  });
});

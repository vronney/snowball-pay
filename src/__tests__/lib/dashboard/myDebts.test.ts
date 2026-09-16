import { describe, expect, it } from 'vitest';
import {
  countAllLabel, debtsClosingView, debtsSummaryView, focusCardView, orderByPlan,
  outsidePlanNotice, planMembership, upgradeSheetEView,
} from '@/lib/dashboard/myDebts';
import type { PlanSummary, TierInfo, Uncounted } from '@/lib/dashboard/types';
import { makeDebt } from './fixtures';

const FREE: TierInfo = { proEligible: false, paidPro: false, trial: { active: false, endsAt: null } };
const PRO: TierInfo = { proEligible: true, paidPro: true, trial: { active: false, endsAt: null } };
const PLAN: PlanSummary = { method: 'snowball', months: 31, debtFreeDate: '2029-04-14', totalInterest: 5_000 };
// Any price works: the copy takes it as an argument (the app passes PLANS.pro.price).
const PRICE = 9;

const DEBTS = [
  makeDebt({ id: 'a', name: 'Visa', balance: 1_000.5, minimumPayment: 30 }),
  makeDebt({ id: 'b', name: 'Car', balance: 9_000, minimumPayment: 300, inPlan: true }),
  makeDebt({ id: 'paid', name: 'Old card', balance: 0, minimumPayment: 25 }),
  makeDebt({ id: 'x', name: 'Store card', balance: 1_200, minimumPayment: 35, inPlan: false }),
  makeDebt({ id: 'y', name: 'Clinic', balance: 3_710.25, minimumPayment: 90, inPlan: false }),
];
const UNCOUNTED: Uncounted = { count: 2, balance: 4_910.25, monthsImpact: 19 };

describe('planMembership', () => {
  it('splits by inPlan, counting a paid-off in-plan debt the way the cap does', () => {
    const m = planMembership(DEBTS);
    expect(m.counted.map((d) => d.id)).toEqual(['a', 'b', 'paid']);
    expect(m.outside.map((d) => d.id)).toEqual(['x', 'y']);
    expect(m.total).toBe(5);
    expect(m.countedBalance).toBe(10_000.5);
    expect(m.outsideBalance).toBe(4_910.25);
  });
});

describe('debtsSummaryView', () => {
  it('is null while every debt counts', () => {
    expect(debtsSummaryView(planMembership(DEBTS.slice(0, 3)))).toBeNull();
  });

  it('names the counted share and both totals', () => {
    expect(debtsSummaryView(planMembership(DEBTS))).toEqual({
      pill: '3 of 5 counted', counted: '$10,000.50', notCounted: '$4,910.25',
    });
  });
});

describe('debtsClosingView (spec §8.4 "Debts closing")', () => {
  const args = { uncounted: UNCOUNTED, plan: PLAN, tier: FREE, total: 5, price: PRICE };

  it('states what the date ignores and the months it leaves out', () => {
    expect(debtsClosingView(args)).toEqual({
      date: 'April 2029',
      text: "April 2029 ignores $4,910.25 — about 19 months it doesn't include.",
      cta: 'Count all 5 — $9/mo',
    });
  });

  it('says 1 month, and drops the months clause at 0 or without an estimate', () => {
    const text = (monthsImpact: number | null) => debtsClosingView({ ...args, uncounted: { ...UNCOUNTED, monthsImpact } })?.text;
    expect(text(1)).toBe("April 2029 ignores $4,910.25 — about 1 month it doesn't include.");
    expect(text(0)).toBe('April 2029 ignores $4,910.25.');
    expect(text(null)).toBe('April 2029 ignores $4,910.25.');
  });

  it('hides for Pro and trial accounts, without outside debts, and without a dated plan', () => {
    expect(debtsClosingView({ ...args, tier: PRO })).toBeNull();
    expect(debtsClosingView({ ...args, uncounted: null })).toBeNull();
    expect(debtsClosingView({ ...args, plan: null })).toBeNull();
    expect(debtsClosingView({ ...args, plan: { ...PLAN, months: 0 } })).toBeNull();
    expect(debtsClosingView({ ...args, plan: { ...PLAN, debtFreeDate: 'soon' } })).toBeNull();
  });
});

describe('upgradeSheetEView (spec §7 E)', () => {
  const args = { countedCount: 3, total: 5, uncounted: UNCOUNTED, date: 'April 2029', price: PRICE };

  it("fills moment E from the user's own counts", () => {
    expect(upgradeSheetEView(args)).toEqual({
      eyebrow: 'Debt 4 of 5 · saved, not counted',
      title: 'Your date is built from 3 of your 5 debts.',
      body: "The 2 uncounted balances add $4,910.25 and roughly 19 months that April 2029 doesn't include.",
      cta: 'Count all 5 — $9/mo',
    });
  });

  it('uses the singular, and drops the months without an estimate', () => {
    expect(upgradeSheetEView({ ...args, uncounted: { count: 1, balance: 1_200, monthsImpact: null } }).body)
      .toBe("The uncounted balance adds $1,200.00 that April 2029 doesn't include.");
    expect(upgradeSheetEView({ ...args, uncounted: { ...UNCOUNTED, monthsImpact: 1 } }).body)
      .toBe("The 2 uncounted balances add $4,910.25 and roughly 1 month that April 2029 doesn't include.");
  });
});

describe('focusCardView', () => {
  const debt = makeDebt({ id: 'a', name: 'Visa', balance: 1_000.5, minimumPayment: 30, interestRate: 28.74 });

  it("plans the minimum plus this month's acceleration, as v1 This Month does", () => {
    expect(focusCardView(debt, { monthPaidOff: 3 }, 535)).toEqual({
      debtId: 'a', name: 'Visa', balance: '$1,000.50', apr: '28.74% APR',
      amount: 565, amountLabel: '$565.00', goneIn: '3m',
    });
  });

  it('ignores negative acceleration, a 0% rate and a missing schedule', () => {
    expect(focusCardView({ ...debt, interestRate: 0 }, null, -40)).toMatchObject({ amount: 30, apr: null, goneIn: null });
  });
});

describe('outsidePlanNotice', () => {
  it('warns a Free account at the cap before it saves', () => {
    expect(outsidePlanNotice(5, 5, false)).toBe('On Free, your plan counts 5 debts. This one will be saved outside it.');
  });

  it('stays quiet below the cap and for Pro', () => {
    expect(outsidePlanNotice(4, 5, false)).toBeNull();
    expect(outsidePlanNotice(7, 5, true)).toBeNull();
  });
});

describe('orderByPlan', () => {
  it("sorts by the plan's rank, unranked after ranked, paid-off last", () => {
    const fresh = makeDebt({ id: 'new', balance: 50, minimumPayment: 10 });
    const rank = new Map([['b', 1], ['a', 2]]);
    expect(orderByPlan([DEBTS[2], DEBTS[0], fresh, DEBTS[1]], rank).map((d) => d.id)).toEqual(['b', 'a', 'new', 'paid']);
  });
});

describe('countAllLabel', () => {
  it('prices from its argument', () => {
    expect(countAllLabel(10, PRICE)).toBe('Count all 10 — $9/mo');
  });
});

# Dashboard v2 — PR 4: My Debts + `inPlan` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a Free account on dashboard v2 save debt 6+ outside the plan (`Debt.inPlan = false`) without changing any existing account's numbers, and ship the v2 My Debts tab (focus card, compact rows, the "saved, outside the plan" section, the ink closing card and upgrade moment E) behind `DASHBOARD_V2_USERS`. With the flag off, everything renders and behaves as today.

**Architecture:**
- One additive column, `Debt.inPlan Boolean @default(true)`.
- Plan math drops outside debts in one place: `payoffPlan.ts` (its three plan functions plus `calculateResultByMethod` itself). The four direct engine callers and Expo's `planInputFromServer` switch to `isPlanDebt`.
- The server cap counts in-plan debts only. Past the cap it saves outside the plan only when dashboard v2 asks for it and the account is flagged. The Stripe webhook moves outside debts back in when an account becomes Pro.
- Insights gains `uncounted`.
- The v2 tab is a thin container over v1's `CompactDebtRow`, `DebtCard`, `DebtForm` and `PaymentCalendar`. All copy and visibility come from a React-free view model, `src/lib/dashboard/myDebts.ts`.

**Tech Stack:** Next.js 15 App Router, React 18, TypeScript, Tailwind 3.4, TanStack Query 5.28, Prisma 6 on Neon, Zod, lucide-react, Vitest 4 with `globals: true`.
- Component tests use a `// @vitest-environment jsdom` header, @testing-library/react 16 and `createElement` (no JSX).
- Test files must be `src/__tests__/**/*.test.ts`.

**Spec:** `docs/superpowers/specs/2026-09-12-dashboard-pro-upgrade-design.md`: §5.1 (`uncounted.ts`), §5.2, §6.1–§6.3, §7 row E, §8.3–§8.5, §9, §10 and §13.
- The parent roadmap is `docs/superpowers/plans/2026-09-12-dashboard-pro-upgrade.md` (PR 4 row).
- The handoff defines the visuals: `~/.gstack/projects/vronney-snowball-pay/designs/dashboard-pro-upgrade-20260912/`, meaning `README.md` §2 "My Debts" and §7 "E · At the 5-debt cap", plus screenshots `02` and `04`. Read it, but never copy it into the repo: its numbers are one real account's data.

## Global Constraints

- **Flag off renders unchanged** (spec §5.3). The PR 2 snapshots in `src/__tests__/components/dashboard-v2/__snapshots__/DashboardClient.flag.test.ts.snap` must pass untouched. **Never run vitest with `-u` / `--update`.**
- **Flag off never fetches insights.** `DebtsV2` renders only under the flag. It becomes the third caller of `useDashboardInsights`, and React Query dedupes the request.
- **No existing account's numbers change.**
  - Every stored debt becomes `inPlan = true`.
  - `isInPlan` treats a missing value as in the plan.
  - The baseline gate (Task 11) must show `main-pre = main = branch`.
- **Hide instead of fake** (spec §4). A card whose figure is null, non-finite or not positive does not render.
- **Display rounding:**
  - Concrete amounts (balances, minimums, the planned payment) use `formatCurrency`.
  - The Pro price uses `formatCurrencyWhole(PLANS.pro.price)`.
- **Copy** uses the spec §7 E and §8.4 templates verbatim and states only computed facts (X6). Singular forms are "1 month" and "The uncounted balance adds".
- **DESIGN.md wins over the handoff:**
  - Dashed borders mean only "saved, outside the plan" (DESIGN.md 2026-09-12).
  - Ink appears only on the My Debts closing card (plus the existing readiness CTA and upgrade rail).
  - Blue (`action`) appears only on CTAs and on the Focus chip, which is an active-state marker already used by v1's `CompactDebtRow`.
  - Radii: cards `rounded-xl`, buttons `rounded-lg`, chips and pills `rounded-full`.
  - Touch targets are 44px (`min-h-11`), and primary CTAs 46px (`min-h-[46px]`).
  - Transitions get `motion-reduce:transition-none`.
- **Tokens, not hexes, in new v2 code:** `bg-surface`, `bg-surface-2`, `bg-bg`, `text-txt`, `text-txt-muted`, `bg-action`, `text-action`, `bg-ink`, `text-ink`, `text-danger`, `border-danger/35`, `border-border`, `bg-focus-card`, `border-focus-card-border`, `shadow-card`. The one literal allowed is `focus-visible:outline-action`.
  - `CompactDebtRow` is v1 code written in inline styles; its new variant follows that file's idiom.
- **Use `EYEBROW` plus a color utility, never the `.eyebrow` class** (it hardcodes its color). `EYEBROW`, `CARD`, `CTA_BLUE` and `ERROR_LINE` live in `src/components/dashboard-v2/styles.ts`.
- **Prices and limits:** the price comes only from `PLANS.pro.price`, and the client-side cap from `PLANS.free.debtLimit` (both in `src/lib/stripe`). Server routes use `FREE_DEBT_LIMIT` from `src/lib/gates`. Never write the literals `12` or `5` in product code.
- **Analytics:** `track()` properties pass through `sanitiseAnalyticsProperties`, which redacts numbers outside `SAFE_NUMERIC_KEYS`. Send strings and booleans only.
- **Server:**
  - `inPlan` is never added to the `PATCH /api/debts/[id]` schema, which stays `.strict()`.
  - A debt is saved outside the plan only on a dashboard v2 account (`isDashboardV2(auth.user.email)`).
  - `src/lib/debtCap.ts` imports only `@/lib/prisma`. The webhook tests mock `@/lib/stripe` without `PLANS`, so importing `gates.ts` there would crash them at load.
- **Database:**
  - Production access is read-only, except one `npm run db:push` in Task 11. It needs the owner's explicit OK and a Neon snapshot first, and it happens before the branch is pushed. `prisma.config.ts` loads `.env.local`, which points at production.
  - Until that push, the database has no `inPlan` column. So never start the dev server once Task 1 has regenerated the Prisma client: the client lives in the shared `node_modules`, so this affects `main` too. Running `npx prisma generate` on `main` restores it.
  - Stop the `budget-dev` preview server before any `prisma generate` or `npm run build`. It holds the query-engine DLL, which fails them with EPERM.
- **Git:**
  - Work on branch `feat/dashboard-v2-my-debts`, created from `main` at `4175f323`.
  - Use conventional commits, each ending with `-m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"`.
  - Never bypass hooks.
  - The local `block-no-verify` hook rejects any Bash command that contains `git commit` together with a `-n`-like token (`echo -n`, `[ -n`, `-ne`). Keep commits in their own command.
  - Never stage the `.snap` (vitest rewrites its stat only) or `src/__tests__/setup.ts`.
- **Pre-existing `tsc` noise:** `src/__tests__/lib/stripe.test.ts` has accepted type errors. Check with `npx tsc --noEmit 2>&1 | grep -v "src/__tests__/lib/stripe.test.ts"`, which must print nothing.
- **Mobile:** `apps/mobile` is its own package. Its gate is `cd apps/mobile && npm run typecheck`.

## Decisions made while writing this plan

These need the owner's OK before execution. The spec is patched to match in Task 11.

1. **Only flagged accounts can have outside debts.**
   - `POST /api/debts` saves past the cap only when the body carries `allowOutsidePlan: true` (sent only by v2) and the account is on `DASHBOARD_V2_USERS`.
   - `POST /api/onboarding/complete` saves the overflow outside the plan only for flagged accounts. It decides by the server flag because the wizard is shared by v1 and Expo. For those accounts `skippedDebts` is 0 and a new `outsidePlanDebts` counts the overflow. For everyone else the behavior is exactly today's.
   - This keeps the spec §13 risk ("only flagged users can hold outside debts") true in code, not just in practice.
2. **"Counted" means every debt with `inPlan` not false, paid-off ones included.** That is the cap's own basis (spec §6.3).
   - The pill reads "{counted} of {n} counted". Moment E's eyebrow reads "Debt {counted+1} of {n} · saved, not counted" and its title "Your date is built from {counted} of your {n} debts."
   - Deleting a counted debt never pulls an outside debt in. Choosing which debts count is deferred (spec §12).
3. **The engine entry itself drops outside debts.** `calculateResultByMethod` filters with `isInPlan` as a safety net for every direct caller, in addition to the callers switching their own filters to `isPlanDebt`.
   - `DataInsights` needs no edit, because it calls `payoffPlan`'s `calculateResultForAcceleration`.
   - The callers that deliberately keep `isActiveDebt` are listed in the next table.
4. **v2 My Debts layout** (top to bottom):
   - toolbar: pill (only with outside debts) plus "Add debt"
   - the two-up totals (only with outside debts)
   - the payment celebration banner
   - the focus card
   - the plan's debts as compact rows, in payoff order with paid-off last
   - "Saved, outside the plan"
   - a collapsed "Payment calendar & reminders" card (upcoming payments, `PaymentCalendar`, and "Add to Calendar", which is gated for Free)
   - the ink closing card

   v1's overview stat strip, its sort/filter toolbar and its helper-card empty state are not in the design, so v2 drops them. With no debts, one card says "No debts yet." with "Add your first debt".
5. **The focus card uses v1 This Month's figures verbatim** (`ThisMonthTab.tsx:122-127, 131-144`).
   - "Pay {minimum + effective acceleration} here this month · gone in {formatMonths(monthPaidOff)}".
   - "Log payment" writes that amount for the current month with the same `markPaid.mutate` call.
   - The APR is muted text, not the handoff's red: red at 11px fails AA.
   - Because the card carries the focus debt's action, its compact row stays collapsed. v1 opens it.
6. **The closing card and moment E are for Free accounts only.** They need `!tier.proEligible`, `uncounted`, and a dated plan (`plan.months > 0`).
   - The months clause appears only when `monthsImpact ≥ 1`.
   - The CTA is "Count all {n} — ${PLANS.pro.price}/mo". The sheet's CTA is the same and starts the existing checkout.
   - The trial CTA ("start 14 days free") arrives with PR 6.
7. **Balances in the two-up, the closing card and the sheet use `formatCurrency`** (cents), per the concrete-amount rule, not the handoff's whole dollars. The "Not counted" figure is red at 19px extrabold, which qualifies as large text (3:1).
8. **Adding past the cap is announced before saving.** When a Free account already has `PLANS.free.debtLimit` counted debts, the add-debt sheet says: "On Free, your plan counts {limit} debts. This one will be saved outside it." The saved debt appears in the outside section.
9. **Analytics (spec §9, PR 4 surfaces):**
   - `debt_saved_outside_plan` (no properties)
   - `upgrade_moment_viewed {state: 'E'}`
   - `upgrade_moment_cta {state: 'E', action: 'checkout'}`
   - the existing `checkout_started {source: 'upgrade_moment_e', billing: 'monthly'}`
10. **Expo:** `planInputFromServer` moves to `apps/mobile/src/lib/planInput.ts` and is re-exported from `queries.ts`, so every import stays the same. The move lets the root vitest cover the new filter.
11. **Becoming Pro moves outside debts in** on every webhook event that resolves to `paidTier: 'pro'`: subscription created or updated, and checkout completed. The `updateMany` is idempotent, and a failure returns 500 so Stripe retries. `POST /api/trial/start` does the same in PR 6.
12. **Migration order (Task 11):**
    - capture `main-pre` with main's client
    - the owner approves, and a Neon snapshot is taken
    - `npm run db:push`
    - a read-only SQL check that every row is in the plan
    - capture `main` and `branch` back to back
    - both compares must print `DIFFERENT=0`

    Only then is the branch pushed, so no preview or production build ever reads a missing column.
13. **`Sheet`'s `footer` becomes optional.** The add-debt sheet puts `DebtForm`'s own buttons in its body.

## Callers that keep `isActiveDebt`

| Caller | Why |
|---|---|
| `dashboard/interest.ts` monthly estimate, `usePlannerComputed.monthlyInterestLeak`, `IntelligenceUpgradeTeaser` | Lenders charge interest on every debt (spec §5.1, §6.2) |
| `dashboard/paymentGap.ts`, `dashboard/thisMonth.ts` rows, `dashboard/readiness.ts`, `debtHelpers` due/upcoming, `PaymentCalendar`, `ToastNotifications`, `useNotifications`, `usePlannerComputed.smartCalendar` | Payments are still due on them |
| `dashboard/rateWatch.ts`, `usePlannerComputed.refinanceCandidates` | A rate cut is worth asking for on any card (spec §6.2) |
| `IncomeTab` minimums line | The user still pays those minimums; the line shows real cash flow |
| `DataInsights` debt mix, v1 `DebtTab` totals | They show what is owed, not the plan |
| `RollForwardAdvice` | A paid-off debt's freed minimum is real cash, counted or not |
| `coach-brief` totals, `AiRecommendations`, `PayoffTab` custom-order editor, `FocusDebtExplainer` | Pro-only or driven by the payoff schedule. Pro accounts never hold outside debts, because becoming Pro moves them in, and the schedule lists only plan debts |
| `planCalculate.ts`, `PublicCalculator` | They take request-supplied debts, never stored ones |

Everything that calls `calculatePlanMetrics`, `calculateMinimumsOnlyResult` or `calculateResultForAcceleration` inherits Task 1's filter. That covers `DashboardClient`, `ThisMonthTab`, `PayoffTab`, `IntelligenceTab`, `DebtTab`, `DataInsights`, the coach brief, the crons, the emails, the share page and insights.

## File Structure

| File | Task | Responsibility |
|---|---|---|
| `prisma/schema.prisma` | 1 | `Debt.inPlan Boolean @default(true)` |
| `src/types/index.ts` | 1 | `Debt.inPlan?: boolean` |
| `src/lib/prismaMappers.ts` | 1 | Maps `inPlan` |
| `src/lib/monthlyFocusDebt.ts` | 1 | `isInPlan`, `isPlanDebt`; the focus debt is always a plan debt |
| `src/lib/payoffPlan.ts` | 1 | Plan math filters outside debts |
| `src/components/payoff/WhatIfCard.tsx`, `src/components/payoff/PlannerIntelligence.tsx`, `src/app/api/acceleration-stats/route.ts`, `src/lib/hooks/usePlannerComputed.ts` | 2 | Direct callers use `isPlanDebt` |
| `apps/mobile/src/lib/planInput.ts` (new), `apps/mobile/src/lib/queries.ts`, `apps/mobile/src/lib/types.ts` | 2 | Expo filter |
| `src/lib/debtCap.ts` (new) | 3 | `countCountedDebts`, `moveOutsideDebtsIntoPlan` |
| `src/app/api/debts/route.ts` | 3 | Cap counts in-plan debts; `allowOutsidePlan` |
| `src/app/api/onboarding/complete/route.ts` | 4 | Overflow outside the plan (flagged) |
| `src/app/api/webhooks/stripe/route.ts` | 4 | Pro moves outside debts in |
| `src/lib/dashboard/uncounted.ts` (new), `types.ts`, `buildInsights.ts` | 5 | `uncounted` in insights |
| `src/lib/dashboard/myDebts.ts` (new) | 6 | My Debts view models |
| `src/lib/analyticsEvents.ts`, `src/lib/hooks.ts` | 6 | 3 events; `useCreateDebt` accepts `allowOutsidePlan` |
| `src/components/dashboard-v2/sheets/Sheet.tsx` | 7 | Optional footer |
| `src/components/dashboard-v2/ClosingCard.tsx` (new) | 7 | Ink closing card |
| `src/components/dashboard-v2/sheets/UpgradeSheet.tsx` (new) | 7 | Moment E |
| `src/components/debt/CompactDebtRow.tsx` | 8 | `outsidePlan` variant |
| `src/components/dashboard-v2/debts/FocusDebtCard.tsx`, `DebtsSummary.tsx` (new) | 8 | Focus card; two-up totals |
| `src/components/dashboard-v2/debts/PaymentToolsSection.tsx`, `DebtFormSheet.tsx` (new) | 9 | Collapsed reminders/calendar; add-debt sheet |
| `src/components/dashboard-v2/debts/DebtsV2.tsx` (new), `src/components/DashboardClient.tsx` | 10 | The tab; the flag switch |
| spec, verification, migration, PR | 11 | Ship |

---

### Task 1: `Debt.inPlan` and the plan-math filter

**Files:**
- Modify: `prisma/schema.prisma` (model `Debt`, after `dueDate`, line 100)
- Modify: `src/types/index.ts` (interface `Debt`, after `dueDate`, line 12)
- Modify: `src/lib/prismaMappers.ts` (`debtFromRow`)
- Modify: `src/lib/monthlyFocusDebt.ts`
- Modify: `src/lib/payoffPlan.ts`
- Test: `src/__tests__/lib/prismaMappers.test.ts`, `src/__tests__/lib/monthlyFocusDebt.test.ts`, `src/__tests__/lib/payoffPlan.test.ts`

**Interfaces:**
- Produces: `isInPlan(debt: Pick<Debt, 'inPlan'>): boolean` and `isPlanDebt(debt: Pick<Debt, 'balance' | 'inPlan'>): boolean` from `@/lib/monthlyFocusDebt`; `Debt.inPlan?: boolean`; the Prisma `Debt` row type now has `inPlan: boolean`.

- [ ] **Step 1: Add the column and regenerate the client (no database write)**

Stop the `budget-dev` preview server if it runs (it holds the Prisma DLL). In `prisma/schema.prisma`, after the `dueDate` line of `model Debt`:

```prisma
  dueDate           Int?     // day of month (1-31)
  // false = saved on Free past the debt cap: kept and shown, but left out of
  // plan math (spec §6.1). Becoming Pro sets it back to true.
  inPlan            Boolean  @default(true)
```

Run: `npx prisma generate` — expected "Generated Prisma Client". **Do not run `db:push`** (Task 11 does, with the owner's OK).

In `src/types/index.ts`, after `dueDate?: number;`:

```ts
  /** False = saved outside the plan on Free past the debt cap (spec §6.1). Absent = in the plan. */
  inPlan?: boolean;
```

- [ ] **Step 2: Write the failing tests**

`src/__tests__/lib/prismaMappers.test.ts`: add `inPlan: true,` after `dueDate: 14,` in `DEBT_ROW` **and** in the expected object of "carries every domain field with numbers unchanged". Add to `describe('debtFromRow')`:

```ts
  it('carries inPlan, so a debt saved outside the plan stays outside', () => {
    expect(debtFromRow({ ...DEBT_ROW, inPlan: false }).inPlan).toBe(false);
  });
```

`src/__tests__/lib/monthlyFocusDebt.test.ts`: change the import to `import { isPlanDebt, selectMonthlyFocusDebt } from '@/lib/monthlyFocusDebt';` and append:

```ts
describe('isPlanDebt (spec §6.2)', () => {
  it('counts active debts with no inPlan value and with inPlan: true', () => {
    expect(isPlanDebt(makeDebt({ id: 'a', balance: 300 }))).toBe(true);
    expect(isPlanDebt(makeDebt({ id: 'a', balance: 300, inPlan: true }))).toBe(true);
  });

  it('excludes a debt saved outside the plan, and a paid-off one', () => {
    expect(isPlanDebt(makeDebt({ id: 'a', balance: 300, inPlan: false }))).toBe(false);
    expect(isPlanDebt(makeDebt({ id: 'a', balance: 0 }))).toBe(false);
  });
});

describe('selectMonthlyFocusDebt and debts outside the plan', () => {
  it('never picks a debt saved outside the plan', () => {
    const focusDebt = selectMonthlyFocusDebt(
      [makeDebt({ id: 'outside', balance: 100, inPlan: false }), makeDebt({ id: 'counted', balance: 900 })],
      { payoffSchedule: payoffSchedule('counted') },
    );
    expect(focusDebt?.id).toBe('counted');
  });

  it('skips it in the no-schedule fallback too', () => {
    const focusDebt = selectMonthlyFocusDebt(
      [makeDebt({ id: 'outside', balance: 100, inPlan: false }), makeDebt({ id: 'counted', balance: 900 })],
      null,
    );
    expect(focusDebt?.id).toBe('counted');
  });
});
```

`src/__tests__/lib/payoffPlan.test.ts`: change the first import to `import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';`, add `calculateResultByMethod` and `calculateResultForAcceleration` to the `@/lib/payoffPlan` import, and append:

```ts
describe('debts saved outside the plan (spec §6.2)', () => {
  // The engine dates results from `new Date()`; pin it so runs compare equal.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 15, 12, 0));
  });
  afterEach(() => vi.useRealTimers());

  const income = makeIncome({ monthlyTakeHome: 3_000, essentialExpenses: 1_500, accelerationAmount: 200 });
  const counted = [
    makeDebt({ id: 'a', balance: 2_000, minimumPayment: 60, interestRate: 20 }),
    makeDebt({ id: 'b', balance: 5_000, minimumPayment: 120, interestRate: 8 }),
  ];
  const outside = makeDebt({ id: 'x', balance: 9_000, minimumPayment: 250, interestRate: 25, inPlan: false });

  it('gives inPlan: true exactly the results of a debt saved before the column existed', () => {
    const marked = counted.map((d) => ({ ...d, inPlan: true }));
    expect(calculatePlanMetrics(marked, income, [])).toEqual(calculatePlanMetrics(counted, income, []));
    expect(calculateMinimumsOnlyResult(marked)).toEqual(calculateMinimumsOnlyResult(counted));
  });

  it('leaves an outside debt out of the plan, its minimums and the minimums-only run', () => {
    expect(calculatePlanMetrics([...counted, outside], income, [])).toEqual(calculatePlanMetrics(counted, income, []));
    expect(calculateMinimumsOnlyResult([...counted, outside])).toEqual(calculateMinimumsOnlyResult(counted));
  });

  it('leaves it out of the acceleration and strategy runs', () => {
    const metrics = calculatePlanMetrics(counted, income, [])!;
    expect(calculateResultForAcceleration([...counted, outside], income, metrics, 500, 'avalanche'))
      .toEqual(calculateResultForAcceleration(counted, income, metrics, 500, 'avalanche'));
  });

  it('drops it inside calculateResultByMethod, for callers that filter by balance only', () => {
    expect(calculateResultByMethod([...counted, outside], income, 0, 100, 'snowball'))
      .toEqual(calculateResultByMethod(counted, income, 0, 100, 'snowball'));
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/__tests__/lib/prismaMappers.test.ts src/__tests__/lib/monthlyFocusDebt.test.ts src/__tests__/lib/payoffPlan.test.ts`
Expected: FAIL — `isPlanDebt` is not exported, `debtFromRow` has no `inPlan`, and the three outside-debt cases differ.

- [ ] **Step 4: Implement**

`src/lib/prismaMappers.ts`, in `debtFromRow` after `dueDate: row.dueDate ?? undefined,`:

```ts
    inPlan: row.inPlan,
```

`src/lib/monthlyFocusDebt.ts`, after `isActiveDebt`:

```ts
/**
 * Counted by the payoff plan (spec §6.1). Only an explicit `false` is
 * outside: rows from before the column, older payloads and fixtures carry no
 * value and stay in the plan, so no existing number moves.
 */
export function isInPlan(debt: Pick<Debt, 'inPlan'>): boolean {
  return debt.inPlan !== false;
}

/** An active debt the plan counts: what plan math feeds the engine (spec §6.2). */
export function isPlanDebt(debt: Pick<Debt, 'balance' | 'inPlan'>): boolean {
  return isActiveDebt(debt) && isInPlan(debt);
}
```

and replace the first four lines of `selectMonthlyFocusDebt`'s body with:

```ts
  // Only the plan's debts can be its focus: a debt saved outside the plan has
  // no place in the payoff order.
  const planDebts = debts.filter(isPlanDebt);
  if (planDebts.length === 0) return null;

  const eligibleDebts = planDebts.filter((debt) => !paidDebtIds.has(debt.id));
```

`src/lib/payoffPlan.ts`:
- Import: `import { isInPlan, isPlanDebt } from '@/lib/monthlyFocusDebt';` (replacing the `isActiveDebt` import).
- First line of `calculateResultByMethod`'s body, then pass `planDebts` instead of `debts` to all three engine calls:

```ts
  // Debts saved outside the plan never reach the engine, whoever calls it
  // (spec §6.2). Callers already pass active debts; this drops only
  // inPlan=false, so their existing inputs are unchanged.
  const planDebts = debts.filter(isInPlan);
```

- `calculatePlanMetrics`: `const activeDebts = debts.filter(isActiveDebt);` → `const planDebts = debts.filter(isPlanDebt);`, and use `planDebts` in the `totalMinPayments` reduce and the `calculateResultByMethod` call. Keep `if (!income || debts.length === 0) return null;` as is.
- `calculateMinimumsOnlyResult`: `const planDebts = debts.filter(isPlanDebt);` and use it in both following lines.
- `calculateResultForAcceleration`: fix the line break and filter:

```ts
): PayoffResult {
  const planDebts = debts.filter(isPlanDebt);
  return calculateResultByMethod(
    planDebts,
```

- [ ] **Step 5: Run the tests, the suite and the type check**

Run: `npx vitest run src/__tests__/lib/prismaMappers.test.ts src/__tests__/lib/monthlyFocusDebt.test.ts src/__tests__/lib/payoffPlan.test.ts` — expected PASS.
Run: `npm test` — expected all pass (1073 before this PR, plus the new ones).
Run: `npx tsc --noEmit 2>&1 | grep -v "src/__tests__/lib/stripe.test.ts"` — expected no output.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma src/types/index.ts src/lib/prismaMappers.ts src/lib/monthlyFocusDebt.ts src/lib/payoffPlan.ts src/__tests__/lib/prismaMappers.test.ts src/__tests__/lib/monthlyFocusDebt.test.ts src/__tests__/lib/payoffPlan.test.ts
```

```bash
git commit -m "feat(debts): add Debt.inPlan and keep outside debts out of plan math" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Task 2: Direct plan-math callers and the Expo filter

**Files:**
- Modify: `src/components/payoff/WhatIfCard.tsx:12,45`
- Modify: `src/components/payoff/PlannerIntelligence.tsx:12,68,78`
- Modify: `src/app/api/acceleration-stats/route.ts:6,77`
- Modify: `src/lib/hooks/usePlannerComputed.ts:6,97`
- Create: `apps/mobile/src/lib/planInput.ts`
- Modify: `apps/mobile/src/lib/queries.ts` (lines 71-110 move out), `apps/mobile/src/lib/types.ts` (interface `Debt`)
- Test: `src/__tests__/api/acceleration-stats.test.ts` (new), `src/__tests__/lib/usePlannerComputed.test.ts` (new), `src/__tests__/mobile/planInput.test.ts` (new)

**Interfaces:**
- Consumes: `isPlanDebt` (Task 1).
- Produces: `planInputFromServer` from `apps/mobile/src/lib/planInput.ts`, still re-exported by `@/lib/queries` (mobile imports unchanged); mobile `Debt.inPlan?: boolean`.

- [ ] **Step 1: Write the failing tests**

`src/__tests__/api/acceleration-stats.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    debt: { findMany: vi.fn() },
    income: { findUnique: vi.fn() },
    expense: { findMany: vi.fn() },
    paymentRecord: { findMany: vi.fn() },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/auth-server', () => ({
  verifyAuth: vi.fn(),
  unauthorized: vi.fn(() => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })),
  serverError: vi.fn((msg: string) => new Response(JSON.stringify({ error: msg }), { status: 500 })),
}));

import { GET } from '@/app/api/acceleration-stats/route';
import { verifyAuth } from '@/lib/auth-server';

const row = (id: string, balance: number, minimumPayment: number, interestRate: number, inPlan = true) => ({
  id, userId: 'user-1', name: id, category: 'Credit Card', balance, originalBalance: balance, interestRate,
  minimumPayment, creditLimit: 0, priorityOrder: null, dueDate: null, inPlan,
  createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
});
const COUNTED = [row('a', 2_000, 60, 22), row('b', 6_000, 150, 9)];
const OUTSIDE = row('x', 9_000, 250, 27, false);

describe('GET /api/acceleration-stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 15, 12, 0));
    vi.mocked(verifyAuth).mockResolvedValue({ valid: true as const, user: { id: 'user-1', email: 'owner@example.com' } });
    // Null acceleration = the full surplus, so an outside minimum would shrink the planned extra.
    mockPrisma.income.findUnique.mockResolvedValue({
      id: 'i', userId: 'user-1', monthlyTakeHome: 3_500, essentialExpenses: 1_800, extraPayment: 0,
      payoffMethod: 'snowball', accelerationAmount: null, frequency: 'monthly',
      createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
    });
    mockPrisma.expense.findMany.mockResolvedValue([{ amount: 100 }]);
    mockPrisma.paymentRecord.findMany.mockResolvedValue([{ debtId: 'a', amount: 400, dueYear: 2026, dueMonth: 8 }]);
  });
  afterEach(() => vi.useRealTimers());

  async function statsFor(debts: ReturnType<typeof row>[]) {
    mockPrisma.debt.findMany.mockResolvedValue(debts);
    const res = await GET(new NextRequest('http://localhost/api/acceleration-stats'));
    expect(res.status).toBe(200);
    return res.json();
  }

  it('measures only the plan: a debt saved outside it changes nothing (spec §6.2)', async () => {
    const counted = await statsFor(COUNTED);
    expect(counted.plannedMonthly).toBe(1_390);
    expect(await statsFor([...COUNTED, OUTSIDE])).toEqual(counted);
  });
});
```

`src/__tests__/lib/usePlannerComputed.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePlannerComputed } from '@/lib/hooks/usePlannerComputed';
import { makeDebt, makeIncome, makeResult } from './dashboard/fixtures';

describe('usePlannerComputed priorityQueue', () => {
  it("lists only the plan's debts in attack order (spec §6.2)", () => {
    const debts = [
      makeDebt({ id: 'outside', balance: 50, minimumPayment: 25, inPlan: false }),
      makeDebt({ id: 'big', balance: 4_000, minimumPayment: 90 }),
      makeDebt({ id: 'small', balance: 400, minimumPayment: 25 }),
    ];
    const result = makeResult([['Sep 2026', 4_450], ['Oct 2026', 0]]);
    const { result: hook } = renderHook(() =>
      usePlannerComputed(debts, makeIncome(), 'snowball', result, result, 500, 300, [], false),
    );
    expect(hook.current.priorityQueue.map((d) => d.id)).toEqual(['small', 'big']);
  });
});
```

`src/__tests__/mobile/planInput.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { planInputFromServer } from '../../../apps/mobile/src/lib/planInput';
import type { Debt, Income } from '../../../apps/mobile/src/lib/types';

const debt = (id: string, balance: number, extra: Partial<Debt> = {}): Debt => ({
  id, userId: 'user-1', name: id, category: 'Credit Card', balance, originalBalance: balance,
  interestRate: 20, minimumPayment: 50, creditLimit: 0,
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', ...extra,
});
const INCOME: Income = {
  id: 'i', userId: 'user-1', monthlyTakeHome: 3_000, essentialExpenses: 1_500, extraPayment: 0,
  payoffMethod: 'snowball', accelerationAmount: null,
};

describe('planInputFromServer (Expo)', () => {
  it('drops debts saved outside the plan, like the web (spec §6.2)', () => {
    const input = planInputFromServer([debt('a', 900), debt('x', 5_000, { inPlan: false, minimumPayment: 200 })], INCOME);
    expect(input?.debts.map((d) => d.id)).toEqual(['a']);
    // Their minimum doesn't shrink the surplus either: 3000 − 1500 − 50.
    expect(input?.extraPayment).toBe(1_450);
  });

  it('keeps debts from a server that sends no inPlan', () => {
    expect(planInputFromServer([debt('a', 900)], INCOME)?.debts).toHaveLength(1);
  });

  it('has no plan when only outside debts are active', () => {
    expect(planInputFromServer([debt('x', 5_000, { inPlan: false })], INCOME)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/__tests__/api/acceleration-stats.test.ts src/__tests__/lib/usePlannerComputed.test.ts src/__tests__/mobile/planInput.test.ts`
Expected: FAIL — `plannedMonthly` shrinks to 1,140 with the outside debt, `priorityQueue` starts with `outside`, and `planInput` does not exist.

- [ ] **Step 3: Switch the web callers**

Each change is the filter function plus its import; variable names stay, so every diff line is one token.

- `WhatIfCard.tsx`: import `isPlanDebt` instead of `isActiveDebt`; line 45 becomes:

```ts
  // The plan's debts only (spec §6.2): the ladder is measured against the plan.
  const activeDebts = useMemo(() => debts.filter(isPlanDebt), [debts]);
```

- `PlannerIntelligence.tsx`: import `isPlanDebt` instead of `isActiveDebt`; line 68 `debts.some(isActiveDebt)` → `debts.some(isPlanDebt)`; line 78 `debts.filter(isActiveDebt)` → `debts.filter(isPlanDebt)`.
- `acceleration-stats/route.ts`: import `isPlanDebt` instead of `isActiveDebt`; line 77 becomes:

```ts
    // The plan's debts only (spec §6.2), so the planned extra matches the dashboard's plan.
    const activeDebts = normalizedDebts.filter(isPlanDebt);
```

- `usePlannerComputed.ts`: import `{ isActiveDebt, isPlanDebt }`; line 97 becomes:

```ts
    // The plan's attack order: a debt saved outside the plan isn't in it.
    const sorted = debts.filter(isPlanDebt);
```

- [ ] **Step 4: Move and filter Expo's plan input**

`apps/mobile/src/lib/types.ts`, in `interface Debt` after `dueDate?: number | null;`:

```ts
  /** False = saved outside the plan on Free (web spec §6.1). Absent from older servers = in the plan. */
  inPlan?: boolean;
```

Create `apps/mobile/src/lib/planInput.ts` holding the function from `queries.ts` lines 71-110, with one changed line (`active`):

```ts
import type { CalculateInput, Debt, Expense, Income, PayoffMethod } from './types';

/**
 * The saved plan as the dashboard computes it — same inputs the web
 * dashboard feeds calculatePlanMetrics: the active debts the plan counts (a
 * debt saved outside the plan on Free is left out, like the web, spec §6.2),
 * the income row's method, recurring expenses (summed as-is, like the web),
 * and the acceleration slider (null = full surplus).
 */
export function planInputFromServer(
  debts: Debt[],
  income: Income | null,
  expenses: Expense[] = [],
): CalculateInput | null {
  const active = debts.filter((d) => d.balance > 0.01 && d.inPlan !== false);
  if (!income || active.length === 0) return null;
  const totalMin = active.reduce((sum, d) => sum + d.minimumPayment, 0);
  const recurring = expenses.reduce((sum, e) => sum + e.amount, 0);
  // The engine treats essentials + recurring as one figure, so fold them.
  const essentials = income.essentialExpenses + recurring;
  const surplus = Math.max(0, income.monthlyTakeHome - essentials - totalMin);
  const extra =
    income.accelerationAmount == null ? surplus : Math.min(income.accelerationAmount, surplus);
  const method: PayoffMethod =
    income.payoffMethod === 'avalanche' || income.payoffMethod === 'custom'
      ? income.payoffMethod
      : 'snowball';
  return {
    method,
    extraPayment: extra,
    monthlyIncome: income.monthlyTakeHome,
    essentialExpenses: essentials,
    debts: active.map((d) => ({
      id: d.id,
      name: d.name,
      category: d.category,
      balance: d.balance,
      interestRate: d.interestRate,
      minimumPayment: d.minimumPayment,
      priorityOrder: d.priorityOrder ?? undefined,
    })),
  };
}
```

In `apps/mobile/src/lib/queries.ts`, delete lines 71-110 (the doc comment and `planInputFromServer`) and add after the type import block:

```ts
export { planInputFromServer } from './planInput';
```

Every type still imported by `queries.ts` stays in use (`CalculateInput`, `Debt`, `Expense`, `Income`, `PayoffMethod`, `DebtCategory`, `CalculateResponse`, `Subscription`).

- [ ] **Step 5: Run the tests and checks**

Run: `npx vitest run src/__tests__/api/acceleration-stats.test.ts src/__tests__/lib/usePlannerComputed.test.ts src/__tests__/mobile/planInput.test.ts` — expected PASS.
Run: `npm test` — expected all pass.
Run: `npx tsc --noEmit 2>&1 | grep -v "src/__tests__/lib/stripe.test.ts"` — expected no output.
Run: `cd apps/mobile && npm run typecheck` — expected exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/components/payoff/WhatIfCard.tsx src/components/payoff/PlannerIntelligence.tsx src/app/api/acceleration-stats/route.ts src/lib/hooks/usePlannerComputed.ts apps/mobile/src/lib/planInput.ts apps/mobile/src/lib/queries.ts apps/mobile/src/lib/types.ts src/__tests__/api/acceleration-stats.test.ts src/__tests__/lib/usePlannerComputed.test.ts src/__tests__/mobile/planInput.test.ts
```

```bash
git commit -m "feat(debts): keep outside debts out of direct plan callers and Expo" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Task 3: The Free cap counts in-plan debts; v2 saves past it outside the plan

**Files:**
- Create: `src/lib/debtCap.ts`
- Modify: `src/app/api/debts/route.ts` (schema and `POST`)
- Test: `src/__tests__/api/debts.test.ts` (new)

**Interfaces:**
- Produces:
  - `countCountedDebts(userId: string): Promise<number>` and `moveOutsideDebtsIntoPlan(userId: string): Promise<number>` from `@/lib/debtCap`.
  - `POST /api/debts` accepts optional `allowOutsidePlan: boolean`. It answers `201 { debt }` when the debt is in the plan (unchanged) and `201 { debt, outsidePlan: true }` when it is saved outside.

- [ ] **Step 1: Write the failing test**

`src/__tests__/api/debts.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: { debt: { count: vi.fn(), create: vi.fn() } },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/auth-server', () => ({
  verifyAuth: vi.fn(),
  unauthorized: vi.fn(() => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })),
  badRequest: vi.fn((msg: string) => new Response(JSON.stringify({ error: msg }), { status: 400 })),
  serverError: vi.fn((msg: string) => new Response(JSON.stringify({ error: msg }), { status: 500 })),
}));
vi.mock('@/lib/gates', () => ({
  FREE_DEBT_LIMIT: 5,
  getUserTier: vi.fn(),
  upgradeRequired: vi.fn(
    (feature: string) => new Response(JSON.stringify({ error: 'upgrade_required', feature }), { status: 403 }),
  ),
}));

import { POST } from '@/app/api/debts/route';
import { verifyAuth } from '@/lib/auth-server';
import { getUserTier } from '@/lib/gates';

const AUTHED = { valid: true as const, user: { id: 'user-1', email: 'owner@example.com' } };
const BODY = { name: 'Store card', category: 'Credit Card', balance: 1200, interestRate: 24.99, minimumPayment: 40 };

const post = (body: Record<string, unknown>) =>
  POST(new NextRequest('http://localhost/api/debts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
const createdData = () => mockPrisma.debt.create.mock.calls[0][0].data;

describe('POST /api/debts — the Free cap (spec §6.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('DASHBOARD_V2_USERS', 'owner@example.com');
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    vi.mocked(getUserTier).mockResolvedValue('free');
    mockPrisma.debt.count.mockResolvedValue(5);
    mockPrisma.debt.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'debt-9', ...data }));
  });
  afterEach(() => vi.unstubAllEnvs());

  it('counts only in-plan debts toward the cap', async () => {
    mockPrisma.debt.count.mockResolvedValue(4);
    await post(BODY);
    expect(mockPrisma.debt.count).toHaveBeenCalledWith({ where: { userId: 'user-1', inPlan: true } });
  });

  it('saves below the cap in the plan, with the same payload and response as before', async () => {
    mockPrisma.debt.count.mockResolvedValue(4);
    const res = await post(BODY);
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ debt: expect.objectContaining({ id: 'debt-9', name: 'Store card' }) });
    expect(createdData()).not.toHaveProperty('inPlan');
  });

  it('keeps the 403 at the cap when the client does not opt in', async () => {
    const res = await post(BODY);
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: 'upgrade_required', feature: 'Unlimited debts' });
    expect(mockPrisma.debt.create).not.toHaveBeenCalled();
  });

  it('saves outside the plan at the cap when dashboard v2 opts in', async () => {
    const res = await post({ ...BODY, allowOutsidePlan: true });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      debt: expect.objectContaining({ id: 'debt-9', inPlan: false }),
      outsidePlan: true,
    });
    expect(createdData()).toMatchObject({ inPlan: false, balance: 1200, originalBalance: 1200 });
  });

  it('refuses the opt-in from an account not on dashboard v2', async () => {
    vi.stubEnv('DASHBOARD_V2_USERS', 'someone-else@example.com');
    const res = await post({ ...BODY, allowOutsidePlan: true });
    expect(res.status).toBe(403);
    expect(mockPrisma.debt.create).not.toHaveBeenCalled();
  });

  it('saves in the plan below the cap even when the client opts in', async () => {
    mockPrisma.debt.count.mockResolvedValue(3);
    const res = await post({ ...BODY, allowOutsidePlan: true });
    expect(await res.json()).not.toHaveProperty('outsidePlan');
    expect(createdData()).not.toHaveProperty('inPlan');
  });

  it('never caps Pro, and never saves a Pro debt outside the plan', async () => {
    vi.mocked(getUserTier).mockResolvedValue('pro');
    const res = await post({ ...BODY, allowOutsidePlan: true });
    expect(res.status).toBe(201);
    expect(mockPrisma.debt.count).not.toHaveBeenCalled();
    expect(createdData()).not.toHaveProperty('inPlan');
  });

  it('rejects a non-boolean opt-in', async () => {
    expect((await post({ ...BODY, allowOutsidePlan: 'yes' })).status).toBe(400);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/__tests__/api/debts.test.ts`
Expected: FAIL. The count is queried without `inPlan`, the opt-in still gets 403, and `'yes'` is accepted.

- [ ] **Step 3: Create `src/lib/debtCap.ts`**

```ts
import { prisma } from '@/lib/prisma';

// Prisma only, on purpose: the Stripe webhook imports this module, and its
// tests mock '@/lib/stripe' without PLANS, so importing gates.ts here would
// crash them at load. Callers compare the count with FREE_DEBT_LIMIT.

/** The debts the Free cap counts: every in-plan debt, paid-off ones included (spec §6.3). */
export function countCountedDebts(userId: string): Promise<number> {
  return prisma.debt.count({ where: { userId, inPlan: true } });
}

/**
 * Becoming Pro counts every debt (spec §6.3): move the ones saved outside the
 * plan back in. Idempotent, so a retried webhook is harmless. Returns how
 * many moved.
 */
export async function moveOutsideDebtsIntoPlan(userId: string): Promise<number> {
  const { count } = await prisma.debt.updateMany({
    where: { userId, inPlan: false },
    data: { inPlan: true },
  });
  return count;
}
```

- [ ] **Step 4: Update `src/app/api/debts/route.ts`**

Imports, after the gates import:

```ts
import { countCountedDebts } from '@/lib/debtCap';
import { isDashboardV2 } from '@/lib/flags';
```

Add to `CreateDebtSchema`, after `dueDate`:

```ts
  // Dashboard v2 only (spec §6.3): past the Free cap, save the debt outside
  // the plan instead of refusing it. Honored only for flagged accounts.
  allowOutsidePlan: z.boolean().optional(),
```

Replace the block from `// Free-tier debt limit check` through the `return NextResponse.json({ debt }, { status: 201 });` line with:

```ts
    // Free-tier debt limit. The cap counts in-plan debts, paid-off ones
    // included (spec §6.3). Past it, dashboard v2 saves the debt outside the
    // plan; every other client keeps today's 403.
    let outsidePlan = false;
    const tier = await getUserTier(auth.user.id);
    if (tier === 'free') {
      const counted = await countCountedDebts(auth.user.id);
      if (counted >= FREE_DEBT_LIMIT) {
        if (!validated.allowOutsidePlan || !isDashboardV2(auth.user.email)) {
          return upgradeRequired('Unlimited debts');
        }
        outsidePlan = true;
      }
    }

    const debt = await prisma.debt.create({
      data: {
        userId: auth.user.id,
        name: validated.name,
        category: validated.category,
        balance: validated.balance,
        originalBalance: validated.balance,
        interestRate: validated.interestRate,
        minimumPayment: validated.minimumPayment,
        creditLimit: validated.creditLimit || 0,
        dueDate: validated.dueDate,
        // Written only as false, so an in-plan save sends exactly today's payload.
        ...(outsidePlan ? { inPlan: false } : {}),
      },
    });

    return NextResponse.json(outsidePlan ? { debt, outsidePlan: true } : { debt }, { status: 201 });
```

- [ ] **Step 5: Run the tests and checks**

- Run `npx vitest run src/__tests__/api/debts.test.ts`. Expected: PASS.
- Run `npm test`. Expected: all pass.
- Run `npx tsc --noEmit 2>&1 | grep -v "src/__tests__/lib/stripe.test.ts"`. Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/lib/debtCap.ts src/app/api/debts/route.ts src/__tests__/api/debts.test.ts
```

```bash
git commit -m "feat(debts): count in-plan debts for the Free cap and save v2 overflow outside the plan" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Task 4: Onboarding overflow outside the plan; becoming Pro moves it in

**Files:**
- Modify: `src/app/api/onboarding/complete/route.ts` (the lines 98-112 block, the debt loop at lines 148-198, and the result at lines 200-206)
- Modify: `src/app/api/webhooks/stripe/route.ts` (the subscription created/updated branch and the checkout completed branch)
- Test: `src/__tests__/api/onboarding-complete.test.ts`, `src/__tests__/api/stripe/webhook.test.ts`, `src/__tests__/api/stripe/webhook-mfa.test.ts`

**Interfaces:**
- Consumes: `countCountedDebts` and `moveOutsideDebtsIntoPlan` (Task 3), and `isDashboardV2` from `@/lib/flags`.
- Produces: the onboarding response gains `outsidePlanDebts: number`. `skippedDebts` stays.

- [ ] **Step 1: Write the failing onboarding tests**

In `src/__tests__/api/onboarding-complete.test.ts`:
- Import `afterEach` from vitest.
- Add `vi.stubEnv('DASHBOARD_V2_USERS', '');` as the first line of the top-level `beforeEach`.
- Add `afterEach(() => vi.unstubAllEnvs());` after it.
- Append these tests inside the top-level `describe`:

```ts
  it('counts only in-plan debts toward the cap', async () => {
    await POST(makeRequest({ income: INCOME, debts: [debt('Visa', 1000)] }));
    expect(mockPrisma.debt.count).toHaveBeenCalledWith({ where: { userId: 'user-1', inPlan: true } });
  });

  it('still skips the overflow for an account not on dashboard v2', async () => {
    mockPrisma.debt.count.mockResolvedValue(3);
    const res = await POST(makeRequest({
      income: INCOME,
      debts: [debt('A', 100), debt('B', 200), debt('C', 300), debt('D', 400)],
    }));
    expect(await res.json()).toMatchObject({ skippedDebts: 2, outsidePlanDebts: 0 });
    expect(mockPrisma.debt.create.mock.calls.map((c) => c[0].data.inPlan)).toEqual([undefined, undefined]);
  });

  describe('on dashboard v2 (spec §6.3)', () => {
    beforeEach(() => vi.stubEnv('DASHBOARD_V2_USERS', 'test@example.com'));

    it('saves the overflow outside the plan instead of skipping it', async () => {
      mockPrisma.debt.count.mockResolvedValue(3);
      const res = await POST(makeRequest({
        income: INCOME,
        debts: [debt('A', 100), debt('B', 200), debt('C', 300), debt('D', 400)],
      }));
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body).toMatchObject({ skippedDebts: 0, outsidePlanDebts: 2 });
      expect(body.debtIds).toHaveLength(4);
      expect(mockPrisma.debt.create.mock.calls.map((c) => [c[0].data.name, c[0].data.inPlan])).toEqual([
        ['A', undefined], ['B', undefined], ['C', false], ['D', false],
      ]);
    });

    it('saves every debt outside the plan when the account is already at the cap', async () => {
      mockPrisma.debt.count.mockResolvedValue(5);
      const res = await POST(makeRequest({ income: INCOME, debts: [debt('A', 100), debt('B', 200)] }));
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ skippedDebts: 0, outsidePlanDebts: 2 });
      expect(mockPrisma.debt.create.mock.calls.map((c) => c[0].data.inPlan)).toEqual([false, false]);
    });

    it("never saves a Pro account's debts outside the plan", async () => {
      vi.mocked(getUserTier).mockResolvedValue('pro');
      const debts = Array.from({ length: 7 }, (_, i) => debt(`Debt ${i + 1}`, 100));
      const body = await (await POST(makeRequest({ income: INCOME, debts }))).json();
      expect(body).toMatchObject({ skippedDebts: 0, outsidePlanDebts: 0 });
      expect(mockPrisma.debt.create.mock.calls.every((c) => c[0].data.inPlan === undefined)).toBe(true);
    });
  });
```

- [ ] **Step 2: Write the failing webhook tests**

In `src/__tests__/api/stripe/webhook.test.ts`:
- Add `debt: { updateMany: vi.fn() },` to the hoisted `mockPrisma`.
- Add `mockPrisma.debt.updateMany.mockResolvedValue({ count: 0 });` after `vi.clearAllMocks();` in `beforeEach`.
- Append these tests inside the `describe`:

```ts
  // --- Becoming Pro counts every debt (spec §6.3) ---

  it('moves debts saved outside the plan into it when a subscription turns Pro', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue(
      makeEvent('customer.subscription.created', makeSub({ status: 'active' })),
    );
    mockPrisma.user.update.mockResolvedValue({});
    expect((await POST(makeRequest('{}'))).status).toBe(200);
    expect(mockPrisma.debt.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', inPlan: false },
      data: { inPlan: true },
    });
  });

  it('moves them in when checkout completes on Pro', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue(makeEvent('checkout.session.completed', {
      mode: 'subscription', metadata: { userId: 'user-1' }, customer: 'cus_1', subscription: 'sub_test_123',
    }));
    mockStripe.subscriptions.retrieve.mockResolvedValue(makeSub({ status: 'active' }));
    mockPrisma.user.update.mockResolvedValue({});
    await POST(makeRequest('{}'));
    expect(mockPrisma.debt.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', inPlan: false },
      data: { inPlan: true },
    });
  });

  it('never moves a debt out of the plan when Pro ends', async () => {
    mockPrisma.user.update.mockResolvedValue({});
    mockStripe.webhooks.constructEvent.mockReturnValue(
      makeEvent('customer.subscription.updated', makeSub({ status: 'past_due' })),
    );
    await POST(makeRequest('{}'));
    mockStripe.webhooks.constructEvent.mockReturnValue(
      makeEvent('customer.subscription.deleted', makeSub({ status: 'canceled' })),
    );
    await POST(makeRequest('{}'));
    expect(mockPrisma.debt.updateMany).not.toHaveBeenCalled();
  });

  it('fails the event, so Stripe retries, when the move fails', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue(
      makeEvent('customer.subscription.updated', makeSub({ status: 'active' })),
    );
    mockPrisma.user.update.mockResolvedValue({});
    mockPrisma.debt.updateMany.mockRejectedValue(new Error('db down'));
    expect((await POST(makeRequest('{}'))).status).toBe(500);
  });
```

In `src/__tests__/api/stripe/webhook-mfa.test.ts`, add `debt: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },` to the hoisted `mockPrisma`. The route now calls it on every Pro event, so without it the MFA suite's Pro events would throw and return 500. If that suite's `beforeEach` calls `vi.resetAllMocks()`, re-set the resolved value there as well. `vi.clearAllMocks()` keeps it.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/__tests__/api/onboarding-complete.test.ts src/__tests__/api/stripe/webhook.test.ts src/__tests__/api/stripe/webhook-mfa.test.ts`

Expected: FAIL. `outsidePlanDebts` is missing, the count is queried without `inPlan`, flagged overflow is skipped, and `updateMany` is never called. The existing MFA tests still pass.

- [ ] **Step 4: Implement the onboarding change**

Imports:

```ts
import { countCountedDebts } from '@/lib/debtCap';
import { isDashboardV2 } from '@/lib/flags';
```

Replace lines 100-112, from `const tier = await getUserTier(auth.user.id);` through `const skippedDebts = …;`, with:

```ts
    const tier = await getUserTier(auth.user.id);
    // Past the Free cap, a dashboard v2 account keeps the overflow as debts
    // saved outside the plan (spec §6.3). The wizard is shared by v1 and Expo,
    // so the server decides by the account's flag, not by a request field.
    const saveOverflowOutside = tier === 'free' && isDashboardV2(auth.user.email);
    let debtCapacity = Infinity;
    if (tier === 'free') {
      const debtCount = await countCountedDebts(auth.user.id);
      if (debtCount >= FREE_DEBT_LIMIT && !saveOverflowOutside) return upgradeRequired('Unlimited debts');
      debtCapacity = Math.max(0, FREE_DEBT_LIMIT - debtCount);
    }

    // Never fail the whole onboarding because the calculator carried more
    // debts than the free tier allows — save what fits and report the rest
    // so the dashboard can surface the upgrade path. Dashboard v2 saves the
    // rest too, outside the plan; skippedDebts stays for older clients.
    const overflow = Math.max(0, incomingDebts.length - debtCapacity);
    const debtsToCreate = saveOverflowOutside ? incomingDebts : incomingDebts.slice(0, debtCapacity);
    const skippedDebts = saveOverflowOutside ? 0 : overflow;
    const outsidePlanDebts = saveOverflowOutside ? overflow : 0;
```

Change the loop header `for (const debtInput of debtsToCreate) {` to:

```ts
      for (let index = 0; index < debtsToCreate.length; index++) {
        const debtInput = debtsToCreate[index];
```

In that loop's `tx.debt.create` `data`, after `priorityOrder: debtInput.priorityOrder,`:

```ts
            // Past the cap (dashboard v2 only): saved, but outside the plan.
            ...(index >= debtCapacity ? { inPlan: false } : {}),
```

In the returned result object, after `skippedDebts,`:

```ts
        outsidePlanDebts,
```

- [ ] **Step 5: Implement the webhook change**

Import: `import { moveOutsideDebtsIntoPlan } from '@/lib/debtCap';`

In `case 'customer.subscription.created': case 'customer.subscription.updated':`, between the `prisma.user.update` call and `await enforceMfaForPro(fields.paidTier, user.auth0Id);`:

```ts
        // Becoming Pro counts every debt: bring back any saved outside the
        // plan (spec §6.3). Losing Pro never moves one out. A failure fails
        // the event so Stripe retries it; the move is idempotent.
        if (fields.paidTier === 'pro') await moveOutsideDebtsIntoPlan(userId);
```

In `case 'checkout.session.completed':`, between its `prisma.user.update` call and `await enforceMfaForPro(subFields.paidTier, user.auth0Id);`:

```ts
        // Same rule as the subscription branch: Pro counts every debt (spec §6.3).
        if (subFields.paidTier === 'pro') await moveOutsideDebtsIntoPlan(userId);
```

- [ ] **Step 6: Run the tests and checks**

- Run: `npx vitest run src/__tests__/api/onboarding-complete.test.ts src/__tests__/api/stripe/webhook.test.ts src/__tests__/api/stripe/webhook-mfa.test.ts`. Expected: PASS.
- Run: `npm test`. Expected: all pass.
- Run: `npx tsc --noEmit 2>&1 | grep -v "src/__tests__/lib/stripe.test.ts"`. Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/onboarding/complete/route.ts src/app/api/webhooks/stripe/route.ts src/__tests__/api/onboarding-complete.test.ts src/__tests__/api/stripe/webhook.test.ts src/__tests__/api/stripe/webhook-mfa.test.ts
```

```bash
git commit -m "feat(debts): save v2 onboarding overflow outside the plan; Pro moves it in" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Task 5: `computeUncounted` and `insights.uncounted`

**Files:**
- Create: `src/lib/dashboard/uncounted.ts`
- Modify: `src/lib/dashboard/types.ts` (new `Uncounted`; `DashboardInsights.uncounted`)
- Modify: `src/lib/dashboard/buildInsights.ts` (return object)
- Modify: test fixture factories `src/__tests__/components/dashboard-v2/V2Shell.test.ts:21` and `src/__tests__/components/dashboard-v2/ThisMonthV2.test.ts:56` (add `uncounted: null,` to the object each `insights()` returns, next to `plan`)
- Test: `src/__tests__/lib/dashboard/uncounted.test.ts` (new), `src/__tests__/lib/dashboard/buildInsights.test.ts`, `src/__tests__/api/dashboard-insights.test.ts`

**Interfaces:**
- Consumes: `isActiveDebt` and `isInPlan` (Task 1), `calculatePlanMetrics`, `isPayoffComplete` from `./payoffCompletion`.
- Produces:
  - `export interface Uncounted { count: number; balance: number; monthsImpact: number | null }` from `@/lib/dashboard/types`.
  - `DashboardInsights.uncounted: Uncounted | null`.
  - `computeUncounted(debts, income, expenses): Uncounted | null`.

- [ ] **Step 1: Write the failing tests**

`src/__tests__/lib/dashboard/uncounted.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { computeUncounted } from '@/lib/dashboard/uncounted';
import { calculatePlanMetrics } from '@/lib/payoffPlan';
import { makeDebt, makeIncome } from './fixtures';

const INCOME = makeIncome({ monthlyTakeHome: 4_000, essentialExpenses: 2_000, accelerationAmount: 300 });
const COUNTED = [
  makeDebt({ id: 'a', balance: 2_000, minimumPayment: 60, interestRate: 20 }),
  makeDebt({ id: 'b', balance: 6_000, minimumPayment: 150, interestRate: 9 }),
];
const OUTSIDE = makeDebt({ id: 'x', balance: 4_500, minimumPayment: 120, interestRate: 24, inPlan: false });

describe('computeUncounted (spec §5.1)', () => {
  it('is null when every debt counts', () => {
    expect(computeUncounted(COUNTED, INCOME, [])).toBeNull();
  });

  it('counts active outside debts and their balance, not a paid-off one', () => {
    const paidOff = makeDebt({ id: 'y', balance: 0, minimumPayment: 40, inPlan: false });
    expect(computeUncounted([...COUNTED, OUTSIDE, paidOff], INCOME, [])).toMatchObject({ count: 1, balance: 4_500 });
  });

  it('measures monthsImpact as the plan with every debt counted minus the current plan', () => {
    const current = calculatePlanMetrics(COUNTED, INCOME, [])!;
    const all = calculatePlanMetrics([...COUNTED, { ...OUTSIDE, inPlan: true }], INCOME, [])!;
    const out = computeUncounted([...COUNTED, OUTSIDE], INCOME, []);
    expect(out?.monthsImpact).toBe(all.result.months - current.result.months);
    expect(out?.monthsImpact).toBeGreaterThan(0);
  });

  it('has no monthsImpact without income', () => {
    expect(computeUncounted([...COUNTED, OUTSIDE], null, [])).toEqual({ count: 1, balance: 4_500, monthsImpact: null });
  });

  it('has no monthsImpact when counting every debt would hit the 360-month cap', () => {
    // Its minimum is below its monthly interest (1,800), so counted, the run never pays off.
    const huge = makeDebt({ id: 'h', balance: 90_000, minimumPayment: 1_500, interestRate: 24, inPlan: false });
    const minimumsOnly = makeIncome({ monthlyTakeHome: 4_000, essentialExpenses: 2_000, accelerationAmount: 0 });
    expect(computeUncounted([...COUNTED, huge], minimumsOnly, [])?.monthsImpact).toBeNull();
  });
});
```

Append to `describe('buildDashboardInsights')` in `src/__tests__/lib/dashboard/buildInsights.test.ts`:

```ts
  it('reports debts saved outside the plan and keeps them out of the plan (spec §6.2)', () => {
    const outside = makeDebt({ id: 'x', balance: 3_000, minimumPayment: 90, interestRate: 26, inPlan: false });
    const plain = buildDashboardInsights(input());
    const out = buildDashboardInsights(input({ debts: [...DEBTS, outside] }));
    expect(plain.uncounted).toBeNull();
    expect(out.uncounted).toMatchObject({ count: 1, balance: 3_000 });
    expect(out.plan).toEqual(plain.plan);
  });
```

Append to `describe('GET /api/dashboard/insights')` in `src/__tests__/api/dashboard-insights.test.ts`:

```ts
  it('maps inPlan through: an outside debt is reported and not planned', async () => {
    const plain = await (await GET(req('?today=2026-09-12'))).json();
    mockPrisma.debt.findMany.mockResolvedValue([
      ...DEBT_ROWS,
      { ...DEBT_ROWS[0], id: 'x', name: 'Store card', balance: 1200, originalBalance: 1200, minimumPayment: 35, inPlan: false },
    ]);
    const body = await (await GET(req('?today=2026-09-12'))).json();
    expect(plain.uncounted).toBeNull();
    expect(body.uncounted).toMatchObject({ count: 1, balance: 1200 });
    expect(body.plan).toEqual(plain.plan);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/__tests__/lib/dashboard/uncounted.test.ts src/__tests__/lib/dashboard/buildInsights.test.ts src/__tests__/api/dashboard-insights.test.ts`

Expected: FAIL. `uncounted.ts` doesn't exist yet, and `uncounted` is undefined.

- [ ] **Step 3: Implement**

`src/lib/dashboard/types.ts`: add the new interface above `DashboardInsights`, change that interface's doc comment, and add the field after `plan`:

```ts
/** Debts saved outside the plan on Free past the cap (spec §5.1 `uncounted.ts`). */
export interface Uncounted {
  /** Active debts saved outside the plan. */
  count: number;
  /** Their total balance. */
  balance: number;
  /**
   * Months the plan would add if they counted. Null without income, or when
   * either run can't pay off within the 360-month cap (isPayoffComplete).
   */
  monthsImpact: number | null;
}

/** PR 6 adds `trialMoment` and trial eligibility on `tier`. */
export interface DashboardInsights {
```

```ts
  plan: PlanSummary | null;
  uncounted: Uncounted | null;
}
```

`src/lib/dashboard/uncounted.ts`:

```ts
import type { Debt, Income } from '@/types';
import { calculatePlanMetrics } from '@/lib/payoffPlan';
import { isActiveDebt, isInPlan } from '@/lib/monthlyFocusDebt';
import { isPayoffComplete } from './payoffCompletion';
import type { Uncounted } from './types';

/**
 * Debts saved outside the plan (spec §5.1). monthsImpact = months with every
 * active debt counted − months of the current plan, both from the
 * calculatePlanMetrics every tab uses. Null if either run is capped at 360
 * months: a capped run's months aren't a date.
 */
export function computeUncounted(
  debts: ReadonlyArray<Debt>,
  income: Income | null,
  expenses: ReadonlyArray<{ amount: number }>,
): Uncounted | null {
  const outside = debts.filter((d) => isActiveDebt(d) && !isInPlan(d));
  if (outside.length === 0) return null;
  return {
    count: outside.length,
    balance: outside.reduce((sum, d) => sum + d.balance, 0),
    monthsImpact: monthsImpact(debts, income, expenses),
  };
}

function monthsImpact(
  debts: ReadonlyArray<Debt>,
  income: Income | null,
  expenses: ReadonlyArray<{ amount: number }>,
): number | null {
  const current = calculatePlanMetrics([...debts], income, [...expenses]);
  const allCounted = calculatePlanMetrics(debts.map((d) => ({ ...d, inPlan: true })), income, [...expenses]);
  if (!current || !allCounted) return null;
  if (!isPayoffComplete(current.result) || !isPayoffComplete(allCounted.result)) return null;
  return allCounted.result.months - current.result.months;
}
```

`src/lib/dashboard/buildInsights.ts`: add `import { computeUncounted } from './uncounted';`. Then, in the returned object after the `plan: …` property, add:

```ts
    uncounted: computeUncounted(debts, income, expenses),
```

Test fixtures: add `uncounted: null,` after `plan: …,` in the `insights()` factories of `V2Shell.test.ts` (line 33) and `ThisMonthV2.test.ts` (line 68).

- [ ] **Step 4: Run the tests and checks**

Run each of these:

- `npx vitest run src/__tests__/lib/dashboard/uncounted.test.ts src/__tests__/lib/dashboard/buildInsights.test.ts src/__tests__/api/dashboard-insights.test.ts`. Expected: PASS.
- `npm test`. Expected: all pass.
- `npx tsc --noEmit 2>&1 | grep -v "src/__tests__/lib/stripe.test.ts"`. Expected: no output. The two fixture factories are the only `DashboardInsights` literals.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dashboard/uncounted.ts src/lib/dashboard/types.ts src/lib/dashboard/buildInsights.ts src/__tests__/lib/dashboard/uncounted.test.ts src/__tests__/lib/dashboard/buildInsights.test.ts src/__tests__/api/dashboard-insights.test.ts src/__tests__/components/dashboard-v2/V2Shell.test.ts src/__tests__/components/dashboard-v2/ThisMonthV2.test.ts
```

```bash
git commit -m "feat(dashboard): report debts saved outside the plan in insights" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Task 6: The My Debts view model, analytics events and the create-debt hook

**Files:**
- Create: `src/lib/dashboard/myDebts.ts`
- Modify: `src/lib/analyticsEvents.ts` (three events)
- Modify: `src/lib/hooks.ts` (`useCreateDebt` types, lines 60-66)
- Test: `src/__tests__/lib/dashboard/myDebts.test.ts` (new), `src/__tests__/lib/analyticsV2Events.test.ts`

**Interfaces:**
- Consumes: `Uncounted`, `PlanSummary` and `TierInfo` from `@/lib/dashboard/types`; `isActiveDebt` and `isInPlan`; `monthYearLabel` from `./format`; `formatCurrency`, `formatCurrencyWhole` and `formatMonths` from `@/lib/utils`.
- Produces (all from `@/lib/dashboard/myDebts`):
  - `planMembership<T>(debts): PlanMembership<T>` = `{ counted: T[]; outside: T[]; total: number; countedBalance: number; outsideBalance: number }`
  - `debtsSummaryView(m): DebtsSummaryView | null` = `{ pill; counted; notCounted }`
  - `debtsClosingView({ uncounted, plan, tier, total, price }): DebtsClosingView | null` = `{ date; text; cta }`
  - `upgradeSheetEView({ countedCount, total, uncounted, date, price }): UpgradeSheetEView` = `{ eyebrow; title; body; cta }`
  - `focusCardView(debt, schedule, effectiveAcceleration): FocusCardView` = `{ debtId; name; balance; apr; amount; amountLabel; goneIn }`
  - `outsidePlanNotice(countedCount, limit, proEligible): string | null`
  - `orderByPlan<T>(debts, rankById): T[]`
  - `countAllLabel(total, price): string`
- Also produces:
  - `Events.DEBT_SAVED_OUTSIDE_PLAN`, `Events.UPGRADE_MOMENT_VIEWED` and `Events.UPGRADE_MOMENT_CTA`.
  - `CreateDebtInput` from `@/lib/hooks`. `useCreateDebt().mutateAsync(input: CreateDebtInput)` resolves `{ debt: Debt; outsidePlan?: true }`.

- [ ] **Step 1: Write the failing tests**

`src/__tests__/lib/dashboard/myDebts.test.ts`:

```ts
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
```

Append to `src/__tests__/lib/analyticsV2Events.test.ts`:

```ts
describe('dashboard v2 My Debts events (spec §9)', () => {
  it('defines the three events', () => {
    expect(Events.DEBT_SAVED_OUTSIDE_PLAN).toBe('debt_saved_outside_plan');
    expect(Events.UPGRADE_MOMENT_VIEWED).toBe('upgrade_moment_viewed');
    expect(Events.UPGRADE_MOMENT_CTA).toBe('upgrade_moment_cta');
  });

  it('sends their properties through the privacy sanitiser untouched', () => {
    const props = { state: 'E', action: 'checkout', source: 'upgrade_moment_e', billing: 'monthly' };
    expect(sanitiseAnalyticsProperties(props)).toEqual(props);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/__tests__/lib/dashboard/myDebts.test.ts src/__tests__/lib/analyticsV2Events.test.ts`

Expected: FAIL. The module doesn't exist and the events are undefined.

- [ ] **Step 3: Create `src/lib/dashboard/myDebts.ts`**

```ts
import type { Debt } from '@/types';
import type { DebtPayoffSchedule } from '@/lib/snowball';
import { isActiveDebt, isInPlan } from '@/lib/monthlyFocusDebt';
import { formatCurrency, formatCurrencyWhole, formatMonths } from '@/lib/utils';
import { monthYearLabel } from './format';
import type { PlanSummary, TierInfo, Uncounted } from './types';

type MemberDebt = Pick<Debt, 'id' | 'balance' | 'inPlan'>;

export interface PlanMembership<T extends MemberDebt> {
  /** In-plan debts, paid-off ones included: what the Free cap counts (spec §6.3). */
  counted: T[];
  /** Saved outside the plan, paid-off ones included. */
  outside: T[];
  total: number;
  /** Σ balance of the active counted debts. */
  countedBalance: number;
  /** Σ balance of the active outside debts. */
  outsideBalance: number;
}

export function planMembership<T extends MemberDebt>(debts: ReadonlyArray<T>): PlanMembership<T> {
  const counted = debts.filter(isInPlan);
  const outside = debts.filter((d) => !isInPlan(d));
  const activeBalance = (list: T[]) => list.filter(isActiveDebt).reduce((sum, d) => sum + d.balance, 0);
  return {
    counted,
    outside,
    total: debts.length,
    countedBalance: activeBalance(counted),
    outsideBalance: activeBalance(outside),
  };
}

// ── The two-up totals and the pill (spec §8.5 My Debts) ────────────────────

export interface DebtsSummaryView { pill: string; counted: string; notCounted: string }

/** Null unless some debt is saved outside the plan. */
export function debtsSummaryView(m: PlanMembership<MemberDebt>): DebtsSummaryView | null {
  if (m.outside.length === 0) return null;
  return {
    pill: `${m.counted.length} of ${m.total} counted`,
    counted: formatCurrency(m.countedBalance),
    notCounted: formatCurrency(m.outsideBalance),
  };
}

// ── The closing card and upgrade moment E ─────────────────────────────────

const monthsPhrase = (n: number) => `${n} ${n === 1 ? 'month' : 'months'}`;

/** "Count all {n} — $X/mo" (spec §7 E). PR 6 adds the trial variant. */
export function countAllLabel(total: number, price: number): string {
  return `Count all ${total} — ${formatCurrencyWhole(price)}/mo`;
}

export interface DebtsClosingView { date: string; text: string; cta: string }

/**
 * The My Debts closing card (spec §8.4 "Debts closing"): for Free accounts
 * with debts outside the plan and a dated plan. Pro and trial never see it.
 */
export function debtsClosingView(args: {
  uncounted: Uncounted | null;
  plan: PlanSummary | null;
  tier: TierInfo;
  total: number;
  price: number;
}): DebtsClosingView | null {
  const { uncounted, plan, tier, total, price } = args;
  if (!uncounted || tier.proEligible || !plan || plan.months <= 0) return null;
  const date = monthYearLabel(plan.debtFreeDate);
  if (!date) return null;
  const months = uncounted.monthsImpact;
  const tail = months != null && months >= 1 ? ` — about ${monthsPhrase(months)} it doesn't include` : '';
  return {
    date,
    text: `${date} ignores ${formatCurrency(uncounted.balance)}${tail}.`,
    cta: countAllLabel(total, price),
  };
}

export interface UpgradeSheetEView { eyebrow: string; title: string; body: string; cta: string }

/** Moment E's copy (spec §7 E; the title is the README's). */
export function upgradeSheetEView(args: {
  countedCount: number;
  total: number;
  uncounted: Uncounted;
  date: string;
  price: number;
}): UpgradeSheetEView {
  const { countedCount, total, uncounted, date, price } = args;
  const balance = formatCurrency(uncounted.balance);
  const lead = uncounted.count === 1
    ? `The uncounted balance adds ${balance}`
    : `The ${uncounted.count} uncounted balances add ${balance}`;
  const months = uncounted.monthsImpact;
  const middle = months != null && months >= 1 ? ` and roughly ${monthsPhrase(months)}` : '';
  return {
    eyebrow: `Debt ${countedCount + 1} of ${total} · saved, not counted`,
    title: `Your date is built from ${countedCount} of your ${total} debts.`,
    body: `${lead}${middle} that ${date} doesn't include.`,
    cta: countAllLabel(total, price),
  };
}

// ── The focus card (D12) ──────────────────────────────────────────────────

export interface FocusCardView {
  debtId: string;
  name: string;
  balance: string;
  apr: string | null;
  /** The planned payment "Log payment" writes. */
  amount: number;
  amountLabel: string;
  goneIn: string | null;
}

/**
 * v1 This Month's focus-card figures, verbatim (ThisMonthTab.tsx:122-127,
 * 357): the planned payment is the minimum plus this month's effective
 * acceleration; "gone in" is the schedule's payoff month.
 */
export function focusCardView(
  debt: Pick<Debt, 'id' | 'name' | 'balance' | 'interestRate' | 'minimumPayment'>,
  schedule: Pick<DebtPayoffSchedule, 'monthPaidOff'> | null,
  effectiveAcceleration: number,
): FocusCardView {
  const amount = debt.minimumPayment + Math.max(0, effectiveAcceleration);
  return {
    debtId: debt.id,
    name: debt.name,
    balance: formatCurrency(debt.balance),
    apr: debt.interestRate > 0 ? `${debt.interestRate}% APR` : null,
    amount,
    amountLabel: formatCurrency(amount),
    goneIn: schedule && schedule.monthPaidOff > 0 ? formatMonths(schedule.monthPaidOff) : null,
  };
}

// ── The add-debt sheet and the row order ──────────────────────────────────

/** Shown before a Free account at the cap saves: this debt lands outside the plan. */
export function outsidePlanNotice(countedCount: number, limit: number, proEligible: boolean): string | null {
  if (proEligible || countedCount < limit) return null;
  return `On Free, your plan counts ${limit} debts. This one will be saved outside it.`;
}

/** Payoff order (the plan's rank), unranked after ranked, paid-off last; ties keep the given order. */
export function orderByPlan<T extends Pick<Debt, 'id' | 'balance'>>(
  debts: ReadonlyArray<T>,
  rankById: ReadonlyMap<string, number>,
): T[] {
  const rank = (d: T) => rankById.get(d.id) ?? Number.MAX_SAFE_INTEGER;
  return [...debts].sort((a, b) => {
    const aActive = isActiveDebt(a);
    const bActive = isActiveDebt(b);
    if (aActive !== bActive) return aActive ? -1 : 1;
    return rank(a) - rank(b);
  });
}
```

- [ ] **Step 4: Add the events and widen the hook**

`src/lib/analyticsEvents.ts`, after `BULK_LOG_SUBMITTED`:

```ts
  // Dashboard v2 My Debts (spec §9). Strings only.
  DEBT_SAVED_OUTSIDE_PLAN: 'debt_saved_outside_plan',
  UPGRADE_MOMENT_VIEWED: 'upgrade_moment_viewed',
  UPGRADE_MOMENT_CTA: 'upgrade_moment_cta',
```

`src/lib/hooks.ts`: add the type above `useCreateDebt`, and change the two typed lines inside it:

```ts
/** `allowOutsidePlan`: dashboard v2 only — past the Free cap, save outside the plan (spec §6.3). */
export type CreateDebtInput = Partial<Debt> & { allowOutsidePlan?: boolean };
```

```ts
    mutationFn: async (debt: CreateDebtInput) => {
      const { data } = await axios.post(`${API_URL}/api/debts`, debt);
      return data as { debt: Debt; outsidePlan?: true };
    },
```

- [ ] **Step 5: Run the tests and checks**

- Run: `npx vitest run src/__tests__/lib/dashboard/myDebts.test.ts src/__tests__/lib/analyticsV2Events.test.ts`. Expected: PASS.
- Run: `npm test`. Expected: all pass.
- Run: `npx tsc --noEmit 2>&1 | grep -v "src/__tests__/lib/stripe.test.ts"`. Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/lib/dashboard/myDebts.ts src/lib/analyticsEvents.ts src/lib/hooks.ts src/__tests__/lib/dashboard/myDebts.test.ts src/__tests__/lib/analyticsV2Events.test.ts
```

```bash
git commit -m "feat(dashboard): add the My Debts view model and moment E events" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Task 7: Optional sheet footer, the ink closing card, and upgrade moment E

**Files:**
- Modify: `src/components/dashboard-v2/sheets/Sheet.tsx` (`footer` becomes optional)
- Create: `src/components/dashboard-v2/ClosingCard.tsx`
- Create: `src/components/dashboard-v2/sheets/UpgradeSheet.tsx`
- Test: `src/__tests__/components/dashboard-v2/Sheet.test.ts`, `src/__tests__/components/dashboard-v2/ClosingCard.test.ts` (new), `src/__tests__/components/dashboard-v2/UpgradeSheet.test.ts` (new)

**Interfaces:**
- Consumes: `UpgradeSheetEView` (Task 6); `useStartCheckout` and `getErrorMessage` from `@/lib/hooks`; `Events.UPGRADE_MOMENT_VIEWED`, `UPGRADE_MOMENT_CTA` and `CHECKOUT_STARTED`.
- Produces:
  - `SheetProps.footer?: ReactNode`
  - `ClosingCard` props `{ children: ReactNode; cta: string; onCta: () => void }`
  - `UpgradeSheet` props `{ view: UpgradeSheetEView; counted: ReadonlyArray<Pick<Debt, 'id' | 'name' | 'balance'>>; outside: same; onClose: () => void }`

- [ ] **Step 1: Write the failing tests**

Add to `describe('Sheet')` in `src/__tests__/components/dashboard-v2/Sheet.test.ts`:

```ts
  it('drops the footer bar when there is no footer', () => {
    renderSheet({ footer: undefined });
    // The header and the body only.
    expect(screen.getByRole('dialog').children).toHaveLength(2);
  });
```

`src/__tests__/components/dashboard-v2/ClosingCard.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ClosingCard from '@/components/dashboard-v2/ClosingCard';

describe('ClosingCard', () => {
  it('names the number and runs its one action', () => {
    const onCta = vi.fn();
    render(createElement(ClosingCard, { cta: 'Count all 5 — $9/mo', onCta, children: 'April 2029 ignores $4,910.25.' }));
    expect(screen.getByText('April 2029 ignores $4,910.25.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Count all 5 — $9/mo' }));
    expect(onCta).toHaveBeenCalledTimes(1);
  });
});
```

`src/__tests__/components/dashboard-v2/UpgradeSheet.test.ts`:

```ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { useStartCheckout } from '@/lib/hooks';
import { track, Events } from '@/lib/analytics';
import UpgradeSheet from '@/components/dashboard-v2/sheets/UpgradeSheet';

vi.mock('@/lib/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/hooks')>()),
  useStartCheckout: vi.fn(),
}));
vi.mock('@/lib/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/analytics')>()),
  track: vi.fn(),
}));

const VIEW = {
  eyebrow: 'Debt 4 of 5 · saved, not counted',
  title: 'Your date is built from 3 of your 5 debts.',
  body: "The 2 uncounted balances add $4,910.25 and roughly 19 months that April 2029 doesn't include.",
  cta: 'Count all 5 — $9/mo',
};
const COUNTED = [{ id: 'a', name: 'Visa', balance: 1_000.5 }, { id: 'b', name: 'Car', balance: 9_000 }];
const OUTSIDE = [{ id: 'x', name: 'Store card', balance: 1_200 }];

function renderSheet(checkout: Record<string, unknown> = {}) {
  const mutate = vi.fn();
  vi.mocked(useStartCheckout).mockReturnValue(
    { mutate, isPending: false, isError: false, error: null, ...checkout } as unknown as ReturnType<typeof useStartCheckout>,
  );
  const onClose = vi.fn();
  render(createElement(UpgradeSheet, { view: VIEW, counted: COUNTED, outside: OUTSIDE, onClose }));
  return { mutate, onClose };
}

afterEach(() => vi.clearAllMocks());

describe('UpgradeSheet — moment E (spec §7)', () => {
  it("shows the user's counted and outside debts with the moment's copy", () => {
    renderSheet();
    const dialog = screen.getByRole('dialog', { name: VIEW.title });
    expect(within(dialog).getByText(VIEW.eyebrow)).toBeTruthy();
    const list = within(dialog).getByRole('list', { name: 'Your debts' });
    expect(within(list).getByText('$1,000.50')).toBeTruthy();
    expect(within(list).getByText('Store card')).toBeTruthy();
    expect(within(list).getByText('not in plan')).toBeTruthy();
    expect(within(dialog).getByText(VIEW.body)).toBeTruthy();
    expect(track).toHaveBeenCalledWith(Events.UPGRADE_MOMENT_VIEWED, { state: 'E' });
  });

  it('starts the existing checkout from its CTA', () => {
    const { mutate } = renderSheet();
    fireEvent.click(screen.getByRole('button', { name: VIEW.cta }));
    expect(track).toHaveBeenCalledWith(Events.UPGRADE_MOMENT_CTA, { state: 'E', action: 'checkout' });
    expect(track).toHaveBeenCalledWith(Events.CHECKOUT_STARTED, { source: 'upgrade_moment_e', billing: 'monthly' });
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it('holds the sheet while checkout redirects', () => {
    renderSheet({ isPending: true });
    expect((screen.getByRole('button', { name: 'Redirecting…' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Close' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('says so when checkout fails', () => {
    renderSheet({ isError: true, error: new Error('Network down') });
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/__tests__/components/dashboard-v2/Sheet.test.ts src/__tests__/components/dashboard-v2/ClosingCard.test.ts src/__tests__/components/dashboard-v2/UpgradeSheet.test.ts`

Expected: FAIL. The sheet always renders its footer bar, and the two components don't exist yet.

- [ ] **Step 3: Make the footer optional**

In `Sheet.tsx`, change the `footer` prop:

```ts
  /** Pinned under the scrolling body: the primary action. Omit when the body brings its own (a form's buttons). */
  footer?: ReactNode;
```

Then replace the body `div` and the footer `div` at the end of the dialog with:

```tsx
        <div
          className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 ${
            footer != null ? "py-2" : "pb-[calc(12px+env(safe-area-inset-bottom))] pt-2 min-[769px]:pb-3"
          }`}
        >
          {children}
        </div>
        {footer != null && (
          <div className="shrink-0 border-t border-border px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 min-[769px]:pb-3">
            {footer}
          </div>
        )}
```

- [ ] **Step 4: Create `src/components/dashboard-v2/ClosingCard.tsx`**

```tsx
"use client";

import type { ReactNode } from "react";

interface ClosingCardProps {
  /** One sentence naming a number the user already owns (README "The System", rule 2). */
  children: ReactNode;
  cta: string;
  onCta: () => void;
}

/** A tab's closing card, ink variant (DESIGN.md 2026-09-12). PR 5 adds the red one. */
export default function ClosingCard({ children, cta, onCta }: ClosingCardProps) {
  return (
    <section className="rounded-xl bg-ink px-3.5 py-[13px]">
      <p className="text-[13px] font-bold leading-snug text-white [text-wrap:pretty]">{children}</p>
      <button
        type="button"
        onClick={onCta}
        className="mt-3 flex min-h-[46px] w-full items-center justify-center rounded-lg bg-surface px-4 text-[14px] font-extrabold text-ink outline-none transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action motion-reduce:transition-none"
      >
        {cta}
      </button>
    </section>
  );
}
```

- [ ] **Step 5: Create `src/components/dashboard-v2/sheets/UpgradeSheet.tsx`**

```tsx
"use client";

import { useEffect } from "react";
import type { Debt } from "@/types";
import { getErrorMessage, useStartCheckout } from "@/lib/hooks";
import { track, Events } from "@/lib/analytics";
import { formatCurrency } from "@/lib/utils";
import type { UpgradeSheetEView } from "@/lib/dashboard/myDebts";
import { CTA_BLUE, ERROR_LINE, EYEBROW } from "../styles";
import Sheet from "./Sheet";

type SheetDebt = Pick<Debt, "id" | "name" | "balance">;

interface UpgradeSheetProps {
  view: UpgradeSheetEView;
  counted: ReadonlyArray<SheetDebt>;
  outside: ReadonlyArray<SheetDebt>;
  onClose: () => void;
}

/**
 * Upgrade moment E (spec §7): at the Free cap, opened from the My Debts
 * closing card. Its CTA is the existing checkout; states A–D arrive in PR 6.
 */
export default function UpgradeSheet({ view, counted, outside, onClose }: UpgradeSheetProps) {
  const checkout = useStartCheckout();

  useEffect(() => {
    track(Events.UPGRADE_MOMENT_VIEWED, { state: "E" });
  }, []);

  const startCheckout = () => {
    track(Events.UPGRADE_MOMENT_CTA, { state: "E", action: "checkout" });
    track(Events.CHECKOUT_STARTED, { source: "upgrade_moment_e", billing: "monthly" });
    checkout.mutate();
  };

  const error = checkout.isError
    ? getErrorMessage(checkout.error, "Could not start checkout. Please try again.")
    : null;

  return (
    <Sheet
      title={view.title}
      busy={checkout.isPending}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={startCheckout} disabled={checkout.isPending} className={CTA_BLUE}>
            {checkout.isPending ? "Redirecting…" : view.cta}
          </button>
          {error && <p role="alert" className={`mt-2 ${ERROR_LINE}`}>{error}</p>}
        </>
      }
    >
      <p className={`${EYEBROW} text-txt-muted`}>{view.eyebrow}</p>
      <ul aria-label="Your debts" className="mt-2 flex flex-col gap-1.5">
        {counted.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-[13px]">
            <span className="min-w-0 truncate font-semibold text-txt">{d.name}</span>
            <span className="mono shrink-0 font-bold tabular-nums text-txt">{formatCurrency(d.balance)}</span>
          </li>
        ))}
        {outside.map((d) => (
          // Dashed = saved outside the plan, and nothing else (DESIGN.md 2026-09-12).
          <li key={d.id} className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-txt-muted/40 bg-bg px-3 py-2 text-[13px]">
            <span className="min-w-0 truncate font-semibold text-txt-muted">{d.name}</span>
            <span className="shrink-0 text-[11px] font-bold text-txt-muted">not in plan</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[13px] leading-relaxed text-txt [text-wrap:pretty]">{view.body}</p>
    </Sheet>
  );
}
```

- [ ] **Step 6: Run the tests and checks**

- Run: `npx vitest run src/__tests__/components/dashboard-v2/Sheet.test.ts src/__tests__/components/dashboard-v2/ClosingCard.test.ts src/__tests__/components/dashboard-v2/UpgradeSheet.test.ts`. Expected: PASS, including every existing Sheet, DueDatesSheet and BulkLogSheet test.
- Run: `npm test`. Expected: all pass.
- Run: `npx tsc --noEmit 2>&1 | grep -v "src/__tests__/lib/stripe.test.ts"`. Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add src/components/dashboard-v2/sheets/Sheet.tsx src/components/dashboard-v2/ClosingCard.tsx src/components/dashboard-v2/sheets/UpgradeSheet.tsx src/__tests__/components/dashboard-v2/Sheet.test.ts src/__tests__/components/dashboard-v2/ClosingCard.test.ts src/__tests__/components/dashboard-v2/UpgradeSheet.test.ts
```

```bash
git commit -m "feat(dashboard-v2): add the ink closing card and upgrade moment E" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Task 8: The outside-plan row, the focus card, and the two-up totals

**Files:**
- Modify: `src/components/debt/CompactDebtRow.tsx` (new optional prop `outsidePlan`)
- Create: `src/components/dashboard-v2/debts/FocusDebtCard.tsx`
- Create: `src/components/dashboard-v2/debts/DebtsSummary.tsx`
- Test: `src/__tests__/components/debt/CompactDebtRow.test.ts` (new), `src/__tests__/components/dashboard-v2/FocusDebtCard.test.ts` (new), `src/__tests__/components/dashboard-v2/DebtsSummary.test.ts` (new)

**Interfaces:**
- Consumes: `FocusCardView` and `DebtsSummaryView` (Task 6).
- Produces:
  - `CompactDebtRowProps.outsidePlan?: boolean`, default false. With it off, the row renders exactly as it does today.
  - `FocusDebtCard` props: `{ view: FocusCardView; pending: boolean; onLog: () => void }`.
  - `DebtsSummary` props: `{ view: DebtsSummaryView }`.

- [ ] **Step 1: Write the failing tests**

`src/__tests__/components/debt/CompactDebtRow.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import CompactDebtRow from '@/components/debt/CompactDebtRow';
import { makeDebt } from '../../lib/dashboard/fixtures';

const BASE = {
  isFocus: false,
  paidThisMonth: false,
  defaultOpen: false,
  forceOpen: false,
  children: createElement('div', null, 'card'),
};

describe('CompactDebtRow', () => {
  it('renders an in-plan row as before: solid border, no plan label', () => {
    render(createElement(CompactDebtRow, { ...BASE, debt: makeDebt({ id: 'a', name: 'Visa', balance: 900, minimumPayment: 25 }) }));
    expect(screen.getByRole('button', { expanded: false }).getAttribute('style')).toContain('solid');
    expect(screen.queryByText('Not in plan')).toBeNull();
  });

  it('marks a debt saved outside the plan: dashed, labeled (spec §8.5)', () => {
    render(createElement(CompactDebtRow, {
      ...BASE,
      outsidePlan: true,
      debt: makeDebt({ id: 'x', name: 'Store card', balance: 1_200, minimumPayment: 35, inPlan: false }),
    }));
    expect(screen.getByRole('button', { expanded: false }).getAttribute('style')).toContain('dashed');
    expect(screen.getByText('Not in plan')).toBeTruthy();
  });

  it('keeps the label when expanded', () => {
    render(createElement(CompactDebtRow, {
      ...BASE,
      defaultOpen: true,
      outsidePlan: true,
      debt: makeDebt({ id: 'x', name: 'Store card', balance: 1_200, minimumPayment: 35, inPlan: false }),
    }));
    expect(screen.getByText('Not in plan')).toBeTruthy();
    expect(screen.getByText('card')).toBeTruthy();
  });
});
```

`src/__tests__/components/dashboard-v2/FocusDebtCard.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import FocusDebtCard from '@/components/dashboard-v2/debts/FocusDebtCard';

const VIEW = {
  debtId: 'a', name: 'Visa', balance: '$1,000.50', apr: '28.74% APR',
  amount: 565, amountLabel: '$565.00', goneIn: '3m',
};

describe('FocusDebtCard', () => {
  it('shows the focus debt and what to pay here this month', () => {
    render(createElement(FocusDebtCard, { view: VIEW, pending: false, onLog: vi.fn() }));
    const card = screen.getByRole('region', { name: 'Visa' });
    expect(within(card).getByText('Focus')).toBeTruthy();
    expect(within(card).getByText('$1,000.50')).toBeTruthy();
    expect(within(card).getByText('28.74% APR')).toBeTruthy();
    expect(card.textContent).toContain('Pay $565.00 here this month · gone in 3m');
  });

  it('logs the planned payment from its CTA', () => {
    const onLog = vi.fn();
    render(createElement(FocusDebtCard, { view: VIEW, pending: false, onLog }));
    fireEvent.click(screen.getByRole('button', { name: 'Log payment' }));
    expect(onLog).toHaveBeenCalledTimes(1);
  });

  it('holds its CTA while saving', () => {
    render(createElement(FocusDebtCard, { view: VIEW, pending: true, onLog: vi.fn() }));
    expect((screen.getByRole('button', { name: 'Saving…' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('drops the payoff clause without a schedule, and the rate at 0%', () => {
    render(createElement(FocusDebtCard, { view: { ...VIEW, apr: null, goneIn: null }, pending: false, onLog: vi.fn() }));
    const card = screen.getByRole('region', { name: 'Visa' });
    expect(card.textContent).toContain('Pay $565.00 here this month');
    expect(card.textContent).not.toContain('gone in');
    expect(within(card).queryByText(/APR/)).toBeNull();
  });
});
```

`src/__tests__/components/dashboard-v2/DebtsSummary.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import DebtsSummary from '@/components/dashboard-v2/debts/DebtsSummary';

describe('DebtsSummary', () => {
  it('shows the counted and not-counted totals, the outside one dashed', () => {
    render(createElement(DebtsSummary, { view: { pill: '3 of 5 counted', counted: '$10,000.50', notCounted: '$4,910.25' } }));
    expect(screen.getByText('Counted').parentElement?.textContent).toContain('$10,000.50');
    const notCounted = screen.getByText('Not counted').parentElement;
    expect(notCounted?.textContent).toContain('$4,910.25');
    expect(notCounted?.className).toContain('border-dashed');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/__tests__/components/debt/CompactDebtRow.test.ts src/__tests__/components/dashboard-v2/FocusDebtCard.test.ts src/__tests__/components/dashboard-v2/DebtsSummary.test.ts`

Expected: FAIL. The row has no dashed variant yet, and the two components don't exist.

- [ ] **Step 3: Add the outside variant to `CompactDebtRow.tsx`**

This file is v1 code in inline styles, so the variant follows its idiom. Add the prop to `CompactDebtRowProps`:

```ts
  /** Saved outside the plan (spec §8.5): dashed, muted, labeled "Not in plan". */
  outsidePlan?: boolean;
```

Add `outsidePlan = false,` to the destructured props, after `syncPaused = false,`.

Below `chipBase`, add:

```ts
// Dashed = saved outside the plan, and nothing else (DESIGN.md 2026-09-12).
const outsideSurface = {
  background: "#f8fafc",
  border: "1px dashed rgba(15,23,42,0.16)",
  borderRadius: cardSurface.borderRadius,
};
```

In `nameChips`:
- Change the name span's `color` to `isPaidOff ? "#059669" : outsidePlan ? "#64748b" : "#0f172a"`.
- Add this chip after the `isLinked` chip:

```tsx
        {outsidePlan && (
          <span style={{ ...chipBase, color: "#64748b", background: "#f8fafc", border: "1px dashed rgba(15,23,42,0.16)" }}>
            Not in plan
          </span>
        )}
```

In the collapsed button:
- Change `...cardSurface,` to `...(outsidePlan ? outsideSurface : cardSurface),`.
- Change the balance span's `color` to `isPaidOff ? "#059669" : outsidePlan ? "#64748b" : "#0f172a"`.

- [ ] **Step 4: Create `src/components/dashboard-v2/debts/FocusDebtCard.tsx`**

```tsx
"use client";

import { useId } from "react";
import type { FocusCardView } from "@/lib/dashboard/myDebts";
import { CTA_BLUE } from "../styles";

interface FocusDebtCardProps {
  view: FocusCardView;
  pending: boolean;
  onLog: () => void;
}

/**
 * The month's focus debt (D12: on My Debts, not This Month), with v1 This
 * Month's figures. The APR is muted: red at 11px fails AA contrast.
 */
export default function FocusDebtCard({ view, pending, onLog }: FocusDebtCardProps) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="rounded-xl border border-focus-card-border bg-focus-card px-3.5 py-[13px]">
      <div className="flex items-center gap-2">
        <h3 id={titleId} className="min-w-0 truncate text-[15px] font-extrabold text-txt">{view.name}</h3>
        <span className="shrink-0 rounded-full bg-action/10 px-2 py-0.5 text-[10px] font-extrabold text-action">Focus</span>
      </div>
      <p className="mt-1 flex items-baseline gap-2">
        <span className="mono text-[23px] font-extrabold tabular-nums tracking-[-0.02em] text-txt">{view.balance}</span>
        {view.apr && <span className="text-[11px] font-bold text-txt-muted">{view.apr}</span>}
      </p>
      <p className="mt-1 text-[13px] text-txt-muted [text-wrap:pretty]">
        Pay <strong className="mono font-extrabold tabular-nums text-txt">{view.amountLabel}</strong> here this month
        {view.goneIn && ` · gone in ${view.goneIn}`}
      </p>
      <button type="button" onClick={onLog} disabled={pending} className={`mt-3 ${CTA_BLUE}`}>
        {pending ? "Saving…" : "Log payment"}
      </button>
    </section>
  );
}
```

- [ ] **Step 5: Create `src/components/dashboard-v2/debts/DebtsSummary.tsx`**

```tsx
import type { DebtsSummaryView } from "@/lib/dashboard/myDebts";
import { CARD, EYEBROW } from "../styles";

/**
 * Counted vs not counted (spec §8.5): shown only when debts sit outside the
 * plan. The red figure is 19px extrabold, large text for contrast (3:1).
 */
export default function DebtsSummary({ view }: { view: DebtsSummaryView }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className={`${CARD} px-3.5 py-3`}>
        <p className={`${EYEBROW} text-txt-muted`}>Counted</p>
        <p className="mono mt-1 text-[19px] font-extrabold tabular-nums text-txt">{view.counted}</p>
      </div>
      <div className="rounded-xl border border-dashed border-danger/35 bg-surface px-3.5 py-3">
        <p className={`${EYEBROW} text-txt-muted`}>Not counted</p>
        <p className="mono mt-1 text-[19px] font-extrabold tabular-nums text-danger">{view.notCounted}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Run the tests and checks**

- Run `npx vitest run src/__tests__/components/debt/CompactDebtRow.test.ts src/__tests__/components/dashboard-v2/FocusDebtCard.test.ts src/__tests__/components/dashboard-v2/DebtsSummary.test.ts`. Expected: PASS.
- Run `npm test`. Expected: all pass.
- Run `npx tsc --noEmit 2>&1 | grep -v "src/__tests__/lib/stripe.test.ts"`. Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add src/components/debt/CompactDebtRow.tsx src/components/dashboard-v2/debts/FocusDebtCard.tsx src/components/dashboard-v2/debts/DebtsSummary.tsx src/__tests__/components/debt/CompactDebtRow.test.ts src/__tests__/components/dashboard-v2/FocusDebtCard.test.ts src/__tests__/components/dashboard-v2/DebtsSummary.test.ts
```

```bash
git commit -m "feat(dashboard-v2): add the outside-plan row, the focus card and the counted totals" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Task 9: The collapsed reminders/calendar card and the add-debt sheet

**Files:**
- Create: `src/components/dashboard-v2/debts/PaymentToolsSection.tsx`
- Create: `src/components/dashboard-v2/debts/DebtFormSheet.tsx`
- Test: `src/__tests__/components/dashboard-v2/PaymentToolsSection.test.ts` (new), `src/__tests__/components/dashboard-v2/DebtFormSheet.test.ts` (new)

**Interfaces:**
- Consumes:
  - `getUpcomingPayments` (`src/lib/debtHelpers.ts`: active debts with a due day within 7 days, overdue included, sorted soonest first)
  - `PaymentCalendar` (props `debts`, `focusDebtId`, `focusExtra`)
  - `Collapsible`, `CollapsibleTrigger` and `CollapsibleContent` from `@/components/ui/collapsible`
  - `useCreateDebt` and `CreateDebtInput` (Task 6)
  - `Sheet` with its optional footer (Task 7)
  - `DebtForm` (props `onSubmit(data)`, `onCancel`, `isLoading`)
- Produces:
  - `PaymentToolsSection` props: `{ debts: Debt[]; paidDebtIds: ReadonlySet<string>; focusDebtId: string | null; focusExtra: number; isPro: boolean; subscriptionKnown: boolean; onOpenDebt: (debtId: string) => void }`.
  - `DebtFormSheet` props: `{ notice: string | null; onClose: () => void }`.

- [ ] **Step 1: Write the failing tests**

`src/__tests__/components/dashboard-v2/PaymentToolsSection.test.ts`:

```ts
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { upgradeEvents } from '@/lib/upgradeEvents';
import PaymentToolsSection from '@/components/dashboard-v2/debts/PaymentToolsSection';
import { makeDebt } from '../../lib/dashboard/fixtures';

vi.mock('@/components/PaymentCalendar', async () => {
  const { createElement: h } = await import('react');
  return {
    default: (p: { focusDebtId: string | null; focusExtra: number }) =>
      h('div', { 'data-stub': 'PaymentCalendar', 'data-focus': p.focusDebtId, 'data-extra': String(p.focusExtra) }),
  };
});
vi.mock('@/lib/upgradeEvents', () => ({ upgradeEvents: { dispatch: vi.fn() } }));

// Today is the 15th: Visa is due tomorrow, the car loan in 2 days.
const DEBTS = [
  makeDebt({ id: 'a', name: 'Visa', balance: 900, minimumPayment: 25, dueDate: 16 }),
  makeDebt({ id: 'b', name: 'Car', balance: 9_000, minimumPayment: 310, dueDate: 17 }),
];

function renderSection(overrides: Record<string, unknown> = {}) {
  const onOpenDebt = vi.fn();
  render(createElement(PaymentToolsSection, {
    debts: DEBTS, paidDebtIds: new Set<string>(), focusDebtId: 'a', focusExtra: 200,
    isPro: true, subscriptionKnown: true, onOpenDebt, ...overrides,
  }));
  return { onOpenDebt, open: () => fireEvent.click(screen.getByRole('button', { name: /Payment calendar & reminders/ })) };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 8, 15, 12, 0));
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('PaymentToolsSection (spec §8.3)', () => {
  it('starts collapsed and opens on its trigger', () => {
    const { open } = renderSection();
    expect(screen.getByRole('button', { name: /Payment calendar & reminders/ }).getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('Upcoming payments')).toBeNull();
    open();
    expect(screen.getByText('Upcoming payments')).toBeTruthy();
    const calendar = document.querySelector('[data-stub="PaymentCalendar"]');
    expect(calendar?.getAttribute('data-focus')).toBe('a');
    expect(calendar?.getAttribute('data-extra')).toBe('200');
  });

  it("opens a reminder's debt, and skips debts already paid this month", () => {
    const { onOpenDebt, open } = renderSection({ paidDebtIds: new Set(['b']) });
    open();
    expect(screen.queryByText(/Car ·/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Visa · \$25\.00/ }));
    expect(onOpenDebt).toHaveBeenCalledWith('a');
  });

  it('exports due dates for Pro', () => {
    const { open } = renderSection();
    open();
    expect(screen.getByRole('link', { name: 'Add to Calendar' }).getAttribute('href')).toBe('/api/calendar/export');
  });

  it('gives Free a gated export control (spec §8.3 GatedTile)', () => {
    const { open } = renderSection({ isPro: false });
    open();
    const gated = screen.getByRole('button', { name: 'Add to Calendar — Pro' });
    expect(gated.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(gated);
    expect(upgradeEvents.dispatch).toHaveBeenCalledWith('Export payoff plan');
  });
});
```

`src/__tests__/components/dashboard-v2/DebtFormSheet.test.ts`:

```ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useCreateDebt } from '@/lib/hooks';
import { track, Events } from '@/lib/analytics';
import DebtFormSheet from '@/components/dashboard-v2/debts/DebtFormSheet';

vi.mock('@/components/DebtForm', async () => {
  const { createElement: h } = await import('react');
  return {
    default: (p: { onSubmit: (data: unknown) => void; onCancel: () => void }) =>
      h('div', null,
        h('button', {
          type: 'button',
          onClick: () => p.onSubmit({ name: 'Store card', category: 'Credit Card', balance: 1200, interestRate: 24.99, minimumPayment: 40 }),
        }, 'Submit form'),
        h('button', { type: 'button', onClick: p.onCancel }, 'Cancel form')),
  };
});
vi.mock('@/lib/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/hooks')>()),
  useCreateDebt: vi.fn(),
}));
vi.mock('@/lib/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/analytics')>()),
  track: vi.fn(),
}));

const NOTICE = 'On Free, your plan counts 5 debts. This one will be saved outside it.';

function renderSheet(notice: string | null, mutateAsync = vi.fn().mockResolvedValue({ debt: { id: 'd1' } })) {
  vi.mocked(useCreateDebt).mockReturnValue({ mutateAsync, isPending: false } as unknown as ReturnType<typeof useCreateDebt>);
  const onClose = vi.fn();
  render(createElement(DebtFormSheet, { notice, onClose }));
  return { mutateAsync, onClose };
}

afterEach(() => vi.clearAllMocks());

describe('DebtFormSheet', () => {
  it('opts in to saving past the Free cap, then closes', async () => {
    const { mutateAsync, onClose } = renderSheet(null);
    fireEvent.click(screen.getByRole('button', { name: 'Submit form' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ name: 'Store card', allowOutsidePlan: true }));
    expect(track).toHaveBeenCalledWith(Events.DEBT_ADDED, { category: 'Credit Card' });
    expect(track).not.toHaveBeenCalledWith(Events.DEBT_SAVED_OUTSIDE_PLAN);
  });

  it('records a save outside the plan', async () => {
    const { onClose } = renderSheet(NOTICE, vi.fn().mockResolvedValue({ debt: { id: 'd1' }, outsidePlan: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit form' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(track).toHaveBeenCalledWith(Events.DEBT_SAVED_OUTSIDE_PLAN);
  });

  it('says up front when the debt will be saved outside the plan', () => {
    renderSheet(NOTICE);
    const dialog = screen.getByRole('dialog', { name: 'Add a debt' });
    expect(within(dialog).getByText(NOTICE)).toBeTruthy();
  });

  it('keeps the form open with an error when the save fails', async () => {
    const { onClose } = renderSheet(null, vi.fn().mockRejectedValue(new Error('boom')));
    fireEvent.click(screen.getByRole('button', { name: 'Submit form' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes from the form's cancel", () => {
    const { onClose } = renderSheet(null);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel form' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/__tests__/components/dashboard-v2/PaymentToolsSection.test.ts src/__tests__/components/dashboard-v2/DebtFormSheet.test.ts`

Expected: FAIL. Neither component exists yet.

- [ ] **Step 3: Create `src/components/dashboard-v2/debts/PaymentToolsSection.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Calendar, ChevronDown, Lock } from "lucide-react";
import type { Debt } from "@/types";
import { getUpcomingPayments } from "@/lib/debtHelpers";
import { formatCurrency } from "@/lib/utils";
import { upgradeEvents } from "@/lib/upgradeEvents";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import PaymentCalendar from "@/components/PaymentCalendar";
import { CARD, EYEBROW } from "../styles";

const TOOL_BUTTON =
  "flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 text-[13px] font-bold outline-none hover:bg-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action";

interface PaymentToolsSectionProps {
  debts: Debt[];
  paidDebtIds: ReadonlySet<string>;
  focusDebtId: string | null;
  focusExtra: number;
  isPro: boolean;
  /** False until the subscription query answers: the export control waits for it (as in v1). */
  subscriptionKnown: boolean;
  /** Opens that debt's row and its payment panel. */
  onOpenDebt: (debtId: string) => void;
}

/** v1 My Debts' reminders, calendar and calendar export, collapsed (spec §8.3). */
export default function PaymentToolsSection({
  debts, paidDebtIds, focusDebtId, focusExtra, isPro, subscriptionKnown, onOpenDebt,
}: PaymentToolsSectionProps) {
  const [open, setOpen] = useState(false);
  const upcoming = getUpcomingPayments(debts).filter((p) => !paidDebtIds.has(p.debt.id));
  const canExport = subscriptionKnown && debts.some((d) => d.dueDate);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={CARD}>
      <CollapsibleTrigger className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-4 text-left text-[13px] font-extrabold text-txt outline-none focus-visible:outline-2 focus-visible:outline-action">
        Payment calendar &amp; reminders
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`shrink-0 text-txt-muted transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-3 px-4 pb-4">
        {upcoming.length > 0 && (
          <div>
            <p className={`${EYEBROW} text-txt-muted`}>Upcoming payments</p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {upcoming.map(({ debt, label }) => (
                <li key={debt.id}>
                  <button
                    type="button"
                    onClick={() => onOpenDebt(debt.id)}
                    className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-border px-3 text-left text-[12px] outline-none hover:bg-bg focus-visible:outline-2 focus-visible:outline-action"
                  >
                    <span className="shrink-0 font-bold text-txt">{label}</span>
                    <span className="min-w-0 truncate text-txt-muted">
                      {debt.name} · {formatCurrency(debt.minimumPayment)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <PaymentCalendar debts={debts} focusDebtId={focusDebtId} focusExtra={focusExtra} />
        {canExport && (isPro ? (
          <a href="/api/calendar/export" download="debt-due-dates.ics" className={`${TOOL_BUTTON} text-txt`}>
            <Calendar size={14} aria-hidden="true" />
            Add to Calendar
          </a>
        ) : (
          <button
            type="button"
            aria-disabled="true"
            onClick={() => upgradeEvents.dispatch("Export payoff plan")}
            className={`${TOOL_BUTTON} text-txt-muted`}
          >
            <Lock size={13} aria-hidden="true" />
            Add to Calendar — Pro
          </button>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
```

- [ ] **Step 4: Create `src/components/dashboard-v2/debts/DebtFormSheet.tsx`**

```tsx
"use client";

import { useState } from "react";
import type { Debt } from "@/types";
import DebtForm from "@/components/DebtForm";
import { getErrorMessage, useCreateDebt } from "@/lib/hooks";
import { track, Events } from "@/lib/analytics";
import Sheet from "../sheets/Sheet";
import { ERROR_LINE } from "../styles";

interface DebtFormSheetProps {
  /** Under the title when this save lands outside the plan (outsidePlanNotice). */
  notice: string | null;
  onClose: () => void;
}

/**
 * Add a debt in a sheet (spec §8.3). v2 always opts in: past the Free cap the
 * server saves the debt outside the plan instead of refusing it (§6.3).
 */
export default function DebtFormSheet({ notice, onClose }: DebtFormSheetProps) {
  const createDebt = useCreateDebt();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: Partial<Debt>) => {
    setError(null);
    try {
      const result = await createDebt.mutateAsync({ ...formData, allowOutsidePlan: true });
      track(Events.DEBT_ADDED, { category: formData.category });
      if (result.outsidePlan) track(Events.DEBT_SAVED_OUTSIDE_PLAN);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't save this debt. Try again."));
    }
  };

  return (
    <Sheet title="Add a debt" description={notice ?? undefined} busy={createDebt.isPending} onClose={onClose}>
      <DebtForm onSubmit={handleSubmit} onCancel={onClose} isLoading={createDebt.isPending} />
      {error && <p role="alert" className={`mt-3 ${ERROR_LINE}`}>{error}</p>}
    </Sheet>
  );
}
```

- [ ] **Step 5: Run the tests and checks**

- Run `npx vitest run src/__tests__/components/dashboard-v2/PaymentToolsSection.test.ts src/__tests__/components/dashboard-v2/DebtFormSheet.test.ts`. Expected: PASS.
- Run `npm test`. Expected: all pass.
- Run `npx tsc --noEmit 2>&1 | grep -v "src/__tests__/lib/stripe.test.ts"`. Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard-v2/debts/PaymentToolsSection.tsx src/components/dashboard-v2/debts/DebtFormSheet.tsx src/__tests__/components/dashboard-v2/PaymentToolsSection.test.ts src/__tests__/components/dashboard-v2/DebtFormSheet.test.ts
```

```bash
git commit -m "feat(dashboard-v2): add the collapsed payment tools and the add-debt sheet" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Task 10: `DebtsV2` and the flag switch

**Files:**
- Create: `src/components/dashboard-v2/debts/DebtsV2.tsx`
- Modify: `src/components/DashboardClient.tsx` (import; the `activeTab === "debts"` block at lines 446-455)
- Test: `src/__tests__/components/dashboard-v2/DebtsV2.test.ts` (new), `src/__tests__/components/dashboard-v2/DashboardClient.flag.test.ts`

**Interfaces:**
- Consumes everything from Tasks 1 and 5–9, plus these hooks from `@/lib/hooks`: `useDashboardInsights`, `useSubscription`, `useAllSnapshots`, `usePaymentRecords`, `useDeleteDebt`, `useMarkPaid`.
- Produces `DebtsV2` with props `{ debts: Debt[]; income: Income | null | undefined; expenses: ReadonlyArray<{ amount: number }>; openPaymentDebtId?: string | null; onPaymentPanelOpened?: () => void }`.

- [ ] **Step 1: Write the failing tests**

`src/__tests__/components/dashboard-v2/DebtsV2.test.ts`:

```ts
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { DashboardInsights } from '@/lib/dashboard/types';
import {
  useAllSnapshots, useCreateDebt, useDashboardInsights, useDeleteDebt, useMarkPaid,
  usePaymentRecords, useStartCheckout, useSubscription,
} from '@/lib/hooks';
import { PLANS } from '@/lib/stripe';
import DebtsV2 from '@/components/dashboard-v2/debts/DebtsV2';
import { makeDebt, makeIncome } from '../../lib/dashboard/fixtures';

vi.mock('@/lib/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/hooks')>()),
  useDashboardInsights: vi.fn(),
  useSubscription: vi.fn(),
  useAllSnapshots: vi.fn(),
  usePaymentRecords: vi.fn(),
  useDeleteDebt: vi.fn(),
  useMarkPaid: vi.fn(),
  useCreateDebt: vi.fn(),
  useStartCheckout: vi.fn(),
}));
vi.mock('@/lib/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/analytics')>()),
  track: vi.fn(),
}));
vi.mock('@/components/DebtCard', async () => {
  const { createElement: h } = await import('react');
  return {
    default: (p: { debt: { id: string }; openPaymentPanel?: boolean }) =>
      h('div', { 'data-stub': 'DebtCard', 'data-debt': p.debt.id, 'data-open-payment': String(Boolean(p.openPaymentPanel)) }),
  };
});
vi.mock('@/components/PaymentCalendar', () => ({ default: () => null }));
vi.mock('@/components/PaymentCelebrationBanner', () => ({ default: () => null }));
vi.mock('@/components/DebtForm', () => ({ default: () => null }));

const FREE = { proEligible: false, paidPro: false, trial: { active: false, endsAt: null } };
const PRO = { proEligible: true, paidPro: true, trial: { active: false, endsAt: null } };
// Surplus 4000 − 2000 − 325 = 1675, so the 200 acceleration is used in full.
const INCOME = makeIncome({ monthlyTakeHome: 4_000, essentialExpenses: 2_000, accelerationAmount: 200 });
const COUNTED = [
  makeDebt({ id: 'car', name: 'Car loan', balance: 9_000, minimumPayment: 300, interestRate: 7 }),
  makeDebt({ id: 'visa', name: 'Visa', balance: 900, minimumPayment: 25, interestRate: 28 }),
];
const OUTSIDE = makeDebt({ id: 'store', name: 'Store card', balance: 1_200, minimumPayment: 35, interestRate: 26, inPlan: false });
const UNCOUNTED = { count: 1, balance: 1_200, monthsImpact: 4 };

function insights(overrides: Partial<DashboardInsights> = {}): DashboardInsights {
  return {
    asOf: { year: 2026, month: 8, day: 15 },
    tier: FREE,
    readiness: { steps: [], completeCount: 0, percent: 0 },
    interest: null,
    paymentGap: null,
    coachMoves: [],
    rateWatch: null,
    strategy: null,
    planGap: null,
    progress: null,
    plan: { method: 'snowball', months: 31, debtFreeDate: '2029-04-14', totalInterest: 5_000 },
    uncounted: null,
    ...overrides,
  };
}

function renderTab({ debts = COUNTED, data = insights(), openPaymentDebtId = null as string | null } = {}) {
  vi.mocked(useDashboardInsights).mockReturnValue({ data } as unknown as ReturnType<typeof useDashboardInsights>);
  vi.mocked(useSubscription).mockReturnValue(
    { data: { proEligible: data.tier.proEligible, plaidEligible: false } } as unknown as ReturnType<typeof useSubscription>,
  );
  vi.mocked(useAllSnapshots).mockReturnValue({ data: { snapshots: [] } } as unknown as ReturnType<typeof useAllSnapshots>);
  vi.mocked(usePaymentRecords).mockReturnValue({ data: { records: [] } } as unknown as ReturnType<typeof usePaymentRecords>);
  vi.mocked(useDeleteDebt).mockReturnValue({ mutate: vi.fn() } as unknown as ReturnType<typeof useDeleteDebt>);
  const markPaid = { mutate: vi.fn() };
  vi.mocked(useMarkPaid).mockReturnValue(markPaid as unknown as ReturnType<typeof useMarkPaid>);
  vi.mocked(useCreateDebt).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as unknown as ReturnType<typeof useCreateDebt>);
  vi.mocked(useStartCheckout).mockReturnValue(
    { mutate: vi.fn(), isPending: false, isError: false, error: null } as unknown as ReturnType<typeof useStartCheckout>,
  );
  render(createElement(DebtsV2, { debts, income: INCOME, expenses: [], openPaymentDebtId }));
  return { markPaid };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 8, 15, 12, 0));
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('DebtsV2 (spec §8.5 My Debts)', () => {
  it("lists the plan's debts in payoff order, with no outside-plan chrome while every debt counts", () => {
    renderTab();
    const rows = within(screen.getByRole('region', { name: 'Debts in your plan' })).getAllByRole('button');
    expect(rows.map((r) => r.textContent)).toEqual([expect.stringContaining('Visa'), expect.stringContaining('Car loan')]);
    expect(screen.queryByText(/counted$/)).toBeNull();
    expect(screen.queryByRole('region', { name: 'Saved, outside the plan' })).toBeNull();
    expect(screen.queryByText(/ignores/)).toBeNull();
  });

  it('shows the counted share, both totals and the outside section when a debt sits outside the plan', () => {
    renderTab({ debts: [...COUNTED, OUTSIDE], data: insights({ uncounted: UNCOUNTED }) });
    expect(screen.getByText('2 of 3 counted')).toBeTruthy();
    expect(screen.getByText('Counted').parentElement?.textContent).toContain('$9,900.00');
    expect(screen.getByText('Not counted').parentElement?.textContent).toContain('$1,200.00');
    const outside = screen.getByRole('region', { name: 'Saved, outside the plan' });
    expect(within(outside).getByText('Store card')).toBeTruthy();
    expect(within(outside).getByText('Not in plan')).toBeTruthy();
  });

  it('closes with what the date ignores and opens moment E from it', () => {
    renderTab({ debts: [...COUNTED, OUTSIDE], data: insights({ uncounted: UNCOUNTED }) });
    expect(screen.getByText("April 2029 ignores $1,200.00 — about 4 months it doesn't include.")).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: `Count all 3 — $${PLANS.pro.price}/mo` }));
    const dialog = screen.getByRole('dialog', { name: 'Your date is built from 2 of your 3 debts.' });
    expect(within(dialog).getByText('Debt 3 of 3 · saved, not counted')).toBeTruthy();
  });

  it('shows Pro and trial accounts their outside debts, with no upgrade card', () => {
    renderTab({ debts: [...COUNTED, OUTSIDE], data: insights({ tier: PRO, uncounted: UNCOUNTED }) });
    expect(screen.getByRole('region', { name: 'Saved, outside the plan' })).toBeTruthy();
    expect(screen.queryByText(/ignores/)).toBeNull();
  });

  it("puts the month's focus debt on top and logs its planned payment as v1 This Month does", () => {
    const { markPaid } = renderTab();
    const card = screen.getByRole('region', { name: 'Visa' });
    fireEvent.click(within(card).getByRole('button', { name: 'Log payment' }));
    expect(markPaid.mutate).toHaveBeenCalledWith(
      { debtId: 'visa', amount: 225, dueYear: 2026, dueMonth: 8 },
      expect.objectContaining({ onSettled: expect.any(Function) }),
    );
  });

  it("opens a notification's debt with its payment panel", () => {
    renderTab({ openPaymentDebtId: 'car' });
    expect(document.querySelector('[data-debt="car"]')?.getAttribute('data-open-payment')).toBe('true');
  });

  it('adds a debt in a sheet, telling a Free account at the cap first', () => {
    const five = Array.from({ length: PLANS.free.debtLimit }, (_, i) =>
      makeDebt({ id: `d${i}`, name: `Debt ${i}`, balance: 100 * (i + 1), minimumPayment: 10 }));
    renderTab({ debts: five });
    fireEvent.click(screen.getByRole('button', { name: 'Add debt' }));
    const dialog = screen.getByRole('dialog', { name: 'Add a debt' });
    expect(within(dialog).getByText(
      `On Free, your plan counts ${PLANS.free.debtLimit} debts. This one will be saved outside it.`,
    )).toBeTruthy();
  });

  it('starts an empty account with one add button', () => {
    renderTab({ debts: [] });
    expect(screen.getByText('No debts yet.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Add your first debt' }));
    expect(screen.getByRole('dialog', { name: 'Add a debt' })).toBeTruthy();
  });
});
```

In `src/__tests__/components/dashboard-v2/DashboardClient.flag.test.ts`:
- Add a mutable search-params holder next to `stub` in the existing `vi.hoisted` block. Keep the `stub` factory exactly as it is, and destructure `{ stub, nav }`. The new entry is `nav: { params: new URLSearchParams() },`.
- Mock navigation with `useSearchParams: () => nav.params`.
- Reset it at the top of `beforeEach` with `nav.params = new URLSearchParams();`.
- Stub the new tab: `vi.mock('@/components/dashboard-v2/debts/DebtsV2', stub('DebtsV2'));`.
- Append these tests to `describe('DashboardClient flag wiring')`. They use no snapshot, and the file's snapshots stay untouched:

```ts
  it('renders My Debts v2 on the debts tab when the flag is on', () => {
    nav.params = new URLSearchParams('tab=debts');
    const html = renderToStaticMarkup(createElement(DashboardClient, { user: USER, dashboardV2: true }));
    expect(html).toContain('data-stub="DebtsV2"');
    expect(html).not.toContain('data-stub="DebtTab"');
  });

  it('keeps v1 My Debts with the flag off', () => {
    nav.params = new URLSearchParams('tab=debts');
    const html = renderToStaticMarkup(createElement(DashboardClient, { user: USER }));
    expect(html).toContain('data-stub="DebtTab"');
    expect(html).not.toContain('data-stub="DebtsV2"');
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/__tests__/components/dashboard-v2/DebtsV2.test.ts src/__tests__/components/dashboard-v2/DashboardClient.flag.test.ts`

Expected: FAIL. `DebtsV2` doesn't exist, and the debts tab ignores the flag. The four existing flag tests and the two snapshots still pass.

- [ ] **Step 3: Create `src/components/dashboard-v2/debts/DebtsV2.tsx`**

```tsx
"use client";

import { useId, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { Debt, Income } from "@/types";
import {
  useAllSnapshots,
  useDashboardInsights,
  useDeleteDebt,
  useMarkPaid,
  usePaymentRecords,
  useSubscription,
} from "@/lib/hooks";
import { calculatePlanMetrics } from "@/lib/payoffPlan";
import { isPlanDebt, selectMonthlyFocusDebt } from "@/lib/monthlyFocusDebt";
import { isDebtBankLinked, isDebtPastDueThisMonth } from "@/lib/debtHelpers";
import { PLANS } from "@/lib/stripe";
import {
  debtsClosingView,
  debtsSummaryView,
  focusCardView,
  orderByPlan,
  outsidePlanNotice,
  planMembership,
  upgradeSheetEView,
} from "@/lib/dashboard/myDebts";
import CompactDebtRow from "@/components/debt/CompactDebtRow";
import DebtCard from "@/components/DebtCard";
import PaymentCelebrationBanner from "@/components/PaymentCelebrationBanner";
import ClosingCard from "../ClosingCard";
import UpgradeSheet from "../sheets/UpgradeSheet";
import { CARD, CTA_BLUE, EYEBROW } from "../styles";
import DebtFormSheet from "./DebtFormSheet";
import DebtsSummary from "./DebtsSummary";
import FocusDebtCard from "./FocusDebtCard";
import PaymentToolsSection from "./PaymentToolsSection";

const NO_RANK: ReadonlyMap<string, number> = new Map();

interface DebtsV2Props {
  debts: Debt[];
  income: Income | null | undefined;
  expenses: ReadonlyArray<{ amount: number }>;
  /** A notification's deep link: open this debt's payment panel. */
  openPaymentDebtId?: string | null;
  onPaymentPanelOpened?: () => void;
}

type OpenSheet = "add" | "upgrade" | null;

/**
 * My Debts, dashboard v2 (spec §8.3, §8.5):
 * - the focus debt
 * - the plan's debts as compact rows over the v1 DebtCard
 * - debts saved outside the plan
 * - reminders and calendar, collapsed
 * - the ink closing card, which opens upgrade moment E
 *
 * v1 DebtTab stays untouched for flag-off users. The logic below mirrors it
 * (cited lines), so v1 can be deleted after rollout without a shared refactor.
 */
export default function DebtsV2({ debts, income, expenses, openPaymentDebtId, onPaymentPanelOpened }: DebtsV2Props) {
  const outsideHeadingId = useId();
  const { data: insights } = useDashboardInsights();
  const { data: subscription } = useSubscription();
  const { data: snapshotData } = useAllSnapshots();
  const today = new Date();
  const { data: paymentsData } = usePaymentRecords(today.getFullYear(), today.getMonth());
  const deleteDebt = useDeleteDebt();
  const markPaid = useMarkPaid();
  const [sheet, setSheet] = useState<OpenSheet>(null);
  const [openDebtId, setOpenDebtId] = useState<string | null>(null);
  const [logPending, setLogPending] = useState(false);

  // v1 My Debts' plan (DebtTab.tsx:233-240): the same function and inputs, so
  // rank, payoff months and the focus debt match every other tab.
  const planMetrics = useMemo(() => {
    if (!income || !debts.some(isPlanDebt)) return null;
    try {
      return calculatePlanMetrics(debts, income, [...expenses]);
    } catch {
      return null;
    }
  }, [debts, income, expenses]);
  const payoffResult = planMetrics?.result ?? null;
  const focusExtra = planMetrics?.effectiveAcceleration ?? 0;

  const scheduleById = useMemo(
    () => new Map((payoffResult?.payoffSchedule ?? []).map((s) => [s.debtId, s])),
    [payoffResult],
  );
  const rankById = useMemo(
    () => new Map((payoffResult?.payoffSchedule ?? []).map((s) => [s.debtId, s.orderInPayoff])),
    [payoffResult],
  );
  const paidDebtIds = useMemo(
    () => new Set((paymentsData?.records ?? []).map((record) => record.debtId)),
    [paymentsData],
  );
  // DebtTab.tsx:291-298: the latest payment per debt, for the bank-posting hint.
  const lastPaidAtById = useMemo(() => {
    const map = new Map<string, string>();
    for (const record of paymentsData?.records ?? []) {
      const prev = map.get(record.debtId);
      if (!prev || record.paidAt > prev) map.set(record.debtId, record.paidAt);
    }
    return map;
  }, [paymentsData]);
  // DebtTab.tsx:217-226: the earliest snapshot balance per debt, for "% paid off".
  const earliestBalanceById = useMemo(() => {
    const map = new Map<string, number>();
    const sorted = [...(snapshotData?.snapshots ?? [])].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
    for (const s of sorted) if (!map.has(s.debtId)) map.set(s.debtId, s.balance);
    return map;
  }, [snapshotData?.snapshots]);

  const focusDebt = useMemo(
    () => selectMonthlyFocusDebt(debts, payoffResult, paidDebtIds),
    [debts, payoffResult, paidDebtIds],
  );
  const membership = useMemo(() => planMembership(debts), [debts]);
  const inPlanRows = useMemo(() => orderByPlan(membership.counted, rankById), [membership.counted, rankById]);
  const outsideRows = useMemo(() => orderByPlan(membership.outside, NO_RANK), [membership.outside]);

  // DebtTab.tsx:342-352: one reconnect banner per linked item, on its first shown debt.
  const reauthHostIds = useMemo(() => {
    const seenItems = new Set<string>();
    const hosts = new Set<string>();
    for (const d of [...inPlanRows, ...outsideRows]) {
      if (d.needsReauth && d.plaidItemId && !seenItems.has(d.plaidItemId)) {
        seenItems.add(d.plaidItemId);
        hosts.add(d.id);
      }
    }
    return hosts;
  }, [inPlanRows, outsideRows]);

  const proEligible = insights?.tier.proEligible ?? subscription?.proEligible === true;
  const summary = debtsSummaryView(membership);
  const notice = outsidePlanNotice(membership.counted.length, PLANS.free.debtLimit, proEligible);
  const closing = insights
    ? debtsClosingView({
        uncounted: insights.uncounted,
        plan: insights.plan,
        tier: insights.tier,
        total: debts.length,
        price: PLANS.pro.price,
      })
    : null;
  const focusView = focusDebt
    ? focusCardView(focusDebt, scheduleById.get(focusDebt.id) ?? null, focusExtra)
    : null;

  const logFocusPayment = () => {
    if (!focusView || logPending) return;
    setLogPending(true);
    const now = new Date();
    // v1 This Month's focus-card write (ThisMonthTab.tsx:131-144), unchanged.
    markPaid.mutate(
      { debtId: focusView.debtId, amount: focusView.amount, dueYear: now.getFullYear(), dueMonth: now.getMonth() },
      { onSettled: () => setLogPending(false) },
    );
  };

  const renderRow = (debt: Debt, outsidePlan: boolean) => {
    const isFocus = debt.id === focusDebt?.id;
    const paidThisMonth = paidDebtIds.has(debt.id);
    const deepLink = openPaymentDebtId === debt.id || openDebtId === debt.id;
    const needsReauth = reauthHostIds.has(debt.id);
    const syncPaused = isDebtBankLinked(debt) && subscription?.plaidEligible === false;
    // The focus card carries the focus debt's action, so unlike v1 its row
    // stays collapsed. Rows that need attention still open.
    const needsAttention = needsReauth || syncPaused || isDebtPastDueThisMonth(debt, paidThisMonth);
    return (
      <CompactDebtRow
        key={debt.id}
        debt={debt}
        isFocus={isFocus}
        paidThisMonth={paidThisMonth}
        needsReauth={needsReauth}
        syncPaused={syncPaused}
        defaultOpen={needsAttention || deepLink}
        forceOpen={deepLink}
        outsidePlan={outsidePlan}
      >
        <DebtCard
          debt={debt}
          allDebts={debts}
          isReauthBannerHost={needsReauth}
          onDelete={() => deleteDebt.mutate(debt.id)}
          firstSnapshotBalance={earliestBalanceById.get(debt.id) ?? null}
          openPaymentPanel={deepLink}
          onPaymentPanelOpened={() => {
            onPaymentPanelOpened?.();
            if (openDebtId === debt.id) setOpenDebtId(null);
          }}
          rank={rankById.get(debt.id)}
          isActiveFocus={isFocus}
          paidThisMonth={paidThisMonth}
          lastPaymentAt={lastPaidAtById.get(debt.id) ?? null}
          monthPaidOff={scheduleById.get(debt.id)?.monthPaidOff ?? null}
          focusExtra={focusExtra}
        />
      </CompactDebtRow>
    );
  };

  const addSheet = sheet === "add" && <DebtFormSheet notice={notice} onClose={() => setSheet(null)} />;

  if (debts.length === 0) {
    return (
      <>
        <section className={`${CARD} p-5 text-center`}>
          <p className="text-[14px] font-semibold text-txt">No debts yet.</p>
          <p className="mt-1 text-[13px] text-txt-muted">Add your first debt to build your payoff plan.</p>
          <button type="button" onClick={() => setSheet("add")} className={`mt-3 ${CTA_BLUE}`}>
            Add your first debt
          </button>
        </section>
        {addSheet}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 min-[769px]:gap-4">
      <div className="flex items-center justify-between gap-3">
        {summary ? (
          <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-extrabold text-txt">{summary.pill}</span>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => setSheet("add")}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-surface px-4 text-[13px] font-extrabold text-txt outline-none hover:bg-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action"
        >
          <Plus size={15} aria-hidden="true" />
          Add debt
        </button>
      </div>
      {summary && <DebtsSummary view={summary} />}
      <PaymentCelebrationBanner />
      {focusView && <FocusDebtCard view={focusView} pending={logPending} onLog={logFocusPayment} />}
      <section aria-label="Debts in your plan" className="flex flex-col gap-2">
        {inPlanRows.map((debt) => renderRow(debt, false))}
      </section>
      {outsideRows.length > 0 && (
        // Dashed = saved outside the plan, and nothing else (DESIGN.md 2026-09-12).
        <section aria-labelledby={outsideHeadingId} className="flex flex-col gap-2 border-t border-dashed border-txt-muted/30 pt-3">
          <h3 id={outsideHeadingId} className={`${EYEBROW} text-txt-muted`}>Saved, outside the plan</h3>
          {outsideRows.map((debt) => renderRow(debt, true))}
        </section>
      )}
      <PaymentToolsSection
        debts={debts}
        paidDebtIds={paidDebtIds}
        focusDebtId={focusDebt?.id ?? null}
        focusExtra={focusExtra}
        isPro={subscription?.proEligible === true}
        subscriptionKnown={subscription !== undefined}
        onOpenDebt={setOpenDebtId}
      />
      {closing && (
        <ClosingCard cta={closing.cta} onCta={() => setSheet("upgrade")}>
          {closing.text}
        </ClosingCard>
      )}
      {addSheet}
      {sheet === "upgrade" && closing && insights?.uncounted && (
        <UpgradeSheet
          view={upgradeSheetEView({
            countedCount: membership.counted.length,
            total: debts.length,
            uncounted: insights.uncounted,
            date: closing.date,
            price: PLANS.pro.price,
          })}
          counted={membership.counted}
          outside={membership.outside}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Switch the debts tab in `DashboardClient.tsx`**

Add the import after the `ThisMonthV2` import:

```tsx
import DebtsV2 from "@/components/dashboard-v2/debts/DebtsV2";
```

Replace the `{activeTab === "debts" && ( <DebtTab … /> )}` block with:

```tsx
        {activeTab === "debts" && (dashboardV2 ? (
          <DebtsV2
            debts={debts}
            income={income}
            expenses={expenses}
            openPaymentDebtId={openPaymentDebtId}
            onPaymentPanelOpened={() => setOpenPaymentDebtId(null)}
          />
        ) : (
          <DebtTab
            debts={debts}
            isLoading={debtsLoading}
            openPaymentDebtId={openPaymentDebtId}
            onPaymentPanelOpened={() => setOpenPaymentDebtId(null)}
            requestAddDebt={fabAddDebtRequest}
            onAddDebtHandled={() => setFabAddDebtRequest(false)}
          />
        ))}
```

- [ ] **Step 5: Run the tests and checks**

- `npx vitest run src/__tests__/components/dashboard-v2/DebtsV2.test.ts src/__tests__/components/dashboard-v2/DashboardClient.flag.test.ts`: expected PASS, with the two snapshots matching without `-u`.
- `npm test`: expected all pass.
- `npx tsc --noEmit 2>&1 | grep -v "src/__tests__/lib/stripe.test.ts"`: expected no output.
- `npm run lint`: expected no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard-v2/debts/DebtsV2.tsx src/components/DashboardClient.tsx src/__tests__/components/dashboard-v2/DebtsV2.test.ts src/__tests__/components/dashboard-v2/DashboardClient.flag.test.ts
```

```bash
git commit -m "feat(dashboard-v2): ship My Debts v2 behind the flag" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Task 11: Spec patch, verification, the migration, and the PR

**Files:**
- Modify: `docs/superpowers/specs/2026-09-12-dashboard-pro-upgrade-design.md` (§6.3, §8.5, §9)
- No code changes. The schema push, the baseline gate and the previews are owner-gated steps.

- [ ] **Step 1: Patch the spec**

In §6.3:
- **`POST /api/debts` bullet.** After "(sent only by the v2 UI)", add "and the account is on `DASHBOARD_V2_USERS`".
- **Onboarding bullet.** Replace it with:

  > `POST /api/onboarding/complete`: for a dashboard v2 account (server-side flag; the wizard is shared by v1 and Expo), overflow debts are saved with `inPlan=false` instead of being skipped, and the response's new `outsidePlanDebts` counts them. `skippedDebts` stays in the response for older clients (0 in that case). Other accounts keep today's skip.

In §8.5, under "My Debts", add a sub-list headed **"PR 4 decisions (2026-09-15)"**:
- "Counted" means `inPlan ≠ false`, paid-off debts included (the cap's basis). Deleting a counted debt never pulls an outside debt in.
- Layout: toolbar (pill + "Add debt") → two-up → focus card → the plan's rows in payoff order, paid-off last → "Saved, outside the plan" → a collapsed "Payment calendar & reminders" card (upcoming payments, `PaymentCalendar`, "Add to Calendar", gated for Free) → the ink closing card.
  - v1's stat strip, sort/filter toolbar and helper cards are dropped.
  - With no debts, a single card reads "No debts yet." with "Add your first debt".
- The focus card uses v1 This Month's figures and write: minimum + effective acceleration, "gone in {formatMonths}", "Log payment". The APR is muted text. The focus row stays collapsed.
- The closing card and moment E show only for Free accounts with outside debts and a dated plan.
  - The months clause needs `monthsImpact ≥ 1`.
  - Singular forms: "1 month", "The uncounted balance adds".
  - The CTA is "Count all {n} — ${PLANS.pro.price}/mo" → the existing checkout. PR 6 adds the trial CTA.
- Balances use `formatCurrency`.
- At the cap, the add-debt sheet says "On Free, your plan counts {limit} debts. This one will be saved outside it."
- `calculateResultByMethod` drops `inPlan=false` itself, as a safety net for every direct engine caller.

In §9, after `debt_saved_outside_plan`, add: "Moment E also sends the existing `checkout_started {source: 'upgrade_moment_e', billing: 'monthly'}`."

- [ ] **Step 2: Full local verification**

Stop the `budget-dev` preview server first. It holds the Prisma DLL, and `npm run build` fails with EPERM while it runs.

```bash
npm run lint
```

```bash
npx tsc --noEmit 2>&1 | grep -v "src/__tests__/lib/stripe.test.ts"
```

```bash
npm test
```

```bash
cd apps/mobile && npm run typecheck
```

```bash
npm run build
```

Expected:
- lint clean, no `tsc` output
- every test passes (report the count)
- mobile typecheck exits 0
- build exits 0

v1's snapshots must be byte-identical to main:

```bash
git diff --stat main -- src/__tests__/components/dashboard-v2/__snapshots__/
```

This must print nothing.

Commit the spec patch:

```bash
git add docs/superpowers/specs/2026-09-12-dashboard-pro-upgrade-design.md
```

```bash
git commit -m "docs(spec): record dashboard v2 My Debts decisions" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 3: STOP — get the owner's OK**

Ask the owner for three approvals, in the conversation:
1. Copying `.env.local` into a `../budget-main-baseline` worktree for the read-only capture.
2. Taking a Neon snapshot of production.
3. Running `npm run db:push` against production. It adds `debts."inPlan" BOOLEAN NOT NULL DEFAULT true`.

Do not continue without all three. Nothing has been pushed yet, and the branch must not be pushed before the schema push.

- [ ] **Step 4: Capture `main-pre` with main's own client**

```bash
git worktree add ../budget-main-baseline main
```

```bash
diff package.json ../budget-main-baseline/package.json
```

This must print nothing. Then:

```bash
cmd //c "mklink /J ..\\budget-main-baseline\\node_modules node_modules"
```

```bash
cp .env.local ../budget-main-baseline/.env.local
```

Never read or print `.env.local`.

```bash
cd ../budget-main-baseline && npx prisma generate
```

This regenerates the shared client from main's schema, which has no `inPlan`. Then, from the Budget repo root:

```bash
B=C:/Users/ronne/.gstack/projects/vronney-snowball-pay/baseline
NODE_OPTIONS=--experimental-websocket BASELINE_REPO="$(cd ../budget-main-baseline && pwd -W)" BASELINE_LABEL=main-pre npx vitest run --config "$B/baseline.config.mjs" --root "$B"
```

Expected: a `BASELINE main-pre: users=… withPlan=… proEligible=…` line.

- [ ] **Step 5: Neon snapshot, then the schema push**

Take the snapshot in the Neon console (production branch → Create snapshot), or with the Neon MCP `create_snapshot` call if the owner approves it. Record the snapshot id in the ledger.

Then, from the Budget repo root on this branch:

```bash
npm run db:push
```

Expected output:
- "Your database is now in sync with your Prisma schema"
- then the client regenerated from this branch's schema

If Prisma prints any data-loss warning or asks for confirmation, stop and report to the owner. An added column with a default needs neither.

Production keeps running main's code, which never selects the new column, so the additive push is safe before the merge.

- [ ] **Step 6: Read-only check that every debt is in the plan**

Run it in the Neon SQL editor, or with the Neon MCP `run_sql` (a SELECT only):

```sql
SELECT count(*) AS total, count(*) FILTER (WHERE "inPlan") AS in_plan FROM debts;
```

Expected: `in_plan = total`.

- [ ] **Step 7: Capture `main` and `branch` back to back, then compare**

```bash
B=C:/Users/ronne/.gstack/projects/vronney-snowball-pay/baseline
NODE_OPTIONS=--experimental-websocket BASELINE_REPO="$(cd ../budget-main-baseline && pwd -W)" BASELINE_LABEL=main npx vitest run --config "$B/baseline.config.mjs" --root "$B"
NODE_OPTIONS=--experimental-websocket BASELINE_LABEL=branch npx vitest run --config "$B/baseline.config.mjs" --root "$B"
ls -l --time-style=full-iso "$B/main-pre.json" "$B/main.json" "$B/branch.json"
node "$B/compare.mjs" "$B/main-pre.json" "$B/main.json"
node "$B/compare.mjs" "$B/main.json" "$B/branch.json"
```

The two compares mean different things:
- **`main-pre` vs `main`** proves the migration changed nothing. It must print `DIFFERENT=0`. `main-pre` can't be recaptured, so any `inputsChanged` users there are explained by edits made between the runs.
- **`main` vs `branch`** is the binding gate. It must print `DIFFERENT=0`, `missing=0` and `inputsChanged=0`. If `inputsChanged` is above 0, rerun both captures.

The `ls` shows all three files were written in this session.

- [ ] **Step 8: Previews**

1. Start `budget-dev` with `preview_start` (name `budget-dev`). The flag is already on for the owner in `.env.local`.
2. Open My Debts at 375, 768, 1024 and 1280. At each width, check:
   - rows in payoff order
   - the focus card
   - the collapsed payment tools, which open
   - no console errors
3. Check flag-off: the owner comments out `DASHBOARD_V2_USERS` in `.env.local` and restarts the server. v1 My Debts must render, and there must be zero `/api/dashboard/insights` requests. Then the owner restores the line.
4. Production data is look-don't-act: add no debt and log no payment.
5. The owner's account is Pro with no outside debts, so the Free-only surfaces (pill, two-up, outside section, closing card, moment E) are covered by the component tests. Say so in the PR.

- [ ] **Step 9: Clean up and ship**

- Ask the owner before removing the baseline worktree. If they agree:

  ```bash
  cmd //c "rmdir ..\\budget-main-baseline\\node_modules"
  ```

  ```bash
  git worktree remove ../budget-main-baseline
  ```

- Use superpowers:finishing-a-development-branch. Push and open the PR only with the owner's OK.
- The PR body lists:
  - the migration (snapshot id, push time, SQL check)
  - both baseline compares
  - the preview widths
  - the 13 decisions
- Never merge before the CodeRabbit and Codex reviews land.


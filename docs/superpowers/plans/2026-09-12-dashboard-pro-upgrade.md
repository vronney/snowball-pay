# Dashboard Pro Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the logged-in dashboard, mobile and desktop, to convert Free users to Pro without changing any user's computed numbers.

**Architecture:** Pure, tested functions in `src/lib/dashboard/` compute every new figure. `GET /api/dashboard/insights` serves them to web now and to Expo later. The new UI ships behind the `DASHBOARD_V2_USERS` flag across 6 PRs, and each PR must pass a read-only production baseline gate.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind, TanStack Query 5, Prisma 6 with `@prisma/adapter-neon`, Zod, Vitest 4 (node environment, `src/__tests__/**/*.test.ts`).

**Spec:** `docs/superpowers/specs/2026-09-12-dashboard-pro-upgrade-design.md`. Read it before any task. §N references below point into it.

## Global Constraints

- **No computed number changes for any user** (spec §1). Every PR passes the Task 0 baseline gate: 0 users DIFFERENT.
- **Hide instead of fake** (spec §4). A figure that is null, non-finite, or not positive where the copy implies positive hides its card. Never show a zero, placeholder, or average in its place.
- **Existing formulas stay existing.** They are extracted verbatim, never "improved". This Month keeps its paid-off formula, Progress keeps its own, and their quirks are kept.
- **Display rounding:** floor for estimated losses and savings (`Math.floor`, then `formatCurrencyWhole`). Concrete amounts (balances, minimums) use `formatCurrency`.
- **Labels:** estimates say "est.", averages say "avg", annualized values say "/yr". Per-year and one-time values are never summed together (spec §3 X7).
- **Copy states only computed facts.** No causal claims (spec §3 X6).
- **Client "today":** the client sends `today=YYYY-MM-DD`, and the server accepts it only within ±36h of its own clock (spec §5.2).
- **Tokens:** use the repo Tailwind tokens plus the new ones from Task 1. Never hardcode prototype hexes (`STYLES.md`).
- **Prices:** Pro price comes only from `PLANS.pro.price` (`src/lib/stripe.ts`). Never write the literal `12`.
- **Git:** conventional commits on `feat/dashboard-pro-upgrade` (PR 1) and on one branch per later PR. Every commit message ends with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. Before each PR: `npm run lint`, `npm run build`, `npm test`, and the baseline gate.
- **The handoff files never go in the repo.** They contain one real account's figures. They live in `~/.gstack/projects/vronney-snowball-pay/designs/dashboard-pro-upgrade-20260912/`.
- **Production database access is read-only**, except the schema pushes in PR 4 and PR 6, each preceded by a Neon snapshot.

## Roadmap: 6 PRs

This document holds the **complete task-level plan for PR 1**. The plans for PRs 2–6 are written when the previous PR merges. Each of them builds on that PR's merged code, and exact code can't be written for files that don't exist yet. The outlines below fix their scope, files, and gates, so nothing in the spec is left without an owner.

| PR | Scope (spec §) | Key files | Gate |
|---|---|---|---|
| **1 Foundation** (this plan) | Tokens, DESIGN.md amendments, the `src/lib/dashboard/*` functions, verbatim extractions, `/api/dashboard/insights`, the `useDashboardInsights` hook, the flag helper (§5, §8.1, §8.2) | see File Structure | No visible change; baseline identical |
| **2 Shell** | `V2Shell`, `V2Sidebar` + `UpgradeRail`, `V2Header` + `AvatarMenu`, `BottomTabBar`, Coach rename (label only), Coach dot; `dashboard/page.tsx` passes `dashboardV2` (§5.3, §8.3) | `src/components/dashboard-v2/shell/*`, `src/app/dashboard/page.tsx`, `src/components/DashboardClient.tsx` | Flag off renders unchanged; preview at 375/768/1280 |
| **3 This Month** | `ThisMonthV2`, `ReadinessCard`, `InterestMeter`, `DebtFreeHero`, `FreeMoveCard`, `MoreMovesList`, `RateWatchCard`, `DueDatesSheet`, `BulkLogSheet` (§8.5) | `src/components/dashboard-v2/this-month/*`, `.../sheets/*` | Baseline identical |
| **4 My Debts + `inPlan`** | `Debt.inPlan`, `isPlanDebt`, `computeUncounted` (moved here from PR 1: it has nothing to measure until the column exists), plan-math filter in `payoffPlan.ts` and the direct engine callers, cap behavior with `allowOutsidePlan`, onboarding overflow, webhook move-into-plan, Expo `queries.ts` filter, `DebtsV2`, moment E (§6.1–6.3, §7 E) | `prisma/schema.prisma`, `src/lib/payoffPlan.ts`, `src/lib/monthlyFocusDebt.ts`, `src/lib/dashboard/uncounted.ts`, `src/app/api/debts/route.ts`, `src/app/api/onboarding/complete/route.ts`, `src/app/api/webhooks/stripe/route.ts`, `apps/mobile/src/lib/queries.ts` | Neon snapshot → `db:push` → baseline identical |
| **5 Plan, Progress, Coach** | `PlanV2`, `ProgressV2` (streak grid UI), `CoachV2`, `ClosingCard` variants, `GatedTile`, what-if +$25 free rung, Pro any-amount input (§8.5) | `src/components/dashboard-v2/{plan,progress,coach}/*`, `src/components/payoff/WhatIfCard.tsx` | Baseline identical |
| **6 Upgrade moments + trial** | `POST /api/trial/start`, the gates pre-launch grant rule, `UserPreferences` trial columns, `trialMoment` in insights, moments A–D, `UpgradeSheet`, trial-emails cron candidates, retire the banner/modal/locked door under the flag, analytics (§6.4, §7, §9) | `src/app/api/trial/start/route.ts`, `src/lib/gates.ts`, `src/app/api/cron/trial-emails/route.ts`, `src/components/dashboard-v2/upgrade/*` | Billing verdicts identical for all accounts |

**Refinements made while writing this plan** (the spec is patched to match in Task 15):
- `isPlanDebt` and `computeUncounted` move from PR 1 to PR 4.
- The streak grid gains an `inactive` state for past months before the user's first snapshot month. Otherwise a user who started in July would see January–June as red "missed", which is untrue.
- The strategy comparison mirrors `PayoffTab.tsx:258-270` exactly. Custom order has no comparison (null), and the alternative is avalanche, or snowball when the current method is avalanche.

## File Structure (PR 1)

| File | Responsibility |
|---|---|
| `tailwind.config.ts` (modify) | New color and shadow tokens |
| `DESIGN.md` (modify) | Dated 2026-09-12 decisions |
| `src/lib/apr-negotiation/apr-negotiation-adapter.ts` (modify) | Now exports `estimateAnnualSavings` (moved from the hook) |
| `src/lib/apr-negotiation/useAprNegotiation.ts` (modify) | Imports `estimateAnnualSavings` instead of defining it |
| `src/lib/debtHelpers.ts` (modify) | `isDebtPastDueThisMonth` gains an optional `today` parameter |
| `src/lib/snowball.ts` (modify) | Exports `MAX_MONTHS` |
| `src/lib/dashboard/types.ts` | All insights types |
| `src/lib/dashboard/progress.ts` | Verbatim This Month and Progress paid-off/streak formulas |
| `src/lib/dashboard/planGap.ts` | Verbatim chart builder and plan-gap formula |
| `src/lib/dashboard/readiness.ts` | Plan readiness |
| `src/lib/dashboard/interest.ts` | Monthly interest estimate and plan average |
| `src/lib/dashboard/paymentGap.ts` | Logged, missed and not-yet-due this month |
| `src/lib/dashboard/rateWatch.ts` | APR-cut opportunities |
| `src/lib/dashboard/strategy.ts` | Snowball/avalanche comparison |
| `src/lib/dashboard/streakGrid.ts` | 12-cell streak grid |
| `src/lib/dashboard/coachMoves.ts` | Ranked rule-based moves and value summary |
| `src/lib/dashboard/coachMoveCopy.ts` | Move titles, bodies, value labels |
| `src/lib/dashboard/buildInsights.ts` | Pure assembler: inputs → `DashboardInsights` |
| `src/lib/flags.ts` | `isDashboardV2` |
| `src/lib/rateLimit.ts` (modify) | `dashboardInsights` preset |
| `src/app/api/dashboard/insights/route.ts` | Authenticated GET |
| `src/lib/hooks.ts` (modify) | `useDashboardInsights`, `localDateParam` |
| `src/app/providers.tsx` (modify) | Global mutation → insights invalidation |
| `src/components/tabs/ThisMonthTab.tsx`, `ProgressTab.tsx`, `IntelligenceTab.tsx`, `src/lib/hooks/usePlannerComputed.ts` (modify) | Call the extracted functions (behavior identical) |
| Tests: `src/__tests__/lib/dashboard/*.test.ts`, `src/__tests__/lib/designTokens.test.ts`, `src/__tests__/lib/flags.test.ts`, `src/__tests__/lib/aprNegotiationAdapter.test.ts`, `src/__tests__/api/dashboard-insights.test.ts`, `src/__tests__/lib/debtHelpers.test.ts` (extend) | |

**Shared test fixtures.** Several test files need the same `makeDebt` and `makeIncome` helpers as `src/__tests__/lib/payoffPlan.test.ts:10-48`. Task 2 creates `src/__tests__/lib/dashboard/fixtures.ts` with them. Later tasks import from there.

---

### Task 0: Baseline gate (permanent, outside the repo)

The gate compares, per user, the numbers produced by `main` and by the PR branch, captured back-to-back so user inputs can't drift between the runs. It lives outside the repo because it reads production data.

**Files (not in git):**
- Create: `~/.gstack/projects/vronney-snowball-pay/baseline/baseline.config.mjs`
- Create: `~/.gstack/projects/vronney-snowball-pay/baseline/baseline.test.ts`
- Create: `~/.gstack/projects/vronney-snowball-pay/baseline/compare.mjs`
- Create: `~/.gstack/projects/vronney-snowball-pay/baseline/README.md`

**Interfaces:**
- Produces: `<label>.json` keyed by hashed user id, with fields `tier, status, inputHash, debtCount, totalDebt, paidToDate, startingTotal, plan, minimumsOnly, strategyInterest, billing`. `compare.mjs a.json b.json` exits 1 if any user with an unchanged `inputHash` differs.

- [ ] **Step 1: Write the vitest config.** `BASELINE_REPO` selects which checkout's code is measured.

```js
// baseline.config.mjs — no imports; resolved from outside the repo.
const HERE = 'C:/Users/ronne/.gstack/projects/vronney-snowball-pay/baseline';
const REPO = process.env.BASELINE_REPO ?? 'C:/Users/ronne/Documents/backup_101121/Projects/Budget';

export default {
  root: HERE,
  resolve: {
    alias: [
      { find: /^@\//, replacement: `${REPO}/src/` },
      { find: /^@prisma\/client$/, replacement: `${REPO}/node_modules/@prisma/client` },
      { find: /^@prisma\/adapter-neon$/, replacement: `${REPO}/node_modules/@prisma/adapter-neon` },
    ],
  },
  server: { fs: { allow: [REPO, HERE] } },
  test: { environment: 'node', globals: true, include: ['baseline.test.ts'], testTimeout: 300000 },
};
```

- [ ] **Step 2: Write the capture script.** It issues reads only, and it now also records each user's billing verdict.

```ts
// baseline.test.ts — READ-ONLY. Only findMany/findUnique are issued.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const HERE = 'C:/Users/ronne/.gstack/projects/vronney-snowball-pay/baseline';
const REPO = process.env.BASELINE_REPO ?? 'C:/Users/ronne/Documents/backup_101121/Projects/Budget';
const LABEL = process.env.BASELINE_LABEL ?? 'run';
const FIXED_NOW = new Date('2026-09-12T12:00:00Z');

// .env.local wins over .env, matching Next.js precedence. Never overrides a set var.
function loadEnv(): void {
  for (const file of [`${REPO}/.env.local`, `${REPO}/.env`]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && process.env[m[1]] === undefined) {
        process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
      }
    }
  }
  process.env.FORCE_PRO = 'false'; // a dev override would make every verdict Pro
}

const hash = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 12);
const cents = (n: number) => Math.round(n * 100) / 100;

type Summarizable = {
  months: number; totalInterestPaid: number; totalAmountPaid: number; monthlyPayment: number;
  debtFreeDate: Date;
  payoffSchedule: { debtId: string; monthPaidOff: number; interestPaid: number; orderInPayoff: number }[];
};
function summarize(r: Summarizable) {
  return {
    months: r.months,
    totalInterestPaid: cents(r.totalInterestPaid),
    totalAmountPaid: cents(r.totalAmountPaid),
    monthlyPayment: cents(r.monthlyPayment),
    debtFreeDate: r.debtFreeDate.toISOString().slice(0, 7),
    schedule: r.payoffSchedule.map((s) => ({
      debt: hash(s.debtId), monthPaidOff: s.monthPaidOff, interestPaid: cents(s.interestPaid), order: s.orderInPayoff,
    })),
  };
}

it('captures plan + billing baseline (read-only)', async () => {
  loadEnv();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(FIXED_NOW);

  const { calculatePlanMetrics, calculateMinimumsOnlyResult, calculateResultByMethod } = await import('@/lib/payoffPlan');
  const { resolveBillingVerdict } = await import('@/lib/gates');

  const prisma = new PrismaClient({
    adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
  } as ConstructorParameters<typeof PrismaClient>[0]);
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true, paidTier: true, subscriptionStatus: true, income: true,
      expenses: { orderBy: { createdAt: 'asc' } },
      // Same order as GET /api/debts, so ties in the engine's stable sort match the app.
      debts: { orderBy: { createdAt: 'desc' } },
    },
  });

  const out: Record<string, unknown> = {};
  for (const u of users) {
    const debts = JSON.parse(JSON.stringify(u.debts));
    const income = u.income ? JSON.parse(JSON.stringify(u.income)) : null;
    const expenses = JSON.parse(JSON.stringify(u.expenses));
    const inputHash = hash(JSON.stringify({
      d: u.debts.map((d) => [d.id, d.balance, d.originalBalance, d.interestRate, d.minimumPayment, d.priorityOrder, d.dueDate]),
      i: u.income && [u.income.monthlyTakeHome, u.income.essentialExpenses, u.income.payoffMethod, u.income.accelerationAmount],
      e: u.expenses.map((e) => [e.id, e.amount]),
    }));

    let paid = 0;
    let original = 0;
    for (const d of u.debts) {
      const base = d.originalBalance > 0 ? d.originalBalance : d.balance;
      original += base;
      paid += Math.max(0, base - d.balance);
    }

    const metrics = calculatePlanMetrics(debts, income, expenses);
    const minimums = debts.length ? calculateMinimumsOnlyResult(debts) : null;
    const strategyInterest = metrics && income
      ? Object.fromEntries((['snowball', 'avalanche'] as const).map((m) => [m, cents(calculateResultByMethod(
          debts.filter((d: { balance: number }) => d.balance > 0.01), income, metrics.recurringTotal, metrics.adjustedExtra, m,
        ).totalInterestPaid)]))
      : null;
    const verdict = await resolveBillingVerdict(u.id);

    out[hash(u.id)] = {
      tier: u.paidTier,
      status: u.subscriptionStatus,
      inputHash,
      debtCount: u.debts.length,
      totalDebt: cents(u.debts.reduce((s, d) => s + d.balance, 0)),
      paidToDate: cents(paid),
      startingTotal: cents(original),
      plan: metrics ? {
        method: metrics.method,
        availableCashFlow: cents(metrics.availableCashFlow),
        effectiveAcceleration: cents(metrics.effectiveAcceleration),
        ...summarize(metrics.result),
      } : null,
      minimumsOnly: minimums ? summarize(minimums) : null,
      strategyInterest,
      billing: {
        paidPro: verdict.paidPro,
        proEligible: verdict.proEligible,
        signupTrialEndsAt: verdict.signupTrialEndsAt?.toISOString() ?? null,
      },
    };
  }
  await prisma.$disconnect();
  vi.useRealTimers();

  writeFileSync(`${HERE}/${LABEL}.json`, JSON.stringify(out, null, 2));
  const rows = Object.values(out) as { plan: unknown; billing: { proEligible: boolean } }[];
  process.stdout.write(`BASELINE ${LABEL}: users=${rows.length} withPlan=${rows.filter((r) => r.plan).length} proEligible=${rows.filter((r) => r.billing.proEligible).length}\n`);
  expect(rows.length).toBeGreaterThan(0);
});
```

- [ ] **Step 3: Write the comparer.**

```js
// compare.mjs — usage: node compare.mjs main.json branch.json
import { readFileSync } from 'node:fs';

const [, , aPath, bPath] = process.argv;
const before = JSON.parse(readFileSync(aPath, 'utf8'));
const after = JSON.parse(readFileSync(bPath, 'utf8'));
const FIELDS = ['plan', 'minimumsOnly', 'strategyInterest', 'paidToDate', 'startingTotal', 'billing'];

let identical = 0;
let inputsChanged = 0;
const missing = [];
const different = [];
for (const [id, x] of Object.entries(before)) {
  const y = after[id];
  if (!y) { missing.push(id); continue; }
  if (x.inputHash !== y.inputHash) { inputsChanged += 1; continue; }
  const bad = FIELDS.filter((f) => f in x && JSON.stringify(x[f]) !== JSON.stringify(y[f]));
  if (bad.length) different.push({ id, bad }); else identical += 1;
}
console.log(`identical=${identical} inputsChanged=${inputsChanged} missing=${missing.length} DIFFERENT=${different.length}`);
for (const d of different) console.log(`  ${d.id}: ${d.bad.join(', ')}`);
process.exit(different.length || missing.length ? 1 : 0);
```

- [ ] **Step 4: Write the gate procedure** into `README.md` next to the scripts:

````markdown
# Baseline gate (read-only, production)

Run from the Budget repo root. `main` and the branch are captured back to back so user inputs can't drift.

```bash
git worktree add ../budget-main-baseline main
cd ../budget-main-baseline
npm ci
cd -
```

```bash
B=C:/Users/ronne/.gstack/projects/vronney-snowball-pay/baseline
NODE_OPTIONS=--experimental-websocket BASELINE_REPO="$(cd ../budget-main-baseline && pwd -W)" BASELINE_LABEL=main npx vitest run --config "$B/baseline.config.mjs" --root "$B"
NODE_OPTIONS=--experimental-websocket BASELINE_LABEL=branch npx vitest run --config "$B/baseline.config.mjs" --root "$B"
node "$B/compare.mjs" "$B/main.json" "$B/branch.json"
```

The PR passes when the compare step prints `DIFFERENT=0`, `missing=0`, and `inputsChanged=0`. If `inputsChanged` is above 0, a user edited data between the two runs, so rerun both. Afterwards:

```bash
git worktree remove ../budget-main-baseline
```
````

- [ ] **Step 5: Run the gate against the unchanged branch.** The branch has only the spec commit, so this proves the gate itself.

Run the commands in the README. Expected output: `BASELINE main: users=43 …`, `BASELINE branch: users=43 …`, then `identical=43 inputsChanged=0 missing=0 DIFFERENT=0`. The exact counts may grow as users sign up.

No commit: these files are outside the repo.

---

### Task 1: Design tokens and DESIGN.md amendments

**Files:**
- Modify: `tailwind.config.ts:14-39`
- Modify: `DESIGN.md` (Layout line 106, Design Decisions table)
- Test: `src/__tests__/lib/designTokens.test.ts`

**Interfaces:**
- Produces the Tailwind classes used by PRs 2–6: `bg-ink`, `text-ink-accent`, `bg-streak-miss`, `border-streak-miss-border`, `bg-streak-future`, `bg-focus-card`, `border-focus-card-border`, `bg-streak-pill`, `text-streak-pill-text`, `shadow-card`, `shadow-float`, `shadow-cta-ink`, `shadow-cta-blue`.

- [ ] **Step 1: Write the failing test.**

```ts
// src/__tests__/lib/designTokens.test.ts
import { describe, it, expect } from 'vitest';
import config from '../../../tailwind.config';

type Extend = { colors: Record<string, string>; boxShadow: Record<string, string> };
const extend = config.theme?.extend as unknown as Extend;

describe('dashboard v2 design tokens (spec §8.1)', () => {
  it('adds the ink surface and its accent', () => {
    expect(extend.colors.ink).toBe('#0b1220');
    expect(extend.colors['ink-accent']).toBe('#6ee7b7');
  });

  it('adds the streak, focus-card and streak-pill colors', () => {
    expect(extend.colors['streak-miss']).toBe('#fecaca');
    expect(extend.colors['streak-miss-border']).toBe('#f87171');
    expect(extend.colors['streak-future']).toBe('#e2e8f0');
    expect(extend.colors['focus-card']).toBe('#fffbeb');
    expect(extend.colors['focus-card-border']).toBe('rgba(245,158,11,0.35)');
    expect(extend.colors['streak-pill']).toBe('#ffedd5');
    expect(extend.colors['streak-pill-text']).toBe('#7c2d12');
  });

  it('adds the four shadows', () => {
    expect(extend.boxShadow).toEqual({
      card: '0 1px 4px rgba(15,23,42,0.06)',
      float: '0 12px 34px rgba(15,23,42,0.09)',
      'cta-ink': '0 10px 24px rgba(15,23,42,0.18)',
      'cta-blue': '0 0 0 1px rgba(37,99,235,0.22), 0 0 14px rgba(37,99,235,0.2)',
    });
  });

  it('leaves existing tokens untouched', () => {
    expect(extend.colors.action).toBe('#2563eb');
    expect(extend.colors.success).toBe('#27AE60');
    expect(extend.colors.danger).toBe('#EF4444');
    expect(extend.colors.border).toBe('#E5E7EB');
  });
});
```

- [ ] **Step 2: Run it and watch it fail.**

Run: `npx vitest run src/__tests__/lib/designTokens.test.ts`
Expected: FAIL. `extend.colors.ink` is `undefined`.

- [ ] **Step 3: Add the tokens.** In `tailwind.config.ts`, append these inside `colors`, after `border: '#E5E7EB',`:

```ts
        // Dashboard v2 (2026-09-12) — see DESIGN.md decisions.
        ink: '#0b1220',
        'ink-accent': '#6ee7b7',
        'streak-miss': '#fecaca',
        'streak-miss-border': '#f87171',
        'streak-future': '#e2e8f0',
        'focus-card': '#fffbeb',
        'focus-card-border': 'rgba(245,158,11,0.35)',
        'streak-pill': '#ffedd5',
        'streak-pill-text': '#7c2d12',
```

Then add a sibling of `keyframes` inside `extend`:

```ts
      boxShadow: {
        card: '0 1px 4px rgba(15,23,42,0.06)',
        float: '0 12px 34px rgba(15,23,42,0.09)',
        'cta-ink': '0 10px 24px rgba(15,23,42,0.18)',
        'cta-blue': '0 0 0 1px rgba(37,99,235,0.22), 0 0 14px rgba(37,99,235,0.2)',
      },
```

- [ ] **Step 4: Run it and watch it pass.**

Run: `npx vitest run src/__tests__/lib/designTokens.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Amend DESIGN.md.**
  - Replace the Layout line `- **Sidebar:** 220px fixed, icon+label nav, 5 items max` with: `- **Sidebar:** 220px fixed, icon+label nav (v1). Dashboard v2: 200px, 6 items plus footer; mobile uses a 5-tab bottom bar instead of the drawer (see 2026-09-12).`
  - Append these rows to the Design Decisions table:

```markdown
| 2026-09-12 | Ink surface token (`ink` #0b1220, `ink-accent` #6ee7b7) | The Pro-upgrade redesign closes every dashboard tab with one dark card naming a number the user owns, and uses ink for the readiness CTA and the sidebar upgrade rail. That fills the "dark surfaces" gap the 2026-08-06 entry flagged, as a token rather than case by case. Ink is for closing cards, ink CTAs and the upgrade rail only. |
| 2026-09-12 | Dashboard v2 navigation: 200px sidebar (6 items + footer), 5-tab mobile bottom bar | The hamburger hid Intelligence (now "Coach") from most mobile traffic. Income & Budget and Settings move to the avatar menu on mobile. v1 keeps 220px until it is removed. |
| 2026-09-12 | Blue on two passive labels | The readiness counter ("3 of 5") is progress, and the "Your free move" eyebrow marks the one free coach action. These are the only passive uses of `#2563eb`. |
| 2026-09-12 | My Debts rows + wallet-card detail | v2 My Debts lists compact rows. The wallet-card `DebtCard` (2026-06-10) remains the expanded detail view. |
| 2026-09-12 | Dashed border = outside the plan | Dashed borders mean only "saved, outside the plan" (Free debts past the cap). Nothing else may use a dashed border in the dashboard. |
| 2026-09-12 | Meter motion | Bars, rings and meters animate once, 0 → value, ~600ms ease-out, and are static under `prefers-reduced-motion`. Win moments keep `cubic-bezier(0.22,1,0.36,1)`. |
```

- [ ] **Step 6: Lint and commit.**

Run: `npm run lint`
Expected: no new errors.

```bash
git add tailwind.config.ts DESIGN.md src/__tests__/lib/designTokens.test.ts
git commit -m "feat(design): add dashboard v2 tokens and record DESIGN.md decisions" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Shared helper changes (APR estimate export, injectable "today")

**Files:**
- Modify: `src/lib/apr-negotiation/apr-negotiation-adapter.ts` (add the export after `computeRateTargets`, ~L160)
- Modify: `src/lib/apr-negotiation/useAprNegotiation.ts:100-106` (delete the local function; import it instead)
- Modify: `src/lib/debtHelpers.ts:33-38`
- Test: `src/__tests__/lib/aprNegotiationAdapter.test.ts` (create), `src/__tests__/lib/debtHelpers.test.ts` (extend)

**Interfaces:**
- Produces:
  - `estimateAnnualSavings(balance: number, currentApr: number, targetApr: number): number | null`, exported from `@/lib/apr-negotiation/apr-negotiation-adapter`
  - `isDebtPastDueThisMonth(debt: { balance: number; dueDate?: number | null }, paidThisMonth: boolean, today?: Date): boolean`. `today` defaults to `new Date()`, so existing callers are unchanged.

- [ ] **Step 1: Write the failing tests.**

```ts
// src/__tests__/lib/aprNegotiationAdapter.test.ts
import { describe, it, expect } from 'vitest';
import { computeRateTargets, estimateAnnualSavings } from '@/lib/apr-negotiation/apr-negotiation-adapter';

describe('estimateAnnualSavings (moved verbatim from useAprNegotiation)', () => {
  it('is balance × (current − target) / 100, rounded', () => {
    expect(estimateAnnualSavings(5000, 24.99, 17.49)).toBe(375);
  });
  it('is 0 when the target is not below the current rate', () => {
    expect(estimateAnnualSavings(5000, 9.99, 9.99)).toBe(0);
    expect(estimateAnnualSavings(5000, 9, 12)).toBe(0);
  });
  it('is null for non-finite input', () => {
    expect(estimateAnnualSavings(Number.NaN, 20, 14)).toBeNull();
    expect(estimateAnnualSavings(1000, Number.POSITIVE_INFINITY, 14)).toBeNull();
  });
});

describe('computeRateTargets (unchanged, pinned for rate watch)', () => {
  it('asks for ~30% off with a 9.99% floor, never above current', () => {
    expect(computeRateTargets(30).targetApr).toBe('21');
    expect(computeRateTargets(12).targetApr).toBe('9.99');
    expect(computeRateTargets(8).targetApr).toBe('8');
    expect(computeRateTargets(0).targetApr).toBe('');
  });
});
```

Append to `src/__tests__/lib/debtHelpers.test.ts` (and add `isDebtPastDueThisMonth` and `vi` to its imports):

```ts
describe('isDebtPastDueThisMonth with an injected today', () => {
  const today = new Date(2026, 8, 12); // Sep 12, local time

  it('is past due when the due day has passed and nothing is logged', () => {
    expect(isDebtPastDueThisMonth({ balance: 100, dueDate: 10 }, false, today)).toBe(true);
  });
  it('is not past due on the due day itself', () => {
    expect(isDebtPastDueThisMonth({ balance: 100, dueDate: 12 }, false, today)).toBe(false);
  });
  it('is not past due once logged, when paid off, or with no due day', () => {
    expect(isDebtPastDueThisMonth({ balance: 100, dueDate: 10 }, true, today)).toBe(false);
    expect(isDebtPastDueThisMonth({ balance: 0, dueDate: 10 }, false, today)).toBe(false);
    expect(isDebtPastDueThisMonth({ balance: 100, dueDate: null }, false, today)).toBe(false);
  });
  it('defaults today to the current date for existing callers', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 12));
    expect(isDebtPastDueThisMonth({ balance: 100, dueDate: 10 }, false)).toBe(true);
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run them and watch them fail.**

Run: `npx vitest run src/__tests__/lib/aprNegotiationAdapter.test.ts src/__tests__/lib/debtHelpers.test.ts`
Expected: FAIL. `estimateAnnualSavings` is not exported from the adapter.

- [ ] **Step 3: Implement.** In `apr-negotiation-adapter.ts`, after `computeRateTargets`:

```ts
/** Rough annual interest saving = balance * (currentAPR - targetAPR) / 100. */
export function estimateAnnualSavings(balance: number, currentApr: number, targetApr: number): number | null {
  if (![balance, currentApr, targetApr].every(Number.isFinite)) return null;
  const delta = currentApr - targetApr;
  if (delta <= 0) return 0;
  return Math.round((balance * delta) / 100);
}
```

In `useAprNegotiation.ts`:
- Delete lines 100-106 (the local `estimateAnnualSavings` and its comment).
- Add `estimateAnnualSavings,` to the existing `import { … } from "./apr-negotiation-adapter";` block.

In `debtHelpers.ts`, replace `isDebtPastDueThisMonth`:

```ts
export function isDebtPastDueThisMonth(
  debt: { balance: number; dueDate?: number | null },
  paidThisMonth: boolean,
  today: Date = new Date(),
): boolean {
  return debt.balance > 0.01 && !paidThisMonth && isDebtOverdueThisMonth(debt.dueDate, today);
}
```

- [ ] **Step 4: Run them and watch them pass,** then run the whole suite.

Run: `npx vitest run src/__tests__/lib/aprNegotiationAdapter.test.ts src/__tests__/lib/debtHelpers.test.ts`
Expected: PASS.
Run: `npm test`
Expected: PASS (no regressions).

- [ ] **Step 5: Commit.**

```bash
git add src/lib/apr-negotiation src/lib/debtHelpers.ts src/__tests__/lib/aprNegotiationAdapter.test.ts src/__tests__/lib/debtHelpers.test.ts
git commit -m "refactor(lib): export APR savings estimate and inject today into past-due check" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Insights types, test fixtures, and the verbatim paid-off and streak formulas

**Files:**
- Create: `src/lib/dashboard/types.ts`, `src/lib/dashboard/progress.ts`
- Create: `src/__tests__/lib/dashboard/fixtures.ts` (not a test file: vitest only runs `*.test.ts`)
- Modify: `src/components/tabs/ThisMonthTab.tsx:103-118`, `src/components/tabs/ProgressTab.tsx:251-279`
- Test: `src/__tests__/lib/dashboard/progress.test.ts`

**Interfaces:**
- Produces, in `@/lib/dashboard/types`, the types every later task uses (full file contents, Step 1).
- Produces, in `@/lib/dashboard/progress`:
  - `computeThisMonthPaidProgress(debts): { totalPaid: number; totalOriginal: number; hasOriginalBalances: boolean }`
  - `computeProgressTotals(debts): { currentTotal: number; originalTotal: number; totalPaid: number; paidOffCount: number }`
  - `computeProgressStreak(snapshots: ReadonlyArray<{ recordedAt: string }>): number`
- Produces, in fixtures: `makeDebt`, `makeIncome`, `makeSnapshot`.

- [ ] **Step 1: Create `src/lib/dashboard/types.ts`.**

```ts
import type { PayoffMethod } from '@/lib/snowball';

export type ReadinessStepId = 'debts' | 'income' | 'expenses' | 'dueDates' | 'firstPayment';
export interface ReadinessStep {
  id: ReadinessStepId;
  complete: boolean;
  /** Items still to do (e.g. debts missing a due day). 0 when complete; 1 for non-countable steps. */
  pendingCount: number;
}
export interface PlanReadiness { steps: ReadinessStep[]; completeCount: number; percent: number }

export interface MonthlyInterest { monthlyEstimate: number; avgMonthlySavedByPlan: number | null }

export interface MissedPayment { debtId: string; minimumPayment: number }
export interface PaymentGap {
  expected: number;
  logged: number;
  missed: MissedPayment[];
  missedMinimums: number;
  notYetDue: number;
}

export interface RateOpportunity { debtId: string; debtName: string; apr: number; targetApr: number; annualEstimate: number }
export interface RateWatch { cards: number; annualEstimate: number; top: RateOpportunity }

export interface StrategyComparison {
  current: 'snowball' | 'avalanche';
  currentInterest: number;
  alternative: 'snowball' | 'avalanche';
  alternativeInterest: number;
  /** max(0, currentInterest − alternativeInterest) */
  alternativeSaves: number;
}

/** amount > 0 = ahead of plan, < 0 = behind (usePlannerComputed semantics). */
export interface PlanGap { amount: number; asOfMonth: string }

export type StreakCellState = 'inactive' | 'logged' | 'missed' | 'current' | 'currentComplete' | 'future';
export interface StreakCell { month: string; state: StreakCellState }
export interface ProgressSummary { paidToDate: number; startingTotal: number; streak: number; grid: StreakCell[] }

export interface PlanSummary { method: PayoffMethod; months: number; debtFreeDate: string; totalInterest: number }

export interface TierInfo { proEligible: boolean; paidPro: boolean; trial: { active: boolean; endsAt: string | null } }

interface MoveBase { isFree: boolean }
export type CoachMove =
  | (MoveBase & { id: 'log_missed'; priority: 'high'; value: { kind: 'count'; amount: number };
      facts: { monthLabel: string; logged: number; expected: number; missedCount: number; missedMinimums: number } })
  | (MoveBase & { id: 'use_unallocated'; priority: 'high'; value: { kind: 'months'; amount: number };
      facts: { unusedMonthly: number; targetAcceleration: number; monthsSooner: number } })
  | (MoveBase & { id: 'switch_strategy'; priority: 'medium'; value: { kind: 'total'; amount: number };
      facts: { alternative: 'snowball' | 'avalanche'; interestDifference: number } })
  | (MoveBase & { id: 'call_apr'; priority: 'medium'; value: { kind: 'perYear'; amount: number }; facts: RateOpportunity });
export type CoachMoveId = CoachMove['id'];

/** PR 4 adds `uncounted`; PR 6 adds `trialMoment` and trial eligibility on `tier`. */
export interface DashboardInsights {
  asOf: { year: number; month: number; day: number };
  tier: TierInfo;
  readiness: PlanReadiness;
  interest: MonthlyInterest | null;
  paymentGap: PaymentGap | null;
  coachMoves: CoachMove[];
  rateWatch: RateWatch | null;
  strategy: StrategyComparison | null;
  planGap: PlanGap | null;
  progress: ProgressSummary | null;
  plan: PlanSummary | null;
}
```

- [ ] **Step 2: Create the fixtures.**

```ts
// src/__tests__/lib/dashboard/fixtures.ts
import type { BalanceSnapshot, Debt, Income } from '@/types';

export function makeDebt(
  overrides: Partial<Debt> & { id: string; balance: number; minimumPayment: number },
): Debt {
  const { id, balance, minimumPayment, ...rest } = overrides;
  return {
    id,
    userId: 'user-1',
    name: id,
    category: 'Credit Card',
    balance,
    originalBalance: balance,
    interestRate: 0,
    minimumPayment,
    creditLimit: 0,
    priorityOrder: null,
    dueDate: undefined,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...rest,
  };
}

export function makeIncome(overrides: Partial<Income> = {}): Income {
  return {
    id: 'income-1',
    userId: 'user-1',
    monthlyTakeHome: 4_000,
    essentialExpenses: 2_000,
    extraPayment: 0,
    payoffMethod: 'snowball',
    accelerationAmount: null,
    source: undefined,
    frequency: 'monthly',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

/** ym = "YYYY-MM"; recordedAt normalized to the 1st, as the API stores it. */
export function makeSnapshot(debtId: string, ym: string, balance: number): BalanceSnapshot {
  const iso = `${ym}-01T00:00:00.000Z`;
  return { id: `${debtId}-${ym}`, debtId, userId: 'user-1', balance, recordedAt: iso, createdAt: iso };
}
```

- [ ] **Step 3: Write the failing test.** It pins each extracted function to a copy of the legacy inline code over varied fixtures.

```ts
// src/__tests__/lib/dashboard/progress.test.ts
import { describe, it, expect } from 'vitest';
import {
  computeProgressStreak,
  computeProgressTotals,
  computeThisMonthPaidProgress,
} from '@/lib/dashboard/progress';
import { makeDebt, makeSnapshot } from './fixtures';

// ── Legacy copies (verbatim from the tabs as of 938a0f45) ────────────────────
function legacyThisMonth(debts: { balance: number; originalBalance: number }[]) {
  let paid = 0; let original = 0; let known = false;
  for (const d of debts) {
    const hasOriginal = d.originalBalance > 0;
    if (hasOriginal) known = true;
    const base = hasOriginal ? d.originalBalance : d.balance;
    original += base;
    paid += Math.max(0, base - d.balance);
  }
  return { totalPaid: paid, totalOriginal: original, hasOriginalBalances: known };
}
function legacyProgress(debts: { balance: number; originalBalance: number }[], snapshots: { recordedAt: string }[]) {
  const currentTotal = debts.reduce((sum, debt) => sum + debt.balance, 0);
  const originalTotal = debts.reduce((sum, debt) => sum + (debt.originalBalance || debt.balance), 0);
  const totalPaid = Math.max(0, originalTotal - currentTotal);
  const paidOffCount = debts.filter((debt) => debt.balance <= 0).length;
  const monthKeys = Array.from(new Set(snapshots.map((s) => s.recordedAt.slice(0, 7)))).sort();
  let streak = 0;
  if (monthKeys.length) {
    streak = 1;
    for (let i = monthKeys.length - 1; i > 0; i -= 1) {
      const cur = new Date(`${monthKeys[i]}-01`);
      const prev = new Date(`${monthKeys[i - 1]}-01`);
      const diffMonths = (cur.getFullYear() - prev.getFullYear()) * 12 + cur.getMonth() - prev.getMonth();
      if (diffMonths === 1) streak += 1; else break;
    }
  }
  return { currentTotal, totalPaid, paidOffCount, streak, originalTotal };
}

const DEBT_SETS = [
  [],
  [makeDebt({ id: 'a', balance: 800, minimumPayment: 25, originalBalance: 1000 })],
  [
    makeDebt({ id: 'a', balance: 800, minimumPayment: 25, originalBalance: 1000 }),
    makeDebt({ id: 'b', balance: 1200, minimumPayment: 40, originalBalance: 1000 }), // grew
    makeDebt({ id: 'c', balance: 0, minimumPayment: 0, originalBalance: 500 }), // paid off
    makeDebt({ id: 'd', balance: 300, minimumPayment: 10, originalBalance: 0 }), // unknown origin
  ],
];
const SNAPSHOT_SETS = [
  [],
  [makeSnapshot('a', '2026-09', 800)],
  [makeSnapshot('a', '2026-06', 900), makeSnapshot('a', '2026-07', 850), makeSnapshot('b', '2026-08', 1100), makeSnapshot('a', '2026-09', 800)],
  [makeSnapshot('a', '2025-12', 950), makeSnapshot('a', '2026-01', 925), makeSnapshot('a', '2026-03', 900)], // gap
];

describe('dashboard progress extractions', () => {
  it.each(DEBT_SETS.map((d, i) => [i, d] as const))('This Month paid progress equals legacy (set %i)', (_i, debts) => {
    expect(computeThisMonthPaidProgress(debts)).toEqual(legacyThisMonth(debts));
  });

  it.each(DEBT_SETS.flatMap((d, i) => SNAPSHOT_SETS.map((s, j) => [i, j, d, s] as const)))(
    'Progress totals + streak equal legacy (debts %i, snapshots %i)',
    (_i, _j, debts, snapshots) => {
      const legacy = legacyProgress(debts, snapshots);
      expect({ ...computeProgressTotals(debts), streak: computeProgressStreak(snapshots) }).toEqual(legacy);
    },
  );

  it('counts consecutive snapshot months ending at the latest one', () => {
    expect(computeProgressStreak(SNAPSHOT_SETS[2])).toBe(4);
    expect(computeProgressStreak(SNAPSHOT_SETS[3])).toBe(1);
    expect(computeProgressStreak([])).toBe(0);
  });
});
```

- [ ] **Step 4: Run it and watch it fail.**

Run: `npx vitest run src/__tests__/lib/dashboard/progress.test.ts`
Expected: FAIL with "Failed to resolve import '@/lib/dashboard/progress'".

- [ ] **Step 5: Implement `src/lib/dashboard/progress.ts`.**

```ts
import type { BalanceSnapshot, Debt } from '@/types';

type BalanceFields = Pick<Debt, 'balance' | 'originalBalance'>;

export interface ThisMonthPaidProgress {
  totalPaid: number;
  totalOriginal: number;
  hasOriginalBalances: boolean;
}

/**
 * The This Month hero gauge's paid-off figure, verbatim from ThisMonthTab
 * (938a0f45, L106-118): principal paid across all debts. Debts without a
 * recorded originalBalance contribute their current balance to the
 * denominator (0% progress) rather than skewing the ratio.
 */
export function computeThisMonthPaidProgress(debts: ReadonlyArray<BalanceFields>): ThisMonthPaidProgress {
  let paid = 0;
  let original = 0;
  let known = false;
  for (const d of debts) {
    const hasOriginal = d.originalBalance > 0;
    if (hasOriginal) known = true;
    const base = hasOriginal ? d.originalBalance : d.balance;
    original += base;
    paid += Math.max(0, base - d.balance);
  }
  return { totalPaid: paid, totalOriginal: original, hasOriginalBalances: known };
}

export interface ProgressTotals {
  currentTotal: number;
  originalTotal: number;
  totalPaid: number;
  paidOffCount: number;
}

/**
 * Progress tab totals, verbatim from ProgressTab (938a0f45, L252-258). Nets
 * growth on one debt against paydown on another, unlike the This Month gauge;
 * the two intentionally stay separate so neither tab's figure changes.
 */
export function computeProgressTotals(debts: ReadonlyArray<BalanceFields>): ProgressTotals {
  const currentTotal = debts.reduce((sum, debt) => sum + debt.balance, 0);
  const originalTotal = debts.reduce((sum, debt) => sum + (debt.originalBalance || debt.balance), 0);
  const totalPaid = Math.max(0, originalTotal - currentTotal);
  const paidOffCount = debts.filter((debt) => debt.balance <= 0).length;
  return { currentTotal, originalTotal, totalPaid, paidOffCount };
}

/**
 * Progress tab streak, verbatim from ProgressTab (938a0f45, L260-276):
 * consecutive calendar months with any balance snapshot, counted back from
 * the latest snapshot month.
 */
export function computeProgressStreak(snapshots: ReadonlyArray<Pick<BalanceSnapshot, 'recordedAt'>>): number {
  const monthKeys = Array.from(new Set(snapshots.map((snapshot) => snapshot.recordedAt.slice(0, 7)))).sort();
  let streak = 0;
  if (monthKeys.length) {
    streak = 1;
    for (let i = monthKeys.length - 1; i > 0; i -= 1) {
      const cur = new Date(`${monthKeys[i]}-01`);
      const prev = new Date(`${monthKeys[i - 1]}-01`);
      const diffMonths = (cur.getFullYear() - prev.getFullYear()) * 12 + cur.getMonth() - prev.getMonth();
      if (diffMonths === 1) streak += 1;
      else break;
    }
  }
  return streak;
}
```

- [ ] **Step 6: Run it and watch it pass.**

Run: `npx vitest run src/__tests__/lib/dashboard/progress.test.ts`
Expected: PASS (all cases).

- [ ] **Step 7: Point the tabs at the extracted functions** (behavior identical).

In `ThisMonthTab.tsx`:
- Add `import { computeThisMonthPaidProgress } from "@/lib/dashboard/progress";`.
- Replace the `useMemo` at L106-118 (keep the comment above it) with:

```tsx
  const { totalPaid, totalOriginal, hasOriginalBalances } = useMemo(
    () => computeThisMonthPaidProgress(debts),
    [debts],
  );
```

In `ProgressTab.tsx`:
- Add `import { computeProgressStreak, computeProgressTotals } from "@/lib/dashboard/progress";`.
- Replace the `stats` `useMemo` at L251-279 with:

```tsx
  const stats = useMemo(
    () => ({ ...computeProgressTotals(debts), streak: computeProgressStreak(snapshots) }),
    [snapshots, debts],
  );
```

- [ ] **Step 8: Verify and commit.**

Run: `npm test`, then `npm run lint`
Expected: PASS, and no new lint errors.

```bash
git add src/lib/dashboard/types.ts src/lib/dashboard/progress.ts src/__tests__/lib/dashboard src/components/tabs/ThisMonthTab.tsx src/components/tabs/ProgressTab.tsx
git commit -m "refactor(dashboard): extract paid-off and streak formulas verbatim into lib/dashboard" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Behind-plan (plan gap), extracted verbatim

**Files:**
- Create: `src/lib/dashboard/planGap.ts`
- Modify: `src/__tests__/lib/dashboard/fixtures.ts` (add `makeResult`)
- Modify: `src/components/tabs/IntelligenceTab.tsx:56-86`, `src/lib/hooks/usePlannerComputed.ts:56-64`
- Test: `src/__tests__/lib/dashboard/planGap.test.ts`

**Interfaces:**
- Consumes: `PlanGap` from `@/lib/dashboard/types` (Task 3).
- Produces, in `@/lib/dashboard/planGap`:
  - `buildBalanceChartData(planResult: PayoffResult | null, minimumsOnlyResult: PayoffResult | null, actualBalanceMap: ReadonlyMap<string, number>, currentTotalDebt: number): ChartEntry[]`
  - `computePlanGapValue(chart: ChartEntry[]): number | null`
  - `computePlanGap(chart: ChartEntry[]): PlanGap | null`
- Produces, in fixtures: `makeResult(balances: Array<[string, number]>, extra?: Partial<Omit<PayoffResult, 'monthlyBalances'>>): PayoffResult`.

- [ ] **Step 1: Add `makeResult` to the fixtures.** Append to `src/__tests__/lib/dashboard/fixtures.ts`, and add `import type { PayoffResult } from '@/lib/snowball';` at the top.

```ts
/** A PayoffResult stub. balances = [["Sep 2026", 1000], ...]; months defaults to balances.length - 1. */
export function makeResult(
  balances: Array<[string, number]>,
  extra: Partial<Omit<PayoffResult, 'monthlyBalances'>> = {},
): PayoffResult {
  return {
    months: Math.max(0, balances.length - 1),
    years: 0,
    totalInterestPaid: 0,
    totalAmountPaid: 0,
    debtFreeDate: new Date('2027-01-01T00:00:00Z'),
    payoffSchedule: [],
    monthlyPayment: 0,
    monthlyBalances: balances.map(([date, totalBalance], month) => ({ month, date, totalBalance })),
    ...extra,
  };
}
```

- [ ] **Step 2: Write the failing test.**

```ts
// src/__tests__/lib/dashboard/planGap.test.ts
import { describe, it, expect } from 'vitest';
import type { ChartEntry } from '@/components/payoff/BalanceOverTimeChart';
import type { PayoffResult } from '@/lib/snowball';
import { buildBalanceChartData, computePlanGap, computePlanGapValue } from '@/lib/dashboard/planGap';
import { makeResult } from './fixtures';

// ── Legacy copies (IntelligenceTab L56-86 and usePlannerComputed L56-64, 938a0f45) ──
function legacyChart(planResult: PayoffResult | null, minimumsOnlyResult: PayoffResult | null, actualBalanceMap: Map<string, number>, currentTotalDebt: number): ChartEntry[] {
  if (!planResult) return [];
  const projectedMap = new Map(planResult.monthlyBalances.map((mb) => [mb.date, mb.totalBalance]));
  const minimumsMap = new Map((minimumsOnlyResult?.monthlyBalances ?? []).map((mb) => [mb.date, mb.totalBalance]));
  const base = (minimumsOnlyResult?.months ?? 0) >= planResult.months ? minimumsOnlyResult!.monthlyBalances : planResult.monthlyBalances;
  const hasSnapshots = actualBalanceMap.size > 0;
  return base.map((mb, index) => ({
    date: mb.date,
    month: mb.month,
    totalBalance: projectedMap.get(mb.date),
    minimumsBalance: minimumsMap.get(mb.date),
    avalancheBalance: undefined,
    actualBalance: index === 0 && hasSnapshots ? (actualBalanceMap.get(mb.date) ?? currentTotalDebt) : actualBalanceMap.get(mb.date),
  }));
}
function legacyGap(balanceChartData: ChartEntry[]): number | null {
  const reversed = [...balanceChartData].reverse();
  const lastActualPoint = reversed.find((p) => p.actualBalance != null);
  if (lastActualPoint?.actualBalance == null || lastActualPoint.totalBalance == null) return null;
  return lastActualPoint.totalBalance - lastActualPoint.actualBalance;
}

const PLAN = makeResult([['Sep 2026', 1000], ['Oct 2026', 900], ['Nov 2026', 800]]);
const MINIMUMS = makeResult([['Sep 2026', 1000], ['Oct 2026', 950], ['Nov 2026', 900], ['Dec 2026', 850]]);
const CASES: Array<[string, PayoffResult | null, PayoffResult | null, Map<string, number>, number]> = [
  ['no plan', null, MINIMUMS, new Map(), 1000],
  ['no snapshots', PLAN, MINIMUMS, new Map(), 1000],
  ['month 0 anchored to current debt', PLAN, MINIMUMS, new Map([['Aug 2026', 1020]]), 950],
  ['behind in Oct', PLAN, MINIMUMS, new Map([['Sep 2026', 1000], ['Oct 2026', 950]]), 950],
  ['ahead in Oct', PLAN, null, new Map([['Sep 2026', 1000], ['Oct 2026', 880]]), 880],
];

describe('plan gap extraction', () => {
  it.each(CASES)('chart and gap equal legacy: %s', (_name, plan, minimums, actual, current) => {
    const chart = buildBalanceChartData(plan, minimums, actual, current);
    expect(chart).toEqual(legacyChart(plan, minimums, actual, current));
    expect(computePlanGapValue(chart)).toBe(legacyGap(chart));
  });

  it('reports the gap with the month it was measured in', () => {
    const behind = buildBalanceChartData(PLAN, MINIMUMS, new Map([['Sep 2026', 1000], ['Oct 2026', 950]]), 950);
    expect(computePlanGap(behind)).toEqual({ amount: -50, asOfMonth: 'Oct 2026' });
  });

  it('is null without snapshots (never "$0 behind")', () => {
    expect(computePlanGap(buildBalanceChartData(PLAN, MINIMUMS, new Map(), 1000))).toBeNull();
  });
});
```

- [ ] **Step 3: Run it and watch it fail.**

Run: `npx vitest run src/__tests__/lib/dashboard/planGap.test.ts`
Expected: FAIL with "Failed to resolve import '@/lib/dashboard/planGap'".

- [ ] **Step 4: Implement `src/lib/dashboard/planGap.ts`.**

```ts
import type { ChartEntry } from '@/components/payoff/BalanceOverTimeChart';
import type { PayoffResult } from '@/lib/snowball';
import type { PlanGap } from './types';

/**
 * Balance-over-time chart rows, verbatim from IntelligenceTab (938a0f45,
 * L56-86). Month labels ("Sep 2026") come from the engine and must match the
 * snapshot labels from computeActualBalanceTotals.
 */
export function buildBalanceChartData(
  planResult: PayoffResult | null,
  minimumsOnlyResult: PayoffResult | null,
  actualBalanceMap: ReadonlyMap<string, number>,
  currentTotalDebt: number,
): ChartEntry[] {
  if (!planResult) return [];
  const projectedMap = new Map(planResult.monthlyBalances.map((mb) => [mb.date, mb.totalBalance]));
  const minimumsMap = new Map(
    (minimumsOnlyResult?.monthlyBalances ?? []).map((mb) => [mb.date, mb.totalBalance]),
  );
  const base =
    (minimumsOnlyResult?.months ?? 0) >= planResult.months
      ? minimumsOnlyResult!.monthlyBalances
      : planResult.monthlyBalances;
  const hasSnapshots = actualBalanceMap.size > 0;
  return base.map((mb, index) => ({
    date: mb.date,
    month: mb.month,
    totalBalance: projectedMap.get(mb.date),
    minimumsBalance: minimumsMap.get(mb.date),
    avalancheBalance: undefined,
    // Month 0 anchored to current total debt when snapshots exist; otherwise
    // leave undefined so the gap stays null (no "$NaN behind" display).
    actualBalance:
      index === 0 && hasSnapshots
        ? (actualBalanceMap.get(mb.date) ?? currentTotalDebt)
        : actualBalanceMap.get(mb.date),
  }));
}

function lastActualPoint(chart: ChartEntry[]): ChartEntry | undefined {
  return [...chart].reverse().find((p) => p.actualBalance != null);
}

/** Verbatim from usePlannerComputed (938a0f45, L56-64). Positive = ahead of plan. */
export function computePlanGapValue(chart: ChartEntry[]): number | null {
  const point = lastActualPoint(chart);
  if (point?.actualBalance == null || point.totalBalance == null) return null;
  return point.totalBalance - point.actualBalance;
}

/** The gap plus the month it was measured in. Null when it can't be computed. */
export function computePlanGap(chart: ChartEntry[]): PlanGap | null {
  const amount = computePlanGapValue(chart);
  const point = lastActualPoint(chart);
  if (amount == null || !Number.isFinite(amount) || !point) return null;
  return { amount, asOfMonth: point.date };
}
```

- [ ] **Step 5: Run it and watch it pass.**

Run: `npx vitest run src/__tests__/lib/dashboard/planGap.test.ts`
Expected: PASS.

- [ ] **Step 6: Point the callers at the extraction** (behavior identical).

In `IntelligenceTab.tsx`:
- Add `import { buildBalanceChartData } from "@/lib/dashboard/planGap";`.
- Replace the `balanceChartData` `useMemo` (L56-86) with:

```tsx
  const balanceChartData: ChartEntry[] = useMemo(
    () =>
      buildBalanceChartData(
        planResult,
        minimumsOnlyResult,
        actualBalanceMap,
        debts.reduce((s, d) => s + (d.balance ?? 0), 0),
      ),
    [planResult, minimumsOnlyResult, actualBalanceMap, debts],
  );
```

In `usePlannerComputed.ts`:
- Add `import { computePlanGapValue } from '@/lib/dashboard/planGap';`.
- Replace both the `lastActualPoint` memo and the `planGap` memo (L56-64; `lastActualPoint` is referenced nowhere else) with:

```ts
  const planGap = useMemo(() => computePlanGapValue(balanceChartData), [balanceChartData]);
```

- [ ] **Step 7: Verify and commit.**

Run: `npm test`, then `npm run lint`
Expected: PASS, and no new lint errors.

```bash
git add src/lib/dashboard/planGap.ts src/__tests__/lib/dashboard src/components/tabs/IntelligenceTab.tsx src/lib/hooks/usePlannerComputed.ts
git commit -m "refactor(dashboard): extract plan-gap chart builder verbatim into lib/dashboard" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Plan readiness

**Files:**
- Create: `src/lib/dashboard/readiness.ts`
- Test: `src/__tests__/lib/dashboard/readiness.test.ts`

**Interfaces:**
- Consumes: `PlanReadiness`, `ReadinessStep` (Task 3); `isActiveDebt` from `@/lib/monthlyFocusDebt`.
- Produces:
  - `interface ReadinessInput { debts: ReadonlyArray<{ balance: number; dueDate?: number | null }>; income: { monthlyTakeHome: number; essentialExpenses: number } | null; recurringExpenseCount: number; hasAnyPayment: boolean }`
  - `computePlanReadiness(input: ReadinessInput): PlanReadiness`
  - `firstIncompleteStep(readiness: PlanReadiness): ReadinessStep | null`

- [ ] **Step 1: Write the failing test.**

```ts
// src/__tests__/lib/dashboard/readiness.test.ts
import { describe, it, expect } from 'vitest';
import { computePlanReadiness, firstIncompleteStep } from '@/lib/dashboard/readiness';

const debt = (balance: number, dueDate?: number | null) => ({ balance, dueDate });

describe('computePlanReadiness (spec §5.1)', () => {
  it('starts at 0 of 5 for a brand-new account, and the first step is debts', () => {
    const r = computePlanReadiness({ debts: [], income: null, recurringExpenseCount: 0, hasAnyPayment: false });
    expect(r.completeCount).toBe(0);
    expect(r.percent).toBe(0);
    expect(firstIncompleteStep(r)?.id).toBe('debts');
  });

  it('credits debts, income and expenses, and counts debts missing a due day', () => {
    const debts = [debt(100, 5), debt(200, 12), ...Array.from({ length: 7 }, () => debt(50, null))];
    const r = computePlanReadiness({
      debts,
      income: { monthlyTakeHome: 4000, essentialExpenses: 2000 },
      recurringExpenseCount: 0,
      hasAnyPayment: false,
    });
    expect(r.steps.map((s) => [s.id, s.complete, s.pendingCount])).toEqual([
      ['debts', true, 0],
      ['income', true, 0],
      ['expenses', true, 0],
      ['dueDates', false, 7],
      ['firstPayment', false, 1],
    ]);
    expect(r.completeCount).toBe(3);
    expect(r.percent).toBe(60);
    expect(firstIncompleteStep(r)).toEqual({ id: 'dueDates', complete: false, pendingCount: 7 });
  });

  it('accepts recurring expenses alone for the expenses step', () => {
    const r = computePlanReadiness({
      debts: [debt(100, 1)],
      income: { monthlyTakeHome: 3000, essentialExpenses: 0 },
      recurringExpenseCount: 2,
      hasAnyPayment: false,
    });
    expect(r.steps.find((s) => s.id === 'expenses')?.complete).toBe(true);
  });

  it('ignores paid-off debts when counting missing due days', () => {
    const r = computePlanReadiness({
      debts: [debt(100, 3), debt(0, null)],
      income: { monthlyTakeHome: 3000, essentialExpenses: 1000 },
      recurringExpenseCount: 0,
      hasAnyPayment: true,
    });
    expect(r.completeCount).toBe(5);
    expect(r.percent).toBe(100);
    expect(firstIncompleteStep(r)).toBeNull();
  });

  it('treats a zero take-home as incomplete income', () => {
    const r = computePlanReadiness({
      debts: [debt(100, 3)],
      income: { monthlyTakeHome: 0, essentialExpenses: 0 },
      recurringExpenseCount: 0,
      hasAnyPayment: false,
    });
    expect(r.steps.find((s) => s.id === 'income')?.complete).toBe(false);
  });
});
```

- [ ] **Step 2: Run it and watch it fail.**

Run: `npx vitest run src/__tests__/lib/dashboard/readiness.test.ts`
Expected: FAIL with "Failed to resolve import '@/lib/dashboard/readiness'".

- [ ] **Step 3: Implement `src/lib/dashboard/readiness.ts`.**

```ts
import { isActiveDebt } from '@/lib/monthlyFocusDebt';
import type { PlanReadiness, ReadinessStep } from './types';

export interface ReadinessInput {
  debts: ReadonlyArray<{ balance: number; dueDate?: number | null }>;
  income: { monthlyTakeHome: number; essentialExpenses: number } | null;
  recurringExpenseCount: number;
  hasAnyPayment: boolean;
}

function step(id: ReadinessStep['id'], complete: boolean, pendingWhenIncomplete = 1): ReadinessStep {
  return { id, complete, pendingCount: complete ? 0 : pendingWhenIncomplete };
}

/**
 * Five-step plan readiness (spec §5.1). Opens at the user's real progress, so
 * most dashboard users start at 3 of 5 (endowed progress, README §1a).
 */
export function computePlanReadiness(input: ReadinessInput): PlanReadiness {
  const active = input.debts.filter(isActiveDebt);
  const missingDueDays = active.filter((d) => d.dueDate == null).length;
  const takeHome = input.income?.monthlyTakeHome ?? 0;
  const essentials = input.income?.essentialExpenses ?? 0;

  const steps: ReadinessStep[] = [
    step('debts', active.length > 0),
    step('income', takeHome > 0),
    step('expenses', essentials > 0 || input.recurringExpenseCount > 0),
    step('dueDates', active.length > 0 && missingDueDays === 0, missingDueDays),
    step('firstPayment', input.hasAnyPayment),
  ];
  const completeCount = steps.filter((s) => s.complete).length;
  return { steps, completeCount, percent: Math.round((completeCount / steps.length) * 100) };
}

/** The step the readiness CTA opens, or null at 5 of 5 (the card then hides). */
export function firstIncompleteStep(readiness: PlanReadiness): ReadinessStep | null {
  return readiness.steps.find((s) => !s.complete) ?? null;
}
```

- [ ] **Step 4: Run it and watch it pass.**

Run: `npx vitest run src/__tests__/lib/dashboard/readiness.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit.**

```bash
git add src/lib/dashboard/readiness.ts src/__tests__/lib/dashboard/readiness.test.ts
git commit -m "feat(dashboard): compute five-step plan readiness" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Monthly interest estimate and plan average

**Files:**
- Create: `src/lib/dashboard/interest.ts`
- Test: `src/__tests__/lib/dashboard/interest.test.ts`

**Interfaces:**
- Consumes: `MonthlyInterest` (Task 3); `makeDebt`, `makeResult` (Tasks 3–4).
- Produces: `computeMonthlyInterest(debts: ReadonlyArray<Pick<Debt, 'balance' | 'interestRate'>>, plan: PayoffResult | null, minimumsOnly: PayoffResult | null): MonthlyInterest | null`

- [ ] **Step 1: Write the failing test.**

```ts
// src/__tests__/lib/dashboard/interest.test.ts
import { describe, it, expect } from 'vitest';
import { computeMonthlyInterest } from '@/lib/dashboard/interest';
import { makeDebt, makeResult } from './fixtures';

// Legacy copies of usePlannerComputed L90-101 (938a0f45).
const legacyLeak = (debts: { balance: number; interestRate: number }[]) =>
  debts.filter((d) => d.balance > 0.01).reduce((sum, d) => sum + ((d.balance * d.interestRate) / 100) / 12, 0);
const legacyAvoided = (minTotal: number, planTotal: number, planMonths: number) => {
  const totalSaved = Math.max(0, minTotal - planTotal);
  return planMonths > 0 ? totalSaved / planMonths : 0;
};

const DEBTS = [
  makeDebt({ id: 'a', balance: 1000, minimumPayment: 25, interestRate: 24 }), // 20.00/mo
  makeDebt({ id: 'b', balance: 2000, minimumPayment: 40, interestRate: 12 }), // 20.00/mo
  makeDebt({ id: 'c', balance: 0, minimumPayment: 0, interestRate: 30 }), // paid off: excluded
];

describe('computeMonthlyInterest (spec §5.1, deviation X1/X2)', () => {
  it('estimates this month as the sum of balance × APR ÷ 12 over active debts (legacy formula)', () => {
    const r = computeMonthlyInterest(DEBTS, null, null);
    expect(r?.monthlyEstimate).toBeCloseTo(40, 10);
    expect(r?.monthlyEstimate).toBe(legacyLeak(DEBTS));
    expect(r?.avgMonthlySavedByPlan).toBeNull();
  });

  it('averages lifetime savings vs minimums over plan months (legacy formula)', () => {
    const plan = makeResult([['Sep 2026', 3000]], { months: 10, totalInterestPaid: 500 });
    const minimums = makeResult([['Sep 2026', 3000]], { months: 30, totalInterestPaid: 800 });
    const r = computeMonthlyInterest(DEBTS, plan, minimums);
    expect(r?.avgMonthlySavedByPlan).toBe(legacyAvoided(800, 500, 10));
    expect(r?.avgMonthlySavedByPlan).toBe(30);
  });

  it('hides the average instead of showing $0', () => {
    const plan = makeResult([['Sep 2026', 3000]], { months: 10, totalInterestPaid: 800 });
    const minimums = makeResult([['Sep 2026', 3000]], { months: 10, totalInterestPaid: 800 });
    expect(computeMonthlyInterest(DEBTS, plan, minimums)?.avgMonthlySavedByPlan).toBeNull();
    const zeroMonths = makeResult([['Sep 2026', 0]], { months: 0 });
    expect(computeMonthlyInterest(DEBTS, zeroMonths, minimums)?.avgMonthlySavedByPlan).toBeNull();
  });

  it('is null when there is no interest to show', () => {
    expect(computeMonthlyInterest([], null, null)).toBeNull();
    expect(computeMonthlyInterest([makeDebt({ id: 'z', balance: 500, minimumPayment: 10, interestRate: 0 })], null, null)).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and watch it fail.**

Run: `npx vitest run src/__tests__/lib/dashboard/interest.test.ts`
Expected: FAIL with "Failed to resolve import '@/lib/dashboard/interest'".

- [ ] **Step 3: Implement `src/lib/dashboard/interest.ts`.**

```ts
import type { Debt } from '@/types';
import type { PayoffResult } from '@/lib/snowball';
import { isActiveDebt } from '@/lib/monthlyFocusDebt';
import type { MonthlyInterest } from './types';

/**
 * This month's interest estimate plus the plan's average monthly saving.
 * Both formulas are the ones usePlannerComputed already shows Pro users
 * (monthlyInterestLeak / monthlyInterestAvoided), so the numbers agree
 * across tabs. The estimate covers every active debt, because lenders charge
 * interest whether or not a debt is in the plan.
 */
export function computeMonthlyInterest(
  debts: ReadonlyArray<Pick<Debt, 'balance' | 'interestRate'>>,
  plan: PayoffResult | null,
  minimumsOnly: PayoffResult | null,
): MonthlyInterest | null {
  const monthlyEstimate = debts
    .filter(isActiveDebt)
    .reduce((sum, debt) => sum + ((debt.balance * debt.interestRate) / 100) / 12, 0);
  if (!Number.isFinite(monthlyEstimate) || monthlyEstimate <= 0) return null;

  let avgMonthlySavedByPlan: number | null = null;
  if (plan && minimumsOnly && plan.months > 0) {
    const totalSaved = Math.max(0, minimumsOnly.totalInterestPaid - plan.totalInterestPaid);
    const avg = totalSaved / plan.months;
    avgMonthlySavedByPlan = Number.isFinite(avg) && avg > 0 ? avg : null;
  }
  return { monthlyEstimate, avgMonthlySavedByPlan };
}
```

- [ ] **Step 4: Run it and watch it pass.**

Run: `npx vitest run src/__tests__/lib/dashboard/interest.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit.**

```bash
git add src/lib/dashboard/interest.ts src/__tests__/lib/dashboard/interest.test.ts
git commit -m "feat(dashboard): compute monthly interest estimate and plan average" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: This month's payment gap

**Files:**
- Create: `src/lib/dashboard/paymentGap.ts`
- Test: `src/__tests__/lib/dashboard/paymentGap.test.ts`

**Interfaces:**
- Consumes: `PaymentGap` (Task 3); `isDebtPastDueThisMonth(debt, paid, today)` (Task 2); `isActiveDebt`.
- Produces:
  - `interface PaymentRecordLike { debtId: string; dueYear: number; dueMonth: number }` (`dueMonth` is 0-11, as in `PaymentRecord`)
  - `computePaymentGap(debts: ReadonlyArray<Pick<Debt, 'id' | 'balance' | 'dueDate' | 'minimumPayment'>>, records: ReadonlyArray<PaymentRecordLike>, today: Date): PaymentGap | null`

- [ ] **Step 1: Write the failing test.**

```ts
// src/__tests__/lib/dashboard/paymentGap.test.ts
import { describe, it, expect } from 'vitest';
import { computePaymentGap } from '@/lib/dashboard/paymentGap';
import { makeDebt } from './fixtures';

const TODAY = new Date(2026, 8, 12); // Sep 12, local
const DEBTS = [
  makeDebt({ id: 'a', balance: 500, minimumPayment: 25, dueDate: 5 }), // logged
  makeDebt({ id: 'b', balance: 900, minimumPayment: 100, dueDate: 10 }), // missed
  makeDebt({ id: 'c', balance: 700, minimumPayment: 40, dueDate: 20 }), // not yet due
  makeDebt({ id: 'd', balance: 300, minimumPayment: 15 }), // no due day: never "missed"
  makeDebt({ id: 'e', balance: 0, minimumPayment: 0, dueDate: 1 }), // paid off: excluded
];

describe('computePaymentGap (spec §5.1)', () => {
  it('splits active debts into logged, missed and not yet due', () => {
    const gap = computePaymentGap(DEBTS, [
      { debtId: 'a', dueYear: 2026, dueMonth: 8 },
      { debtId: 'b', dueYear: 2026, dueMonth: 7 }, // last month's record doesn't count
    ], TODAY);
    expect(gap).toEqual({
      expected: 4,
      logged: 1,
      missed: [{ debtId: 'b', minimumPayment: 100 }],
      missedMinimums: 100,
      notYetDue: 2,
    });
  });

  it('counts any record in the month as logged (same rule as This Month paidDebtIds)', () => {
    const gap = computePaymentGap(DEBTS, [{ debtId: 'b', dueYear: 2026, dueMonth: 8 }], TODAY);
    expect(gap?.missed).toEqual([]);
    expect(gap?.logged).toBe(1);
  });

  it('treats the due day itself as on time', () => {
    const gap = computePaymentGap([makeDebt({ id: 'x', balance: 100, minimumPayment: 10, dueDate: 12 })], [], TODAY);
    expect(gap?.missed).toEqual([]);
    expect(gap?.notYetDue).toBe(1);
  });

  it('is null when there are no active debts', () => {
    expect(computePaymentGap([DEBTS[4]], [], TODAY)).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and watch it fail.**

Run: `npx vitest run src/__tests__/lib/dashboard/paymentGap.test.ts`
Expected: FAIL with "Failed to resolve import '@/lib/dashboard/paymentGap'".

- [ ] **Step 3: Implement `src/lib/dashboard/paymentGap.ts`.**

```ts
import type { Debt } from '@/types';
import { isActiveDebt } from '@/lib/monthlyFocusDebt';
import { isDebtPastDueThisMonth } from '@/lib/debtHelpers';
import type { MissedPayment, PaymentGap } from './types';

export interface PaymentRecordLike {
  debtId: string;
  dueYear: number;
  /** 0-11, as stored on PaymentRecord. */
  dueMonth: number;
}

/**
 * This month's logging state across every active debt. "Missed" reuses the
 * app's single past-due rule (isDebtPastDueThisMonth), so it agrees with the
 * Debts tab. A debt with no due day is never "missed", only not yet logged.
 */
export function computePaymentGap(
  debts: ReadonlyArray<Pick<Debt, 'id' | 'balance' | 'dueDate' | 'minimumPayment'>>,
  records: ReadonlyArray<PaymentRecordLike>,
  today: Date,
): PaymentGap | null {
  const active = debts.filter(isActiveDebt);
  if (active.length === 0) return null;

  const year = today.getFullYear();
  const month = today.getMonth();
  const loggedIds = new Set(
    records.filter((r) => r.dueYear === year && r.dueMonth === month).map((r) => r.debtId),
  );

  let logged = 0;
  let notYetDue = 0;
  const missed: MissedPayment[] = [];
  for (const debt of active) {
    if (loggedIds.has(debt.id)) {
      logged += 1;
    } else if (isDebtPastDueThisMonth(debt, false, today)) {
      missed.push({ debtId: debt.id, minimumPayment: debt.minimumPayment });
    } else {
      notYetDue += 1;
    }
  }
  const missedMinimums = missed.reduce((sum, m) => sum + m.minimumPayment, 0);
  return { expected: active.length, logged, missed, missedMinimums, notYetDue };
}
```

- [ ] **Step 4: Run it and watch it pass.**

Run: `npx vitest run src/__tests__/lib/dashboard/paymentGap.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit.**

```bash
git add src/lib/dashboard/paymentGap.ts src/__tests__/lib/dashboard/paymentGap.test.ts
git commit -m "feat(dashboard): compute this month's payment gap" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Rate watch and strategy comparison

**Files:**
- Create: `src/lib/dashboard/rateWatch.ts`, `src/lib/dashboard/strategy.ts`
- Test: `src/__tests__/lib/dashboard/rateWatch.test.ts`, `src/__tests__/lib/dashboard/strategy.test.ts`

**Interfaces:**
- Consumes: `RateWatch`, `RateOpportunity`, `StrategyComparison` (Task 3); `estimateAnnualSavings` (Task 2); `computeRateTargets` and `isNegotiableCard` from the APR adapter; `calculateResultForAcceleration`, `PlanMetrics` and `PayoffIncomeInput` from `@/lib/payoffPlan`.
- Produces:
  - `computeRateWatch(debts: ReadonlyArray<Pick<Debt, 'id' | 'name' | 'category' | 'balance' | 'interestRate'>>): RateWatch | null`
  - `computeStrategyComparison(debts: Debt[], income: PayoffIncomeInput, metrics: PlanMetrics, planStartDate?: Date): StrategyComparison | null`

- [ ] **Step 1: Write the failing tests.**

```ts
// src/__tests__/lib/dashboard/rateWatch.test.ts
import { describe, it, expect } from 'vitest';
import { computeRateWatch } from '@/lib/dashboard/rateWatch';
import { makeDebt } from './fixtures';

describe('computeRateWatch (spec §5.1, deviation X10)', () => {
  it('sums the APR-negotiation estimate over active cards above their target', () => {
    const r = computeRateWatch([
      makeDebt({ id: 'A', balance: 5000, minimumPayment: 100, interestRate: 24.99 }), // target 17.49 → 375
      makeDebt({ id: 'B', balance: 2000, minimumPayment: 50, interestRate: 29.99 }), // target 20.99 → 180
      makeDebt({ id: 'C', balance: 1000, minimumPayment: 25, interestRate: 9 }), // target = current → 0
      makeDebt({ id: 'D', balance: 10000, minimumPayment: 300, interestRate: 7, category: 'Auto Loan' }), // not a card
      makeDebt({ id: 'E', balance: 0, minimumPayment: 0, interestRate: 27 }), // paid off
    ]);
    expect(r).toEqual({
      cards: 2,
      annualEstimate: 555,
      top: { debtId: 'B', debtName: 'B', apr: 29.99, targetApr: 20.99, annualEstimate: 180 },
    });
  });

  it('is null when nothing can be negotiated', () => {
    expect(computeRateWatch([])).toBeNull();
    expect(computeRateWatch([makeDebt({ id: 'C', balance: 1000, minimumPayment: 25, interestRate: 9 })])).toBeNull();
  });
});
```

```ts
// src/__tests__/lib/dashboard/strategy.test.ts
import { describe, it, expect } from 'vitest';
import { calculatePlanMetrics, calculateResultForAcceleration } from '@/lib/payoffPlan';
import { computeStrategyComparison } from '@/lib/dashboard/strategy';
import { makeDebt, makeIncome } from './fixtures';

// Snowball pays the small low-APR debt first; avalanche pays the high-APR one first.
const DEBTS = [
  makeDebt({ id: 'small', balance: 1000, minimumPayment: 30, interestRate: 5 }),
  makeDebt({ id: 'big', balance: 3000, minimumPayment: 60, interestRate: 25 }),
];

describe('computeStrategyComparison (mirrors PayoffTab.tsx:258-270)', () => {
  it('compares snowball against avalanche with the same acceleration', () => {
    const income = makeIncome({ monthlyTakeHome: 3000, essentialExpenses: 2400, payoffMethod: 'snowball' });
    const metrics = calculatePlanMetrics(DEBTS, income, [])!;
    const legacyAlt = calculateResultForAcceleration(DEBTS, income, metrics, metrics.effectiveAcceleration, 'avalanche');
    const s = computeStrategyComparison(DEBTS, income, metrics)!;
    expect(s.current).toBe('snowball');
    expect(s.alternative).toBe('avalanche');
    expect(s.currentInterest).toBe(metrics.result.totalInterestPaid);
    expect(s.alternativeInterest).toBe(legacyAlt.totalInterestPaid);
    expect(s.alternativeSaves).toBe(Math.max(0, metrics.result.totalInterestPaid - legacyAlt.totalInterestPaid));
    expect(s.alternativeSaves).toBeGreaterThan(0);
  });

  it('compares avalanche against snowball, never reporting a negative saving', () => {
    const income = makeIncome({ monthlyTakeHome: 3000, essentialExpenses: 2400, payoffMethod: 'avalanche' });
    const metrics = calculatePlanMetrics(DEBTS, income, [])!;
    const s = computeStrategyComparison(DEBTS, income, metrics)!;
    expect(s.alternative).toBe('snowball');
    expect(s.alternativeSaves).toBe(0);
  });

  it('skips custom ordering and empty plans, like PayoffTab', () => {
    const income = makeIncome({ monthlyTakeHome: 3000, essentialExpenses: 2400, payoffMethod: 'custom' });
    expect(computeStrategyComparison(DEBTS, income, calculatePlanMetrics(DEBTS, income, [])!)).toBeNull();
    const paidOff = [makeDebt({ id: 'z', balance: 0, minimumPayment: 0 })];
    const snow = makeIncome({ payoffMethod: 'snowball' });
    expect(computeStrategyComparison(paidOff, snow, calculatePlanMetrics(paidOff, snow, [])!)).toBeNull();
  });
});
```

- [ ] **Step 2: Run them and watch them fail.**

Run: `npx vitest run src/__tests__/lib/dashboard/rateWatch.test.ts src/__tests__/lib/dashboard/strategy.test.ts`
Expected: FAIL (the modules don't resolve).

- [ ] **Step 3: Implement both modules.**

```ts
// src/lib/dashboard/rateWatch.ts
import type { Debt } from '@/types';
import { isActiveDebt } from '@/lib/monthlyFocusDebt';
import {
  computeRateTargets,
  estimateAnnualSavings,
  isNegotiableCard,
} from '@/lib/apr-negotiation/apr-negotiation-adapter';
import type { RateOpportunity, RateWatch } from './types';

/**
 * Estimated yearly interest recoverable if each active credit card drops to
 * its APR-negotiation target (≈30% lower, floor 9.99%). The same estimate the
 * APR card shows, so it is labelled "est." wherever it appears.
 */
export function computeRateWatch(
  debts: ReadonlyArray<Pick<Debt, 'id' | 'name' | 'category' | 'balance' | 'interestRate'>>,
): RateWatch | null {
  const opportunities: RateOpportunity[] = debts
    .filter((d) => isActiveDebt(d) && isNegotiableCard(d))
    .map((d) => {
      const targetApr = Number(computeRateTargets(d.interestRate).targetApr);
      return {
        debtId: d.id,
        debtName: d.name,
        apr: d.interestRate,
        targetApr,
        annualEstimate: estimateAnnualSavings(d.balance, d.interestRate, targetApr) ?? 0,
      };
    })
    .filter((o) => o.annualEstimate > 0)
    .sort((a, b) => b.apr - a.apr);

  if (opportunities.length === 0) return null;
  return {
    cards: opportunities.length,
    annualEstimate: opportunities.reduce((sum, o) => sum + o.annualEstimate, 0),
    top: opportunities[0],
  };
}
```

```ts
// src/lib/dashboard/strategy.ts
import type { Debt } from '@/types';
import {
  calculateResultForAcceleration,
  type PayoffIncomeInput,
  type PlanMetrics,
} from '@/lib/payoffPlan';
import type { StrategyComparison } from './types';

/**
 * Snowball vs avalanche on the same debts and acceleration, mirroring the My
 * Plan readout (PayoffTab.tsx:258-270): custom ordering has no counterpart,
 * and an empty plan has nothing to compare.
 */
export function computeStrategyComparison(
  debts: Debt[],
  income: PayoffIncomeInput,
  metrics: PlanMetrics,
  planStartDate?: Date,
): StrategyComparison | null {
  if (metrics.method === 'custom' || metrics.result.months === 0) return null;
  const current = metrics.method;
  const alternative = current === 'avalanche' ? 'snowball' : 'avalanche';
  const alt = calculateResultForAcceleration(
    debts,
    income,
    metrics,
    metrics.effectiveAcceleration,
    alternative,
    planStartDate,
  );
  const currentInterest = metrics.result.totalInterestPaid;
  return {
    current,
    currentInterest,
    alternative,
    alternativeInterest: alt.totalInterestPaid,
    alternativeSaves: Math.max(0, currentInterest - alt.totalInterestPaid),
  };
}
```

- [ ] **Step 4: Run them and watch them pass.**

Run: `npx vitest run src/__tests__/lib/dashboard/rateWatch.test.ts src/__tests__/lib/dashboard/strategy.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add src/lib/dashboard/rateWatch.ts src/lib/dashboard/strategy.ts src/__tests__/lib/dashboard/rateWatch.test.ts src/__tests__/lib/dashboard/strategy.test.ts
git commit -m "feat(dashboard): compute rate watch and strategy comparison" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Streak grid

**Files:**
- Create: `src/lib/dashboard/streakGrid.ts`
- Test: `src/__tests__/lib/dashboard/streakGrid.test.ts`

**Interfaces:**
- Consumes: `StreakCell`, `PaymentGap` (Task 3).
- Produces:
  - `snapshotMonthSet(snapshots: ReadonlyArray<{ recordedAt: string }>): Set<string>` ("YYYY-MM" keys)
  - `computeStreakGrid(snapshotMonths: ReadonlySet<string>, gap: PaymentGap | null, today: Date): StreakCell[]` (always 12 cells: 8 past, the current month, 3 future)

- [ ] **Step 1: Write the failing test.**

```ts
// src/__tests__/lib/dashboard/streakGrid.test.ts
import { describe, it, expect } from 'vitest';
import { computeStreakGrid, snapshotMonthSet } from '@/lib/dashboard/streakGrid';
import { makeSnapshot } from './fixtures';

const TODAY = new Date(2026, 8, 12); // Sep 2026
const gap = (logged: number, expected: number) => ({ expected, logged, missed: [], missedMinimums: 0, notYetDue: expected - logged });
const months = (...ym: string[]) => new Set(ym);

describe('computeStreakGrid (spec §5.1, D10)', () => {
  it('lays out 8 past months, the current month and 3 future months', () => {
    const cells = computeStreakGrid(months('2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'), gap(3, 9), TODAY);
    expect(cells.map((c) => c.month)).toEqual([
      '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08',
      '2026-09', '2026-10', '2026-11', '2026-12',
    ]);
    expect(cells.map((c) => c.state)).toEqual([
      'inactive', 'logged', 'logged', 'logged', 'logged', 'logged', 'logged', 'logged',
      'current', 'future', 'future', 'future',
    ]);
  });

  it('marks a past month with no snapshot after the first one as missed', () => {
    const cells = computeStreakGrid(months('2026-05', '2026-06', '2026-08'), gap(9, 9), TODAY);
    expect(cells.find((c) => c.month === '2026-07')?.state).toBe('missed');
    expect(cells.find((c) => c.month === '2026-04')?.state).toBe('inactive');
  });

  it('never marks the current month red: amber while unlogged, complete when all are logged', () => {
    expect(computeStreakGrid(months('2026-08'), gap(3, 9), TODAY)[8].state).toBe('current');
    expect(computeStreakGrid(months('2026-08'), gap(9, 9), TODAY)[8].state).toBe('currentComplete');
    expect(computeStreakGrid(months('2026-08'), null, TODAY)[8].state).toBe('currentComplete');
  });

  it('shows every past month as inactive when there are no snapshots', () => {
    expect(computeStreakGrid(new Set(), gap(0, 3), TODAY).slice(0, 8).every((c) => c.state === 'inactive')).toBe(true);
  });

  it('crosses year boundaries', () => {
    const cells = computeStreakGrid(months('2025-12'), gap(1, 1), new Date(2026, 1, 3)); // Feb 2026
    expect(cells[0].month).toBe('2025-06');
    expect(cells[8].month).toBe('2026-02');
    expect(cells[11].month).toBe('2026-05');
  });

  it('builds the month set from snapshot dates', () => {
    expect(snapshotMonthSet([makeSnapshot('a', '2026-07', 1), makeSnapshot('b', '2026-07', 2), makeSnapshot('a', '2026-08', 1)]))
      .toEqual(new Set(['2026-07', '2026-08']));
  });
});
```

- [ ] **Step 2: Run it and watch it fail.**

Run: `npx vitest run src/__tests__/lib/dashboard/streakGrid.test.ts`
Expected: FAIL with "Failed to resolve import '@/lib/dashboard/streakGrid'".

- [ ] **Step 3: Implement `src/lib/dashboard/streakGrid.ts`.**

```ts
import type { PaymentGap, StreakCell, StreakCellState } from './types';

const PAST_MONTHS = 8;
const FUTURE_MONTHS = 3;

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** "YYYY-MM" keys of every month with a balance snapshot (same source as the Progress streak). */
export function snapshotMonthSet(snapshots: ReadonlyArray<{ recordedAt: string }>): Set<string> {
  return new Set(snapshots.map((s) => s.recordedAt.slice(0, 7)));
}

/**
 * The Progress streak grid (spec §5.1, D10). Past months before the user's
 * first snapshot are "inactive", not "missed": they predate the plan. The
 * current month is never red: amber while any active debt is unlogged,
 * complete once all are logged. Red is only for a finished month with no
 * activity after the user started.
 */
export function computeStreakGrid(
  snapshotMonths: ReadonlySet<string>,
  gap: PaymentGap | null,
  today: Date,
): StreakCell[] {
  const firstMonth = [...snapshotMonths].sort()[0];
  const cells: StreakCell[] = [];
  for (let offset = -PAST_MONTHS; offset <= FUTURE_MONTHS; offset += 1) {
    const key = monthKey(new Date(today.getFullYear(), today.getMonth() + offset, 1));
    let state: StreakCellState;
    if (offset > 0) state = 'future';
    else if (offset === 0) state = gap && gap.logged < gap.expected ? 'current' : 'currentComplete';
    else if (!firstMonth || key < firstMonth) state = 'inactive';
    else state = snapshotMonths.has(key) ? 'logged' : 'missed';
    cells.push({ month: key, state });
  }
  return cells;
}
```

- [ ] **Step 4: Run it and watch it pass.**

Run: `npx vitest run src/__tests__/lib/dashboard/streakGrid.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit.**

```bash
git add src/lib/dashboard/streakGrid.ts src/__tests__/lib/dashboard/streakGrid.test.ts
git commit -m "feat(dashboard): compute the 12-month streak grid" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: Rule-based coach moves and their copy

**Files:**
- Modify: `src/lib/snowball.ts:47` (`const MAX_MONTHS` → `export const MAX_MONTHS`)
- Create: `src/lib/dashboard/coachMoves.ts`, `src/lib/dashboard/coachMoveCopy.ts`
- Test: `src/__tests__/lib/dashboard/coachMoves.test.ts`, `src/__tests__/lib/dashboard/coachMoveCopy.test.ts`

**Interfaces:**
- Consumes: `CoachMove`, `PaymentGap`, `RateWatch`, `StrategyComparison` (Task 3); `calculatePlanMetrics`, `calculateResultForAcceleration`, `PlanMetrics`, `PayoffIncomeInput`; `formatCurrency`, `formatCurrencyWhole`, `formatMonths`; `formatRate`.
- Produces:
  - `interface CoachMovesInput { paymentGap: PaymentGap | null; monthLabel: string; debts: Debt[]; income: PayoffIncomeInput | null; metrics: PlanMetrics | null; strategy: StrategyComparison | null; rateWatch: RateWatch | null; proEligible: boolean; planStartDate?: Date }`
  - `computeCoachMoves(input: CoachMovesInput): CoachMove[]`. Ranked; the first is free on Free; all are free on Pro.
  - `interface MoveValueSummary { count: number; perYear: number; oneTime: number; monthsSooner: number }`
  - `summarizeMoveValues(moves: ReadonlyArray<CoachMove>): MoveValueSummary`. Per-year and one-time are kept apart (X7). `monthsSooner` is the **max**, because months from different moves don't add.
  - `interface CoachMoveCopy { title: string; body: string; valueLabel: string | null }`
  - `coachMoveCopy(move: CoachMove): CoachMoveCopy`

- [ ] **Step 1: Write the failing tests.**

```ts
// src/__tests__/lib/dashboard/coachMoves.test.ts
import { describe, it, expect } from 'vitest';
import { calculatePlanMetrics, calculateResultForAcceleration } from '@/lib/payoffPlan';
import { computeCoachMoves, summarizeMoveValues } from '@/lib/dashboard/coachMoves';
import type { PaymentGap, RateWatch, StrategyComparison } from '@/lib/dashboard/types';
import { makeDebt, makeIncome } from './fixtures';

const DEBTS = [
  makeDebt({ id: 'a', balance: 1000, minimumPayment: 30, interestRate: 5 }),
  makeDebt({ id: 'b', balance: 3000, minimumPayment: 60, interestRate: 25 }),
];
// Take-home 3000 − essentials 2000 − minimums 90 = 910 available; planned extra is only 100.
const INCOME = makeIncome({ monthlyTakeHome: 3000, essentialExpenses: 2000, accelerationAmount: 100 });
const METRICS = calculatePlanMetrics(DEBTS, INCOME, [])!;
const GAP: PaymentGap = { expected: 9, logged: 3, missed: [{ debtId: 'a', minimumPayment: 30 }], missedMinimums: 30, notYetDue: 5 };
const STRATEGY: StrategyComparison = { current: 'snowball', currentInterest: 900, alternative: 'avalanche', alternativeInterest: 700, alternativeSaves: 200 };
const RATES: RateWatch = { cards: 1, annualEstimate: 300, top: { debtId: 'b', debtName: 'b', apr: 25, targetApr: 17.5, annualEstimate: 300 } };

const base = { paymentGap: GAP, monthLabel: 'Sep', debts: DEBTS, income: INCOME, metrics: METRICS, strategy: STRATEGY, rateWatch: RATES };

describe('computeCoachMoves (spec §5.1, D2)', () => {
  it('ranks log → unused cash → strategy → APR, and frees only the first move on Free', () => {
    const moves = computeCoachMoves({ ...base, proEligible: false });
    expect(moves.map((m) => [m.id, m.isFree])).toEqual([
      ['log_missed', true],
      ['use_unallocated', false],
      ['switch_strategy', false],
      ['call_apr', false],
    ]);
  });

  it('frees every move for Pro and trial users', () => {
    expect(computeCoachMoves({ ...base, proEligible: true }).every((m) => m.isFree)).toBe(true);
  });

  it('values "unused cash" with the engine, raising acceleration to available cash flow', () => {
    const faster = calculateResultForAcceleration(DEBTS, INCOME, METRICS, METRICS.availableCashFlow);
    const move = computeCoachMoves({ ...base, proEligible: false }).find((m) => m.id === 'use_unallocated');
    expect(move?.value).toEqual({ kind: 'months', amount: METRICS.result.months - faster.months });
    expect(move?.facts).toEqual({
      unusedMonthly: METRICS.availableCashFlow - METRICS.effectiveAcceleration,
      targetAcceleration: METRICS.availableCashFlow,
      monthsSooner: METRICS.result.months - faster.months,
    });
  });

  it('emits no move without a real value (hide, never zero)', () => {
    const allUsed = makeIncome({ monthlyTakeHome: 3000, essentialExpenses: 2000, accelerationAmount: null });
    const moves = computeCoachMoves({
      ...base,
      paymentGap: { ...GAP, missed: [], missedMinimums: 0 },
      income: allUsed,
      metrics: calculatePlanMetrics(DEBTS, allUsed, [])!,
      strategy: { ...STRATEGY, alternativeSaves: 0 },
      rateWatch: null,
      proEligible: false,
    });
    expect(moves).toEqual([]);
  });

  it('skips "unused cash" when the plan is stuck at the 360-month cap', () => {
    const broke = makeIncome({ monthlyTakeHome: 90, essentialExpenses: 0, accelerationAmount: 0 });
    const stuck = [makeDebt({ id: 'x', balance: 50_000, minimumPayment: 90, interestRate: 29 })];
    const metrics = calculatePlanMetrics(stuck, broke, [])!;
    const moves = computeCoachMoves({ ...base, debts: stuck, income: broke, metrics, paymentGap: null, strategy: null, rateWatch: null, proEligible: false });
    expect(moves.find((m) => m.id === 'use_unallocated')).toBeUndefined();
  });
});

describe('summarizeMoveValues (deviation X7)', () => {
  it('keeps per-year and one-time savings apart and never adds months', () => {
    const moves = computeCoachMoves({ ...base, proEligible: false });
    const unused = moves.find((m) => m.id === 'use_unallocated')!;
    expect(summarizeMoveValues(moves)).toEqual({
      count: 4,
      perYear: 300,
      oneTime: 200,
      monthsSooner: unused.value.amount,
    });
    expect(summarizeMoveValues([])).toEqual({ count: 0, perYear: 0, oneTime: 0, monthsSooner: 0 });
  });
});
```

```ts
// src/__tests__/lib/dashboard/coachMoveCopy.test.ts
import { describe, it, expect } from 'vitest';
import { coachMoveCopy } from '@/lib/dashboard/coachMoveCopy';

describe('coachMoveCopy (spec §8.4): facts only, losses and savings floored', () => {
  it('log_missed', () => {
    expect(coachMoveCopy({
      id: 'log_missed', priority: 'high', isFree: true, value: { kind: 'count', amount: 6 },
      facts: { monthLabel: 'Sep', logged: 3, expected: 9, missedCount: 6, missedMinimums: 1674 },
    })).toEqual({
      title: 'Log the 6 payments Sep is missing.',
      body: 'Sep shows 3 of 9 payments logged; 6 are past their due date — $1,674.00 in minimums.',
      valueLabel: null,
    });
  });

  it('log_missed (singular)', () => {
    expect(coachMoveCopy({
      id: 'log_missed', priority: 'high', isFree: true, value: { kind: 'count', amount: 1 },
      facts: { monthLabel: 'Oct', logged: 4, expected: 5, missedCount: 1, missedMinimums: 35 },
    }).title).toBe('Log the 1 payment Oct is missing.');
  });

  it('use_unallocated', () => {
    expect(coachMoveCopy({
      id: 'use_unallocated', priority: 'high', isFree: false, value: { kind: 'months', amount: 14 },
      facts: { unusedMonthly: 810.9, targetAcceleration: 910, monthsSooner: 14 },
    })).toEqual({
      title: 'Put $810/mo of unused cash to work.',
      body: "It's left after essentials, minimums and your planned extra. Applying it finishes 1y 2m sooner.",
      valueLabel: '1y 2m sooner',
    });
  });

  it('switch_strategy', () => {
    expect(coachMoveCopy({
      id: 'switch_strategy', priority: 'medium', isFree: false, value: { kind: 'total', amount: 1030.99 },
      facts: { alternative: 'avalanche', interestDifference: 1030.99 },
    })).toEqual({
      title: 'Switch to Avalanche — $1,030 less interest.',
      body: 'Same payments, different order. Switching is free and recalculates the whole plan.',
      valueLabel: '$1,030',
    });
  });

  it('call_apr', () => {
    expect(coachMoveCopy({
      id: 'call_apr', priority: 'medium', isFree: false, value: { kind: 'perYear', amount: 742 },
      facts: { debtId: 'd1', debtName: 'Citi Simplicity', apr: 28.24, targetApr: 19.77, annualEstimate: 742 },
    })).toEqual({
      title: 'Call Citi Simplicity about its 28.24% APR',
      body: 'Asking for 19.77% could save about $742 a year.',
      valueLabel: '$742/yr est.',
    });
  });
});
```

- [ ] **Step 2: Run them and watch them fail.**

Run: `npx vitest run src/__tests__/lib/dashboard/coachMoves.test.ts src/__tests__/lib/dashboard/coachMoveCopy.test.ts`
Expected: FAIL (the modules don't resolve).

- [ ] **Step 3: Export the engine cap.** In `src/lib/snowball.ts` line 47, change `const MAX_MONTHS = 360;` to `export const MAX_MONTHS = 360;`.

- [ ] **Step 4: Implement `src/lib/dashboard/coachMoves.ts`.**

```ts
import type { Debt } from '@/types';
import { MAX_MONTHS } from '@/lib/snowball';
import {
  calculateResultForAcceleration,
  type PayoffIncomeInput,
  type PlanMetrics,
} from '@/lib/payoffPlan';
import type { CoachMove, PaymentGap, RateWatch, StrategyComparison } from './types';

export interface CoachMovesInput {
  paymentGap: PaymentGap | null;
  /** Short month name for copy, e.g. "Sep". */
  monthLabel: string;
  debts: Debt[];
  income: PayoffIncomeInput | null;
  metrics: PlanMetrics | null;
  strategy: StrategyComparison | null;
  rateWatch: RateWatch | null;
  proEligible: boolean;
  planStartDate?: Date;
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type DraftMove = DistributiveOmit<CoachMove, 'isFree'>;

/**
 * Deterministic coach moves (D2). Each rule emits a move only when its value
 * is real and positive, so a hidden move never becomes a "$0" row. Order is
 * the ranking: the first move is the one Free users get in full (README §1d).
 */
export function computeCoachMoves(input: CoachMovesInput): CoachMove[] {
  const drafts: DraftMove[] = [];

  const gap = input.paymentGap;
  if (gap && gap.missed.length > 0) {
    drafts.push({
      id: 'log_missed',
      priority: 'high',
      value: { kind: 'count', amount: gap.missed.length },
      facts: {
        monthLabel: input.monthLabel,
        logged: gap.logged,
        expected: gap.expected,
        missedCount: gap.missed.length,
        missedMinimums: gap.missedMinimums,
      },
    });
  }

  const m = input.metrics;
  if (m && input.income && m.result.months > 0 && m.result.months < MAX_MONTHS) {
    const unusedMonthly = m.availableCashFlow - m.effectiveAcceleration;
    if (unusedMonthly >= 1) {
      const faster = calculateResultForAcceleration(
        input.debts, input.income, m, m.availableCashFlow, m.method, input.planStartDate,
      );
      const monthsSooner = m.result.months - faster.months;
      if (monthsSooner >= 1) {
        drafts.push({
          id: 'use_unallocated',
          priority: 'high',
          value: { kind: 'months', amount: monthsSooner },
          facts: { unusedMonthly, targetAcceleration: m.availableCashFlow, monthsSooner },
        });
      }
    }
  }

  const s = input.strategy;
  if (s && s.alternativeSaves >= 1) {
    drafts.push({
      id: 'switch_strategy',
      priority: 'medium',
      value: { kind: 'total', amount: s.alternativeSaves },
      facts: { alternative: s.alternative, interestDifference: s.alternativeSaves },
    });
  }

  const top = input.rateWatch?.top;
  if (top && top.annualEstimate >= 1) {
    drafts.push({
      id: 'call_apr',
      priority: 'medium',
      value: { kind: 'perYear', amount: top.annualEstimate },
      facts: top,
    });
  }

  return drafts.map((draft, index) => ({ ...draft, isFree: input.proEligible || index === 0 }) as CoachMove);
}

export interface MoveValueSummary {
  count: number;
  perYear: number;
  oneTime: number;
  monthsSooner: number;
}

/** Values for the Coach closing card. Units never mix (deviation X7). */
export function summarizeMoveValues(moves: ReadonlyArray<CoachMove>): MoveValueSummary {
  const summary: MoveValueSummary = { count: moves.length, perYear: 0, oneTime: 0, monthsSooner: 0 };
  for (const move of moves) {
    if (move.value.kind === 'perYear') summary.perYear += move.value.amount;
    else if (move.value.kind === 'total') summary.oneTime += move.value.amount;
    else if (move.value.kind === 'months') summary.monthsSooner = Math.max(summary.monthsSooner, move.value.amount);
  }
  return summary;
}
```

- [ ] **Step 5: Implement `src/lib/dashboard/coachMoveCopy.ts`.**

```ts
import { formatCurrency, formatCurrencyWhole, formatMonths } from '@/lib/utils';
import { formatRate } from '@/lib/apr-negotiation/apr-negotiation-adapter';
import type { CoachMove } from './types';

export interface CoachMoveCopy {
  title: string;
  body: string;
  valueLabel: string | null;
}

/** Estimates are floored, never rounded up (spec §4). */
const floorWhole = (n: number) => formatCurrencyWhole(Math.floor(n));
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
const METHOD_LABEL = { snowball: 'Snowball', avalanche: 'Avalanche' } as const;

/** One source of move copy for web and Expo. Every sentence states computed facts only. */
export function coachMoveCopy(move: CoachMove): CoachMoveCopy {
  switch (move.id) {
    case 'log_missed': {
      const f = move.facts;
      const n = f.missedCount;
      return {
        title: `Log the ${n} ${plural(n, 'payment', 'payments')} ${f.monthLabel} is missing.`,
        body: `${f.monthLabel} shows ${f.logged} of ${f.expected} payments logged; ${n} ${plural(n, 'is', 'are')} past ${plural(n, 'its', 'their')} due date — ${formatCurrency(f.missedMinimums)} in minimums.`,
        valueLabel: null,
      };
    }
    case 'use_unallocated': {
      const f = move.facts;
      return {
        title: `Put ${floorWhole(f.unusedMonthly)}/mo of unused cash to work.`,
        body: `It's left after essentials, minimums and your planned extra. Applying it finishes ${formatMonths(f.monthsSooner)} sooner.`,
        valueLabel: `${formatMonths(f.monthsSooner)} sooner`,
      };
    }
    case 'switch_strategy': {
      const f = move.facts;
      return {
        title: `Switch to ${METHOD_LABEL[f.alternative]} — ${floorWhole(f.interestDifference)} less interest.`,
        body: 'Same payments, different order. Switching is free and recalculates the whole plan.',
        valueLabel: floorWhole(f.interestDifference),
      };
    }
    case 'call_apr': {
      const f = move.facts;
      return {
        title: `Call ${f.debtName} about its ${formatRate(f.apr)}% APR`,
        body: `Asking for ${formatRate(f.targetApr)}% could save about ${floorWhole(f.annualEstimate)} a year.`,
        valueLabel: `${floorWhole(f.annualEstimate)}/yr est.`,
      };
    }
  }
}
```

- [ ] **Step 6: Run them and watch them pass,** then run the whole suite (the `MAX_MONTHS` export must not break anything).

Run: `npx vitest run src/__tests__/lib/dashboard/coachMoves.test.ts src/__tests__/lib/dashboard/coachMoveCopy.test.ts`
Expected: PASS.
Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit.**

```bash
git add src/lib/snowball.ts src/lib/dashboard/coachMoves.ts src/lib/dashboard/coachMoveCopy.ts src/__tests__/lib/dashboard/coachMoves.test.ts src/__tests__/lib/dashboard/coachMoveCopy.test.ts
git commit -m "feat(dashboard): rule-based coach moves with fact-only copy" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 11: Pure insights assembler

**Files:**
- Modify: `src/lib/hooks/useActualBalanceMap.ts:24` (widen the parameter type only)
- Create: `src/lib/dashboard/buildInsights.ts`
- Test: `src/__tests__/lib/dashboard/buildInsights.test.ts`

**Interfaces:**
- Consumes: every function from Tasks 3–10, plus `computeActualBalanceTotals`.
- Produces:
  - `interface InsightsInput { debts: Debt[]; income: Income | null; expenses: ReadonlyArray<{ amount: number }>; monthRecords: ReadonlyArray<PaymentRecordLike>; hasAnyPayment: boolean; snapshots: ReadonlyArray<Pick<BalanceSnapshot, 'debtId' | 'balance' | 'recordedAt'>>; tier: TierInfo; today: Date }`
  - `buildDashboardInsights(input: InsightsInput): DashboardInsights`. `asOf.month` is 0-11.

- [ ] **Step 1: Write the failing test.**

```ts
// src/__tests__/lib/dashboard/buildInsights.test.ts
import { describe, it, expect } from 'vitest';
import { calculatePlanMetrics } from '@/lib/payoffPlan';
import { buildDashboardInsights, type InsightsInput } from '@/lib/dashboard/buildInsights';
import { computeProgressStreak, computeProgressTotals } from '@/lib/dashboard/progress';
import { makeDebt, makeIncome, makeSnapshot } from './fixtures';

const TODAY = new Date(2026, 8, 12);
const DEBTS = [
  makeDebt({ id: 'a', balance: 800, originalBalance: 1000, minimumPayment: 30, interestRate: 5, dueDate: 5 }),
  makeDebt({ id: 'b', balance: 3000, minimumPayment: 60, interestRate: 25, dueDate: 10 }),
  makeDebt({ id: 'c', balance: 2000, minimumPayment: 40, interestRate: 18 }),
];
const INCOME = makeIncome({ monthlyTakeHome: 3000, essentialExpenses: 2000, accelerationAmount: 100 });
const FREE = { proEligible: false, paidPro: false, trial: { active: false, endsAt: null } };

function input(overrides: Partial<InsightsInput> = {}): InsightsInput {
  return {
    debts: DEBTS,
    income: INCOME,
    expenses: [{ amount: 50 }],
    monthRecords: [{ debtId: 'a', dueYear: 2026, dueMonth: 8 }],
    hasAnyPayment: true,
    snapshots: [makeSnapshot('a', '2026-08', 900), makeSnapshot('a', '2026-09', 800)],
    tier: FREE,
    today: TODAY,
    ...overrides,
  };
}

describe('buildDashboardInsights', () => {
  it('keeps plan numbers identical to calculatePlanMetrics (planStartDate only moves labels)', () => {
    const plain = calculatePlanMetrics(DEBTS, INCOME, [{ amount: 50 }])!;
    const out = buildDashboardInsights(input());
    expect(out.plan).toEqual({
      method: 'snowball',
      months: plain.result.months,
      debtFreeDate: expect.any(String),
      totalInterest: plain.result.totalInterestPaid,
    });
  });

  it('assembles every figure', () => {
    const out = buildDashboardInsights(input());
    expect(out.asOf).toEqual({ year: 2026, month: 8, day: 12 });
    expect(out.tier).toEqual(FREE);
    expect(out.readiness.completeCount).toBe(4); // debts, income, expenses, first payment; c has no due day
    expect(out.paymentGap).toMatchObject({ expected: 3, logged: 1, missed: [{ debtId: 'b', minimumPayment: 60 }] });
    expect(out.interest?.monthlyEstimate).toBeGreaterThan(0);
    expect(out.rateWatch?.top.debtId).toBe('b');
    expect(out.strategy?.alternative).toBe('avalanche');
    expect(out.coachMoves[0].id).toBe('log_missed');
    expect(out.coachMoves[0].isFree).toBe(true);
    expect(out.coachMoves.slice(1).every((m) => !m.isFree)).toBe(true);
    expect(out.progress).toMatchObject({
      paidToDate: computeProgressTotals(DEBTS).totalPaid,
      startingTotal: computeProgressTotals(DEBTS).originalTotal,
      streak: computeProgressStreak(input().snapshots),
    });
    expect(out.progress?.grid).toHaveLength(12);
    expect(out.planGap?.asOfMonth).toBe('Sep 2026');
  });

  it('hides plan-derived figures without income, and progress without debts', () => {
    const noIncome = buildDashboardInsights(input({ income: null }));
    expect(noIncome.plan).toBeNull();
    expect(noIncome.strategy).toBeNull();
    expect(noIncome.planGap).toBeNull();
    const empty = buildDashboardInsights(input({ debts: [], snapshots: [], monthRecords: [] }));
    expect(empty.progress).toBeNull();
    expect(empty.paymentGap).toBeNull();
    expect(empty.interest).toBeNull();
    expect(empty.coachMoves).toEqual([]);
  });

  it('frees every move for Pro', () => {
    const pro = buildDashboardInsights(input({ tier: { ...FREE, proEligible: true, paidPro: true } }));
    expect(pro.coachMoves.every((m) => m.isFree)).toBe(true);
  });
});
```

- [ ] **Step 2: Run it and watch it fail.**

Run: `npx vitest run src/__tests__/lib/dashboard/buildInsights.test.ts`
Expected: FAIL with "Failed to resolve import '@/lib/dashboard/buildInsights'".

- [ ] **Step 3: Widen `computeActualBalanceTotals`.** This is a type-only change; the function reads nothing else. In `src/lib/hooks/useActualBalanceMap.ts` line 24:

```ts
export function computeActualBalanceTotals(
  snapshots: ReadonlyArray<Pick<BalanceSnapshot, 'debtId' | 'balance' | 'recordedAt'>>,
): ActualBalanceMonth[] {
```

- [ ] **Step 4: Implement `src/lib/dashboard/buildInsights.ts`.**

```ts
import type { BalanceSnapshot, Debt, Income } from '@/types';
import { calculateMinimumsOnlyResult, calculatePlanMetrics } from '@/lib/payoffPlan';
import { computeActualBalanceTotals } from '@/lib/hooks/useActualBalanceMap';
import { computeCoachMoves } from './coachMoves';
import { computeMonthlyInterest } from './interest';
import { computePaymentGap, type PaymentRecordLike } from './paymentGap';
import { buildBalanceChartData, computePlanGap } from './planGap';
import { computeProgressStreak, computeProgressTotals } from './progress';
import { computeRateWatch } from './rateWatch';
import { computePlanReadiness } from './readiness';
import { computeStrategyComparison } from './strategy';
import { computeStreakGrid, snapshotMonthSet } from './streakGrid';
import type { DashboardInsights, ProgressSummary, TierInfo } from './types';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface InsightsInput {
  debts: Debt[];
  income: Income | null;
  expenses: ReadonlyArray<{ amount: number }>;
  /** Records for today's year/month only. */
  monthRecords: ReadonlyArray<PaymentRecordLike>;
  hasAnyPayment: boolean;
  snapshots: ReadonlyArray<Pick<BalanceSnapshot, 'debtId' | 'balance' | 'recordedAt'>>;
  tier: TierInfo;
  /** The client's local date (validated by the route). */
  today: Date;
}

/**
 * Every dashboard figure from one set of inputs. Pure: no I/O, so the route,
 * tests and (later) Expo all get identical numbers. planStartDate = today
 * only aligns the engine's month labels with the client; months and interest
 * don't depend on it.
 */
export function buildDashboardInsights(input: InsightsInput): DashboardInsights {
  const { debts, income, today, tier } = input;
  const planStartDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const expenses = input.expenses.map((e) => ({ amount: e.amount }));

  const metrics = calculatePlanMetrics(debts, income, expenses, { planStartDate });
  const minimums = debts.length > 0 ? calculateMinimumsOnlyResult(debts, planStartDate) : null;

  const readiness = computePlanReadiness({
    debts,
    income,
    recurringExpenseCount: input.expenses.filter((e) => e.amount > 0).length,
    hasAnyPayment: input.hasAnyPayment,
  });
  const interest = computeMonthlyInterest(debts, metrics?.result ?? null, minimums);
  const paymentGap = computePaymentGap(debts, input.monthRecords, today);
  const strategy = metrics && income ? computeStrategyComparison(debts, income, metrics, planStartDate) : null;
  const rateWatch = computeRateWatch(debts);
  const coachMoves = computeCoachMoves({
    paymentGap,
    monthLabel: MONTH_SHORT[today.getMonth()],
    debts,
    income,
    metrics,
    strategy,
    rateWatch,
    proEligible: tier.proEligible,
    planStartDate,
  });

  const actualBalanceMap = new Map(
    computeActualBalanceTotals(input.snapshots).map((m) => [m.label, m.total]),
  );
  const currentTotalDebt = debts.reduce((s, d) => s + (d.balance ?? 0), 0);
  const planGap = metrics
    ? computePlanGap(buildBalanceChartData(metrics.result, minimums, actualBalanceMap, currentTotalDebt))
    : null;

  let progress: ProgressSummary | null = null;
  if (debts.length > 0) {
    const totals = computeProgressTotals(debts);
    progress = {
      paidToDate: totals.totalPaid,
      startingTotal: totals.originalTotal,
      streak: computeProgressStreak(input.snapshots),
      grid: computeStreakGrid(snapshotMonthSet(input.snapshots), paymentGap, today),
    };
  }

  return {
    asOf: { year: today.getFullYear(), month: today.getMonth(), day: today.getDate() },
    tier,
    readiness,
    interest,
    paymentGap,
    coachMoves,
    rateWatch,
    strategy,
    planGap,
    progress,
    plan: metrics
      ? {
          method: metrics.method,
          months: metrics.result.months,
          debtFreeDate: metrics.result.debtFreeDate.toISOString(),
          totalInterest: metrics.result.totalInterestPaid,
        }
      : null,
  };
}
```

- [ ] **Step 5: Run it and watch it pass,** then run the whole suite.

Run: `npx vitest run src/__tests__/lib/dashboard/buildInsights.test.ts`
Expected: PASS (4 tests).
Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add src/lib/hooks/useActualBalanceMap.ts src/lib/dashboard/buildInsights.ts src/__tests__/lib/dashboard/buildInsights.test.ts
git commit -m "feat(dashboard): pure insights assembler" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 12: Feature flag and "today" helpers

**Files:**
- Create: `src/lib/flags.ts`, `src/lib/dashboard/today.ts`
- Test: `src/__tests__/lib/flags.test.ts`, `src/__tests__/lib/dashboard/today.test.ts`

**Interfaces:**
- Produces:
  - `isDashboardV2(email: string | null | undefined, raw?: string | undefined): boolean`. `raw` defaults to `process.env.DASHBOARD_V2_USERS`.
  - `localDateParam(d?: Date): string` (client, `YYYY-MM-DD` in local time)
  - `resolveToday(param: string | null, now?: Date): Date` (server). Returns a local-midnight Date. Falls back to the server's date when the param is missing, invalid, or more than 36h from the server's date.

- [ ] **Step 1: Write the failing tests.**

```ts
// src/__tests__/lib/flags.test.ts
import { describe, it, expect } from 'vitest';
import { isDashboardV2 } from '@/lib/flags';

describe('isDashboardV2 (spec §5.3)', () => {
  it('is off by default', () => {
    expect(isDashboardV2('owner@example.com', undefined)).toBe(false);
    expect(isDashboardV2('owner@example.com', '')).toBe(false);
  });
  it('matches listed emails case-insensitively, ignoring spaces', () => {
    expect(isDashboardV2('Owner@Example.com', ' owner@example.com , other@example.com ')).toBe(true);
    expect(isDashboardV2('someone@example.com', 'owner@example.com')).toBe(false);
  });
  it('turns on for everyone with "all"', () => {
    expect(isDashboardV2('anyone@example.com', 'all')).toBe(true);
    expect(isDashboardV2(null, 'owner@example.com,all')).toBe(true);
  });
  it('is off for a missing email unless "all"', () => {
    expect(isDashboardV2(undefined, 'owner@example.com')).toBe(false);
  });
});
```

```ts
// src/__tests__/lib/dashboard/today.test.ts
import { describe, it, expect } from 'vitest';
import { localDateParam, resolveToday } from '@/lib/dashboard/today';

const NOW = new Date(2026, 8, 12, 15, 30); // Sep 12 2026, 3:30pm local

describe('today helpers (spec §5.2)', () => {
  it('formats the local date', () => {
    expect(localDateParam(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
  it('accepts the client date within one day either side', () => {
    expect(resolveToday('2026-09-12', NOW)).toEqual(new Date(2026, 8, 12));
    expect(resolveToday('2026-09-11', NOW)).toEqual(new Date(2026, 8, 11));
    expect(resolveToday('2026-09-13', NOW)).toEqual(new Date(2026, 8, 13));
  });
  it('falls back to the server date when far off, invalid or missing', () => {
    const server = new Date(2026, 8, 12);
    expect(resolveToday('2026-09-15', NOW)).toEqual(server);
    expect(resolveToday('2026-02-30', NOW)).toEqual(server);
    expect(resolveToday('09/12/2026', NOW)).toEqual(server);
    expect(resolveToday(null, NOW)).toEqual(server);
  });
  it('round-trips', () => {
    expect(resolveToday(localDateParam(NOW), NOW)).toEqual(new Date(2026, 8, 12));
  });
});
```

- [ ] **Step 2: Run them and watch them fail.**

Run: `npx vitest run src/__tests__/lib/flags.test.ts src/__tests__/lib/dashboard/today.test.ts`
Expected: FAIL (the modules don't resolve).

- [ ] **Step 3: Implement.**

```ts
// src/lib/flags.ts
/**
 * Dashboard v2 rollout (spec §5.3). DASHBOARD_V2_USERS is a comma-separated
 * list of emails, or "all". Unset = off, so v1 renders exactly as before.
 */
export function isDashboardV2(
  email: string | null | undefined,
  raw: string | undefined = process.env.DASHBOARD_V2_USERS,
): boolean {
  if (!raw) return false;
  const list = raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (list.includes('all')) return true;
  return Boolean(email) && list.includes(email!.trim().toLowerCase());
}
```

```ts
// src/lib/dashboard/today.ts
const TODAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MAX_SKEW_MS = 36 * 60 * 60 * 1000;

/** The caller's local calendar date as YYYY-MM-DD (sent by the client). */
export function localDateParam(d: Date = new Date()): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * The client's date (so "missed" and "this month" match the browser), trusted
 * only when it is a real date within ±36h of the server's; otherwise the
 * server's date. Always a local-midnight Date.
 */
export function resolveToday(param: string | null, now: Date = new Date()): Date {
  const fallback = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const match = param ? TODAY_RE.exec(param) : null;
  if (!match) return fallback;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const candidate = new Date(year, month, day);
  const isRealDate =
    candidate.getFullYear() === year && candidate.getMonth() === month && candidate.getDate() === day;
  if (!isRealDate) return fallback;
  if (Math.abs(candidate.getTime() - fallback.getTime()) > MAX_SKEW_MS) return fallback;
  return candidate;
}
```

- [ ] **Step 4: Run them and watch them pass.**

Run: `npx vitest run src/__tests__/lib/flags.test.ts src/__tests__/lib/dashboard/today.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add src/lib/flags.ts src/lib/dashboard/today.ts src/__tests__/lib/flags.test.ts src/__tests__/lib/dashboard/today.test.ts
git commit -m "feat(dashboard): v2 rollout flag and client-date helpers" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 13: `GET /api/dashboard/insights`

**Files:**
- Modify: `src/lib/rateLimit.ts` (add a preset inside `limits`)
- Create: `src/app/api/dashboard/insights/route.ts`
- Test: `src/__tests__/api/dashboard-insights.test.ts`

**Interfaces:**
- Consumes: `buildDashboardInsights` (Task 11), `resolveToday` (Task 12), `resolveBillingVerdict` from `@/lib/gates`, `verifyAuth`/`unauthorized`/`serverError`/`tooManyRequests` from `@/lib/auth-server`.
- Produces: `GET /api/dashboard/insights?today=YYYY-MM-DD` → `200 DashboardInsights` with `Cache-Control: private, no-store`; 401 unauthenticated; 429 when rate limited; 500 on failure. `limits.dashboardInsights(userId): Promise<boolean>`.

> The route file must export only HTTP handlers: Next.js rejects other named exports from `route.ts`. That's why `resolveToday` lives in `src/lib/dashboard/today.ts`.

- [ ] **Step 1: Write the failing test.**

```ts
// src/__tests__/api/dashboard-insights.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    debt: { findMany: vi.fn() },
    income: { findUnique: vi.fn() },
    expense: { findMany: vi.fn() },
    paymentRecord: { findMany: vi.fn(), findFirst: vi.fn() },
    balanceSnapshot: { findMany: vi.fn() },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/auth-server', () => ({
  verifyAuth: vi.fn(),
  unauthorized: vi.fn(() => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })),
  serverError: vi.fn((msg: string) => new Response(JSON.stringify({ error: msg }), { status: 500 })),
  tooManyRequests: vi.fn(() => new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 })),
}));
vi.mock('@/lib/gates', () => ({ resolveBillingVerdict: vi.fn() }));
vi.mock('@/lib/rateLimit', () => ({ limits: { dashboardInsights: vi.fn() } }));

import { GET } from '@/app/api/dashboard/insights/route';
import { verifyAuth } from '@/lib/auth-server';
import { resolveBillingVerdict } from '@/lib/gates';
import { limits } from '@/lib/rateLimit';

const AUTHED = { valid: true as const, user: { id: 'user-1', email: 'owner@example.com' } };
const req = (qs = '') => new NextRequest(`http://localhost/api/dashboard/insights${qs}`);

const DEBT_ROWS = [
  { id: 'b', userId: 'user-1', name: 'Card B', category: 'Credit Card', balance: 3000, originalBalance: 3000, interestRate: 25, minimumPayment: 60, creditLimit: 0, priorityOrder: null, dueDate: 10, createdAt: new Date('2026-02-01'), updatedAt: new Date('2026-02-01') },
  { id: 'a', userId: 'user-1', name: 'Card A', category: 'Credit Card', balance: 800, originalBalance: 1000, interestRate: 5, minimumPayment: 30, creditLimit: 0, priorityOrder: null, dueDate: 5, createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01') },
];

describe('GET /api/dashboard/insights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 12, 12, 0));
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    vi.mocked(limits.dashboardInsights).mockResolvedValue(true);
    vi.mocked(resolveBillingVerdict).mockResolvedValue({ paidPro: false, proEligible: false, signupTrialEndsAt: null });
    mockPrisma.debt.findMany.mockResolvedValue(DEBT_ROWS);
    mockPrisma.income.findUnique.mockResolvedValue({ id: 'i', userId: 'user-1', monthlyTakeHome: 3000, essentialExpenses: 2000, extraPayment: 0, payoffMethod: 'snowball', accelerationAmount: 100, frequency: 'monthly', createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01') });
    mockPrisma.expense.findMany.mockResolvedValue([{ amount: 50 }]);
    mockPrisma.paymentRecord.findMany.mockResolvedValue([{ debtId: 'a', dueYear: 2026, dueMonth: 8 }]);
    mockPrisma.paymentRecord.findFirst.mockResolvedValue({ id: 'p1' });
    mockPrisma.balanceSnapshot.findMany.mockResolvedValue([{ debtId: 'a', balance: 800, recordedAt: new Date('2026-09-01T00:00:00Z') }]);
  });
  afterEach(() => vi.useRealTimers());

  it('rejects unauthenticated requests', async () => {
    vi.mocked(verifyAuth).mockResolvedValue({ valid: false, user: null });
    expect((await GET(req())).status).toBe(401);
  });

  it('rate limits per user', async () => {
    vi.mocked(limits.dashboardInsights).mockResolvedValue(false);
    expect((await GET(req())).status).toBe(429);
    expect(limits.dashboardInsights).toHaveBeenCalledWith('user-1');
  });

  it('builds insights from the user\'s own rows, uncached', async () => {
    const res = await GET(req('?today=2026-09-12'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    const body = await res.json();
    expect(body.asOf).toEqual({ year: 2026, month: 8, day: 12 });
    expect(body.paymentGap).toMatchObject({ expected: 2, logged: 1, missed: [{ debtId: 'b', minimumPayment: 60 }] });
    expect(body.coachMoves[0]).toMatchObject({ id: 'log_missed', isFree: true });
    expect(body.tier).toEqual({ proEligible: false, paidPro: false, trial: { active: false, endsAt: null } });

    // Same debt order as GET /api/debts, so engine tie-breaks match the app.
    expect(mockPrisma.debt.findMany).toHaveBeenCalledWith({ where: { userId: 'user-1' }, orderBy: { createdAt: 'desc' } });
    expect(mockPrisma.paymentRecord.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'user-1', dueYear: 2026, dueMonth: 8 },
    }));
    expect(mockPrisma.balanceSnapshot.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'user-1', debt: { userId: 'user-1' } },
    }));
  });

  it('ignores a client date more than a day off', async () => {
    await GET(req('?today=2020-01-01'));
    expect(mockPrisma.paymentRecord.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'user-1', dueYear: 2026, dueMonth: 8 },
    }));
  });

  it('reports an active signup trial', async () => {
    vi.mocked(resolveBillingVerdict).mockResolvedValue({ paidPro: false, proEligible: true, signupTrialEndsAt: new Date(2026, 8, 20) });
    const body = await (await GET(req())).json();
    expect(body.tier.trial).toEqual({ active: true, endsAt: new Date(2026, 8, 20).toISOString() });
    expect(body.coachMoves.every((m: { isFree: boolean }) => m.isFree)).toBe(true);
  });

  it('returns 500 without leaking details when the database fails', async () => {
    mockPrisma.debt.findMany.mockRejectedValue(new Error('db down'));
    const res = await GET(req());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Failed to load dashboard insights' });
  });
});
```

- [ ] **Step 2: Run it and watch it fail.**

Run: `npx vitest run src/__tests__/api/dashboard-insights.test.ts`
Expected: FAIL with "Failed to resolve import '@/app/api/dashboard/insights/route'".

- [ ] **Step 3: Add the rate-limit preset.** In `src/lib/rateLimit.ts`, inside `limits`, before the Plaid section:

```ts
  /** 120 dashboard-insights reads per 10 min per user (refetched after every mutation). */
  dashboardInsights: (userId: string) =>
    check('dash-insights', `dash-insights:${userId}`, 120, '600 s', 10 * 60 * 1000),
```

- [ ] **Step 4: Implement the route.**

```ts
// src/app/api/dashboard/insights/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, serverError, tooManyRequests } from '@/lib/auth-server';
import { resolveBillingVerdict } from '@/lib/gates';
import { limits } from '@/lib/rateLimit';
import { buildDashboardInsights } from '@/lib/dashboard/buildInsights';
import { resolveToday } from '@/lib/dashboard/today';
import type { Debt, Income } from '@/types';

/** GET /api/dashboard/insights?today=YYYY-MM-DD — every dashboard v2 figure (spec §5.2). */
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();
  const userId = auth.user.id;

  if (!(await limits.dashboardInsights(userId))) return tooManyRequests(undefined, 60);

  const today = resolveToday(new URL(request.url).searchParams.get('today'));

  try {
    const [debtRows, income, expenses, monthRecords, anyPayment, snapshots, verdict] = await Promise.all([
      prisma.debt.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      prisma.income.findUnique({ where: { userId } }),
      prisma.expense.findMany({ where: { userId }, select: { amount: true } }),
      prisma.paymentRecord.findMany({
        where: { userId, dueYear: today.getFullYear(), dueMonth: today.getMonth() },
        select: { debtId: true, dueYear: true, dueMonth: true },
      }),
      prisma.paymentRecord.findFirst({ where: { userId }, select: { id: true } }),
      prisma.balanceSnapshot.findMany({
        where: { userId, debt: { userId } },
        orderBy: { recordedAt: 'asc' },
        select: { debtId: true, balance: true, recordedAt: true },
      }),
      resolveBillingVerdict(userId),
    ]);

    const trialEndsAt = verdict.signupTrialEndsAt;
    const insights = buildDashboardInsights({
      // The same rows GET /api/debts and /api/income serve; nullable dueDate is handled with `== null`.
      debts: debtRows as unknown as Debt[],
      income: income as unknown as Income | null,
      expenses,
      monthRecords,
      hasAnyPayment: anyPayment !== null,
      snapshots: snapshots.map((s) => ({ ...s, recordedAt: s.recordedAt.toISOString() })),
      tier: {
        proEligible: verdict.proEligible,
        paidPro: verdict.paidPro,
        trial: {
          active: !verdict.paidPro && trialEndsAt !== null && trialEndsAt.getTime() > Date.now(),
          endsAt: trialEndsAt?.toISOString() ?? null,
        },
      },
      today,
    });

    return NextResponse.json(insights, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Dashboard insights error:', error);
    return serverError('Failed to load dashboard insights');
  }
}
```

- [ ] **Step 5: Run it and watch it pass.**

Run: `npx vitest run src/__tests__/api/dashboard-insights.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit.**

```bash
git add src/lib/rateLimit.ts src/app/api/dashboard/insights/route.ts src/__tests__/api/dashboard-insights.test.ts
git commit -m "feat(api): GET /api/dashboard/insights" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 14: Client hook and invalidation

**Files:**
- Modify: `src/lib/hooks.ts` (after `useSubscription`, ~L775)
- Modify: `src/app/providers.tsx:4, 64-79`

**Interfaces:**
- Consumes: `DashboardInsights` (Task 3), `localDateParam` (Task 12).
- Produces: `useDashboardInsights(enabled?: boolean)`, a React Query hook with key `['dashboard-insights']`. Every settled mutation invalidates it. With the flag off nothing observes the key, so invalidation only marks it stale and v1 behavior is unchanged.

The hook has no unit test: `hooks.ts` pulls in browser-only modules that the node test environment can't load, which is the existing pattern for this file. Its logic lives in the already-tested `localDateParam` and the route. It is verified by type-check, build, and the manual check in Task 15.

- [ ] **Step 1: Add the hook.** In `src/lib/hooks.ts`:
  - Add the imports near the top: `import type { DashboardInsights } from '@/lib/dashboard/types';` and `import { localDateParam } from '@/lib/dashboard/today';`.
  - Append after `useSubscription`:

```ts
// ===== DASHBOARD INSIGHTS (v2) =====

/** Every dashboard v2 figure, computed server-side (spec §5.2). */
export function useDashboardInsights(enabled = true) {
  return useQuery<DashboardInsights>({
    queryKey: ['dashboard-insights'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/api/dashboard/insights`, {
        params: { today: localDateParam() },
      });
      return data;
    },
    enabled,
    staleTime: 60 * 1000,
  });
}
```

- [ ] **Step 2: Invalidate insights after every mutation.** In `src/app/providers.tsx`:
  - Change the import to `import { QueryClientProvider, QueryClient, MutationCache } from '@tanstack/react-query';`.
  - Replace the `queryClient` declaration with:

```tsx
// Annotated: the MutationCache callback references queryClient inside its own initializer.
const queryClient: QueryClient = new QueryClient({
  mutationCache: new MutationCache({
    // Any mutation can move a dashboard figure (debts, income, expenses,
    // payments, snapshots), so refetch insights once each one settles.
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['dashboard-insights'] });
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: (failureCount, error) => {
        const status = getResponseStatus(error);
        if (status === 401 || status === 403 || status === 404) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
```

- [ ] **Step 3: Type-check, lint and build.**

Run: `npx tsc --noEmit`, then `npm run lint`, then `npm run build`
Expected: all succeed, with no new warnings in the touched files.

- [ ] **Step 4: Commit.**

```bash
git add src/lib/hooks.ts src/app/providers.tsx
git commit -m "feat(dashboard): useDashboardInsights hook with global invalidation" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 15: Spec sync, PR 1 verification, and the pull request

**Files:**
- Modify: `docs/superpowers/specs/2026-09-12-dashboard-pro-upgrade-design.md`

- [ ] **Step 1: Patch the spec** with the refinements recorded in this plan's Roadmap:
  - In §5.1, remove the `uncounted.ts` row's "PR 1" placement: append "(built in PR 4, with `Debt.inPlan`)". Change the `streakGrid.ts` definition to: "12 cells: 8 past months, the current month, and 3 future. A past month before the first snapshot month is `inactive`; after it, `logged` if it has a snapshot, otherwise `missed`. …" (the rest unchanged).
  - In §5.1 `strategy.ts`: "Mirrors `PayoffTab.tsx:258-270`: null for custom ordering or an empty plan; alternative is avalanche, or snowball when current is avalanche."
  - In §5.2, note that `uncounted` joins the interface in PR 4 and `trialMoment` in PR 6, and change `readiness: PlanReadiness | null` to `readiness: PlanReadiness` (it is always computable).
  - In §13 Risks, add: "`planGap` is the verbatim Pro formula. When only some debts have snapshots, it can overstate 'ahead' (actual totals omit debts without snapshots). v2 only shows the gap when behind; fixing the formula would change Pro users' numbers, so it is out of scope."

Commit:

```bash
git add docs/superpowers/specs/2026-09-12-dashboard-pro-upgrade-design.md
git commit -m "docs(spec): sync dashboard spec with PR 1 plan refinements" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 2: Run the full local checks.**

Run: `npm run lint`, then `npm run build`, then `npm test`
Expected: all pass. Report any failure verbatim and fix it before continuing; never skip one.

- [ ] **Step 3: Run the baseline gate** (Task 0 README).
Expected: `DIFFERENT=0 missing=0 inputsChanged=0`. Any DIFFERENT user blocks the PR. Find which extraction diverged; the equality tests should have caught it, so add the missing case to them.

- [ ] **Step 4: Manually check the endpoint against the live UI** (owner account, local dev server on production data, read-only). Start the dev server with the Browser pane preview, sign in, and open `/api/dashboard/insights?today=<today>`. Confirm, against the existing UI on the same account:
  - `interest.monthlyEstimate` equals "Interest / mo" in the Intelligence teaser or Guardrails card.
  - `strategy.currentInterest` / `alternativeInterest` equal the My Plan snowball/avalanche readout.
  - `progress.streak`, `progress.paidToDate` and `progress.startingTotal` equal the Progress tab.
  - `paymentGap.missed` matches the debts the Debts tab marks past due.
  - `plan.months` equals This Month's "time to go".
  - `planGap.amount` equals the Pro Forecast card's ahead/behind figure.

Record the matches in the PR body as "verified figures", without the amounts: the PR must not contain personal numbers.

- [ ] **Step 5: Push and open the PR.**

```bash
git push -u origin feat/dashboard-pro-upgrade
```

Open a PR against `main` titled `feat(dashboard): v2 foundation — insights layer, tokens, flag (PR 1/6)`. Use `gh pr create` if it's installed; otherwise use the GitHub REST API, since this machine has historically had no `gh`. The body must include:
- a summary
- a link to the spec and the plan
- "No visible change"
- the baseline gate result line
- the verified-figures checklist from Step 4
- a test plan
- the footer `🤖 Generated with [Claude Code](https://claude.com/claude-code)`

- [ ] **Step 6: Wait for the CodeRabbit/Codex reviews and CI** before merging, per project practice. Address findings with new commits, rerun Steps 2–3 after any change to `src/lib`, and merge only when CI is green and both reviews are resolved.

- [ ] **Step 7: After merge, write the PR 2 plan** (`docs/superpowers/plans/<date>-dashboard-v2-pr2-shell.md`) from the Roadmap row, against the merged code.

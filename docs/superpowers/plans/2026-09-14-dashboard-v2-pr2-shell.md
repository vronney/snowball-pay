# Dashboard v2 — PR 2: Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Behind the `DASHBOARD_V2_USERS` flag, replace the dashboard's sidebar, header and mobile hamburger with the v2 shell: a 200px sidebar with a Coach dot and an upgrade rail, a 56px header with an avatar menu, and a 5-tab mobile bottom bar. With the flag off, the page renders exactly as it does today.

**Architecture:** `dashboard/page.tsx` evaluates `isDashboardV2(email)` on the server and passes `dashboardV2` to `DashboardClient`. With the flag on, `DashboardClient` renders `V2Shell` around the **existing** tab content; the v2 tabs come in PRs 3–5. The only new data the shell reads is `useDashboardInsights()`, and only `V2Shell` calls it, so the v1 path never fetches it. Two pure, React-free helpers in `src/lib/dashboard/` decide the Coach dot and the upgrade rail.

**Tech Stack:** Next.js 15 App Router, React 18, TypeScript, Tailwind 3.4, TanStack Query 5, lucide-react 0.294, Vitest 4. Component tests use jsdom and @testing-library/react through a `// @vitest-environment jsdom` header. Test files must be `*.test.ts`, not `.tsx`, so they use `createElement` instead of JSX.

**Spec:** `docs/superpowers/specs/2026-09-12-dashboard-pro-upgrade-design.md` (§5.3, §8.2, §8.3). The parent roadmap is `docs/superpowers/plans/2026-09-12-dashboard-pro-upgrade.md` (PR 2 row). The handoff (`~/.gstack/projects/vronney-snowball-pay/designs/dashboard-pro-upgrade-20260912/` `README.md` "Global — Mobile shell" and "Desktop — This Month" → "Sidebar", plus `STYLES.md`) defines the visuals. Read it; never copy it into the repo.

## Global Constraints

- **Flag off renders unchanged** (spec §5.3). Task 2 pins the v1 markup in a snapshot taken from the untouched code, and every later commit must reproduce it. **Never run vitest with `-u` / `--update` in this PR.**
- **Flag off never fetches insights.** Only `V2Shell` calls `useDashboardInsights`.
- **No computed number changes.** PR 2 touches no calculation. The baseline gate still runs before the PR (parent plan, Task 0 README).
- **DESIGN.md wins over the handoff** where they differ:
  - Cards are 12px (`rounded-xl`) and in-app buttons 8px (`rounded-lg`), including the upgrade rail's card and button, which the handoff draws at 10px.
  - Blue (`action`) only on active nav and CTAs.
  - Ink only on the upgrade rail in this PR.
  - No dashed borders.
  - No new fonts.
- **Tokens, not hexes:** `bg-surface`, `bg-bg`, `bg-surface-2`, `text-txt`, `text-txt-muted`, `text-action`, `bg-action/10`, `bg-danger`, `border-border`, `bg-ink`, `text-ink-accent`, `shadow-float`. The one literal allowed is the existing focus convention, `focus-visible:outline-action`.
- **Breakpoint:** the mobile shell (bottom bar, logo header) applies at `max-[768px]`, the desktop shell (sidebar, page title) at `min-[769px]`. This is v1's `max-width: 768px` split, so the existing tabs' own mobile CSS keeps lining up.
- **Touch targets:** 44px minimum (`min-h-11`, `h-11 w-11`) for every mobile control. The rail's 38px CTA is desktop-only.
- **Coach rename is label-only.** The tab id stays `intelligence` (deep links, `DASHBOARD_TAB_VIEWED`). No analytics events are added or changed.
- **Hide instead of fake:**
  - The rail hides unless the user has at least one gated move.
  - Its dollar line hides under $1.
  - Per-year values are never summed with one-time or months values (X7), and they carry "/yr est.".
- **Prices:** the shell shows none. Never write the literal `12`.
- **Git:**
  - Work on branch `feat/dashboard-v2-shell` (created from `main` at `ca24a5f7`).
  - Use conventional commits, each ending with `-m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"`.
  - Never bypass hooks.
  - The local `block-no-verify` hook rejects any Bash command that contains `git commit` together with a `-n`-like token (`echo -n`, `[ -n`, `-ne`). Keep commits in their own command, or use `printf` and `[ "$x" != "" ]`.
- **Pre-existing `tsc` noise:** `src/__tests__/lib/stripe.test.ts` has accepted type errors. Filter them out of every `npx tsc --noEmit` check.

## Decisions made while writing this plan

The spec is patched to match in Task 8.

1. **One scroll model at every width.** The shell is a `100dvh` row, and only the content column's `<main>` scrolls. The header, sidebar and bottom bar stay put. Every direct child of the scroll area is `shrink-0`.
2. **Settings and Sign out live in the avatar menu at every width.** The desktop sidebar's footer is the upgrade rail. Income & Budget appears both in the desktop sidebar and in the avatar menu (D11).
3. **`TrialCountdownBanner` stays in v2 until PR 6.** It sits at the top of the scroll area; spec §7 retires it with the trial moments.
4. **The upgrade rail before the trial exists.**
   - It shows to Free users (`!tier.proEligible`) with at least one gated move.
   - Copy: "{n} moves waiting" (1: "1 move waiting"), then " · ${perYear}/yr est." when the gated per-year sum floors to at least $1.
   - The CTA reads "Unlock all {n}" (1: "Unlock the move"). It opens the existing `UpgradeModal` via `upgradeEvents.dispatch('Coach moves')`, which maps to the modal's coach copy.
   - PR 6 changes the CTA to "Try Pro free" for trial-eligible users.
5. **The Coach dot fingerprint is the move set's identity, not its amounts.**
   - Each move contributes its id plus the fact that makes it a different move:
     - `log_missed` its month label
     - `call_apr` its card id
     - `switch_strategy` its alternative
   - A payment that nudges an estimate doesn't relight the dot; a new month, a different card or a new kind of move does.
   - It is stored under `sp_coach_seen`. `runLogoutClientCleanup` clears every `sp_` key, so the card id never outlives the session on a shared device.
6. **Toasts sit above the mobile bottom bar.** `ToastNotifications` gains an optional `bottom` prop (default `'24px'`, so v1 is unchanged). v2 passes `calc(24px + var(--v2-tabbar-offset, 0px))`, and the shell sets that variable only in its mobile layout.

**Known limits, accepted for PR 2:**
- On the Debts tab at `xl`, `DebtTab`'s `xl:sticky xl:top-24` aside now sticks 96px below the scroll area's top, not below a 76px sticky header. It stays readable, and PR 4 replaces My Debts.
- The analytics consent banner (`z-[250]`, fixed bottom) covers the bottom bar until answered, the same way it covers v1's content today.

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/dashboard/coachDot.ts` (create) | Move-set fingerprint and dot rule. React-free. |
| `src/lib/dashboard/upgradeRail.ts` (create) | Which users see the rail, its figures, and its copy. React-free. |
| `src/components/dashboard-v2/shell/navItems.ts` (create) | v2 tab labels, sidebar and bottom-bar item lists |
| `src/components/dashboard-v2/shell/BottomTabBar.tsx` (create) | Mobile 5-tab bar with the Coach dot |
| `src/components/dashboard-v2/shell/UpgradeRail.tsx` (create) | Ink sidebar foot |
| `src/components/dashboard-v2/shell/V2Sidebar.tsx` (create) | 200px desktop sidebar |
| `src/components/dashboard-v2/shell/AvatarMenu.tsx` (create) | Account menu: Income & Budget, Settings, Sign out |
| `src/components/dashboard-v2/shell/V2Header.tsx` (create) | 56px header |
| `src/components/dashboard-v2/shell/useCoachDot.ts` (create) | Dot state with localStorage persistence |
| `src/components/dashboard-v2/shell/V2Shell.tsx` (create) | Layout, insights, rail and dot wiring, scroll reset |
| `src/components/ToastNotifications.tsx` (modify) | Optional `bottom` offset |
| `src/components/DashboardClient.tsx` (modify) | `dashboardV2` prop. Shared content, then v1 or v2 shell. |
| `src/app/dashboard/page.tsx` (modify) | Passes `dashboardV2={isDashboardV2(user?.email)}` |
| `src/__tests__/lib/dashboard/fixtures.ts` (modify) | Coach-move builders |
| `src/__tests__/lib/dashboard/coachDot.test.ts`, `upgradeRail.test.ts` (create) | Node tests |
| `src/__tests__/components/dashboard-v2/*.test.ts` (create) | jsdom tests, including the v1 snapshot |
| `docs/superpowers/specs/2026-09-12-dashboard-pro-upgrade-design.md` (modify) | Records the decisions above |

---

### Task 1: Coach dot and upgrade rail rules (pure)

**Files:**
- Modify: `src/__tests__/lib/dashboard/fixtures.ts` (append the move builders)
- Create: `src/lib/dashboard/coachDot.ts`, `src/lib/dashboard/upgradeRail.ts`
- Test: `src/__tests__/lib/dashboard/coachDot.test.ts`, `src/__tests__/lib/dashboard/upgradeRail.test.ts`

**Interfaces:**
- Consumes:
  - `CoachMove`, `TierInfo` from `@/lib/dashboard/types`
  - `summarizeMoveValues(moves): { count; perYear; oneTime; monthsSooner }` from `@/lib/dashboard/coachMoves`
  - `formatCurrencyWhole(value: number): string` from `@/lib/utils`
- Produces:
  - `COACH_SEEN_STORAGE_KEY: 'sp_coach_seen'`
  - `coachMovesFingerprint(moves: ReadonlyArray<CoachMove>): string`
  - `shouldShowCoachDot(fingerprint: string | null, lastSeen: string | null): boolean`
  - `interface UpgradeRailSummary { count: number; perYear: number | null }`
  - `computeUpgradeRail(insights: { tier: Pick<TierInfo, 'proEligible'>; coachMoves: ReadonlyArray<CoachMove> } | null | undefined): UpgradeRailSummary | null`
  - `upgradeRailCopy(rail: UpgradeRailSummary): { title: string; value: string | null; cta: string }`
  - Fixtures: `makeLogMissedMove(monthLabel, missedCount, isFree = true)`, `makeCallAprMove(debtId, annualEstimate, isFree = false)`, `makeSwitchMove(alternative, amount, isFree = false)`, `makeUnallocatedMove(monthsSooner, isFree = false)`, each returning `CoachMove`

- [ ] **Step 1: Append the move builders to the fixtures.** Add `import type { CoachMove } from '@/lib/dashboard/types';` at the top of `src/__tests__/lib/dashboard/fixtures.ts`, then append:

```ts
export function makeLogMissedMove(monthLabel: string, missedCount: number, isFree = true): CoachMove {
  return {
    id: 'log_missed', priority: 'high', isFree,
    value: { kind: 'count', amount: missedCount },
    facts: { monthLabel, logged: 1, expected: 1 + missedCount, missedCount, missedMinimums: 50 * missedCount },
  };
}

export function makeCallAprMove(debtId: string, annualEstimate: number, isFree = false): CoachMove {
  return {
    id: 'call_apr', priority: 'medium', isFree,
    value: { kind: 'perYear', amount: annualEstimate },
    facts: { debtId, debtName: debtId, apr: 28, targetApr: 19.6, annualEstimate },
  };
}

export function makeSwitchMove(alternative: 'snowball' | 'avalanche', amount: number, isFree = false): CoachMove {
  return {
    id: 'switch_strategy', priority: 'medium', isFree,
    value: { kind: 'total', amount },
    facts: { alternative, interestDifference: amount },
  };
}

export function makeUnallocatedMove(monthsSooner: number, isFree = false): CoachMove {
  return {
    id: 'use_unallocated', priority: 'high', isFree,
    value: { kind: 'months', amount: monthsSooner },
    facts: { unusedMonthly: 200, targetAcceleration: 700, monthsSooner },
  };
}
```

- [ ] **Step 2: Write the failing tests.**

```ts
// src/__tests__/lib/dashboard/coachDot.test.ts
import { describe, it, expect } from 'vitest';
import {
  COACH_SEEN_STORAGE_KEY,
  coachMovesFingerprint,
  shouldShowCoachDot,
} from '@/lib/dashboard/coachDot';
import { makeCallAprMove, makeLogMissedMove, makeSwitchMove, makeUnallocatedMove } from './fixtures';

describe('coachMovesFingerprint', () => {
  it('ignores amounts, so a payment that nudges an estimate is not a new move', () => {
    expect(coachMovesFingerprint([makeCallAprMove('card-1', 742.9)]))
      .toBe(coachMovesFingerprint([makeCallAprMove('card-1', 700.1)]));
    expect(coachMovesFingerprint([makeLogMissedMove('Sep', 2)]))
      .toBe(coachMovesFingerprint([makeLogMissedMove('Sep', 3)]));
  });

  it('ignores order', () => {
    const a = [makeLogMissedMove('Sep', 2), makeCallAprMove('card-1', 500)];
    expect(coachMovesFingerprint(a)).toBe(coachMovesFingerprint([...a].reverse()));
  });

  it('changes for a new month, a different card, a different alternative, or an added move', () => {
    const base = coachMovesFingerprint([makeLogMissedMove('Sep', 2), makeCallAprMove('card-1', 500)]);
    expect(coachMovesFingerprint([makeLogMissedMove('Oct', 2), makeCallAprMove('card-1', 500)])).not.toBe(base);
    expect(coachMovesFingerprint([makeLogMissedMove('Sep', 2), makeCallAprMove('card-2', 500)])).not.toBe(base);
    expect(coachMovesFingerprint([makeLogMissedMove('Sep', 2), makeCallAprMove('card-1', 500), makeUnallocatedMove(2)])).not.toBe(base);
    expect(coachMovesFingerprint([makeSwitchMove('avalanche', 10)])).not.toBe(coachMovesFingerprint([makeSwitchMove('snowball', 10)]));
  });

  it('is empty for no moves', () => {
    expect(coachMovesFingerprint([])).toBe('');
  });

  it('pins the format', () => {
    expect(coachMovesFingerprint([
      makeSwitchMove('avalanche', 10), makeLogMissedMove('Sep', 1), makeUnallocatedMove(2), makeCallAprMove('c1', 5),
    ])).toBe('call_apr:c1|log_missed:Sep|switch_strategy:avalanche|use_unallocated');
  });
});

describe('shouldShowCoachDot', () => {
  it('is off while moves are unknown or empty', () => {
    expect(shouldShowCoachDot(null, null)).toBe(false);
    expect(shouldShowCoachDot('', null)).toBe(false);
  });
  it('is on for a move set never seen, off once seen', () => {
    expect(shouldShowCoachDot('log_missed:Sep', null)).toBe(true);
    expect(shouldShowCoachDot('log_missed:Sep', 'call_apr:c1')).toBe(true);
    expect(shouldShowCoachDot('log_missed:Sep', 'log_missed:Sep')).toBe(false);
  });
});

it('stores under an sp_ key so sign-out clears it (logout-client.ts)', () => {
  expect(COACH_SEEN_STORAGE_KEY).toBe('sp_coach_seen');
});
```

```ts
// src/__tests__/lib/dashboard/upgradeRail.test.ts
import { describe, it, expect } from 'vitest';
import type { TierInfo } from '@/lib/dashboard/types';
import { computeUpgradeRail, upgradeRailCopy } from '@/lib/dashboard/upgradeRail';
import { makeCallAprMove, makeLogMissedMove, makeSwitchMove, makeUnallocatedMove } from './fixtures';

const FREE: TierInfo = { proEligible: false, paidPro: false, trial: { active: false, endsAt: null } };
const PRO: TierInfo = { proEligible: true, paidPro: true, trial: { active: false, endsAt: null } };

describe('computeUpgradeRail', () => {
  it('is null before insights load', () => {
    expect(computeUpgradeRail(undefined)).toBeNull();
    expect(computeUpgradeRail(null)).toBeNull();
  });

  it('is null for Pro and trial users, whose moves are all open', () => {
    expect(computeUpgradeRail({ tier: PRO, coachMoves: [makeCallAprMove('c1', 500, true)] })).toBeNull();
  });

  it('is null when nothing is gated', () => {
    expect(computeUpgradeRail({ tier: FREE, coachMoves: [makeLogMissedMove('Sep', 2)] })).toBeNull();
    expect(computeUpgradeRail({ tier: FREE, coachMoves: [] })).toBeNull();
  });

  it('counts only gated moves and floors their per-year estimate', () => {
    expect(computeUpgradeRail({
      tier: FREE,
      coachMoves: [makeLogMissedMove('Sep', 2), makeUnallocatedMove(3), makeSwitchMove('avalanche', 1030.4), makeCallAprMove('c1', 742.9)],
    })).toEqual({ count: 3, perYear: 742 });
  });

  it('never adds one-time or months values into the per-year figure (X7)', () => {
    expect(computeUpgradeRail({
      tier: FREE,
      coachMoves: [makeLogMissedMove('Sep', 2), makeSwitchMove('avalanche', 1030.4), makeUnallocatedMove(2)],
    })).toEqual({ count: 2, perYear: null });
  });

  it('sums several per-year moves before flooring', () => {
    expect(computeUpgradeRail({
      tier: FREE,
      coachMoves: [makeLogMissedMove('Sep', 1), makeCallAprMove('c1', 300.6), makeCallAprMove('c2', 441.7)],
    })).toEqual({ count: 2, perYear: 742 });
  });

  it('hides a per-year total under $1', () => {
    expect(computeUpgradeRail({
      tier: FREE,
      coachMoves: [makeLogMissedMove('Sep', 1), makeCallAprMove('c1', 0.8)],
    })).toEqual({ count: 1, perYear: null });
  });
});

describe('upgradeRailCopy', () => {
  it('names the count, the per-year estimate, and the CTA', () => {
    expect(upgradeRailCopy({ count: 3, perYear: 1648 })).toEqual({
      title: '3 moves waiting',
      value: '$1,648/yr est.',
      cta: 'Unlock all 3',
    });
  });

  it('uses the singular and drops a missing value', () => {
    expect(upgradeRailCopy({ count: 1, perYear: null })).toEqual({
      title: '1 move waiting',
      value: null,
      cta: 'Unlock the move',
    });
  });
});
```

- [ ] **Step 3: Run them and watch them fail.**

Run: `npx vitest run src/__tests__/lib/dashboard/coachDot.test.ts src/__tests__/lib/dashboard/upgradeRail.test.ts`
Expected: FAIL with "Failed to resolve import '@/lib/dashboard/coachDot'" (and `upgradeRail`).

- [ ] **Step 4: Implement.**

```ts
// src/lib/dashboard/coachDot.ts
import type { CoachMove } from './types';

/**
 * localStorage key for the move set the user last saw on Coach. The `sp_`
 * prefix means sign-out clears it (`runLogoutClientCleanup`), so a card id
 * never outlives the session on a shared device.
 */
export const COACH_SEEN_STORAGE_KEY = 'sp_coach_seen';

function moveIdentity(move: CoachMove): string {
  switch (move.id) {
    case 'log_missed':
      return `log_missed:${move.facts.monthLabel}`;
    case 'use_unallocated':
      return 'use_unallocated';
    case 'switch_strategy':
      return `switch_strategy:${move.facts.alternative}`;
    case 'call_apr':
      return `call_apr:${move.facts.debtId}`;
  }
}

/**
 * Identifies the move set, not its amounts: a payment that nudges an estimate
 * isn't a new move, but a new month's missed payments, a different card to
 * call, or a new kind of move is. Order-independent. '' when there are none.
 */
export function coachMovesFingerprint(moves: ReadonlyArray<CoachMove>): string {
  return moves.map(moveIdentity).sort().join('|');
}

/** The dot shows while there are moves whose set the user hasn't seen on Coach. */
export function shouldShowCoachDot(fingerprint: string | null, lastSeen: string | null): boolean {
  return fingerprint !== null && fingerprint !== '' && fingerprint !== lastSeen;
}
```

```ts
// src/lib/dashboard/upgradeRail.ts
import { formatCurrencyWhole } from '@/lib/utils';
import { summarizeMoveValues } from './coachMoves';
import type { CoachMove, TierInfo } from './types';

export interface UpgradeRailSummary {
  /** Coach moves a Free user can read but not open in full. */
  count: number;
  /** Floor of those moves' per-year estimates; null under $1. Other units are never added in (X7). */
  perYear: number | null;
}

/**
 * The sidebar upgrade rail (README §6 "Sidebar foot"). Shown only to Free users
 * who have at least one gated move, so it never advertises an empty "0 moves".
 */
export function computeUpgradeRail(
  insights: { tier: Pick<TierInfo, 'proEligible'>; coachMoves: ReadonlyArray<CoachMove> } | null | undefined,
): UpgradeRailSummary | null {
  if (!insights || insights.tier.proEligible) return null;
  const gated = insights.coachMoves.filter((move) => !move.isFree);
  if (gated.length === 0) return null;
  const perYear = Math.floor(summarizeMoveValues(gated).perYear);
  return { count: gated.length, perYear: perYear >= 1 ? perYear : null };
}

export function upgradeRailCopy(rail: UpgradeRailSummary): { title: string; value: string | null; cta: string } {
  return {
    title: rail.count === 1 ? '1 move waiting' : `${rail.count} moves waiting`,
    value: rail.perYear === null ? null : `${formatCurrencyWhole(rail.perYear)}/yr est.`,
    cta: rail.count === 1 ? 'Unlock the move' : `Unlock all ${rail.count}`,
  };
}
```

- [ ] **Step 5: Run them and watch them pass.**

Run: `npx vitest run src/__tests__/lib/dashboard/coachDot.test.ts src/__tests__/lib/dashboard/upgradeRail.test.ts`
Expected: PASS (all cases).

- [ ] **Step 6: Mutation proof.** Temporarily change `perYear >= 1` to `perYear >= 0` in `upgradeRail.ts` and confirm "hides a per-year total under $1" fails. Then temporarily drop `.sort()` in `coachDot.ts` and confirm "ignores order" fails. Restore both by hand; the files are still untracked. Rerun Step 5 and expect PASS.

- [ ] **Step 7: Commit.**

```bash
git add src/lib/dashboard/coachDot.ts src/lib/dashboard/upgradeRail.ts src/__tests__/lib/dashboard/fixtures.ts src/__tests__/lib/dashboard/coachDot.test.ts src/__tests__/lib/dashboard/upgradeRail.test.ts
git commit -m "feat(dashboard): coach-dot fingerprint and upgrade-rail rules" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Pin the v1 shell markup (characterization snapshot)

This must run against the **unchanged** `DashboardClient`. It is the proof, for every later commit, that the flag-off page renders byte-for-byte as before.

**Files:**
- Create: `src/__tests__/components/dashboard-v2/DashboardClient.flag.test.ts`
- Create (generated by the first run): `src/__tests__/components/dashboard-v2/__snapshots__/DashboardClient.flag.test.ts.snap`

**Interfaces:**
- Consumes: `DashboardClient` default export (`{ user, plaidTestAccess? }` today).
- Produces: a committed snapshot of the v1 shell (sidebar, header, banner slot, main, inline `<style>`) with the tab bodies stubbed. Task 7 adds flag cases to this file.

- [ ] **Step 1: Write the test.** The tab bodies and the data-heavy widgets are stubbed, so the snapshot measures the shell: sidebar, header, layout wrappers and the inline `<style>`.

```ts
// src/__tests__/components/dashboard-v2/DashboardClient.flag.test.ts
// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import DashboardClient from '@/components/DashboardClient';

const { stub } = vi.hoisted(() => ({
  stub: (name: string, named?: string) => async () => {
    const { createElement: h } = await import('react');
    const Stub = () => h('div', { 'data-stub': name });
    return named ? { [named]: Stub } : { default: Stub };
  },
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
vi.mock('next/image', async () => {
  const { createElement: h } = await import('react');
  return { default: (p: { src: string; alt: string }) => h('img', { src: p.src, alt: p.alt }) };
});
vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-query')>()),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock('@/lib/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/hooks')>()),
  useDebts: () => ({ data: { debts: [] }, isLoading: false, isFetching: false, isError: false }),
  useIncome: () => ({ data: { income: null }, isLoading: false, isFetching: false, isError: false }),
  useExpenses: () => ({ data: { expenses: [] }, isLoading: false }),
  useUserSettings: () => ({ data: undefined }),
  usePaymentRecords: () => ({ data: { records: [] } }),
  useMarkPaid: () => ({ mutate: vi.fn() }),
  useStartCheckout: () => ({ mutate: vi.fn() }),
  useSubscription: () => ({ data: undefined }),
  useDashboardInsights: vi.fn(() => ({ data: undefined })),
}));
vi.mock('@/lib/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/analytics')>()),
  track: vi.fn(),
  resetIdentity: vi.fn(),
}));
vi.mock('@/lib/hooks/useIdleTimeout', () => ({
  useIdleTimeout: () => ({ warning: false, countdown: 0, stayLoggedIn: vi.fn(), logout: vi.fn() }),
}));
vi.mock('@/components/dashboard/useNotifications', () => ({ useNotifications: () => ({ notifications: [] }) }));
vi.mock('@/components/ToastNotifications', () => ({ default: vi.fn(() => null) }));
vi.mock('@/components/tabs/ThisMonthTab', stub('ThisMonthTab'));
vi.mock('@/components/tabs/DebtTab', stub('DebtTab'));
vi.mock('@/components/tabs/IncomeTab', stub('IncomeTab'));
vi.mock('@/components/tabs/PayoffTab', stub('PayoffTab'));
vi.mock('@/components/tabs/ProgressTab', stub('ProgressTab'));
vi.mock('@/components/tabs/SettingsTab', stub('SettingsTab'));
vi.mock('@/components/tabs/IntelligenceTab', stub('IntelligenceTab'));
vi.mock('@/components/billing/UpgradeModal', stub('UpgradeModal'));
vi.mock('@/components/dashboard/TrialCountdownBanner', stub('TrialCountdownBanner'));
vi.mock('@/components/dashboard/LinkBankPrompt', stub('LinkBankPrompt'));
vi.mock('@/components/dashboard/MilestoneWidget', stub('MilestoneWidget', 'MilestoneWidget'));
vi.mock('@/components/dashboard/NotificationPanel', stub('NotificationPanel'));
vi.mock('@/components/plaid/PlaidLink', stub('PlaidLink', 'PlaidLink'));

const USER = { name: 'Test User', email: 'test@example.com', picture: null };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DashboardClient with the flag off (v1 must render unchanged, spec §5.3)', () => {
  it('renders the v1 shell', () => {
    expect(renderToStaticMarkup(createElement(DashboardClient, { user: USER }))).toMatchSnapshot();
  });

  it('renders the v1 shell with the header Link bank button', () => {
    expect(
      renderToStaticMarkup(createElement(DashboardClient, { user: USER, plaidTestAccess: true })),
    ).toMatchSnapshot();
  });
});
```

- [ ] **Step 2: Run it on the untouched code** to write the snapshot.

Run: `npx vitest run src/__tests__/components/dashboard-v2/DashboardClient.flag.test.ts`
Expected: PASS with "2 snapshots written". Then run it once more and expect PASS with no writes.

Then open the `.snap` file and confirm:
- it contains `db-sidebar`
- it contains the header's `<h1`
- it contains `data-stub="ThisMonthTab"`
- it contains the `<style>` block with `.db-main { margin-left: 220px; }`
- the second snapshot contains `data-stub="PlaidLink"`

If a mock is missing, the run fails loudly. Add that module to the mocks (stubbed or `importOriginal`) and rerun. Never hand-edit the snapshot.

- [ ] **Step 3: Commit** the test and its snapshot.

```bash
git add src/__tests__/components/dashboard-v2/DashboardClient.flag.test.ts src/__tests__/components/dashboard-v2/__snapshots__
git commit -m "test(dashboard): pin the v1 shell markup before the v2 flag" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Nav config and the mobile bottom bar

**Files:**
- Create: `src/components/dashboard-v2/shell/navItems.ts`, `src/components/dashboard-v2/shell/BottomTabBar.tsx`
- Test: `src/__tests__/components/dashboard-v2/BottomTabBar.test.ts`

**Interfaces:**
- Consumes: `Tab` from `@/components/dashboard/types`.
- Produces:
  - `interface V2NavItem { id: Tab; label: string; shortLabel: string; icon: LucideIcon }`
  - `V2_TAB_LABELS: Record<Tab, string>` (`intelligence` → `'Coach'`)
  - `COACH_TAB` (`'intelligence'`)
  - `SIDEBAR_ITEMS: ReadonlyArray<V2NavItem>` (6)
  - `BOTTOM_TAB_ITEMS: ReadonlyArray<V2NavItem>` (5)
  - `BottomTabBar` default export, props `{ activeTab: Tab; onSelectTab: (tab: Tab) => void; coachDot: boolean }`

- [ ] **Step 1: Write the failing test.**

```ts
// src/__tests__/components/dashboard-v2/BottomTabBar.test.ts
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import BottomTabBar from '@/components/dashboard-v2/shell/BottomTabBar';
import { V2_TAB_LABELS } from '@/components/dashboard-v2/shell/navItems';

function renderBar(props: Partial<Parameters<typeof BottomTabBar>[0]> = {}) {
  const onSelectTab = vi.fn();
  render(createElement(BottomTabBar, { activeTab: 'this-month', onSelectTab, coachDot: false, ...props }));
  return { onSelectTab, nav: screen.getByRole('navigation', { name: 'Dashboard' }) };
}

describe('BottomTabBar', () => {
  it('shows the five tabs in the design order', () => {
    const { nav } = renderBar();
    expect(within(nav).getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Month', 'Debts', 'Coach', 'Plan', 'Progress',
    ]);
  });

  it('marks only the active tab as current', () => {
    const { nav } = renderBar({ activeTab: 'plan' });
    const current = within(nav).getAllByRole('button').filter((b) => b.getAttribute('aria-current') === 'page');
    expect(current.map((b) => b.textContent)).toEqual(['Plan']);
  });

  it('marks nothing current on a tab the bar does not carry', () => {
    const { nav } = renderBar({ activeTab: 'settings' });
    expect(within(nav).getAllByRole('button').some((b) => b.hasAttribute('aria-current'))).toBe(false);
  });

  it('selects Coach by its unchanged id', () => {
    const { onSelectTab } = renderBar();
    fireEvent.click(screen.getByRole('button', { name: 'Coach' }));
    expect(onSelectTab).toHaveBeenCalledWith('intelligence');
  });

  it('shows the Coach dot with a text equivalent only when asked', () => {
    renderBar({ coachDot: true });
    expect(screen.getByRole('button', { name: 'Coach, new moves' })).toBeTruthy();
  });

  it('renames Intelligence to Coach in the v2 labels only', () => {
    expect(V2_TAB_LABELS.intelligence).toBe('Coach');
    expect(V2_TAB_LABELS.income).toBe('Income & Budget');
  });
});
```

- [ ] **Step 2: Run it and watch it fail.**

Run: `npx vitest run src/__tests__/components/dashboard-v2/BottomTabBar.test.ts`
Expected: FAIL with "Failed to resolve import '@/components/dashboard-v2/shell/BottomTabBar'".

- [ ] **Step 3: Implement.**

```ts
// src/components/dashboard-v2/shell/navItems.ts
import {
  BarChart2,
  Calendar,
  CreditCard,
  Lightbulb,
  TrendingDown,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Tab } from "@/components/dashboard/types";

export interface V2NavItem {
  id: Tab;
  label: string;
  /** Bottom-bar label (10px, five columns). */
  shortLabel: string;
  icon: LucideIcon;
}

/**
 * v2 tab titles. The Coach rename is label-only: the id stays `intelligence`,
 * so deep links (?tab=intelligence) and DASHBOARD_TAB_VIEWED are unchanged.
 */
export const V2_TAB_LABELS: Record<Tab, string> = {
  "this-month": "This Month",
  debts: "My Debts",
  income: "Income & Budget",
  plan: "My Plan",
  progress: "Progress",
  intelligence: "Coach",
  settings: "Settings",
};

export const COACH_TAB = "intelligence" satisfies Tab;

// Icons match the v1 sidebar (DashboardSidebar.tsx).
function item(id: Tab, shortLabel: string, icon: LucideIcon): V2NavItem {
  return { id, label: V2_TAB_LABELS[id], shortLabel, icon };
}

const MONTH = item("this-month", "Month", Calendar);
const DEBTS = item("debts", "Debts", CreditCard);
const INCOME = item("income", "Budget", Wallet);
const PLAN = item("plan", "Plan", TrendingDown);
const PROGRESS = item("progress", "Progress", BarChart2);
const COACH = item(COACH_TAB, "Coach", Lightbulb);

/** Desktop sidebar: 6 items (DESIGN.md 2026-09-12). */
export const SIDEBAR_ITEMS: ReadonlyArray<V2NavItem> = [MONTH, DEBTS, INCOME, PLAN, PROGRESS, COACH];

/**
 * Mobile bottom bar, in the design's order. Income & Budget and Settings are
 * reached from the avatar menu on mobile (D11).
 */
export const BOTTOM_TAB_ITEMS: ReadonlyArray<V2NavItem> = [MONTH, DEBTS, COACH, PLAN, PROGRESS];
```

```tsx
// src/components/dashboard-v2/shell/BottomTabBar.tsx
"use client";

import type { Tab } from "@/components/dashboard/types";
import { BOTTOM_TAB_ITEMS, COACH_TAB } from "./navItems";

interface BottomTabBarProps {
  activeTab: Tab;
  onSelectTab: (tab: Tab) => void;
  coachDot: boolean;
}

/** Mobile navigation (README "Bottom tab bar"): five tabs, 44px targets, safe-area aware. */
export default function BottomTabBar({ activeTab, onSelectTab, coachDot }: BottomTabBarProps) {
  return (
    <nav
      aria-label="Dashboard"
      className="shrink-0 border-t border-border bg-surface px-1 pb-[calc(8px+env(safe-area-inset-bottom))] pt-[7px] min-[769px]:hidden"
    >
      <ul className="grid grid-cols-5">
        {BOTTOM_TAB_ITEMS.map(({ id, shortLabel, icon: Icon }) => {
          const active = activeTab === id;
          const showDot = coachDot && id === COACH_TAB;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onSelectTab(id)}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 w-full flex-col items-center justify-center gap-[3px] rounded-lg py-[5px] text-[10px] outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-action ${
                  active ? "font-extrabold text-action" : "font-bold text-txt-muted"
                }`}
              >
                <span className="relative">
                  <Icon size={16} strokeWidth={active ? 2.2 : 1.7} aria-hidden="true" />
                  {showDot && (
                    <span className="absolute -right-2 -top-1 h-[7px] w-[7px] rounded-full bg-danger" aria-hidden="true" />
                  )}
                </span>
                {shortLabel}
                {showDot && <span className="sr-only">, new moves</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
```

- [ ] **Step 4: Run it and watch it pass.**

Run: `npx vitest run src/__tests__/components/dashboard-v2/BottomTabBar.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit.**

```bash
git add src/components/dashboard-v2/shell/navItems.ts src/components/dashboard-v2/shell/BottomTabBar.tsx src/__tests__/components/dashboard-v2/BottomTabBar.test.ts
git commit -m "feat(dashboard-v2): nav config and mobile bottom tab bar" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Upgrade rail and desktop sidebar

**Files:**
- Create: `src/components/dashboard-v2/shell/UpgradeRail.tsx`, `src/components/dashboard-v2/shell/V2Sidebar.tsx`
- Test: `src/__tests__/components/dashboard-v2/V2Sidebar.test.ts`

**Interfaces:**
- Consumes:
  - `SIDEBAR_ITEMS`, `COACH_TAB` (Task 3)
  - `UpgradeRailSummary`, `upgradeRailCopy` (Task 1)
- Produces:
  - `UpgradeRail` default export, props `{ rail: UpgradeRailSummary; onUpgrade: () => void }`
  - `V2Sidebar` default export, props `{ activeTab: Tab; onSelectTab: (tab: Tab) => void; coachDot: boolean; rail: UpgradeRailSummary | null; onUpgrade: () => void }`

- [ ] **Step 1: Write the failing test.**

```ts
// src/__tests__/components/dashboard-v2/V2Sidebar.test.ts
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import V2Sidebar from '@/components/dashboard-v2/shell/V2Sidebar';

vi.mock('next/image', async () => {
  const { createElement: h } = await import('react');
  return { default: (p: { src: string; alt: string }) => h('img', { src: p.src, alt: p.alt }) };
});

function renderSidebar(props: Partial<Parameters<typeof V2Sidebar>[0]> = {}) {
  const onSelectTab = vi.fn();
  const onUpgrade = vi.fn();
  render(createElement(V2Sidebar, {
    activeTab: 'this-month', onSelectTab, coachDot: false, rail: null, onUpgrade, ...props,
  }));
  return { onSelectTab, onUpgrade, nav: screen.getByRole('navigation', { name: 'Dashboard sections' }) };
}

describe('V2Sidebar', () => {
  it('lists the six v2 items in order, with Coach instead of Intelligence', () => {
    const { nav } = renderSidebar();
    expect(within(nav).getAllByRole('button').map((b) => b.textContent)).toEqual([
      'This Month', 'My Debts', 'Income & Budget', 'My Plan', 'Progress', 'Coach',
    ]);
  });

  it('marks the active item as current', () => {
    renderSidebar({ activeTab: 'debts' });
    expect(screen.getByRole('button', { name: 'My Debts' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('button', { name: 'This Month' }).hasAttribute('aria-current')).toBe(false);
  });

  it('selects Coach by its unchanged id', () => {
    const { onSelectTab } = renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: 'Coach' }));
    expect(onSelectTab).toHaveBeenCalledWith('intelligence');
  });

  it('shows the Coach dot with a text equivalent only when asked', () => {
    renderSidebar({ coachDot: true });
    expect(screen.getByRole('button', { name: 'Coach, new moves' })).toBeTruthy();
  });

  it('shows the upgrade rail with its computed copy and opens the upgrade path', () => {
    const { onUpgrade } = renderSidebar({ rail: { count: 3, perYear: 1648 } });
    expect(screen.getByText('3 moves waiting')).toBeTruthy();
    expect(screen.getByText('$1,648/yr est.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Unlock all 3' }));
    expect(onUpgrade).toHaveBeenCalledTimes(1);
  });

  it('drops the value line when there is no per-year figure', () => {
    renderSidebar({ rail: { count: 1, perYear: null } });
    expect(screen.getByText('1 move waiting')).toBeTruthy();
    expect(screen.queryByText(/\/yr est\./)).toBeNull();
  });

  it('has no rail when there is nothing to unlock', () => {
    renderSidebar({ rail: null });
    expect(screen.queryByText(/waiting/)).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and watch it fail.**

Run: `npx vitest run src/__tests__/components/dashboard-v2/V2Sidebar.test.ts`
Expected: FAIL with "Failed to resolve import '@/components/dashboard-v2/shell/V2Sidebar'".

- [ ] **Step 3: Implement.**

```tsx
// src/components/dashboard-v2/shell/UpgradeRail.tsx
"use client";

import { upgradeRailCopy, type UpgradeRailSummary } from "@/lib/dashboard/upgradeRail";

interface UpgradeRailProps {
  rail: UpgradeRailSummary;
  onUpgrade: () => void;
}

/**
 * Sidebar foot for Free users with gated coach moves (README "Sidebar foot"):
 * persistent and quiet, not a dismissible banner. Ink per DESIGN.md 2026-09-12.
 */
export default function UpgradeRail({ rail, onUpgrade }: UpgradeRailProps) {
  const copy = upgradeRailCopy(rail);
  return (
    <div className="m-3.5 rounded-xl bg-ink p-[13px]">
      <p className="text-pretty text-xs font-bold leading-snug text-white">
        <span>{copy.title}</span>
        {copy.value && (
          <>
            {" · "}
            <span className="mono tabular-nums text-ink-accent">{copy.value}</span>
          </>
        )}
      </p>
      <button
        type="button"
        onClick={onUpgrade}
        className="mt-2.5 min-h-[38px] w-full rounded-lg bg-surface text-[13px] font-extrabold text-ink outline-none transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action"
      >
        {copy.cta}
      </button>
    </div>
  );
}
```

```tsx
// src/components/dashboard-v2/shell/V2Sidebar.tsx
"use client";

import Image from "next/image";
import type { Tab } from "@/components/dashboard/types";
import type { UpgradeRailSummary } from "@/lib/dashboard/upgradeRail";
import { COACH_TAB, SIDEBAR_ITEMS } from "./navItems";
import UpgradeRail from "./UpgradeRail";

interface V2SidebarProps {
  activeTab: Tab;
  onSelectTab: (tab: Tab) => void;
  coachDot: boolean;
  rail: UpgradeRailSummary | null;
  onUpgrade: () => void;
}

/** Desktop navigation: 200px, 6 items, the upgrade rail as its foot (DESIGN.md 2026-09-12). */
export default function V2Sidebar({ activeTab, onSelectTab, coachDot, rail, onUpgrade }: V2SidebarProps) {
  return (
    <aside className="hidden w-[200px] shrink-0 flex-col border-r border-border bg-surface min-[769px]:flex">
      <div className="px-[18px] pb-4 pt-[22px]">
        <a href="/" className="inline-flex rounded-md outline-none focus-visible:outline-2 focus-visible:outline-action">
          <Image src="/logo-dark.svg" alt="SnowballPay" width={130} height={24} priority />
        </a>
      </div>
      <nav aria-label="Dashboard sections" className="flex-1 overflow-y-auto">
        <ul>
          {SIDEBAR_ITEMS.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            const showDot = coachDot && id === COACH_TAB;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onSelectTab(id)}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 w-full items-center gap-2.5 border-l-[3px] px-[15px] py-[11px] text-left text-[13px] outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-action ${
                    active
                      ? "border-action bg-action/10 font-extrabold text-action"
                      : "border-transparent font-semibold text-txt-muted hover:bg-bg hover:text-txt"
                  }`}
                >
                  <Icon size={16} strokeWidth={active ? 2.2 : 1.7} aria-hidden="true" />
                  <span className="flex-1">{label}</span>
                  {showDot && (
                    <>
                      <span className="h-[7px] w-[7px] rounded-full bg-danger" aria-hidden="true" />
                      <span className="sr-only">, new moves</span>
                    </>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      {rail && <UpgradeRail rail={rail} onUpgrade={onUpgrade} />}
    </aside>
  );
}
```

- [ ] **Step 4: Run it and watch it pass.**

Run: `npx vitest run src/__tests__/components/dashboard-v2/V2Sidebar.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit.**

```bash
git add src/components/dashboard-v2/shell/UpgradeRail.tsx src/components/dashboard-v2/shell/V2Sidebar.tsx src/__tests__/components/dashboard-v2/V2Sidebar.test.ts
git commit -m "feat(dashboard-v2): desktop sidebar with Coach dot and upgrade rail" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Avatar menu and header

**Files:**
- Create: `src/components/dashboard-v2/shell/AvatarMenu.tsx`, `src/components/dashboard-v2/shell/V2Header.tsx`
- Test: `src/__tests__/components/dashboard-v2/AvatarMenu.test.ts`, `src/__tests__/components/dashboard-v2/V2Header.test.ts`

**Interfaces:**
- Consumes:
  - `LOGOUT_URL`, `runLogoutClientCleanup` from `@/lib/logout-client`
  - `NotificationPanel` default from `@/components/dashboard/NotificationPanel` (props `{ notifications, onNavigate, onMarkPaid, tabLabels }`)
  - `PlaidLink` from `@/components/plaid/PlaidLink`
  - `V2_TAB_LABELS` (Task 3)
- Produces:
  - `interface ShellUser { name?: string | null; email?: string | null; picture?: string | null }`
  - `AvatarMenu` default export, props `{ user: ShellUser | null; initials: string; onSelectTab: (tab: Tab) => void }`
  - `interface V2HeaderProps { activeTab; onSelectTab; notifications: Notification[]; onNavigate: (tab: Tab, debtId?: string) => void; onMarkPaid: (debtId: string, amount: number, year: number, month: number) => void; user: ShellUser | null; initials: string; plaidEnabled: boolean }`
  - `V2Header` default export

- [ ] **Step 1: Write the failing tests.**

```ts
// src/__tests__/components/dashboard-v2/AvatarMenu.test.ts
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { runLogoutClientCleanup } from '@/lib/logout-client';
import AvatarMenu from '@/components/dashboard-v2/shell/AvatarMenu';

vi.mock('next/image', async () => {
  const { createElement: h } = await import('react');
  return { default: (p: { src: string; alt: string }) => h('img', { src: p.src, alt: p.alt }) };
});
vi.mock('@/lib/logout-client', () => ({ LOGOUT_URL: '/auth/logout', runLogoutClientCleanup: vi.fn() }));

function renderMenu() {
  const onSelectTab = vi.fn();
  render(createElement(AvatarMenu, {
    user: { name: 'Test User', email: 't@example.com', picture: null }, initials: 'TE', onSelectTab,
  }));
  const trigger = screen.getByRole('button', { name: 'Account menu' });
  return { onSelectTab, trigger };
}

describe('AvatarMenu', () => {
  it('starts closed', () => {
    const { trigger } = renderMenu();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('opens with Income & Budget, Settings and Sign out, focusing the first', () => {
    const { trigger } = renderMenu();
    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const items = screen.getAllByRole('menuitem');
    expect(items.map((i) => i.textContent)).toEqual(['Income & Budget', 'Settings', 'Sign out']);
    expect(document.activeElement).toBe(items[0]);
  });

  it('navigates, closes and returns focus to the trigger', () => {
    const { onSelectTab, trigger } = renderMenu();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Settings' }));
    expect(onSelectTab).toHaveBeenCalledWith('settings');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('moves focus with the arrow keys and closes on Escape', () => {
    const { trigger } = renderMenu();
    fireEvent.click(trigger);
    const menu = screen.getByRole('menu');
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Settings' }));
    fireEvent.keyDown(menu, { key: 'ArrowUp' });
    fireEvent.keyDown(menu, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Sign out' }));
    fireEvent.keyDown(menu, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('closes on a press outside', () => {
    const { trigger } = renderMenu();
    fireEvent.click(trigger);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('signs out through the shared logout URL and cleanup', () => {
    const { trigger } = renderMenu();
    fireEvent.click(trigger);
    const signOut = screen.getByRole('menuitem', { name: 'Sign out' });
    expect(signOut.getAttribute('href')).toBe('/auth/logout');
    fireEvent.click(signOut);
    expect(runLogoutClientCleanup).toHaveBeenCalledTimes(1);
  });
});
```

```ts
// src/__tests__/components/dashboard-v2/V2Header.test.ts
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import type { Tab } from '@/components/dashboard/types';
import NotificationPanel from '@/components/dashboard/NotificationPanel';
import V2Header from '@/components/dashboard-v2/shell/V2Header';
import { V2_TAB_LABELS } from '@/components/dashboard-v2/shell/navItems';

vi.mock('next/image', async () => {
  const { createElement: h } = await import('react');
  return { default: (p: { src: string; alt: string }) => h('img', { src: p.src, alt: p.alt }) };
});
vi.mock('@/components/dashboard/NotificationPanel', () => ({ default: vi.fn(() => null) }));
vi.mock('@/components/plaid/PlaidLink', async () => {
  const { createElement: h } = await import('react');
  return { PlaidLink: () => h('button', { type: 'button', className: 'plaid-link-btn' }, 'Link bank') };
});
vi.mock('@/lib/logout-client', () => ({ LOGOUT_URL: '/auth/logout', runLogoutClientCleanup: vi.fn() }));

function renderHeader(overrides: { activeTab?: Tab; plaidEnabled?: boolean } = {}) {
  render(createElement(V2Header, {
    activeTab: overrides.activeTab ?? 'this-month',
    onSelectTab: vi.fn(),
    notifications: [],
    onNavigate: vi.fn(),
    onMarkPaid: vi.fn(),
    user: { name: 'Test User', email: 't@example.com', picture: null },
    initials: 'TE',
    plaidEnabled: overrides.plaidEnabled ?? false,
  }));
}

describe('V2Header', () => {
  it('titles the page with the v2 label (Coach, not Intelligence)', () => {
    renderHeader({ activeTab: 'intelligence' });
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Coach');
  });

  it('shows Link bank only when bank sync is available', () => {
    renderHeader({ plaidEnabled: false });
    expect(screen.queryByRole('button', { name: 'Link bank' })).toBeNull();
  });

  it('keeps Link bank for users who can link', () => {
    renderHeader({ plaidEnabled: true });
    expect(screen.getByRole('button', { name: 'Link bank' })).toBeTruthy();
  });

  it('gives the notification panel the v2 labels', () => {
    renderHeader();
    expect(vi.mocked(NotificationPanel).mock.calls[0][0].tabLabels).toBe(V2_TAB_LABELS);
  });

  it('carries the account menu', () => {
    renderHeader();
    expect(screen.getByRole('button', { name: 'Account menu' })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run them and watch them fail.**

Run: `npx vitest run src/__tests__/components/dashboard-v2/AvatarMenu.test.ts src/__tests__/components/dashboard-v2/V2Header.test.ts`
Expected: FAIL with unresolved imports for `AvatarMenu` and `V2Header`.

- [ ] **Step 3: Implement.**

```tsx
// src/components/dashboard-v2/shell/AvatarMenu.tsx
"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import Image from "next/image";
import { LogOut, Settings, Wallet } from "lucide-react";
import type { Tab } from "@/components/dashboard/types";
import { LOGOUT_URL, runLogoutClientCleanup } from "@/lib/logout-client";

export interface ShellUser {
  name?: string | null;
  email?: string | null;
  picture?: string | null;
}

interface AvatarMenuProps {
  user: ShellUser | null;
  initials: string;
  onSelectTab: (tab: Tab) => void;
}

const ITEM =
  "flex min-h-11 w-full items-center gap-2.5 px-3.5 text-left text-[13px] font-semibold text-txt outline-none hover:bg-bg focus-visible:bg-bg";

/** Account menu (spec §8.3): Income & Budget and Settings, which have no bottom-bar tab, and Sign out. */
export default function AvatarMenu({ user, initials, onSelectTab }: AvatarMenuProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    if (!open) return;
    itemRefs.current[0]?.focus();
    const onPointerDown = (event: Event) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const closeAndRefocus = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const select = (tab: Tab) => {
    onSelectTab(tab);
    closeAndRefocus();
  };

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = itemRefs.current.filter((el): el is HTMLElement => el !== null);
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === "Escape") {
      event.preventDefault();
      closeAndRefocus();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      items[(index + 1) % items.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      items[(index - 1 + items.length) % items.length]?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        className="flex h-11 w-11 items-center justify-center rounded-full outline-none focus-visible:outline-2 focus-visible:outline-action"
      >
        {user?.picture ? (
          <Image
            src={user.picture}
            alt=""
            width={30}
            height={30}
            referrerPolicy="no-referrer"
            className="h-[30px] w-[30px] rounded-full object-cover"
          />
        ) : (
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-action/10 text-[11px] font-extrabold text-action">
            {initials}
          </span>
        )}
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 top-full z-50 mt-1.5 w-56 overflow-hidden rounded-xl border border-border bg-surface py-1.5 shadow-float"
        >
          <button
            ref={(el) => { itemRefs.current[0] = el; }}
            role="menuitem"
            type="button"
            tabIndex={-1}
            onClick={() => select("income")}
            className={ITEM}
          >
            <Wallet size={16} strokeWidth={1.7} aria-hidden="true" />
            Income &amp; Budget
          </button>
          <button
            ref={(el) => { itemRefs.current[1] = el; }}
            role="menuitem"
            type="button"
            tabIndex={-1}
            onClick={() => select("settings")}
            className={ITEM}
          >
            <Settings size={16} strokeWidth={1.7} aria-hidden="true" />
            Settings
          </button>
          <a
            ref={(el) => { itemRefs.current[2] = el; }}
            role="menuitem"
            tabIndex={-1}
            href={LOGOUT_URL}
            onClick={runLogoutClientCleanup}
            className={`${ITEM} border-t border-border text-txt-muted`}
          >
            <LogOut size={16} strokeWidth={1.7} aria-hidden="true" />
            Sign out
          </a>
        </div>
      )}
    </div>
  );
}
```

```tsx
// src/components/dashboard-v2/shell/V2Header.tsx
"use client";

import Image from "next/image";
import type { Notification, Tab } from "@/components/dashboard/types";
import NotificationPanel from "@/components/dashboard/NotificationPanel";
import { PlaidLink } from "@/components/plaid/PlaidLink";
import AvatarMenu, { type ShellUser } from "./AvatarMenu";
import { V2_TAB_LABELS } from "./navItems";

export interface V2HeaderProps {
  activeTab: Tab;
  onSelectTab: (tab: Tab) => void;
  notifications: Notification[];
  onNavigate: (tab: Tab, debtId?: string) => void;
  onMarkPaid: (debtId: string, amount: number, year: number, month: number) => void;
  user: ShellUser | null;
  initials: string;
  plaidEnabled: boolean;
}

// PlaidLink's header button takes its spacing from its parent (v1 sets it in
// DashboardClient's <style>). Same values: labeled down to 480px, icon-only on phones.
const PLAID_SLOT =
  "[&_.plaid-link-btn]:gap-[7px] [&_.plaid-link-btn]:px-3.5 [&_.plaid-link-btn]:py-2 max-[768px]:[&_.plaid-link-btn]:gap-1.5 max-[768px]:[&_.plaid-link-btn]:px-3 max-[479px]:[&_.plaid-link-btn]:gap-0 max-[479px]:[&_.plaid-link-btn]:rounded-full max-[479px]:[&_.plaid-link-btn]:p-2.5 max-[479px]:[&_.plaid-link-label]:hidden";

/** 56px header (spec §8.3): title on desktop, wordmark on mobile; bell, Link bank (unchanged gate), account menu. */
export default function V2Header({
  activeTab,
  onSelectTab,
  notifications,
  onNavigate,
  onMarkPaid,
  user,
  initials,
  plaidEnabled,
}: V2HeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4 min-[769px]:px-[26px]">
      <a href="/" aria-label="SnowballPay home" className="shrink-0 min-[769px]:hidden">
        <Image src="/logo-dark.svg" alt="" width={120} height={22} priority />
      </a>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-extrabold tracking-[-0.02em] text-txt max-[768px]:sr-only">
          {V2_TAB_LABELS[activeTab]}
        </h1>
      </div>
      <div className={`flex shrink-0 items-center gap-2 ${PLAID_SLOT}`}>
        <NotificationPanel
          notifications={notifications}
          tabLabels={V2_TAB_LABELS}
          onNavigate={onNavigate}
          onMarkPaid={onMarkPaid}
        />
        {plaidEnabled && <PlaidLink />}
        <AvatarMenu user={user} initials={initials} onSelectTab={onSelectTab} />
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Run them and watch them pass.**

Run: `npx vitest run src/__tests__/components/dashboard-v2/AvatarMenu.test.ts src/__tests__/components/dashboard-v2/V2Header.test.ts`
Expected: PASS (6 + 5 tests). A jsdom "Not implemented: navigation" console line from the Sign out click is expected noise, not a failure.

- [ ] **Step 5: Commit.**

```bash
git add src/components/dashboard-v2/shell/AvatarMenu.tsx src/components/dashboard-v2/shell/V2Header.tsx src/__tests__/components/dashboard-v2/AvatarMenu.test.ts src/__tests__/components/dashboard-v2/V2Header.test.ts
git commit -m "feat(dashboard-v2): header with account menu" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Coach dot state and the shell layout

**Files:**
- Create: `src/components/dashboard-v2/shell/useCoachDot.ts`, `src/components/dashboard-v2/shell/V2Shell.tsx`
- Test: `src/__tests__/components/dashboard-v2/useCoachDot.test.ts`, `src/__tests__/components/dashboard-v2/V2Shell.test.ts`

**Interfaces:**
- Consumes:
  - Task 1: `COACH_SEEN_STORAGE_KEY`, `coachMovesFingerprint`, `shouldShowCoachDot`, `computeUpgradeRail`
  - `useDashboardInsights()` from `@/lib/hooks` (returns `UseQueryResult<DashboardInsights>`)
  - `upgradeEvents.dispatch(feature: string)` from `@/lib/upgradeEvents`
  - Tasks 3–5: `V2Sidebar`, `V2Header` + `V2HeaderProps`, `BottomTabBar`, `COACH_TAB`
- Produces:
  - `useCoachDot(moves: ReadonlyArray<CoachMove> | undefined, coachOpen: boolean): boolean`
  - `interface V2ShellProps extends V2HeaderProps { banner?: ReactNode; overlays?: ReactNode; children: ReactNode }`
  - `V2Shell` default export
  - On its root element, the CSS variable `--v2-tabbar-offset`: `calc(61px + env(safe-area-inset-bottom))` on mobile, `0px` from 769px

- [ ] **Step 1: Write the failing tests.**

```ts
// src/__tests__/components/dashboard-v2/useCoachDot.test.ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { CoachMove } from '@/lib/dashboard/types';
import { COACH_SEEN_STORAGE_KEY } from '@/lib/dashboard/coachDot';
import { useCoachDot } from '@/components/dashboard-v2/shell/useCoachDot';
import { makeCallAprMove, makeLogMissedMove } from '../../lib/dashboard/fixtures';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

type Props = { moves: ReadonlyArray<CoachMove> | undefined; open: boolean };

describe('useCoachDot', () => {
  it('is off while moves are loading', () => {
    const { result } = renderHook(() => useCoachDot(undefined, false));
    expect(result.current).toBe(false);
  });

  it('is on for unseen moves, clears when Coach opens, and stays cleared', () => {
    const moves = [makeLogMissedMove('Sep', 2)];
    const { result, rerender } = renderHook(({ moves: m, open }: Props) => useCoachDot(m, open), {
      initialProps: { moves, open: false },
    });
    expect(result.current).toBe(true);
    rerender({ moves, open: true });
    expect(result.current).toBe(false);
    expect(localStorage.getItem(COACH_SEEN_STORAGE_KEY)).toBe('log_missed:Sep');
    rerender({ moves, open: false });
    expect(result.current).toBe(false);
  });

  it('treats a stored fingerprint as seen', () => {
    localStorage.setItem(COACH_SEEN_STORAGE_KEY, 'log_missed:Sep');
    const { result } = renderHook(() => useCoachDot([makeLogMissedMove('Sep', 4)], false));
    expect(result.current).toBe(false);
  });

  it('comes back for a new move set', () => {
    localStorage.setItem(COACH_SEEN_STORAGE_KEY, 'log_missed:Sep');
    const { result } = renderHook(() => useCoachDot([makeLogMissedMove('Sep', 2), makeCallAprMove('c1', 300)], false));
    expect(result.current).toBe(true);
  });

  it('still clears for the session when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    const moves = [makeLogMissedMove('Sep', 2)];
    const { result, rerender } = renderHook(({ moves: m, open }: Props) => useCoachDot(m, open), {
      initialProps: { moves, open: false },
    });
    expect(result.current).toBe(true);
    rerender({ moves, open: true });
    rerender({ moves, open: false });
    expect(result.current).toBe(false);
  });
});
```

```ts
// src/__tests__/components/dashboard-v2/V2Shell.test.ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Tab } from '@/components/dashboard/types';
import type { DashboardInsights } from '@/lib/dashboard/types';
import { useDashboardInsights } from '@/lib/hooks';
import { upgradeEvents } from '@/lib/upgradeEvents';
import V2Shell from '@/components/dashboard-v2/shell/V2Shell';
import { makeCallAprMove, makeLogMissedMove } from '../../lib/dashboard/fixtures';

vi.mock('@/lib/hooks', () => ({ useDashboardInsights: vi.fn() }));
vi.mock('next/image', async () => {
  const { createElement: h } = await import('react');
  return { default: (p: { src: string; alt: string }) => h('img', { src: p.src, alt: p.alt }) };
});
vi.mock('@/components/dashboard/NotificationPanel', () => ({ default: () => null }));
vi.mock('@/components/plaid/PlaidLink', () => ({ PlaidLink: () => null }));
vi.mock('@/lib/logout-client', () => ({ LOGOUT_URL: '/auth/logout', runLogoutClientCleanup: vi.fn() }));

function insights(overrides: Partial<DashboardInsights> = {}): DashboardInsights {
  return {
    asOf: { year: 2026, month: 8, day: 14 },
    tier: { proEligible: false, paidPro: false, trial: { active: false, endsAt: null } },
    readiness: { steps: [], completeCount: 0, percent: 0 },
    interest: null,
    paymentGap: null,
    coachMoves: [],
    rateWatch: null,
    strategy: null,
    planGap: null,
    progress: null,
    plan: null,
    ...overrides,
  };
}

const MOVES = [makeLogMissedMove('Sep', 2), makeCallAprMove('c1', 742.9)];

function renderShell(activeTab: Tab, data: DashboardInsights | undefined) {
  vi.mocked(useDashboardInsights).mockReturnValue({ data } as unknown as ReturnType<typeof useDashboardInsights>);
  const props = {
    activeTab,
    onSelectTab: vi.fn(),
    notifications: [],
    onNavigate: vi.fn(),
    onMarkPaid: vi.fn(),
    user: { name: 'Test User', email: 't@example.com', picture: null },
    initials: 'TE',
    plaidEnabled: false,
    banner: createElement('div', null, 'Trial banner'),
    children: createElement('p', null, 'Tab content'),
  };
  const view = render(createElement(V2Shell, props));
  const setTab = (tab: Tab) => view.rerender(createElement(V2Shell, { ...props, activeTab: tab }));
  return { ...view, props, setTab };
}

afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('V2Shell', () => {
  it('puts the banner, then the tab content, inside the scroll area', () => {
    renderShell('this-month', insights());
    expect(screen.getByRole('main').textContent).toBe('Trial bannerTab content');
  });

  it('shows the upgrade rail for a Free user with gated moves and opens the upgrade modal', () => {
    const seen: string[] = [];
    const unsubscribe = upgradeEvents.subscribe((feature) => seen.push(feature));
    renderShell('this-month', insights({ coachMoves: MOVES }));
    expect(screen.getByText('1 move waiting')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Unlock the move' }));
    expect(seen).toEqual(['Coach moves']);
    unsubscribe();
  });

  it('shows no rail to Pro users', () => {
    renderShell('this-month', insights({
      coachMoves: MOVES.map((m) => ({ ...m, isFree: true })),
      tier: { proEligible: true, paidPro: true, trial: { active: false, endsAt: null } },
    }));
    expect(screen.queryByText(/waiting/)).toBeNull();
  });

  it('renders the full shell without insights (loading or failed): no rail, no dot', () => {
    renderShell('this-month', undefined);
    expect(screen.getByRole('navigation', { name: 'Dashboard' })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Dashboard sections' })).toBeTruthy();
    expect(screen.queryByText(/waiting/)).toBeNull();
    expect(screen.queryAllByText(', new moves')).toHaveLength(0);
  });

  it('shows the Coach dot on both navs until Coach is opened', () => {
    const { setTab } = renderShell('this-month', insights({ coachMoves: MOVES }));
    expect(screen.getAllByText(', new moves')).toHaveLength(2);
    setTab('intelligence');
    expect(screen.queryAllByText(', new moves')).toHaveLength(0);
    setTab('this-month');
    expect(screen.queryAllByText(', new moves')).toHaveLength(0);
  });

  it('resets the scroll area to the top on a tab change', () => {
    const { setTab } = renderShell('this-month', insights());
    const main = screen.getByRole('main');
    Object.defineProperty(main, 'scrollTop', { value: 300, writable: true, configurable: true });
    setTab('debts');
    expect(main.scrollTop).toBe(0);
  });
});
```

- [ ] **Step 2: Run them and watch them fail.**

Run: `npx vitest run src/__tests__/components/dashboard-v2/useCoachDot.test.ts src/__tests__/components/dashboard-v2/V2Shell.test.ts`
Expected: FAIL with unresolved imports for `useCoachDot` and `V2Shell`.

- [ ] **Step 3: Implement.**

```ts
// src/components/dashboard-v2/shell/useCoachDot.ts
"use client";

import { useEffect, useMemo, useState } from "react";
import type { CoachMove } from "@/lib/dashboard/types";
import {
  COACH_SEEN_STORAGE_KEY,
  coachMovesFingerprint,
  shouldShowCoachDot,
} from "@/lib/dashboard/coachDot";

function readSeen(): string | null {
  try {
    return localStorage.getItem(COACH_SEEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Coach dot (spec §8.3): on while the current move set differs from the last
 * one seen on Coach; opening Coach marks it seen. If storage is blocked, the
 * in-memory state still clears the dot for this session.
 */
export function useCoachDot(moves: ReadonlyArray<CoachMove> | undefined, coachOpen: boolean): boolean {
  const fingerprint = useMemo(() => (moves ? coachMovesFingerprint(moves) : null), [moves]);
  const [lastSeen, setLastSeen] = useState<string | null>(readSeen);

  useEffect(() => {
    if (!coachOpen || fingerprint === null) return;
    setLastSeen(fingerprint);
    try {
      localStorage.setItem(COACH_SEEN_STORAGE_KEY, fingerprint);
    } catch {
      // Storage blocked: the state above keeps the dot cleared this session.
    }
  }, [coachOpen, fingerprint]);

  return !coachOpen && shouldShowCoachDot(fingerprint, lastSeen);
}
```

```tsx
// src/components/dashboard-v2/shell/V2Shell.tsx
"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useDashboardInsights } from "@/lib/hooks";
import { computeUpgradeRail } from "@/lib/dashboard/upgradeRail";
import { upgradeEvents } from "@/lib/upgradeEvents";
import BottomTabBar from "./BottomTabBar";
import { COACH_TAB } from "./navItems";
import { useCoachDot } from "./useCoachDot";
import V2Header, { type V2HeaderProps } from "./V2Header";
import V2Sidebar from "./V2Sidebar";

/** Opens UpgradeModal with its coach copy (upgradeMessaging.ts). PR 6 swaps in the trial sheet. */
const RAIL_UPGRADE_FEATURE = "Coach moves";

export interface V2ShellProps extends V2HeaderProps {
  /** Above the tab content, inside the scroll area (the trial banner until PR 6). */
  banner?: ReactNode;
  /** Fixed layers (toasts) that read --v2-tabbar-offset to clear the bottom bar. */
  overlays?: ReactNode;
  children: ReactNode;
}

/**
 * Dashboard v2 frame (spec §8.3). One scroll model at every width: a 100dvh
 * row where only <main> scrolls, so the header and both navs stay put. Every
 * direct child of the scroll area is shrink-0 (README "Mobile shell").
 */
export default function V2Shell({ banner, overlays, children, ...header }: V2ShellProps) {
  const { activeTab, onSelectTab } = header;
  const { data: insights } = useDashboardInsights();
  const coachDot = useCoachDot(insights?.coachMoves, activeTab === COACH_TAB);
  const rail = computeUpgradeRail(insights);
  const mainRef = useRef<HTMLElement>(null);

  // Tab switches are state, not navigations, and the scroll area (not the
  // window) holds the position, so reset it the way a new page would.
  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [activeTab]);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-bg [--v2-tabbar-offset:calc(61px+env(safe-area-inset-bottom))] min-[769px]:[--v2-tabbar-offset:0px]">
      <V2Sidebar
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        coachDot={coachDot}
        rail={rail}
        onUpgrade={() => upgradeEvents.dispatch(RAIL_UPGRADE_FEATURE)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <V2Header {...header} />
        <main ref={mainRef} className="flex flex-1 flex-col overflow-y-auto overscroll-contain">
          {banner && <div className="shrink-0">{banner}</div>}
          <div className="w-full shrink-0 px-3.5 py-3 min-[769px]:px-[26px] min-[769px]:py-5">{children}</div>
        </main>
        <BottomTabBar activeTab={activeTab} onSelectTab={onSelectTab} coachDot={coachDot} />
      </div>
      {overlays}
    </div>
  );
}
```

- [ ] **Step 4: Run them and watch them pass.**

Run: `npx vitest run src/__tests__/components/dashboard-v2/useCoachDot.test.ts src/__tests__/components/dashboard-v2/V2Shell.test.ts`
Expected: PASS (5 + 6 tests).

- [ ] **Step 5: Mutation proof.** In `useCoachDot.ts`, temporarily return `shouldShowCoachDot(fingerprint, lastSeen)` without the `!coachOpen &&` guard. Confirm "shows the Coach dot on both navs until Coach is opened" or the hook's clear test fails, then restore it. The file is untracked, so rerun Step 4 and expect PASS.

- [ ] **Step 6: Commit.**

```bash
git add src/components/dashboard-v2/shell/useCoachDot.ts src/components/dashboard-v2/shell/V2Shell.tsx src/__tests__/components/dashboard-v2/useCoachDot.test.ts src/__tests__/components/dashboard-v2/V2Shell.test.ts
git commit -m "feat(dashboard-v2): shell layout with Coach dot and upgrade rail wiring" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Wire the flag (page → DashboardClient → V2Shell)

**Files:**
- Modify: `src/components/ToastNotifications.tsx` (`Props` and the container's `bottom`)
- Modify: `src/components/DashboardClient.tsx` (props; shared content; v2 branch)
- Modify: `src/app/dashboard/page.tsx` (pass the flag)
- Test: `src/__tests__/components/dashboard-v2/DashboardClient.flag.test.ts` (extend)

**Interfaces:**
- Consumes:
  - `V2Shell` (Task 6)
  - `isDashboardV2(email, raw?)` from `@/lib/flags` (PR 1)
- Produces:
  - `DashboardClient` props `{ user; plaidTestAccess?; dashboardV2?: boolean }` (default `false`)
  - `ToastNotifications` props `{ debts; bottom?: string }` (default `'24px'`)

- [ ] **Step 1: Write the failing tests.** Append to `DashboardClient.flag.test.ts`, and add these imports at the top: `import { useDashboardInsights } from '@/lib/hooks';` and `import ToastNotifications from '@/components/ToastNotifications';`.

```ts
describe('DashboardClient flag wiring', () => {
  it('renders identical markup when the flag is explicitly off', () => {
    const implicit = renderToStaticMarkup(createElement(DashboardClient, { user: USER }));
    const explicit = renderToStaticMarkup(createElement(DashboardClient, { user: USER, dashboardV2: false }));
    expect(explicit).toBe(implicit);
  });

  it('never asks for dashboard insights with the flag off', () => {
    renderToStaticMarkup(createElement(DashboardClient, { user: USER, dashboardV2: false }));
    expect(useDashboardInsights).not.toHaveBeenCalled();
  });

  it('renders the v2 shell around the same tab content with the flag on', () => {
    const html = renderToStaticMarkup(createElement(DashboardClient, { user: USER, dashboardV2: true }));
    expect(html).not.toContain('db-sidebar');
    expect(html).toContain('aria-label="Dashboard sections"');
    expect(html).toContain('aria-label="Dashboard"');
    expect(html).toContain('data-stub="ThisMonthTab"');
    expect(html).toContain('data-stub="TrialCountdownBanner"');
    expect(useDashboardInsights).toHaveBeenCalled();
  });

  it('lifts toasts above the bottom bar only in v2', () => {
    renderToStaticMarkup(createElement(DashboardClient, { user: USER, dashboardV2: true }));
    expect(vi.mocked(ToastNotifications).mock.calls.at(-1)?.[0]).toMatchObject({
      bottom: 'calc(24px + var(--v2-tabbar-offset, 0px))',
    });
    vi.mocked(ToastNotifications).mockClear();
    renderToStaticMarkup(createElement(DashboardClient, { user: USER }));
    expect(vi.mocked(ToastNotifications).mock.calls.at(-1)?.[0]).not.toHaveProperty('bottom');
  });
});
```

- [ ] **Step 2: Run it and watch the new cases fail.**

Run: `npx vitest run src/__tests__/components/dashboard-v2/DashboardClient.flag.test.ts`
Expected:
- The two snapshot tests PASS.
- "renders the v2 shell…" FAILS: the markup still contains `db-sidebar`, because `dashboardV2` is ignored.
- The toast case FAILS.
- The first two wiring cases already pass. They are regression guards.

- [ ] **Step 3: Add the toast offset.** In `src/components/ToastNotifications.tsx`:
- Add `bottom?: string;` to the `Props` interface/type, with the doc comment `/** CSS bottom offset. v2 lifts toasts above its mobile bottom bar. */`.
- Change the signature to `export default function ToastNotifications({ debts, bottom = '24px' }: Props) {`.
- In the container style, replace `bottom: '24px',` with `bottom,`.

- [ ] **Step 4: Wire `DashboardClient`.** Edit `src/components/DashboardClient.tsx` so the v1 tree is unchanged.

4a. Add the import after the other dashboard imports:

```tsx
import V2Shell from "@/components/dashboard-v2/shell/V2Shell";
```

4b. Replace the component signature:

```tsx
export default function DashboardClient({
  user,
  plaidTestAccess = false,
  dashboardV2 = false,
}: {
  user: UserInfo | null;
  plaidTestAccess?: boolean;
  /** Dashboard v2 shell (spec §5.3), decided server-side by isDashboardV2. */
  dashboardV2?: boolean;
}) {
```

4c. Insert this right before the final v1 `return (` (after the account-error early return). Move the three children of `<main>` into `mainContent` **verbatim**, the `UpgradeModal` block into `upgradeModalNode`, and the idle `warning` dialog into `idleDialog`. Cut and paste only; change nothing inside them.

```tsx
  const handleNavigate = (tab: Tab, debtId?: string) => {
    setActiveTab(tab);
    if (debtId) setOpenPaymentDebtId(debtId);
  };
  const handleMarkPaid = (debtId: string, amount: number, year: number, month: number) =>
    markPaid.mutate({ debtId, amount, dueYear: year, dueMonth: month });

  // Shared by both shells: the prompts above the tab, then the active tab.
  const mainContent = (
    <>
      {/* ...the LinkBankPrompt block, the MilestoneWidget block and the
          <div key={activeTab} className="tab-fade-in"> block, moved here
          verbatim from inside <main>... */}
    </>
  );

  const upgradeModalNode = upgradeModal.open && (
    <UpgradeModal
      feature={upgradeModal.feature}
      interestAtStake={interestAtStake}
      onClose={() => setUpgradeModal({ open: false })}
    />
  );

  const idleDialog = warning && (
    /* ...the <div role="dialog" aria-labelledby="idle-title"> block, moved here verbatim... */
  );

  if (dashboardV2) {
    return (
      <>
        <V2Shell
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          notifications={notifications}
          onNavigate={handleNavigate}
          onMarkPaid={handleMarkPaid}
          user={user}
          initials={initials}
          plaidEnabled={plaidEnabled}
          banner={<TrialCountdownBanner sub={subData} hasLinkedBankDebt={hasLinkedBankDebt} />}
          overlays={<ToastNotifications debts={debts} bottom="calc(24px + var(--v2-tabbar-offset, 0px))" />}
        >
          {mainContent}
        </V2Shell>
        {upgradeModalNode}
        {idleDialog}
      </>
    );
  }
```

The two `/* ... */` placeholders above are instructions, not code. The executor pastes the existing blocks there unchanged, so the file compiles with the real JSX.

4d. In the v1 `return`:
- Use `onNavigate={handleNavigate}` and `onMarkPaid={handleMarkPaid}` on `DashboardHeader`, replacing the two inline arrows (same behavior).
- Make `<main …>` contain only `{mainContent}`.
- Replace the moved `UpgradeModal` expression with `{upgradeModalNode}` and the moved idle dialog with `{idleDialog}`.
- Leave everything else in the v1 tree exactly where it is, in the same order: `DashboardSidebar`, `.db-main`, the banner, `<ToastNotifications debts={debts} />` with no `bottom`, and the `<style>` block.

- [ ] **Step 5: Pass the flag from the page.** In `src/app/dashboard/page.tsx`, add `import { isDashboardV2 } from '@/lib/flags';` and change the client render to:

```tsx
      <DashboardClient
        user={user}
        plaidTestAccess={isPlaidAllowed(user?.email)}
        dashboardV2={isDashboardV2(user?.email)}
      />
```

- [ ] **Step 6: Run the file and the whole suite.**

Run: `npx vitest run src/__tests__/components/dashboard-v2/DashboardClient.flag.test.ts`
Expected: PASS (6 tests), **with the two original snapshots matching unmodified**. If a snapshot differs, the refactor changed v1. Fix the code; never update the snapshot.

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Mutation proof.** Prove the snapshot guards v1:
  - Temporarily delete `className="db-main"` from the v1 content column in `DashboardClient.tsx` and confirm the snapshot test FAILS.
  - Temporarily change the v1 `<ToastNotifications debts={debts} />` to pass `bottom="24px"` and confirm "lifts toasts above the bottom bar only in v2" FAILS.
  - Restore both by hand (never with `git checkout`, which would discard the uncommitted Step 3–5 work). Rerun Step 6 and expect PASS with the snapshots unmodified.

  The toast's default offset itself isn't in the snapshot, because the toast is stubbed. Review and the preview cover it.

- [ ] **Step 8: Types and lint.**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -v "src/__tests__/lib/stripe.test.ts"`
Expected: no output.
Run: `npm run lint`
Expected: no new warnings in the touched files.

- [ ] **Step 9: Commit.**

```bash
git add src/components/ToastNotifications.tsx src/components/DashboardClient.tsx src/app/dashboard/page.tsx src/__tests__/components/dashboard-v2/DashboardClient.flag.test.ts
git commit -m "feat(dashboard-v2): render the v2 shell behind DASHBOARD_V2_USERS" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Verification, spec sync and the pull request

**Files:**
- Modify: `docs/superpowers/specs/2026-09-12-dashboard-pro-upgrade-design.md` (§8.3 Shell bullet)

- [ ] **Step 1: Patch the spec.** In §8.3, under the **Shell** bullet, append a sub-bullet:

```markdown
  - **PR 2 decisions (2026-09-14):**
    - Layout:
      - The mobile shell applies at ≤768px, matching v1 and the tabs' own CSS.
      - There is one scroll model at every width: only `<main>` scrolls.
      - Settings and Sign out live only in the avatar menu.
      - `TrialCountdownBanner` stays at the top of the scroll area until PR 6.
      - Toasts clear the bottom bar via `--v2-tabbar-offset`.
    - Upgrade rail:
      - It shows to Free users with at least one gated move.
      - Copy: "{n} moves waiting · ${perYear}/yr est." The per-year figure counts per-year values only (X7) and hides under $1.
      - CTA "Unlock all {n}" ("Unlock the move" for one) opens the existing `UpgradeModal` with its coach copy. PR 6 swaps in "Try Pro free" for trial-eligible users.
    - Coach dot:
      - Its fingerprint is the move set's identity (month for `log_missed`, card for `call_apr`, alternative for `switch_strategy`), not its amounts.
      - It is stored under `sp_coach_seen`, which sign-out clears.
```

Commit:

```bash
git add docs/superpowers/specs/2026-09-12-dashboard-pro-upgrade-design.md
git commit -m "docs(spec): record dashboard v2 shell decisions" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 2: Run the full local checks.**

Run: `npm run lint`, then `npm run build`, then `npm test`
Expected: all pass. Report any failure verbatim and fix it; never skip one.

- [ ] **Step 3: Run the baseline gate** (parent plan Task 0, `~/.gstack/projects/vronney-snowball-pay/baseline/README.md`).
Expected: `DIFFERENT=0 missing=0 inputsChanged=0`. PR 2 changes no calculation, so any difference means the gate or its inputs moved. Investigate before continuing.

- [ ] **Step 4: Code review.** Dispatch the `typescript-reviewer` and `code-reviewer` agents in parallel on `git diff main...HEAD`. Add one design-compliance pass against `DESIGN.md` covering:
  - blue only on active or CTA
  - radius hierarchy
  - no hexes beyond the existing focus convention
  - 44px targets
  - no dashed borders

Fix every CRITICAL and HIGH finding (with a test first when it is a behavior bug), and MEDIUM where cheap. Rerun Step 2 after any change.

- [ ] **Step 5: Preview with the flag on.**
  1. Ask the user to add `DASHBOARD_V2_USERS=<their account email>` to `.env.local` themselves. The file holds secrets, so don't read or edit it.
  2. Start the `budget-dev` launch config with `preview_start`.
  3. The user signs in within the Browser pane. Never type credentials.
  4. This is production data, so look but don't act: no logging, saving or linking. When checking the upgrade modal, close it; never press its checkout button.

  At 375, 768 and 1280 (`resize_window`), take a screenshot of each and confirm:
  - **375 / 768:**
    - The bottom bar shows Month · Debts · Coach · Plan · Progress, with the active tab in blue.
    - No hamburger, and no sidebar.
    - The header shows the wordmark, the bell, Link bank (paid or allowlisted users only; icon-only at 375) and the avatar.
    - The avatar menu opens with Income & Budget / Settings / Sign out, and choosing Income & Budget opens that tab.
    - Cards scroll inside the content area, the bottom bar doesn't move, and the last card isn't hidden behind the bar.
  - **1280:**
    - The sidebar is 200px with six items, the active item has the blue left rule, and the page title is in the header.
    - For a Free account with gated moves, the ink rail appears at the sidebar foot and its CTA opens the upgrade modal with the coach copy. For a Pro or trial account, there is no rail.
  - **Coach dot:** visible when moves exist and unseen. Open Coach and it disappears; reload and it stays gone.
  - **Keyboard:**
    - Tab reaches every nav item with a visible focus ring.
    - The avatar menu opens with Enter, moves with the arrow keys, and closes with Escape, returning focus to the avatar.
  - **Console:** `read_console_messages` with `onlyErrors: true` shows no new errors.

- [ ] **Step 6: Preview with the flag off.** Ask the user to remove the line (or restart without it). Reload at 375 and 1280, and confirm the v1 dashboard (220px sidebar, hamburger on mobile, 76px header). Check `read_network_requests` with `urlPattern: "dashboard/insights"` and confirm it shows **no** request.

- [ ] **Step 7: Push and open the PR, after asking the user.** Pushing and opening a PR are outward-facing, so confirm first. Then push:

```bash
git push -u origin feat/dashboard-v2-shell
```

Open the PR against `main` with `"/c/Program Files/GitHub CLI/gh.exe" pr create`, titled `feat(dashboard): v2 shell — sidebar, header, bottom bar, Coach dot (PR 2/6)`. The body must include:
- a summary
- links to the spec and this plan
- "Flag off: unchanged (snapshot-pinned); no insights request"
- the baseline gate result line
- the preview checklist from Steps 5–6, with screenshots described but not attached if they show personal figures
- a test plan
- the footer `🤖 Generated with [Claude Code](https://claude.com/claude-code)`

- [ ] **Step 8: Wait for the CodeRabbit/Codex reviews and CI** before merging. Answer each thread (fix with a new commit or reply with the reason), rerun Steps 2–3 after any code change, and merge only when CI is green and both reviews have landed. Merge with a merge commit, as the repo does.

- [ ] **Step 9: After merge, write the PR 3 plan** (`docs/superpowers/plans/<date>-dashboard-v2-pr3-this-month.md`) from the roadmap row, against the merged code. Carry over the PR 3 items already recorded in memory:
  - invalidate `['dashboard-insights']` from the non-`useMutation` writes (Plaid OAuth return, `PlaidReauthBanner`, `DangerZoneSection`)
  - add 429 to the global query no-retry list
  - hide readiness chips whose `pendingCount` is 0
  - add `placeholderData: (prev) => prev` on `useDashboardInsights`

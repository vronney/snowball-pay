# Dashboard v2 — PR 6: Upgrade Moments and the Self-Serve Trial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Behind `DASHBOARD_V2_USERS`, ship the last PR of the dashboard redesign:
- **The self-serve 14-day trial** for Free accounts that never had one: `POST /api/trial/start`, the pre-launch grant rule in `gates.ts`, and the trial baseline columns on `UserPreferences`.
- **Upgrade moments A–E:**
  - A: the trial sheet, opened by every gated control.
  - B, C and D: inline at the top of This Month.
  - E: moment E gains the trial CTA.
- **Trial CTAs elsewhere:** the rail's "Try Pro free", and the trial-emails cron reaching self-serve trials.
- **Retired under the flag:** the countdown banner, the one-time post-trial modal and the locked-door brief.

No user's plan numbers or billing verdict change.

**Architecture:**
- **Server:**
  - `resolveSignupTrialEnd` (`src/lib/gates.ts`) also reads a pre-launch account's `TrialGrant`. A grant the account started itself anchors a normal 14-day window. Every account that exists today keeps its verdict, which the baseline gate proves.
  - `POST /api/trial/start` writes the grant, the trial start, the trial baseline and the move of outside debts into the plan in one transaction.
  - The insights endpoint adds `tier.trial.eligible` and `trialMoment` (B, C, D or null). A pure `computeTrialMoment` builds it from the tier, the plan, the stored baseline and a payment count.
- **Client:**
  - Every gated control already dispatches through `upgradeEvents`. Under the flag, `DashboardClient` answers with `UpgradeHost`: moment A for a trial-eligible account, otherwise a v2 sheet carrying `UpgradeModal`'s copy.
  - Moments B/C/D are one `TrialMomentCard` at the top of `ThisMonthV2`.
  - v1 keeps `UpgradeModal`, `TrialCountdownBanner` and the post-trial modal unchanged.

**Tech Stack:** Next.js 15 App Router, React 18, TypeScript, Tailwind 3.4, TanStack Query 5.28, Prisma 6 with `@prisma/adapter-neon`, Zod, lucide-react, Vitest 4 with `globals: true`.
- Component tests use a `// @vitest-environment jsdom` header, @testing-library/react 16 and `createElement` (no JSX).
- Test files must be `src/__tests__/**/*.test.ts`.

**Spec:** `docs/superpowers/specs/2026-09-12-dashboard-pro-upgrade-design.md`, sections:
- §1, §3, §4
- §5.2 and §5.3
- §6.1 and §6.4
- §7, §8.3, §8.4, §9, §10, §11 and §13

The parent roadmap is `docs/superpowers/plans/2026-09-12-dashboard-pro-upgrade.md` (PR 6 row).

The handoff defines the visuals and copy: `~/.gstack/projects/vronney-snowball-pay/designs/dashboard-pro-upgrade-20260912/README.md` §6 "Sidebar foot", §7 "Upgrade moments (5 states)", "The System" and "Interactions & Behavior". Read it, but never copy it into the repo: its numbers are one real account's data.

## Global Constraints

- **Billing verdicts identical for all accounts** (roadmap PR 6 gate), and every plan number identical (spec §1).
  - This PR changes `src/lib/gates.ts`, so the full read-only baseline capture is required (Task 10): `main-pre` vs `main`, then `main` vs the branch, both `DIFFERENT=0`.
  - The capture records each account's `paidPro`, `proEligible` and `signupTrialEndsAt`.
- **Flag off renders unchanged** (spec §5.3).
  - The PR 2 snapshots in `src/__tests__/components/dashboard-v2/__snapshots__/DashboardClient.flag.test.ts.snap` must pass untouched. **Never run vitest with `-u` / `--update`.**
  - v1 keeps `UpgradeModal`, `TrialCountdownBanner`, the one-time post-trial modal and `CoachBriefCard`'s own tier read.
- **Flag off never fetches insights and never starts a trial.**
  - `UpgradeHost` and `TrialMomentCard` render only under the flag.
  - `POST /api/trial/start` answers 403 for any account not on `DASHBOARD_V2_USERS`, so the old UI and Expo can never start one (spec §5.3).
- **Schema is additive only** (spec §6.1): four nullable columns on `UserPreferences`.
  - Task 1 runs `npx prisma generate`. From then on the local Prisma client selects the new columns on every unselected `userPreferences` read. **No dev server (branch or main) until Task 10's `db:push`.** Stop the `budget-dev` preview server before Task 1; it also holds the Prisma DLL.
- **Production database access is read-only**, except Task 10's owner-approved `npm run db:push`, which is preceded by a Neon backup.
- **Hide instead of fake** (spec §4):
  - A moment row whose value is null or not positive does not render.
  - Moment B's APR row needs a card to call.
  - Moment D's kept-brief block needs a cached brief.
- **Display rounding:** estimates and savings are floored (`floorDollars` / `floorWhole` in `src/lib/dashboard/format.ts`); counts are integers; the price uses `formatCurrencyWhole(PLANS.pro.price)`.
- **Labels carry the math** (spec §4): "est." on estimates. Moment C's interest figure compares two projections, so it reads "Projected interest · $x less" (decision 6, X12).
- **Copy states only computed facts** (X6) and uses the handoff's shipped copy where a figure is not involved.
- **Prices and trial length come from constants:** the price only from `PLANS.pro.price` (`src/lib/stripe`), the trial length only from `SIGNUP_TRIAL_DAYS` (`src/lib/billing`). Never write the literal `12` or `14` in product code; README's "Two weeks" is guarded by a test that `SIGNUP_TRIAL_DAYS === 14`.
- **DESIGN.md wins over the handoff:**
  - Radii: cards `rounded-xl` (the handoff's 16px moment cards become 12px), buttons `rounded-lg`, pills `rounded-full`.
  - Blue (`action`) only on CTAs and the checklist's "Open →" / "Script →" affordances. The moment A badge is neutral (`bg-surface-2 text-txt`), not the handoff's blue.
  - Green text uses `text-success-text`; `bg-success` tints are fills only.
  - Dashed borders only for "saved, outside the plan" (moment E's list, unchanged).
  - Touch targets 44px (`min-h-11`), primary CTAs `CTA_BLUE` (46px).
- **Tokens, not hexes, in new v2 code:** `bg-bg`, `bg-surface`, `bg-surface-2`, `text-txt`, `text-txt-muted`, `bg-action`, `text-action`, `border-border`, `bg-success/5`, `border-success/25`, `text-success-text`, `shadow-float`, plus `EYEBROW`, `CARD`, `CTA_BLUE`, `ERROR_LINE` from `src/components/dashboard-v2/styles.ts` (use `EYEBROW` plus a color utility, never the `.eyebrow` class). The one literal allowed is `focus-visible:outline-action`.
- **Analytics:** `track()` properties pass through `sanitiseAnalyticsProperties`, which redacts numbers outside `SAFE_NUMERIC_KEYS`, so send strings and booleans only. `trial_self_serve_started` is captured server-side, consent-gated from the request cookie.
- **The global insights invalidation already exists.** `src/app/providers.tsx` invalidates `['dashboard-insights']` after every settled mutation. Never add a per-hook insights invalidation; `useStartTrial` invalidates only `['subscription']`.
- **Git:**
  - Work on branch `feat/dashboard-v2-upgrade-moments-trial`, created from `main` at `e6fa7e93`.
  - Use conventional commits, each ending with `-m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"` — that literal line, regardless of which model you are.
  - Never bypass hooks. The local `block-no-verify` hook rejects any Bash command that contains `git commit` together with a `-n`-like token (`echo -n`, `[ -n`, `-ne`). Run each `git commit` as its own command.
  - Never stage the `.snap` (vitest rewrites its stat only), `src/__tests__/setup.ts` or `debug.log`.
  - Owner-gated until Task 10: no `db:push` or other database write, no push, no install, and no `npm run build`.
- **Pre-existing `tsc` noise:** `src/__tests__/lib/stripe.test.ts` has accepted type errors. Check with `npx tsc --noEmit 2>&1 | grep -v "src/__tests__/lib/stripe.test.ts"`, which must print nothing.
- **Test baseline:** `npm test` passes 1301 tests on `main` at `e6fa7e93`. Every task keeps the whole suite green and reports the new count.

## Decisions made while writing this plan

These need the owner's OK before execution. The spec is patched to match in Task 10.

1. **Who can start a trial (spec §6.4, tightened).**
   - An account is eligible only when all of these hold:
     - it is not `proEligible`
     - it has **no signup window at all** (`signupTrialEndsAt === null`)
     - its email has no `TrialGrant`
   - The middle clause is new. A post-launch account whose provisioning grant write failed falls back to its `createdAt` window. Without the clause it would pass "no grant" and get a second trial.
   - A failed grant read counts as not eligible (fail closed: never offer a trial we can't prove is the first).
   - `FORCE_PRO` dev accounts are never eligible.
2. **The gates rule, exactly as spec §6.4 words it.**
   - A pre-launch account now looks up its grant:
     - with a grant, its window is `signupTrialEndsAt(grant.grantedAt)`, which is null for a pre-launch-dated tombstone;
     - with no grant, or when the lookup fails, it gets no window and never falls back to `createdAt`.
   - Post-launch accounts behave exactly as today, including the `createdAt` fallback on a failed lookup.
   - The only visible effect is that pre-launch accounts now make one grant read per verdict.
3. **`POST /api/trial/start`:**
   - **Access:**
     - The account must be on `DASHBOARD_V2_USERS`, otherwise 403 `not_available`.
     - It is rate limited (`limits.trialStart`, 5 per 10 minutes per user).
   - **Body:** an optional `{ today: 'YYYY-MM-DD' }`, validated by `resolveToday`.
   - **Refusals:**
     - An ineligible account gets 409 `trial_used`.
     - A concurrent second start fails the grant `create` with P2002, which also returns 409.
   - **One interactive transaction, in this order:**
     1. The grant `create` with `grantedAt = now`.
     2. The `UserPreferences` upsert with `trialStartedAt = now` and the baseline.
     3. `moveOutsideDebtsIntoPlan` on the transaction client.
   - **The baseline:**
     - It is `calculatePlanMetrics` over every debt with `inPlan` forced true, because the trial counts them all.
     - It is written only when that plan pays off (`isPayoffComplete`, the single cap rule).
   - **Response:** the fresh verdict `{ proEligible, paidPro, signupTrialEndsAt }`.
   - **Analytics:** a consent-gated server capture of `trial_self_serve_started {source: 'dashboard_v2'}`.
4. **`trialBaselineAt` is the client's calendar day**, stored as that day's UTC midnight and read back with `getUTC*`. Moment C compares debt-free *months*, and a server timestamp could fall in a different month than the client's day. Signup trials get their baseline from the insights endpoint, the first time it computes a plan that pays off while the trial is active and no baseline exists. That write happens during a GET. It is conditional (`updateMany … trialBaselineAt: null`, or `create` when the row is missing), logged on failure, and never fails the response.
5. **Moment B (trial day 1–3), inline at the top of This Month, dismissible per trial** (localStorage `sp_trial_moment_B:{endsAt}`).
   - The card:
     - Eyebrow "Pro is on · day {d}" in `text-success-text`, and "{n} days left".
     - Title "Three things worth doing while it's on." ("Two things…" when the APR row is absent).
   - The rows:
     - "Finish your plan setup": ✓ at 5 of 5; otherwise "Open →" opens the first unfinished readiness step's flow, exactly as its chip does.
     - "Run one what-if": "Open →" goes to My Plan.
     - "Call one card about its APR": "Script →" goes to Coach and opens the APR script for rate watch's `top` card. The row is shown only when rate watch has a card.
   - What-ifs and calls are not tracked, so those rows never show ✓. The handoff's retention footnote is not shipped (X4).
6. **Moment C (last 3 days).**
   - The rows, each shown only when positive:
     - "Debt-free date · {m} months sooner": the baseline's debt-free month minus today's debt-free month (month index + plan months on both sides), so a month simply passing never reads as "sooner".
     - **"Projected interest · ${x} less"** (floored): baseline total interest minus today's.
       - The spec's "Interest avoided" is renamed because the two projections start up to a month apart. The difference is not all avoided interest.
       - Recorded as deviation X12.
     - "Payments logged · {n}": `PaymentRecord`s whose `paidAt` falls on or after the trial start.
   - Title and eyebrow:
     - With rows, the title is "What the last {d} days actually moved." (README copy, with `d` = whole days since the trial started) and the eyebrow is "{n} days left of Pro".
     - With no rows, there is no eyebrow and the title is "{n} days left of Pro.".
   - The price line and CTA:
     - The price line is "$price /month · against ${floor(monthlyEstimate)}/mo est. interest". "est." is added per §4, and the clause drops under $1.
     - "Keep Pro" starts the existing checkout (`checkout_started {source: 'upgrade_moment_c'}`).
   - Not dismissible (spec §7 names B and D only).
7. **Moment D (within 7 days after the trial, not paid)** is dismissed by "Stay on Free for now" (`sp_trial_moment_D:{endsAt}`). It renders nothing until the cached-brief query settles, so its title never flips.
   - With a cached brief (`GET /api/coach-brief`, ungated):
     - The README card: "Your last coach brief stays. New ones don't."
     - A kept block: "Kept — {Mon D}", the brief's headline and summary, and "Fully readable. It was generated while you had Pro, so it stays yours."
     - The README body.
   - Without one, the title is **"Nothing was removed from your plan."**, with no block and no body. This is new copy, because the README's title needs a brief. It restates moment A's promise.
   - CTAs: "Turn Pro back on — $price/mo" (checkout, `source: 'upgrade_moment_d'`) and "Stay on Free for now".
8. **Every v2 upgrade request lands in `UpgradeHost`.**
   - Gated tiles, the gated move list and row, both closing CTAs, the rail, the skipped-debts prompt and any 403 `upgrade_required` already dispatch through `upgradeEvents`. Under the flag, `DashboardClient` renders `UpgradeHost` instead of `UpgradeModal`.
   - For a trial-eligible account, `UpgradeHost` shows moment A: the README copy, "Start my 14 days", and on success the sheet closes.
   - Otherwise, including while insights load, it shows `UpgradeFallbackSheet`. That is `UpgradeModal`'s headline, description, benefits, interest anchor, price, CTA and "Continue with Free", in the v2 `Sheet`.
     - Its analytics are `UpgradeModal`'s events with `source: 'dashboard_v2_upgrade_sheet'`.
     - Its checkout sends `checkout_started {source: 'upgrade_sheet'}`, so v1 and v2 stay separable.
   - The Coach closing CTA keeps "Unlock all {n}" and opens moment A for an eligible account. The rail's CTA becomes "Try Pro free" for an eligible account (README §6).
9. **Moment E for an eligible account** reads "Count all {n} — start 14 days free", on the closing card and in the sheet. It starts the trial directly from the sheet, with no second sheet (`upgrade_moment_cta {state: 'E', action: 'start_trial'}`). Ineligible accounts keep "Count all {n} — $price/mo" → checkout.
10. **Retired under the flag:**
    - `DashboardClient` stops passing `TrialCountdownBanner` to `V2Shell`, and skips the one-time post-trial modal effect. Moment D carries that decision now.
    - `CoachBriefCard` gains an optional `isPro` prop, which `ThisMonthV2` passes. The locked-door variant can then never flash from a stale subscription cache while insights already say Pro, for example right after a trial starts.
11. **Moment B's "Script →" crosses tabs** through a `pendingAprDebtId` in `DashboardClient`, mirroring `pendingCoachExtra`. `CoachV2` turns it into its existing `aprOpenRequest` once its tier is Pro.
12. **Two PR 5 carry-overs close here:**
    - `UPGRADE_FEATURE` in `src/lib/dashboard/upgradeFeatures.ts` replaces the five local feature-key constants.
    - `METHOD_LABEL` in `src/lib/dashboard/methodLabel.ts` replaces its four copies.

    These are refactors only, guarded by the existing tests.

## File Structure

| File | Task | Responsibility |
|---|---|---|
| `prisma/schema.prisma` (modify) | 1 | Four `UserPreferences` trial columns |
| `src/lib/gates.ts` (modify) | 1 | Pre-launch grant rule; `isSelfServeTrialEligible` |
| `src/lib/debtCap.ts` (modify) | 2 | `moveOutsideDebtsIntoPlan` accepts a transaction client |
| `src/lib/rateLimit.ts` (modify) | 2 | `limits.trialStart` |
| `src/lib/analyticsEvents.ts` (modify) | 2 | `TRIAL_SELF_SERVE_STARTED` |
| `src/lib/dashboard/trialMoment.ts` | 2, 3 | Baseline fields, trial start, `computeTrialMoment` |
| `src/app/api/trial/start/route.ts` | 2 | `POST /api/trial/start` |
| `src/lib/dashboard/types.ts` (modify) | 3 | `TierInfo.trial.eligible`, `TrialMoment`, `DashboardInsights.trialMoment` |
| `src/lib/dashboard/buildInsights.ts` (modify) | 3 | `trial` input → `trialMoment` |
| `src/app/api/dashboard/insights/route.ts` (modify) | 3 | Eligibility, stored baseline, payment count, baseline write |
| `src/app/api/cron/trial-emails/route.ts`, `src/lib/lifecycleTrial.ts` (modify) | 4 | Self-serve trial candidates |
| `src/lib/hooks.ts` (modify) | 5 | `useStartTrial` |
| `src/lib/dashboard/upgradeMoments.ts` | 5 | Moment A copy, B/C/D view models, dismiss keys, trial-start error copy |
| `src/lib/dashboard/upgradeFeatures.ts`, `src/lib/dashboard/methodLabel.ts` | 5 | Shared constants |
| `src/components/dashboard-v2/upgrade/trialStartError.ts` | 6 | Axios error → moment copy |
| `src/components/dashboard-v2/upgrade/TrialStartSheet.tsx` | 6 | Moment A |
| `src/components/dashboard-v2/upgrade/UpgradeFallbackSheet.tsx` | 6 | UpgradeModal's content in the v2 sheet |
| `src/components/dashboard-v2/upgrade/UpgradeHost.tsx` | 6 | A vs fallback |
| `src/components/DashboardClient.tsx` (modify) | 7, 8 | Host under the flag; banner and post-trial modal retired; pending APR script |
| `src/lib/dashboard/upgradeRail.ts`, `shell/{V2Shell,V2Sidebar,UpgradeRail}.tsx` (modify) | 7 | "Try Pro free" |
| `src/components/dashboard-v2/upgrade/TrialMomentCard.tsx` | 8 | Moments B, C, D |
| `src/components/dashboard-v2/this-month/ThisMonthV2.tsx` (modify) | 8 | The moment on top; `CoachBriefCard isPro` |
| `src/components/payoff/CoachBriefCard.tsx` (modify) | 8 | Optional `isPro` |
| `src/components/dashboard-v2/coach/CoachV2.tsx` (modify) | 8 | `pendingAprDebtId` |
| `src/lib/dashboard/myDebts.ts`, `sheets/UpgradeSheet.tsx`, `debts/DebtsV2.tsx` (modify) | 9 | Moment E's trial CTA |
| Tests | all | See each task |

**Shared test fixtures:** `src/__tests__/lib/dashboard/fixtures.ts` exports `makeDebt`, `makeIncome`, `makeSnapshot`, `makeResult` and the four move makers. Use them; don't add a second fixture file.

**Tier constants** used across the tests after Task 3: `FREE = { proEligible: false, paidPro: false, trial: { active: false, endsAt: null, eligible: false } }`, `ELIGIBLE = { ...FREE, trial: { ...FREE.trial, eligible: true } }`, `PRO = { proEligible: true, paidPro: true, trial: { active: false, endsAt: null, eligible: false } }`.

---

### Task 1: Trial columns and the pre-launch grant rule

**Files:**
- Modify: `prisma/schema.prisma` (model `UserPreferences`), `src/lib/gates.ts` (`resolveSignupTrialEnd` and a new export)
- Test: `src/__tests__/lib/gates.test.ts` (extend)

**Interfaces:**
- Consumes: `signupTrialEndsAt`, `SIGNUP_TRIAL_LAUNCH` (`src/lib/billing.ts`), `trialGrantKey` (`src/lib/trialGrantKey.ts`).
- Produces:
  - `UserPreferences.trialStartedAt: DateTime?`, `trialBaselineAt: DateTime?`, `trialBaselineMonths: Int?`, `trialBaselineInterest: Float?` (Prisma client fields of the same names).
  - `isSelfServeTrialEligible(email: string | null | undefined, verdict: BillingVerdict): Promise<boolean>` exported from `src/lib/gates.ts`.
  - `resolveBillingVerdict` keeps its signature; only pre-launch accounts with a grant change behavior.

- [ ] **Step 1: Stop the preview server and create the branch**

Stop the `budget-dev` preview server if it is running (`preview_list`, then `preview_stop`). It holds the Prisma DLL, and after this task's `prisma generate` it would query columns production doesn't have yet.

```bash
git checkout main
```

```bash
git pull --ff-only
```

```bash
git checkout -b feat/dashboard-v2-upgrade-moments-trial
```

`git log --oneline -1` must show `e6fa7e93`.

- [ ] **Step 2: Write the failing tests**

In `src/__tests__/lib/gates.test.ts`, replace the import line `import { getUserTier, isPro, hasPaidPro } from '@/lib/gates';` with:

```ts
import { getUserTier, isPro, hasPaidPro, resolveBillingVerdict, isSelfServeTrialEligible } from '@/lib/gates';
import { SIGNUP_TRIAL_DAYS } from '@/lib/billing';
```

Append, after the last `});` of the file:

```ts
describe('the pre-launch grant rule (spec §6.4)', () => {
  const PRE_LAUNCH = new Date('2026-08-10T00:00:00Z');

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.trialGrant.findUnique.mockResolvedValue(null);
    delete process.env.FORCE_PRO;
  });

  it('gives a pre-launch account the window of a grant it started itself', async () => {
    const grantedAt = daysAgo(2);
    mockPrisma.user.findUnique.mockResolvedValue(freeUser(PRE_LAUNCH));
    mockPrisma.trialGrant.findUnique.mockResolvedValue({ grantedAt });

    expect(await resolveBillingVerdict('user-1')).toEqual({
      paidPro: false,
      proEligible: true,
      signupTrialEndsAt: new Date(grantedAt.getTime() + SIGNUP_TRIAL_DAYS * DAY_MS),
    });
  });

  it('keeps a pre-launch account on Free when its only grant predates the launch (a deletion tombstone)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(freeUser(PRE_LAUNCH));
    mockPrisma.trialGrant.findUnique.mockResolvedValue({ grantedAt: PRE_LAUNCH });

    expect(await resolveBillingVerdict('user-1')).toEqual({ paidPro: false, proEligible: false, signupTrialEndsAt: null });
  });

  it('never falls back to createdAt for a pre-launch account when the grant lookup fails', async () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockPrisma.user.findUnique.mockResolvedValue(freeUser(PRE_LAUNCH));
    mockPrisma.trialGrant.findUnique.mockRejectedValue(new Error('db down'));

    expect(await resolveBillingVerdict('user-1')).toEqual({ paidPro: false, proEligible: false, signupTrialEndsAt: null });
    quiet.mockRestore();
  });

  it('still falls back to createdAt for a post-launch account when the grant lookup fails (unchanged)', async () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    const createdAt = daysAgo(2);
    mockPrisma.user.findUnique.mockResolvedValue(freeUser(createdAt));
    mockPrisma.trialGrant.findUnique.mockRejectedValue(new Error('db down'));

    expect(await resolveBillingVerdict('user-1')).toEqual({
      paidPro: false,
      proEligible: true,
      signupTrialEndsAt: new Date(createdAt.getTime() + SIGNUP_TRIAL_DAYS * DAY_MS),
    });
    quiet.mockRestore();
  });
});

describe('isSelfServeTrialEligible (spec §6.4; plan decision 1)', () => {
  const NEVER_TRIALED = { paidPro: false, proEligible: false, signupTrialEndsAt: null };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.trialGrant.findUnique.mockResolvedValue(null);
    delete process.env.FORCE_PRO;
  });

  it('is true for a Free account that never had a window and whose email has no grant', async () => {
    expect(await isSelfServeTrialEligible('person@example.com', NEVER_TRIALED)).toBe(true);
    expect(mockPrisma.trialGrant.findUnique).toHaveBeenCalledWith({
      where: { emailHash: expect.any(String) },
      select: { grantedAt: true },
    });
  });

  it('is false for Pro, for any account that already had a window, and without an email', async () => {
    expect(await isSelfServeTrialEligible('person@example.com', { paidPro: true, proEligible: true, signupTrialEndsAt: null })).toBe(false);
    expect(await isSelfServeTrialEligible('person@example.com', { paidPro: false, proEligible: false, signupTrialEndsAt: daysAgo(3) })).toBe(false);
    expect(await isSelfServeTrialEligible('', NEVER_TRIALED)).toBe(false);
    expect(await isSelfServeTrialEligible(undefined, NEVER_TRIALED)).toBe(false);
    expect(mockPrisma.trialGrant.findUnique).not.toHaveBeenCalled();
  });

  it('is false once the email has any grant, and when the lookup fails (fail closed)', async () => {
    mockPrisma.trialGrant.findUnique.mockResolvedValue({ grantedAt: new Date('2026-08-01T00:00:00Z') });
    expect(await isSelfServeTrialEligible('person@example.com', NEVER_TRIALED)).toBe(false);

    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockPrisma.trialGrant.findUnique.mockRejectedValue(new Error('db down'));
    expect(await isSelfServeTrialEligible('person@example.com', NEVER_TRIALED)).toBe(false);
    quiet.mockRestore();
  });

  it('is false for FORCE_PRO development accounts', async () => {
    process.env.FORCE_PRO = 'true';
    expect(await isSelfServeTrialEligible('person@example.com', NEVER_TRIALED)).toBe(false);
    delete process.env.FORCE_PRO;
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/__tests__/lib/gates.test.ts`
Expected: FAIL. The first new rule test gets `proEligible: false` (pre-launch accounts skip the grant today), and `isSelfServeTrialEligible` is not exported.

- [ ] **Step 4: Add the columns**

In `prisma/schema.prisma`, in `model UserPreferences`, replace:

```prisma
  emailOptOut       Boolean  @default(false)

  createdAt    DateTime @default(now())
```

with:

```prisma
  emailOptOut       Boolean  @default(false)

  // Self-serve trial (spec §6.1, §6.4). All nullable: existing rows are untouched.
  trialStartedAt        DateTime? // when the account started its own trial
  trialBaselineAt       DateTime? // the client-local calendar day of the trial baseline, stored as that day's UTC midnight
  trialBaselineMonths   Int?      // the plan's months on that day
  trialBaselineInterest Float?    // the plan's total interest on that day

  createdAt    DateTime @default(now())
```

Run:

```bash
npx prisma validate
```

```bash
npx prisma generate
```

Expected: "The schema at prisma/schema.prisma is valid" and "Generated Prisma Client". No database is contacted. Never run `db:push` here.

- [ ] **Step 5: Implement the rule and the eligibility check**

In `src/lib/gates.ts`, replace the whole `resolveSignupTrialEnd` function (from its doc comment `/**\n * Resolves when the user's free signup window ends` through its closing `}`) with:

```ts
type GrantLookup = { grantedAt: Date } | null | 'failed';

/** The email's TrialGrant, null when it has none, 'failed' when the read itself failed. */
async function findTrialGrant(email: string): Promise<GrantLookup> {
  try {
    return await prisma.trialGrant.findUnique({
      where: { emailHash: trialGrantKey(email) },
      select: { grantedAt: true },
    });
  } catch (error) {
    // trial_grants not deployed yet or a transient read failure. Callers
    // decide the fallback; log it so a persistently failing lookup is visible.
    console.error('[gates] TrialGrant lookup failed', error);
    return 'failed';
  }
}

/**
 * Resolves when the user's free signup window ends, or null when they have
 * none. Anchored to the TrialGrant tombstone (keyed by email, written at
 * first provisioning, survives account deletion) so deleting the account and
 * re-provisioning — which mints a fresh User.createdAt — cannot restart the
 * clock.
 *
 * - Post-launch accounts fall back to createdAt when no grant exists
 *   (accounts provisioned before grants shipped) or the lookup fails.
 * - Pre-launch accounts use a grant only if one exists (spec §6.4): a
 *   self-serve trial they started, or a pre-launch-dated deletion tombstone
 *   that signupTrialEndsAt resolves to no window. They never fall back to
 *   createdAt, so no existing pre-launch account gains a window.
 */
async function resolveSignupTrialEnd(user: BillingUser): Promise<Date | null> {
  // The instanceof guard keeps partial rows (test doubles) on the safe path.
  if (!(user.createdAt instanceof Date)) return null;
  const preLaunch = user.createdAt.getTime() < SIGNUP_TRIAL_LAUNCH.getTime();
  const fallback = preLaunch ? null : signupTrialEndsAt(user.createdAt);

  if (typeof user.email !== 'string' || !user.email) return fallback;
  const grant = await findTrialGrant(user.email);
  if (grant === null || grant === 'failed') return fallback;
  return signupTrialEndsAt(grant.grantedAt);
}
```

Then, directly after the `resolveBillingVerdict` function's closing `}`, add:

```ts
/**
 * Whether this account may start the self-serve trial (spec §6.4): not Pro,
 * never had a signup window, and no TrialGrant for its email. The window
 * clause stops a post-launch account whose grant write failed (it falls back
 * to its createdAt window) from getting a second trial. A failed grant read
 * is not eligible: never offer a trial we can't prove is the first.
 */
export async function isSelfServeTrialEligible(
  email: string | null | undefined,
  verdict: BillingVerdict,
): Promise<boolean> {
  if (forceProInDev()) return false;
  if (verdict.proEligible || verdict.signupTrialEndsAt !== null) return false;
  if (typeof email !== 'string' || !email) return false;
  return (await findTrialGrant(email)) === null;
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/__tests__/lib/gates.test.ts`
Expected: PASS, including the unchanged "gives no window to accounts that predate the feature launch" and "anchors the window to the trial grant" tests.

Then run the whole suite and the type check:

```bash
npm test
```

```bash
npx tsc --noEmit 2>&1 | grep -v "src/__tests__/lib/stripe.test.ts"
```

Expected: every test passes (report the count); no `tsc` output.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma src/lib/gates.ts src/__tests__/lib/gates.test.ts
```

```bash
git commit -m "feat(billing): trial baseline columns and the pre-launch grant rule" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: `POST /api/trial/start`

**Files:**
- Create: `src/lib/dashboard/trialMoment.ts` (the baseline helpers only; Task 3 adds the moment), `src/app/api/trial/start/route.ts`
- Modify: `src/lib/debtCap.ts`, `src/lib/rateLimit.ts` (the `limits` object, after `dashboardInsights`), `src/lib/analyticsEvents.ts` (after `PLAN_GAP_FIX_APPLIED`)
- Test: `src/__tests__/lib/dashboard/trialMoment.test.ts` (new), `src/__tests__/api/trial-start.test.ts` (new)

**Interfaces:**
- Consumes:
  - From Task 1: `isSelfServeTrialEligible`, `resolveBillingVerdict` (`src/lib/gates.ts`) and the `UserPreferences` trial columns.
  - Existing: `calculatePlanMetrics` (`src/lib/payoffPlan.ts`), `isPayoffComplete` (`src/lib/dashboard/payoffCompletion.ts`), `resolveToday` (`src/lib/dashboard/today.ts`), `debtFromRow` / `incomeFromRow` (`src/lib/prismaMappers.ts`), `captureServerEvent` (`src/lib/analytics-server.ts`), `ANALYTICS_CONSENT_KEY` (`src/lib/analyticsConsent.ts`), `isDashboardV2` (`src/lib/flags.ts`).
- Produces:
  - `src/lib/dashboard/trialMoment.ts`:
    - `baselineDay(today: Date): Date` (UTC midnight of `today`'s local calendar day)
    - `interface TrialBaselineFields { trialBaselineAt: Date; trialBaselineMonths: number; trialBaselineInterest: number }`
    - `trialBaselineFields(plan, today)`, overloaded: a `{ months: number; totalInterest: number }` plan returns `TrialBaselineFields`; a nullable plan returns `TrialBaselineFields | Record<string, never>` (`{}` for null)
  - `moveOutsideDebtsIntoPlan(userId: string, db?: DebtWriter): Promise<number>` where `type DebtWriter = Pick<Prisma.TransactionClient, 'debt'>`.
  - `limits.trialStart(userId: string): Promise<boolean>`.
  - `Events.TRIAL_SELF_SERVE_STARTED = 'trial_self_serve_started'`.
  - `POST /api/trial/start`:
    - Body: optional `{ today?: string }`.
    - 200: `{ proEligible: boolean; paidPro: boolean; signupTrialEndsAt: string | null }`.
    - Errors: 400 `invalid_body`; 401; 403 `not_available`; 409 `trial_used`; 429; 500 `Failed to start trial`.

- [ ] **Step 1: Write the failing tests**

`src/__tests__/lib/dashboard/trialMoment.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { baselineDay, trialBaselineFields } from '@/lib/dashboard/trialMoment';

describe('the trial baseline (spec §6.4; plan decision 4)', () => {
  it("stores the client's calendar day as that day's UTC midnight, whatever the hour", () => {
    expect(baselineDay(new Date(2026, 8, 17, 23, 30))).toEqual(new Date(Date.UTC(2026, 8, 17)));
    expect(baselineDay(new Date(2026, 8, 17, 0, 5))).toEqual(new Date(Date.UTC(2026, 8, 17)));
  });

  it('writes nothing without a plan that pays off', () => {
    expect(trialBaselineFields(null, new Date(2026, 8, 17))).toEqual({});
  });

  it("records the plan's months and total interest on that day", () => {
    expect(trialBaselineFields({ months: 31, totalInterest: 5_012.34 }, new Date(2026, 8, 17, 9))).toEqual({
      trialBaselineAt: new Date(Date.UTC(2026, 8, 17)),
      trialBaselineMonths: 31,
      trialBaselineInterest: 5_012.34,
    });
  });
});
```

`src/__tests__/api/trial-start.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';

const { mockPrisma, tx } = vi.hoisted(() => {
  const tx = {
    trialGrant: { create: vi.fn() },
    userPreferences: { upsert: vi.fn() },
    debt: { updateMany: vi.fn() },
  };
  return {
    tx,
    mockPrisma: {
      debt: { findMany: vi.fn() },
      income: { findUnique: vi.fn() },
      expense: { findMany: vi.fn() },
      $transaction: vi.fn(async (run: (client: typeof tx) => Promise<unknown>) => run(tx)),
    },
  };
});

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/auth-server', () => ({
  verifyAuth: vi.fn(),
  unauthorized: vi.fn(() => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })),
  serverError: vi.fn((msg: string) => new Response(JSON.stringify({ error: msg }), { status: 500 })),
  tooManyRequests: vi.fn(() => new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 })),
}));
vi.mock('@/lib/gates', () => ({ resolveBillingVerdict: vi.fn(), isSelfServeTrialEligible: vi.fn() }));
vi.mock('@/lib/rateLimit', () => ({ limits: { trialStart: vi.fn() } }));
vi.mock('@/lib/trialGrantKey', () => ({ trialGrantKey: vi.fn((email: string) => `hash:${email}`) }));
vi.mock('@/lib/analytics-server', () => ({ captureServerEvent: vi.fn(async () => undefined) }));

import { POST } from '@/app/api/trial/start/route';
import { verifyAuth } from '@/lib/auth-server';
import { isSelfServeTrialEligible, resolveBillingVerdict } from '@/lib/gates';
import { limits } from '@/lib/rateLimit';
import { captureServerEvent } from '@/lib/analytics-server';
import { calculatePlanMetrics } from '@/lib/payoffPlan';
import { debtFromRow, incomeFromRow } from '@/lib/prismaMappers';

const NOW = new Date(2026, 8, 17, 12, 0);
const ENDS = new Date(NOW.getTime() + 14 * 24 * 60 * 60 * 1000);
const AUTHED = { valid: true as const, user: { id: 'user-1', email: 'owner@example.com' } };
const FREE_VERDICT = { paidPro: false, proEligible: false, signupTrialEndsAt: null };
const TRIAL_VERDICT = { paidPro: false, proEligible: true, signupTrialEndsAt: ENDS };

const DEBT_ROWS = [
  { id: 'b', userId: 'user-1', name: 'Card B', category: 'Credit Card', balance: 3000, originalBalance: 3000, interestRate: 25, minimumPayment: 60, creditLimit: 0, priorityOrder: null, dueDate: 10, inPlan: true, createdAt: new Date('2026-02-01'), updatedAt: new Date('2026-02-01') },
  { id: 'a', userId: 'user-1', name: 'Card A', category: 'Credit Card', balance: 800, originalBalance: 1000, interestRate: 5, minimumPayment: 30, creditLimit: 0, priorityOrder: null, dueDate: 5, inPlan: true, createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01') },
  { id: 'x', userId: 'user-1', name: 'Store card', category: 'Credit Card', balance: 1200, originalBalance: 1200, interestRate: 22, minimumPayment: 35, creditLimit: 0, priorityOrder: null, dueDate: 12, inPlan: false, createdAt: new Date('2026-03-01'), updatedAt: new Date('2026-03-01') },
];
const INCOME_ROW = { id: 'i', userId: 'user-1', monthlyTakeHome: 3000, essentialExpenses: 2000, extraPayment: 0, payoffMethod: 'snowball', accelerationAmount: 100, frequency: 'monthly', createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01') };

function req(body?: unknown, { consent = true, raw }: { consent?: boolean; raw?: string } = {}) {
  return new NextRequest('http://localhost/api/trial/start', {
    method: 'POST',
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
    headers: consent ? { cookie: 'sp_analytics_consent_v1=granted' } : {},
  });
}

describe('POST /api/trial/start (spec §6.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    process.env.DASHBOARD_V2_USERS = 'owner@example.com';
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    vi.mocked(limits.trialStart).mockResolvedValue(true);
    // Reset, not just clear: a test that stops early leaves queued once-values behind.
    vi.mocked(resolveBillingVerdict).mockReset().mockResolvedValueOnce(FREE_VERDICT).mockResolvedValueOnce(TRIAL_VERDICT);
    vi.mocked(isSelfServeTrialEligible).mockResolvedValue(true);
    mockPrisma.debt.findMany.mockResolvedValue(DEBT_ROWS);
    mockPrisma.income.findUnique.mockResolvedValue(INCOME_ROW);
    mockPrisma.expense.findMany.mockResolvedValue([{ amount: 50 }]);
    tx.trialGrant.create.mockResolvedValue({});
    tx.userPreferences.upsert.mockResolvedValue({});
    tx.debt.updateMany.mockResolvedValue({ count: 1 });
  });
  afterEach(() => {
    vi.useRealTimers();
    delete process.env.DASHBOARD_V2_USERS;
  });

  it('rejects unauthenticated requests', async () => {
    vi.mocked(verifyAuth).mockResolvedValue({ valid: false, user: null });
    expect((await POST(req({}))).status).toBe(401);
  });

  it('is not available to accounts outside the dashboard v2 rollout (spec §5.3)', async () => {
    process.env.DASHBOARD_V2_USERS = 'someone-else@example.com';
    const res = await POST(req({}));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'not_available' });
    expect(limits.trialStart).not.toHaveBeenCalled();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('rate limits per user', async () => {
    vi.mocked(limits.trialStart).mockResolvedValue(false);
    expect((await POST(req({}))).status).toBe(429);
    expect(limits.trialStart).toHaveBeenCalledWith('user-1');
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a malformed body', async () => {
    expect((await POST(req(undefined, { raw: 'not json' }))).status).toBe(400);
    expect((await POST(req({ today: 5 }))).status).toBe(400);
    expect((await POST(req({ today: '2026-09-17', extra: true }))).status).toBe(400);
  });

  it('refuses an account that is not eligible, writing nothing', async () => {
    vi.mocked(isSelfServeTrialEligible).mockResolvedValue(false);
    const res = await POST(req({ today: '2026-09-17' }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'trial_used' });
    expect(isSelfServeTrialEligible).toHaveBeenCalledWith('owner@example.com', FREE_VERDICT);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('starts the trial in one transaction: grant, start and baseline, every debt counted', async () => {
    const res = await POST(req({ today: '2026-09-17' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ proEligible: true, paidPro: false, signupTrialEndsAt: ENDS.toISOString() });

    // The route's own mapping; the literals carry only the columns the mappers read.
    const debts = DEBT_ROWS.map((row) => debtFromRow(row as unknown as Parameters<typeof debtFromRow>[0]));
    const income = incomeFromRow(INCOME_ROW as unknown as Parameters<typeof incomeFromRow>[0]);
    const planStartDate = new Date(2026, 8, 17);
    const counted = calculatePlanMetrics(debts.map((d) => ({ ...d, inPlan: true })), income, [{ amount: 50 }], { planStartDate })!;
    const inPlanOnly = calculatePlanMetrics(debts, income, [{ amount: 50 }], { planStartDate })!;
    // The trial counts the outside debt, so the baseline is the plan WITH it.
    expect(counted.result.totalInterestPaid).not.toBe(inPlanOnly.result.totalInterestPaid);

    const baseline = {
      trialBaselineAt: new Date(Date.UTC(2026, 8, 17)),
      trialBaselineMonths: counted.result.months,
      trialBaselineInterest: counted.result.totalInterestPaid,
    };
    expect(tx.trialGrant.create).toHaveBeenCalledWith({ data: { emailHash: 'hash:owner@example.com', grantedAt: NOW } });
    expect(tx.userPreferences.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      create: { userId: 'user-1', trialStartedAt: NOW, ...baseline },
      update: { trialStartedAt: NOW, ...baseline },
    });
    expect(tx.debt.updateMany).toHaveBeenCalledWith({ where: { userId: 'user-1', inPlan: false }, data: { inPlan: true } });
    // The grant is the atomic once-per-email guard, so it is written first.
    expect(tx.trialGrant.create.mock.invocationCallOrder[0]).toBeLessThan(tx.userPreferences.upsert.mock.invocationCallOrder[0]);
    expect(captureServerEvent).toHaveBeenCalledWith({
      consent: 'granted',
      distinctId: 'user-1',
      event: 'trial_self_serve_started',
      insertId: 'trial_self_serve_started:user-1',
      properties: { source: 'dashboard_v2' },
    });
  });

  it('writes no baseline when there is no plan to measure, and captures nothing without consent', async () => {
    mockPrisma.income.findUnique.mockResolvedValue(null);
    const res = await POST(req({}, { consent: false }));
    expect(res.status).toBe(200);
    expect(tx.userPreferences.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      create: { userId: 'user-1', trialStartedAt: NOW },
      update: { trialStartedAt: NOW },
    });
    expect(captureServerEvent).toHaveBeenCalledWith(expect.objectContaining({ consent: 'denied' }));
  });

  it('answers 409 when a concurrent start already created the grant', async () => {
    tx.trialGrant.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed on the fields: (`emailHash`)', { code: 'P2002', clientVersion: 'test' }),
    );
    const res = await POST(req({}));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'trial_used' });
    expect(tx.userPreferences.upsert).not.toHaveBeenCalled();
    expect(captureServerEvent).not.toHaveBeenCalled();
  });

  it('returns 500 without leaking details when the database fails', async () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    tx.userPreferences.upsert.mockRejectedValue(new Error('db down'));
    const res = await POST(req({}));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Failed to start trial' });
    quiet.mockRestore();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/__tests__/lib/dashboard/trialMoment.test.ts src/__tests__/api/trial-start.test.ts`
Expected: FAIL with "Failed to resolve import" for `@/lib/dashboard/trialMoment` and `@/app/api/trial/start/route`.

- [ ] **Step 3: Implement**

`src/lib/dashboard/trialMoment.ts`:

```ts
/**
 * The self-serve and signup trial's baseline (spec §6.4). Task 3 adds the
 * moment computation to this module.
 */

export interface TrialBaselineFields {
  trialBaselineAt: Date;
  trialBaselineMonths: number;
  trialBaselineInterest: number;
}

/**
 * The client's calendar day as that day's UTC midnight. Read back with
 * getUTC*, it names the same month on any server, so moment C's month
 * comparison can't slip across a time zone.
 */
export function baselineDay(today: Date): Date {
  return new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
}

interface BaselinePlan { months: number; totalInterest: number }

/**
 * The UserPreferences columns for a baseline taken from `plan` today, or none
 * without a plan that pays off (a capped run is not a plan, isPayoffComplete).
 */
export function trialBaselineFields(plan: BaselinePlan, today: Date): TrialBaselineFields;
export function trialBaselineFields(plan: BaselinePlan | null, today: Date): TrialBaselineFields | Record<string, never>;
export function trialBaselineFields(
  plan: BaselinePlan | null,
  today: Date,
): TrialBaselineFields | Record<string, never> {
  if (!plan) return {};
  return {
    trialBaselineAt: baselineDay(today),
    trialBaselineMonths: plan.months,
    trialBaselineInterest: plan.totalInterest,
  };
}
```

In `src/lib/debtCap.ts`, replace:

```ts
import { prisma } from '@/lib/prisma';
```

with:

```ts
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/** The global client or a transaction's: the trial start moves debts inside its transaction. */
type DebtWriter = Pick<Prisma.TransactionClient, 'debt'>;
```

and replace:

```ts
export async function moveOutsideDebtsIntoPlan(userId: string): Promise<number> {
  const { count } = await prisma.debt.updateMany({
```

with:

```ts
export async function moveOutsideDebtsIntoPlan(userId: string, db: DebtWriter = prisma): Promise<number> {
  const { count } = await db.debt.updateMany({
```

In `src/lib/rateLimit.ts`, directly after the `dashboardInsights` entry (its closing `),`), add:

```ts

  /** 5 self-serve trial starts per 10 min per user. Only the first can succeed; this caps retries. */
  trialStart: (userId: string) =>
    check('trial-start', `trial-start:${userId}`, 5, '600 s', 10 * 60 * 1000),
```

In `src/lib/analyticsEvents.ts`, directly after the `PLAN_GAP_FIX_APPLIED: 'plan_gap_fix_applied',` line, add:

```ts
  // Dashboard v2 self-serve trial (spec §9). Captured server-side by
  // POST /api/trial/start, consent-gated from the request cookie.
  TRIAL_SELF_SERVE_STARTED: 'trial_self_serve_started',
```

`src/app/api/trial/start/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, serverError, tooManyRequests } from '@/lib/auth-server';
import { isSelfServeTrialEligible, resolveBillingVerdict } from '@/lib/gates';
import { isDashboardV2 } from '@/lib/flags';
import { limits } from '@/lib/rateLimit';
import { trialGrantKey } from '@/lib/trialGrantKey';
import { moveOutsideDebtsIntoPlan } from '@/lib/debtCap';
import { calculatePlanMetrics } from '@/lib/payoffPlan';
import { isPayoffComplete } from '@/lib/dashboard/payoffCompletion';
import { resolveToday } from '@/lib/dashboard/today';
import { trialBaselineFields } from '@/lib/dashboard/trialMoment';
import { debtFromRow, incomeFromRow } from '@/lib/prismaMappers';
import { captureServerEvent } from '@/lib/analytics-server';
import { ANALYTICS_CONSENT_KEY } from '@/lib/analyticsConsent';
import { Events } from '@/lib/analyticsEvents';

const BodySchema = z.object({ today: z.string().optional() }).strict();

const trialUsed = () => NextResponse.json({ error: 'trial_used' }, { status: 409 });

/**
 * POST /api/trial/start — a never-trialed Free account starts its own
 * 14-day Pro window (spec §6.4). The TrialGrant `create` is the atomic
 * once-per-email guard; the start, the baseline and the move of outside
 * debts into the plan commit with it or not at all.
 */
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();
  const { id: userId, email } = auth.user;

  // Opt-in per account while dashboard v2 rolls out (spec §5.3): the old UI
  // and Expo never start a trial.
  if (!isDashboardV2(email)) return NextResponse.json({ error: 'not_available' }, { status: 403 });

  let parsed: z.infer<typeof BodySchema>;
  try {
    const raw = await request.text();
    const result = BodySchema.safeParse(raw ? JSON.parse(raw) : {});
    if (!result.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
    parsed = result.data;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const today = resolveToday(parsed.today ?? null);

  try {
    if (!(await limits.trialStart(userId))) return tooManyRequests();

    const verdict = await resolveBillingVerdict(userId);
    if (!email || !(await isSelfServeTrialEligible(email, verdict))) return trialUsed();

    const [debtRows, incomeRow, expenses] = await Promise.all([
      prisma.debt.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      prisma.income.findUnique({ where: { userId } }),
      prisma.expense.findMany({ where: { userId }, select: { amount: true } }),
    ]);
    // The trial counts every debt (spec §6.3), so the baseline is the plan
    // the dashboard will show once the outside debts move in.
    const debts = debtRows.map(debtFromRow).map((debt) => ({ ...debt, inPlan: true }));
    const planStartDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const metrics = calculatePlanMetrics(debts, incomeRow ? incomeFromRow(incomeRow) : null, expenses, { planStartDate });
    const baseline = trialBaselineFields(
      metrics && isPayoffComplete(metrics.result)
        ? { months: metrics.result.months, totalInterest: metrics.result.totalInterestPaid }
        : null,
      today,
    );

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.trialGrant.create({ data: { emailHash: trialGrantKey(email), grantedAt: now } });
      await tx.userPreferences.upsert({
        where: { userId },
        create: { userId, trialStartedAt: now, ...baseline },
        update: { trialStartedAt: now, ...baseline },
      });
      await moveOutsideDebtsIntoPlan(userId, tx);
    });

    const consent = request.cookies.get(ANALYTICS_CONSENT_KEY)?.value === 'granted' ? 'granted' : 'denied';
    await captureServerEvent({
      consent,
      distinctId: userId,
      event: Events.TRIAL_SELF_SERVE_STARTED,
      insertId: `${Events.TRIAL_SELF_SERVE_STARTED}:${userId}`,
      properties: { source: 'dashboard_v2' },
    }).catch(() => { /* analytics must never fail the start */ });

    const fresh = await resolveBillingVerdict(userId);
    return NextResponse.json({
      proEligible: fresh.proEligible,
      paidPro: fresh.paidPro,
      signupTrialEndsAt: fresh.signupTrialEndsAt?.toISOString() ?? null,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return trialUsed();
    console.error('Trial start error:', error);
    return serverError('Failed to start trial');
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/__tests__/lib/dashboard/trialMoment.test.ts src/__tests__/api/trial-start.test.ts`
Expected: PASS.

Then run `npm test` and `npx tsc --noEmit 2>&1 | grep -v "src/__tests__/lib/stripe.test.ts"`. Expected: every test passes (report the count); no `tsc` output. The Stripe webhook's existing `moveOutsideDebtsIntoPlan(userId)` calls compile unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dashboard/trialMoment.ts src/app/api/trial/start/route.ts src/lib/debtCap.ts src/lib/rateLimit.ts src/lib/analyticsEvents.ts src/__tests__/lib/dashboard/trialMoment.test.ts src/__tests__/api/trial-start.test.ts
```

```bash
git commit -m "feat(trial): POST /api/trial/start for never-trialed accounts" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---
### Task 3: The trial moment in the insights endpoint

**Files:**
- Modify: `src/lib/dashboard/trialMoment.ts`, `src/lib/dashboard/types.ts` (`TierInfo`, new `TrialMoment`, `DashboardInsights`), `src/lib/dashboard/buildInsights.ts`, `src/app/api/dashboard/insights/route.ts`
- Test: `src/__tests__/lib/dashboard/trialMoment.test.ts` (extend), `src/__tests__/lib/dashboard/buildInsights.test.ts` (extend), `src/__tests__/api/dashboard-insights.test.ts` (extend), plus the fixture sweep in Step 6

**Interfaces:**
- Consumes:
  - From Task 1: `isSelfServeTrialEligible` and the `UserPreferences` trial columns.
  - From Task 2: `baselineDay` and `trialBaselineFields`.
  - Existing: `SIGNUP_TRIAL_DAYS`, `wholeDaysRemaining` and `isInPostTrialPromptWindow` (`src/lib/billing.ts`); `floorDollars` (`src/lib/dashboard/format.ts`).
- Produces:
  - In `types.ts`:
    - `TierInfo.trial: { active: boolean; endsAt: string | null; eligible: boolean }`
    - `DashboardInsights.trialMoment: TrialMoment | null`
    - The `TrialMoment` union:

    ```ts
    export type TrialMoment =
      | { state: 'B'; day: number; daysLeft: number }
      | { state: 'C'; daysLeft: number; elapsedDays: number; monthsSooner: number | null; interestLess: number | null; paymentsLogged: number | null }
      | { state: 'D'; endedAt: string };
    ```

  - In `trialMoment.ts`:
    - `TRIAL_MOMENT_WINDOW_DAYS = 3`
    - `interface TrialBaseline { at: Date; months: number; interest: number }`
    - `storedTrialBaseline(row: { trialBaselineAt: Date | null; trialBaselineMonths: number | null; trialBaselineInterest: number | null } | null): TrialBaseline | null`
    - `trialStartOf(endsAt: Date): Date`
    - `interface TrialMomentInput { tier: TierInfo; now: Date; today: Date; plan: { months: number; totalInterest: number } | null; baseline: TrialBaseline | null; paymentsSinceStart: number | null }`
    - `computeTrialMoment(input: TrialMomentInput): TrialMoment | null`
  - `InsightsInput.trial: { now: Date; baseline: TrialBaseline | null; paymentsSinceStart: number | null }`.
  - The endpoint's JSON gains `tier.trial.eligible` and `trialMoment`.

- [ ] **Step 1: Write the failing pure tests**

Append to `src/__tests__/lib/dashboard/trialMoment.test.ts`. First replace its import line `import { baselineDay, trialBaselineFields } from '@/lib/dashboard/trialMoment';` with:

```ts
import {
  baselineDay, computeTrialMoment, storedTrialBaseline, trialBaselineFields, trialStartOf, type TrialMomentInput,
} from '@/lib/dashboard/trialMoment';
import type { TierInfo } from '@/lib/dashboard/types';
```

Then append:

```ts
const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 8, 17, 12, 0);
const TODAY = new Date(2026, 8, 17);

function onTrial(endsAt: Date): TierInfo {
  return { proEligible: true, paidPro: false, trial: { active: true, endsAt: endsAt.toISOString(), eligible: false } };
}
function afterTrial(endsAt: Date): TierInfo {
  return { proEligible: false, paidPro: false, trial: { active: false, endsAt: endsAt.toISOString(), eligible: false } };
}
function input(overrides: Partial<TrialMomentInput> = {}): TrialMomentInput {
  return {
    tier: onTrial(new Date(NOW.getTime() + 3 * DAY)),
    now: NOW,
    today: TODAY,
    plan: { months: 30, totalInterest: 5_000 },
    baseline: null,
    paymentsSinceStart: null,
    ...overrides,
  };
}

describe('trialStartOf and storedTrialBaseline', () => {
  it('starts every trial SIGNUP_TRIAL_DAYS before its end', () => {
    expect(trialStartOf(new Date(2026, 9, 1, 12))).toEqual(new Date(new Date(2026, 9, 1, 12).getTime() - 14 * DAY));
  });

  it('reads a stored baseline only when all three columns are set', () => {
    const at = new Date(Date.UTC(2026, 8, 6));
    expect(storedTrialBaseline({ trialBaselineAt: at, trialBaselineMonths: 32, trialBaselineInterest: 5_600 })).toEqual({ at, months: 32, interest: 5_600 });
    expect(storedTrialBaseline({ trialBaselineAt: at, trialBaselineMonths: null, trialBaselineInterest: 5_600 })).toBeNull();
    expect(storedTrialBaseline({ trialBaselineAt: null, trialBaselineMonths: null, trialBaselineInterest: null })).toBeNull();
    expect(storedTrialBaseline(null)).toBeNull();
  });
});

describe('computeTrialMoment (spec §7; plan decisions 5–7)', () => {
  it('is null for paid Pro, for a never-trialed account, and mid-trial', () => {
    expect(computeTrialMoment(input({ tier: { proEligible: true, paidPro: true, trial: { active: false, endsAt: null, eligible: false } } }))).toBeNull();
    expect(computeTrialMoment(input({ tier: { proEligible: true, paidPro: true, trial: { active: false, endsAt: new Date(NOW.getTime() - 2 * DAY).toISOString(), eligible: false } } }))).toBeNull();
    expect(computeTrialMoment(input({ tier: { proEligible: false, paidPro: false, trial: { active: false, endsAt: null, eligible: true } } }))).toBeNull();
    // Day 4, 11 days left: neither end of the trial.
    expect(computeTrialMoment(input({ tier: onTrial(new Date(NOW.getTime() + 11 * DAY)) }))).toBeNull();
  });

  it('is moment B on trial days 1 to 3', () => {
    expect(computeTrialMoment(input({ tier: onTrial(new Date(NOW.getTime() + 14 * DAY - 60 * 60 * 1000)) })))
      .toEqual({ state: 'B', day: 1, daysLeft: 14 });
    expect(computeTrialMoment(input({ tier: onTrial(new Date(NOW.getTime() + 11 * DAY + 60 * 60 * 1000)) })))
      .toEqual({ state: 'B', day: 3, daysLeft: 12 });
  });

  it('is moment C with 3 or fewer days left, and not with 4', () => {
    expect(computeTrialMoment(input({ tier: onTrial(new Date(NOW.getTime() + 3 * DAY)) })))
      .toEqual({ state: 'C', daysLeft: 3, elapsedDays: 11, monthsSooner: null, interestLess: null, paymentsLogged: null });
    expect(computeTrialMoment(input({ tier: onTrial(new Date(NOW.getTime() + 3 * DAY + 60 * 60 * 1000)) }))).toBeNull();
  });

  it("fills moment C's rows from the baseline, the plan today and the payments logged", () => {
    const moment = computeTrialMoment(input({
      baseline: { at: baselineDay(new Date(2026, 8, 6)), months: 32, interest: 5_600.4 },
      paymentsSinceStart: 4,
    }));
    expect(moment).toMatchObject({ state: 'C', monthsSooner: 2, paymentsLogged: 4 });
    expect(moment?.state === 'C' && moment.interestLess).toBeCloseTo(600.4, 6);
  });

  it('never calls a month simply passing "sooner": it compares debt-free months, not plan lengths', () => {
    // Baseline on Aug 31 with 31 months left ends in the same month as Sep 17 with 30 months left.
    expect(computeTrialMoment(input({
      baseline: { at: baselineDay(new Date(2026, 7, 31)), months: 31, interest: 5_000 },
    }))).toMatchObject({ monthsSooner: null, interestLess: null });
  });

  it('hides a row under its threshold: under $1 less, no payments, no plan', () => {
    expect(computeTrialMoment(input({
      baseline: { at: baselineDay(new Date(2026, 8, 6)), months: 30, interest: 5_000.99 },
      paymentsSinceStart: 0,
    }))).toMatchObject({ monthsSooner: null, interestLess: null, paymentsLogged: null });
    expect(computeTrialMoment(input({
      plan: null,
      baseline: { at: baselineDay(new Date(2026, 8, 6)), months: 32, interest: 5_600 },
    }))).toMatchObject({ monthsSooner: null, interestLess: null });
  });

  it('is moment D for 7 days after the trial ends, for an account that is not paying', () => {
    const endedAt = new Date(NOW.getTime() - 2 * DAY);
    expect(computeTrialMoment(input({ tier: afterTrial(endedAt) }))).toEqual({ state: 'D', endedAt: endedAt.toISOString() });
    expect(computeTrialMoment(input({ tier: afterTrial(new Date(NOW.getTime() - 8 * DAY)) }))).toBeNull();
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/__tests__/lib/dashboard/trialMoment.test.ts`
Expected: FAIL with "computeTrialMoment is not a function" (and the other new exports).

- [ ] **Step 3: Add the types and the moment**

In `src/lib/dashboard/types.ts`, replace:

```ts
export interface TierInfo { proEligible: boolean; paidPro: boolean; trial: { active: boolean; endsAt: string | null } }
```

with:

```ts
export interface TierInfo {
  proEligible: boolean;
  paidPro: boolean;
  /** eligible: may start the self-serve trial (spec §6.4, isSelfServeTrialEligible). */
  trial: { active: boolean; endsAt: string | null; eligible: boolean };
}

/**
 * The one inline upgrade moment (spec §7): B on trial days 1–3, C in the last
 * 3 days, D for 7 days after it ends. C's rows are null when not positive.
 * interestLess is unrounded (views floor it); endedAt is ISO.
 */
export type TrialMoment =
  | { state: 'B'; day: number; daysLeft: number }
  | {
      state: 'C';
      daysLeft: number;
      elapsedDays: number;
      monthsSooner: number | null;
      interestLess: number | null;
      paymentsLogged: number | null;
    }
  | { state: 'D'; endedAt: string };
```

In the same file replace:

```ts
/** PR 4 adds `uncounted`; PR 6 adds `trialMoment` and trial eligibility on `tier`. */
```

with:

```ts
/** PR 4 added `uncounted`; PR 6 added `trialMoment` and `tier.trial.eligible`. */
```

and replace:

```ts
  uncounted: Uncounted | null;
}
```

with:

```ts
  uncounted: Uncounted | null;
  trialMoment: TrialMoment | null;
}
```

In `src/lib/dashboard/trialMoment.ts`, replace the file's first comment block (`/**\n * The self-serve and signup trial's baseline (spec §6.4). Task 3 adds the\n * moment computation to this module.\n */`) with:

```ts
import { SIGNUP_TRIAL_DAYS, isInPostTrialPromptWindow, wholeDaysRemaining } from '@/lib/billing';
import { floorDollars } from './format';
import type { TierInfo, TrialMoment } from './types';

/**
 * The trial's baseline (spec §6.4) and the inline upgrade moment it feeds
 * (spec §7). Pure: the insights route and the trial start supply the rows.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Moments B and C each cover this many days at one end of the trial. */
export const TRIAL_MOMENT_WINDOW_DAYS = 3;

export interface TrialBaseline {
  /** The client-local day it was taken, as UTC midnight (baselineDay). */
  at: Date;
  months: number;
  interest: number;
}
```

Then append to the end of `src/lib/dashboard/trialMoment.ts`:

```ts
/** The stored baseline, or null unless all three columns are set. */
export function storedTrialBaseline(
  row: { trialBaselineAt: Date | null; trialBaselineMonths: number | null; trialBaselineInterest: number | null } | null,
): TrialBaseline | null {
  if (!row || row.trialBaselineAt === null || row.trialBaselineMonths === null || row.trialBaselineInterest === null) {
    return null;
  }
  return { at: row.trialBaselineAt, months: row.trialBaselineMonths, interest: row.trialBaselineInterest };
}

/** Every trial, signup or self-serve, is SIGNUP_TRIAL_DAYS long. */
export function trialStartOf(endsAt: Date): Date {
  return new Date(endsAt.getTime() - SIGNUP_TRIAL_DAYS * DAY_MS);
}

export interface TrialMomentInput {
  tier: TierInfo;
  /** The server clock: a trial's days are billing time. */
  now: Date;
  /** The client's local day: debt-free months are counted from it. */
  today: Date;
  /** The plan the dashboard shows (insights `plan`), or null when it doesn't pay off. */
  plan: { months: number; totalInterest: number } | null;
  baseline: TrialBaseline | null;
  /** Payment records logged since the trial started; null outside moment C. */
  paymentsSinceStart: number | null;
}

/** At most one inline moment (spec §7): B, C or D, or null. */
export function computeTrialMoment(input: TrialMomentInput): TrialMoment | null {
  const { tier, now } = input;
  if (tier.paidPro || tier.trial.endsAt === null) return null;
  const endsAt = new Date(tier.trial.endsAt);
  if (Number.isNaN(endsAt.getTime())) return null;

  if (tier.trial.active) {
    const elapsedDays = Math.max(0, Math.floor((now.getTime() - trialStartOf(endsAt).getTime()) / DAY_MS));
    const daysLeft = wholeDaysRemaining(endsAt, now.getTime());
    if (elapsedDays + 1 <= TRIAL_MOMENT_WINDOW_DAYS) return { state: 'B', day: elapsedDays + 1, daysLeft };
    if (daysLeft > TRIAL_MOMENT_WINDOW_DAYS) return null;
    const payments = input.paymentsSinceStart;
    return {
      state: 'C',
      daysLeft,
      elapsedDays,
      monthsSooner: monthsSooner(input),
      interestLess: interestLess(input),
      paymentsLogged: payments !== null && payments >= 1 ? payments : null,
    };
  }

  if (!tier.proEligible && isInPostTrialPromptWindow(endsAt, now.getTime())) {
    return { state: 'D', endedAt: tier.trial.endsAt };
  }
  return null;
}

/**
 * How many months earlier the debt-free month is now than at the baseline:
 * (baseline month + its plan months) − (this month + today's plan months).
 * Comparing months, not plan lengths, keeps a month simply passing from
 * reading as "sooner".
 */
function monthsSooner({ plan, baseline, today }: TrialMomentInput): number | null {
  if (!plan || !baseline) return null;
  const before = baseline.at.getUTCFullYear() * 12 + baseline.at.getUTCMonth() + baseline.months;
  const after = today.getFullYear() * 12 + today.getMonth() + plan.months;
  const sooner = before - after;
  return sooner >= 1 ? sooner : null;
}

/** Baseline projected interest minus today's, unrounded; null unless it floors to at least $1. */
function interestLess({ plan, baseline }: TrialMomentInput): number | null {
  if (!plan || !baseline) return null;
  const less = baseline.interest - plan.totalInterest;
  return floorDollars(less) >= 1 ? less : null;
}
```

- [ ] **Step 4: Run the pure tests to verify they pass**

Run: `npx vitest run src/__tests__/lib/dashboard/trialMoment.test.ts`
Expected: PASS.

- [ ] **Step 5: Assemble the moment in `buildDashboardInsights`**

In `src/lib/dashboard/buildInsights.ts`, add to the imports (after `import { computeUncounted } from './uncounted';`):

```ts
import { computeTrialMoment, type TrialBaseline } from './trialMoment';
```

In `interface InsightsInput`, after the `today: Date;` line, add:

```ts
  /** What the route read for the trial moment (spec §7): the server clock, the stored baseline, payments since the trial started. */
  trial: { now: Date; baseline: TrialBaseline | null; paymentsSinceStart: number | null };
```

Directly before `return {` in `buildDashboardInsights`, add:

```ts
  const trialMoment = computeTrialMoment({
    tier,
    now: input.trial.now,
    today,
    plan: completedPlan
      ? { months: completedPlan.result.months, totalInterest: completedPlan.result.totalInterestPaid }
      : null,
    baseline: input.trial.baseline,
    paymentsSinceStart: input.trial.paymentsSinceStart,
  });

```

and replace:

```ts
    uncounted: computeUncounted(debts, income, expenses),
  };
```

with:

```ts
    uncounted: computeUncounted(debts, income, expenses),
    trialMoment,
  };
```

In `src/__tests__/lib/dashboard/buildInsights.test.ts`, in `function input(...)`, replace:

```ts
    tier: FREE,
    today: TODAY,
    ...overrides,
```

with:

```ts
    tier: FREE,
    today: TODAY,
    trial: { now: new Date(2026, 8, 12, 12), baseline: null, paymentsSinceStart: null },
    ...overrides,
```

and append inside the top-level `describe('buildDashboardInsights', …)`, before its closing `});`:

```ts
  it('has no trial moment outside a trial', () => {
    expect(buildDashboardInsights(input()).trialMoment).toBeNull();
  });

  it("builds moment C from the plan it computed (spec §7 C)", () => {
    const plain = calculatePlanMetrics(DEBTS, INCOME, [{ amount: 50 }])!;
    // Now Sep 12 12:00; the trial ends Sep 14 12:00, so it started Aug 31 12:00.
    const out = buildDashboardInsights(input({
      tier: { proEligible: true, paidPro: false, trial: { active: true, endsAt: new Date(2026, 8, 14, 12).toISOString(), eligible: false } },
      trial: {
        now: new Date(2026, 8, 12, 12),
        baseline: { at: new Date(Date.UTC(2026, 8, 1)), months: plain.result.months + 2, interest: plain.result.totalInterestPaid + 100 },
        paymentsSinceStart: 3,
      },
    }));
    expect(out.trialMoment).toEqual({
      state: 'C',
      daysLeft: 2,
      elapsedDays: 12,
      monthsSooner: 2,
      interestLess: plain.result.totalInterestPaid + 100 - plain.result.totalInterestPaid,
      paymentsLogged: 3,
    });
  });
```

- [ ] **Step 6: Sweep the type change through the tests**

`TierInfo.trial.eligible` and `DashboardInsights.trialMoment` are required, so every test literal of either type needs the new field.

```bash
grep -rn "trial: { active" src/__tests__ | grep -v "eligible"
```

In every line this prints, add `, eligible: false` before the `}` that closes the `trial` object. The literals written in Steps 1 and 5 already carry `eligible`, which is why the grep excludes them. For example, `trial: { active: false, endsAt: null } }` becomes `trial: { active: false, endsAt: null, eligible: false } }`.

```bash
grep -rn "uncounted: null," src/__tests__
```

In every insights factory this prints, add `trialMoment: null,` on the next line.

Then check nothing is left:

```bash
npx tsc --noEmit 2>&1 | grep -v "src/__tests__/lib/stripe.test.ts"
```

The only remaining errors must be in `src/app/api/dashboard/insights/route.ts` (no `eligible`, no `trial` input). Step 8 fixes them.

- [ ] **Step 7: Write the failing route tests**

In `src/__tests__/api/dashboard-insights.test.ts`:

Replace the hoisted mock object's `paymentRecord` and `balanceSnapshot` lines:

```ts
    paymentRecord: { findMany: vi.fn(), findFirst: vi.fn() },
    balanceSnapshot: { findMany: vi.fn() },
```

with:

```ts
    paymentRecord: { findMany: vi.fn(), findFirst: vi.fn(), count: vi.fn() },
    balanceSnapshot: { findMany: vi.fn() },
    userPreferences: { findUnique: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
```

Replace `vi.mock('@/lib/gates', () => ({ resolveBillingVerdict: vi.fn() }));` with:

```ts
vi.mock('@/lib/gates', () => ({ resolveBillingVerdict: vi.fn(), isSelfServeTrialEligible: vi.fn() }));
```

Replace `import { resolveBillingVerdict } from '@/lib/gates';` with:

```ts
import { isSelfServeTrialEligible, resolveBillingVerdict } from '@/lib/gates';
```

In `beforeEach`, after the `mockPrisma.balanceSnapshot.findMany…` line, add:

```ts
    mockPrisma.userPreferences.findUnique.mockResolvedValue(null);
    mockPrisma.userPreferences.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.userPreferences.create.mockResolvedValue({});
    mockPrisma.paymentRecord.count.mockResolvedValue(0);
    vi.mocked(isSelfServeTrialEligible).mockResolvedValue(false);
```

In the test "builds insights from the user's own rows, uncached", replace:

```ts
    expect(body.tier).toEqual({ proEligible: false, paidPro: false, trial: { active: false, endsAt: null } });
```

with:

```ts
    expect(body.tier).toEqual({ proEligible: false, paidPro: false, trial: { active: false, endsAt: null, eligible: false } });
    expect(body.trialMoment).toBeNull();
```

In the test "reports an active signup trial", replace:

```ts
    expect(body.tier.trial).toEqual({ active: true, endsAt: new Date(2026, 8, 20).toISOString() });
```

with:

```ts
    expect(body.tier.trial).toEqual({ active: true, endsAt: new Date(2026, 8, 20).toISOString(), eligible: false });
```

Append inside the `describe`, before its closing `});`:

```ts
  it('reports self-serve trial eligibility for the account, with no trial reads or writes outside a trial', async () => {
    vi.mocked(isSelfServeTrialEligible).mockResolvedValue(true);
    const body = await (await GET(req())).json();
    expect(body.tier.trial.eligible).toBe(true);
    expect(isSelfServeTrialEligible).toHaveBeenCalledWith('owner@example.com', { paidPro: false, proEligible: false, signupTrialEndsAt: null });
    expect(mockPrisma.paymentRecord.count).not.toHaveBeenCalled();
    expect(mockPrisma.userPreferences.create).not.toHaveBeenCalled();
    expect(mockPrisma.userPreferences.updateMany).not.toHaveBeenCalled();
  });

  it('writes the trial baseline once, the first time a trial account has a plan (spec §6.4)', async () => {
    vi.mocked(resolveBillingVerdict).mockResolvedValue({ paidPro: false, proEligible: true, signupTrialEndsAt: new Date(2026, 8, 20) });
    const body = await (await GET(req('?today=2026-09-12'))).json();
    const fields = {
      trialBaselineAt: new Date(Date.UTC(2026, 8, 12)),
      trialBaselineMonths: body.plan.months,
      trialBaselineInterest: body.plan.totalInterest,
    };
    expect(mockPrisma.userPreferences.findUnique).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      select: { trialBaselineAt: true, trialBaselineMonths: true, trialBaselineInterest: true },
    });
    expect(mockPrisma.userPreferences.create).toHaveBeenCalledWith({ data: { userId: 'user-1', ...fields } });

    // A preferences row without a baseline gets a conditional update instead.
    mockPrisma.userPreferences.findUnique.mockResolvedValue({ trialBaselineAt: null, trialBaselineMonths: null, trialBaselineInterest: null });
    await GET(req('?today=2026-09-12'));
    expect(mockPrisma.userPreferences.updateMany).toHaveBeenCalledWith({ where: { userId: 'user-1', trialBaselineAt: null }, data: fields });
  });

  it('still answers when the baseline write fails', async () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(resolveBillingVerdict).mockResolvedValue({ paidPro: false, proEligible: true, signupTrialEndsAt: new Date(2026, 8, 20) });
    mockPrisma.userPreferences.create.mockRejectedValue(new Error('unique'));
    expect((await GET(req('?today=2026-09-12'))).status).toBe(200);
    quiet.mockRestore();
  });

  it('reports moment C in the last 3 days, counting payments since the trial started and keeping the baseline', async () => {
    // Now Sep 12 12:00; the trial ends Sep 14 12:00, so it started Aug 31 12:00.
    const endsAt = new Date(2026, 8, 14, 12, 0);
    vi.mocked(resolveBillingVerdict).mockResolvedValue({ paidPro: false, proEligible: true, signupTrialEndsAt: endsAt });
    mockPrisma.userPreferences.findUnique.mockResolvedValue({
      trialBaselineAt: new Date(Date.UTC(2026, 7, 31)),
      trialBaselineMonths: 99,
      trialBaselineInterest: 99_999,
    });
    mockPrisma.paymentRecord.count.mockResolvedValue(3);

    const body = await (await GET(req('?today=2026-09-12'))).json();
    expect(mockPrisma.paymentRecord.count).toHaveBeenCalledWith({
      where: { userId: 'user-1', paidAt: { gte: new Date(2026, 7, 31, 12, 0) } },
    });
    // Aug 2026 + 99 months vs Sep 2026 + today's plan months.
    expect(body.trialMoment).toEqual({
      state: 'C',
      daysLeft: 2,
      elapsedDays: 12,
      monthsSooner: 98 - body.plan.months,
      interestLess: 99_999 - body.plan.totalInterest,
      paymentsLogged: 3,
    });
    expect(mockPrisma.userPreferences.create).not.toHaveBeenCalled();
    expect(mockPrisma.userPreferences.updateMany).not.toHaveBeenCalled();
  });
```

Run: `npx vitest run src/__tests__/api/dashboard-insights.test.ts`
Expected: FAIL. `eligible` is missing from `tier.trial`, and nothing is written or counted.

- [ ] **Step 8: Implement the route**

Replace the whole of `src/app/api/dashboard/insights/route.ts` with:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, serverError, tooManyRequests } from '@/lib/auth-server';
import { isSelfServeTrialEligible, resolveBillingVerdict } from '@/lib/gates';
import { wholeDaysRemaining } from '@/lib/billing';
import { limits } from '@/lib/rateLimit';
import { buildDashboardInsights } from '@/lib/dashboard/buildInsights';
import { resolveToday } from '@/lib/dashboard/today';
import {
  TRIAL_MOMENT_WINDOW_DAYS,
  storedTrialBaseline,
  trialBaselineFields,
  trialStartOf,
  type TrialBaselineFields,
} from '@/lib/dashboard/trialMoment';
import { debtFromRow, incomeFromRow } from '@/lib/prismaMappers';

/** GET /api/dashboard/insights?today=YYYY-MM-DD — every dashboard v2 figure (spec §5.2). */
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();
  const userId = auth.user.id;

  const today = resolveToday(new URL(request.url).searchParams.get('today'));

  try {
    if (!(await limits.dashboardInsights(userId))) return tooManyRequests();

    const [debtRows, income, expenses, monthRecords, anyPayment, snapshots, verdict, preferences] = await Promise.all([
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
      prisma.userPreferences.findUnique({
        where: { userId },
        select: { trialBaselineAt: true, trialBaselineMonths: true, trialBaselineInterest: true },
      }),
    ]);

    const now = new Date();
    const trialEndsAt = verdict.signupTrialEndsAt;
    const trialActive = !verdict.paidPro && trialEndsAt !== null && trialEndsAt.getTime() > now.getTime();
    // Payments logged during the trial feed moment C only, so they are
    // counted only in its last days.
    const inLastDays =
      trialActive && trialEndsAt !== null && wholeDaysRemaining(trialEndsAt, now.getTime()) <= TRIAL_MOMENT_WINDOW_DAYS;
    const [eligible, paymentsSinceStart] = await Promise.all([
      isSelfServeTrialEligible(auth.user.email, verdict),
      inLastDays && trialEndsAt !== null
        ? prisma.paymentRecord.count({ where: { userId, paidAt: { gte: trialStartOf(trialEndsAt) } } })
        : Promise.resolve(null),
    ]);
    const baseline = storedTrialBaseline(preferences);

    const insights = buildDashboardInsights({
      // The same rows GET /api/debts and /api/income serve, mapped to the domain types at this boundary.
      debts: debtRows.map(debtFromRow),
      income: income ? incomeFromRow(income) : null,
      expenses,
      monthRecords,
      hasAnyPayment: anyPayment !== null,
      snapshots: snapshots.map((s) => ({ ...s, recordedAt: s.recordedAt.toISOString() })),
      tier: {
        proEligible: verdict.proEligible,
        paidPro: verdict.paidPro,
        trial: { active: trialActive, endsAt: trialEndsAt?.toISOString() ?? null, eligible },
      },
      today,
      trial: { now, baseline, paymentsSinceStart },
    });

    // Signup trials, and a self-serve trial started before its plan paid off,
    // take their baseline from the first plan seen during the trial (spec §6.4).
    if (insights.tier.trial.active && baseline === null && insights.plan) {
      await writeTrialBaseline(userId, preferences !== null, trialBaselineFields(insights.plan, today));
    }

    return NextResponse.json(insights, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Dashboard insights error:', error);
    return serverError('Failed to load dashboard insights');
  }
}

/** Conditional, so a concurrent first read can't overwrite a baseline that just landed. Never fails the response. */
async function writeTrialBaseline(userId: string, hasPreferences: boolean, fields: TrialBaselineFields): Promise<void> {
  try {
    if (hasPreferences) {
      await prisma.userPreferences.updateMany({ where: { userId, trialBaselineAt: null }, data: fields });
    } else {
      await prisma.userPreferences.create({ data: { userId, ...fields } });
    }
  } catch (error) {
    // Most likely a concurrent create (P2002). The next read retries if no baseline stands.
    console.error('[insights] trial baseline write failed', error);
  }
}
```

- [ ] **Step 9: Run the tests to verify they pass**

Run: `npx vitest run src/__tests__/api/dashboard-insights.test.ts src/__tests__/lib/dashboard/buildInsights.test.ts src/__tests__/lib/dashboard/trialMoment.test.ts`
Expected: PASS.

```bash
npm test
```

```bash
npx tsc --noEmit 2>&1 | grep -v "src/__tests__/lib/stripe.test.ts"
```

Expected: every test passes (report the count); no `tsc` output.

- [ ] **Step 10: Commit**

```bash
git add src/lib/dashboard/types.ts src/lib/dashboard/trialMoment.ts src/lib/dashboard/buildInsights.ts src/app/api/dashboard/insights/route.ts
```

The sweep touched test files across `src/__tests__`, so stage tracked test changes, then unstage the snapshot directory:

```bash
git add -u src/__tests__
```

```bash
git restore --staged src/__tests__/components/dashboard-v2/__snapshots__
```

`git diff --cached --name-only` must list no `.snap`, no `src/__tests__/setup.ts` and no `debug.log`.

```bash
git commit -m "feat(insights): trial eligibility, the trial baseline and upgrade moments B-D" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Trial emails reach self-serve trials

**Files:**
- Modify: `src/app/api/cron/trial-emails/route.ts` (header comment and the `findMany` where clause), `src/lib/lifecycleTrial.ts` (`trialCandidateCreatedAfter`'s comment)
- Test: `src/__tests__/api/cron-trial-emails.test.ts` (the last test)

**Interfaces:**
- Consumes: from Task 1, `UserPreferences.trialStartedAt` and the gates rule. `getSignupTrialEnd` resolves a self-serve trial's end from its grant, so the rest of the cron is unchanged.
- Produces: no new exports.

- [ ] **Step 1: Update the failing test**

In `src/__tests__/api/cron-trial-emails.test.ts`, replace the whole test `it('queries only opted-in accounts created since the trial launched', …)` with:

```ts
  it('queries opted-in accounts created since the trial launched, or whose own trial started recently (spec §6.4)', async () => {
    await GET(makeRequest());

    const args = mockPrisma.user.findMany.mock.calls[0][0];
    const [recent, optIn] = args.where.AND;
    expect(optIn).toEqual({ OR: [{ preferences: null }, { preferences: { emailOptOut: false } }] });
    expect(recent.OR[0].createdAt.gte.getTime()).toBeGreaterThanOrEqual(SIGNUP_TRIAL_LAUNCH.getTime());
    // A self-serve trial on an older account stays a candidate while either email can be due.
    const startedAfter = recent.OR[1].preferences.trialStartedAt.gte.getTime();
    expect(Math.abs(Date.now() - startedAfter - (14 + 7) * DAY)).toBeLessThan(60_000);
  });
```

Run: `npx vitest run src/__tests__/api/cron-trial-emails.test.ts`
Expected: FAIL (`args.where.AND` is undefined).

- [ ] **Step 2: Implement**

In `src/app/api/cron/trial-emails/route.ts`, in the header comment, replace:

```ts
 * Entry: account created on or after the trial launch and recent enough to
 * still be inside a window, email allowed. Skipped: paid Pro subscribers
```

with:

```ts
 * Entry: account created on or after the trial launch and recent enough to
 * still be inside a window, or an older account whose self-serve trial
 * started that recently (spec §6.4); email allowed. Skipped: paid Pro subscribers
```

Replace:

```ts
  const now = new Date();
  const createdAfter = new Date(
    Math.max(SIGNUP_TRIAL_LAUNCH.getTime(), trialCandidateCreatedAfter(now).getTime()),
  );

  const candidates = await prisma.user.findMany({
    where: {
      createdAt: { gte: createdAfter },
      OR: [{ preferences: null }, { preferences: { emailOptOut: false } }],
    },
```

with:

```ts
  const now = new Date();
  const recentWindowStart = trialCandidateCreatedAfter(now);
  const createdAfter = new Date(
    Math.max(SIGNUP_TRIAL_LAUNCH.getTime(), recentWindowStart.getTime()),
  );

  const candidates = await prisma.user.findMany({
    where: {
      AND: [
        {
          OR: [
            { createdAt: { gte: createdAfter } },
            // Self-serve trials: an older account whose own trial started
            // recently enough to still be inside a window.
            { preferences: { trialStartedAt: { gte: recentWindowStart } } },
          ],
        },
        { OR: [{ preferences: null }, { preferences: { emailOptOut: false } }] },
      ],
    },
```

In `src/lib/lifecycleTrial.ts`, replace:

```ts
/**
 * Oldest account creation that can still be due for either email. The trial
 * anchor (TrialGrant) is never later than createdAt, so any account older
 * than the far edge of the "ended" window is past both windows.
 */
```

with:

```ts
/**
 * Oldest account creation, or self-serve trial start, that can still be due
 * for either email. A window never starts before its account was created or
 * its own trial started, so anything older than the far edge of the "ended"
 * window is past both windows.
 */
```

- [ ] **Step 3: Run the tests to verify they pass**

Run: `npx vitest run src/__tests__/api/cron-trial-emails.test.ts src/__tests__/lib/lifecycleTrial.test.ts`
Expected: PASS. Then run `npm test` (report the count).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/cron/trial-emails/route.ts src/lib/lifecycleTrial.ts src/__tests__/api/cron-trial-emails.test.ts
```

```bash
git commit -m "feat(cron): send trial boundary emails to self-serve trials" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---
### Task 5: `useStartTrial`, the moment view models, and the shared constants

**Files:**
- Create: `src/lib/dashboard/upgradeMoments.ts`, `src/lib/dashboard/upgradeFeatures.ts`, `src/lib/dashboard/methodLabel.ts`
- Modify: `src/lib/hooks.ts` (after `useStartCheckout`); the constant refactor in `src/lib/dashboard/{coach,coachMoveCopy,plan,thisMonth}.ts` and `src/components/dashboard-v2/{shell/V2Shell,this-month/ThisMonthV2,coach/CoachV2,plan/StrategyControl,plan/WhatIfTiles}.tsx`
- Test: `src/__tests__/lib/useStartTrial.test.ts` (new), `src/__tests__/lib/dashboard/upgradeMoments.test.ts` (new)

**Interfaces:**
- Consumes:
  - From Task 3: `TrialMoment`.
  - Existing: `PlanReadiness`, `RateWatch`, `MonthlyInterest` (`src/lib/dashboard/types.ts`); `SIGNUP_TRIAL_DAYS` (`src/lib/billing.ts`); `floorDollars`, `floorWhole`, `shortMonthLabel` (`src/lib/dashboard/format.ts`); `formatCurrencyWhole` (`src/lib/utils.ts`).
- Produces:
  - In `src/lib/hooks.ts`:
    - `useStartTrial()`: a TanStack mutation with no variables, resolving to `StartTrialResult`.
    - `StartTrialResult = { proEligible: boolean; paidPro: boolean; signupTrialEndsAt: string | null }`.
  - `src/lib/dashboard/upgradeFeatures.ts`: `UPGRADE_FEATURE = { coachMoves: 'Coach moves', whatIf: 'What-if scenarios', customPriority: 'Custom priority order' } as const`.
  - `src/lib/dashboard/methodLabel.ts`: `METHOD_LABEL: Readonly<Record<PayoffMethod, string>>`.
  - `src/lib/dashboard/upgradeMoments.ts`:
    - `MOMENT_A: { badge; title; body; cta; pending; footnote }`, all strings.
    - `trialStartErrorMessage(status: number | undefined): string | null`.
    - `momentDismissKey(state: 'B' | 'D', endsAt: string): string`.
    - `type ChecklistRowId = 'setup' | 'what_if' | 'apr_script'`.
    - `interface ChecklistRow { id: ChecklistRowId; label: string; done: boolean; affordance: string | null }`.
    - `momentBView(moment: { day: number; daysLeft: number }, readiness: PlanReadiness, rateWatch: RateWatch | null): MomentBView`, where `MomentBView = { eyebrow; daysLeft; title; rows: ChecklistRow[] }`.
    - `momentCView(moment: Extract<TrialMoment, { state: 'C' }>, interest: MonthlyInterest | null, price: number): MomentCView`, where `MomentCView = { eyebrow: string | null; title: string; rows: { label: string; value: string }[]; price: string; priceNote: string; cta: string }`.
    - `momentDView(brief: { headline: string; summary: string } | null, generatedAt: string | null, price: number): MomentDView`, where `MomentDView = { eyebrow; title; kept: { label; headline; summary; note } | null; body: string | null; primaryCta; secondaryCta }`.

- [ ] **Step 1: Write the failing tests**

`src/__tests__/lib/useStartTrial.test.ts`:

```ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import { useStartTrial } from '@/lib/hooks';

vi.mock('@/lib/dashboard/today', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/dashboard/today')>()),
  localDateParam: () => '2026-09-17',
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useStartTrial', () => {
  it("posts the client's day and refreshes only the subscription (insights refresh through the global cache)", async () => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
    const post = vi.spyOn(axios, 'post').mockResolvedValue({
      data: { proEligible: true, paidPro: false, signupTrialEndsAt: '2026-10-01T12:00:00.000Z' },
    });

    const { result } = renderHook(() => useStartTrial(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(post).toHaveBeenCalledWith(expect.stringMatching(/\/api\/trial\/start$/), { today: '2026-09-17' });
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['subscription'] });
  });
});
```

`src/__tests__/lib/dashboard/upgradeMoments.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { SIGNUP_TRIAL_DAYS } from '@/lib/billing';
import {
  MOMENT_A, momentBView, momentCView, momentDView, momentDismissKey, trialStartErrorMessage,
} from '@/lib/dashboard/upgradeMoments';
import type { PlanReadiness, RateWatch } from '@/lib/dashboard/types';

const PRICE = 9;
const CARD = { debtId: 'c1', debtName: 'Citi', apr: 28, targetApr: 19.6, annualEstimate: 742.9 };
const RATE_WATCH: RateWatch = { cards: 1, annualEstimate: 742.9, top: CARD, moveTarget: CARD };

function readiness(done: number): PlanReadiness {
  const ids = ['debts', 'income', 'expenses', 'dueDates', 'firstPayment'] as const;
  const steps = ids.map((id, i) => ({ id, complete: i < done, pendingCount: i < done ? 0 : 1 }));
  return { steps, completeCount: done, percent: done * 20 };
}

function momentC(overrides: Partial<{ daysLeft: number; elapsedDays: number; monthsSooner: number | null; interestLess: number | null; paymentsLogged: number | null }> = {}) {
  return { state: 'C' as const, daysLeft: 2, elapsedDays: 12, monthsSooner: 7, interestLess: 6_361.9, paymentsLogged: 9, ...overrides };
}

describe('moment A copy (README §7 A)', () => {
  it('is the handoff copy with the trial length from the constant', () => {
    expect(MOMENT_A).toEqual({
      badge: `${SIGNUP_TRIAL_DAYS} days free · no card`,
      title: 'See what your plan looks like with every move switched on.',
      body: 'Two weeks of the full coach, what-if scenarios and unlimited debts. Nothing is charged, and nothing is removed from your plan when it ends.',
      cta: `Start my ${SIGNUP_TRIAL_DAYS} days`,
      pending: 'Starting…',
      footnote: 'No card. Ends on its own.',
    });
  });

  it('says "Two weeks" only while the trial is 14 days long', () => {
    expect(SIGNUP_TRIAL_DAYS).toBe(14);
  });

  it('names the refusals a start can meet', () => {
    expect(trialStartErrorMessage(409)).toBe('This email has already used its free trial.');
    expect(trialStartErrorMessage(429)).toBe('Too many tries. Wait a few minutes, then try again.');
    expect(trialStartErrorMessage(403)).toBe("Free trials aren't available on this account yet.");
    expect(trialStartErrorMessage(500)).toBeNull();
    expect(trialStartErrorMessage(undefined)).toBeNull();
  });
});

describe('momentBView (plan decision 5)', () => {
  it('lists three things while setup is unfinished and a card can be called', () => {
    expect(momentBView({ day: 2, daysLeft: 12 }, readiness(3), RATE_WATCH)).toEqual({
      eyebrow: 'Pro is on · day 2',
      daysLeft: '12 days left',
      title: "Three things worth doing while it's on.",
      rows: [
        { id: 'setup', label: 'Finish your plan setup', done: false, affordance: 'Open →' },
        { id: 'what_if', label: 'Run one what-if', done: false, affordance: 'Open →' },
        { id: 'apr_script', label: 'Call one card about its APR', done: false, affordance: 'Script →' },
      ],
    });
  });

  it('ticks a finished setup and drops the call with no card to call', () => {
    const view = momentBView({ day: 1, daysLeft: 1 }, readiness(5), null);
    expect(view.title).toBe("Two things worth doing while it's on.");
    expect(view.daysLeft).toBe('1 day left');
    expect(view.rows.map((r) => [r.id, r.done, r.affordance])).toEqual([
      ['setup', true, null],
      ['what_if', false, 'Open →'],
    ]);
  });
});

describe('momentCView (plan decision 6)', () => {
  it('shows each positive row, floors the interest, and anchors the price to the est. monthly interest', () => {
    expect(momentCView(momentC(), { monthlyEstimate: 840.99, avgMonthlySavedByPlan: null }, PRICE)).toEqual({
      eyebrow: '2 days left of Pro',
      title: 'What the last 12 days actually moved.',
      rows: [
        { label: 'Debt-free date', value: '7 months sooner' },
        { label: 'Projected interest', value: '$6,361 less' },
        { label: 'Payments logged', value: '9' },
      ],
      price: '$9',
      priceNote: '/month · against $840/mo est. interest',
      cta: 'Keep Pro',
    });
  });

  it('uses singulars and keeps only the rows that exist', () => {
    const view = momentCView(momentC({ monthsSooner: 1, interestLess: null, paymentsLogged: null, daysLeft: 1 }), null, PRICE);
    expect(view.rows).toEqual([{ label: 'Debt-free date', value: '1 month sooner' }]);
    expect(view.eyebrow).toBe('1 day left of Pro');
    expect(view.priceNote).toBe('/month');
  });

  it('with no rows, the countdown is the title and there is no eyebrow', () => {
    const view = momentCView(momentC({ monthsSooner: null, interestLess: null, paymentsLogged: null, daysLeft: 3 }), { monthlyEstimate: 0.5, avgMonthlySavedByPlan: null }, PRICE);
    expect(view.eyebrow).toBeNull();
    expect(view.title).toBe('3 days left of Pro.');
    expect(view.rows).toEqual([]);
    expect(view.priceNote).toBe('/month');
  });
});

describe('momentDView (plan decision 7)', () => {
  it('keeps the last brief, dated in the reader\'s time zone', () => {
    const generatedAt = new Date(2026, 8, 10, 12).toISOString();
    expect(momentDView({ headline: 'Payments stalling.', summary: 'Two debts missed September.' }, generatedAt, PRICE)).toEqual({
      eyebrow: 'Back on Free · your plan is intact',
      title: "Your last coach brief stays. New ones don't.",
      kept: {
        label: 'Kept — Sep 10',
        headline: 'Payments stalling.',
        summary: 'Two debts missed September.',
        note: 'Fully readable. It was generated while you had Pro, so it stays yours.',
      },
      body: "From here your balances keep moving and the brief doesn't. Pro is what keeps it current.",
      primaryCta: 'Turn Pro back on — $9/mo',
      secondaryCta: 'Stay on Free for now',
    });
  });

  it('without a brief, says only that nothing was removed', () => {
    expect(momentDView(null, null, PRICE)).toMatchObject({
      title: 'Nothing was removed from your plan.',
      kept: null,
      body: null,
      primaryCta: 'Turn Pro back on — $9/mo',
    });
  });

  it('labels a brief with an unreadable date "Kept"', () => {
    expect(momentDView({ headline: 'h', summary: 's' }, 'not a date', PRICE).kept?.label).toBe('Kept');
  });
});

describe('momentDismissKey', () => {
  it('is per state and per trial end', () => {
    expect(momentDismissKey('B', '2026-10-01T12:00:00.000Z')).toBe('sp_trial_moment_B:2026-10-01T12:00:00.000Z');
    expect(momentDismissKey('D', '2026-09-15T12:00:00.000Z')).toBe('sp_trial_moment_D:2026-09-15T12:00:00.000Z');
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/__tests__/lib/useStartTrial.test.ts src/__tests__/lib/dashboard/upgradeMoments.test.ts`
Expected: FAIL. `useStartTrial` is not a function, and `@/lib/dashboard/upgradeMoments` doesn't resolve.

- [ ] **Step 3: Implement the hook and the view models**

In `src/lib/hooks.ts`, directly after the `useStartCheckout` function's closing `}`, add:

```ts
export interface StartTrialResult {
  proEligible: boolean;
  paidPro: boolean;
  signupTrialEndsAt: string | null;
}

/**
 * Starts the self-serve trial (spec §7 A). The global MutationCache
 * (providers.tsx) refreshes insights after it settles; the subscription query
 * has no global refresh, so it is invalidated here.
 */
export function useStartTrial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<StartTrialResult> => {
      const { data } = await axios.post(`${API_URL}/api/trial/start`, { today: localDateParam() });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });
}
```

`src/lib/dashboard/upgradeMoments.ts`:

```ts
import { SIGNUP_TRIAL_DAYS } from '@/lib/billing';
import { formatCurrencyWhole } from '@/lib/utils';
import { floorDollars, floorWhole, shortMonthLabel } from './format';
import type { MonthlyInterest, PlanReadiness, RateWatch, TrialMoment } from './types';

/**
 * Upgrade moments A–D (spec §7; README §7). Copy only: the components own
 * the actions. Every figure is one the insights endpoint computed.
 */

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

/** Moment A: the self-serve trial sheet. "Two weeks" is guarded by a test on SIGNUP_TRIAL_DAYS. */
export const MOMENT_A = {
  badge: `${SIGNUP_TRIAL_DAYS} days free · no card`,
  title: 'See what your plan looks like with every move switched on.',
  body: 'Two weeks of the full coach, what-if scenarios and unlimited debts. Nothing is charged, and nothing is removed from your plan when it ends.',
  cta: `Start my ${SIGNUP_TRIAL_DAYS} days`,
  pending: 'Starting…',
  footnote: 'No card. Ends on its own.',
} as const;

/** The copy for POST /api/trial/start's refusals; null for anything else. */
export function trialStartErrorMessage(status: number | undefined): string | null {
  if (status === 409) return 'This email has already used its free trial.';
  if (status === 429) return 'Too many tries. Wait a few minutes, then try again.';
  if (status === 403) return "Free trials aren't available on this account yet.";
  return null;
}

/** localStorage key that hides a dismissed moment for this trial only. */
export function momentDismissKey(state: 'B' | 'D', endsAt: string): string {
  return `sp_trial_moment_${state}:${endsAt}`;
}

// ── Moment B: trial days 1–3 ─────────────────────────────────────────────────

export type ChecklistRowId = 'setup' | 'what_if' | 'apr_script';
export interface ChecklistRow { id: ChecklistRowId; label: string; done: boolean; affordance: string | null }
export interface MomentBView { eyebrow: string; daysLeft: string; title: string; rows: ChecklistRow[] }

/**
 * Only setup has a tracked finish (readiness 5 of 5); what-ifs and calls are
 * not recorded, so their rows never tick. The call needs a card to call.
 */
export function momentBView(
  moment: { day: number; daysLeft: number },
  readiness: PlanReadiness,
  rateWatch: RateWatch | null,
): MomentBView {
  const setupDone = readiness.steps.every((step) => step.complete);
  const rows: ChecklistRow[] = [
    { id: 'setup', label: 'Finish your plan setup', done: setupDone, affordance: setupDone ? null : 'Open →' },
    { id: 'what_if', label: 'Run one what-if', done: false, affordance: 'Open →' },
    ...(rateWatch
      ? [{ id: 'apr_script' as const, label: 'Call one card about its APR', done: false, affordance: 'Script →' }]
      : []),
  ];
  return {
    eyebrow: `Pro is on · day ${moment.day}`,
    daysLeft: `${moment.daysLeft} ${plural(moment.daysLeft, 'day', 'days')} left`,
    title: `${rows.length === 3 ? 'Three' : 'Two'} things worth doing while it's on.`,
    rows,
  };
}

// ── Moment C: the last 3 days ────────────────────────────────────────────────

export interface MomentCView {
  eyebrow: string | null;
  title: string;
  rows: Array<{ label: string; value: string }>;
  price: string;
  priceNote: string;
  cta: string;
}

/** Rows only for positive figures; "Projected interest" because it compares two projections (X12). */
export function momentCView(
  moment: Extract<TrialMoment, { state: 'C' }>,
  interest: MonthlyInterest | null,
  price: number,
): MomentCView {
  const left = `${moment.daysLeft} ${plural(moment.daysLeft, 'day', 'days')} left of Pro`;
  const rows = [
    ...(moment.monthsSooner !== null
      ? [{ label: 'Debt-free date', value: `${moment.monthsSooner} ${plural(moment.monthsSooner, 'month', 'months')} sooner` }]
      : []),
    ...(moment.interestLess !== null ? [{ label: 'Projected interest', value: `${floorWhole(moment.interestLess)} less` }] : []),
    ...(moment.paymentsLogged !== null ? [{ label: 'Payments logged', value: String(moment.paymentsLogged) }] : []),
  ];
  const monthly = interest ? floorDollars(interest.monthlyEstimate) : 0;
  return {
    eyebrow: rows.length > 0 ? left : null,
    title: rows.length > 0 ? `What the last ${moment.elapsedDays} days actually moved.` : `${left}.`,
    rows,
    price: formatCurrencyWhole(price),
    priceNote: monthly >= 1 ? `/month · against ${formatCurrencyWhole(monthly)}/mo est. interest` : '/month',
    cta: 'Keep Pro',
  };
}

// ── Moment D: just ended ─────────────────────────────────────────────────────

export interface MomentDView {
  eyebrow: string;
  title: string;
  kept: { label: string; headline: string; summary: string; note: string } | null;
  body: string | null;
  primaryCta: string;
  secondaryCta: string;
}

/** "Kept — Sep 10" in the reader's time zone; "Kept" when the date can't be read. */
function keptLabel(generatedAt: string | null): string {
  const date = generatedAt ? new Date(generatedAt) : null;
  if (!date || Number.isNaN(date.getTime())) return 'Kept';
  return `Kept — ${shortMonthLabel(date.getMonth())} ${date.getDate()}`;
}

/**
 * The cached brief is the kept artifact (README "the endowment point"). A
 * brief can only be generated with Pro, so the note's claim holds for any
 * cached one. Without a brief, only the plan promise remains.
 */
export function momentDView(
  brief: { headline: string; summary: string } | null,
  generatedAt: string | null,
  price: number,
): MomentDView {
  const shared = {
    eyebrow: 'Back on Free · your plan is intact',
    primaryCta: `Turn Pro back on — ${formatCurrencyWhole(price)}/mo`,
    secondaryCta: 'Stay on Free for now',
  };
  if (!brief) {
    return { ...shared, title: 'Nothing was removed from your plan.', kept: null, body: null };
  }
  return {
    ...shared,
    title: "Your last coach brief stays. New ones don't.",
    kept: {
      label: keptLabel(generatedAt),
      headline: brief.headline,
      summary: brief.summary,
      note: 'Fully readable. It was generated while you had Pro, so it stays yours.',
    },
    body: "From here your balances keep moving and the brief doesn't. Pro is what keeps it current.",
  };
}
```

- [ ] **Step 4: Run them to verify they pass**

Run: `npx vitest run src/__tests__/lib/useStartTrial.test.ts src/__tests__/lib/dashboard/upgradeMoments.test.ts`
Expected: PASS.

- [ ] **Step 5: Share the feature keys and the method labels (refactor; existing tests are the guard)**

`src/lib/dashboard/upgradeFeatures.ts`:

```ts
/**
 * The feature keys v2's gated controls send through upgradeEvents. Each one
 * selects getUpgradeMessage's copy (src/lib/upgradeMessaging.ts) in the
 * upgrade sheet. v1 components keep their own literals.
 */
export const UPGRADE_FEATURE = {
  coachMoves: 'Coach moves',
  whatIf: 'What-if scenarios',
  customPriority: 'Custom priority order',
} as const;
```

`src/lib/dashboard/methodLabel.ts`:

```ts
import type { PayoffMethod } from '@/lib/snowball';

/** Display names for the payoff methods: one source for every v2 view model. */
export const METHOD_LABEL: Readonly<Record<PayoffMethod, string>> = {
  snowball: 'Snowball',
  avalanche: 'Avalanche',
  custom: 'Custom',
};
```

Replace each local copy:
- `src/lib/dashboard/coach.ts`:
  - Delete the line `const METHOD_LABEL = { snowball: 'Snowball', avalanche: 'Avalanche' } as const;`.
  - Add `import { METHOD_LABEL } from './methodLabel';` after `import { floorDollars, floorWhole } from './format';`.
- `src/lib/dashboard/coachMoveCopy.ts`:
  - Delete the line `const METHOD_LABEL = { snowball: 'Snowball', avalanche: 'Avalanche' } as const;`.
  - Add `import { METHOD_LABEL } from './methodLabel';` after `import { floorWhole } from './format';`.
- `src/lib/dashboard/plan.ts`:
  - Delete the line `const METHOD_LABEL: Record<PayoffMethod, string> = { snowball: 'Snowball', avalanche: 'Avalanche', custom: 'Custom' };`.
  - Add `import { METHOD_LABEL } from './methodLabel';` after `import type { PlanGap } from './types';`.
- `src/lib/dashboard/thisMonth.ts`:
  - Delete the line `const METHOD_LABEL = { snowball: 'Snowball', avalanche: 'Avalanche' } as const;`.
  - Add `import { METHOD_LABEL } from './methodLabel';` after the `import { floorDollars, floorWhole, monthYearLabel, shortMonthLabel } from './format';` line.
- `src/components/dashboard-v2/shell/V2Shell.tsx`:
  - Delete the two lines `/** Opens UpgradeModal with its coach copy (upgradeMessaging.ts). PR 6 swaps in the trial sheet. */` and `const RAIL_UPGRADE_FEATURE = "Coach moves";`.
  - Add `import { UPGRADE_FEATURE } from "@/lib/dashboard/upgradeFeatures";` after the `computeUpgradeRail` import.
  - Change `upgradeEvents.dispatch(RAIL_UPGRADE_FEATURE)` to `upgradeEvents.dispatch(UPGRADE_FEATURE.coachMoves)`.
- `src/components/dashboard-v2/this-month/ThisMonthV2.tsx`:
  - Delete `/** Opens UpgradeModal with its coach copy, like the sidebar rail (V2Shell). */` and `const MOVES_UPGRADE_FEATURE = "Coach moves";`.
  - Add `import { UPGRADE_FEATURE } from "@/lib/dashboard/upgradeFeatures";` after the `upgradeEvents` import.
  - Change `upgradeEvents.dispatch(MOVES_UPGRADE_FEATURE)` to `upgradeEvents.dispatch(UPGRADE_FEATURE.coachMoves)`.
- `src/components/dashboard-v2/coach/CoachV2.tsx`:
  - Delete `/** Opens UpgradeModal with its coach copy, like the sidebar rail and This Month's row. */` and `const MOVES_UPGRADE_FEATURE = "Coach moves";`.
  - Add `import { UPGRADE_FEATURE } from "@/lib/dashboard/upgradeFeatures";` after the `upgradeEvents` import.
  - Change `upgradeEvents.dispatch(MOVES_UPGRADE_FEATURE)` to `upgradeEvents.dispatch(UPGRADE_FEATURE.coachMoves)`.
- `src/components/dashboard-v2/plan/StrategyControl.tsx`:
  - Delete `/** StrategySelector.tsx's feature key: the same UpgradeModal copy. */` and `const CUSTOM_FEATURE = "Custom priority order";`.
  - Add `import { UPGRADE_FEATURE } from "@/lib/dashboard/upgradeFeatures";` after the `methodLabel` import.
  - Change `feature={CUSTOM_FEATURE}` to `feature={UPGRADE_FEATURE.customPriority}`.
- `src/components/dashboard-v2/plan/WhatIfTiles.tsx`:
  - Delete `/** WhatIfCard.tsx's feature key: the same UpgradeModal copy. */` and `export const WHAT_IF_FEATURE = "What-if scenarios";`.
  - Add `import { UPGRADE_FEATURE } from "@/lib/dashboard/upgradeFeatures";` after the `@/lib/dashboard/plan` import.
  - Change both `feature={WHAT_IF_FEATURE}` to `feature={UPGRADE_FEATURE.whatIf}`.

Check that nothing is left:

```bash
grep -rn "METHOD_LABEL = \|RAIL_UPGRADE_FEATURE\|MOVES_UPGRADE_FEATURE\|CUSTOM_FEATURE\|WHAT_IF_FEATURE" src
```

Expected: exactly one line, the `METHOD_LABEL` declaration in `src/lib/dashboard/methodLabel.ts`.

- [ ] **Step 6: Run the whole suite and the type check**

```bash
npm test
```

```bash
npx tsc --noEmit 2>&1 | grep -v "src/__tests__/lib/stripe.test.ts"
```

```bash
npm run lint
```

Expected: every test passes (report the count), no `tsc` output, lint clean.

- [ ] **Step 7: Commit**

```bash
git add src/lib/hooks.ts src/lib/dashboard/upgradeMoments.ts src/lib/dashboard/upgradeFeatures.ts src/lib/dashboard/methodLabel.ts src/lib/dashboard/coach.ts src/lib/dashboard/coachMoveCopy.ts src/lib/dashboard/plan.ts src/lib/dashboard/thisMonth.ts src/components/dashboard-v2/shell/V2Shell.tsx src/components/dashboard-v2/this-month/ThisMonthV2.tsx src/components/dashboard-v2/coach/CoachV2.tsx src/components/dashboard-v2/plan/StrategyControl.tsx src/components/dashboard-v2/plan/WhatIfTiles.tsx src/__tests__/lib/useStartTrial.test.ts src/__tests__/lib/dashboard/upgradeMoments.test.ts
```

```bash
git commit -m "feat(dashboard-v2): trial start hook, upgrade moment copy, shared feature keys and method labels" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Moment A, the fallback sheet, and `UpgradeHost`

**Files:**
- Create: `src/components/dashboard-v2/upgrade/trialStartError.ts`, `src/components/dashboard-v2/upgrade/TrialStartSheet.tsx`, `src/components/dashboard-v2/upgrade/UpgradeFallbackSheet.tsx`, `src/components/dashboard-v2/upgrade/UpgradeHost.tsx`
- Test: `src/__tests__/components/dashboard-v2/TrialStartSheet.test.ts`, `UpgradeFallbackSheet.test.ts`, `UpgradeHost.test.ts` (all new, in `src/__tests__/components/dashboard-v2/`)

**Interfaces:**
- Consumes:
  - From Task 5: `useStartTrial`, `MOMENT_A`, `trialStartErrorMessage`.
  - Existing:
    - `Sheet` (`src/components/dashboard-v2/sheets/Sheet.tsx`: `{ title; description?; busy?; onClose; children; footer? }`)
    - `useStartCheckout`, `useDashboardInsights`, `getErrorMessage` (`src/lib/hooks.ts`)
    - `getUpgradeMessage`, `UPGRADE_MESSAGE_VERSION` (`src/lib/upgradeMessaging.ts`)
- Produces:
  - `trialStartError(error: unknown): string`.
  - `TrialStartSheet` (default), props `{ onClose: () => void }`.
  - `UpgradeFallbackSheet` (default), props `{ feature?: string; interestAtStake: number; onClose: () => void }`.
  - `UpgradeHost` (default), props `{ feature?: string; interestAtStake: number; onClose: () => void }`.

- [ ] **Step 1: Write the failing tests**

`src/__tests__/components/dashboard-v2/TrialStartSheet.test.ts`:

```ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { AxiosError, type AxiosResponse } from 'axios';
import { useStartTrial } from '@/lib/hooks';
import { track, Events } from '@/lib/analytics';
import { MOMENT_A } from '@/lib/dashboard/upgradeMoments';
import TrialStartSheet from '@/components/dashboard-v2/upgrade/TrialStartSheet';

vi.mock('@/lib/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/hooks')>()),
  useStartTrial: vi.fn(),
}));
vi.mock('@/lib/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/analytics')>()),
  track: vi.fn(),
}));

function renderSheet(state: Record<string, unknown> = {}) {
  const mutate = vi.fn();
  vi.mocked(useStartTrial).mockReturnValue(
    { mutate, isPending: false, isError: false, error: null, ...state } as unknown as ReturnType<typeof useStartTrial>,
  );
  const onClose = vi.fn();
  render(createElement(TrialStartSheet, { onClose }));
  return { mutate, onClose };
}

function httpError(status: number): AxiosError {
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    data: { error: 'trial_used' },
  } as unknown as AxiosResponse);
}

afterEach(() => vi.clearAllMocks());

describe('TrialStartSheet — moment A (spec §7)', () => {
  it('shows the handoff copy and records the view', () => {
    renderSheet();
    const dialog = screen.getByRole('dialog', { name: MOMENT_A.title });
    expect(within(dialog).getByText(MOMENT_A.badge)).toBeTruthy();
    expect(within(dialog).getByText(MOMENT_A.body)).toBeTruthy();
    expect(within(dialog).getByText(MOMENT_A.footnote)).toBeTruthy();
    expect(track).toHaveBeenCalledWith(Events.UPGRADE_MOMENT_VIEWED, { state: 'A' });
  });

  it('starts the trial and closes once it has started', () => {
    const { mutate, onClose } = renderSheet();
    fireEvent.click(screen.getByRole('button', { name: MOMENT_A.cta }));
    expect(track).toHaveBeenCalledWith(Events.UPGRADE_MOMENT_CTA, { state: 'A', action: 'start_trial' });
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    const [, options] = mutate.mock.calls[0] as [unknown, { onSuccess: () => void }];
    options.onSuccess();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('holds the sheet while the trial starts', () => {
    renderSheet({ isPending: true });
    expect((screen.getByRole('button', { name: MOMENT_A.pending }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Close' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('says so when the email already used its trial', () => {
    renderSheet({ isError: true, error: httpError(409) });
    expect(screen.getByRole('alert').textContent).toBe('This email has already used its free trial.');
  });
});
```

`src/__tests__/components/dashboard-v2/UpgradeFallbackSheet.test.ts`:

```ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { useStartCheckout } from '@/lib/hooks';
import { track, Events } from '@/lib/analytics';
import { PLANS } from '@/lib/stripe';
import { formatCurrencyWhole } from '@/lib/utils';
import { getUpgradeMessage, UPGRADE_MESSAGE_VERSION } from '@/lib/upgradeMessaging';
import UpgradeFallbackSheet from '@/components/dashboard-v2/upgrade/UpgradeFallbackSheet';

vi.mock('@/lib/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/hooks')>()),
  useStartCheckout: vi.fn(),
}));
vi.mock('@/lib/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/analytics')>()),
  track: vi.fn(),
}));

const FEATURE = 'What-if scenarios';
const MESSAGE = getUpgradeMessage(FEATURE);

function renderSheet({ interestAtStake = 1_234, checkout = {} as Record<string, unknown> } = {}) {
  const mutate = vi.fn();
  vi.mocked(useStartCheckout).mockReturnValue(
    { mutate, isPending: false, isError: false, error: null, ...checkout } as unknown as ReturnType<typeof useStartCheckout>,
  );
  const onClose = vi.fn();
  render(createElement(UpgradeFallbackSheet, { feature: FEATURE, interestAtStake, onClose }));
  return { mutate, onClose };
}

afterEach(() => vi.clearAllMocks());

describe("UpgradeFallbackSheet — UpgradeModal's content in the v2 sheet (spec §7)", () => {
  it("shows the feature's copy, the interest anchor and the price, and records the view", () => {
    renderSheet();
    const dialog = screen.getByRole('dialog', { name: MESSAGE.headline });
    expect(within(dialog).getByText(MESSAGE.description)).toBeTruthy();
    for (const benefit of MESSAGE.benefits) expect(within(dialog).getByText(benefit)).toBeTruthy();
    expect(within(dialog).getByText(formatCurrencyWhole(1_234))).toBeTruthy();
    expect(within(dialog).getByText(formatCurrencyWhole(PLANS.pro.price))).toBeTruthy();
    expect(track).toHaveBeenCalledWith(Events.UPGRADE_MODAL_VIEWED, {
      feature: FEATURE, trigger: MESSAGE.id, message_version: UPGRADE_MESSAGE_VERSION, source: 'dashboard_v2_upgrade_sheet',
    });
  });

  it('omits the anchor without a real saving', () => {
    renderSheet({ interestAtStake: 0 });
    expect(screen.queryByText(/projected to avoid/)).toBeNull();
  });

  it('starts the existing checkout from its CTA', () => {
    const { mutate } = renderSheet();
    fireEvent.click(screen.getByRole('button', { name: MESSAGE.monthlyCta }));
    expect(track).toHaveBeenCalledWith(Events.CHECKOUT_STARTED, {
      source: 'upgrade_sheet', feature: FEATURE, trigger: MESSAGE.id, message_version: UPGRADE_MESSAGE_VERSION, billing: 'monthly',
    });
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it('records one dismissal and closes on "Continue with Free"', () => {
    const { onClose } = renderSheet();
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Free' }));
    expect(track).toHaveBeenCalledWith(Events.UPGRADE_MODAL_DISMISSED, {
      feature: FEATURE, trigger: MESSAGE.id, message_version: UPGRADE_MESSAGE_VERSION, reason: 'continue_free', source: 'dashboard_v2_upgrade_sheet',
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('holds the sheet while checkout redirects', () => {
    renderSheet({ checkout: { isPending: true } });
    expect((screen.getByRole('button', { name: 'Redirecting…' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Continue with Free' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows an alert when checkout fails', () => {
    renderSheet({ checkout: { isError: true, error: new Error('Network down') } });
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});
```

`src/__tests__/components/dashboard-v2/UpgradeHost.test.ts`:

```ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { render } from '@testing-library/react';
import { useDashboardInsights } from '@/lib/hooks';
import UpgradeHost from '@/components/dashboard-v2/upgrade/UpgradeHost';

const seen = vi.hoisted(() => ({ trial: null as null | Record<string, unknown>, fallback: null as null | Record<string, unknown> }));

vi.mock('@/lib/hooks', () => ({ useDashboardInsights: vi.fn() }));
vi.mock('@/components/dashboard-v2/upgrade/TrialStartSheet', () => ({
  default: (props: Record<string, unknown>) => { seen.trial = props; return null; },
}));
vi.mock('@/components/dashboard-v2/upgrade/UpgradeFallbackSheet', () => ({
  default: (props: Record<string, unknown>) => { seen.fallback = props; return null; },
}));

function renderHost(eligible: boolean | undefined) {
  const data = eligible === undefined ? undefined : { tier: { trial: { eligible } } };
  vi.mocked(useDashboardInsights).mockReturnValue({ data } as unknown as ReturnType<typeof useDashboardInsights>);
  const onClose = vi.fn();
  render(createElement(UpgradeHost, { feature: 'Coach moves', interestAtStake: 500, onClose }));
  return { onClose };
}

afterEach(() => {
  vi.clearAllMocks();
  seen.trial = null;
  seen.fallback = null;
});

describe('UpgradeHost (spec §7; plan decision 8)', () => {
  it('offers the trial to an account that can start one', () => {
    const { onClose } = renderHost(true);
    expect(seen.trial).toEqual({ onClose });
    expect(seen.fallback).toBeNull();
  });

  it('offers checkout to everyone else, with the feature copy and the anchor', () => {
    const { onClose } = renderHost(false);
    expect(seen.fallback).toEqual({ feature: 'Coach moves', interestAtStake: 500, onClose });
    expect(seen.trial).toBeNull();
  });

  it('never offers a trial it cannot confirm: checkout while insights load', () => {
    renderHost(undefined);
    expect(seen.fallback).not.toBeNull();
    expect(seen.trial).toBeNull();
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/__tests__/components/dashboard-v2/TrialStartSheet.test.ts src/__tests__/components/dashboard-v2/UpgradeFallbackSheet.test.ts src/__tests__/components/dashboard-v2/UpgradeHost.test.ts`
Expected: FAIL with "Failed to resolve import" for the three components.

- [ ] **Step 3: Implement**

`src/components/dashboard-v2/upgrade/trialStartError.ts`:

```ts
import { AxiosError } from "axios";
import { getErrorMessage } from "@/lib/hooks";
import { trialStartErrorMessage } from "@/lib/dashboard/upgradeMoments";

/** A failed POST /api/trial/start as one sentence: the named refusals, else the server's message. */
export function trialStartError(error: unknown): string {
  const status = error instanceof AxiosError ? error.response?.status : undefined;
  return trialStartErrorMessage(status) ?? getErrorMessage(error, "Couldn't start your trial. Try again.");
}
```

`src/components/dashboard-v2/upgrade/TrialStartSheet.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { useStartTrial } from "@/lib/hooks";
import { track, Events } from "@/lib/analytics";
import { MOMENT_A } from "@/lib/dashboard/upgradeMoments";
import Sheet from "../sheets/Sheet";
import { CTA_BLUE, ERROR_LINE } from "../styles";
import { trialStartError } from "./trialStartError";

interface TrialStartSheetProps {
  onClose: () => void;
}

/**
 * Upgrade moment A (spec §7): a Free account that never had a trial starts
 * its own from any gated control. No card; the server's once-per-email grant
 * means a second press can only be refused. On success the sheet closes and
 * the refreshed insights turn the dashboard Pro.
 */
export default function TrialStartSheet({ onClose }: TrialStartSheetProps) {
  const startTrial = useStartTrial();

  useEffect(() => {
    track(Events.UPGRADE_MOMENT_VIEWED, { state: "A" });
  }, []);

  const start = () => {
    if (startTrial.isPending) return;
    track(Events.UPGRADE_MOMENT_CTA, { state: "A", action: "start_trial" });
    startTrial.mutate(undefined, { onSuccess: onClose });
  };

  const error = startTrial.isError ? trialStartError(startTrial.error) : null;

  return (
    <Sheet
      title={MOMENT_A.title}
      busy={startTrial.isPending}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={start} disabled={startTrial.isPending} className={CTA_BLUE}>
            {startTrial.isPending ? MOMENT_A.pending : MOMENT_A.cta}
          </button>
          {error && <p role="alert" className={`mt-2 ${ERROR_LINE}`}>{error}</p>}
          <p className="mt-2 text-center text-[12px] text-txt-muted">{MOMENT_A.footnote}</p>
        </>
      }
    >
      {/* Neutral, not the handoff's blue: blue is for CTAs and active states (DESIGN.md). */}
      <span className="inline-flex rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-extrabold text-txt">
        {MOMENT_A.badge}
      </span>
      <p className="mt-3 text-[13px] leading-relaxed text-txt [text-wrap:pretty]">{MOMENT_A.body}</p>
    </Sheet>
  );
}
```

`src/components/dashboard-v2/upgrade/UpgradeFallbackSheet.tsx`:

```tsx
"use client";

import { useEffect, useMemo, useRef } from "react";
import { Check } from "lucide-react";
import { getErrorMessage, useStartCheckout } from "@/lib/hooks";
import { PLANS } from "@/lib/stripe";
import { track, Events } from "@/lib/analytics";
import { formatCurrencyWhole } from "@/lib/utils";
import { getUpgradeMessage, UPGRADE_MESSAGE_VERSION } from "@/lib/upgradeMessaging";
import Sheet from "../sheets/Sheet";
import { CTA_BLUE, ERROR_LINE, EYEBROW } from "../styles";

/** Keeps v2's upgrade funnel separable from v1's UpgradeModal ("dashboard_upgrade_modal"). */
const SOURCE = "dashboard_v2_upgrade_sheet";

interface UpgradeFallbackSheetProps {
  feature?: string;
  /** Projected interest avoided vs minimum-only payments: DashboardClient's figure, as UpgradeModal receives it. */
  interestAtStake: number;
  onClose: () => void;
}

/**
 * The upgrade prompt for an account that can't start a trial (spec §7): the
 * existing UpgradeModal's feature copy, interest anchor and analytics, in the
 * v2 sheet. v1 keeps UpgradeModal itself.
 */
export default function UpgradeFallbackSheet({ feature, interestAtStake, onClose }: UpgradeFallbackSheetProps) {
  const checkout = useStartCheckout();
  const message = useMemo(() => getUpgradeMessage(feature), [feature]);
  const featureKey = feature ?? "general";
  const dismissedRef = useRef(false);

  useEffect(() => {
    track(Events.UPGRADE_MODAL_VIEWED, {
      feature: featureKey,
      trigger: message.id,
      message_version: UPGRADE_MESSAGE_VERSION,
      source: SOURCE,
    });
  }, [featureKey, message.id]);

  const dismiss = (reason: "sheet_close" | "continue_free") => {
    if (checkout.isPending || dismissedRef.current) return;
    dismissedRef.current = true;
    track(Events.UPGRADE_MODAL_DISMISSED, {
      feature: featureKey,
      trigger: message.id,
      message_version: UPGRADE_MESSAGE_VERSION,
      reason,
      source: SOURCE,
    });
    onClose();
  };

  const startCheckout = () => {
    track(Events.CHECKOUT_STARTED, {
      source: "upgrade_sheet",
      feature: featureKey,
      trigger: message.id,
      message_version: UPGRADE_MESSAGE_VERSION,
      billing: "monthly",
    });
    checkout.mutate();
  };

  const error = checkout.isError
    ? getErrorMessage(checkout.error, "Could not start checkout. Please try again.")
    : null;

  return (
    <Sheet
      title={message.headline}
      description={message.description}
      busy={checkout.isPending}
      onClose={() => dismiss("sheet_close")}
      footer={
        <>
          <button type="button" onClick={startCheckout} disabled={checkout.isPending} className={CTA_BLUE}>
            {checkout.isPending ? "Redirecting…" : message.monthlyCta}
          </button>
          <button
            type="button"
            onClick={() => dismiss("continue_free")}
            disabled={checkout.isPending}
            className="mt-1 flex min-h-11 w-full items-center justify-center rounded-lg text-[13px] font-bold text-txt-muted outline-none hover:bg-bg focus-visible:outline-2 focus-visible:outline-action disabled:cursor-not-allowed disabled:opacity-60"
          >
            Continue with Free
          </button>
          {error && <p role="alert" className={`mt-2 ${ERROR_LINE}`}>{error}</p>}
          <p className="mt-1 text-center text-[11px] text-txt-muted">Cancel anytime. Your debts and plan stay if you downgrade.</p>
        </>
      }
    >
      <p className={`${EYEBROW} text-txt-muted`}>SnowballPay Pro</p>
      {interestAtStake > 0 && (
        <p className="mt-2 rounded-lg border border-border bg-bg px-3 py-2 text-[13px] leading-relaxed text-txt [text-wrap:pretty]">
          Your current plan is projected to avoid{" "}
          <strong className="mono tabular-nums">{formatCurrencyWhole(interestAtStake)}</strong>{" "}
          in interest compared with minimum-only payments. Pro helps you monitor and adjust that plan.
        </p>
      )}
      <ul className="mt-3 flex flex-col gap-2">
        {message.benefits.map((benefit) => (
          <li key={benefit} className="flex items-start gap-2 text-[13px] leading-snug text-txt">
            <Check size={16} strokeWidth={2.5} aria-hidden="true" className="mt-px shrink-0 text-success-text" />
            <span>{benefit}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 flex items-baseline gap-1">
        <span className="mono text-[26px] font-extrabold tabular-nums text-txt">{formatCurrencyWhole(PLANS.pro.price)}</span>
        <span className="text-[13px] text-txt-muted">/month</span>
      </p>
    </Sheet>
  );
}
```

`src/components/dashboard-v2/upgrade/UpgradeHost.tsx`:

```tsx
"use client";

import { useDashboardInsights } from "@/lib/hooks";
import TrialStartSheet from "./TrialStartSheet";
import UpgradeFallbackSheet from "./UpgradeFallbackSheet";

interface UpgradeHostProps {
  feature?: string;
  interestAtStake: number;
  onClose: () => void;
}

/**
 * Where every v2 upgrade request lands (spec §7). Gated tiles, the gated move
 * list and row, the closing CTAs, the rail and any 403 upgrade_required all
 * dispatch through upgradeEvents, and DashboardClient renders this under the
 * flag. A never-trialed Free account gets moment A; everyone else, including
 * while insights load, gets checkout, so a trial is never offered unconfirmed.
 */
export default function UpgradeHost({ feature, interestAtStake, onClose }: UpgradeHostProps) {
  const { data: insights } = useDashboardInsights();
  if (insights?.tier.trial.eligible === true) return <TrialStartSheet onClose={onClose} />;
  return <UpgradeFallbackSheet feature={feature} interestAtStake={interestAtStake} onClose={onClose} />;
}
```

- [ ] **Step 4: Run them to verify they pass**

Run: `npx vitest run src/__tests__/components/dashboard-v2/TrialStartSheet.test.ts src/__tests__/components/dashboard-v2/UpgradeFallbackSheet.test.ts src/__tests__/components/dashboard-v2/UpgradeHost.test.ts`
Expected: PASS. Then run `npm test`, `npx tsc --noEmit 2>&1 | grep -v "src/__tests__/lib/stripe.test.ts"` and `npm run lint` (report the count; no `tsc` output; lint clean).

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard-v2/upgrade src/__tests__/components/dashboard-v2/TrialStartSheet.test.ts src/__tests__/components/dashboard-v2/UpgradeFallbackSheet.test.ts src/__tests__/components/dashboard-v2/UpgradeHost.test.ts
```

```bash
git commit -m "feat(dashboard-v2): upgrade moment A, the fallback upgrade sheet and UpgradeHost" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---
### Task 7: Route v2 upgrades to `UpgradeHost`; retire the banner and the post-trial modal; "Try Pro free"

**Files:**
- Modify: `src/components/DashboardClient.tsx`, `src/lib/dashboard/upgradeRail.ts` (`upgradeRailCopy`), `src/components/dashboard-v2/shell/V2Shell.tsx`, `src/components/dashboard-v2/shell/V2Sidebar.tsx`, `src/components/dashboard-v2/shell/UpgradeRail.tsx`
- Test: `src/__tests__/components/dashboard-v2/DashboardClient.upgradeV2.test.ts` (new), `src/__tests__/components/dashboard-v2/DashboardClient.flag.test.ts` (one assertion), `src/__tests__/lib/dashboard/upgradeRail.test.ts` (extend), `src/__tests__/components/dashboard-v2/V2Shell.test.ts` (extend)

**Interfaces:**
- Consumes:
  - From Task 6: `UpgradeHost` (`{ feature?; interestAtStake; onClose }`).
  - From Task 3: `insights.tier.trial.eligible`.
- Produces:
  - `upgradeRailCopy(rail: UpgradeRailSummary, trialEligible?: boolean): { title; value; cta }`. `cta` is `'Try Pro free'` when `trialEligible`.
  - `V2Sidebar` and `UpgradeRail` gain an optional `trialEligible?: boolean` prop.

- [ ] **Step 1: Write the failing tests**

`src/__tests__/components/dashboard-v2/DashboardClient.upgradeV2.test.ts`:

```ts
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { act, render } from '@testing-library/react';
import DashboardClient from '@/components/DashboardClient';
import { useSubscription } from '@/lib/hooks';
import { upgradeEvents } from '@/lib/upgradeEvents';

const { stub, captured } = vi.hoisted(() => ({
  stub: (name: string, named?: string) => async () => {
    const { createElement: h } = await import('react');
    const Stub = () => h('div', { 'data-stub': name });
    return named ? { [named]: Stub } : { default: Stub };
  },
  captured: { thisMonth: null as null | Record<string, unknown>, coach: null as null | Record<string, unknown> },
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
  useDebts: vi.fn(() => ({ data: { debts: [] }, isLoading: false, isFetching: false, isError: false })),
  useIncome: () => ({ data: { income: null }, isLoading: false, isFetching: false, isError: false }),
  useExpenses: () => ({ data: { expenses: [] }, isLoading: false }),
  useUserSettings: () => ({ data: undefined }),
  usePaymentRecords: () => ({ data: { records: [] } }),
  useMarkPaid: () => ({ mutate: vi.fn() }),
  useStartCheckout: () => ({ mutate: vi.fn() }),
  useSubscription: vi.fn(() => ({ data: undefined })),
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
// This Month and Coach record their props, so tests can drive the callbacks DashboardClient passes.
vi.mock('@/components/dashboard-v2/this-month/ThisMonthV2', async () => {
  const { createElement: h } = await import('react');
  return { default: (p: Record<string, unknown>) => { captured.thisMonth = p; return h('div', { 'data-stub': 'ThisMonthV2' }); } };
});
vi.mock('@/components/dashboard-v2/coach/CoachV2', async () => {
  const { createElement: h } = await import('react');
  return { default: (p: Record<string, unknown>) => { captured.coach = p; return h('div', { 'data-stub': 'CoachV2' }); } };
});
vi.mock('@/components/dashboard-v2/debts/DebtsV2', stub('DebtsV2'));
vi.mock('@/components/dashboard-v2/plan/PlanV2', stub('PlanV2'));
vi.mock('@/components/dashboard-v2/progress/ProgressV2', stub('ProgressV2'));
vi.mock('@/components/dashboard-v2/upgrade/UpgradeHost', stub('UpgradeHost'));
vi.mock('@/components/billing/UpgradeModal', stub('UpgradeModal'));
vi.mock('@/components/dashboard/TrialCountdownBanner', stub('TrialCountdownBanner'));
vi.mock('@/components/dashboard/LinkBankPrompt', stub('LinkBankPrompt'));
vi.mock('@/components/dashboard/MilestoneWidget', stub('MilestoneWidget', 'MilestoneWidget'));
vi.mock('@/components/dashboard/NotificationPanel', stub('NotificationPanel'));
vi.mock('@/components/plaid/PlaidLink', stub('PlaidLink', 'PlaidLink'));

const USER = { name: 'Test User', email: 'test@example.com', picture: null };
const DAY = 24 * 60 * 60 * 1000;
const stubbed = (name: string) => document.querySelector(`[data-stub="${name}"]`);

beforeEach(() => {
  // DashboardClient's mount effects: the day-0 lifecycle ping and the tab scroll reset.
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(null, { status: 204 }))));
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  localStorage.clear();
  captured.thisMonth = null;
  captured.coach = null;
  vi.mocked(useSubscription).mockReturnValue({ data: undefined } as unknown as ReturnType<typeof useSubscription>);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('DashboardClient upgrade surfaces under the flag (spec §7; plan decisions 8 and 10)', () => {
  it('answers an upgrade request with UpgradeHost', () => {
    render(createElement(DashboardClient, { user: USER, dashboardV2: true }));
    act(() => upgradeEvents.dispatch('Coach moves'));
    expect(stubbed('UpgradeHost')).not.toBeNull();
    expect(stubbed('UpgradeModal')).toBeNull();
  });

  it('keeps UpgradeModal with the flag off', () => {
    render(createElement(DashboardClient, { user: USER }));
    act(() => upgradeEvents.dispatch('Coach moves'));
    expect(stubbed('UpgradeModal')).not.toBeNull();
    expect(stubbed('UpgradeHost')).toBeNull();
  });

  it('retires the trial banner and the one-time post-trial modal', () => {
    const justEnded = {
      paidTier: 'free', subscriptionStatus: 'inactive', subscriptionEndsAt: null, isCanceling: false, hasCustomer: false,
      signupTrialActive: false, signupTrialEndsAt: new Date(Date.now() - 2 * DAY).toISOString(),
    };
    vi.mocked(useSubscription).mockReturnValue({ data: justEnded } as unknown as ReturnType<typeof useSubscription>);

    // The same account on v1 gets both, which proves the fixture triggers them.
    const v1 = render(createElement(DashboardClient, { user: USER }));
    expect(stubbed('TrialCountdownBanner')).not.toBeNull();
    expect(stubbed('UpgradeModal')).not.toBeNull();
    v1.unmount();
    localStorage.clear();

    render(createElement(DashboardClient, { user: USER, dashboardV2: true }));
    expect(stubbed('TrialCountdownBanner')).toBeNull();
    expect(stubbed('UpgradeModal')).toBeNull();
    expect(stubbed('UpgradeHost')).toBeNull();
  });
});
```

In `src/__tests__/components/dashboard-v2/DashboardClient.flag.test.ts`, in the test "renders the v2 shell, with This Month v2, when the flag is on", replace:

```ts
    expect(html).toContain('data-stub="TrialCountdownBanner"');
```

with:

```ts
    // Retired under the flag in PR 6: moment D carries the post-trial decision.
    expect(html).not.toContain('data-stub="TrialCountdownBanner"');
```

Do not touch anything else in that file, and never run it with `-u`.

In `src/__tests__/lib/dashboard/upgradeRail.test.ts`, append at the end of the file:

```ts
describe('upgradeRailCopy for an account that can start the trial (README §6; plan decision 8)', () => {
  it('invites a trial instead of an unlock, keeping the count and the value', () => {
    expect(upgradeRailCopy({ count: 3, perYear: 742 }, true)).toEqual({
      title: '3 moves waiting',
      value: '$742/yr est.',
      cta: 'Try Pro free',
    });
    expect(upgradeRailCopy({ count: 3, perYear: 742 }).cta).toBe('Unlock all 3');
  });
});
```

In `src/__tests__/components/dashboard-v2/V2Shell.test.ts`, directly after the test "shows the upgrade rail for a Free user with gated moves and opens the upgrade modal", add:

```ts
  it('invites an account that can start the trial to try Pro free, through the same upgrade path', () => {
    const seen: string[] = [];
    const unsubscribe = upgradeEvents.subscribe((feature) => seen.push(feature));
    renderShell('this-month', insights({
      coachMoves: MOVES,
      tier: { proEligible: false, paidPro: false, trial: { active: false, endsAt: null, eligible: true } },
    }));
    fireEvent.click(screen.getByRole('button', { name: 'Try Pro free' }));
    expect(seen).toEqual(['Coach moves']);
    unsubscribe();
  });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/__tests__/components/dashboard-v2/DashboardClient.upgradeV2.test.ts src/__tests__/components/dashboard-v2/DashboardClient.flag.test.ts src/__tests__/lib/dashboard/upgradeRail.test.ts src/__tests__/components/dashboard-v2/V2Shell.test.ts`

Expected: FAIL in all four files. The flag test's two snapshot tests must still PASS, and so must the other v1 assertions. The failures are:
- the host tests (UpgradeModal still opens)
- the banner assertion
- `cta: 'Try Pro free'`
- the missing "Try Pro free" button

- [ ] **Step 3: Implement**

`src/lib/dashboard/upgradeRail.ts`: replace the whole `upgradeRailCopy` function with:

```ts
/** The rail's copy. An account that can start the trial is invited to try Pro (README §6 "Sidebar foot"). */
export function upgradeRailCopy(
  rail: UpgradeRailSummary,
  trialEligible = false,
): { title: string; value: string | null; cta: string } {
  return {
    title: rail.count === 1 ? '1 move waiting' : `${rail.count} moves waiting`,
    value: rail.perYear === null ? null : `${formatCurrencyWhole(rail.perYear)}/yr est.`,
    cta: trialEligible ? 'Try Pro free' : rail.count === 1 ? 'Unlock the move' : `Unlock all ${rail.count}`,
  };
}
```

`src/components/dashboard-v2/shell/UpgradeRail.tsx`, replace:

```tsx
interface UpgradeRailProps {
  rail: UpgradeRailSummary;
  onUpgrade: () => void;
}
```

with:

```tsx
interface UpgradeRailProps {
  rail: UpgradeRailSummary;
  /** "Try Pro free" for an account that can start the trial. */
  trialEligible?: boolean;
  onUpgrade: () => void;
}
```

and replace:

```tsx
export default function UpgradeRail({ rail, onUpgrade }: UpgradeRailProps) {
  const copy = upgradeRailCopy(rail);
```

with:

```tsx
export default function UpgradeRail({ rail, trialEligible = false, onUpgrade }: UpgradeRailProps) {
  const copy = upgradeRailCopy(rail, trialEligible);
```

`src/components/dashboard-v2/shell/V2Sidebar.tsx`, replace:

```tsx
  rail: UpgradeRailSummary | null;
  onUpgrade: () => void;
}
```

with:

```tsx
  rail: UpgradeRailSummary | null;
  /** The rail invites a trial for an account that can start one. */
  trialEligible?: boolean;
  onUpgrade: () => void;
}
```

replace:

```tsx
export default function V2Sidebar({ activeTab, onSelectTab, coachDot, rail, onUpgrade }: V2SidebarProps) {
```

with:

```tsx
export default function V2Sidebar({ activeTab, onSelectTab, coachDot, rail, trialEligible = false, onUpgrade }: V2SidebarProps) {
```

and replace:

```tsx
      {rail && <UpgradeRail rail={rail} onUpgrade={onUpgrade} />}
```

with:

```tsx
      {rail && <UpgradeRail rail={rail} trialEligible={trialEligible} onUpgrade={onUpgrade} />}
```

`src/components/dashboard-v2/shell/V2Shell.tsx`, replace:

```tsx
  /** Above the tab content, inside the scroll area (the trial banner until PR 6). */
```

with:

```tsx
  /** Above the tab content, inside the scroll area. (DashboardClient stopped passing the trial banner in PR 6.) */
```

replace:

```tsx
  const rail = computeUpgradeRail(insights);
```

with:

```tsx
  const rail = computeUpgradeRail(insights);
  const trialEligible = insights?.tier.trial.eligible === true;
```

and replace:

```tsx
        rail={rail}
        onUpgrade={() => upgradeEvents.dispatch(UPGRADE_FEATURE.coachMoves)}
```

with:

```tsx
        rail={rail}
        trialEligible={trialEligible}
        onUpgrade={() => upgradeEvents.dispatch(UPGRADE_FEATURE.coachMoves)}
```

`src/components/DashboardClient.tsx`:

1. After `import CoachV2 from "@/components/dashboard-v2/coach/CoachV2";`, add:

```tsx
import UpgradeHost from "@/components/dashboard-v2/upgrade/UpgradeHost";
```

2. In the one-time post-trial modal effect, replace:

```tsx
  useEffect(() => {
    if (!subData) return;
    if (subData.paidTier === "pro" || subData.subscriptionStatus === "trialing") return;
```

with:

```tsx
  useEffect(() => {
    // Dashboard v2 retires this prompt: moment D on This Month carries the decision (spec §7).
    if (dashboardV2) return;
    if (!subData) return;
    if (subData.paidTier === "pro" || subData.subscriptionStatus === "trialing") return;
```

and replace that effect's closing line:

```tsx
    setUpgradeModal({ open: true, feature: "Trial ended" });
  }, [subData]);
```

with:

```tsx
    setUpgradeModal({ open: true, feature: "Trial ended" });
  }, [subData, dashboardV2]);
```

3. Replace:

```tsx
  const upgradeModalNode = upgradeModal.open && (
    <UpgradeModal
      feature={upgradeModal.feature}
      interestAtStake={interestAtStake}
      onClose={() => setUpgradeModal({ open: false })}
    />
  );
```

with:

```tsx
  const closeUpgrade = () => setUpgradeModal({ open: false });
  // v2 routes every upgrade request to moment A or the upgrade sheet (spec §7); v1 keeps its modal.
  const upgradeModalNode = upgradeModal.open && (dashboardV2 ? (
    <UpgradeHost feature={upgradeModal.feature} interestAtStake={interestAtStake} onClose={closeUpgrade} />
  ) : (
    <UpgradeModal feature={upgradeModal.feature} interestAtStake={interestAtStake} onClose={closeUpgrade} />
  ));
```

4. In the `if (dashboardV2)` return, delete the line:

```tsx
          banner={<TrialCountdownBanner sub={subData} hasLinkedBankDebt={hasLinkedBankDebt} />}
```

- [ ] **Step 4: Run them to verify they pass**

Run the Step 2 command again. Expected: PASS, including both v1 snapshot tests. Then:

```bash
npm test
```

```bash
npx tsc --noEmit 2>&1 | grep -v "src/__tests__/lib/stripe.test.ts"
```

```bash
npm run lint
```

Expected: every test passes (report the count), no `tsc` output, lint clean.

```bash
git diff --stat main -- src/__tests__/components/dashboard-v2/__snapshots__/
```

This must print nothing.

- [ ] **Step 5: Commit**

```bash
git add src/components/DashboardClient.tsx src/lib/dashboard/upgradeRail.ts src/components/dashboard-v2/shell/V2Shell.tsx src/components/dashboard-v2/shell/V2Sidebar.tsx src/components/dashboard-v2/shell/UpgradeRail.tsx src/__tests__/components/dashboard-v2/DashboardClient.upgradeV2.test.ts src/__tests__/components/dashboard-v2/DashboardClient.flag.test.ts src/__tests__/lib/dashboard/upgradeRail.test.ts src/__tests__/components/dashboard-v2/V2Shell.test.ts
```

```bash
git commit -m "feat(dashboard-v2): route upgrades to the trial or upgrade sheet; retire the trial banner and modal under the flag" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Moments B, C and D on This Month

**Files:**
- Create: `src/components/dashboard-v2/upgrade/TrialMomentCard.tsx`
- Modify: `src/components/dashboard-v2/this-month/ThisMonthV2.tsx`, `src/components/payoff/CoachBriefCard.tsx`, `src/components/dashboard-v2/coach/CoachV2.tsx`, `src/components/DashboardClient.tsx`
- Test: `src/__tests__/components/dashboard-v2/TrialMomentCard.test.ts` (new), `src/__tests__/components/CoachBriefCard.isPro.test.ts` (new), and extensions to `ThisMonthV2.test.ts`, `CoachV2.test.ts` and `DashboardClient.upgradeV2.test.ts` (all under `src/__tests__/components/dashboard-v2/`)

**Interfaces:**
- Consumes:
  - From Task 5: `momentBView`, `momentCView`, `momentDView`, `momentDismissKey`, `ChecklistRowId`.
  - From Task 3: `insights.trialMoment`, `insights.tier.trial.endsAt`.
  - Existing: `useStartCheckout`, `useCachedCoachBrief`, `getErrorMessage` (`src/lib/hooks.ts`); `AprOpenRequest` (`src/components/AprNegotiationCard.tsx`).
- Produces:
  - `TrialMomentCard` (default), props:

    ```ts
    {
      moment: TrialMoment;
      trialEndsAt: string | null;
      readiness: PlanReadiness;
      rateWatch: RateWatch | null;
      interest: MonthlyInterest | null;
      onChecklist: (row: ChecklistRowId) => void;
    }
    ```

  - `ThisMonthV2` props gain the required `onOpenAprScript: (debtId: string) => void`.
  - `CoachBriefCard` props gain the optional `isPro?: boolean`.
  - `CoachV2` props gain the optional `pendingAprDebtId?: string | null` and `onConsumePendingApr?: () => void`.

- [ ] **Step 1: Write the failing tests**

`src/__tests__/components/dashboard-v2/TrialMomentCard.test.ts`:

```ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { MonthlyInterest, PlanReadiness, RateWatch, TrialMoment } from '@/lib/dashboard/types';
import { useCachedCoachBrief, useStartCheckout } from '@/lib/hooks';
import { track, Events } from '@/lib/analytics';
import { PLANS } from '@/lib/stripe';
import { formatCurrencyWhole } from '@/lib/utils';
import TrialMomentCard from '@/components/dashboard-v2/upgrade/TrialMomentCard';

vi.mock('@/lib/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/hooks')>()),
  useStartCheckout: vi.fn(),
  useCachedCoachBrief: vi.fn(),
}));
vi.mock('@/lib/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/analytics')>()),
  track: vi.fn(),
}));

const ENDS = '2026-10-01T12:00:00.000Z';
const CARD = { debtId: 'c1', debtName: 'Citi', apr: 28, targetApr: 19.6, annualEstimate: 742.9 };
const RATE_WATCH: RateWatch = { cards: 1, annualEstimate: 742.9, top: CARD, moveTarget: CARD };
const INTEREST: MonthlyInterest = { monthlyEstimate: 840.36, avgMonthlySavedByPlan: null };
const NO_BRIEF = { data: { brief: null, dataHash: null, generatedAt: null }, isLoading: false };

function readiness(done: number): PlanReadiness {
  const ids = ['debts', 'income', 'expenses', 'dueDates', 'firstPayment'] as const;
  const steps = ids.map((id, i) => ({ id, complete: i < done, pendingCount: i < done ? 0 : 1 }));
  return { steps, completeCount: done, percent: done * 20 };
}

function renderCard(moment: TrialMoment, overrides: Record<string, unknown> = {}, brief: unknown = NO_BRIEF) {
  const mutate = vi.fn();
  vi.mocked(useStartCheckout).mockReturnValue(
    { mutate, isPending: false, isError: false, error: null } as unknown as ReturnType<typeof useStartCheckout>,
  );
  vi.mocked(useCachedCoachBrief).mockReturnValue(brief as ReturnType<typeof useCachedCoachBrief>);
  const onChecklist = vi.fn();
  const props = { moment, trialEndsAt: ENDS, readiness: readiness(3), rateWatch: RATE_WATCH, interest: INTEREST, onChecklist, ...overrides };
  const view = render(createElement(TrialMomentCard, props));
  return { mutate, onChecklist, view, props };
}

afterEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('TrialMomentCard — moment B (plan decision 5)', () => {
  const B: TrialMoment = { state: 'B', day: 2, daysLeft: 12 };

  it('shows the day, the days left and three things to do, and records the view', () => {
    renderCard(B);
    expect(screen.getByText('Pro is on · day 2')).toBeTruthy();
    expect(screen.getByText('12 days left')).toBeTruthy();
    expect(screen.getByRole('heading', { name: "Three things worth doing while it's on." })).toBeTruthy();
    expect(track).toHaveBeenCalledWith(Events.UPGRADE_MOMENT_VIEWED, { state: 'B' });
  });

  it('sends each open row to its flow and records the press', () => {
    const { onChecklist } = renderCard(B);
    fireEvent.click(screen.getByRole('button', { name: 'Call one card about its APR' }));
    expect(onChecklist).toHaveBeenCalledWith('apr_script');
    expect(track).toHaveBeenCalledWith(Events.UPGRADE_MOMENT_CTA, { state: 'B', action: 'apr_script' });
    fireEvent.click(screen.getByRole('button', { name: 'Run one what-if' }));
    expect(onChecklist).toHaveBeenCalledWith('what_if');
    fireEvent.click(screen.getByRole('button', { name: 'Finish your plan setup' }));
    expect(onChecklist).toHaveBeenCalledWith('setup');
  });

  it('ticks a finished setup instead of offering it', () => {
    renderCard(B, { readiness: readiness(5) });
    expect(screen.queryByRole('button', { name: 'Finish your plan setup' })).toBeNull();
    expect(screen.getByText('Finish your plan setup')).toBeTruthy();
  });

  it('dismisses for this trial and stays dismissed', () => {
    const { view, props } = renderCard(B);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(track).toHaveBeenCalledWith(Events.UPGRADE_MOMENT_CTA, { state: 'B', action: 'dismiss' });
    expect(screen.queryByText('Pro is on · day 2')).toBeNull();
    expect(localStorage.getItem(`sp_trial_moment_B:${ENDS}`)).toBe('1');

    view.unmount();
    vi.mocked(track).mockClear();
    render(createElement(TrialMomentCard, props));
    expect(screen.queryByText('Pro is on · day 2')).toBeNull();
    expect(track).not.toHaveBeenCalled();
  });
});

describe('TrialMomentCard — moment C (plan decision 6)', () => {
  const C: TrialMoment = { state: 'C', daysLeft: 2, elapsedDays: 12, monthsSooner: 7, interestLess: 6_361.9, paymentsLogged: 9 };

  it('shows what moved and the price against the est. interest, with no dismiss', () => {
    renderCard(C);
    expect(screen.getByText('2 days left of Pro')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'What the last 12 days actually moved.' })).toBeTruthy();
    expect(screen.getByText('7 months sooner')).toBeTruthy();
    expect(screen.getByText('$6,361 less')).toBeTruthy();
    expect(screen.getByText(formatCurrencyWhole(PLANS.pro.price))).toBeTruthy();
    expect(screen.getByText('/month · against $840/mo est. interest')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Dismiss' })).toBeNull();
    expect(track).toHaveBeenCalledWith(Events.UPGRADE_MOMENT_VIEWED, { state: 'C' });
  });

  it('keeps Pro through the existing checkout', () => {
    const { mutate } = renderCard(C);
    fireEvent.click(screen.getByRole('button', { name: 'Keep Pro' }));
    expect(track).toHaveBeenCalledWith(Events.UPGRADE_MOMENT_CTA, { state: 'C', action: 'checkout' });
    expect(track).toHaveBeenCalledWith(Events.CHECKOUT_STARTED, { source: 'upgrade_moment_c', billing: 'monthly' });
    expect(mutate).toHaveBeenCalledTimes(1);
  });
});

describe('TrialMomentCard — moment D (plan decision 7)', () => {
  const D: TrialMoment = { state: 'D', endedAt: '2026-09-15T12:00:00.000Z' };
  const BRIEF = {
    data: {
      brief: { verdict: { status: 'at_risk', headline: 'Payments stalling.', summary: 'Two debts missed September.' }, nextAction: { title: 't', body: 'b' } },
      dataHash: 'h',
      generatedAt: new Date(2026, 8, 10, 12).toISOString(),
    },
    isLoading: false,
  };

  it('keeps the last brief and turns Pro back on through checkout', () => {
    const { mutate } = renderCard(D, {}, BRIEF);
    expect(screen.getByText('Back on Free · your plan is intact')).toBeTruthy();
    expect(screen.getByRole('heading', { name: "Your last coach brief stays. New ones don't." })).toBeTruthy();
    expect(screen.getByText('Kept — Sep 10')).toBeTruthy();
    expect(screen.getByText('Payments stalling.')).toBeTruthy();
    expect(screen.getByText('Two debts missed September.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: `Turn Pro back on — ${formatCurrencyWhole(PLANS.pro.price)}/mo` }));
    expect(track).toHaveBeenCalledWith(Events.UPGRADE_MOMENT_CTA, { state: 'D', action: 'checkout' });
    expect(track).toHaveBeenCalledWith(Events.CHECKOUT_STARTED, { source: 'upgrade_moment_d', billing: 'monthly' });
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it('without a brief, says only that nothing was removed', () => {
    renderCard(D);
    expect(screen.getByRole('heading', { name: 'Nothing was removed from your plan.' })).toBeTruthy();
    expect(screen.queryByText(/^Kept/)).toBeNull();
  });

  it('shows nothing, and records no view, until the brief query settles', () => {
    renderCard(D, {}, { data: undefined, isLoading: true });
    expect(screen.queryByText('Back on Free · your plan is intact')).toBeNull();
    expect(track).not.toHaveBeenCalled();
  });

  it('"Stay on Free for now" dismisses it for this trial end', () => {
    renderCard(D, {}, BRIEF);
    fireEvent.click(screen.getByRole('button', { name: 'Stay on Free for now' }));
    expect(track).toHaveBeenCalledWith(Events.UPGRADE_MOMENT_CTA, { state: 'D', action: 'dismiss' });
    expect(screen.queryByText('Back on Free · your plan is intact')).toBeNull();
    expect(localStorage.getItem('sp_trial_moment_D:2026-09-15T12:00:00.000Z')).toBe('1');
  });
});
```

`src/__tests__/components/CoachBriefCard.isPro.test.ts`:

```ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { useCachedCoachBrief, useGenerateCoachBrief, useSubscription } from '@/lib/hooks';
import { upgradeEvents } from '@/lib/upgradeEvents';
import CoachBriefCard from '@/components/payoff/CoachBriefCard';

vi.mock('@/lib/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/hooks')>()),
  useCachedCoachBrief: vi.fn(),
  useGenerateCoachBrief: vi.fn(),
  useSubscription: vi.fn(),
}));

/** An empty brief cache and a subscription cache that still says Free: the stale state right after a trial starts. */
function renderCard(props: { isPro?: boolean }) {
  const mutate = vi.fn();
  vi.mocked(useCachedCoachBrief).mockReturnValue(
    { data: { brief: null, dataHash: null, generatedAt: null }, isLoading: false } as unknown as ReturnType<typeof useCachedCoachBrief>,
  );
  vi.mocked(useGenerateCoachBrief).mockReturnValue(
    { mutate, isPending: false, isError: false, data: undefined, error: null } as unknown as ReturnType<typeof useGenerateCoachBrief>,
  );
  vi.mocked(useSubscription).mockReturnValue(
    { data: { proEligible: false }, isLoading: false } as unknown as ReturnType<typeof useSubscription>,
  );
  render(createElement(CoachBriefCard, { hasDebts: true, hasIncome: true, ...props }));
  return { mutate };
}

afterEach(() => vi.clearAllMocks());

describe("CoachBriefCard's isPro (plan decision 10)", () => {
  it("trusts the page's resolved tier over a stale subscription cache: no locked door", () => {
    const { mutate } = renderCard({ isPro: true });
    expect(mutate).toHaveBeenCalledWith({});
    expect(screen.queryByRole('button', { name: /Upgrade to unlock coach brief/ })).toBeNull();
  });

  it('without the prop (v1), still reads the subscription', () => {
    const seen: string[] = [];
    const unsubscribe = upgradeEvents.subscribe((feature) => seen.push(feature));
    const { mutate } = renderCard({});
    expect(mutate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Upgrade to unlock coach brief/ }));
    expect(seen).toEqual(['AI Coach Brief']);
    unsubscribe();
  });
});
```

In `src/__tests__/components/dashboard-v2/ThisMonthV2.test.ts`, in `renderTab`, replace:

```ts
  const onNavigate = vi.fn();
  const onSetPendingCoachExtra = vi.fn();
```

with:

```ts
  const onNavigate = vi.fn();
  const onSetPendingCoachExtra = vi.fn();
  const onOpenAprScript = vi.fn();
```

replace:

```ts
  const props = { debts, income, onNavigate, onSetPendingCoachExtra };
```

with:

```ts
  const props = { debts, income, onNavigate, onSetPendingCoachExtra, onOpenAprScript };
```

and replace:

```ts
  return { onNavigate, onSetPendingCoachExtra, markPaid, rerenderWith };
```

with:

```ts
  return { onNavigate, onSetPendingCoachExtra, onOpenAprScript, markPaid, rerenderWith };
```

Then append inside `describe('ThisMonthV2', …)`, before its closing `});`:

```ts
  it('puts the trial moment above readiness and sends its checklist to each flow (plan decisions 5 and 11)', () => {
    const { onNavigate, onOpenAprScript } = renderTab(insights({
      tier: { proEligible: true, paidPro: false, trial: { active: true, endsAt: '2026-09-26T12:00:00.000Z', eligible: false } },
      trialMoment: { state: 'B', day: 2, daysLeft: 12 },
    }));
    const moment = screen.getByText('Pro is on · day 2');
    const readinessTitle = screen.getByText('Your plan is 60% set up');
    expect(moment.compareDocumentPosition(readinessTitle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Run one what-if' }));
    expect(onNavigate).toHaveBeenCalledWith('plan');
    fireEvent.click(screen.getByRole('button', { name: 'Call one card about its APR' }));
    expect(onOpenAprScript).toHaveBeenCalledWith('c1');
    // Setup opens the first unfinished step's own flow: here, the due-dates sheet.
    fireEvent.click(screen.getByRole('button', { name: 'Finish your plan setup' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it("gives the AI brief this page's resolved tier, so a stale subscription can't show the locked door (plan decision 10)", () => {
    renderTab(insights({ tier: PRO }));
    expect(coachBrief.props).toMatchObject({ isPro: true });
  });
```

In `src/__tests__/components/dashboard-v2/CoachV2.test.ts`, replace:

```ts
function renderTab({
  data = insights(), placeholder = false, subscription,
}: { data?: DashboardInsights; placeholder?: boolean; subscription?: { proEligible: boolean } } = {}) {
```

with:

```ts
function renderTab({
  data = insights(), placeholder = false, subscription, props = {},
}: { data?: DashboardInsights; placeholder?: boolean; subscription?: { proEligible: boolean }; props?: Record<string, unknown> } = {}) {
```

and replace:

```ts
  render(createElement(CoachV2, { debts: DEBTS, income: INCOME, expenses: [], isLoading: false, onNavigate }));
```

with:

```ts
  render(createElement(CoachV2, { debts: DEBTS, income: INCOME, expenses: [], isLoading: false, onNavigate, ...props }));
```

Then append at the end of the file:

```ts
describe("CoachV2 opening the APR script moment B asked for (plan decision 11)", () => {
  it("opens that card's script once the tier is Pro, and consumes the request", () => {
    const onConsumePendingApr = vi.fn();
    renderTab({ data: insights({ tier: PRO }), props: { pendingAprDebtId: 'citi', onConsumePendingApr } });
    expect(intel.last?.aprOpenRequest).toMatchObject({ debtId: 'citi' });
    expect(onConsumePendingApr).toHaveBeenCalledTimes(1);
  });

  it('holds the request while the account reads Free', () => {
    const onConsumePendingApr = vi.fn();
    renderTab({ props: { pendingAprDebtId: 'citi', onConsumePendingApr } });
    expect(onConsumePendingApr).not.toHaveBeenCalled();
  });
});
```

In `src/__tests__/components/dashboard-v2/DashboardClient.upgradeV2.test.ts`, append inside the `describe`, before its closing `});`:

```ts
  it("carries moment B's APR script from This Month to Coach, then clears it (plan decision 11)", () => {
    render(createElement(DashboardClient, { user: USER, dashboardV2: true }));
    act(() => (captured.thisMonth!.onOpenAprScript as (debtId: string) => void)('citi'));
    expect(stubbed('CoachV2')).not.toBeNull();
    expect(captured.coach).toMatchObject({ pendingAprDebtId: 'citi' });
    act(() => (captured.coach!.onConsumePendingApr as () => void)());
    expect(captured.coach).toMatchObject({ pendingAprDebtId: null });
  });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/__tests__/components/dashboard-v2/TrialMomentCard.test.ts src/__tests__/components/CoachBriefCard.isPro.test.ts src/__tests__/components/dashboard-v2/ThisMonthV2.test.ts src/__tests__/components/dashboard-v2/CoachV2.test.ts src/__tests__/components/dashboard-v2/DashboardClient.upgradeV2.test.ts`

Expected: FAIL:
- `TrialMomentCard` doesn't resolve.
- The `isPro` card still shows the locked door.
- The new ThisMonthV2, CoachV2 and DashboardClient cases fail.
- The existing cases still pass.

- [ ] **Step 3: Implement the card**

`src/components/dashboard-v2/upgrade/TrialMomentCard.tsx`:

```tsx
"use client";

import { useEffect, useId, useState } from "react";
import { Check, X } from "lucide-react";
import type { MonthlyInterest, PlanReadiness, RateWatch, TrialMoment } from "@/lib/dashboard/types";
import { getErrorMessage, useCachedCoachBrief, useStartCheckout } from "@/lib/hooks";
import { track, Events } from "@/lib/analytics";
import { PLANS } from "@/lib/stripe";
import {
  momentBView, momentCView, momentDView, momentDismissKey, type ChecklistRowId,
} from "@/lib/dashboard/upgradeMoments";
import { CTA_BLUE, ERROR_LINE, EYEBROW } from "../styles";

/** README §7's shared card, at DESIGN.md's 12px card radius. */
const MOMENT_CARD = "rounded-xl border border-border bg-surface p-[18px] shadow-float";
const TITLE = "text-[19px] font-extrabold leading-tight tracking-[-0.02em] text-txt [text-wrap:pretty]";
const GHOST_CTA =
  "mt-1 flex min-h-11 w-full items-center justify-center rounded-lg text-[13px] font-bold text-txt-muted outline-none hover:bg-bg focus-visible:outline-2 focus-visible:outline-action";

type MomentB = Extract<TrialMoment, { state: "B" }>;
type MomentC = Extract<TrialMoment, { state: "C" }>;
type MomentD = Extract<TrialMoment, { state: "D" }>;

interface TrialMomentCardProps {
  moment: TrialMoment;
  /** tier.trial.endsAt: keys moment B's dismissal to this trial. */
  trialEndsAt: string | null;
  readiness: PlanReadiness;
  rateWatch: RateWatch | null;
  interest: MonthlyInterest | null;
  onChecklist: (row: ChecklistRowId) => void;
}

/** The one inline upgrade moment at the top of This Month (spec §7 B, C, D). */
export default function TrialMomentCard(props: TrialMomentCardProps) {
  const { moment } = props;
  if (moment.state === "B") {
    return <MomentBCard moment={moment} trialEndsAt={props.trialEndsAt} readiness={props.readiness} rateWatch={props.rateWatch} onChecklist={props.onChecklist} />;
  }
  if (moment.state === "C") return <MomentCCard moment={moment} interest={props.interest} />;
  return <MomentDCard moment={moment} />;
}

function useViewed(state: TrialMoment["state"], visible: boolean) {
  useEffect(() => {
    if (visible) track(Events.UPGRADE_MOMENT_VIEWED, { state });
  }, [state, visible]);
}

function readDismissed(key: string | null): boolean {
  if (!key) return false;
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

/** Hidden for this trial once dismissed; without storage, for this visit only. */
function useDismissal(key: string | null): [boolean, () => void] {
  const [dismissed, setDismissed] = useState(() => readDismissed(key));
  const dismiss = () => {
    setDismissed(true);
    if (!key) return;
    try {
      localStorage.setItem(key, "1");
    } catch {
      // Storage unavailable (private mode): the state above hides it for this visit.
    }
  };
  return [dismissed, dismiss];
}

function useCheckout(state: "C" | "D") {
  const checkout = useStartCheckout();
  const start = () => {
    track(Events.UPGRADE_MOMENT_CTA, { state, action: "checkout" });
    track(Events.CHECKOUT_STARTED, { source: state === "C" ? "upgrade_moment_c" : "upgrade_moment_d", billing: "monthly" });
    checkout.mutate();
  };
  const error = checkout.isError ? getErrorMessage(checkout.error, "Could not start checkout. Please try again.") : null;
  return { start, pending: checkout.isPending, error };
}

function MomentBCard({ moment, trialEndsAt, readiness, rateWatch, onChecklist }: {
  moment: MomentB;
  trialEndsAt: string | null;
  readiness: PlanReadiness;
  rateWatch: RateWatch | null;
  onChecklist: (row: ChecklistRowId) => void;
}) {
  const titleId = useId();
  const [dismissed, dismiss] = useDismissal(trialEndsAt ? momentDismissKey("B", trialEndsAt) : null);
  useViewed("B", !dismissed);
  if (dismissed) return null;
  const view = momentBView(moment, readiness, rateWatch);

  return (
    <section aria-labelledby={titleId} className={MOMENT_CARD}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12px] font-extrabold text-success-text">{view.eyebrow}</p>
        <div className="-mr-2 -mt-2 flex items-center">
          <span className="mono text-[12px] font-bold tabular-nums text-txt-muted">{view.daysLeft}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => {
              track(Events.UPGRADE_MOMENT_CTA, { state: "B", action: "dismiss" });
              dismiss();
            }}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-txt-muted outline-none hover:bg-bg focus-visible:outline-2 focus-visible:outline-action"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
      <h2 id={titleId} className={`mt-1 ${TITLE}`}>{view.title}</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {view.rows.map((row) => (
          <li key={row.id}>
            {row.done ? (
              <p className="flex min-h-11 items-center gap-2 rounded-lg border border-success/25 bg-success/5 px-3 text-[13px] font-semibold text-txt">
                <Check size={16} strokeWidth={2.5} aria-hidden="true" className="shrink-0 text-success-text" />
                <span>{row.label}</span>
                <span className="sr-only"> — done</span>
              </p>
            ) : (
              <button
                type="button"
                onClick={() => {
                  track(Events.UPGRADE_MOMENT_CTA, { state: "B", action: row.id });
                  onChecklist(row.id);
                }}
                className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 text-left text-[13px] font-semibold text-txt outline-none transition-colors hover:bg-bg focus-visible:outline-2 focus-visible:outline-action motion-reduce:transition-none"
              >
                <span>{row.label}</span>
                <span aria-hidden="true" className="shrink-0 text-[12px] font-extrabold text-action">{row.affordance}</span>
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function MomentCCard({ moment, interest }: { moment: MomentC; interest: MonthlyInterest | null }) {
  const titleId = useId();
  const checkout = useCheckout("C");
  useViewed("C", true);
  const view = momentCView(moment, interest, PLANS.pro.price);

  return (
    <section aria-labelledby={titleId} className={MOMENT_CARD}>
      {view.eyebrow && <p className="text-[12px] font-extrabold text-txt">{view.eyebrow}</p>}
      <h2 id={titleId} className={`mt-1 ${TITLE}`}>{view.title}</h2>
      {view.rows.length > 0 && (
        <dl className="mt-3 divide-y divide-border rounded-lg border border-border">
          {view.rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <dt className="text-[13px] text-txt-muted">{row.label}</dt>
              <dd className="mono text-[13px] font-extrabold tabular-nums text-txt">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="mt-3 flex flex-wrap items-baseline gap-1">
        <span className="mono text-[26px] font-extrabold tabular-nums text-txt">{view.price}</span>
        <span className="text-[13px] text-txt-muted">{view.priceNote}</span>
      </p>
      <button type="button" onClick={checkout.start} disabled={checkout.pending} className={`mt-3 ${CTA_BLUE}`}>
        {checkout.pending ? "Redirecting…" : view.cta}
      </button>
      {checkout.error && <p role="alert" className={`mt-2 ${ERROR_LINE}`}>{checkout.error}</p>}
    </section>
  );
}

function MomentDCard({ moment }: { moment: MomentD }) {
  const titleId = useId();
  const [dismissed, dismiss] = useDismissal(momentDismissKey("D", moment.endedAt));
  const { data: cache, isLoading } = useCachedCoachBrief();
  const checkout = useCheckout("D");
  // Wait for the brief query, so the title never flips from one variant to the other.
  const visible = !dismissed && !isLoading;
  useViewed("D", visible);
  if (!visible) return null;

  const verdict = cache?.brief?.verdict ?? null;
  const view = momentDView(
    verdict ? { headline: verdict.headline, summary: verdict.summary } : null,
    cache?.generatedAt ?? null,
    PLANS.pro.price,
  );

  return (
    <section aria-labelledby={titleId} className={MOMENT_CARD}>
      <p className="text-[12px] font-extrabold text-txt-muted">{view.eyebrow}</p>
      <h2 id={titleId} className={`mt-1 ${TITLE}`}>{view.title}</h2>
      {view.kept && (
        <div className="mt-3 rounded-lg bg-bg px-3 py-2.5">
          <p className={`${EYEBROW} text-txt-muted`}>{view.kept.label}</p>
          <p className="mt-1 text-[14px] font-extrabold text-txt [text-wrap:pretty]">{view.kept.headline}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-txt [text-wrap:pretty]">{view.kept.summary}</p>
          <p className="mt-1.5 text-[12px] text-txt-muted [text-wrap:pretty]">{view.kept.note}</p>
        </div>
      )}
      {view.body && <p className="mt-3 text-[13px] leading-relaxed text-txt [text-wrap:pretty]">{view.body}</p>}
      <button type="button" onClick={checkout.start} disabled={checkout.pending} className={`mt-3 ${CTA_BLUE}`}>
        {checkout.pending ? "Redirecting…" : view.primaryCta}
      </button>
      <button
        type="button"
        onClick={() => {
          track(Events.UPGRADE_MOMENT_CTA, { state: "D", action: "dismiss" });
          dismiss();
        }}
        disabled={checkout.pending}
        className={GHOST_CTA}
      >
        {view.secondaryCta}
      </button>
      {checkout.error && <p role="alert" className={`mt-2 ${ERROR_LINE}`}>{checkout.error}</p>}
    </section>
  );
}
```

- [ ] **Step 4: Wire it in**

`src/components/payoff/CoachBriefCard.tsx`, replace:

```tsx
interface CoachBriefCardProps {
  hasDebts: boolean;
  hasIncome: boolean;
  onApplyAction?: (targetExtra: number) => void;
}

export default function CoachBriefCard({
  hasDebts,
  hasIncome,
  onApplyAction,
}: CoachBriefCardProps) {
  const { data: cache, isLoading: cacheLoading } = useCachedCoachBrief();
  const { data: subscription, isLoading: subscriptionLoading } = useSubscription();
  const generate = useGenerateCoachBrief();
  const isPro = subscription?.proEligible === true;
```

with:

```tsx
interface CoachBriefCardProps {
  hasDebts: boolean;
  hasIncome: boolean;
  onApplyAction?: (targetExtra: number) => void;
  /**
   * The page's own resolved tier. Dashboard v2 passes it, so a stale
   * subscription cache can't show the locked door while insights already say
   * Pro (e.g. right after a trial starts). v1 omits it and reads the subscription.
   */
  isPro?: boolean;
}

export default function CoachBriefCard({
  hasDebts,
  hasIncome,
  onApplyAction,
  isPro: isProProp,
}: CoachBriefCardProps) {
  const { data: cache, isLoading: cacheLoading } = useCachedCoachBrief();
  const { data: subscription, isLoading: subscriptionQueryLoading } = useSubscription();
  const generate = useGenerateCoachBrief();
  const isPro = isProProp ?? subscription?.proEligible === true;
  const subscriptionLoading = isProProp === undefined && subscriptionQueryLoading;
```

`src/components/dashboard-v2/this-month/ThisMonthV2.tsx`:

1. After `import { UPGRADE_FEATURE } from "@/lib/dashboard/upgradeFeatures";`, add:

```tsx
import type { ChecklistRowId } from "@/lib/dashboard/upgradeMoments";
```

   After `import DueDatesSheet from "../sheets/DueDatesSheet";`, add:

```tsx
import TrialMomentCard from "../upgrade/TrialMomentCard";
```

2. Replace:

```tsx
  onSetPendingCoachExtra: (targetExtra: number) => void;
}
```

with:

```tsx
  onSetPendingCoachExtra: (targetExtra: number) => void;
  /** Moment B's "Script →": open this card's APR script on Coach (plan decision 11). */
  onOpenAprScript: (debtId: string) => void;
}
```

3. Replace:

```tsx
export default function ThisMonthV2({ debts, income, onNavigate, onSetPendingCoachExtra }: ThisMonthV2Props) {
```

with:

```tsx
export default function ThisMonthV2({ debts, income, onNavigate, onSetPendingCoachExtra, onOpenAprScript }: ThisMonthV2Props) {
```

4. Directly before `const onMoveAction = (action: FreeMoveAction) => {`, add:

```tsx
  // Moment B's checklist (plan decision 5): setup opens the first unfinished
  // step's own flow, exactly as its chip does.
  const onChecklist = (row: ChecklistRowId) => {
    if (row === "what_if") {
      onNavigate("plan");
    } else if (row === "apr_script") {
      if (insights.rateWatch) onOpenAprScript(insights.rateWatch.top.debtId);
    } else {
      const step = insights.readiness.steps.find((s) => !s.complete);
      if (step) onStep(step.id, "chip");
    }
  };

```

5. In the `CoachBriefCard` element, replace:

```tsx
    <CoachBriefCard
      hasDebts={debts.length > 0}
```

with:

```tsx
    <CoachBriefCard
      isPro
      hasDebts={debts.length > 0}
```

6. Replace:

```tsx
    <div className="flex flex-col gap-2.5 min-[769px]:gap-4">
      {readiness && <ReadinessCard view={readiness} onStep={onStep} />}
```

with:

```tsx
    <div className="flex flex-col gap-2.5 min-[769px]:gap-4">
      {insights.trialMoment && (
        <TrialMomentCard
          key={insights.trialMoment.state}
          moment={insights.trialMoment}
          trialEndsAt={insights.tier.trial.endsAt}
          readiness={insights.readiness}
          rateWatch={insights.rateWatch}
          interest={insights.interest}
          onChecklist={onChecklist}
        />
      )}
      {readiness && <ReadinessCard view={readiness} onStep={onStep} />}
```

`src/components/dashboard-v2/coach/CoachV2.tsx`:

1. Replace `import { useState } from "react";` with `import { useEffect, useState } from "react";`.
2. Replace:

```tsx
  onConsumePendingExtra?: () => void;
  onNavigate: (tab: Tab) => void;
}
```

with:

```tsx
  onConsumePendingExtra?: () => void;
  onNavigate: (tab: Tab) => void;
  /** Moment B's "Script →" on This Month: the card whose APR script to open, once (plan decision 11). */
  pendingAprDebtId?: string | null;
  onConsumePendingApr?: () => void;
}
```

3. Replace:

```tsx
  debts, income, expenses, isLoading, pendingExtra, onConsumePendingExtra, onNavigate,
}: CoachV2Props) {
```

with:

```tsx
  debts, income, expenses, isLoading, pendingExtra, onConsumePendingExtra, onNavigate,
  pendingAprDebtId, onConsumePendingApr,
}: CoachV2Props) {
```

4. Replace:

```tsx
  const [aprRequest, setAprRequest] = useState<AprOpenRequest | null>(null);

  if (!insights) {
```

with:

```tsx
  const [aprRequest, setAprRequest] = useState<AprOpenRequest | null>(null);

  // The script lives in the Pro content, so a request waits for a Pro tier.
  const tierIsPro = insights?.tier.proEligible === true;
  useEffect(() => {
    if (!tierIsPro || !pendingAprDebtId) return;
    setAprRequest({ debtId: pendingAprDebtId, nonce: Date.now() });
    onConsumePendingApr?.();
  }, [tierIsPro, pendingAprDebtId, onConsumePendingApr]);

  if (!insights) {
```

`src/components/DashboardClient.tsx`:

1. Replace:

```tsx
  const [pendingCoachExtra, setPendingCoachExtra] = useState<number | null>(null);
```

with:

```tsx
  const [pendingCoachExtra, setPendingCoachExtra] = useState<number | null>(null);
  // Moment B's "Script →" crosses from This Month to Coach (plan decision 11).
  const [pendingAprDebtId, setPendingAprDebtId] = useState<string | null>(null);
```

2. In the `<ThisMonthV2 … />` element, replace:

```tsx
            onSetPendingCoachExtra={setPendingCoachExtra}
          />
        ) : (
          <ThisMonthTab
```

with:

```tsx
            onSetPendingCoachExtra={setPendingCoachExtra}
            onOpenAprScript={(debtId) => {
              setPendingAprDebtId(debtId);
              setActiveTab("intelligence");
            }}
          />
        ) : (
          <ThisMonthTab
```

3. In the `<CoachV2 … />` element, replace:

```tsx
            onConsumePendingExtra={() => setPendingCoachExtra(null)}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        ) : (
          <IntelligenceTab
```

with:

```tsx
            onConsumePendingExtra={() => setPendingCoachExtra(null)}
            onNavigate={(tab) => setActiveTab(tab)}
            pendingAprDebtId={pendingAprDebtId}
            onConsumePendingApr={() => setPendingAprDebtId(null)}
          />
        ) : (
          <IntelligenceTab
```

- [ ] **Step 5: Run the tests to verify they pass**

Run the Step 2 command again. Expected: PASS. Then:

```bash
npm test
```

```bash
npx tsc --noEmit 2>&1 | grep -v "src/__tests__/lib/stripe.test.ts"
```

```bash
npm run lint
```

```bash
git diff --stat main -- src/__tests__/components/dashboard-v2/__snapshots__/
```

Expected: every test passes (report the count), no `tsc` output, lint clean, and the snapshot diff prints nothing.

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard-v2/upgrade/TrialMomentCard.tsx src/components/dashboard-v2/this-month/ThisMonthV2.tsx src/components/payoff/CoachBriefCard.tsx src/components/dashboard-v2/coach/CoachV2.tsx src/components/DashboardClient.tsx src/__tests__/components/dashboard-v2/TrialMomentCard.test.ts src/__tests__/components/CoachBriefCard.isPro.test.ts src/__tests__/components/dashboard-v2/ThisMonthV2.test.ts src/__tests__/components/dashboard-v2/CoachV2.test.ts src/__tests__/components/dashboard-v2/DashboardClient.upgradeV2.test.ts
```

```bash
git commit -m "feat(dashboard-v2): trial moments B, C and D on This Month" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Moment E's trial CTA

**Files:**
- Modify: `src/lib/dashboard/myDebts.ts` (`debtsClosingView`, `upgradeSheetEView`, a new label), `src/components/dashboard-v2/sheets/UpgradeSheet.tsx`, `src/components/dashboard-v2/debts/DebtsV2.tsx`
- Test: `src/__tests__/lib/dashboard/myDebts.test.ts`, `src/__tests__/components/dashboard-v2/UpgradeSheet.test.ts`, `src/__tests__/components/dashboard-v2/DebtsV2.test.ts` (all extend)

**Interfaces:**
- Consumes:
  - From Task 3: `insights.tier.trial.eligible`.
  - From Task 5: `useStartTrial`, `MOMENT_A.pending`.
  - From Task 6: `trialStartError`.
- Produces:
  - `countAllTrialLabel(total: number): string`.
  - `upgradeSheetEView` args gain `trialEligible: boolean`.
  - `UpgradeSheet` props gain `trialEligible: boolean`.

- [ ] **Step 1: Write the failing tests**

In `src/__tests__/lib/dashboard/myDebts.test.ts`:
- Replace the import line `countAllLabel, debtsClosingView, debtsSummaryView, focusCardView, orderByPlan,` with `countAllLabel, countAllTrialLabel, debtsClosingView, debtsSummaryView, focusCardView, orderByPlan,`.
- Replace `const args = { countedCount: 3, total: 5, uncounted: UNCOUNTED, date: 'April 2029', price: PRICE };` with `const args = { countedCount: 3, total: 5, uncounted: UNCOUNTED, date: 'April 2029', price: PRICE, trialEligible: false };`.

Then append at the end of the file:

```ts
describe("moment E for an account that can start the trial (plan decision 9)", () => {
  const ELIGIBLE: TierInfo = { proEligible: false, paidPro: false, trial: { active: false, endsAt: null, eligible: true } };

  it('names the trial on the closing card and in the sheet', () => {
    expect(countAllTrialLabel(5)).toBe('Count all 5 — start 14 days free');
    expect(debtsClosingView({ uncounted: UNCOUNTED, plan: PLAN, tier: ELIGIBLE, total: 5, price: PRICE })?.cta)
      .toBe('Count all 5 — start 14 days free');
    expect(upgradeSheetEView({ countedCount: 3, total: 5, uncounted: UNCOUNTED, date: 'April 2029', price: PRICE, trialEligible: true }).cta)
      .toBe('Count all 5 — start 14 days free');
  });
});
```

In `src/__tests__/components/dashboard-v2/UpgradeSheet.test.ts`:

1. Replace `import { useStartCheckout } from '@/lib/hooks';` with:

```ts
import { AxiosError, type AxiosResponse } from 'axios';
import { useStartCheckout, useStartTrial } from '@/lib/hooks';
import { MOMENT_A } from '@/lib/dashboard/upgradeMoments';
```

2. Replace:

```ts
  useStartCheckout: vi.fn(),
}));
```

with:

```ts
  useStartCheckout: vi.fn(),
  useStartTrial: vi.fn(),
}));
```

3. Replace the whole `renderSheet` function with:

```ts
function renderSheet(
  checkout: Record<string, unknown> = {},
  { trialEligible = false, trial = {} as Record<string, unknown> } = {},
) {
  const mutate = vi.fn();
  const startTrial = vi.fn();
  vi.mocked(useStartCheckout).mockReturnValue(
    { mutate, isPending: false, isError: false, error: null, ...checkout } as unknown as ReturnType<typeof useStartCheckout>,
  );
  vi.mocked(useStartTrial).mockReturnValue(
    { mutate: startTrial, isPending: false, isError: false, error: null, ...trial } as unknown as ReturnType<typeof useStartTrial>,
  );
  const onClose = vi.fn();
  render(createElement(UpgradeSheet, { view: VIEW, counted: COUNTED, outside: OUTSIDE, trialEligible, onClose }));
  return { mutate, startTrial, onClose };
}
```

4. Append inside the `describe`, before its closing `});`:

```ts
  it('starts the trial instead of checkout for an account that can (plan decision 9)', () => {
    const { mutate, startTrial, onClose } = renderSheet({}, { trialEligible: true });
    fireEvent.click(screen.getByRole('button', { name: VIEW.cta }));
    expect(track).toHaveBeenCalledWith(Events.UPGRADE_MOMENT_CTA, { state: 'E', action: 'start_trial' });
    expect(track).not.toHaveBeenCalledWith(Events.CHECKOUT_STARTED, expect.anything());
    expect(mutate).not.toHaveBeenCalled();
    const [, options] = startTrial.mock.calls[0] as [unknown, { onSuccess: () => void }];
    options.onSuccess();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('holds the sheet while the trial starts', () => {
    renderSheet({}, { trialEligible: true, trial: { isPending: true } });
    expect((screen.getByRole('button', { name: MOMENT_A.pending }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Close' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('names a refused trial start', () => {
    const refused = new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 409, data: { error: 'trial_used' },
    } as unknown as AxiosResponse);
    renderSheet({}, { trialEligible: true, trial: { isError: true, error: refused } });
    expect(screen.getByRole('alert').textContent).toBe('This email has already used its free trial.');
  });
```

In `src/__tests__/components/dashboard-v2/DebtsV2.test.ts`:

1. Replace `  usePaymentRecords, useStartCheckout, useSubscription,` with `  usePaymentRecords, useStartCheckout, useStartTrial, useSubscription,`.
2. Replace (in the `vi.mock('@/lib/hooks', …)` factory):

```ts
  useStartCheckout: vi.fn(),
}));
```

with:

```ts
  useStartCheckout: vi.fn(),
  useStartTrial: vi.fn(),
}));
```

3. In `renderTab`, directly before `render(createElement(DebtsV2, …));`, add:

```ts
  vi.mocked(useStartTrial).mockReturnValue(
    { mutate: vi.fn(), isPending: false, isError: false, error: null } as unknown as ReturnType<typeof useStartTrial>,
  );
```

4. Directly after the test "closes with what the date ignores and opens moment E from it", add:

```ts
  it('offers the trial on the closing card and in moment E to an account that can start one (plan decision 9)', () => {
    renderTab({
      debts: [...COUNTED, OUTSIDE],
      data: insights({ uncounted: UNCOUNTED, tier: { ...FREE, trial: { ...FREE.trial, eligible: true } } }),
    });
    fireEvent.click(screen.getByRole('button', { name: 'Count all 3 — start 14 days free' }));
    const dialog = screen.getByRole('dialog', { name: 'Your date is built from 2 of your 3 debts.' });
    expect(within(dialog).getByRole('button', { name: 'Count all 3 — start 14 days free' })).toBeTruthy();
  });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/__tests__/lib/dashboard/myDebts.test.ts src/__tests__/components/dashboard-v2/UpgradeSheet.test.ts src/__tests__/components/dashboard-v2/DebtsV2.test.ts`
Expected: FAIL: `countAllTrialLabel` is not exported, and the trial CTA doesn't exist.

- [ ] **Step 3: Implement**

`src/lib/dashboard/myDebts.ts`:

1. Add `import { SIGNUP_TRIAL_DAYS } from '@/lib/billing';` to the imports.
2. Directly after the `countAllLabel` function, add:

```ts
/** Moment E's CTA for an account that can start the self-serve trial (plan decision 9). */
export function countAllTrialLabel(total: number): string {
  return `Count all ${total} — start ${SIGNUP_TRIAL_DAYS} days free`;
}
```

3. In `debtsClosingView`, replace:

```ts
    cta: countAllLabel(total, price),
  };
}

export interface UpgradeSheetEView
```

with:

```ts
    cta: tier.trial.eligible ? countAllTrialLabel(total) : countAllLabel(total, price),
  };
}

export interface UpgradeSheetEView
```

4. In `upgradeSheetEView`, replace:

```ts
  date: string;
  price: number;
}): UpgradeSheetEView {
  const { countedCount, total, uncounted, date, price } = args;
```

with:

```ts
  date: string;
  price: number;
  trialEligible: boolean;
}): UpgradeSheetEView {
  const { countedCount, total, uncounted, date, price, trialEligible } = args;
```

and in its return, replace `    cta: countAllLabel(total, price),` with `    cta: trialEligible ? countAllTrialLabel(total) : countAllLabel(total, price),`.

Replace the whole of `src/components/dashboard-v2/sheets/UpgradeSheet.tsx` with:

```tsx
"use client";

import { useEffect } from "react";
import type { Debt } from "@/types";
import { getErrorMessage, useStartCheckout, useStartTrial } from "@/lib/hooks";
import { track, Events } from "@/lib/analytics";
import { formatCurrency } from "@/lib/utils";
import type { UpgradeSheetEView } from "@/lib/dashboard/myDebts";
import { MOMENT_A } from "@/lib/dashboard/upgradeMoments";
import { trialStartError } from "../upgrade/trialStartError";
import { CTA_BLUE, ERROR_LINE, EYEBROW } from "../styles";
import Sheet from "./Sheet";

type SheetDebt = Pick<Debt, "id" | "name" | "balance">;

interface UpgradeSheetProps {
  view: UpgradeSheetEView;
  counted: ReadonlyArray<SheetDebt>;
  outside: ReadonlyArray<SheetDebt>;
  /** The CTA starts the self-serve trial instead of checkout (plan decision 9). */
  trialEligible: boolean;
  onClose: () => void;
}

/**
 * Upgrade moment E (spec §7): at the Free cap, opened from the My Debts
 * closing card. Its CTA starts the trial for an account that can start one,
 * and the existing checkout otherwise; either way every debt then counts.
 */
export default function UpgradeSheet({ view, counted, outside, trialEligible, onClose }: UpgradeSheetProps) {
  const checkout = useStartCheckout();
  const startTrial = useStartTrial();
  const busy = checkout.isPending || startTrial.isPending;

  useEffect(() => {
    track(Events.UPGRADE_MOMENT_VIEWED, { state: "E" });
  }, []);

  const onCta = () => {
    if (busy) return;
    if (trialEligible) {
      track(Events.UPGRADE_MOMENT_CTA, { state: "E", action: "start_trial" });
      startTrial.mutate(undefined, { onSuccess: onClose });
      return;
    }
    track(Events.UPGRADE_MOMENT_CTA, { state: "E", action: "checkout" });
    track(Events.CHECKOUT_STARTED, { source: "upgrade_moment_e", billing: "monthly" });
    checkout.mutate();
  };

  let error: string | null = null;
  if (trialEligible && startTrial.isError) error = trialStartError(startTrial.error);
  if (!trialEligible && checkout.isError) {
    error = getErrorMessage(checkout.error, "Could not start checkout. Please try again.");
  }
  const pendingLabel = trialEligible ? MOMENT_A.pending : "Redirecting…";

  return (
    <Sheet
      title={view.title}
      busy={busy}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onCta} disabled={busy} className={CTA_BLUE}>
            {busy ? pendingLabel : view.cta}
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

`src/components/dashboard-v2/debts/DebtsV2.tsx`, replace:

```tsx
            date: closing.date,
            price: PLANS.pro.price,
          })}
          counted={membership.counted}
          outside={membership.outside}
          onClose={() => setSheet(null)}
```

with:

```tsx
            date: closing.date,
            price: PLANS.pro.price,
            trialEligible: insights.tier.trial.eligible,
          })}
          counted={membership.counted}
          outside={membership.outside}
          trialEligible={insights.tier.trial.eligible}
          onClose={() => setSheet(null)}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run the Step 2 command again. Expected: PASS. Then run `npm test`, `npx tsc --noEmit 2>&1 | grep -v "src/__tests__/lib/stripe.test.ts"` and `npm run lint` (report the count; no `tsc` output; lint clean).

- [ ] **Step 5: Commit**

```bash
git add src/lib/dashboard/myDebts.ts src/components/dashboard-v2/sheets/UpgradeSheet.tsx src/components/dashboard-v2/debts/DebtsV2.tsx src/__tests__/lib/dashboard/myDebts.test.ts src/__tests__/components/dashboard-v2/UpgradeSheet.test.ts src/__tests__/components/dashboard-v2/DebtsV2.test.ts
```

```bash
git commit -m "feat(dashboard-v2): moment E starts the trial for accounts that can" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---
### Task 10: Spec sync, verification, the schema push, the baseline gate, previews, and the pull request

**Files:**
- Modify: `docs/superpowers/specs/2026-09-12-dashboard-pro-upgrade-design.md` (§3, §5.2, §6.1, §6.4, §7, §8.3, §9)
- No code changes.
- Owner-gated steps, each needing its own OK: the baseline worktree, the Neon backup, `db:push`, previews, push and PR.

- [ ] **Step 1: Patch the spec**

In §3, append a row to the deviations table:

```
| X12 | Trial C "Interest avoided · $6,361" | "Projected interest · $x less" | It is the difference between two projections that start up to a month apart, so not all of it is interest avoided. |
```

In §5.2, in the `DashboardInsights` block, replace:

```
  tier: { proEligible: boolean; paidPro: boolean; trial: { active: boolean; endsAt: string | null } };
```

with:

```
  tier: { proEligible: boolean; paidPro: boolean; trial: { active: boolean; endsAt: string | null; eligible: boolean } };
```

and replace the sentence "PR 6 adds `trialMoment: TrialMoment | null` (§7)." with:

"PR 6 added `trialMoment: TrialMoment | null` (§7) and `tier.trial.eligible` (§6.4). `TrialMoment` is one of:
- `{ state: 'B'; day; daysLeft }`
- `{ state: 'C'; daysLeft; elapsedDays; monthsSooner; interestLess; paymentsLogged }` (each row null unless positive)
- `{ state: 'D'; endedAt }`"

In §6.1, directly after the Prisma block, add: "`trialBaselineAt` stores the client-local calendar day the baseline was taken, as that day's UTC midnight (PR 6)."

At the end of §6.4, add a sub-list headed **"PR 6 decisions (2026-09-17)"**:
- **Eligibility** is:
  - not `proEligible`
  - no signup window at all (`signupTrialEndsAt === null`)
  - no `TrialGrant` for the email

  A failed grant read, or `FORCE_PRO`, is not eligible.
- **The gates rule:** a pre-launch account's window is `signupTrialEndsAt(grant.grantedAt)` when it has a grant. Otherwise, or when the lookup fails, it has none. Post-launch accounts are unchanged, including their `createdAt` fallback.
- **`POST /api/trial/start`:**
  - Access: accounts on `DASHBOARD_V2_USERS` only (403 `not_available` otherwise); 5 starts per 10 minutes per user.
  - Body: an optional `{ today }`.
  - An ineligible account, or a concurrent start that hits P2002 on the grant, gets 409 `trial_used`.
  - It runs one interactive transaction, in order: grant `create`, `UserPreferences` upsert, then `moveOutsideDebtsIntoPlan` on the transaction client.
  - The response is the fresh verdict.
- **The baseline** is the plan over every debt (the trial counts them all), written only when it pays off. A signup trial, or a self-serve trial started without such a plan, gets its baseline from the insights endpoint the first time it computes one during the trial. That write is conditional, logged on failure, and never fails the response.
- **Emails:** trial-emails candidates include accounts whose `preferences.trialStartedAt` falls in the candidate window.

At the end of §7, add a sub-list headed **"PR 6 decisions (2026-09-17)"**:
- **Routing.** Every v2 upgrade request already dispatches through `upgradeEvents`: gated tiles, the gated move list and row, the closing CTAs, the rail, and 403s. Under the flag, `DashboardClient` answers with `UpgradeHost`. That is moment A for an eligible account; otherwise, and while insights load, `UpgradeFallbackSheet`, which is `UpgradeModal`'s copy and anchor in the v2 sheet with `source: 'dashboard_v2_upgrade_sheet'`. v1 keeps `UpgradeModal`.
- **The rail.** Its CTA reads "Try Pro free" for an eligible account.
- **B:**
  - Eyebrow "Pro is on · day {d}" and "{n} days left".
  - Title "Three things worth doing while it's on." ("Two…" without a card to call).
  - Rows:
    - "Finish your plan setup": ✓ at 5 of 5, else it opens the first unfinished step's flow.
    - "Run one what-if": goes to My Plan.
    - "Call one card about its APR": opens rate watch's top card's script on Coach.
  - Only setup ticks. Dismissible per trial.
- **C:**
  - Rows:
    - "Debt-free date · {m} months sooner": debt-free months compared, so a month passing is not "sooner".
    - "Projected interest · ${x} less" (X12).
    - "Payments logged · {n}": records with `paidAt` since the trial start.
  - Title "What the last {d} days actually moved." with the eyebrow "{n} days left of Pro". With no rows, the title is "{n} days left of Pro.".
  - The price line ends "against ${x}/mo est. interest" (dropped under $1).
  - "Keep Pro" → checkout. Not dismissible.
- **D:**
  - With a cached brief: the README card and the kept block "Kept — {Mon D}", the headline, the summary and the note.
  - Without one: the title "Nothing was removed from your plan.".
  - It renders nothing until the brief query settles. "Stay on Free for now" dismisses it per trial end.
- **E.** For an eligible account the CTA is "Count all {n} — start 14 days free" and starts the trial from the sheet.
- **Retired under the flag.** The countdown banner and the one-time post-trial modal. `CoachBriefCard` takes the page's `isPro`, so the locked door can't flash from a stale subscription cache.

In §8.3, replace the sentence beginning "Until PR 6, `GatedTile` and the gated list header open the existing `UpgradeModal`" (through the end of its parenthesis) with: "`GatedTile` and the gated list header dispatch through `upgradeEvents` with the `UPGRADE_FEATURE` keys ("What-if scenarios", "Custom priority order", "Coach moves"); under the flag `DashboardClient` answers with `UpgradeHost` (PR 6, §7)."

In §9:
- Under `upgrade_moment_cta {state, action}`, add: "actions: A `start_trial`; B `setup` / `what_if` / `apr_script` / `dismiss`; C `checkout`; D `checkout` / `dismiss`; E `checkout` / `start_trial`."
- Under `trial_self_serve_started`, add: "captured server-side by `POST /api/trial/start`, consent-gated from the request cookie, `{source: 'dashboard_v2'}`."
- After the moment E line, add: "Moments C and D send `checkout_started {source: 'upgrade_moment_c' | 'upgrade_moment_d', billing: 'monthly'}`; the v2 upgrade sheet sends `checkout_started {source: 'upgrade_sheet', …}` with `UpgradeModal`'s other properties."

Commit:

```bash
git add docs/superpowers/specs/2026-09-12-dashboard-pro-upgrade-design.md
```

```bash
git commit -m "docs(spec): record dashboard v2 upgrade moment and self-serve trial decisions" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 2: Full local verification**

The `budget-dev` preview server stays stopped (Global Constraints).

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
npm run build
```

Expected:
- lint is clean
- `tsc` prints nothing
- every test passes (report the count; it was 1301 at base)
- the build exits 0

`apps/mobile` is untouched by this PR.

v1's snapshots must be byte-identical to main:

```bash
git diff --stat main -- src/__tests__/components/dashboard-v2/__snapshots__/
```

This must print nothing. Record the branch head: `git rev-parse --short HEAD`.

- [ ] **Step 3: STOP — the schema push and the baseline gate (owner-gated)**

This PR changes `src/lib/gates.ts` and adds columns, so the full read-only capture runs twice, around the push. Ask the owner for one OK covering items 1–4 below; the push itself (item 6) needs its own explicit OK. Never read or print `.env.local`. The baseline scripts live in `~/.gstack/projects/vronney-snowball-pay/baseline/` (read its `README.md` first).

1. **Baseline worktree.** From the repo root, follow the baseline README exactly:
   - `git worktree add ../budget-main-baseline main`.
   - `diff package.json ../budget-main-baseline/package.json` must print nothing.
   - Create the `node_modules` junction.
   - Copy `.env.local` into the worktree with `cp .env.local ../budget-main-baseline/.env.local`. The owner's OK must name this copy, and the file is never read.
2. **main's client.** The junction shares `node_modules`, so the generated Prisma client is shared too. `cd ../budget-main-baseline && npx prisma generate` puts main's client (no trial columns) in place.
3. **Capture `main-pre`.** Run from the primary repo root with `B=C:/Users/ronne/.gstack/projects/vronney-snowball-pay/baseline`:

```bash
NODE_OPTIONS=--experimental-websocket BASELINE_REPO="$(cd ../budget-main-baseline && pwd -W)" BASELINE_LABEL=main-pre npx vitest run --config "$B/baseline.config.mjs" --root "$B"
```

4. **Neon backup.** The free plan's single snapshot slot is held, so back up with a branch, as PR 4 did.
   - Create branch `pre-pr6-trial-<YYYY-MM-DD>` from production branch `br-rapid-haze-ancw2zik` in project `flat-hill-73561129` (Neon MCP `create_branch`).
   - Confirm it with `list_branches`: the MCP has returned `NeonAuthError` while still creating the branch, so check before any retry.
   - If the plan's branch limit refuses it, stop and ask the owner. Deleting the old `pre-pr4-inPlan-2026-09-15` backup is the owner's call.
5. **Preview the push.** From the primary repo root:

```bash
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script
```

   Expected: exactly one statement, `ALTER TABLE "user_preferences"` with four nullable `ADD COLUMN`s (`trialStartedAt`, `trialBaselineAt`, `trialBaselineMonths`, `trialBaselineInterest`). Anything else: stop and show the owner.
6. **STOP — explicit OK for the production push**, then:

```bash
npm run db:push
```

7. **Verify read-only** with the Neon MCP `run_sql` on the production branch:

```sql
SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name LIKE 'trial%' ORDER BY column_name;
```

   Expected: 4 rows, all `is_nullable = YES`.

```sql
SELECT count(*) AS started FROM user_preferences WHERE "trialStartedAt" IS NOT NULL OR "trialBaselineAt" IS NOT NULL;
```

   Expected: `0`.
8. **Capture `main` and `branch` back to back.**
   - `db:push` regenerated the branch client into the shared `node_modules`. Regenerate main's client first (`cd ../budget-main-baseline && npx prisma generate`), then capture `main`:

```bash
NODE_OPTIONS=--experimental-websocket BASELINE_REPO="$(cd ../budget-main-baseline && pwd -W)" BASELINE_LABEL=main npx vitest run --config "$B/baseline.config.mjs" --root "$B"
```

   - Then regenerate the branch client (`npx prisma generate` in the primary repo) and capture `branch`:

```bash
NODE_OPTIONS=--experimental-websocket BASELINE_LABEL=branch npx vitest run --config "$B/baseline.config.mjs" --root "$B"
```

9. **Compare.** Print both files' modification times first, since `compare.mjs` happily compares a stale file (`ls -l "$B"/*.json`).

```bash
node "$B/compare.mjs" "$B/main-pre.json" "$B/main.json"
```

```bash
node "$B/compare.mjs" "$B/main.json" "$B/branch.json"
```

   Both must print `DIFFERENT=0`, `missing=0` and `inputsChanged=0`. Record the `identical=` count; PR 4's was 44. If `inputsChanged` is above 0, a user edited data between runs, so rerun the affected pair. Any `DIFFERENT` is a stop: show the owner the per-user field names, never their values.
10. **Cleanup** only with the owner's OK:
    - Remove the junction first: `cmd //c "rmdir ..\\budget-main-baseline\\node_modules"`.
    - Then `git worktree remove ../budget-main-baseline`.
    - The Neon backup branch stays until the owner decides.

- [ ] **Step 4: STOP — owner-gated previews**

The database now has the columns, so the dev server may run again.
- Ask the owner to sign in on the preview. Never enter credentials or OTP codes.
- **Localhost uses the production database.** Do not start a trial for any account on the preview without the owner's explicit OK. A started trial writes a permanent `TrialGrant` for that email.

1. Start `budget-dev` (`preview_start`, name `budget-dev`); `.env.local` already carries `DASHBOARD_V2_USERS`.
2. **Flag on, the owner's paid Pro account**, at 375, 768, 1024 and 1280. Check `read_console_messages` and `preview_logs` for errors, and screenshot each width. Confirm:
   - This Month has no banner above the tab and no moment card (the owner is paid, so `trialMoment` is null). The AI brief shows with no locked door.
   - The `/api/dashboard/insights` response (`read_network_requests`) carries `tier.trial.eligible: false` and `trialMoment: null`.
   - The sidebar has no rail (Pro), and My Debts, Plan, Progress and Coach render as they did at `e6fa7e93`.
3. **Flag off:** one load renders v1 with zero `/api/dashboard/insights` requests. The owner may accept this via the flag tests instead, as for PRs 4 and 5.

The Free, eligible, trial and post-trial surfaces (moments A–E, the fallback sheet, "Try Pro free") are covered by the component and route tests. A live check needs a separate Free test account and the owner's OK for the permanent grant it writes.

- [ ] **Step 5: STOP — push and open the PR only with the owner's OK**

```bash
git push -u origin feat/dashboard-v2-upgrade-moments-trial
```

Open a PR against `main` titled `feat(dashboard): v2 upgrade moments and the self-serve trial (PR 6/6)`. Use `gh` at its full path (`"C:/Program Files/GitHub CLI/gh.exe"`; it is not on the Bash PATH). The body must include:
- A summary of the trial start, the gates rule, moments A–E, the retirements, and the twelve decisions, in the plan's words.
- Links to the spec and to this plan.
- "Flag off renders unchanged", with the snapshot diff result.
- The schema push record: the Neon backup branch name, the `migrate diff` statement, and the two SQL checks.
- The baseline gate: both compares' `identical=` counts with `DIFFERENT=0`, stated as "billing verdicts and plan numbers identical for every account".
- The preview checklist from Step 4 (widths, no console or server errors), without any of the owner's figures.
- The test count.
- Follow-ups carried forward:
  - **Batch bulk-log celebrations before `DASHBOARD_V2_USERS=all`** — a rollout blocker.
  - The atomic Free-cap allocator (task chip).
  - The CoachV2 Free/Pro component split.
  - A PlanV2-over-real-PayoffTab integration test.
  - A failing restore-save after a failed plan fix shows no error.
  - One 429 on insights during rapid reloads (limiter 120 per 10 minutes).
  - Expo trial surfaces.
  - Tracking what-ifs and calls so moment B can tick them.
  - Deleting the Neon backup branches once production is healthy.
- The rollout note (spec §11): `DASHBOARD_V2_USERS=<owner email>` after merge, verify on production, then `all` only after the celebration batching lands.
- The footer `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

Never merge before the CodeRabbit and Codex reviews land; merging is the owner's call.

# Pro Conversion Audit — 2026-09-04

Sources: the production database (users, debts, income, payment records, balance snapshots, Plaid items, trial grants, calculator leads), PostHog (90-day window), the Vercel error rollup (7 days), and a code read of the Stripe checkout and webhook path. The three internal accounts belonging to the founder are excluded from external rates.

This document keeps aggregate numbers and conclusions only. Per-account evidence (names, addresses, balances, activity) lives in the private audit report and the AI Brain, not in this repository.

## Verdict

| Question | Answer |
|---|---|
| Is Pro signup / Stripe broken? | **No.** Checkout sessions are created (11 in 90 days), webhooks write renewals (two renewal writes in late August), zero 5xx on billing routes in 7 days. |
| Why only 2 Pro users? | **Retention, not checkout.** 31 of 38 external accounts never returned after day one. Pro is sold as "the months after"; almost nobody reaches month two. |
| What first? | Trial-ending emails (none existed at audit time), a personal note to the one paying customer (idle four weeks), and the calculator friction found on 2026-09-05 (the "Reset sample numbers" hero button and the consent banner, not the `calculator_form_blocked` count, which was a bot burst; see below). |

## The 41 users (aggregate)

- 41 accounts (38 external, 3 internal). 2 Pro: one external paying customer (P1, paying since late May at a grandfathered $9/mo, not the list price of $12) and the founder.
- 30 added a debt, 29 saved income, 11 ever logged a payment, 7 external users returned after day one.
- Stripe customers: 5. Subscriptions: 3 (2 active, 1 canceled: C1 took the old 7-day card trial in April, canceled before the first charge, then kept using Free for three months as one of the most active accounts).
- Abandoned checkouts: one real user in July (left the Stripe page within a minute of signup) and the founder's own test sessions in August.
- Trial cohort since 08-14: 11 signups, 4 trials expired, 0 converted, 0 returned. 7 still in trial.
- Buyer shape: the only two people who ever entered a card (P1, C1) each carried 10+ debts and logged 19–29 payments. Three current trial users share the *shape* (7 to 10 debts, and in one case every payment logged on day one) but not yet the payment history, which needs weeks to accumulate; they are the accounts to interview, not proof of conversion.
- Calculator leads: 15 captured, 10 became accounts.

## Billing findings (code, pre-change snapshot as of 2026-09-04 morning)

1. **Mid-trial checkout disables abandoned-checkout recovery.** `checkout/route.ts` passes an absolute `trial_end`, and Stripe rejects `after_expiration.recovery` with it, so the "Keep Pro" banner path has no recovery email. Fix: use `trial_period_days: wholeDaysRemaining(end)` and keep recovery on. *Still open.*
2. **No trial-ending email existed.** Lifecycle covered day 0/2/5/7, weekly, monthly, and a 30-day win-back. Nothing at day 11 or 14; the banner and post-trial modal only rendered in-app. *Resolved the same day, see the action plan.*
3. **`subscription_started` has never reached PostHog** (consent-gated). A paid conversion is invisible in funnels. Capture a consent-free, PII-free count event too. *Still open.*

Not verified on 2026-09-04: the Stripe dashboard (connector not authorized), Vercel logs older than 24h, live-site screenshots (domain blocked by the session's network policy).

**Stripe check, 2026-09-05 (live account, since June 1):**
- 8 Checkout sessions, all expired unpaid: 7 were the founder's own test sessions in August, 1 was the real July abandonment noted above. That July session predates recovery emails, so nothing was sent; the founder's mid-August sessions had recovery enabled, which confirms the `after_expiration` path works when `trial_end` is absent.
- 6 payment intents, all succeeded, all $9 renewals for the two active subscriptions. No declines since June.
- **Correction to C1:** the canceled subscription ended with Stripe's cancellation reason `payment_failed` on 2026-05-29, one month after the card trial ended, not a voluntary cancel before the first charge. C1 tried to pay and the card failed; Stripe's retries exhausted and closed it. That is a recoverable customer, not a churned one. Lever: a personal note offering to reactivate at the grandfathered price.
- The billing finding above (mid-trial checkout disables recovery) still stands.

## Funnel, 90 days (unique persons, PostHog)

Opened calculator 79 → started 62 → saw payoff date 49 → clicked save 17 → finished signup 14 → saw upgrade modal 10 → started Checkout 3 (2 internal) → paid 0.

Landing: 46–138 visitors/week. Calculator: 8–35/week. Signups: 0–2/week. Landing→calculator ≈ 18%. `pricing_pro_clicked`: 1 in 90 days. Tab views: this-month 121 (14 users), debts 56, plan 55, progress 37, intelligence 37 (4 users), income 21, settings 3.

## Why people are not upgrading (ranked)

1. **Nobody reaches month two.** 31/38 external last-seen = signup date. Five users logged payments on day one and never came back. Lever: due-date email with one-tap "Log payment".
2. **The trial ends in silence.** 0/4 expired trials converted or returned. Lever: day-11 and day-14 emails, loss-framed with the user's real avoidable-interest number.
3. **Free users are asked to pay for a coach they've never heard from.** 30/41 accounts predate the trial; the coach card is a locked button. Lever: show the Signal line free, lock Evidence/Action.
4. **Top of funnel too small.** ~100 visitors/week → 1–2 signups. The 393 `calculator_form_blocked` events turned out to be two automated sessions (see the 2026-09-05 section); the real mobile friction is the hero "Reset sample numbers" button and the consent banner. Lever: fix those two; calculator above the fold.
5. **$12 anchored against $0.** Two-column pricing, Free first, no annual, modal anchor hidden when 0. Lever: interest-to-lenders anchor above the price; $96/yr option.
6. **The one paying customer is idle.** No activity for four weeks, renews late September. Lever: personal email this week.

## Design review (DESIGN.md + conversion checklist)

- **Hero shows "—"** for Interest reclaimed / Sooner than minimums on any plan without acceleration. Replace with interest-to-lenders/month and the +$50 scenario (already computed in WhatIfCard / IntelligenceUpgradeTeaser). `DebtFreeCountdownHero.tsx`
- **Plan status invisible** after the banner is dismissed. Add a header chip "Free · N days of Pro left". `DashboardHeader.tsx`
- **Upgrade modal**: "Continue with Free" has nothing at stake; no anchor above $12. Use "Stay on Free (coach notes and what-if pause)" and show real monthly interest above the price. `UpgradeModal.tsx`
- **Coach card is a locked door** for Free. Mirror the Intelligence teaser: real Signal line, locked depth. `CoachBriefCard.tsx`
- **This Month order**: eight cards before the action. Focus-debt card directly under the hero; stat strip below. `ThisMonthTab.tsx`
- **Sidebar**: 7 items vs 5 max; 10px nav radius (hierarchy is 12/8/6); marketing greys (#0b1220, #536078) and weight 900 leak into the app shell. `DashboardSidebar.tsx`, `DashboardHeader.tsx`
- **Pricing section**: weight 900, gradient fill in the coach-preview panel, off-palette greys, Pro anchored right of Free. `Pricing.tsx`
- **Retire ProGate** (blur gate contradicts the reciprocity rule; likely unreachable). `ProGate.tsx`
- Keep: fonts, tabular numbers, blue discipline, wallet-card debts, Intelligence teaser pattern, debt-cap honest decline, celebration easing, calculator defaults.

## Calculator friction follow-up — 2026-09-05

Session replay could not be used: recording is consent-gated in `src/lib/analytics.ts`, and the project's replay trigger never matched on production, so there are no production recordings. The findings below come from PostHog autocapture, dead-click, rage-click, and web-vitals events over 90 days, read against the component tree in `src/components/calculator/`.

1. **The 393 `calculator_form_blocked` events were not people.** 384 of them came from two sessions on 2026-08-01, both referred by Google's search-partner network, each firing 192 blocked-field events in about 100 seconds with rage clicks. Six real visitors triggered 1 to 3 events each, all on an empty balance, mostly mobile Safari. The validation copy is not a trap; drop this item.
2. **"Reset sample numbers" is the most-tapped button on the mobile calculator, and it does nothing on first load.** 66 taps across 9 mobile sessions (one session tapped it 42 times and rage-clicked); 6 taps were flagged dead. It is the only button in the hero, styled as a pill under the headline, and on a fresh page the data already is the sample, so tapping it changes nothing. Visitors read it as "start". Fix: remove it from the hero; show a small "Reset to sample" text link inside the debts card only after the user has edited something (`isSampleData === false`), and let the hero button focus the first balance field instead. `PublicCalculator.tsx`
3. **"Essential only" on the consent banner re-enables SDK capture and silently drops everyone from the product funnel.** On mobile, 18 of 31 visitors who answered the banner chose "Essential only". `disableAnalytics()` calls `opt_out_capturing()` and then `reset()`; posthog-js `reset()` clears the consent state, so autocapture, dead clicks, swipes, and page-leave keep flowing under a fresh anonymous id (10 sessions in 90 days start with a "dead" click on the banner and then carry dozens of autocapture events and no pageview), while the app's own events (`calculator_started`, `calculator_result_viewed`, `calculator_save_clicked`, `signup_completed`) stop because `track()` bails on `denied`. Two effects: the behaviour does not match the banner copy, and mobile funnel counts are undercounted by roughly half. Fix: decide what "Essential only" means. The banner already promises cookieless, anonymous measurement, so the honest fix is to keep anonymous mode running and never call `reset()` after opting out; if "Essential only" is meant to stop everything, call `reset()` first and `opt_out_capturing()` last. `src/lib/analytics.ts`, `AnalyticsConsentBanner.tsx`
4. **"Add another debt" works; the dead-click flags on it are a detector artifact.** 20 mobile and 11 desktop dead clicks landed on it, but in every case the visitor typed into the new row 1 to 3 seconds later, and INP on the calculator is healthy (mobile p75 86 ms, p90 156 ms, desktop p75 144 ms). Do not spend time here.
5. **People clear the sample debts one row at a time.** The remove (X) button on the first sample card drew 26 taps in 7 mobile sessions before any typing. A "Start with my numbers" action that clears the three sample rows would remove that step and replace the confusing hero button from item 2.
6. **Paid traffic is still running against the charter's no-paid-acquisition rule.** Person-level rollup (session entry source, 90 days; cookieless ids inflate person counts and item 3 removes half of mobile after the banner, so read the ratios, not the totals): paid 654 persons → 118 calculator views → 42 started → 27 saw a result → 14 clicked save → 7 signups → 1 checkout; direct/other 562 → 70 → 18 → 19 → 2 → 6 → 2; organic search 117 → 4 → 1 → 2 → 0 → 0. Paid brings about 60% of calculator views, converts calculator views to signups at 6% versus 9% for direct, and the week of 2026-08-30 still had 40 paid visitors. Pause or defend the campaign explicitly; the charter says maintenance and measurement only.
7. **Session replay needs two things before it can ever be watched:** consent ("Allow analytics", chosen by 13 of 31 mobile visitors who answered) and a replay trigger in the PostHog project that matches production URLs. Today the second is missing, so even the 14 people who allowed analytics were never recorded.

## Action plan

This week
- [ ] Email the paying customer personally (drafted 2026-09-04).
- [x] Ship trial-ending emails keyed off TrialGrant. Built 2026-09-04: `/api/cron/trial-emails`, daily 10:30 UTC, live once this branch deploys.
- [x] Investigate the `calculator_form_blocked` events (2026-09-05: bot burst; real friction listed above).
- [x] Fix the consent banner opt-out/reset order (2026-09-05: `disableAnalytics()` now resets before opting out, so "Essential only" stops SDK capture as the privacy page promises; the funnel gap is by design and stays until the policy changes).
- [x] Stripe dashboard check (2026-09-05, live account): every Checkout session since June expired unpaid; all but one belonged to the founder's own test accounts, the one real session (mid-July) predates recovery emails. Six renewal payments succeeded, zero declines since June. The canceled subscription ended with Stripe's `payment_failed` reason after its card trial, not a voluntary cancel, so that user tried to pay. Dunning/failed-payment email is a gap worth closing.
- [ ] Replace the hero "Reset sample numbers" button with a "Start with my numbers" action.
- [ ] Fix the PostHog replay trigger so consented production sessions record.
- [ ] Pause the Google Ads campaign or record a Decision that overrides the charter.
- [x] Authorize the Stripe connector; confirm the sessions expired unpaid, check declines and recovery emails (done 2026-09-05, see above).
- [ ] Mid-trial checkout → `trial_period_days`, keep recovery on.
- [ ] Message the three buyer-shape trial users (drafted 2026-09-04).

Next two weeks
- [ ] Hero: interest-to-lenders + the +$50 scenario replace the "—" tiles.
- [ ] Header plan chip.
- [ ] Coach card Free preview (Signal line).
- [ ] Upgrade modal anchor + truthful decline copy.
- [ ] This Month reorder.

After
- [ ] Annual price ($96/yr).
- [ ] Due-date email with one-tap Log payment.
- [ ] Sidebar to 5 items, token cleanup, retire ProGate.

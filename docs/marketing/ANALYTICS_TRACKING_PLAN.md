# SnowballPay Growth Tracking Plan

Last updated: August 5, 2026

## Purpose

This plan measures the path from campaign visit to an active Pro subscription. It exists to answer four decisions:

1. Which acquisition campaigns produce people who finish a payoff plan?
2. Where does the calculator-to-account funnel lose the most people?
3. Which activated users start Pro?
4. Is paid acquisition ready to scale without buying traffic for a leaky funnel?

Stripe is authoritative for active subscribers and MRR. PostHog is the consented product-funnel and campaign-attribution layer. Google Ads receives one consented conversion after successful first-plan setup.

## Consent and privacy

- PostHog runs cookieless and in-memory until the visitor selects **Allow analytics**: nothing is persisted on the device, no replays, no identify calls. Consent adds persistent identifiers and masked replay. The Google Ads network script stays fully disabled until consent.
- Selecting **Essential only** stops all PostHog capture, including the cookieless mode.
- Selecting **Essential only** does not change calculator or account functionality.
- Consent is remembered in first-party browser storage and a first-party preference cookie.
- Server-side PostHog events require an explicit `consent: "granted"` argument.
- Session replay is consent-gated and fully masked: recordings can start only for consenting visitors, per the PostHog project's replay settings, with all text and element attributes hidden.
- Analytics removes query details, email-like strings, debt balances, income, rates, payment amounts, prices, and other financial values.
- Google Ads enhanced-conversion email data is sent only after consent and only after successful first-plan setup.

Visitors can change their choice in the Cookies and Similar Technologies section of `/privacy`.

## Canonical funnel

| Stage | Event | Trigger | Safe properties | Decision |
| --- | --- | --- | --- | --- |
| Visit | `$pageview` | Consented route view | path and normalized campaign labels | Which source reaches the product? |
| Calculator intent | `calculator_started` | First calculator interaction | calculator slug, interaction type | Does the landing message create action? |
| Value reached | `calculator_result_viewed` | First valid result after interaction | debt count, projected months | Can visitors complete the calculator? |
| Save intent | `calculator_save_clicked` | Save-plan CTA click | CTA location, projected months | Is the result valuable enough to save? |
| Signup intent | `signup_started` | Auth0 signup entry | source location | Which CTA creates account intent? |
| Onboarding step viewed | `onboarding_step_viewed` | A direct-wizard step is first shown in the session | step name, position, total steps, source | Where does first-plan setup lose people? |
| Onboarding step completed | `onboarding_step_completed` | A validated step advances or the final setup save succeeds | step name, position, total steps, source | Which required input creates the most friction? |
| Onboarding skipped | `onboarding_skipped` | User leaves setup for the empty dashboard | current step, position, total steps, source | Where do users intentionally abandon setup? |
| Activated account | `signup_completed` | Onboarding API succeeds | method, debt count, onboarding mode, source | Did the account save a usable plan? |
| Plan rendered | `plan_generated` | Valid dashboard plan first appears in a browser session | method, debt count, projected months | Did setup produce the core product outcome? |
| Upgrade preview viewed | `upgrade_modal_viewed` | A free user opens a contextual Pro preview | feature, trigger, message version, source | Which product moment creates qualified Pro interest? |
| Upgrade preview dismissed | `upgrade_modal_dismissed` | User closes the preview or continues with Free | feature, trigger, message version, reason, source | Which message or trigger creates friction without intent? |
| Upgrade intent | `checkout_started` | User requests Pro checkout | billing cadence, feature, trigger, message version, source | Which product moment creates upgrade intent? |
| Checkout ready | `checkout_session_created` | Stripe Checkout URL succeeds | billing cadence | Is checkout creation reliable? |
| Pro started | `subscription_started` | Consented Stripe checkout webhook succeeds | billing cadence, subscription status | Which activated users become Pro? |
| Cancellation started | `cancel_flow_started` | Pro user chooses the cancellation path | source | How many Pro users consider leaving? |
| Cancellation reason | `cancel_reason_selected` | User optionally selects an allowlisted reason | reason, source | Which product or value problem should be addressed first? |
| Cancellation saved | `cancel_flow_saved` | User exits the cancellation path and keeps Pro | reason, source | Which interventions help without blocking cancellation? |
| Cancellation portal | `cancel_portal_opened` | User continues to Stripe from the cancellation path | reason, source | How often does intent reach subscription management? |

`signup_completed` means successful payoff-plan setup, not merely creation of an Auth0 identity. This makes it a useful Google Ads conversion instead of a button-click proxy.

The direct wizard now asks only for monthly capacity, payoff strategy, and the first debt. The former primary-goal question was removed because its answer was neither persisted nor used to calculate or personalize the plan. Calculator-qualified users continue to use the express confirmation path and should be analyzed separately through `onboarding_express_viewed` and `onboarding_express_completed`.

The Pro preview uses message version `contextual_v2`. Its headline, three benefits, and checkout CTA reflect the attempted feature: unlimited debts, bank sync, what-if scenarios, Payoff Coach, or Intelligence. Unknown and settings entry points use the general follow-through message. Trialing users are excluded from this upgrade path; during the final seven days of a trial, the dashboard routes them to Stripe billing review instead of starting another checkout.

Version history: `contextual_v2` (August 2026) rewrote the what-if message after the acceleration amount control became free for all tiers — the pitch now sells previewing the +$50/+$100 scenarios side-by-side and one-click apply rather than setting an amount, which free users can do with the slider. The acceleration control itself no longer triggers an upgrade preview; its legacy feature strings ('What-if slider', 'Acceleration control') can still arrive from stale clients and map to the acceleration message. Compare funnel metrics within a single message version; `contextual_v1` events are the pre-change comparator and are excluded from the current baseline.

## Attribution

Use these campaign parameters on external campaign links:

- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_content`
- `utm_term` for paid keywords

Rules:

- Lowercase labels and use underscores.
- Never put email addresses, debt values, or personal details in campaign parameters.
- Never add UTMs to links between SnowballPay pages; internal UTMs overwrite acquisition attribution.
- PostHog campaign persistence is explicitly enabled.
- Safe pageview context normalizes campaign labels and rejects malformed or email-like values.
- Auth0 returns to the same SnowballPay origin, so consented PostHog persistence links the anonymous calculator session to the identified user on onboarding.

## Core ratios

Calculate each ratio using unique people, not raw event totals:

| Metric | Formula | Initial decision threshold |
| --- | --- | ---: |
| Calculator completion | result viewed / calculator started | Diagnose below 60% |
| Save intent | save clicked / result viewed | Diagnose below 15% |
| Save-to-activation | signup completed / save clicked | Diagnose below 35% |
| Direct onboarding completion | signup completed / monthly-capacity step viewed | Diagnose below 60% after 20 direct starts |
| Plan activation | plan generated / signup completed | Paid gate requires at least 45% |
| Preview-to-checkout | checkout started / upgrade modal viewed | Establish baseline by trigger before testing copy |
| Activated-to-Pro | subscription started / plan generated | Improve pricing/value if below 8% |

Thresholds are operating hypotheses, not guarantees. Revisit them after at least 50 consented calculator starts and 20 successful onboarding completions.

## Google Ads conversion

Primary conversion: **Sign-up - Start Plan**

- Fires only after the onboarding mutation succeeds.
- Uses the onboarding idempotency key as `transaction_id` to deduplicate retries.
- Uses a normalized email for enhanced conversion matching only when analytics consent is granted.
- Does not fire on landing-page clicks, calculator starts, Auth0 form views, or failed onboarding attempts.
- Google Ads totals will be lower than database totals because non-consenting conversions are intentionally excluded.

Before enabling campaign bidding, verify one consented test conversion in Google Tag Assistant and confirm the action appears in Google Ads diagnostics.

## Paid-media release gate

Keep Google Search campaigns in draft until all are true:

- The production PostHog project receives the canonical funnel in order.
- A consented test session carries `utm_source`, `utm_medium`, `utm_campaign`, and `utm_content` through `signup_completed`.
- Repeating onboarding or a Stripe webhook does not duplicate the conversion.
- No event payload contains an email address or financial value.
- Google Ads records the successful first-plan conversion.
- Plan activation is at least 45% across at least 20 successful onboarding completions.
- Mobile calculator and onboarding completion have been manually verified.

Until the gate opens, use SEO, Instagram, Stories, Reels, and lifecycle email to build the sample without paying for traffic.

## Weekly operating view

Review these together:

1. Run `npm run growth:scorecard -- --stripe-mode live` for Stripe-authoritative Pro and MRR.
2. In PostHog, filter the canonical funnel by `utm_campaign` and compare unique-person conversion.
3. Review calculator completion and save intent before changing ads.
4. Review preview-to-checkout by `trigger` and `message_version`, then activated-to-Pro conversion, before changing price.
5. Reconcile PostHog `subscription_started` against Stripe; PostHog will be lower when users decline optional analytics.
6. Review aggregate cancellation intent and scheduled/completed reasons in the growth scorecard; treat small samples as directional, not conclusive.

Never use PostHog as the subscriber ledger and never use likes, clicks, or pageviews alone to decide whether a campaign is working.

## Lifecycle return loop

The automated saved-plan check-in uses message version `supportive_v1`. It sends once, after 30 complete days without a durable debt/income change or logged payment, only to activated users with outstanding debt who have not opted out. The CTA carries `utm_source=lifecycle`, `utm_medium=email`, `utm_campaign=win_back`, and `utm_content=supportive_v1`.

Use the cron response as the delivery denominator and consented PostHog sessions with that campaign as the seven-day return numerator. Review subsequent payment-record counts only in aggregate. Never send balances, debt names, APRs, income, or payment amounts to PostHog or include them in the win-back email.

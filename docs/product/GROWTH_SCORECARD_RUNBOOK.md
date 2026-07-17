# Growth Scorecard Runbook

The growth scorecard reconciles aggregate subscription revenue from Stripe with aggregate funnel and retention proxies from the currently configured database.

It never prints customer emails, Stripe customer IDs, subscription IDs, debt balances, or other user-level data.

## Commands

Test data:

```powershell
npm run growth:scorecard -- --stripe-mode test
```

Live Stripe data:

```powershell
npm run growth:scorecard -- --stripe-mode live
```

Machine-readable output:

```powershell
npm run growth:scorecard -- --stripe-mode live --json
```

The command validates that the chosen key prefix matches the requested mode. It refuses to run a test key as live or a live key as test.

Pricing scenario override:

```powershell
npm run growth:scorecard -- --stripe-mode live --monthly-price 12 --annual-price 99 --annual-share 0.5
```

The pricing flags model a prospective offer; they do not change Stripe or customer billing. Defaults are the currently presented $12 monthly price, $79 annual price, and a 50% modeled annual share.

## Sources of truth

- Stripe active subscriptions: active paid Pro count and gross MRR.
- Stripe trialing subscriptions: trial pipeline only; excluded from active MRR.
- Stripe subscription metadata: allowlisted cancellation-intent reason and timestamp only; no free-text response is collected.
- Database: users, calculator leads, debt-plus-income activation proxy, and recent payment activity.
- PostHog: canonical `plan_generated`, campaign attribution, Week 1 retention, and Week 4 retention.

The scorecard intentionally does not estimate canonical activation from database rows. A debt-plus-income record is useful operational context, but only the `plan_generated` event proves the defined activation action.

## Weekly review

Run the live scorecard every Monday and record:

1. Active paid Pro and MRR progress.
2. New starts, cancellations, scheduled cancellations, and past-due accounts.
3. Monthly versus annual mix and blended MRR per Pro.
4. Whether current live ARPU and the modeled offer can satisfy 1,000 Pro and $10K MRR together.
5. Database-to-Stripe discrepancies that indicate missed webhooks or the wrong environment.
6. Database funnel proxies alongside PostHog's canonical funnel.
7. Cancellation-intent reasons versus reasons attached to subscriptions that are actually scheduled or completed cancellations.

Then choose one experiment with one decision metric. Do not increase paid acquisition until PostHog confirms signup-to-`plan_generated` activation of at least 45%.

## Interpretation rules

- Database active count differs from Stripe: reconcile webhooks before reporting subscriber progress.
- Blended MRR per active Pro below $10: 1,000 subscribers will not reach $10K MRR at the observed billing mix.
- Modeled offer below $10 blended: adjust the billing mix assumption or test a different price only after customer research.
- Active Pro required at current blend above 1,000: the revenue target has become the binding constraint.
- Past-due subscriptions: exclude from active MRR and investigate recovery.
- Scheduled cancellations rising: prioritize cancellation reasons and retention work before acquisition spend.
- Cancellation intent without a scheduled/completed cancellation: directional evidence of a saved or abandoned flow, not proof that the intervention caused retention.
- Reason samples below 20: read individual counts as discovery signals; do not change pricing or launch discounts from percentages alone.
- Trials rising without active paid growth: investigate trial-to-paid conversion and message-to-product fit.

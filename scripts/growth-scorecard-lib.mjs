export const GROWTH_GOALS = Object.freeze({
  activePro: 1_000,
  mrrCents: 1_000_000,
});

export const CURRENT_PRICING = Object.freeze({
  monthlyPriceCents: 1_200,
  annualPriceCents: 7_900,
  modeledAnnualShare: 0.5,
});

const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;

export const CANCELLATION_REASON_LABELS = Object.freeze({
  too_expensive: 'Too expensive',
  not_using_enough: 'Not using enough',
  missing_feature: 'Missing feature',
  technical_issue: 'Technical issue',
  temporary_break: 'Temporary break',
  plan_complete: 'Payoff plan complete',
  other: 'Other',
});

function cancellationReasonCounts(subscriptions, cutoff, scheduledOrCanceledOnly = false) {
  const counts = new Map();

  for (const subscription of subscriptions) {
    const reason = subscription.metadata?.cancel_intent_reason;
    if (!Object.hasOwn(CANCELLATION_REASON_LABELS, reason)) continue;

    const intentAt = Date.parse(subscription.metadata?.cancel_intent_at ?? '') / 1000;
    if (!Number.isFinite(intentAt) || intentAt < cutoff) continue;
    if (
      scheduledOrCanceledOnly &&
      subscription.status !== 'canceled' &&
      !subscription.cancel_at_period_end
    ) continue;

    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([reason, count]) => ({ reason, label: CANCELLATION_REASON_LABELS[reason], count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function amountFromPrice(price) {
  const raw = price?.unit_amount_decimal ?? price?.unit_amount ?? 0;
  const amount = Number(raw);
  return Number.isFinite(amount) ? amount : 0;
}

/** Convert one recurring Stripe price into its monthly recurring value. */
export function monthlyAmountCents(price, quantity = 1) {
  if (!price?.recurring) return 0;

  const amount = amountFromPrice(price) * Math.max(0, quantity || 0);
  const intervalCount = Math.max(1, price.recurring.interval_count || 1);

  switch (price.recurring.interval) {
    case 'month':
      return amount / intervalCount;
    case 'year':
      return amount / (12 * intervalCount);
    case 'week':
      return (amount * 52) / (12 * intervalCount);
    case 'day':
      return (amount * 365) / (12 * intervalCount);
    default:
      return 0;
  }
}

export function subscriptionMrrCents(subscription) {
  return (subscription?.items?.data ?? []).reduce(
    (total, item) => total + monthlyAmountCents(item.price, item.quantity ?? 1),
    0,
  );
}

function billingCadence(subscription) {
  const intervals = new Set(
    (subscription?.items?.data ?? [])
      .map((item) => item.price?.recurring?.interval)
      .filter(Boolean),
  );
  if (intervals.size !== 1) return 'other';
  if (intervals.has('month')) return 'monthly';
  if (intervals.has('year')) return 'annual';
  return 'other';
}

/** Build aggregate-only Stripe metrics. No customer or subscription IDs escape. */
export function summarizeStripeSubscriptions(subscriptions, nowSeconds = Math.floor(Date.now() / 1000)) {
  const active = subscriptions.filter((subscription) => subscription.status === 'active');
  const trialing = subscriptions.filter((subscription) => subscription.status === 'trialing');
  const pastDue = subscriptions.filter((subscription) => subscription.status === 'past_due');
  const cutoff = nowSeconds - THIRTY_DAYS_SECONDS;

  const activeMrrCents = active.reduce(
    (total, subscription) => total + subscriptionMrrCents(subscription),
    0,
  );
  const trialPipelineMrrCents = trialing.reduce(
    (total, subscription) => total + subscriptionMrrCents(subscription),
    0,
  );

  const cadence = { monthly: 0, annual: 0, other: 0 };
  const cohortCounts = new Map();
  for (const subscription of active) {
    cadence[billingCadence(subscription)] += 1;
    const mrrCents = subscriptionMrrCents(subscription);
    const key = mrrCents.toFixed(4);
    cohortCounts.set(key, (cohortCounts.get(key) ?? 0) + 1);
  }
  const mrrCohorts = [...cohortCounts.entries()]
    .map(([mrrCents, count]) => ({ mrrCents: Number(mrrCents), count }))
    .sort((a, b) => b.mrrCents - a.mrrCents);

  return {
    totalSubscriptions: subscriptions.length,
    activePaid: active.length,
    trialing: trialing.length,
    pastDue: pastDue.length,
    scheduledToCancel: active.filter((subscription) => subscription.cancel_at_period_end).length,
    startedLast30d: subscriptions.filter(
      (subscription) =>
        ['active', 'trialing'].includes(subscription.status) && subscription.created >= cutoff,
    ).length,
    canceledLast30d: subscriptions.filter(
      (subscription) =>
        subscription.status === 'canceled' && (subscription.ended_at ?? 0) >= cutoff,
    ).length,
    activeMrrCents,
    trialPipelineMrrCents,
    blendedMrrPerActiveCents: active.length > 0 ? activeMrrCents / active.length : 0,
    cadence,
    mrrCohorts,
    cancelIntentReasons30d: cancellationReasonCounts(subscriptions, cutoff),
    scheduledOrCanceledReasons30d: cancellationReasonCounts(subscriptions, cutoff, true),
  };
}

/**
 * Model whether one monthly/annual offer can satisfy the subscriber and MRR
 * targets together. Annual share is a decimal between 0 and 1.
 */
export function modelPricingScenario({
  monthlyPriceCents,
  annualPriceCents,
  annualShare,
  subscriberGoal = GROWTH_GOALS.activePro,
  mrrGoalCents = GROWTH_GOALS.mrrCents,
}) {
  if (!(monthlyPriceCents > 0) || !(annualPriceCents > 0)) {
    throw new Error('Monthly and annual prices must be positive.');
  }
  if (!(annualShare >= 0 && annualShare <= 1)) {
    throw new Error('Annual share must be between 0 and 1.');
  }

  const requiredBlendedMrrPerProCents = mrrGoalCents / subscriberGoal;
  const annualMrrPerProCents = annualPriceCents / 12;
  const modeledBlendedMrrPerProCents =
    monthlyPriceCents * (1 - annualShare) +
    annualMrrPerProCents * annualShare;
  const modeledMrrAtSubscriberGoalCents =
    modeledBlendedMrrPerProCents * subscriberGoal;

  let maximumAnnualShareForGoal = 1;
  if (annualMrrPerProCents < requiredBlendedMrrPerProCents) {
    maximumAnnualShareForGoal =
      monthlyPriceCents <= requiredBlendedMrrPerProCents
        ? 0
        : Math.max(
            0,
            Math.min(
              1,
              (monthlyPriceCents - requiredBlendedMrrPerProCents) /
                (monthlyPriceCents - annualMrrPerProCents),
            ),
          );
  }

  const annualPriceFloorAtModeledMixCents =
    annualShare === 0
      ? null
      : Math.max(
          0,
          ((requiredBlendedMrrPerProCents -
            monthlyPriceCents * (1 - annualShare)) /
            annualShare) *
            12,
        );

  return {
    subscriberGoal,
    mrrGoalCents,
    monthlyPriceCents,
    annualPriceCents,
    annualShare,
    annualMrrPerProCents,
    requiredBlendedMrrPerProCents,
    modeledBlendedMrrPerProCents,
    modeledMrrAtSubscriberGoalCents,
    modeledMrrGapAtSubscriberGoalCents: Math.max(
      0,
      mrrGoalCents - modeledMrrAtSubscriberGoalCents,
    ),
    maximumAnnualShareForGoal,
    annualPriceFloorAtModeledMixCents,
    annualPriceFloorAtAnyMixCents:
      requiredBlendedMrrPerProCents * 12,
    satisfiesBothGoals: modeledMrrAtSubscriberGoalCents >= mrrGoalCents,
  };
}

export function buildGoalProgress(stripeSummary, dbSummary) {
  const activePro = stripeSummary.activePaid;
  const mrrCents = stripeSummary.activeMrrCents;
  const requiredBlendedMrrPerProCents =
    GROWTH_GOALS.mrrCents / GROWTH_GOALS.activePro;
  const currentBlendedMrrPerProCents =
    activePro > 0 ? mrrCents / activePro : 0;
  const activeProRequiredAtCurrentBlended =
    currentBlendedMrrPerProCents > 0
      ? Math.ceil(GROWTH_GOALS.mrrCents / currentBlendedMrrPerProCents)
      : null;

  return {
    activePro,
    activeProGoal: GROWTH_GOALS.activePro,
    activeProGap: Math.max(0, GROWTH_GOALS.activePro - activePro),
    activeProProgressPct: (activePro / GROWTH_GOALS.activePro) * 100,
    mrrCents,
    mrrGoalCents: GROWTH_GOALS.mrrCents,
    mrrGapCents: Math.max(0, GROWTH_GOALS.mrrCents - mrrCents),
    mrrProgressPct: (mrrCents / GROWTH_GOALS.mrrCents) * 100,
    requiredBlendedMrrPerProCents,
    currentBlendedMrrPerProCents,
    blendedMrrPerProGapCents: Math.max(
      0,
      requiredBlendedMrrPerProCents - currentBlendedMrrPerProCents,
    ),
    projectedMrrAtActiveProGoalCents:
      currentBlendedMrrPerProCents * GROWTH_GOALS.activePro,
    activeProRequiredAtCurrentBlended,
    economicsAligned:
      currentBlendedMrrPerProCents >= requiredBlendedMrrPerProCents,
    dbActiveDifference: dbSummary.activePaid - activePro,
  };
}

export function dollars(cents) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function buildScorecardMarkdown(report) {
  const {
    stripeMode,
    databaseHost,
    generatedAt,
    database,
    stripe,
    goal,
    pricing,
    warnings,
  } = report;

  return [
    '# SnowballPay Growth Scorecard',
    '',
    `Generated: ${generatedAt}`,
    `Stripe mode: **${stripeMode}**`,
    `Database host: \`${databaseHost}\``,
    '',
    '## Goal progress',
    '',
    '| Metric | Current | Goal | Gap | Progress |',
    '| --- | ---: | ---: | ---: | ---: |',
    `| Active paid Pro | ${goal.activePro} | ${goal.activeProGoal} | ${goal.activeProGap} | ${goal.activeProProgressPct.toFixed(2)}% |`,
    `| Gross MRR | ${dollars(goal.mrrCents)} | ${dollars(goal.mrrGoalCents)} | ${dollars(goal.mrrGapCents)} | ${goal.mrrProgressPct.toFixed(2)}% |`,
    '',
    '## Target economics',
    '',
    '| Metric | Value |',
    '| --- | ---: |',
    `| Required blended MRR per Pro | ${dollars(goal.requiredBlendedMrrPerProCents)} |`,
    `| Current live blended MRR per Pro | ${dollars(goal.currentBlendedMrrPerProCents)} |`,
    `| Blended MRR per Pro gap | ${dollars(goal.blendedMrrPerProGapCents)} |`,
    `| MRR at 1,000 Pro using current live blend | ${dollars(goal.projectedMrrAtActiveProGoalCents)} |`,
    `| Pro required for ${dollars(goal.mrrGoalCents)} at current live blend | ${goal.activeProRequiredAtCurrentBlended ?? 'Not available'} |`,
    `| Do current live economics align both goals? | ${goal.economicsAligned ? 'Yes' : 'No'} |`,
    '',
    '## Offered pricing scenario',
    '',
    '| Metric | Value |',
    '| --- | ---: |',
    `| Monthly price | ${dollars(pricing.monthlyPriceCents)} |`,
    `| Annual price | ${dollars(pricing.annualPriceCents)} |`,
    `| Annual equivalent per month | ${dollars(pricing.annualMrrPerProCents)} |`,
    `| Modeled annual share | ${(pricing.annualShare * 100).toFixed(1)}% |`,
    `| Modeled blended MRR per Pro | ${dollars(pricing.modeledBlendedMrrPerProCents)} |`,
    `| Modeled MRR at 1,000 Pro | ${dollars(pricing.modeledMrrAtSubscriberGoalCents)} |`,
    `| MRR gap at 1,000 Pro | ${dollars(pricing.modeledMrrGapAtSubscriberGoalCents)} |`,
    `| Maximum annual share at this offer | ${(pricing.maximumAnnualShareForGoal * 100).toFixed(1)}% |`,
    `| Annual price floor at modeled mix | ${pricing.annualPriceFloorAtModeledMixCents === null ? 'Not applicable' : dollars(pricing.annualPriceFloorAtModeledMixCents)} |`,
    `| Annual price floor at any billing mix | ${dollars(pricing.annualPriceFloorAtAnyMixCents)} |`,
    `| Does modeled offer satisfy both goals? | ${pricing.satisfiesBothGoals ? 'Yes' : 'No'} |`,
    '',
    '## Stripe revenue',
    '',
    '| Metric | Value |',
    '| --- | ---: |',
    `| Active paid subscriptions | ${stripe.activePaid} |`,
    `| Trialing subscriptions | ${stripe.trialing} |`,
    `| Past due subscriptions | ${stripe.pastDue} |`,
    `| Scheduled to cancel | ${stripe.scheduledToCancel} |`,
    `| Starts in last 30 days | ${stripe.startedLast30d} |`,
    `| Cancellations in last 30 days | ${stripe.canceledLast30d} |`,
    `| Active MRR | ${dollars(stripe.activeMrrCents)} |`,
    `| Trial pipeline MRR | ${dollars(stripe.trialPipelineMrrCents)} |`,
    `| Blended MRR per active Pro | ${dollars(stripe.blendedMrrPerActiveCents)} |`,
    `| Monthly / annual / other | ${stripe.cadence.monthly} / ${stripe.cadence.annual} / ${stripe.cadence.other} |`,
    `| Active MRR cohorts | ${stripe.mrrCohorts.length ? stripe.mrrCohorts.map((cohort) => `${cohort.count} × ${dollars(cohort.mrrCents)}`).join(', ') : 'None'} |`,
    '',
    '## Cancellation signals',
    '',
    '| Signal | Reasons recorded in last 30 days |',
    '| --- | --- |',
    `| Cancellation intent | ${stripe.cancelIntentReasons30d.length ? stripe.cancelIntentReasons30d.map((item) => `${item.label}: ${item.count}`).join(', ') : 'None'} |`,
    `| Scheduled or completed cancellation | ${stripe.scheduledOrCanceledReasons30d.length ? stripe.scheduledOrCanceledReasons30d.map((item) => `${item.label}: ${item.count}`).join(', ') : 'None'} |`,
    '',
    '## Database funnel proxies',
    '',
    '| Metric | Value |',
    '| --- | ---: |',
    `| Users | ${database.users} |`,
    `| DB active paid | ${database.activePaid} |`,
    `| DB trialing | ${database.trialing} |`,
    `| New users in last 30 days | ${database.newUsers30d} |`,
    `| Calculator leads | ${database.calculatorLeads} |`,
    `| Users with debt and income | ${database.activatedProxy} |`,
    `| Users recording a payment in last 30 days | ${database.paymentActive30d} |`,
    '',
    '## Reconciliation',
    '',
    `Database active paid minus Stripe active paid: **${goal.dbActiveDifference}**`,
    '',
    ...(warnings.length
      ? ['## Warnings', '', ...warnings.map((warning) => `- ${warning}`), '']
      : ['No reconciliation warnings.', '']),
    'This command reports aggregates only. Canonical `plan_generated` activation and UTM attribution still come from PostHog.',
  ].join('\n');
}

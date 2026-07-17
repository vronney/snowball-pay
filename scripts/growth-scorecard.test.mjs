import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGoalProgress,
  modelPricingScenario,
  monthlyAmountCents,
  subscriptionMrrCents,
  summarizeStripeSubscriptions,
} from './growth-scorecard-lib.mjs';

function price(unitAmount, interval, intervalCount = 1) {
  return {
    unit_amount: unitAmount,
    recurring: { interval, interval_count: intervalCount },
  };
}

function subscription({ status = 'active', interval = 'month', amount = 1_200, ...rest } = {}) {
  return {
    status,
    created: 1_700_000_000,
    cancel_at_period_end: false,
    ended_at: null,
    items: { data: [{ price: price(amount, interval), quantity: 1 }] },
    ...rest,
  };
}

test('normalizes monthly, annual, and multi-month prices into MRR', () => {
  assert.equal(monthlyAmountCents(price(1_200, 'month')), 1_200);
  assert.equal(monthlyAmountCents(price(7_900, 'year')), 7_900 / 12);
  assert.equal(monthlyAmountCents(price(3_000, 'month', 3)), 1_000);
  assert.equal(monthlyAmountCents(price(1_200, 'month'), 2), 2_400);
});

test('sums all recurring items in a subscription', () => {
  const value = subscriptionMrrCents({
    items: {
      data: [
        { price: price(1_200, 'month'), quantity: 1 },
        { price: price(2_400, 'year'), quantity: 1 },
      ],
    },
  });
  assert.equal(value, 1_400);
});

test('summarizes paid MRR separately from trials and canceled subscriptions', () => {
  const now = 1_800_000_000;
  const summary = summarizeStripeSubscriptions(
    [
      subscription({ amount: 1_200 }),
      subscription({ amount: 7_900, interval: 'year', cancel_at_period_end: true }),
      subscription({ status: 'trialing', amount: 1_200 }),
      subscription({ status: 'past_due', amount: 1_200 }),
      subscription({ status: 'canceled', ended_at: now - 100 }),
    ],
    now,
  );

  assert.equal(summary.activePaid, 2);
  assert.equal(summary.trialing, 1);
  assert.equal(summary.pastDue, 1);
  assert.equal(summary.scheduledToCancel, 1);
  assert.equal(summary.canceledLast30d, 1);
  assert.equal(summary.cadence.monthly, 1);
  assert.equal(summary.cadence.annual, 1);
  assert.equal(summary.activeMrrCents, 1_200 + 7_900 / 12);
  assert.equal(summary.trialPipelineMrrCents, 1_200);
  assert.deepEqual(summary.mrrCohorts, [
    { mrrCents: 1_200, count: 1 },
    { mrrCents: Number((7_900 / 12).toFixed(4)), count: 1 },
  ]);
});

test('summarizes allowlisted cancellation reasons without exposing metadata values', () => {
  const now = 1_800_000_000;
  const recentIntent = new Date((now - 100) * 1000).toISOString();
  const oldIntent = new Date((now - 31 * 24 * 60 * 60) * 1000).toISOString();
  const summary = summarizeStripeSubscriptions(
    [
      subscription({
        cancel_at_period_end: true,
        metadata: { cancel_intent_reason: 'too_expensive', cancel_intent_at: recentIntent },
      }),
      subscription({
        status: 'canceled',
        ended_at: now - 50,
        metadata: { cancel_intent_reason: 'technical_issue', cancel_intent_at: recentIntent },
      }),
      subscription({
        metadata: { cancel_intent_reason: 'too_expensive', cancel_intent_at: recentIntent },
      }),
      subscription({
        metadata: { cancel_intent_reason: 'private free text', cancel_intent_at: recentIntent },
      }),
      subscription({
        metadata: { cancel_intent_reason: 'missing_feature', cancel_intent_at: oldIntent },
      }),
    ],
    now,
  );

  assert.deepEqual(summary.cancelIntentReasons30d, [
    { reason: 'too_expensive', label: 'Too expensive', count: 2 },
    { reason: 'technical_issue', label: 'Technical issue', count: 1 },
  ]);
  assert.deepEqual(summary.scheduledOrCanceledReasons30d, [
    { reason: 'technical_issue', label: 'Technical issue', count: 1 },
    { reason: 'too_expensive', label: 'Too expensive', count: 1 },
  ]);
});

test('calculates subscriber and MRR gaps from Stripe-authoritative values', () => {
  const goal = buildGoalProgress(
    { activePaid: 2, activeMrrCents: 2_400 },
    { activePaid: 3 },
  );

  assert.equal(goal.activeProGap, 998);
  assert.equal(goal.mrrGapCents, 997_600);
  assert.equal(goal.dbActiveDifference, 1);
  assert.equal(goal.requiredBlendedMrrPerProCents, 1_000);
  assert.equal(goal.currentBlendedMrrPerProCents, 1_200);
  assert.equal(goal.activeProRequiredAtCurrentBlended, 834);
  assert.equal(goal.projectedMrrAtActiveProGoalCents, 1_200_000);
  assert.equal(goal.economicsAligned, true);
});

test('shows that the current live $9 blend needs 1,112 Pro for $10K MRR', () => {
  const goal = buildGoalProgress(
    { activePaid: 2, activeMrrCents: 1_800 },
    { activePaid: 2 },
  );

  assert.equal(goal.currentBlendedMrrPerProCents, 900);
  assert.equal(goal.blendedMrrPerProGapCents, 100);
  assert.equal(goal.projectedMrrAtActiveProGoalCents, 900_000);
  assert.equal(goal.activeProRequiredAtCurrentBlended, 1_112);
  assert.equal(goal.economicsAligned, false);
});

test('models the current $12 monthly and $79 annual offer at a 50/50 mix', () => {
  const pricing = modelPricingScenario({
    monthlyPriceCents: 1_200,
    annualPriceCents: 7_900,
    annualShare: 0.5,
  });

  assert.ok(Math.abs(pricing.annualMrrPerProCents - 658.3333) < 0.01);
  assert.ok(Math.abs(pricing.modeledBlendedMrrPerProCents - 929.1667) < 0.01);
  assert.ok(Math.abs(pricing.modeledMrrAtSubscriberGoalCents - 929_166.67) < 0.1);
  assert.ok(Math.abs(pricing.maximumAnnualShareForGoal - 0.3692307) < 0.0001);
  assert.equal(pricing.annualPriceFloorAtModeledMixCents, 9_600);
  assert.equal(pricing.annualPriceFloorAtAnyMixCents, 12_000);
  assert.equal(pricing.satisfiesBothGoals, false);
});

test('shows which annual prices satisfy the goal at 50/50 and all-annual mixes', () => {
  const ninetyNineAtHalf = modelPricingScenario({
    monthlyPriceCents: 1_200,
    annualPriceCents: 9_900,
    annualShare: 0.5,
  });
  const oneTwentyAllAnnual = modelPricingScenario({
    monthlyPriceCents: 1_200,
    annualPriceCents: 12_000,
    annualShare: 1,
  });

  assert.equal(ninetyNineAtHalf.modeledMrrAtSubscriberGoalCents, 1_012_500);
  assert.equal(ninetyNineAtHalf.satisfiesBothGoals, true);
  assert.equal(oneTwentyAllAnnual.modeledMrrAtSubscriberGoalCents, 1_000_000);
  assert.equal(oneTwentyAllAnnual.satisfiesBothGoals, true);
});

test('rejects invalid pricing inputs', () => {
  assert.throws(
    () =>
      modelPricingScenario({
        monthlyPriceCents: 0,
        annualPriceCents: 7_900,
        annualShare: 0.5,
      }),
    /positive/,
  );
  assert.throws(
    () =>
      modelPricingScenario({
        monthlyPriceCents: 1_200,
        annualPriceCents: 7_900,
        annualShare: 1.1,
      }),
    /between 0 and 1/,
  );
});

#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import {
  buildGoalProgress,
  buildScorecardMarkdown,
  CURRENT_PRICING,
  modelPricingScenario,
  summarizeStripeSubscriptions,
} from './growth-scorecard-lib.mjs';

function option(name, fallback) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((value) => value.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const jsonOutput = process.argv.includes('--json');
const stripeMode = option('stripe-mode', 'test');
const monthlyPriceDollars = Number(
  option('monthly-price', CURRENT_PRICING.monthlyPriceCents / 100),
);
const annualPriceDollars = Number(
  option('annual-price', CURRENT_PRICING.annualPriceCents / 100),
);
const modeledAnnualShare = Number(
  option('annual-share', CURRENT_PRICING.modeledAnnualShare),
);

if (!['test', 'live'].includes(stripeMode)) {
  console.error('Use --stripe-mode test or --stripe-mode live.');
  process.exit(1);
}
if (
  !(monthlyPriceDollars > 0) ||
  !(annualPriceDollars > 0) ||
  !(modeledAnnualShare >= 0 && modeledAnnualShare <= 1)
) {
  console.error(
    'Use positive --monthly-price and --annual-price values, with --annual-share between 0 and 1.',
  );
  process.exit(1);
}

function firstEnvironmentValue(names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return null;
}

const stripeKey = firstEnvironmentValue(
  stripeMode === 'live'
    ? ['STRIPE_SECRET_KEY_LIVE', 'STRIPE_SECRET_KEY']
    : ['STRIPE_SECRET_KEY_TEST', 'STRIPE_SECRET_KEY'],
);

if (!stripeKey) {
  console.error(`No Stripe ${stripeMode} secret key is configured.`);
  process.exit(1);
}

const detectedStripeMode = /_(test|live)_/.exec(stripeKey)?.[1];
if (detectedStripeMode !== stripeMode) {
  console.error(
    `Refusing to run: --stripe-mode ${stripeMode} was requested, but the selected key is ${detectedStripeMode ?? 'unrecognized'}.`,
  );
  process.exit(1);
}

const databaseUrl = process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error('DIRECT_URL or DATABASE_URL is required.');
  process.exit(1);
}

const stripe = new Stripe(stripeKey, { apiVersion: '2026-03-25.dahlia' });
const prisma = new PrismaClient({ datasourceUrl: databaseUrl });

async function databaseSummary() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [users, activePaid, trialing, newUsers30d, calculatorLeads, activatedProxy, paymentActive30d] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { paidTier: 'pro', subscriptionStatus: 'active' } }),
      prisma.user.count({ where: { subscriptionStatus: 'trialing' } }),
      prisma.user.count({ where: { createdAt: { gte: since } } }),
      prisma.calculatorLead.count(),
      prisma.user.count({ where: { debts: { some: {} }, income: { isNot: null } } }),
      prisma.user.count({ where: { paymentRecords: { some: { paidAt: { gte: since } } } } }),
    ]);

  return { users, activePaid, trialing, newUsers30d, calculatorLeads, activatedProxy, paymentActive30d };
}

async function allStripeSubscriptions() {
  const subscriptions = [];
  for await (const subscription of stripe.subscriptions.list({ status: 'all', limit: 100 })) {
    subscriptions.push(subscription);
    if (subscriptions.length > 10_000) {
      throw new Error('Subscription safety limit exceeded. Add warehouse pagination before continuing.');
    }
  }
  return subscriptions;
}

try {
  const [database, subscriptions] = await Promise.all([
    databaseSummary(),
    allStripeSubscriptions(),
  ]);
  const stripeSummary = summarizeStripeSubscriptions(subscriptions);
  const goal = buildGoalProgress(stripeSummary, database);
  const pricing = modelPricingScenario({
    monthlyPriceCents: monthlyPriceDollars * 100,
    annualPriceCents: annualPriceDollars * 100,
    annualShare: modeledAnnualShare,
  });
  const warnings = [];

  if (goal.dbActiveDifference !== 0) {
    warnings.push(
      `Database and Stripe active-paid counts differ by ${goal.dbActiveDifference}. Reconcile webhooks and environment selection before using the count operationally.`,
    );
  }
  if (stripeSummary.activePaid > 0 && stripeSummary.blendedMrrPerActiveCents < 1_000) {
    warnings.push('Blended MRR per active Pro is below the $10 target required to reach $10K with 1,000 subscribers.');
  }
  if (!pricing.satisfiesBothGoals) {
    warnings.push(
      'The modeled monthly/annual offer mix does not reach $10K MRR at 1,000 active Pro subscribers.',
    );
  }
  if (stripeSummary.pastDue > 0) {
    warnings.push(`${stripeSummary.pastDue} subscription(s) are past due and excluded from active MRR.`);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    stripeMode,
    databaseHost: new URL(databaseUrl).host,
    database,
    stripe: stripeSummary,
    goal,
    pricing,
    warnings,
  };

  console.log(jsonOutput ? JSON.stringify(report, null, 2) : buildScorecardMarkdown(report));
} catch (error) {
  console.error(`Growth scorecard failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

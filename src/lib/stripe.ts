import Stripe from 'stripe';

let _stripe: Stripe | null = null;
let _stripeSecret: string | null = null;

type StripeMode = 'live' | 'test';

function readFirstEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

/**
 * Resolves Stripe mode for the current runtime:
 * - `STRIPE_ENV=live|test` explicitly overrides
 * - production defaults to `live`
 * - everything else defaults to `test`
 */
export function getStripeMode(): StripeMode {
  const explicit = process.env.STRIPE_ENV?.toLowerCase();
  if (explicit === 'live' || explicit === 'test') return explicit;
  return process.env.NODE_ENV === 'production' ? 'live' : 'test';
}

function getStripeSecretKey(mode = getStripeMode()): string {
  const key = mode === 'live'
    ? readFirstEnv('STRIPE_SECRET_KEY_LIVE', 'STRIPE_SECRET_KEY')
    : readFirstEnv('STRIPE_SECRET_KEY_TEST', 'STRIPE_SECRET_KEY');

  if (!key) {
    const expected = mode === 'live'
      ? 'STRIPE_SECRET_KEY_LIVE (or STRIPE_SECRET_KEY legacy fallback)'
      : 'STRIPE_SECRET_KEY_TEST (or STRIPE_SECRET_KEY fallback)';
    throw new Error(`Stripe secret key is not set for ${mode} mode. Expected ${expected}.`);
  }
  return key;
}

/**
 * Returns a singleton Stripe client.
 * Throws at request time if STRIPE_SECRET_KEY is missing (not at build time).
 */
export function getStripe(): Stripe {
  const secret = getStripeSecretKey();
  if (!_stripe || _stripeSecret !== secret) {
    _stripe = new Stripe(secret, {
      apiVersion: '2026-03-25.dahlia',
    });
    _stripeSecret = secret;
  }
  return _stripe;
}

export function getStripeProPriceId(mode = getStripeMode()): string {
  const priceId = mode === 'live'
    ? readFirstEnv('STRIPE_PRO_PRICE_ID_LIVE', 'STRIPE_PRO_PRICE_ID')
    : readFirstEnv('STRIPE_PRO_PRICE_ID_TEST', 'STRIPE_PRO_PRICE_ID');

  if (!priceId) {
    const expected = mode === 'live'
      ? 'STRIPE_PRO_PRICE_ID_LIVE (or STRIPE_PRO_PRICE_ID legacy fallback)'
      : 'STRIPE_PRO_PRICE_ID_TEST (or STRIPE_PRO_PRICE_ID fallback)';
    throw new Error(`Stripe price ID is not set for ${mode} mode. Expected ${expected}.`);
  }
  return priceId;
}

export function getStripeWebhookSecret(mode = getStripeMode()): string | null {
  return mode === 'live'
    ? readFirstEnv('STRIPE_WEBHOOK_SECRET_LIVE', 'STRIPE_WEBHOOK_SECRET') ?? null
    : readFirstEnv('STRIPE_WEBHOOK_SECRET_TEST', 'STRIPE_WEBHOOK_SECRET') ?? null;
}

export const PLANS = {
  free: {
    name: 'Free',
    debtLimit: 5,
    features: ['Up to 5 debts', 'Snowball & Avalanche', 'Basic progress tracking'],
  },
  pro: {
    name: 'Pro',
    price: 9,
    debtLimit: Infinity,
    features: [
      'Unlimited debts',
      'AI recommendations',
      'Document import (PDF/CSV)',
      'Advanced analytics',
      'Custom priority ordering',
      'Export payoff plan',
    ],
  },
} as const;

export type PaidTier = 'free' | 'pro';

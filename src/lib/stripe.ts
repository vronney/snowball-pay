import Stripe from 'stripe';

let _stripe: Stripe | null = null;

type StripeMode = 'live' | 'test';
type StripeEnvKey = 'secret' | 'price' | 'webhook';

const STRIPE_ENV_KEYS: Record<StripeMode, Record<StripeEnvKey, readonly string[]>> = {
  live: {
    secret: ['STRIPE_SECRET_KEY_LIVE', 'STRIPE_SECRET_KEY'],
    price: ['STRIPE_PRO_PRICE_ID_LIVE', 'STRIPE_PRICE_ID_LIVE', 'STRIPE_PRO_PRICE_ID', 'STRIPE_PRICE_ID'],
    webhook: ['STRIPE_WEBHOOK_SECRET_LIVE', 'STRIPE_WEBHOOK_SECRET'],
  },
  test: {
    secret: ['STRIPE_SECRET_KEY_TEST', 'STRIPE_SECRET_KEY'],
    price: ['STRIPE_PRO_PRICE_ID_TEST', 'STRIPE_PRICE_ID_TEST', 'STRIPE_PRO_PRICE_ID', 'STRIPE_PRICE_ID'],
    webhook: ['STRIPE_WEBHOOK_SECRET_TEST', 'STRIPE_WEBHOOK_SECRET'],
  },
};

const EXPECTED_SECRET: Record<StripeMode, string> = {
  live: 'STRIPE_SECRET_KEY_LIVE (or STRIPE_SECRET_KEY fallback)',
  test: 'STRIPE_SECRET_KEY_TEST (or STRIPE_SECRET_KEY fallback)',
};

const EXPECTED_PRICE: Record<StripeMode, string> = {
  live: 'STRIPE_PRO_PRICE_ID_LIVE / STRIPE_PRICE_ID_LIVE (or unsuffixed fallback)',
  test: 'STRIPE_PRO_PRICE_ID_TEST / STRIPE_PRICE_ID_TEST (or unsuffixed fallback)',
};

function readFirstEnv(names: readonly string[]): string | undefined {
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
  const key = readFirstEnv(STRIPE_ENV_KEYS[mode].secret);
  if (!key) {
    throw new Error(`Stripe secret key is not set for ${mode} mode. Expected ${EXPECTED_SECRET[mode]}.`);
  }
  return key;
}

/**
 * Returns a singleton Stripe client.
 * Throws at request time if STRIPE_SECRET_KEY is missing (not at build time).
 */
export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(getStripeSecretKey(), {
      apiVersion: '2026-03-25.dahlia',
    });
  }
  return _stripe;
}

export function getStripeProPriceId(mode = getStripeMode()): string {
  const priceId = readFirstEnv(STRIPE_ENV_KEYS[mode].price);
  if (!priceId) {
    throw new Error(`Stripe price ID is not set for ${mode} mode. Expected ${EXPECTED_PRICE[mode]}.`);
  }
  return priceId;
}

export function getStripeWebhookSecret(mode = getStripeMode()): string | null {
  return readFirstEnv(STRIPE_ENV_KEYS[mode].webhook) ?? null;
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

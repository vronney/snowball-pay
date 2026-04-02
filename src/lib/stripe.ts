import Stripe from 'stripe';

let _stripe: Stripe | null = null;

/**
 * Returns a singleton Stripe client.
 * Throws at request time if STRIPE_SECRET_KEY is missing (not at build time).
 */
export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-03-25.dahlia',
    });
  }
  return _stripe;
}

export const STRIPE_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID ?? '';

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

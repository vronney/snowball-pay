import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = process.env;

function clearStripeEnv() {
  delete process.env.STRIPE_ENV;
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_SECRET_KEY_TEST;
  delete process.env.STRIPE_SECRET_KEY_LIVE;
  delete process.env.STRIPE_PRO_PRICE_ID;
  delete process.env.STRIPE_PRO_PRICE_ID_TEST;
  delete process.env.STRIPE_PRO_PRICE_ID_LIVE;
  delete process.env.STRIPE_PRICE_ID;
  delete process.env.STRIPE_PRICE_ID_TEST;
  delete process.env.STRIPE_PRICE_ID_LIVE;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.STRIPE_WEBHOOK_SECRET_TEST;
  delete process.env.STRIPE_WEBHOOK_SECRET_LIVE;
}

describe('lib/stripe env selection', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    clearStripeEnv();
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('defaults to test mode outside production', async () => {
    process.env.NODE_ENV = 'development';
    process.env.STRIPE_SECRET_KEY_TEST = 'sk_test_123';
    process.env.STRIPE_PRO_PRICE_ID_TEST = 'price_test_123';
    process.env.STRIPE_WEBHOOK_SECRET_TEST = 'whsec_test_123';

    const stripe = await import('@/lib/stripe');

    expect(stripe.getStripeMode()).toBe('test');
    expect(stripe.getStripeProPriceId()).toBe('price_test_123');
    expect(stripe.getStripeWebhookSecret()).toBe('whsec_test_123');
    expect(() => stripe.getStripe()).not.toThrow();
  });

  it('defaults to live mode in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.STRIPE_SECRET_KEY_LIVE = 'sk_live_123';
    process.env.STRIPE_PRO_PRICE_ID_LIVE = 'price_live_123';
    process.env.STRIPE_WEBHOOK_SECRET_LIVE = 'whsec_live_123';

    const stripe = await import('@/lib/stripe');

    expect(stripe.getStripeMode()).toBe('live');
    expect(stripe.getStripeProPriceId()).toBe('price_live_123');
    expect(stripe.getStripeWebhookSecret()).toBe('whsec_live_123');
    expect(() => stripe.getStripe()).not.toThrow();
  });

  it('honors explicit STRIPE_ENV override', async () => {
    process.env.NODE_ENV = 'production';
    process.env.STRIPE_ENV = 'test';
    process.env.STRIPE_SECRET_KEY_TEST = 'sk_test_123';
    process.env.STRIPE_PRO_PRICE_ID_TEST = 'price_test_123';

    const stripe = await import('@/lib/stripe');

    expect(stripe.getStripeMode()).toBe('test');
    expect(stripe.getStripeProPriceId()).toBe('price_test_123');
    expect(() => stripe.getStripe()).not.toThrow();
  });

  it('falls back to legacy key names when mode-specific vars are absent', async () => {
    process.env.NODE_ENV = 'development';
    process.env.STRIPE_SECRET_KEY = 'sk_test_legacy';
    process.env.STRIPE_PRO_PRICE_ID = 'price_legacy';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_legacy';

    const stripe = await import('@/lib/stripe');

    expect(stripe.getStripeMode()).toBe('test');
    expect(stripe.getStripeProPriceId()).toBe('price_legacy');
    expect(stripe.getStripeWebhookSecret()).toBe('whsec_legacy');
    expect(() => stripe.getStripe()).not.toThrow();
  });

  it('accepts STRIPE_PRICE_ID legacy name as fallback', async () => {
    process.env.NODE_ENV = 'production';
    process.env.STRIPE_SECRET_KEY = 'sk_live_legacy';
    process.env.STRIPE_PRICE_ID = 'price_legacy_only';

    const stripe = await import('@/lib/stripe');

    expect(stripe.getStripeMode()).toBe('live');
    expect(stripe.getStripeProPriceId()).toBe('price_legacy_only');
    expect(() => stripe.getStripe()).not.toThrow();
  });

  it('throws clear errors when required key/price are missing for selected mode', async () => {
    process.env.NODE_ENV = 'production';
    process.env.STRIPE_ENV = 'live';

    const stripe = await import('@/lib/stripe');

    expect(() => stripe.getStripe()).toThrow(/Stripe secret key is not set for live mode/);
    expect(() => stripe.getStripeProPriceId()).toThrow(/Stripe price ID is not set for live mode/);
  });
});

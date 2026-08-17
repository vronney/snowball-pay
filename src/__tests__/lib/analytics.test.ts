import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const posthog = vi.hoisted(() => ({
  init: vi.fn(),
  capture: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
  set_config: vi.fn(),
  opt_in_capturing: vi.fn(),
  opt_out_capturing: vi.fn(),
}));

vi.mock('posthog-js', () => ({ default: posthog }));

describe('analytics client', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test');
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://analytics.example.com');
    vi.stubGlobal('window', {
      // The internal-host guard only lets the production site emit analytics.
      location: { hostname: 'getsnowballpay.com' },
      localStorage: {
        getItem: vi.fn(() => 'granted'),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('emits nothing from internal hosts (localhost, previews) without the dev override', async () => {
    vi.stubGlobal('window', {
      location: { hostname: 'localhost' },
      localStorage: { getItem: vi.fn(() => 'granted') },
    });
    const { track } = await import('@/lib/analytics');

    track('plan_generated');

    expect(posthog.init).not.toHaveBeenCalled();
    expect(posthog.capture).not.toHaveBeenCalled();
  });

  it('lets internal hosts emit when NEXT_PUBLIC_ANALYTICS_ALLOW_DEV is set', async () => {
    vi.stubEnv('NEXT_PUBLIC_ANALYTICS_ALLOW_DEV', 'true');
    vi.stubGlobal('window', {
      location: { hostname: 'localhost' },
      localStorage: { getItem: vi.fn(() => 'granted') },
    });
    const { track } = await import('@/lib/analytics');

    track('plan_generated');

    expect(posthog.init).toHaveBeenCalledTimes(1);
    expect(posthog.capture).toHaveBeenCalledWith('plan_generated', undefined);
  });

  it('initialises before events and identity, and only initialises once', async () => {
    const { identify, track } = await import('@/lib/analytics');

    track('signup_completed');
    identify('user-1', { is_authenticated: true });

    expect(posthog.init).toHaveBeenCalledTimes(1);
    expect(posthog.init).toHaveBeenCalledWith(
      'phc_test',
      expect.objectContaining({
        capture_pageview: false,
        mask_all_text: true,
        save_campaign_params: true,
        persistence: 'localStorage+cookie',
        disable_session_recording: false,
      }),
    );
    expect(posthog.identify).toHaveBeenCalledWith('user-1', {
      is_authenticated: true,
    });
    expect(posthog.capture).toHaveBeenCalledWith('signup_completed', undefined);
    expect(posthog.init.mock.invocationCallOrder[0]).toBeLessThan(
      posthog.capture.mock.invocationCallOrder[0],
    );
    expect(posthog.init.mock.invocationCallOrder[0]).toBeLessThan(
      posthog.identify.mock.invocationCallOrder[0],
    );
  });

  it('keeps analytics disabled when the public key is absent', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', '');
    const { identify, track } = await import('@/lib/analytics');

    identify('user-1');
    track('signup_completed');

    expect(posthog.init).not.toHaveBeenCalled();
    expect(posthog.identify).not.toHaveBeenCalled();
    expect(posthog.capture).not.toHaveBeenCalled();
  });

  it('captures cookieless anonymous events before a consent choice', async () => {
    vi.stubGlobal('window', {
      location: { hostname: 'getsnowballpay.com' },
      localStorage: {
        getItem: vi.fn(() => null),
      },
    });
    const { identify, track } = await import('@/lib/analytics');

    track('calculator_started');
    identify('user-1');

    expect(posthog.init).toHaveBeenCalledWith(
      'phc_test',
      expect.objectContaining({
        persistence: 'memory',
        disable_session_recording: true,
      }),
    );
    expect(posthog.capture).toHaveBeenCalledWith('calculator_started', undefined);
    expect(posthog.identify).not.toHaveBeenCalled();
  });

  it('upgrades the anonymous client in place when consent is granted', async () => {
    let consent: string | null = null;
    vi.stubGlobal('window', {
      location: { hostname: 'getsnowballpay.com' },
      localStorage: {
        getItem: vi.fn(() => consent),
      },
    });
    const { track } = await import('@/lib/analytics');

    track('calculator_started');
    consent = 'granted';
    track('plan_generated');

    expect(posthog.init).toHaveBeenCalledTimes(1);
    expect(posthog.set_config).toHaveBeenCalledWith({
      persistence: 'localStorage+cookie',
      disable_session_recording: false,
    });
    expect(posthog.capture).toHaveBeenLastCalledWith('plan_generated', undefined);
  });

  it('keeps analytics disabled after consent is denied', async () => {
    vi.stubGlobal('window', {
      location: { hostname: 'getsnowballpay.com' },
      localStorage: {
        getItem: vi.fn(() => 'denied'),
      },
    });
    const { identify, track } = await import('@/lib/analytics');

    identify('user-1');
    track('signup_completed');

    expect(posthog.init).not.toHaveBeenCalled();
    expect(posthog.identify).not.toHaveBeenCalled();
    expect(posthog.capture).not.toHaveBeenCalled();
  });

  it('opts back in when a visitor grants consent after previously revoking it', async () => {
    let consent = 'granted';
    vi.stubGlobal('window', {
      location: { hostname: 'getsnowballpay.com' },
      localStorage: {
        getItem: vi.fn(() => consent),
      },
    });
    const { disableAnalytics, track } = await import('@/lib/analytics');

    track('signup_completed');
    consent = 'denied';
    disableAnalytics();
    consent = 'granted';
    track('plan_generated');

    expect(posthog.opt_out_capturing).toHaveBeenCalledOnce();
    expect(posthog.opt_in_capturing).toHaveBeenCalledOnce();
    expect(posthog.capture).toHaveBeenLastCalledWith(
      'plan_generated',
      undefined,
    );
  });
});

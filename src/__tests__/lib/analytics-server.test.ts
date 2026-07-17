import { afterEach, describe, expect, it, vi } from 'vitest';
import { captureServerEvent } from '@/lib/analytics-server';

describe('server analytics', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('bounds a stalled capture request without failing the caller', async () => {
    vi.useFakeTimers();
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test');
    const fetchMock = vi.fn(
      (_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const capture = captureServerEvent({
      consent: 'granted',
      distinctId: 'user-1',
      event: 'subscription_started',
    });
    await vi.advanceTimersByTimeAsync(1_500);

    await expect(capture).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });

  it('sanitises properties without allowing reserved IDs to be overridden', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test');
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await captureServerEvent({
      consent: 'granted',
      distinctId: 'user-1',
      event: 'subscription_started',
      insertId: 'evt_1',
      properties: {
        balance: 12_000,
        $current_url: 'https://getsnowballpay.com/dashboard?balance=12000',
        distinct_id: 'spoofed-user',
        $insert_id: 'spoofed-event',
      },
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.properties).toEqual({
      balance: '[redacted]',
      $current_url: 'https://getsnowballpay.com/dashboard',
      distinct_id: 'user-1',
      $insert_id: 'evt_1',
    });
  });

  it('does not call PostHog when server-side consent is denied', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await captureServerEvent({
      consent: 'denied',
      distinctId: 'user-1',
      event: 'subscription_started',
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

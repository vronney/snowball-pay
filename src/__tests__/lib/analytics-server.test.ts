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
      distinctId: 'user-1',
      event: 'subscription_started',
    });
    await vi.advanceTimersByTimeAsync(1_500);

    await expect(capture).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });
});

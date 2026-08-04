import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ensureUserProvisioned } from '@/lib/auth-server';
import { captureServerEvent } from '@/lib/analytics-server';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: { user: { upsert: vi.fn(), findUnique: vi.fn(), update: vi.fn() } },
}));
vi.mock('@/lib/analytics-server', () => ({ captureServerEvent: vi.fn() }));
vi.mock('@/lib/auth0', () => ({ auth0: { getSession: vi.fn() } }));

const mockCookieValue = vi.hoisted(() => ({ value: 'granted' as string | null }));
vi.mock('next/headers', () => ({
  cookies: () => ({
    get: () =>
      mockCookieValue.value === null ? undefined : { value: mockCookieValue.value },
  }),
}));

const SESSION_USER = { sub: 'auth0|abc', email: 'a@b.com', name: 'A' };

describe('ensureUserProvisioned account_created capture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieValue.value = 'granted';
  });

  it('fires account_created for a freshly created row', async () => {
    vi.mocked(prisma.user.upsert).mockResolvedValue({
      id: 'user-1',
      email: 'a@b.com',
      createdAt: new Date(),
    } as never);

    const user = await ensureUserProvisioned(SESSION_USER);

    expect(user).toEqual({ id: 'user-1', email: 'a@b.com', isNew: true });
    expect(captureServerEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        consent: 'granted',
        distinctId: 'user-1',
        event: 'account_created',
        insertId: 'account_created:user-1',
      }),
    );
  });

  it('does not fire for an existing row (old createdAt)', async () => {
    vi.mocked(prisma.user.upsert).mockResolvedValue({
      id: 'user-1',
      email: 'a@b.com',
      createdAt: new Date(Date.now() - 60_000),
    } as never);

    await ensureUserProvisioned(SESSION_USER);

    expect(captureServerEvent).not.toHaveBeenCalled();
  });

  it('passes denied consent through when the cookie is not granted', async () => {
    mockCookieValue.value = 'denied';
    vi.mocked(prisma.user.upsert).mockResolvedValue({
      id: 'user-1',
      email: 'a@b.com',
      createdAt: new Date(),
    } as never);

    await ensureUserProvisioned(SESSION_USER);

    expect(captureServerEvent).toHaveBeenCalledWith(
      expect.objectContaining({ consent: 'denied', event: 'account_created' }),
    );
  });
});

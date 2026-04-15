import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: { next: vi.fn(), json: vi.fn() },
  NextRequest: vi.fn(),
}));

describe('getAllowedOrigin', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('uses APP_BASE_URL when set', async () => {
    vi.stubEnv('APP_BASE_URL', 'https://myapp.com');
    vi.stubEnv('NODE_ENV', 'production');

    const { getAllowedOrigin } = await import('@/lib/corsOrigin');
    const mockRequest = { nextUrl: { origin: 'https://evil.com' } } as any;

    expect(getAllowedOrigin(mockRequest)).toBe('https://myapp.com');
  });

  it('throws in production when APP_BASE_URL is not set', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('APP_BASE_URL', '');

    const { getAllowedOrigin } = await import('@/lib/corsOrigin');
    const mockRequest = { nextUrl: { origin: 'https://evil.com' } } as any;

    expect(() => getAllowedOrigin(mockRequest)).toThrow('APP_BASE_URL must be set');
  });

  it('falls back to request origin in development when APP_BASE_URL is not set', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('APP_BASE_URL', '');

    const { getAllowedOrigin } = await import('@/lib/corsOrigin');
    const mockRequest = { nextUrl: { origin: 'http://localhost:3000' } } as any;

    expect(getAllowedOrigin(mockRequest)).toBe('http://localhost:3000');
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: { next: vi.fn(), json: vi.fn() },
  NextRequest: vi.fn(),
}));

vi.mock('@auth0/nextjs-auth0/server', () => ({
  Auth0Client: vi.fn().mockImplementation(function Auth0Client() {
    return {
      middleware: vi.fn(),
      getSession: vi.fn(),
    };
  }),
}));

describe('isScannerPath', () => {
  it('blocks direct and nested env file probes', async () => {
    const { isScannerPath } = await import('@/middleware');

    expect(isScannerPath('/.env')).toBe(true);
    expect(isScannerPath('/admin/.env')).toBe(true);
    expect(isScannerPath('/backend/.env.local')).toBe(true);
    expect(isScannerPath('/core/%2Eenv')).toBe(true);
  });

  it('blocks nested sensitive config probes without blocking well-known routes', async () => {
    const { isScannerPath } = await import('@/middleware');

    expect(isScannerPath('/wordpress/wp-config.php')).toBe(true);
    expect(isScannerPath('/uploads/.git/config')).toBe(true);
    expect(isScannerPath('/.well-known/traffic-advice')).toBe(false);
  });
});

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

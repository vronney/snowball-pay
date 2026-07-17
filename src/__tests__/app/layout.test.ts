import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('root layout analytics scripts', () => {
  it('defaults Google consent to denied and defers the network loader', () => {
    const source = readFileSync(
      fileURLToPath(new URL('../../app/layout.tsx', import.meta.url)),
      'utf8',
    );
    const bootstrapStart = source.indexOf(
      '<Script id="google-ads" strategy="beforeInteractive">',
    );
    const bootstrapEnd = source.indexOf('</Script>', bootstrapStart);
    const bootstrap = source.slice(bootstrapStart, bootstrapEnd);

    expect(bootstrapStart).toBeGreaterThan(-1);
    expect(bootstrapEnd).toBeGreaterThan(bootstrapStart);
    expect(bootstrap).toContain("window.gtag('consent', 'default'");
    expect(bootstrap).toContain("ad_storage: 'denied'");
    expect(bootstrap).toContain("analytics_storage: 'denied'");
    expect(bootstrap).toContain("ad_user_data: 'denied'");
    expect(source).not.toContain(
      'src="https://www.googletagmanager.com/gtag/js',
    );
  });
});

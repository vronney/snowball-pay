import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('root layout analytics scripts', () => {
  it('queues Google Ads configuration before hydration can emit conversions', () => {
    const source = readFileSync(
      fileURLToPath(new URL('../../app/layout.tsx', import.meta.url)),
      'utf8',
    );
    const bootstrapStart = source.indexOf(
      '<Script id="google-ads" strategy="beforeInteractive">',
    );
    const bootstrapEnd = source.indexOf('</Script>', bootstrapStart);
    const loaderStart = source.indexOf('https://www.googletagmanager.com/gtag/js');
    const bootstrap = source.slice(bootstrapStart, bootstrapEnd);
    const jsStart = bootstrap.indexOf("gtag('js'");
    const configStart = bootstrap.indexOf("gtag('config'");

    expect(bootstrapStart).toBeGreaterThan(-1);
    expect(bootstrapEnd).toBeGreaterThan(bootstrapStart);
    expect(loaderStart).toBeGreaterThan(bootstrapEnd);
    expect(jsStart).toBeGreaterThan(-1);
    expect(configStart).toBeGreaterThan(jsStart);
  });
});

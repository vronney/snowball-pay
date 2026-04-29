/**
 * GET /api/og/debt-payoff
 *
 * Generates a "Debt Paid Off" shareable card PNG.
 * Edge-safe: no Prisma, no Node.js-only imports.
 * All data is passed as URL query params from the client.
 *
 * Query params:
 *   name    - debt name (truncated to 25 chars server-side)
 *   paid    - total amount paid in dollars, e.g. "4200"
 *   months  - months it took, e.g. "14"
 *   msg     - Claude celebration message (truncated to 120 chars server-side)
 *
 * Rate limit: 10 renders/IP/hour via Upstash (unauthenticated).
 */

import { ImageResponse } from '@vercel/og';
import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const runtime = 'edge';

// ── Rate limiting ─────────────────────────────────────────────────────────────

function makeRatelimit() {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(10, '3600 s'),
    prefix: 'rl',
  });
}

const ratelimit = makeRatelimit();

// ── Helpers ───────────────────────────────────────────────────────────────────

function trunc(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '…' : s;
}

function fmtUSD(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(n);
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // IP rate limiting
  if (ratelimit) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const { success } = await ratelimit.limit(`og-card-ip:${ip}`);
    if (!success) {
      return new NextResponse('Too Many Requests', { status: 429 });
    }
  }

  const { searchParams } = request.nextUrl;

  const rawName   = searchParams.get('name')   ?? 'Your Debt';
  const rawMsg    = searchParams.get('msg')    ?? '';
  const paidCents = parseInt(searchParams.get('paid')   ?? '0', 10);
  const months    = parseInt(searchParams.get('months') ?? '0', 10);

  const name = trunc(rawName, 25);
  const msg  = trunc(rawMsg, 120);
  const paid = fmtUSD(isNaN(paidCents) ? 0 : paidCents);

  const yearsLabel = months > 0
    ? months >= 12
      ? `${Math.floor(months / 12)}y ${months % 12 > 0 ? `${months % 12}m` : ''}`.trim()
      : `${months}m`
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          padding: '48px 56px 40px',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative green glow — bottom right */}
        <div
          style={{
            position: 'absolute',
            bottom: '-80px',
            right: '-60px',
            width: '420px',
            height: '420px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16,185,129,0.18) 0%, rgba(16,185,129,0) 70%)',
          }}
        />

        {/* Top section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
          {/* Branding */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '28px' }}>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              · SnowballPay
            </span>
          </div>

          {/* Debt Free tag */}
          <div style={{ display: 'flex', marginBottom: '16px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#10b981',
                background: 'rgba(16,185,129,0.15)',
                border: '1px solid rgba(16,185,129,0.3)',
                borderRadius: '6px',
                padding: '5px 12px',
              }}
            >
              ✓ Debt Free
            </span>
          </div>

          {/* Debt name */}
          <div
            style={{
              fontSize: '72px',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-0.03em',
              lineHeight: 1,
              marginBottom: '24px',
            }}
          >
            {name}
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '28px' }}>
            <span style={{ fontSize: '28px', fontWeight: 700, color: '#10b981' }}>
              {paid} paid
            </span>
            {yearsLabel && (
              <>
                <span style={{ fontSize: '24px', color: 'rgba(255,255,255,0.2)' }}>·</span>
                <span style={{ fontSize: '28px', fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>
                  {yearsLabel}
                </span>
              </>
            )}
            <span style={{ fontSize: '24px', color: 'rgba(255,255,255,0.2)' }}>·</span>
            <span style={{ fontSize: '28px', fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>
              100% cleared
            </span>
          </div>

          {/* Claude message */}
          {msg && (
            <div
              style={{
                fontSize: '18px',
                fontStyle: 'italic',
                color: 'rgba(255,255,255,0.55)',
                maxWidth: '480px',
                lineHeight: 1.55,
              }}
            >
              &ldquo;{msg}&rdquo;
            </div>
          )}
        </div>

        {/* Bottom row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)' }}>
            Track your debt-free journey
          </span>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.04em' }}>
            snowballpay.app
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}

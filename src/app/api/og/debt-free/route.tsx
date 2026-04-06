/**
 * GET /api/og/debt-free
 *
 * Generates a debt-free card PNG suitable for embedding in emails or OG tags.
 *
 * Query params:
 *   date     - e.g. "March 2027"
 *   interest - interest saved in dollars, e.g. "12400"
 *   months   - months remaining, e.g. "36"
 *   total    - total debt in dollars, e.g. "41500" (optional)
 */

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const date     = searchParams.get('date')     ?? 'Your debt-free date';
  const interest = parseInt(searchParams.get('interest') ?? '0', 10);
  const months   = parseInt(searchParams.get('months')   ?? '0', 10);
  const total    = parseInt(searchParams.get('total')    ?? '0', 10);

  const yearsLeft = Math.floor(months / 12);
  const moLeft    = months % 12;
  const timeLabel = yearsLeft > 0
    ? `${yearsLeft}y ${moLeft > 0 ? `${moLeft}m` : ''}`
    : `${moLeft}m`;

  function fmt(n: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD', maximumFractionDigits: 0,
    }).format(n);
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)',
          padding: '36px 48px 28px',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div
            style={{
              width: '36px', height: '36px', borderRadius: '8px',
              background: 'rgba(37,99,235,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px',
            }}
          >
            🎯
          </div>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            SnowballPay
          </span>
        </div>

        {/* Main message */}
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '24px' }}>
          <span style={{ fontSize: '18px', color: 'rgba(255,255,255,0.55)', fontWeight: 500, marginBottom: '6px' }}>
            I&apos;m on track to be
          </span>
          <span style={{ fontSize: '52px', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: '4px' }}>
            Debt-Free
          </span>
          <span style={{ fontSize: '40px', fontWeight: 800, color: '#60a5fa', letterSpacing: '-0.03em' }}>
            by {date}
          </span>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '16px' }}>
          <div
            style={{
              flex: 1, background: 'rgba(255,255,255,0.07)', borderRadius: '14px',
              padding: '14px 18px', border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex', flexDirection: 'column',
            }}
          >
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: '6px' }}>
              Interest saved
            </span>
            <span style={{ fontSize: '26px', fontWeight: 900, color: '#34d399', letterSpacing: '-0.03em' }}>
              {fmt(interest)}
            </span>
          </div>

          <div
            style={{
              flex: 1, background: 'rgba(255,255,255,0.07)', borderRadius: '14px',
              padding: '14px 18px', border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex', flexDirection: 'column',
            }}
          >
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: '6px' }}>
              Time to freedom
            </span>
            <span style={{ fontSize: '26px', fontWeight: 900, color: '#a78bfa', letterSpacing: '-0.03em' }}>
              {timeLabel}
            </span>
          </div>

          {total > 0 && (
            <div
              style={{
                flex: 1, background: 'rgba(255,255,255,0.07)', borderRadius: '14px',
                padding: '14px 18px', border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex', flexDirection: 'column',
              }}
            >
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: '6px' }}>
                Total debt
              </span>
              <span style={{ fontSize: '26px', fontWeight: 900, color: '#f9a8d4', letterSpacing: '-0.03em' }}>
                ${Math.round(total / 1000)}k
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>
            getsnowballpay.com — free debt payoff planner
          </span>
        </div>
      </div>
    ),
    {
      width: 800,
      height: 420,
    },
  );
}

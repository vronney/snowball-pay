import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Free Debt Payoff Calculator — Snowball & Avalanche | SnowballPay';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: '#0f172a',
          fontFamily: 'sans-serif',
          padding: '70px 80px',
          position: 'relative',
        }}
      >
        {/* Gradient accent */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(37,99,235,0.2) 0%, transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: '300px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)',
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
          {/* Top: brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              SnowballPay
            </span>
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '14px' }}>•</span>
            <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em' }}>
              FREE CALCULATOR
            </span>
          </div>

          {/* Middle: headline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '64px', fontWeight: 900, color: '#ffffff', lineHeight: 1, letterSpacing: '-0.04em' }}>
              When will you be
            </span>
            <span style={{ fontSize: '64px', fontWeight: 900, color: '#34d399', lineHeight: 1, letterSpacing: '-0.04em' }}>
              debt-free?
            </span>
            <span style={{ fontSize: '22px', color: '#94a3b8', marginTop: '8px', maxWidth: '580px', lineHeight: 1.4 }}>
              Enter your balances and see your exact payoff date — Snowball vs Avalanche, side by side.
            </span>
          </div>

          {/* Bottom: stats pills */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {[
              { label: 'Payoff date', value: 'Exact month & year' },
              { label: 'Interest saved', value: 'Total savings' },
              { label: 'No signup', value: 'Instant results' },
            ].map(({ label, value }) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '14px 20px',
                }}
              >
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                  {label}
                </span>
                <span style={{ fontSize: '16px', color: '#60a5fa', fontWeight: 700 }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}

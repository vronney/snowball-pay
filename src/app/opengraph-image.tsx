import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'SnowballPay — Debt Snowball & Avalanche Planner';
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
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          background: '#0f172a',
          padding: '80px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
            }}
          >
            <span>❄️</span>
          </div>
          <span style={{ fontSize: '28px', fontWeight: 700, color: '#ffffff' }}>SnowballPay</span>
        </div>

        {/* Headline */}
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '24px' }}>
          <span style={{ fontSize: '72px', fontWeight: 900, color: '#ffffff', lineHeight: 1.1, letterSpacing: '-0.04em' }}>
            Eliminate Debt.
          </span>
          <span style={{ fontSize: '72px', fontWeight: 900, color: '#3b82f6', lineHeight: 1.1, letterSpacing: '-0.04em' }}>
            Build Financial Freedom.
          </span>
        </div>

        {/* Subheading */}
        <div style={{ display: 'flex' }}>
          <span style={{ fontSize: '24px', color: '#94a3b8', lineHeight: 1.5, maxWidth: '680px' }}>
            The proven Debt Snowball and Avalanche planner — track every balance and reach debt-free faster.
          </span>
        </div>

        {/* Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginTop: '40px',
            padding: '12px 22px',
            borderRadius: '999px',
            background: 'rgba(37,99,235,0.15)',
            border: '1px solid rgba(59,130,246,0.3)',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#10b981',
              display: 'flex',
            }}
          />
          <span style={{ fontSize: '18px', color: '#60a5fa', fontWeight: 600 }}>
            Free to start — No credit card needed
          </span>
        </div>
      </div>
    ),
    size,
  );
}

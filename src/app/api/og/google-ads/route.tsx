/**
 * GET /api/og/google-ads
 *
 * Generates Google Ads image assets at all required dimensions.
 * Edge-safe: no Prisma, no Node.js-only imports.
 *
 * Query params:
 *   size     - "landscape" (1200×628) | "square" (1200×1200) | "portrait" (960×1200)
 *              | "logo-square" (1200×1200) | "logo-landscape" (1200×300)
 *              Defaults to "landscape".
 *
 *   variant  - "awareness" | "intent" | "retargeting"
 *              Defaults to "awareness".
 *
 * Examples:
 *   /api/og/google-ads?size=landscape&variant=awareness
 *   /api/og/google-ads?size=square&variant=intent
 *   /api/og/google-ads?size=portrait&variant=retargeting
 *   /api/og/google-ads?size=logo-square
 *   /api/og/google-ads?size=logo-landscape
 */

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// ── Dimensions ────────────────────────────────────────────────────────────────

const SIZES = {
  landscape:        { w: 1200, h:  628 },
  square:           { w: 1200, h: 1200 },
  portrait:         { w:  960, h: 1200 },
  'logo-square':    { w: 1200, h: 1200 },
  'logo-landscape': { w: 1200, h:  300 },
} as const;

type Size = keyof typeof SIZES;

// ── Copy variants ─────────────────────────────────────────────────────────────

const VARIANTS = {
  awareness: {
    eyebrow:   'Debt payoff planner',
    headline:  'Know what to pay next — and when you\'ll be debt-free.',
    sub:       'Snowball or avalanche, SnowballPay builds your plan and tracks every payment.',
    cta:       'Start Free →',
    stat1l:    'Debt-free date',
    stat1v:    'Oct 2027',
    stat2l:    'Interest saved',
    stat2v:    '$4,180',
    stat3l:    'Free forever',
    stat3v:    'No card needed',
  },
  intent: {
    eyebrow:   'Free debt payoff calculator',
    headline:  'See your debt-free date in under 2 minutes.',
    sub:       'Add your balances, pick a strategy, and get a full month-by-month payoff schedule.',
    cta:       'Try the Calculator →',
    stat1l:    'No signup required',
    stat1v:    'Try free',
    stat2l:    'Supports',
    stat2v:    'Snowball + Avalanche',
    stat3l:    'Result',
    stat3v:    'Exact payoff date',
  },
  retargeting: {
    eyebrow:   'Your plan is ready',
    headline:  'Finish your debt payoff plan — it takes 2 minutes.',
    sub:       'You\'re close. Add your debts and see exactly when you\'ll be debt-free.',
    cta:       'Finish My Plan →',
    stat1l:    'Where you left off',
    stat1v:    'Add debts',
    stat2l:    'Next step',
    stat2v:    'See your date',
    stat3l:    'Cost',
    stat3v:    'Free',
  },
} as const;

type Variant = keyof typeof VARIANTS;

// ── Brand colors ──────────────────────────────────────────────────────────────

const C = {
  bg:        '#0f172a',
  bgMid:     '#1e3a5f',
  blue:      '#2563eb',
  blueLight: '#60a5fa',
  bluePale:  'rgba(37,99,235,0.18)',
  blueBorder:'rgba(37,99,235,0.35)',
  green:     '#10b981',
  greenPale: 'rgba(16,185,129,0.15)',
  white:     '#ffffff',
  muted:     'rgba(255,255,255,0.55)',
  faint:     'rgba(255,255,255,0.22)',
  card:      'rgba(255,255,255,0.07)',
  cardBorder:'rgba(255,255,255,0.12)',
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function Branding({ size = 13 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div
        style={{
          width: `${size * 2.4}px`,
          height: `${size * 2.4}px`,
          borderRadius: '6px',
          background: C.blue,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: `${size * 1.1}px`,
          fontWeight: 900,
          color: C.white,
        }}
      >
        S
      </div>
      <span
        style={{
          fontSize: `${size}px`,
          fontWeight: 700,
          color: C.muted,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        SnowballPay
      </span>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent = C.blueLight,
  flex = 1,
  fontSize = 26,
}: {
  label: string;
  value: string;
  accent?: string;
  flex?: number;
  fontSize?: number;
}) {
  return (
    <div
      style={{
        flex,
        background: C.card,
        borderRadius: '14px',
        padding: '14px 18px',
        border: `1px solid ${C.cardBorder}`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <span
        style={{
          fontSize: '10px',
          color: C.faint,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          fontWeight: 700,
          marginBottom: '6px',
        }}
      >
        {label}
      </span>
      <span
        style={{ fontSize: `${fontSize}px`, fontWeight: 900, color: accent, letterSpacing: '-0.03em' }}
      >
        {value}
      </span>
    </div>
  );
}

function EyebrowTag({ text, fontSize = 12 }: { text: string; fontSize?: number }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: `${fontSize}px`,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: C.blueLight,
        background: C.bluePale,
        border: `1px solid ${C.blueBorder}`,
        borderRadius: '8px',
        padding: '5px 12px',
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: C.blue,
          display: 'inline-block',
        }}
      />
      {text}
    </div>
  );
}

function CTABadge({ text, fontSize = 15 }: { text: string; fontSize?: number }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: `${fontSize}px`,
        fontWeight: 800,
        color: C.white,
        background: C.blue,
        borderRadius: '10px',
        padding: '10px 22px',
      }}
    >
      {text}
    </div>
  );
}

// ── Layouts ───────────────────────────────────────────────────────────────────

function LandscapeLayout({ v }: { v: typeof VARIANTS[Variant] }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        background: `linear-gradient(135deg, ${C.bg} 0%, ${C.bgMid} 60%, ${C.bg} 100%)`,
        padding: '52px 60px',
        fontFamily: 'sans-serif',
        position: 'relative',
        overflow: 'hidden',
        gap: '56px',
        alignItems: 'center',
      }}
    >
      {/* Glow */}
      <div
        style={{
          position: 'absolute',
          top: '-100px',
          right: '-80px',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,99,235,0.14) 0%, transparent 70%)',
        }}
      />

      {/* Left — copy */}
      <div style={{ flex: '1 1 560px', display: 'flex', flexDirection: 'column', gap: '0', zIndex: 1 }}>
        <div style={{ display: 'flex', marginBottom: '22px' }}>
          <EyebrowTag text={v.eyebrow} />
        </div>
        <div
          style={{
            fontSize: '46px',
            fontWeight: 900,
            color: C.white,
            letterSpacing: '-0.035em',
            lineHeight: 1.05,
            marginBottom: '18px',
          }}
        >
          {v.headline}
        </div>
        <div
          style={{
            fontSize: '16px',
            color: C.muted,
            lineHeight: 1.6,
            marginBottom: '28px',
            maxWidth: '480px',
          }}
        >
          {v.sub}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <CTABadge text={v.cta} />
          <span style={{ fontSize: '13px', color: C.faint }}>Free · No credit card</span>
        </div>
      </div>

      {/* Right — stat cards */}
      <div style={{ flex: '0 0 320px', display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 1 }}>
        <Branding size={13} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
          <StatCard label={v.stat1l} value={v.stat1v} accent={C.blueLight} />
          <StatCard label={v.stat2l} value={v.stat2v} accent={C.green} />
          <StatCard label={v.stat3l} value={v.stat3v} accent='rgba(255,255,255,0.8)' />
        </div>
      </div>
    </div>
  );
}

function SquareLayout({ v }: { v: typeof VARIANTS[Variant] }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(160deg, ${C.bg} 0%, ${C.bgMid} 55%, ${C.bg} 100%)`,
        padding: '72px 80px',
        fontFamily: 'sans-serif',
        position: 'relative',
        overflow: 'hidden',
        justifyContent: 'space-between',
      }}
    >
      {/* Glow top-right */}
      <div
        style={{
          position: 'absolute',
          top: '-120px',
          right: '-100px',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)',
        }}
      />
      {/* Glow bottom-left */}
      <div
        style={{
          position: 'absolute',
          bottom: '-100px',
          left: '-80px',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)',
        }}
      />

      {/* Top */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0', zIndex: 1 }}>
        <div style={{ display: 'flex', marginBottom: '32px' }}>
          <EyebrowTag text={v.eyebrow} fontSize={13} />
        </div>
        <div
          style={{
            fontSize: '66px',
            fontWeight: 900,
            color: C.white,
            letterSpacing: '-0.04em',
            lineHeight: 1.0,
            marginBottom: '24px',
          }}
        >
          {v.headline}
        </div>
        <div
          style={{
            fontSize: '20px',
            color: C.muted,
            lineHeight: 1.65,
            maxWidth: '820px',
          }}
        >
          {v.sub}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '16px', zIndex: 1 }}>
        <StatCard label={v.stat1l} value={v.stat1v} accent={C.blueLight} fontSize={30} />
        <StatCard label={v.stat2l} value={v.stat2v} accent={C.green} fontSize={30} />
        <StatCard label={v.stat3l} value={v.stat3v} accent='rgba(255,255,255,0.8)' fontSize={30} />
      </div>

      {/* Bottom */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
        <CTABadge text={v.cta} fontSize={18} />
        <Branding size={15} />
      </div>
    </div>
  );
}

function PortraitLayout({ v }: { v: typeof VARIANTS[Variant] }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${C.bg} 0%, ${C.bgMid} 50%, ${C.bg} 100%)`,
        padding: '72px 64px',
        fontFamily: 'sans-serif',
        position: 'relative',
        overflow: 'hidden',
        justifyContent: 'space-between',
      }}
    >
      {/* Glow center */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '700px',
          height: '700px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,99,235,0.1) 0%, transparent 70%)',
        }}
      />

      {/* Top section */}
      <div style={{ display: 'flex', flexDirection: 'column', zIndex: 1 }}>
        <Branding size={15} />
        <div style={{ display: 'flex', marginTop: '36px', marginBottom: '28px' }}>
          <EyebrowTag text={v.eyebrow} fontSize={13} />
        </div>
        <div
          style={{
            fontSize: '58px',
            fontWeight: 900,
            color: C.white,
            letterSpacing: '-0.04em',
            lineHeight: 1.05,
            marginBottom: '20px',
          }}
        >
          {v.headline}
        </div>
        <div
          style={{
            fontSize: '19px',
            color: C.muted,
            lineHeight: 1.65,
          }}
        >
          {v.sub}
        </div>
      </div>

      {/* Middle — stats */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', zIndex: 1 }}>
        <StatCard label={v.stat1l} value={v.stat1v} accent={C.blueLight} fontSize={32} />
        <StatCard label={v.stat2l} value={v.stat2v} accent={C.green} fontSize={32} />
        <StatCard label={v.stat3l} value={v.stat3v} accent='rgba(255,255,255,0.8)' fontSize={32} />
      </div>

      {/* Bottom CTA */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'flex-start', zIndex: 1 }}>
        <CTABadge text={v.cta} fontSize={20} />
        <span style={{ fontSize: '14px', color: C.faint }}>
          getsnowballpay.com · Free · No credit card required
        </span>
      </div>
    </div>
  );
}

function LogoSquareLayout() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: C.bg,
        fontFamily: 'sans-serif',
        gap: '24px',
      }}
    >
      <div
        style={{
          width: '180px',
          height: '180px',
          borderRadius: '40px',
          background: C.blue,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '100px',
          fontWeight: 900,
          color: C.white,
        }}
      >
        S
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <span
          style={{
            fontSize: '64px',
            fontWeight: 900,
            color: C.white,
            letterSpacing: '-0.04em',
          }}
        >
          SnowballPay
        </span>
        <span
          style={{
            fontSize: '22px',
            color: C.muted,
            letterSpacing: '0.04em',
          }}
        >
          Debt payoff planner
        </span>
      </div>
    </div>
  );
}

function LogoLandscapeLayout() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: C.bg,
        fontFamily: 'sans-serif',
        padding: '0 80px',
      }}
    >
      {/* Left — wordmark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '18px',
            background: C.blue,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '44px',
            fontWeight: 900,
            color: C.white,
          }}
        >
          S
        </div>
        <span
          style={{
            fontSize: '52px',
            fontWeight: 900,
            color: C.white,
            letterSpacing: '-0.04em',
          }}
        >
          SnowballPay
        </span>
      </div>

      {/* Right — tagline */}
      <span style={{ fontSize: '22px', color: C.muted, letterSpacing: '0.02em' }}>
        Debt payoff planner
      </span>
    </div>
  );
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const sizeParam    = (searchParams.get('size')    ?? 'landscape') as Size;
  const variantParam = (searchParams.get('variant') ?? 'awareness') as Variant;

  const size    = SIZES[sizeParam]    ?? SIZES.landscape;
  const variant = VARIANTS[variantParam] ?? VARIANTS.awareness;

  let content: JSX.Element;

  if (sizeParam === 'logo-square') {
    content = <LogoSquareLayout />;
  } else if (sizeParam === 'logo-landscape') {
    content = <LogoLandscapeLayout />;
  } else if (sizeParam === 'square') {
    content = <SquareLayout v={variant} />;
  } else if (sizeParam === 'portrait') {
    content = <PortraitLayout v={variant} />;
  } else {
    content = <LandscapeLayout v={variant} />;
  }

  return new ImageResponse(content, {
    width:  size.w,
    height: size.h,
  });
}
